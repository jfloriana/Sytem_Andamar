// Reglas de actividades y tareas (RF-05): qué está vencido en «Mi día» y cómo nace cada tipo.

export type TipoActividad = "VISITA" | "LLAMADA" | "MENSAJE" | "TAREA";

export interface TareaClasificable {
  fecha: Date;
  recordatorioAt: Date | null;
  completada: boolean;
}

/** Fecha en que la tarea debe atenderse: el recordatorio, o la fecha de la actividad si no hay. */
export function fechaTarea(t: Pick<TareaClasificable, "fecha" | "recordatorioAt">): Date {
  return t.recordatorioAt ?? t.fecha;
}

/** Tareas sin completar, separadas en vencidas (antes de ahora) y pendientes, cada grupo por fecha ascendente. */
export function clasificarTareas<T extends TareaClasificable>(
  tareas: T[],
  ahora: Date,
): { vencidas: T[]; pendientes: T[] } {
  const abiertas = tareas
    .filter((t) => !t.completada)
    .sort((a, b) => fechaTarea(a).getTime() - fechaTarea(b).getTime());
  return {
    vencidas: abiertas.filter((t) => fechaTarea(t) < ahora),
    pendientes: abiertas.filter((t) => fechaTarea(t) >= ahora),
  };
}

export type ValoresIniciales =
  | { ok: true; completada: boolean; recordatorioAt: Date | null }
  | { ok: false; mensaje: string };

/** Visita, llamada y mensaje ya ocurrieron; una tarea nace pendiente y exige recordatorio. */
export function valoresIniciales(tipo: TipoActividad, recordatorioAt: Date | null): ValoresIniciales {
  if (tipo !== "TAREA") return { ok: true, completada: true, recordatorioAt: null };
  if (!recordatorioAt) return { ok: false, mensaje: "La tarea necesita una fecha de recordatorio." };
  return { ok: true, completada: false, recordatorioAt };
}
