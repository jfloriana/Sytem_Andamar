// Cliente en riesgo (RF-08, regla 2): sin pedidos durante más de 1,5 veces su intervalo medio de compra.
import { RIESGO } from "@/config";

const DIA_MS = 24 * 60 * 60 * 1000;

export type EstadoClienteRiesgo = "ACTIVO" | "INACTIVO" | "EN_RIESGO";

export interface ResumenCompras {
  cantidad: number;
  primera: Date | null;
  ultima: Date | null;
}

/** Cantidad, primera y última fecha de los pedidos no anulados de un cliente. */
export function resumirCompras(fechas: Date[]): ResumenCompras {
  if (fechas.length === 0) return { cantidad: 0, primera: null, ultima: null };
  let primera = fechas[0];
  let ultima = fechas[0];
  for (const f of fechas) {
    if (f < primera) primera = f;
    if (f > ultima) ultima = f;
  }
  return { cantidad: fechas.length, primera, ultima };
}

export interface EvaluacionRiesgo {
  enRiesgo: boolean;
  /** Días completos desde el último pedido. */
  diasSinCompra: number | null;
  /** (última - primera) / (pedidos - 1), en días; null con menos de 2 pedidos. */
  intervaloMedioDias: number | null;
  /** max(mínimo, 1,5 x intervalo); null con menos de 2 pedidos. */
  umbralDias: number | null;
}

export function evaluarRiesgo(compras: ResumenCompras, ahora: Date): EvaluacionRiesgo {
  const { cantidad, primera, ultima } = compras;
  if (!ultima || !primera) return { enRiesgo: false, diasSinCompra: null, intervaloMedioDias: null, umbralDias: null };
  const diasExactos = (ahora.getTime() - ultima.getTime()) / DIA_MS;
  const diasSinCompra = Math.max(0, Math.floor(diasExactos));
  if (cantidad < 2) return { enRiesgo: false, diasSinCompra, intervaloMedioDias: null, umbralDias: null };
  const intervaloMedioDias = (ultima.getTime() - primera.getTime()) / DIA_MS / (cantidad - 1);
  const umbralDias = Math.max(RIESGO.minimoDias, RIESGO.factorIntervalo * intervaloMedioDias);
  const enRiesgo = cantidad >= RIESGO.minimoPedidos && diasExactos > umbralDias;
  return { enRiesgo, diasSinCompra, intervaloMedioDias, umbralDias };
}

/** Un cliente dado de baja no cambia; el resto pasa a EN_RIESGO o vuelve a ACTIVO. */
export function estadoTrasEvaluacion(actual: EstadoClienteRiesgo, enRiesgo: boolean): EstadoClienteRiesgo {
  if (actual === "INACTIVO") return actual;
  return enRiesgo ? "EN_RIESGO" : "ACTIVO";
}
