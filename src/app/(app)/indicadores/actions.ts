"use server";

import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/auditoria";
import type { ResultadoForm } from "@/lib/formularios";
import { recalcularSegmentos, tareaDiaria } from "@/lib/recalculo";
import { requerir } from "@/lib/sesion";

/** «Recalcular ahora» (solo ADMIN): segmentos con histórico, clientes en riesgo y casos vencidos. */
export async function recalcularAhora(): Promise<ResultadoForm> {
  const usuario = await requerir("recalcular", "segmentacion");
  try {
    const ahora = new Date();
    const segmentos = await recalcularSegmentos(ahora);
    const diaria = await tareaDiaria(ahora);
    await registrarAuditoria({
      usuarioId: usuario.id,
      accion: "RECALCULAR_SEGMENTACION",
      entidad: "Segmentacion",
      entidadId: segmentos.mes.toISOString().slice(0, 7),
      detalle: { segmentos: segmentos.porSegmento, cambiaron: segmentos.cambiaron, ...diaria },
    });
    revalidatePath("/indicadores");
    revalidatePath("/clientes");
    revalidatePath("/clientes/riesgo");
    return {
      ok: true,
      mensaje: `Listo: ${segmentos.clientes} clientes clasificados (${segmentos.cambiaron} cambiaron de segmento), ${diaria.enRiesgo} en riesgo y ${diaria.escalados} casos escalados.`,
    };
  } catch {
    return { error: "No se pudo recalcular. Inténtalo de nuevo en unos segundos." };
  }
}
