import { describe, expect, it } from "vitest";
import { menuPara } from "@/lib/menu";
import type { Rol } from "@/lib/roles";

const etiquetas = (rol: Rol) => menuPara({ id: "u", rol }).map((i) => i.etiqueta);

describe("menuPara: cada rol ve solo su menú", () => {
  it("ADMIN", () => {
    expect(etiquetas("ADMIN")).toEqual(["Inicio", "Clientes", "Indicadores", "Cumplimiento", "Administración"]);
  });
  it("GERENCIA", () => {
    expect(etiquetas("GERENCIA")).toEqual(["Inicio", "Clientes", "Oportunidades", "Pedidos", "Casos", "Indicadores"]);
  });
  it("JEFE_VENTAS", () => {
    expect(etiquetas("JEFE_VENTAS")).toEqual(["Inicio", "Clientes", "Oportunidades", "Pedidos", "Indicadores"]);
  });
  it("VENDEDOR", () => {
    expect(etiquetas("VENDEDOR")).toEqual(["Inicio", "Clientes", "Oportunidades", "Pedidos"]);
  });
  it("JEFE_SERVICIO", () => {
    expect(etiquetas("JEFE_SERVICIO")).toEqual(["Inicio", "Clientes", "Oportunidades", "Pedidos", "Casos", "Indicadores"]);
  });
  it("EJECUTIVO_SERVICIO", () => {
    expect(etiquetas("EJECUTIVO_SERVICIO")).toEqual(["Inicio", "Clientes", "Oportunidades", "Pedidos", "Casos"]);
  });
  it("solo ADMIN ve Administración", () => {
    const roles: Rol[] = ["GERENCIA", "JEFE_VENTAS", "VENDEDOR", "JEFE_SERVICIO", "EJECUTIVO_SERVICIO"];
    for (const rol of roles) expect(etiquetas(rol)).not.toContain("Administración");
  });
});
