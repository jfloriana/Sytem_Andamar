import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron";
import { recalcularSegmentos } from "@/lib/recalculo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tarea mensual: recalcula los segmentos A/B/C y guarda el histórico del mes. */
async function ejecutar(peticion: Request) {
  if (!cronAutorizado(peticion, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const r = await recalcularSegmentos();
    return NextResponse.json({ ok: true, tarea: "mensual", ...r, mes: r.mes.toISOString() });
  } catch {
    return NextResponse.json({ ok: false, error: "Falló la tarea mensual" }, { status: 500 });
  }
}

export const GET = ejecutar;
export const POST = ejecutar;
