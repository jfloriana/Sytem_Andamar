// Reglas del embudo de oportunidades (RF-04, regla 3).

export const ETAPAS = ["PROSPECTO", "CONTACTADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const esEtapaCerrada = (e: Etapa): boolean => e === "GANADA" || e === "PERDIDA";

/** Etapas a las que puede moverse una oportunidad; ninguna si ya está cerrada. */
export function etapasDestino(actual: Etapa): Etapa[] {
  return esEtapaCerrada(actual) ? [] : ETAPAS.filter((e) => e !== actual);
}

export interface EntradaCambioEtapa {
  etapaActual: Etapa;
  etapaNueva: Etapa;
  motivoPerdida?: string | null;
  /** Momento del último cambio de etapa (o de la creación). */
  etapaCambiadaAt: Date;
  /** Momentos en que se registraron actividades de esta oportunidad. */
  actividadesRegistradas: Date[];
}

export type CodigoBloqueo = "MISMA_ETAPA" | "OPORTUNIDAD_CERRADA" | "SIN_ACTIVIDAD" | "MOTIVO_REQUERIDO";

export type ResultadoCambioEtapa =
  | { ok: true; cerrada: boolean; motivoPerdida: string | null }
  | { ok: false; codigo: CodigoBloqueo; mensaje: string };

const bloqueo = (codigo: CodigoBloqueo, mensaje: string): ResultadoCambioEtapa => ({ ok: false, codigo, mensaje });

/**
 * Avanzar exige al menos una actividad registrada desde el último cambio de etapa. Retroceder y
 * marcar PERDIDA no la exigen; PERDIDA exige motivo. GANADA y PERDIDA cierran la oportunidad.
 */
export function evaluarCambioEtapa(entrada: EntradaCambioEtapa): ResultadoCambioEtapa {
  const { etapaActual, etapaNueva } = entrada;
  if (esEtapaCerrada(etapaActual)) return bloqueo("OPORTUNIDAD_CERRADA", "La oportunidad ya está cerrada y no puede cambiar de etapa.");
  if (etapaActual === etapaNueva) return bloqueo("MISMA_ETAPA", "La oportunidad ya está en esa etapa.");

  if (etapaNueva === "PERDIDA") {
    const motivo = entrada.motivoPerdida?.trim() ?? "";
    if (!motivo) return bloqueo("MOTIVO_REQUERIDO", "Indica el motivo de la pérdida.");
    return { ok: true, cerrada: true, motivoPerdida: motivo };
  }

  const avanza = ETAPAS.indexOf(etapaNueva) > ETAPAS.indexOf(etapaActual);
  const hayActividad = entrada.actividadesRegistradas.some((f) => f >= entrada.etapaCambiadaAt);
  if (avanza && !hayActividad) {
    return bloqueo("SIN_ACTIVIDAD", "Registra al menos una actividad desde el último cambio de etapa antes de avanzar.");
  }
  return { ok: true, cerrada: esEtapaCerrada(etapaNueva), motivoPerdida: null };
}

/** Oportunidades agrupadas por etapa, con todas las etapas presentes (columnas del tablero). */
export function agruparPorEtapa<T extends { etapa: Etapa }>(items: T[]): Record<Etapa, T[]> {
  const grupos = Object.fromEntries(ETAPAS.map((e) => [e, [] as T[]])) as Record<Etapa, T[]>;
  for (const item of items) grupos[item.etapa].push(item);
  return grupos;
}

/** Cantidad y monto estimado por etapa (suma en centavos para evitar errores de coma flotante). */
export function totalesPorEtapa(items: { etapa: Etapa; montoEstimado: number }[]): Record<Etapa, { cantidad: number; monto: number }> {
  const centavos = Object.fromEntries(ETAPAS.map((e) => [e, { cantidad: 0, monto: 0 }])) as Record<Etapa, { cantidad: number; monto: number }>;
  for (const { etapa, montoEstimado } of items) {
    centavos[etapa].cantidad += 1;
    centavos[etapa].monto += Math.round(montoEstimado * 100);
  }
  for (const e of ETAPAS) centavos[e].monto /= 100;
  return centavos;
}
