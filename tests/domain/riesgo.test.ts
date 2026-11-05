import { describe, expect, it } from "vitest";
import { estadoTrasEvaluacion, evaluarRiesgo, resumirCompras } from "@/domain/riesgo";

const DIA = 24 * 60 * 60 * 1000;
const ahora = new Date("2026-11-04T00:00:00Z");
const haceDias = (n: number) => new Date(ahora.getTime() - n * DIA);

/** n pedidos separados por `cada` días; el último ocurre hace `ultimoHace` días. */
function compras(n: number, cada: number, ultimoHace: number) {
  return Array.from({ length: n }, (_, i) => haceDias(ultimoHace + (n - 1 - i) * cada));
}

describe("resumirCompras", () => {
  it("sin pedidos no hay fechas", () => {
    expect(resumirCompras([])).toEqual({ cantidad: 0, primera: null, ultima: null });
  });
  it("toma la primera y la última sin importar el orden", () => {
    const f = [haceDias(10), haceDias(50), haceDias(30)];
    expect(resumirCompras(f)).toEqual({ cantidad: 3, primera: haceDias(50), ultima: haceDias(10) });
  });
});

describe("evaluarRiesgo (regla 2)", () => {
  it("sin pedidos: no está en riesgo", () => {
    const r = evaluarRiesgo(resumirCompras([]), ahora);
    expect(r.enRiesgo).toBe(false);
    expect(r.diasSinCompra).toBeNull();
    expect(r.intervaloMedioDias).toBeNull();
  });

  it("con menos de 3 pedidos nunca está en riesgo, por viejo que sea el último", () => {
    expect(evaluarRiesgo(resumirCompras(compras(1, 0, 500)), ahora).enRiesgo).toBe(false);
    expect(evaluarRiesgo(resumirCompras(compras(2, 20, 500)), ahora).enRiesgo).toBe(false);
  });

  it("el intervalo medio es (última - primera) / (pedidos - 1)", () => {
    const r = evaluarRiesgo(resumirCompras(compras(4, 40, 10)), ahora);
    expect(r.intervaloMedioDias).toBe(40);
    expect(r.umbralDias).toBe(60);
  });

  it("umbral exacto: 1,5 veces el intervalo no es riesgo; un día más sí", () => {
    // intervalo 40 -> umbral 60
    expect(evaluarRiesgo(resumirCompras(compras(4, 40, 60)), ahora).enRiesgo).toBe(false);
    const r = evaluarRiesgo(resumirCompras(compras(4, 40, 61)), ahora);
    expect(r.enRiesgo).toBe(true);
    expect(r.diasSinCompra).toBe(61);
  });

  it("aplica el mínimo de 30 días cuando 1,5 veces el intervalo es menor", () => {
    // intervalo 10 -> 1,5x = 15, pero el umbral es 30
    expect(evaluarRiesgo(resumirCompras(compras(5, 10, 30)), ahora).enRiesgo).toBe(false);
    const r = evaluarRiesgo(resumirCompras(compras(5, 10, 31)), ahora);
    expect(r.enRiesgo).toBe(true);
    expect(r.umbralDias).toBe(30);
  });

  it("pedidos el mismo día: intervalo 0 y umbral mínimo", () => {
    const r = evaluarRiesgo(resumirCompras([haceDias(100), haceDias(100), haceDias(100)]), ahora);
    expect(r.intervaloMedioDias).toBe(0);
    expect(r.enRiesgo).toBe(true);
  });

  it("un cliente que compra con regularidad no está en riesgo", () => {
    expect(evaluarRiesgo(resumirCompras(compras(6, 15, 5)), ahora).enRiesgo).toBe(false);
  });
});

describe("estadoTrasEvaluacion", () => {
  it("pasa a EN_RIESGO y vuelve a ACTIVO", () => {
    expect(estadoTrasEvaluacion("ACTIVO", true)).toBe("EN_RIESGO");
    expect(estadoTrasEvaluacion("EN_RIESGO", false)).toBe("ACTIVO");
    expect(estadoTrasEvaluacion("EN_RIESGO", true)).toBe("EN_RIESGO");
  });
  it("un cliente INACTIVO (dado de baja) no cambia", () => {
    expect(estadoTrasEvaluacion("INACTIVO", true)).toBe("INACTIVO");
    expect(estadoTrasEvaluacion("INACTIVO", false)).toBe("INACTIVO");
  });
});
