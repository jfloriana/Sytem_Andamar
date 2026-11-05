// Segmentación A/B/C (RF-07, regla 1): margen de los últimos 12 meses sobre pedidos no anulados.
import { SEGMENTOS } from "@/config";
import { restarMeses } from "@/domain/periodos";

export type Segmento = "A" | "B" | "C" | "SIN_CLASIFICAR";

export const SEGMENTOS_ORDEN: readonly Segmento[] = ["A", "B", "C", "SIN_CLASIFICAR"];

export interface PedidoSegmento {
  estado: "REGISTRADO" | "ENTREGADO" | "ANULADO";
  fecha: Date;
  margen: number;
}

/** Sin pedidos en la ventana: SIN_CLASIFICAR; con pedidos, A >= 1.000, B >= 300, C el resto. */
export function clasificarSegmento(margen: number, cantidadPedidos: number): Segmento {
  if (cantidadPedidos <= 0) return "SIN_CLASIFICAR";
  if (margen >= SEGMENTOS.umbralA) return "A";
  if (margen >= SEGMENTOS.umbralB) return "B";
  return "C";
}

/** Inicio (inclusive) de la ventana de margen. */
export const inicioVentana = (ahora: Date, meses: number = SEGMENTOS.mesesVentana): Date => restarMeses(ahora, meses);

/** Margen y cantidad de pedidos no anulados desde el inicio de la ventana (sumando en centavos). */
export function margenVentana(pedidos: PedidoSegmento[], ahora: Date): { margen: number; cantidad: number } {
  const desde = inicioVentana(ahora).getTime();
  const validos = pedidos.filter((p) => p.estado !== "ANULADO" && p.fecha.getTime() >= desde);
  const centavos = validos.reduce((suma, p) => suma + Math.round(p.margen * 100), 0);
  return { margen: centavos / 100, cantidad: validos.length };
}
