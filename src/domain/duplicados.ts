// Regla 7: documento único (bloquea); nombre normalizado o teléfono repetidos solo advierten.
import { DUPLICADOS } from "@/config";
import { normalizarDocumento, normalizarNombre, normalizarTelefono, similitud } from "./normalizacion";

export interface ClienteComparable {
  id: string;
  documento: string;
  razonSocial: string;
  telefono: string | null;
}

export interface CandidatoCliente {
  documento: string;
  razonSocial: string;
  telefono?: string | null;
}

export interface Advertencia {
  motivo: "nombre" | "telefono";
  cliente: ClienteComparable;
}

export interface ResultadoDuplicados {
  bloqueo: ClienteComparable | null;
  advertencias: Advertencia[];
}

function nombresParecidos(a: string, b: string): boolean {
  const na = normalizarNombre(a);
  const nb = normalizarNombre(b);
  return na !== "" && nb !== "" && similitud(na, nb) >= DUPLICADOS.similitudNombre;
}

function advertenciasDe(candidato: CandidatoCliente, otro: ClienteComparable): Advertencia[] {
  const resultado: Advertencia[] = [];
  if (nombresParecidos(candidato.razonSocial, otro.razonSocial)) resultado.push({ motivo: "nombre", cliente: otro });
  const tel = normalizarTelefono(candidato.telefono);
  if (tel !== "" && tel === normalizarTelefono(otro.telefono)) resultado.push({ motivo: "telefono", cliente: otro });
  return resultado;
}

/** `excluirId` evita compararse consigo mismo al editar. */
export function detectarDuplicados(
  candidato: CandidatoCliente,
  existentes: ClienteComparable[],
  excluirId?: string,
): ResultadoDuplicados {
  const documento = normalizarDocumento(candidato.documento);
  const otros = existentes.filter((c) => c.id !== excluirId);
  const bloqueo = otros.find((c) => normalizarDocumento(c.documento) === documento) ?? null;
  const advertencias = otros.filter((c) => c !== bloqueo).flatMap((c) => advertenciasDe(candidato, c));
  return { bloqueo, advertencias };
}
