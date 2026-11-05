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
