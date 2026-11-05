// Recálculos programados (RF-07, RF-08, regla 4): usan consultas agregadas y escrituras por lotes
// porque la base es remota. Los llaman las rutas /api/cron/* y el botón «Recalcular ahora».
import type { Segmento } from "@prisma/client";
import { estadoTrasEvaluacion, evaluarRiesgo, resumirCompras } from "@/domain/riesgo";
import { clasificarSegmento, inicioVentana } from "@/domain/segmentacion";
import { inicioDeMes } from "@/domain/periodos";
import { PEDIDOS_VALIDOS } from "@/lib/pedidos";
import { prisma } from "@/lib/prisma";

const LOTE = 1000;

function enLotes<T>(items: T[], tamano: number = LOTE): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) lotes.push(items.slice(i, i + tamano));
  return lotes;
}

export interface ResumenSegmentos {
  clientes: number;
  cambiaron: number;
  porSegmento: Record<Segmento, number>;
  mes: Date;
}

/** Recalcula el segmento de todos los clientes y guarda el histórico del mes (una fila por cliente y mes). */
export async function recalcularSegmentos(ahora: Date = new Date()): Promise<ResumenSegmentos> {
  const mes = inicioDeMes(ahora);
  const [grupos, clientes] = await Promise.all([
    prisma.pedido.groupBy({
      by: ["clienteId"],
      where: { ...PEDIDOS_VALIDOS, fecha: { gte: inicioVentana(ahora) } },
      _sum: { margen: true },
      _count: { _all: true },
    }),
    prisma.cliente.findMany({ select: { id: true, segmento: true } }),
  ]);
  const porCliente = new Map(grupos.map((g) => [g.clienteId, { margen: Number(g._sum.margen ?? 0), cantidad: g._count._all }]));

  const porSegmento: Record<Segmento, number> = { A: 0, B: 0, C: 0, SIN_CLASIFICAR: 0 };
  const historico: { clienteId: string; mes: Date; segmento: Segmento; margenAnual: number }[] = [];
  const cambios: Record<Segmento, string[]> = { A: [], B: [], C: [], SIN_CLASIFICAR: [] };
  for (const c of clientes) {
    const datos = porCliente.get(c.id) ?? { margen: 0, cantidad: 0 };
    const segmento = clasificarSegmento(datos.margen, datos.cantidad);
    porSegmento[segmento]++;
    historico.push({ clienteId: c.id, mes, segmento, margenAnual: datos.margen });
    if (segmento !== c.segmento) cambios[segmento].push(c.id);
  }

  // Un solo viaje a la base: se reemplaza el histórico del mes y se actualizan solo los que cambiaron.
  await prisma.$transaction([
    prisma.segmentoHistorico.deleteMany({ where: { mes } }),
    ...enLotes(historico).map((datos) => prisma.segmentoHistorico.createMany({ data: datos })),
    ...(Object.keys(cambios) as Segmento[]).flatMap((segmento) =>
      enLotes(cambios[segmento]).map((ids) => prisma.cliente.updateMany({ where: { id: { in: ids } }, data: { segmento } })),
    ),
  ]);

  const cambiaron = Object.values(cambios).reduce((s, ids) => s + ids.length, 0);
  return { clientes: clientes.length, cambiaron, porSegmento, mes };
}

export interface ResumenRiesgo {
  evaluados: number;
  enRiesgo: number;
  nuevosEnRiesgo: number;
  recuperados: number;
}

/** Marca EN_RIESGO a quien supera 1,5 veces su intervalo de compra y devuelve a ACTIVO a quien dejó de estarlo. */
export async function recalcularRiesgo(ahora: Date = new Date()): Promise<ResumenRiesgo> {
  const [grupos, clientes] = await Promise.all([
    prisma.pedido.groupBy({
      by: ["clienteId"],
      where: PEDIDOS_VALIDOS,
      _count: { _all: true },
      _min: { fecha: true },
      _max: { fecha: true },
    }),
    prisma.cliente.findMany({ where: { estado: { not: "INACTIVO" } }, select: { id: true, estado: true } }),
  ]);
  const porCliente = new Map(grupos.map((g) => [g.clienteId, g]));

  const aRiesgo: string[] = [];
  const aActivo: string[] = [];
  let enRiesgo = 0;
  for (const c of clientes) {
    const g = porCliente.get(c.id);
    const compras = g ? { cantidad: g._count._all, primera: g._min.fecha, ultima: g._max.fecha } : resumirCompras([]);
    const nuevo = estadoTrasEvaluacion(c.estado, evaluarRiesgo(compras, ahora).enRiesgo);
    if (nuevo === "EN_RIESGO") enRiesgo++;
    if (nuevo === c.estado) continue;
    (nuevo === "EN_RIESGO" ? aRiesgo : aActivo).push(c.id);
  }

  await prisma.$transaction([
    ...enLotes(aRiesgo).map((ids) => prisma.cliente.updateMany({ where: { id: { in: ids } }, data: { estado: "EN_RIESGO" } })),
    ...enLotes(aActivo).map((ids) => prisma.cliente.updateMany({ where: { id: { in: ids } }, data: { estado: "ACTIVO" } })),
  ]);
  return { evaluados: clientes.length, enRiesgo, nuevosEnRiesgo: aRiesgo.length, recuperados: aActivo.length };
}

/** Regla 4: persiste ESCALADO en los casos sin primera respuesta cuyo plazo venció. */
export async function escalarCasosVencidos(ahora: Date = new Date()): Promise<{ escalados: number }> {
  const r = await prisma.caso.updateMany({
    where: { estado: { in: ["ABIERTO", "EN_PROCESO"] }, primeraRespuestaAt: null, fechaLimite: { lt: ahora } },
    data: { estado: "ESCALADO" },
  });
  return { escalados: r.count };
}

export interface ResumenDiario extends ResumenRiesgo {
  escalados: number;
}

export async function tareaDiaria(ahora: Date = new Date()): Promise<ResumenDiario> {
  const [riesgo, casos] = await Promise.all([recalcularRiesgo(ahora), escalarCasosVencidos(ahora)]);
  return { ...riesgo, ...casos };
}
