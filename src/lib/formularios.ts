// Utilidades comunes de los formularios con Server Actions (patrón useActionState).

export interface ResultadoForm {
  ok?: boolean;
  mensaje?: string;
  error?: string;
  errores?: Record<string, string[] | undefined>;
  /** Valores enviados, para que el formulario no se vacíe al fallar. */
  valores?: Record<string, string>;
}

/** FormData -> objeto con solo los campos de texto. */
export function crudo(formData: FormData): Record<string, string> {
  return Object.fromEntries([...formData].filter(([, v]) => typeof v === "string")) as Record<string, string>;
}

export const conError = (error: string, valores: Record<string, string>): ResultadoForm => ({ error, valores });

export const conErrores = (errores: Record<string, string[] | undefined>, valores: Record<string, string>): ResultadoForm => ({
  errores,
  valores,
});
