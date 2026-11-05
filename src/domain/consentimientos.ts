// Consentimientos por finalidad y canal (RF-13) y contacto responsable (regla 6). Funciones puras.
import { COMUNICACION } from "@/config";

export type Finalidad = "SERVICIO" | "PROMOCIONES" | "ANALITICA";
export type Canal = "TELEFONO" | "EMAIL" | "WHATSAPP" | "PRESENCIAL";

export const FINALIDADES: readonly Finalidad[] = ["SERVICIO", "PROMOCIONES", "ANALITICA"];
export const CANALES: readonly Canal[] = ["TELEFONO", "EMAIL", "WHATSAPP", "PRESENCIAL"];

const DIA_MS = 24 * 60 * 60 * 1000;

export interface ConsentimientoDominio {
  finalidad: Finalidad;
  canal: Canal;
  otorgadoAt: Date;
  retiradoAt: Date | null;
}

/** Vigente = ya otorgado y sin retiro efectivo (el instante exacto del retiro ya no cuenta). */
export function estaVigente(c: ConsentimientoDominio, ahora: Date): boolean {
  if (c.otorgadoAt.getTime() > ahora.getTime()) return false;
  return c.retiradoAt === null || c.retiradoAt.getTime() > ahora.getTime();
}

export interface ResumenFinalidad {
  estado: "VIGENTE" | "RETIRADO" | "SIN_REGISTRO";
  /** Canales con consentimiento vigente. */
  canales: Canal[];
}

/** Estado actual de cada finalidad: vigente si algún canal sigue vigente; retirado si todos se retiraron. */
export function resumenPorFinalidad(consentimientos: ConsentimientoDominio[], ahora: Date): Record<Finalidad, ResumenFinalidad> {
  const resumen = {} as Record<Finalidad, ResumenFinalidad>;
  for (const finalidad of FINALIDADES) {
    const propios = consentimientos.filter((c) => c.finalidad === finalidad);
    const canales = [...new Set(propios.filter((c) => estaVigente(c, ahora)).map((c) => c.canal))];
    const estado = canales.length > 0 ? "VIGENTE" : propios.some((c) => c.retiradoAt !== null) ? "RETIRADO" : "SIN_REGISTRO";
    resumen[finalidad] = { estado, canales };
  }
  return resumen;
}

export type ResultadoRetiro = { ok: true; retiradoAt: Date } | { ok: false; mensaje: string };

/** Retirar es un solo paso; lo único que se rechaza es retirar dos veces el mismo consentimiento. */
export function validarRetiro(c: ConsentimientoDominio, ahora: Date): ResultadoRetiro {
  if (c.retiradoAt !== null) return { ok: false, mensaje: "Este consentimiento ya fue retirado." };
  return { ok: true, retiradoAt: ahora };
}

export type ResultadoOtorgamiento = { ok: true } | { ok: false; mensaje: string };

/** No se duplica un consentimiento vigente de la misma finalidad y canal. */
export function validarOtorgamiento(
  existentes: ConsentimientoDominio[],
  nuevo: { finalidad: Finalidad; canal: Canal },
  ahora: Date,
): ResultadoOtorgamiento {
  const repetido = existentes.some((c) => c.finalidad === nuevo.finalidad && c.canal === nuevo.canal && estaVigente(c, ahora));
  if (repetido) return { ok: false, mensaje: "Ya existe un consentimiento vigente para esa finalidad y ese canal." };
  return { ok: true };
}

/** Cuántas fechas caen en los últimos 7 días: (ahora - 7 días, ahora]. */
export function contarEnVentanaSemanal(fechas: Date[], ahora: Date): number {
  const desde = ahora.getTime() - 7 * DIA_MS;
  return fechas.filter((f) => f.getTime() > desde && f.getTime() <= ahora.getTime()).length;
}

export interface EvaluacionContacto {
  permitido: boolean;
  motivo: "OK" | "LIMITE_SEMANAL" | "RETIRADO" | "SIN_CONSENTIMIENTO";
  /** Comunicaciones promocionales que aún caben esta semana. */
  restantes: number;
}

/** Regla 6: máximo 2 promocionales por semana y ninguna sin consentimiento vigente de PROMOCIONES. */
export function evaluarContactoPromocional(
  consentimientos: ConsentimientoDominio[],
  enviadasUltimaSemana: number,
  ahora: Date,
): EvaluacionContacto {
  const promo = resumenPorFinalidad(consentimientos, ahora).PROMOCIONES;
  if (promo.estado === "RETIRADO") return { permitido: false, motivo: "RETIRADO", restantes: 0 };
  if (promo.estado === "SIN_REGISTRO") return { permitido: false, motivo: "SIN_CONSENTIMIENTO", restantes: 0 };
  const restantes = Math.max(0, COMUNICACION.maxPromocionalesPorSemana - enviadasUltimaSemana);
  if (restantes === 0) return { permitido: false, motivo: "LIMITE_SEMANAL", restantes: 0 };
  return { permitido: true, motivo: "OK", restantes };
}
