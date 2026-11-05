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

export const DUPLICADOS = {
  /** Similitud mínima (0-1) entre nombres normalizados para advertir. */
  similitudNombre: 0.9,
} as const;

export const CLV = {
  /** d: tasa de descuento anual. */
  tasaDescuento: 0.1,
  /** r: retención anual de referencia (línea base de la empresa) usada en todas las pantallas. */
  retencionReferencia: 0.78,
} as const;

/** Metas y líneas base del tablero (sección 2 del spec). `null` = no se mide todavía. */
export const INDICADORES = {
  retencion: { lineaBase: 78, meta: 83 },
  conversion: { lineaBase: 18, meta: 22 },
  primerContacto: { lineaBase: null, meta: 70 },
  /** Horas; menor es mejor. */
  tiempoRespuesta: { lineaBase: null, meta: 24 },
  completitud: { lineaBase: 55, meta: 90 },
  usuariosActivos: { lineaBase: null, meta: 90 },
  /** Meses del gráfico de tendencia, terminando en el mes del fin del período. */
  mesesTendencia: 6,
  /** Período por defecto del tablero y máximo permitido, en meses. */
  periodoMeses: 12,
  periodoMaxMeses: 36,
  /** Ventana de «usuario activo», en días. */
  diasUsuarioActivo: 30,
  /** Sin línea base: ámbar si el valor llega a esta fracción de la meta (o la meta es menor es mejor: 1/fracción). */
  ambarSinLineaBase: 0.8,
} as const;

export const AUDITORIA = {
  porPagina: 50,
} as const;
