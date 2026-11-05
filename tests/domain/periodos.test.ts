import { describe, expect, it } from "vitest";
import { inicioDeMes, mesesTerminadosEn, restarMeses, resolverPeriodo } from "@/domain/periodos";

const d = (s: string) => new Date(s);

describe("restarMeses", () => {
  it("resta meses de calendario en UTC", () => {
    expect(restarMeses(d("2026-11-04T10:00:00Z"), 12)).toEqual(d("2025-11-04T10:00:00Z"));
    expect(restarMeses(d("2026-03-15T00:00:00Z"), 4)).toEqual(d("2025-11-15T00:00:00Z"));
  });
  it("ajusta el día cuando el mes destino es más corto", () => {
    expect(restarMeses(d("2026-03-31T00:00:00Z"), 1)).toEqual(d("2026-02-28T00:00:00Z"));
    expect(restarMeses(d("2024-02-29T00:00:00Z"), 12)).toEqual(d("2023-02-28T00:00:00Z"));
  });
});

describe("inicioDeMes", () => {
  it("devuelve el día 1 a las 00:00 UTC", () => {
    expect(inicioDeMes(d("2026-11-04T23:59:59Z"))).toEqual(d("2026-11-01T00:00:00Z"));
  });
});

describe("mesesTerminadosEn", () => {
  it("lista n meses en orden, el último contiene la fecha", () => {
    const meses = mesesTerminadosEn(d("2026-11-04T00:00:00Z"), 3);
    expect(meses.map((m) => m.etiqueta)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(meses[2].inicio).toEqual(d("2026-11-01T00:00:00Z"));
    expect(meses[2].finExcl).toEqual(d("2026-12-01T00:00:00Z"));
  });
  it("cruza el cambio de año", () => {
    expect(mesesTerminadosEn(d("2026-01-10T00:00:00Z"), 2).map((m) => m.etiqueta)).toEqual(["2025-12", "2026-01"]);
  });
});

describe("resolverPeriodo", () => {
  const ahora = d("2026-11-04T15:00:00Z");
  it("por defecto son los 12 meses que terminan hoy (hasta inclusive)", () => {
    const p = resolverPeriodo(undefined, undefined, ahora);
    expect(p.error).toBeUndefined();
    expect(p.hastaExcl).toEqual(d("2026-11-05T00:00:00Z"));
    expect(p.desde).toEqual(d("2025-11-05T00:00:00Z"));
  });
  it("acepta fechas válidas", () => {
    const p = resolverPeriodo("2026-01-01", "2026-03-31", ahora);
    expect(p.desde).toEqual(d("2026-01-01T00:00:00Z"));
    expect(p.hastaExcl).toEqual(d("2026-04-01T00:00:00Z"));
    expect(p.hasta).toEqual(d("2026-03-31T00:00:00Z"));
  });
  it("rechaza fechas con formato inválido y usa el período por defecto", () => {
    const p = resolverPeriodo("ayer", "2026-03-31", ahora);
    expect(p.error).toMatch(/fecha/i);
    expect(p.hastaExcl).toEqual(d("2026-11-05T00:00:00Z"));
  });
  it("rechaza fechas inexistentes", () => {
    expect(resolverPeriodo("2026-02-30", "2026-03-31", ahora).error).toBeDefined();
  });
  it("rechaza un período invertido", () => {
    expect(resolverPeriodo("2026-05-01", "2026-04-01", ahora).error).toMatch(/anterior/);
  });
  it("rechaza un período mayor al máximo", () => {
    expect(resolverPeriodo("2020-01-01", "2026-04-01", ahora).error).toMatch(/36/);
  });
  it("rechaza una fecha final futura", () => {
    expect(resolverPeriodo("2026-01-01", "2027-01-01", ahora).error).toMatch(/futura/);
  });
});
