import { describe, expect, it } from "vitest";
import {
  esPedidoValido,
  estadoClienteTrasPedido,
  puedeCambiarEstadoPedido,
  totalesPedidos,
  ultimoPedido,
  validarMontosPedido,
  type PedidoCalculo,
} from "@/domain/pedidos";

const p = (id: string, estado: PedidoCalculo["estado"], monto: number, margen: number, dia: number): PedidoCalculo => ({
  id,
  estado,
  monto,
  margen,
  fecha: new Date(Date.UTC(2026, 9, dia)),
});

describe("pedidos anulados no cuentan (regla del modelo)", () => {
  it("solo ANULADO deja de ser válido", () => {
    expect(esPedidoValido({ estado: "REGISTRADO" })).toBe(true);
    expect(esPedidoValido({ estado: "ENTREGADO" })).toBe(true);
    expect(esPedidoValido({ estado: "ANULADO" })).toBe(false);
  });
  const lista = [p("a", "REGISTRADO", 100.1, 10.05, 1), p("b", "ENTREGADO", 200.2, 20.1, 5), p("c", "ANULADO", 999, 500, 20)];
  it("los totales excluyen anulados y suman sin errores de coma flotante", () => {
    expect(totalesPedidos(lista)).toEqual({ cantidad: 2, monto: 300.3, margen: 30.15, ultimoPedidoAt: new Date(Date.UTC(2026, 9, 5)) });
  });
  it("el último pedido ignora los anulados aunque sean más recientes", () => {
    expect(ultimoPedido(lista)?.id).toBe("b");
  });
  it("sin pedidos válidos todo es cero y no hay último pedido", () => {
    expect(totalesPedidos([])).toEqual({ cantidad: 0, monto: 0, margen: 0, ultimoPedidoAt: null });
    expect(totalesPedidos([p("c", "ANULADO", 5, 1, 1)]).cantidad).toBe(0);
    expect(ultimoPedido([p("c", "ANULADO", 5, 1, 1)])).toBeNull();
  });
});

describe("validarMontosPedido", () => {
  it("acepta monto positivo y margen entre 0 y el monto", () => {
    expect(validarMontosPedido(100, 0)).toEqual([]);
    expect(validarMontosPedido(100, 100)).toEqual([]);
    expect(validarMontosPedido(100, 25.5)).toEqual([]);
  });
  it("rechaza monto cero o negativo", () => {
    expect(validarMontosPedido(0, 0)).toContain("El monto debe ser mayor que cero.");
    expect(validarMontosPedido(-1, 0)).toContain("El monto debe ser mayor que cero.");
  });
  it("rechaza margen negativo o mayor que el monto", () => {
    expect(validarMontosPedido(100, -1)).toContain("El margen no puede ser negativo.");
    expect(validarMontosPedido(100, 100.01)).toContain("El margen no puede superar el monto.");
  });
  it("rechaza valores no finitos", () => {
    expect(validarMontosPedido(Number.NaN, 0).length).toBeGreaterThan(0);
  });
});

describe("estados del pedido", () => {
  it("REGISTRADO puede entregarse o anularse; ENTREGADO solo anularse; ANULADO es final", () => {
    expect(puedeCambiarEstadoPedido("REGISTRADO", "ENTREGADO")).toBe(true);
    expect(puedeCambiarEstadoPedido("REGISTRADO", "ANULADO")).toBe(true);
    expect(puedeCambiarEstadoPedido("ENTREGADO", "ANULADO")).toBe(true);
    expect(puedeCambiarEstadoPedido("ENTREGADO", "REGISTRADO")).toBe(false);
    expect(puedeCambiarEstadoPedido("ANULADO", "REGISTRADO")).toBe(false);
    expect(puedeCambiarEstadoPedido("ANULADO", "ENTREGADO")).toBe(false);
    expect(puedeCambiarEstadoPedido("REGISTRADO", "REGISTRADO")).toBe(false);
  });
  it("un pedido nuevo devuelve a ACTIVO al cliente en riesgo y no toca a un inactivo", () => {
    expect(estadoClienteTrasPedido("EN_RIESGO")).toBe("ACTIVO");
    expect(estadoClienteTrasPedido("ACTIVO")).toBe("ACTIVO");
    expect(estadoClienteTrasPedido("INACTIVO")).toBe("INACTIVO");
  });
});
