// Umbrales y parámetros del negocio. No van en la base de datos.

export const AUTH = {
  /** Intentos fallidos consecutivos antes de bloquear la cuenta. */
  maxIntentosFallidos: 5,
  /** Duración del bloqueo temporal, en minutos. */
  bloqueoMinutos: 15,
  /** Duración de la sesión JWT, en segundos (8 horas). */
  sesionSegundos: 60 * 60 * 8,
  minLongitudPassword: 10,
} as const;

export const SEGMENTOS = {
  /** Margen de los últimos 12 meses, en USD. */
  umbralA: 1000,
  umbralB: 300,
  mesesVentana: 12,
} as const;

export const RIESGO = {
  factorIntervalo: 1.5,
  minimoDias: 30,
  minimoPedidos: 3,
} as const;

export const SLA = {
  horasLimite: 24,
} as const;

export const COMUNICACION = {
  maxPromocionalesPorSemana: 2,
} as const;

export const IMPORTACION = {
  maxFilas: 1000,
  tamanoLote: 200,
} as const;

export const CLV = {
  tasaDescuento: 0.1,
} as const;

export const AUDITORIA = {
  porPagina: 50,
} as const;
