// Reglas de servicio (RF-10, RF-11, regla 4): plazo, escalamiento calculado al consultar y tiempos.
import { SLA } from "@/config";

export type EstadoCaso = "ABIERTO" | "EN_PROCESO" | "ESCALADO" | "RESUELTO" | "CERRADO";

export interface CasoSla {
  estado: EstadoCaso;
  aperturaAt: Date;
  fechaLimite: Date;
  primeraRespuestaAt: Date | null;
  resueltoAt: Date | null;
  resueltoPrimerContacto: boolean;
}

const HORA_MS = 60 * 60 * 1000;

export const calcularFechaLimite = (aperturaAt: Date, horas: number = SLA.horasLimite): Date =>
  new Date(aperturaAt.getTime() + horas * HORA_MS);

const estaCerrado = (estado: EstadoCaso) => estado === "RESUELTO" || estado === "CERRADO";

/** Sin primera respuesta y pasado el límite (estrictamente), mientras el caso siga abierto. */
export const estaVencido = (c: CasoSla, ahora: Date): boolean =>
  !estaCerrado(c.estado) && c.primeraRespuestaAt === null && ahora > c.fechaLimite;

/** Estado que se muestra: un caso vencido se considera ESCALADO al consultarlo, sin proceso de fondo. */
export function estadoEfectivo(c: CasoSla, ahora: Date): EstadoCaso {
  return estaVencido(c, ahora) ? "ESCALADO" : c.estado;
}

/** Horas entre dos instantes, con dos decimales. */
export const horasEntre = (desde: Date, hasta: Date): number =>
  Math.round(((hasta.getTime() - desde.getTime()) / HORA_MS) * 100) / 100;

export const tiempoRespuestaHoras = (c: CasoSla): number | null =>
  c.primeraRespuestaAt ? horasEntre(c.aperturaAt, c.primeraRespuestaAt) : null;

export const tiempoResolucionHoras = (c: CasoSla): number | null =>
  c.resueltoAt ? horasEntre(c.aperturaAt, c.resueltoAt) : null;

/** `true` si respondió dentro del plazo; `null` mientras no haya primera respuesta. */
export const dentroDeSla = (c: CasoSla): boolean | null =>
  c.primeraRespuestaAt ? c.primeraRespuestaAt <= c.fechaLimite : null;

export type ResultadoTransicion<C> = { ok: true; cambios: C } | { ok: false; mensaje: string };

const rechazo = (mensaje: string): { ok: false; mensaje: string } => ({ ok: false, mensaje });

export function registrarPrimeraRespuesta(
  c: CasoSla,
  ahora: Date,
): ResultadoTransicion<{ estado: "EN_PROCESO"; primeraRespuestaAt: Date }> {
  if (estaCerrado(c.estado)) return rechazo("El caso ya está resuelto.");
  if (c.primeraRespuestaAt) return rechazo("El caso ya tiene primera respuesta.");
  return { ok: true, cambios: { estado: "EN_PROCESO", primeraRespuestaAt: ahora } };
}

/** Resolver fija la primera respuesta si faltaba; «primer contacto» solo vale si la resolución es esa respuesta. */
export function resolverCaso(
  c: CasoSla,
  ahora: Date,
  marcarPrimerContacto: boolean,
): ResultadoTransicion<{
  estado: "RESUELTO";
  primeraRespuestaAt: Date;
  resueltoAt: Date;
  resueltoPrimerContacto: boolean;
}> {
  if (estaCerrado(c.estado)) return rechazo("El caso ya está resuelto.");
  return {
    ok: true,
    cambios: {
      estado: "RESUELTO",
      primeraRespuestaAt: c.primeraRespuestaAt ?? ahora,
      resueltoAt: ahora,
      resueltoPrimerContacto: marcarPrimerContacto && c.primeraRespuestaAt === null,
    },
  };
}

export function cerrarCaso(c: CasoSla): ResultadoTransicion<{ estado: "CERRADO" }> {
  if (c.estado !== "RESUELTO") return rechazo("Solo se puede cerrar un caso resuelto.");
  return { ok: true, cambios: { estado: "CERRADO" } };
}
