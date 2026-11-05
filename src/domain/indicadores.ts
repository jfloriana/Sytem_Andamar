// Fórmulas del tablero (RF-12, sección 9). Funciones puras: reciben datos ya filtrados y devuelven cifras.
import { INDICADORES } from "@/config";
import { restarMeses, type MesPeriodo } from "@/domain/periodos";
import { horasEntre } from "@/domain/sla";

/** Porcentaje con un decimal; `null` si no hay denominador (no se inventa 0 ni NaN). */
export function porcentaje(numerador: number, denominador: number): number | null {
  if (denominador <= 0) return null;
  return Math.round((numerador / denominador) * 1000) / 10;
}

/** Activo en el corte = al menos un pedido no anulado en los 12 meses previos: [corte - 12 meses, corte). */
export function activoEn(fechasPedidos: Date[], corteExcl: Date): boolean {
  const desde = restarMeses(corteExcl, INDICADORES.periodoMeses).getTime();
  const hasta = corteExcl.getTime();
  return fechasPedidos.some((f) => f.getTime() >= desde && f.getTime() < hasta);
}

export interface ClientePeriodo {
  id: string;
  creadoAt: Date;
  /** Fechas de sus pedidos no anulados. */
  fechasPedidos: Date[];
}

export interface ResultadoRetencion {
  activosInicio: number;
  activosFin: number;
  nuevos: number;
  valor: number | null;
}

/** Indicador 1: (activos al final - nuevos del período) / activos al inicio x 100. */
export function retencionDelPeriodo(clientes: ClientePeriodo[], desde: Date, hastaExcl: Date): ResultadoRetencion {
  let activosInicio = 0;
  let activosFin = 0;
  let nuevos = 0;
  for (const c of clientes) {
    if (activoEn(c.fechasPedidos, desde)) activosInicio++;
    if (activoEn(c.fechasPedidos, hastaExcl)) {
      activosFin++;
      if (c.creadoAt >= desde && c.creadoAt < hastaExcl) nuevos++;
    }
  }
  return { activosInicio, activosFin, nuevos, valor: porcentaje(activosFin - nuevos, activosInicio) };
}

/** Indicador 2: ganadas cerradas en el período / creadas en el período x 100. */
export const tasaConversion = (ganadasCerradas: number, creadas: number) => porcentaje(ganadasCerradas, creadas);

/** Indicador 3: casos con resolución en primer contacto / casos resueltos o cerrados x 100. */
export const tasaPrimerContacto = (primerContacto: number, resueltosOCerrados: number) =>
  porcentaje(primerContacto, resueltosOCerrados);

export interface CasoRespuesta {
  aperturaAt: Date;
  primeraRespuestaAt: Date | null;
  fechaLimite: Date;
}

export interface ResultadoTiempoRespuesta {
  horasPromedio: number | null;
  porcentajeEnSla: number | null;
  /** Casos con primera respuesta que entran en el promedio. */
  muestra: number;
}

/** Indicador 4: promedio de (primera respuesta - apertura) en horas y % dentro del SLA. */
export function tiempoRespuesta(casos: CasoRespuesta[]): ResultadoTiempoRespuesta {
  const respondidos = casos.filter((c): c is CasoRespuesta & { primeraRespuestaAt: Date } => c.primeraRespuestaAt !== null);
  if (respondidos.length === 0) return { horasPromedio: null, porcentajeEnSla: null, muestra: 0 };
  const horas = respondidos.reduce((s, c) => s + horasEntre(c.aperturaAt, c.primeraRespuestaAt), 0);
  const enSla = respondidos.filter((c) => c.primeraRespuestaAt <= c.fechaLimite).length;
  return {
    horasPromedio: Math.round((horas / respondidos.length) * 100) / 100,
    porcentajeEnSla: porcentaje(enSla, respondidos.length),
    muestra: respondidos.length,
  };
}

/** Indicador 5: clientes completos / clientes activos x 100. */
export const tasaCompletitud = (completos: number, activos: number) => porcentaje(completos, activos);

/** Indicador 6: usuarios con alguna escritura en los últimos 30 días / usuarios activos x 100. */
export const tasaUsuariosActivos = (conEscritura: number, activos: number) => porcentaje(conEscritura, activos);

export type Semaforo = "verde" | "ambar" | "rojo" | "sin_datos";

export interface MetaIndicador {
  lineaBase: number | null;
  meta: number;
  menorEsMejor?: boolean;
}

/**
 * Verde si cumple la meta; ámbar entre la línea base y la meta; rojo bajo la línea base.
 * Sin línea base (no se mide hoy), ámbar desde el 80 % de la meta (o hasta 1/0,8 de la meta si menor es mejor).
 */
export function semaforo(valor: number | null, { lineaBase, meta, menorEsMejor = false }: MetaIndicador): Semaforo {
  if (valor === null) return "sin_datos";
  const f = INDICADORES.ambarSinLineaBase;
  if (menorEsMejor) {
    if (valor <= meta) return "verde";
    return valor <= (lineaBase ?? meta / f) ? "ambar" : "rojo";
  }
  if (valor >= meta) return "verde";
  return valor >= (lineaBase ?? meta * f) ? "ambar" : "rojo";
}

/** Reparte los elementos por mes (según su fecha); lo que cae fuera de los meses o no tiene fecha se descarta. */
export function agruparPorMes<T>(items: T[], fecha: (item: T) => Date | null, meses: MesPeriodo[]): T[][] {
  const grupos: T[][] = meses.map(() => []);
  for (const item of items) {
    const f = fecha(item);
    if (!f) continue;
    const t = f.getTime();
    const i = meses.findIndex((m) => t >= m.inicio.getTime() && t < m.finExcl.getTime());
    if (i >= 0) grupos[i].push(item);
  }
  return grupos;
}
