import type { TotalesPedidos } from "@/domain/pedidos";
import { prisma } from "@/lib/prisma";

/** Filtro de Prisma equivalente a `esPedidoValido` del dominio: los anulados no cuentan. */
export const PEDIDOS_VALIDOS = { estado: { not: "ANULADO" as const } };

/** Totales y último pedido de un cliente, sin pedidos anulados (consulta agregada, sin límite de filas). */
export async function resumenPedidosCliente(clienteId: string): Promise<TotalesPedidos> {
  const [suma, ultimo] = await Promise.all([
    prisma.pedido.aggregate({ where: { clienteId, ...PEDIDOS_VALIDOS }, _sum: { monto: true, margen: true }, _count: true }),
    prisma.pedido.findFirst({ where: { clienteId, ...PEDIDOS_VALIDOS }, orderBy: { fecha: "desc" }, select: { fecha: true } }),
  ]);
  return {
    cantidad: suma._count,
    monto: Number(suma._sum.monto ?? 0),
    margen: Number(suma._sum.margen ?? 0),
    ultimoPedidoAt: ultimo?.fecha ?? null,
  };
}
