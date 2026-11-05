// Solicitudes de los titulares de datos (RF-13): plazos en días hábiles, estados y cierre. Funciones puras.
import { CUMPLIMIENTO } from "@/config";

export type TipoSolicitud = "ACCESO" | "RECTIFICACION" | "SUPRESION";
export type EstadoSolicitud = "PENDIENTE" | "EN_PROCESO" | "ATENDIDA" | "RECHAZADA";

const DIA_MS = 24 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;

const esFinDeSemana = (f: Date) => f.getUTCDay() === 0 || f.getUTCDay() === 6;

/** Suma días hábiles (lunes a viernes, UTC) conservando la hora; sin feriados. */
export function sumarDiasHabiles(desde: Date, dias: number): Date {
  if (dias < 0) throw new Error("Los días hábiles no pueden ser negativos.");
  let fecha = new Date(desde.getTime());
  let restantes = dias;
  while (restantes > 0) {
    fecha = new Date(fecha.getTime() + DIA_MS);
    if (!esFinDeSemana(fecha)) restantes--;
  }
  return fecha;
}

export const fechaLimiteSolicitud = (solicitadaAt: Date, tipo: TipoSolicitud): Date =>
  sumarDiasHabiles(solicitadaAt, CUMPLIMIENTO.plazoDiasHabiles[tipo]);

export interface SolicitudDominio {
  tipo: TipoSolicitud;
  estado: EstadoSolicitud;
  solicitadaAt: Date;
  atendidaAt: Date | null;
}

export type EstadoPlazo = "EN_PLAZO" | "POR_VENCER" | "VENCIDA" | "CERRADA_A_TIEMPO" | "CERRADA_TARDE";

export interface EvaluacionPlazo {
  estado: EstadoPlazo;
  fechaLimite: Date;
}

const esFinal = (e: EstadoSolicitud) => e === "ATENDIDA" || e === "RECHAZADA";

/** Abierta: en plazo, por vencer (48 h o menos) o vencida (pasó el límite). Cerrada: a tiempo o tarde según `atendidaAt`. */
export function estadoDelPlazo(s: SolicitudDominio, ahora: Date): EvaluacionPlazo {
  const fechaLimite = fechaLimiteSolicitud(s.solicitadaAt, s.tipo);
  if (esFinal(s.estado)) {
    const tarde = s.atendidaAt !== null && s.atendidaAt.getTime() > fechaLimite.getTime();
    return { estado: tarde ? "CERRADA_TARDE" : "CERRADA_A_TIEMPO", fechaLimite };
  }
  const falta = fechaLimite.getTime() - ahora.getTime();
  if (falta < 0) return { estado: "VENCIDA", fechaLimite };
  return { estado: falta <= CUMPLIMIENTO.avisoHoras * HORA_MS ? "POR_VENCER" : "EN_PLAZO", fechaLimite };
}

const TRANSICIONES: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  PENDIENTE: ["EN_PROCESO", "ATENDIDA", "RECHAZADA"],
  EN_PROCESO: ["ATENDIDA", "RECHAZADA"],
  ATENDIDA: [],
  RECHAZADA: [],
};

export const transicionPermitida = (desde: EstadoSolicitud, hasta: EstadoSolicitud): boolean => TRANSICIONES[desde].includes(hasta);

export type ResultadoCierre = { ok: true; resolucion: string | null } | { ok: false; mensaje: string };

/** Atender no exige texto; rechazar exige el motivo (mínimo de caracteres en `src/config.ts`). */
export function validarCierre(hacia: "ATENDIDA" | "RECHAZADA", texto: string): ResultadoCierre {
  const resolucion = texto.trim();
  if (hacia === "RECHAZADA" && resolucion.length < CUMPLIMIENTO.minLongitudResolucion) {
    return { ok: false, mensaje: `Indica el motivo del rechazo (mínimo ${CUMPLIMIENTO.minLongitudResolucion} caracteres).` };
  }
  return { ok: true, resolucion: resolucion === "" ? null : resolucion };
}
