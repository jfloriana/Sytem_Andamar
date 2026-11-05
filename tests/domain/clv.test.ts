import { describe, expect, it } from "vitest";
import { calcularClv, clvPorSegmento } from "@/domain/clv";

describe("calcularClv (RF-09): m x r / (1 + d - r)", () => {
  it("aplica la fórmula con d = 10 % por defecto", () => {
    // 1000 * 0.8 / (1 + 0.1 - 0.8) = 800 / 0.3
    expect(calcularClv(1000, 0.8)).toBeCloseTo(2666.67, 2);
  });
  it("acepta otra tasa de descuento", () => {
    expect(calcularClv(500, 0.5, 0.5)).toBeCloseTo(250, 5);
  });
  it("margen cero da CLV cero", () => {
    expect(calcularClv(0, 0.78)).toBe(0);
  });
  it("retención cero da CLV cero", () => {
    expect(calcularClv(1000, 0)).toBe(0);
  });
  it("retención 100 %: m / d", () => {
    expect(calcularClv(1000, 1)).toBeCloseTo(10000, 5);
  });
  it("devuelve null con entradas inválidas", () => {
    expect(calcularClv(-1, 0.8)).toBeNull();
    expect(calcularClv(100, 1.2)).toBeNull();
    expect(calcularClv(100, -0.1)).toBeNull();
    expect(calcularClv(Number.NaN, 0.8)).toBeNull();
  });
  it("devuelve null si el denominador no es positivo", () => {
    expect(calcularClv(100, 0.5, -0.5)).toBeNull();
  });
});

describe("clvPorSegmento", () => {
  it("agrupa por segmento con clientes, margen y CLV promedio", () => {
    const r = clvPorSegmento(
      [
        { segmento: "A", margenAnual: 1500 },
        { segmento: "A", margenAnual: 1000 },
        { segmento: "C", margenAnual: 100 },
      ],
      0.78,
    );
    const a = r.find((s) => s.segmento === "A")!;
    expect(a.clientes).toBe(2);
    expect(a.margenTotal).toBe(2500);
    expect(a.clvTotal).toBeCloseTo((1500 * 0.78) / 0.32 + (1000 * 0.78) / 0.32, 2);
    expect(a.clvPromedio).toBeCloseTo(a.clvTotal / 2, 5);
  });
  it("siempre devuelve los cuatro segmentos en orden, los vacíos en cero", () => {
    const r = clvPorSegmento([], 0.78);
    expect(r.map((s) => s.segmento)).toEqual(["A", "B", "C", "SIN_CLASIFICAR"]);
    expect(r.every((s) => s.clientes === 0 && s.clvPromedio === 0 && s.clvTotal === 0)).toBe(true);
  });
});
