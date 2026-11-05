// Fechas de formularios en hora de Lima (UTC-5 todo el año, sin horario de verano).
// El servidor corre en UTC: toda fecha escrita por una persona se convierte aquí.

const DESFASE_LIMA_MS = 5 * 60 * 60 * 1000;
const FORMATO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "2026-11-04T09:30" (hora de Lima, valor de `datetime-local`) -> instante UTC; `null` si no es válido. */
export function limaAUtc(valor: string | null | undefined): Date | null {
  const m = FORMATO.exec((valor ?? "").trim());
  if (!m) return null;
  const [anio, mes, dia, hora, minuto] = m.slice(1).map(Number);
  const local = new Date(Date.UTC(anio, mes - 1, dia, hora, minuto));
  const coincide =
    local.getUTCFullYear() === anio &&
    local.getUTCMonth() === mes - 1 &&
    local.getUTCDate() === dia &&
    local.getUTCHours() === hora &&
    local.getUTCMinutes() === minuto;
  return coincide ? new Date(local.getTime() + DESFASE_LIMA_MS) : null;
}

/** Instante UTC -> valor para un `datetime-local` en hora de Lima. */
export function utcALimaInput(fecha: Date): string {
  return new Date(fecha.getTime() - DESFASE_LIMA_MS).toISOString().slice(0, 16);
}
