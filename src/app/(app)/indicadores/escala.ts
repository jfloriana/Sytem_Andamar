// Escala "bonita" para el eje Y: tope y marcas redondas, para que las etiquetas sean cortas y no se recorten.

export interface EscalaEje {
  tope: number;
  ticks: number[];
  /** Cantidad de decimales que necesitan las marcas (0 o 1). */
  decimales: 0 | 1;
}

function pasoLimpio(bruto: number, minimo: number): number {
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  for (const m of [1, 2, 2.5, 5, 10]) {
    const paso = m * potencia;
    if (paso >= bruto) return Math.max(paso, minimo);
  }
  return Math.max(10 * potencia, minimo);
}

/** Escala de 0 hasta un tope redondo que cubre `max`. `entera` obliga a marcas enteras (conteos). */
export function escalaEje(max: number, { entera = false, marcas = 4 }: { entera?: boolean; marcas?: number } = {}): EscalaEje {
  const objetivo = Math.max(max, entera ? 1 : 0.1);
  const paso = pasoLimpio(objetivo / marcas, entera ? 1 : 0);
  const tope = Math.ceil(objetivo / paso - 1e-9) * paso;
  const ticks: number[] = [];
  for (let v = 0; v <= tope + paso / 2; v += paso) ticks.push(Math.round(v * 100) / 100);
  const decimales = ticks.every((t) => Number.isInteger(t)) ? 0 : 1;
  return { tope: ticks[ticks.length - 1], ticks, decimales };
}

/** Escala fija de porcentajes: 0, 25, 50, 75 y 100. */
export const ESCALA_PORCENTAJE: EscalaEje = { tope: 100, ticks: [0, 25, 50, 75, 100], decimales: 0 };
