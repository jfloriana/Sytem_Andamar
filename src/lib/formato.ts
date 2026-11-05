// Formato de fechas, dinero y etiquetas en español para las pantallas.

const ZONA = "America/Lima";

const fechaCorta = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: ZONA });
const fechaHora = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: ZONA });
const dinero = new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" });

export const formatoFecha = (f: Date) => fechaCorta.format(f);
export const formatoFechaHora = (f: Date) => fechaHora.format(f);
export const formatoDinero = (n: number | { toString(): string }) => dinero.format(Number(n));

export const ETIQUETA_ESTADO_CLIENTE = { ACTIVO: "Activo", INACTIVO: "Inactivo", EN_RIESGO: "En riesgo" } as const;
export const VARIANTE_ESTADO_CLIENTE = { ACTIVO: "success", INACTIVO: "default", EN_RIESGO: "destructive" } as const;
export const ETIQUETA_SEGMENTO = { A: "Segmento A", B: "Segmento B", C: "Segmento C", SIN_CLASIFICAR: "Sin clasificar" } as const;

export const ETIQUETA_ETAPA = {
  PROSPECTO: "Prospecto",
  CONTACTADO: "Contactado",
  PROPUESTA: "Propuesta",
  NEGOCIACION: "Negociación",
  GANADA: "Ganada",
  PERDIDA: "Perdida",
} as const;

export const ETIQUETA_TIPO_ACTIVIDAD = { VISITA: "Visita", LLAMADA: "Llamada", MENSAJE: "Mensaje", TAREA: "Tarea" } as const;

export const ETIQUETA_ESTADO_PEDIDO = { REGISTRADO: "Registrado", ENTREGADO: "Entregado", ANULADO: "Anulado" } as const;
export const VARIANTE_ESTADO_PEDIDO = { REGISTRADO: "default", ENTREGADO: "success", ANULADO: "destructive" } as const;

export const ETIQUETA_PRIORIDAD = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", URGENTE: "Urgente" } as const;
export const VARIANTE_PRIORIDAD = { BAJA: "default", MEDIA: "default", ALTA: "warning", URGENTE: "destructive" } as const;

export const ETIQUETA_ESTADO_CASO = {
  ABIERTO: "Abierto",
  EN_PROCESO: "En proceso",
  ESCALADO: "Escalado",
  RESUELTO: "Resuelto",
  CERRADO: "Cerrado",
} as const;
export const VARIANTE_ESTADO_CASO = {
  ABIERTO: "default",
  EN_PROCESO: "default",
  ESCALADO: "destructive",
  RESUELTO: "success",
  CERRADO: "success",
} as const;

/** Horas con un decimal y unidad: «5,5 h». */
export const formatoHoras = (h: number | null) => (h === null ? "-" : `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(h)} h`);

export const ETIQUETA_FINALIDAD = { SERVICIO: "Servicio", PROMOCIONES: "Promociones", ANALITICA: "Analítica" } as const;
export const ETIQUETA_CANAL = { TELEFONO: "Teléfono", EMAIL: "Correo", WHATSAPP: "WhatsApp", PRESENCIAL: "Presencial" } as const;
export const ETIQUETA_TIPO_SOLICITUD = { ACCESO: "Acceso", RECTIFICACION: "Rectificación", SUPRESION: "Supresión" } as const;
export const ETIQUETA_ESTADO_SOLICITUD = { PENDIENTE: "Pendiente", EN_PROCESO: "En proceso", ATENDIDA: "Atendida", RECHAZADA: "Rechazada" } as const;
export const ETIQUETA_PLAZO = {
  EN_PLAZO: "En plazo",
  POR_VENCER: "Por vencer",
  VENCIDA: "Vencida",
  CERRADA_A_TIEMPO: "Cerrada a tiempo",
  CERRADA_TARDE: "Cerrada fuera de plazo",
} as const;
export const VARIANTE_PLAZO = {
  EN_PLAZO: "default",
  POR_VENCER: "warning",
  VENCIDA: "destructive",
  CERRADA_A_TIEMPO: "success",
  CERRADA_TARDE: "warning",
} as const;
