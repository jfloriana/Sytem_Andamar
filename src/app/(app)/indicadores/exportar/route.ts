import { NextResponse } from "next/server";
import { resolverPeriodo } from "@/domain/periodos";
import { registrarAuditoria } from "@/lib/auditoria";
import { can } from "@/lib/permisos";
import { usuarioActual } from "@/lib/sesion";
import { calcularTablero, esSegmento, tableroACsv } from "@/lib/tablero";

export const dynamic = "force-dynamic";

/** Exportación CSV del tablero con los mismos filtros de la pantalla; queda en auditoría. */
export async function GET(peticion: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  if (!can(usuario, "exportar", "indicadores")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const q = new URL(peticion.url).searchParams;
  const periodo = resolverPeriodo(q.get("desde") ?? undefined, q.get("hasta") ?? undefined, new Date());
  const segmento = q.get("segmento") ?? undefined;
  const filtros = {
    desde: periodo.desde,
    hasta: periodo.hasta,
    hastaExcl: periodo.hastaExcl,
    vendedorId: q.get("vendedorId") || undefined,
    segmento: esSegmento(segmento) ? segmento : undefined,
  };
  const tablero = await calcularTablero(usuario, filtros);
  await registrarAuditoria({
    usuarioId: usuario.id,
    accion: "EXPORTAR_INDICADORES",
    entidad: "Indicadores",
    entidadId: "tablero",
    detalle: { desde: filtros.desde, hasta: filtros.hasta, vendedorId: filtros.vendedorId, segmento: filtros.segmento },
  });
  const dia = (d: Date) => d.toISOString().slice(0, 10);
  const nombre = `indicadores-${dia(filtros.desde)}_${dia(filtros.hasta)}.csv`;
  // BOM para que Excel lea bien las tildes.
  return new NextResponse(`﻿${tableroACsv(tablero)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
