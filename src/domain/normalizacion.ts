// Normalización de datos de clientes para comparar y detectar duplicados. Funciones puras.

const SUFIJOS_SOCIETARIOS = new Set(["sac", "sa", "srl", "eirl", "sas", "sc", "ltda", "cia"]);

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Minúsculas, sin tildes ni puntuación, sin sufijos societarios (S.A.C., E.I.R.L...). */
export function normalizarNombre(nombre: string | null | undefined): string {
  const base = sinTildes(nombre ?? "")
    .toLowerCase()
    // "s.a.c." y "e.i.r.l." se pegan antes de quitar la puntuación.
    .replace(/\b(?:[a-z]\.){2,}/g, (m) => m.replace(/\./g, ""))
    .replace(/[^a-z0-9\s]/g, " ");
  const palabras = base.split(/\s+/).filter(Boolean);
  while (palabras.length > 1 && SUFIJOS_SOCIETARIOS.has(palabras[palabras.length - 1])) palabras.pop();
  return palabras.join(" ");
}

/** Solo dígitos; quita el prefijo de país 51 cuando sobra (celular de 9 dígitos). */
export function normalizarTelefono(telefono: string | null | undefined): string {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  return digitos.length === 11 && digitos.startsWith("51") ? digitos.slice(2) : digitos;
}

/** Documento sin espacios ni guiones, en mayúsculas. */
export function normalizarDocumento(documento: string | null | undefined): string {
  return (documento ?? "").replace(/[\s-]/g, "").toUpperCase();
}

function distanciaLevenshtein(a: string, b: string): number {
  let previa = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + costo);
    }
    previa = actual;
  }
  return previa[b.length];
}

/** Similitud entre 0 y 1 (1 = iguales). Dos textos vacíos no son similares. */
export function similitud(a: string, b: string): number {
  const largo = Math.max(a.length, b.length);
  if (largo === 0) return 0;
  return 1 - distanciaLevenshtein(a, b) / largo;
}
