export const ROLES = [
  "ADMIN",
  "GERENCIA",
  "JEFE_VENTAS",
  "VENDEDOR",
  "JEFE_SERVICIO",
  "EJECUTIVO_SERVICIO",
] as const;

export type Rol = (typeof ROLES)[number];

export const ETIQUETA_ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  GERENCIA: "Gerencia",
  JEFE_VENTAS: "Jefe de ventas",
  VENDEDOR: "Vendedor",
  JEFE_SERVICIO: "Jefe de servicio",
  EJECUTIVO_SERVICIO: "Ejecutivo de servicio",
};

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && (ROLES as readonly string[]).includes(valor);
}
