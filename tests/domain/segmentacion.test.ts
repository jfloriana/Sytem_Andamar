import { describe, expect, it } from "vitest";
import { clasificarSegmento, inicioVentana, margenVentana, type PedidoSegmento } from "@/domain/segmentacion";

const ahora = new Date("2026-11-04T12:00:00Z");
const pedido = (fecha: string, margen: number, estado: PedidoSegmento["estado"] = "ENTREGADO"): PedidoSegmento => ({
  fecha: new Date(fecha),
  margen,
  estado,
});

describe("clasificarSegmento (regla 1)", () => {
  it("sin pedidos es SIN_CLASIFICAR aunque el margen sea 0", () => {
    expect(clasificarSegmento(0, 0)).toBe("SIN_CLASIFICAR");
  });
  it("A desde 1.000 USD exactos", () => {
    expect(clasificarSegmento(1000, 3)).toBe("A");
    expect(clasificarSegmento(999.99, 3)).toBe("B");
  });
  it("B desde 300 USD exactos hasta 999", () => {
    expect(clasificarSegmento(300, 1)).toBe("B");
    expect(clasificarSegmento(299.99, 1)).toBe("C");
  });
  it("C con pedidos pero margen menor a 300, incluido 0", () => {
    expect(clasificarSegmento(0, 2)).toBe("C");
    expect(clasificarSegmento(120, 2)).toBe("C");
  });
});

describe("inicioVentana", () => {
  it("son 12 meses atrás por defecto", () => {
    expect(inicioVentana(ahora)).toEqual(new Date("2025-11-04T12:00:00Z"));
  });
});

describe("margenVentana", () => {
  it("suma solo pedidos no anulados dentro de los últimos 12 meses", () => {
    const r = margenVentana(
      [
        pedido("2026-10-01T00:00:00Z", 400),
        pedido("2026-01-01T00:00:00Z", 700),
        pedido("2026-09-01T00:00:00Z", 5000, "ANULADO"),
        pedido("2025-10-01T00:00:00Z", 900), // fuera de la ventana
      ],
      ahora,
    );
    expect(r).toEqual({ margen: 1100, cantidad: 2 });
  });
  it("incluye el pedido que cae exactamente en el límite inicial", () => {
    expect(margenVentana([pedido("2025-11-04T12:00:00Z", 50)], ahora)).toEqual({ margen: 50, cantidad: 1 });
  });
  it("sin pedidos devuelve cero", () => {
    expect(margenVentana([], ahora)).toEqual({ margen: 0, cantidad: 0 });
  });
  it("evita errores de coma flotante al sumar centavos", () => {
    const r = margenVentana([pedido("2026-10-01T00:00:00Z", 0.1), pedido("2026-10-02T00:00:00Z", 0.2)], ahora);
    expect(r.margen).toBe(0.3);
  });
});
