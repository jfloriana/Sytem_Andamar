// Exportación CSV segura: entrecomilla lo necesario y neutraliza fórmulas de hoja de cálculo.

export type CeldaCsv = string | number | null | undefined;

const PELIGROSO = /^[=+\-@\t\r]/;

function celda(valor: CeldaCsv): string {
  if (valor === null || valor === undefined || valor === "") return "";
  if (typeof valor === "number") return String(valor);
  const texto = PELIGROSO.test(valor) ? `'${valor}` : valor;
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function aCsv(filas: CeldaCsv[][]): string {
  return filas.map((fila) => fila.map(celda).join(",")).join("\r\n");
}
