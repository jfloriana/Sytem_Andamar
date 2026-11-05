import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron";
import { tareaDiaria } from "@/lib/recalculo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tarea diaria: recalcula clientes en riesgo y marca como ESCALADO los casos vencidos. */
async function ejecutar(peticion: Request) {
  if (!cronAutorizado(peticion, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, tarea: "diario", ...(await tareaDiaria()) });
  } catch {
    // No se devuelve el detalle del error: puede incluir datos de conexión.
    return NextResponse.json({ ok: false, error: "Falló la tarea diaria" }, { status: 500 });
  }
}

// Vercel Cron llama con GET; los Cron Jobs de Render pueden usar GET o POST.
export const GET = ejecutar;
export const POST = ejecutar;
