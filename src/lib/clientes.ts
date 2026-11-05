import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { detectarDuplicados, type ClienteComparable } from "@/domain/duplicados";
import { normalizarDocumento, normalizarTelefono } from "@/domain/normalizacion";
import { prisma } from "@/lib/prisma";
import { can, type RecursoConDueno } from "@/lib/permisos";
import type { UsuarioSesion } from "@/lib/sesion";

export interface DuenoCliente {
  vendedorId: string;
  vendedor: { jefeId: string | null };
}

export function recursoCliente(c: DuenoCliente, tipo: "cliente" | "contacto" = "cliente"): RecursoConDueno {
  return { tipo, propietarioId: c.vendedorId, jefeDelPropietarioId: c.vendedor.jefeId };
}

/** Cliente por id con su dueño; `null` si no existe. La autorización la decide quien llama. */
export const buscarCliente = cache(async (id: string) =>
  prisma.cliente.findUnique({ where: { id }, include: { vendedor: { select: { id: true, nombre: true, jefeId: true } } } }),
);

/** Para páginas: carga el cliente y exige permiso `accion`; sin permiso (incluso por URL directa) va a /sin-permiso. */
export async function clienteAutorizado(usuario: UsuarioSesion, id: string, accion: "ver" | "editar") {
  const cliente = await buscarCliente(id);
  if (!cliente) notFound();
  if (!can(usuario, accion, recursoCliente(cliente))) redirect("/sin-permiso");
  return cliente;
}

/** Vendedores a los que el usuario puede asignar clientes al crearlos. */
export async function vendedoresAsignables(usuario: UsuarioSesion): Promise<{ id: string; nombre: string; jefeId: string | null }[]> {
  const base = { rol: "VENDEDOR" as const, activo: true };
  const select = { id: true, nombre: true, jefeId: true };
  if (usuario.rol === "VENDEDOR") return [{ id: usuario.id, nombre: usuario.nombre, jefeId: null }];
  if (usuario.rol === "JEFE_VENTAS") {
    return prisma.usuario.findMany({ where: { ...base, jefeId: usuario.id }, select, orderBy: { nombre: "asc" } });
  }
  if (usuario.rol === "ADMIN") return prisma.usuario.findMany({ where: base, select, orderBy: { nombre: "asc" } });
  return [];
}

type ComparableConDueno = ClienteComparable & DuenoCliente;

/** Clientes que podrían coincidir (documento, teléfono o inicio del nombre); la comparación fina es pura. */
export async function candidatosDuplicado(c: {
  documento: string;
  razonSocial: string;
  telefono?: string | null;
}): Promise<ComparableConDueno[]> {
  const tel = normalizarTelefono(c.telefono);
  const prefijo = c.razonSocial.trim().slice(0, 3);
  const filtros = [
    { documento: normalizarDocumento(c.documento) },
    ...(tel ? [{ telefono: tel }] : []),
    ...(prefijo.length >= 3 ? [{ razonSocial: { contains: prefijo, mode: "insensitive" as const } }] : []),
  ];
  return prisma.cliente.findMany({
    where: { OR: filtros },
    select: {
      id: true,
      documento: true,
      razonSocial: true,
      telefono: true,
      vendedorId: true,
      vendedor: { select: { jefeId: true } },
    },
    take: 500,
  });
}

export interface AvisoDuplicado {
  motivo: "nombre" | "telefono";
  texto: string;
}

function nombreVisible(usuario: UsuarioSesion, c: ComparableConDueno): string {
  return can(usuario, "ver", recursoCliente(c)) ? `«${c.razonSocial}»` : "un cliente de otra cartera";
}

/** Resultado de comparar contra la base, con textos que no revelan clientes ajenos. */
export async function revisarDuplicados(
  usuario: UsuarioSesion,
  candidato: { documento: string; razonSocial: string; telefono?: string | null },
  excluirId?: string,
): Promise<{ errorDocumento: string | null; avisos: AvisoDuplicado[] }> {
  const candidatos = await candidatosDuplicado(candidato);
  const { bloqueo, advertencias } = detectarDuplicados(candidato, candidatos, excluirId);
  const porId = new Map(candidatos.map((c) => [c.id, c]));
  const errorDocumento = bloqueo
    ? `Ya existe un cliente con ese documento (${nombreVisible(usuario, porId.get(bloqueo.id)!)}).`
    : null;
  const avisos = advertencias.map((a) => {
    const otro = nombreVisible(usuario, porId.get(a.cliente.id)!);
    return {
      motivo: a.motivo,
      texto:
        a.motivo === "nombre"
          ? `El nombre se parece mucho al de ${otro}.`
          : `El teléfono ya está registrado en ${otro}.`,
    };
  });
  return { errorDocumento, avisos };
}
