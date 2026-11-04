// Regla 5: cliente completo = documento, razón social, contacto principal con teléfono o correo,
// dirección y vendedor asignado.

export interface DatosCompletitud {
  documento: string | null | undefined;
  razonSocial: string | null | undefined;
  direccion: string | null | undefined;
  vendedorId: string | null | undefined;
  contactoPrincipal: { telefono?: string | null; email?: string | null } | null | undefined;
}

const lleno = (v: string | null | undefined) => (v ?? "").trim() !== "";

export function camposFaltantes(c: DatosCompletitud): string[] {
  const faltan: string[] = [];
  if (!lleno(c.documento)) faltan.push("documento");
  if (!lleno(c.razonSocial)) faltan.push("razón social");
  if (!lleno(c.direccion)) faltan.push("dirección");
  if (!lleno(c.vendedorId)) faltan.push("vendedor");
  if (!c.contactoPrincipal) faltan.push("contacto principal");
  else if (!lleno(c.contactoPrincipal.telefono) && !lleno(c.contactoPrincipal.email)) {
    faltan.push("teléfono o correo del contacto principal");
  }
  return faltan;
}

export function esClienteCompleto(c: DatosCompletitud): boolean {
  return camposFaltantes(c).length === 0;
}

/** Porcentaje entero (0-100) de clientes completos; 0 si no hay clientes. */
export function porcentajeCompletitud(clientes: DatosCompletitud[]): number {
  if (clientes.length === 0) return 0;
  return Math.round((clientes.filter(esClienteCompleto).length / clientes.length) * 100);
}
