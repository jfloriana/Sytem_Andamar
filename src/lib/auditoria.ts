import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CLAVES_SECRETAS = new Set(["password", "passwordHash", "contrasena"]);

/** Quita secretos y convierte el detalle a JSON seguro para guardarlo. */
export function limpiarDetalle(valor: unknown): Prisma.InputJsonValue {
  if (valor instanceof Date) return valor.toISOString();
  if (Array.isArray(valor)) return valor.map(limpiarDetalle);
  if (valor && typeof valor === "object") {
    const salida: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [clave, v] of Object.entries(valor)) {
      if (CLAVES_SECRETAS.has(clave) || v === undefined) continue;
      salida[clave] = v === null ? null : limpiarDetalle(v);
    }
    return salida;
  }
  return (valor ?? null) as Prisma.InputJsonValue;
}

export interface EntradaAuditoria {
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  detalle?: unknown;
}

type Cliente = PrismaClient | Prisma.TransactionClient;

export async function registrarAuditoria(
  entrada: EntradaAuditoria,
  db: Cliente = prisma,
): Promise<void> {
  await db.auditLog.create({
    data: {
      usuarioId: entrada.usuarioId,
      accion: entrada.accion,
      entidad: entrada.entidad,
      entidadId: entrada.entidadId,
      detalle: limpiarDetalle(entrada.detalle ?? {}) as Prisma.InputJsonValue,
    },
  });
}
