// Importación de clientes desde CSV (RF-03): validación por fila e informe. Sin acceso a base de datos.
import { IMPORTACION } from "@/config";
import { filaImportacionSchema, type FilaImportacionValida } from "@/lib/validaciones/cliente";
import { detectarDuplicados, type ClienteComparable } from "./duplicados";

/** Columnas del CSV (todas texto; las opcionales pueden venir vacías). */
export interface FilaCsv {
  documento: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  email: string;
  vendedorEmail: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;
}

export const COLUMNAS_CSV = [
  "documento",
  "razonSocial",
  "direccion",
  "telefono",
  "email",
  "vendedorEmail",
  "contactoNombre",
  "contactoTelefono",
  "contactoEmail",
] as const satisfies readonly (keyof FilaCsv)[];

export interface FilaValida extends FilaImportacionValida {
  fila: number;
  vendedorId: string;
}

export interface ErrorFila {
  fila: number;
  documento: string;
  mensajes: string[];
}

export interface DuplicadoFila {
  fila: number;
  documento: string;
  razonSocial: string;
  motivo: "documento";
  detalle: string;
}

export interface AdvertenciaFila {
  fila: number;
  documento: string;
  razonSocial: string;
  motivos: ("nombre" | "telefono")[];
}

export interface InformeImportacion {
  total: number;
  validas: FilaValida[];
  errores: ErrorFila[];
  duplicados: DuplicadoFila[];
  advertencias: AdvertenciaFila[];
  /** Filas válidas partidas en lotes de `IMPORTACION.tamanoLote`. */
  lotes: FilaValida[][];
}

export interface ContextoImportacion {
  existentes: ClienteComparable[];
  vendedores: { id: string; email: string }[];
}

function dividirEnLotes<T>(items: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) lotes.push(items.slice(i, i + tamano));
  return lotes;
}

function mensajesDeZod(error: { issues: { message: string }[] }): string[] {
  return [...new Set(error.issues.map((i) => i.message))];
}

/** Clasifica cada fila: válida, con error, duplicada (documento) o con advertencia (nombre/teléfono). */
export function clasificarImportacion(filas: FilaCsv[], contexto: ContextoImportacion): InformeImportacion {
  if (filas.length > IMPORTACION.maxFilas) {
    throw new Error(`El archivo tiene ${filas.length} filas; el máximo es ${IMPORTACION.maxFilas}.`);
  }
  const vendedores = new Map(contexto.vendedores.map((v) => [v.email.toLowerCase(), v.id]));
  const conocidos: ClienteComparable[] = [...contexto.existentes];
  const informe: InformeImportacion = { total: filas.length, validas: [], errores: [], duplicados: [], advertencias: [], lotes: [] };

  filas.forEach((cruda, indice) => {
    const fila = indice + 2; // la fila 1 del archivo es el encabezado
    const parsed = filaImportacionSchema.safeParse(cruda);
    const mensajes = parsed.success ? [] : mensajesDeZod(parsed.error);
    const vendedorId = parsed.success ? vendedores.get(parsed.data.vendedorEmail) : undefined;
    if (parsed.success && !vendedorId) mensajes.push("El vendedor no existe o no está activo.");
    if (!parsed.success || !vendedorId) {
      informe.errores.push({ fila, documento: cruda.documento ?? "", mensajes });
      return;
    }

    const datos = parsed.data;
    const candidato = { documento: datos.documento, razonSocial: datos.razonSocial, telefono: datos.telefono };
    const { bloqueo, advertencias } = detectarDuplicados(candidato, conocidos);
    if (bloqueo) {
      informe.duplicados.push({
        fila,
        documento: datos.documento,
        razonSocial: datos.razonSocial,
        motivo: "documento",
        detalle: "Ya existe un cliente con ese documento (en el archivo o en el sistema).",
      });
      return;
    }
    if (advertencias.length > 0) {
      informe.advertencias.push({
        fila,
        documento: datos.documento,
        razonSocial: datos.razonSocial,
        motivos: [...new Set(advertencias.map((a) => a.motivo))],
      });
    }
    conocidos.push({ id: `fila-${fila}`, documento: datos.documento, razonSocial: datos.razonSocial, telefono: datos.telefono ?? null });
    informe.validas.push({ ...datos, fila, vendedorId });
  });

  informe.lotes = dividirEnLotes(informe.validas, IMPORTACION.tamanoLote);
  return informe;
}
