// Períodos y meses de calendario en UTC. Un período es [desde, hastaExcl): `hastaExcl` es exclusivo.
import { INDICADORES } from "@/config";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Resta meses de calendario; si el mes destino es más corto, usa su último día. */
export function restarMeses(fecha: Date, meses: number): Date {
  const total = fecha.getUTCFullYear() * 12 + fecha.getUTCMonth() - meses;
  const anio = Math.floor(total / 12);
  const mes = total - anio * 12;
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      anio,
      mes,
      Math.min(fecha.getUTCDate(), ultimoDia),
      fecha.getUTCHours(),
      fecha.getUTCMinutes(),
      fecha.getUTCSeconds(),
      fecha.getUTCMilliseconds(),
    ),
  );
}

/** Día 1 del mes a las 00:00 UTC. */
export const inicioDeMes = (fecha: Date): Date => new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));

export interface MesPeriodo {
  /** «2026-11». */
  etiqueta: string;
  inicio: Date;
  finExcl: Date;
}

/** Los `n` meses que terminan en el mes de `fecha` (inclusive), del más antiguo al más reciente. */
export function mesesTerminadosEn(fecha: Date, n: number): MesPeriodo[] {
  const base = inicioDeMes(fecha);
  return Array.from({ length: n }, (_, i) => {
    const inicio = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - (n - 1 - i), 1));
    const finExcl = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1));
    const etiqueta = `${inicio.getUTCFullYear()}-${String(inicio.getUTCMonth() + 1).padStart(2, "0")}`;
    return { etiqueta, inicio, finExcl };
  });
}

export interface PeriodoResuelto {
  desde: Date;
  /** Último día incluido. */
  hasta: Date;
  hastaExcl: Date;
  error?: string;
}

const FORMATO_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

function leerDia(valor: string): Date | null {
  const m = FORMATO_DIA.exec(valor.trim());
  if (!m) return null;
  const [anio, mes, dia] = m.slice(1).map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const coincide = fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  return coincide ? fecha : null;
}

function porDefecto(ahora: Date, hasta?: Date): Omit<PeriodoResuelto, "error"> {
  const ultimo = hasta ?? new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
  const hastaExcl = new Date(ultimo.getTime() + DIA_MS);
  return { desde: restarMeses(hastaExcl, INDICADORES.periodoMeses), hasta: ultimo, hastaExcl };
}

/**
 * Resuelve el período del tablero desde los textos `yyyy-mm-dd` de los filtros.
 * Si algo no es válido devuelve el período por defecto (12 meses hasta hoy) y un `error`.
 */
export function resolverPeriodo(desdeTxt: string | undefined, hastaTxt: string | undefined, ahora: Date): PeriodoResuelto {
  const predeterminado = porDefecto(ahora);
  const falla = (error: string): PeriodoResuelto => ({ ...predeterminado, error });
  const sinFiltro = (v: string | undefined) => v === undefined || v.trim() === "";

  const desdeFecha = sinFiltro(desdeTxt) ? null : leerDia(desdeTxt as string);
  const hastaFecha = sinFiltro(hastaTxt) ? null : leerDia(hastaTxt as string);
  if ((!sinFiltro(desdeTxt) && !desdeFecha) || (!sinFiltro(hastaTxt) && !hastaFecha)) {
    return falla("Escribe fechas válidas con el formato año-mes-día.");
  }
  if (hastaFecha && hastaFecha.getTime() > predeterminado.hasta.getTime()) {
    return falla("La fecha final no puede ser futura.");
  }
  const base = porDefecto(ahora, hastaFecha ?? undefined);
  const desde = desdeFecha ?? base.desde;
  if (desde.getTime() > base.hasta.getTime()) {
    return falla("La fecha inicial debe ser anterior o igual a la final.");
  }
  if (desde.getTime() < restarMeses(base.hastaExcl, INDICADORES.periodoMaxMeses).getTime()) {
    return falla(`El período no puede superar ${INDICADORES.periodoMaxMeses} meses.`);
  }
  return { desde, hasta: base.hasta, hastaExcl: base.hastaExcl };
}
