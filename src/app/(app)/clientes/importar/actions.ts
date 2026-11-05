"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { IMPORTACION } from "@/config";
import {
  clasificarImportacion,
  COLUMNAS_CSV,
  type AdvertenciaFila,
  type DuplicadoFila,
  type ErrorFila,
  type FilaCsv,
  type InformeImportacion,
} from "@/domain/importacion";
import { registrarAuditoria } from "@/lib/auditoria";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";

const TAMANO_MAXIMO_BYTES = 1_000_000;
const COLUMNAS_OBLIGATORIAS = ["documento", "razonSocial", "direccion", "vendedorEmail"] as const;

/** Lo que ve el navegador: conteos, todas las filas con problemas y una muestra de las válidas. */
export interface InformeVista {
  total: number;
  validas: number;
  errores: ErrorFila[];
  duplicados: DuplicadoFila[];
  advertencias: AdvertenciaFila[];
  muestra: { fila: number; documento: string; razonSocial: string; vendedorEmail: string }[];
}

export interface ResultadoImportacion {
  error?: string;
  informe?: InformeVista;
  importados?: number;
  omitidos?: number;
}

type Preparado = { error: string } | { informe: InformeImportacion };

async function prepararInforme(formData: FormData): Promise<Preparado> {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige un archivo CSV." };
  if (archivo.size > TAMANO_MAXIMO_BYTES) return { error: "El archivo supera 1 MB." };

  const texto = (await archivo.text()).replace(/^﻿/, "");
  const leido = Papa.parse<Record<string, string>>(texto, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const columnas = leido.meta.fields ?? [];
  const faltan = COLUMNAS_OBLIGATORIAS.filter((c) => !columnas.includes(c));
  if (faltan.length > 0) return { error: `Faltan columnas obligatorias: ${faltan.join(", ")}.` };
  if (leido.data.length === 0) return { error: "El archivo no tiene filas de datos." };
  if (leido.data.length > IMPORTACION.maxFilas) {
    return { error: `El archivo tiene ${leido.data.length} filas; el máximo es ${IMPORTACION.maxFilas}.` };
  }

  const filas = leido.data.map((r) =>
    Object.fromEntries(COLUMNAS_CSV.map((c) => [c, (r[c] ?? "").toString()])),
  ) as unknown as FilaCsv[];
  const [existentes, vendedores] = await Promise.all([
    prisma.cliente.findMany({ select: { id: true, documento: true, razonSocial: true, telefono: true } }),
    prisma.usuario.findMany({ where: { rol: "VENDEDOR", activo: true }, select: { id: true, email: true } }),
  ]);
  return { informe: clasificarImportacion(filas, { existentes, vendedores }) };
}

function aVista(i: InformeImportacion): InformeVista {
  return {
    total: i.total,
    validas: i.validas.length,
    errores: i.errores,
    duplicados: i.duplicados,
    advertencias: i.advertencias,
    muestra: i.validas.slice(0, 10).map((f) => ({
      fila: f.fila,
      documento: f.documento,
      razonSocial: f.razonSocial,
      vendedorEmail: f.vendedorEmail,
    })),
  };
}

/** Paso 1: valida el archivo y devuelve el informe. No escribe nada en la base. */
export async function previsualizarImportacion(formData: FormData): Promise<ResultadoImportacion> {
  await requerir("crear", "importacion");
  const r = await prepararInforme(formData);
  return "error" in r ? { error: r.error } : { informe: aVista(r.informe) };
}

/** Paso 2: tras la confirmación, vuelve a validar el archivo en el servidor e importa por lotes. */
export async function confirmarImportacion(formData: FormData): Promise<ResultadoImportacion> {
  const usuario = await requerir("crear", "importacion");
  const r = await prepararInforme(formData);
  if ("error" in r) return { error: r.error };
  const { informe } = r;

  let importados = 0;
  for (const lote of informe.lotes) {
    importados += await prisma.$transaction(async (tx) => {
      const creados = await tx.cliente.createManyAndReturn({
        data: lote.map((f) => ({
          documento: f.documento,
          razonSocial: f.razonSocial,
          direccion: f.direccion,
          telefono: f.telefono ?? null,
          email: f.email ?? null,
          vendedorId: f.vendedorId,
        })),
        select: { id: true, documento: true },
        skipDuplicates: true,
      });
      const idPorDocumento = new Map(creados.map((c) => [c.documento, c.id]));
      const contactos = lote.flatMap((f) => {
        const clienteId = idPorDocumento.get(f.documento);
        if (!clienteId || !f.contactoNombre) return [];
        return [
          {
            clienteId,
            nombre: f.contactoNombre,
            telefono: f.contactoTelefono ?? null,
            email: f.contactoEmail ?? null,
            principal: true,
          },
        ];
      });
      if (contactos.length > 0) await tx.contacto.createMany({ data: contactos });
      return creados.length;
    });
  }

  await registrarAuditoria({
    usuarioId: usuario.id,
    accion: "IMPORTAR_CLIENTES",
    entidad: "Importacion",
    entidadId: crypto.randomUUID(),
    detalle: {
      filas: informe.total,
      importados,
      errores: informe.errores.length,
      duplicados: informe.duplicados.length,
      advertencias: informe.advertencias.length,
    },
  });
  revalidatePath("/clientes");
  return { importados, omitidos: informe.total - importados };
}
