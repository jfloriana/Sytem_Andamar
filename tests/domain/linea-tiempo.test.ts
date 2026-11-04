import { describe, expect, it } from "vitest";
import { construirLineaTiempo } from "@/domain/linea-tiempo";

describe("construirLineaTiempo", () => {
  it("mezcla eventos y ordena del más reciente al más antiguo", () => {
    const r = construirLineaTiempo([
      { tipo: "pedido", id: "p1", fecha: new Date("2025-03-01"), titulo: "Pedido" },
      { tipo: "actividad", id: "a1", fecha: new Date("2025-05-01"), titulo: "Visita" },
      { tipo: "caso", id: "c1", fecha: new Date("2025-04-01"), titulo: "Reclamo" },
    ]);
    expect(r.map((e) => e.id)).toEqual(["a1", "c1", "p1"]);
  });
  it("desempata por id de forma estable", () => {
    const f = new Date("2025-01-01");
    const r = construirLineaTiempo([
      { tipo: "pedido", id: "b", fecha: f, titulo: "x" },
      { tipo: "pedido", id: "a", fecha: f, titulo: "y" },
    ]);
    expect(r.map((e) => e.id)).toEqual(["a", "b"]);
  });
  it("limita la cantidad", () => {
    const eventos = Array.from({ length: 5 }, (_, i) => ({
      tipo: "actividad" as const,
      id: String(i),
      fecha: new Date(2025, 0, i + 1),
      titulo: "t",
    }));
    expect(construirLineaTiempo(eventos, 2)).toHaveLength(2);
  });
  it("no modifica la entrada", () => {
    const e = [
      { tipo: "pedido" as const, id: "2", fecha: new Date(2025, 0, 1), titulo: "t" },
      { tipo: "pedido" as const, id: "1", fecha: new Date(2025, 0, 2), titulo: "t" },
    ];
    construirLineaTiempo(e);
    expect(e.map((x) => x.id)).toEqual(["2", "1"]);
  });
});
