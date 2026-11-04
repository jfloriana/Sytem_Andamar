import { can, type TipoRecurso } from "@/lib/permisos";
import type { Rol } from "@/lib/roles";

export interface ItemMenu {
  href: string;
  etiqueta: string;
}

// `recurso: null` = visible para cualquier usuario con sesión.
const MODULOS: { href: string; etiqueta: string; recurso: TipoRecurso | null }[] = [
  { href: "/", etiqueta: "Inicio", recurso: null },
  { href: "/clientes", etiqueta: "Clientes", recurso: "cliente" },
  { href: "/oportunidades", etiqueta: "Oportunidades", recurso: "oportunidad" },
  { href: "/pedidos", etiqueta: "Pedidos", recurso: "pedido" },
  { href: "/casos", etiqueta: "Casos", recurso: "caso" },
  { href: "/indicadores", etiqueta: "Indicadores", recurso: "indicadores" },
  { href: "/cumplimiento", etiqueta: "Cumplimiento", recurso: "solicitud_titular" },
  { href: "/administracion", etiqueta: "Administración", recurso: "usuario" },
];

/** Menú lateral según el rol: solo módulos que el rol puede ver. */
export function menuPara(usuario: { id: string; rol: Rol }): ItemMenu[] {
  return MODULOS.filter((m) => m.recurso === null || can(usuario, "ver", m.recurso)).map(
    ({ href, etiqueta }) => ({ href, etiqueta }),
  );
}
