import { describe, expect, it } from "vitest";
import { filtroCartera } from "@/lib/cartera";

describe("filtroCartera", () => {
  it("VENDEDOR ve solo su cartera", () => {
    expect(filtroCartera({ id: "u1", rol: "VENDEDOR" })).toEqual({ vendedorId: "u1" });
  });
  it("JEFE_VENTAS ve a su equipo", () => {
    expect(filtroCartera({ id: "j1", rol: "JEFE_VENTAS" })).toEqual({
      OR: [{ vendedorId: "j1" }, { vendedor: { jefeId: "j1" } }],
    });
  });
  it.each(["ADMIN", "GERENCIA", "JEFE_SERVICIO", "EJECUTIVO_SERVICIO"] as const)("%s ve todo", (rol) => {
    expect(filtroCartera({ id: "x", rol })).toEqual({});
  });
});
