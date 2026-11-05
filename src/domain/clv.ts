// CLV simplificado (RF-09): CLV = m x r / (1 + d - r). Es una aproximación, no un pronóstico.
import { CLV } from "@/config";
import { SEGMENTOS_ORDEN, type Segmento } from "@/domain/segmentacion";

/** m: margen anual; r: retención (0-1); d: tasa de descuento. `null` si los datos no son válidos. */
export function calcularClv(margenAnual: number, retencion: number, descuento: number = CLV.tasaDescuento): number | null {
  if (!Number.isFinite(margenAnual) || !Number.isFinite(retencion) || !Number.isFinite(descuento)) return null;
  if (margenAnual < 0 || retencion < 0 || retencion > 1) return null;
  const denominador = 1 + descuento - retencion;
  if (denominador <= 0) return null;
  return (margenAnual * retencion) / denominador;
}

export interface ClvSegmento {
  segmento: Segmento;
  clientes: number;
  margenTotal: number;
  clvTotal: number;
  clvPromedio: number;
}

/** CLV por segmento; siempre devuelve A, B, C y SIN_CLASIFICAR en ese orden. */
export function clvPorSegmento(clientes: { segmento: Segmento; margenAnual: number }[], retencion: number): ClvSegmento[] {
  return SEGMENTOS_ORDEN.map((segmento) => {
    const propios = clientes.filter((c) => c.segmento === segmento);
    const margenTotal = propios.reduce((s, c) => s + c.margenAnual, 0);
    const clvTotal = propios.reduce((s, c) => s + (calcularClv(c.margenAnual, retencion) ?? 0), 0);
    return {
      segmento,
      clientes: propios.length,
      margenTotal: Math.round(margenTotal * 100) / 100,
      clvTotal,
      clvPromedio: propios.length === 0 ? 0 : clvTotal / propios.length,
    };
  });
}
