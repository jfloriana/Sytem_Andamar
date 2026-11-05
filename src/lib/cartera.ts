import type { Prisma } from "@prisma/client";
import type { Rol } from "@/lib/roles";

/** Filtro de Prisma con los clientes que el usuario puede ver (alineado con `can()`). */
export function filtroCartera(usuario: { id: string; rol: Rol }): Prisma.ClienteWhereInput {
  if (usuario.rol === "VENDEDOR") return { vendedorId: usuario.id };
  if (usuario.rol === "JEFE_VENTAS") {
    return { OR: [{ vendedorId: usuario.id }, { vendedor: { jefeId: usuario.id } }] };
  }
  return {};
}

/** Alcance sobre registros con `vendedorId` y relación `vendedor` (oportunidades, pedidos); alineado con `can()`. */
export function filtroPorVendedor(usuario: { id: string; rol: Rol }): {
  vendedorId?: string;
  OR?: ({ vendedorId: string } | { vendedor: { jefeId: string } })[];
} {
  if (usuario.rol === "VENDEDOR") return { vendedorId: usuario.id };
  if (usuario.rol === "JEFE_VENTAS") return { OR: [{ vendedorId: usuario.id }, { vendedor: { jefeId: usuario.id } }] };
  return {};
}
