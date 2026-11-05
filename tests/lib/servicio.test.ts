import { describe, expect, it } from "vitest";
import { esFiltroCaso, filtroCasos, filtroEscalados, filtroPorEstado, recursoCaso } from "@/lib/servicio";

const ahora = new Date("2026-11-04T12:00:00Z");

describe("alcance de casos", () => {
  it("el ejecutivo ve solo sus casos y el resto de roles con acceso ve todos", () => {
    expect(filtroCasos({ id: "e1", rol: "EJECUTIVO_SERVICIO" })).toEqual({ responsableId: "e1" });
    expect(filtroCasos({ id: "j1", rol: "JEFE_SERVICIO" })).toEqual({});
    expect(filtroCasos({ id: "g1", rol: "GERENCIA" })).toEqual({});
  });
  it("el dueño del caso es su responsable", () => {
    expect(recursoCaso({ responsableId: "e1" })).toEqual({ tipo: "caso", propietarioId: "e1", jefeDelPropietarioId: null });
  });
});

describe("filtros de estado calculados al consultar", () => {
  it("escalados: guardados como ESCALADO o vencidos sin primera respuesta", () => {
    expect(filtroEscalados(ahora)).toEqual({
      OR: [
        { estado: "ESCALADO" },
        { estado: { in: ["ABIERTO", "EN_PROCESO"] }, primeraRespuestaAt: null, fechaLimite: { lt: ahora } },
      ],
    });
  });
  it("cada filtro devuelve su condición", () => {
    expect(filtroPorEstado("abiertos", ahora)).toEqual({ estado: { in: ["ABIERTO", "EN_PROCESO", "ESCALADO"] } });
    expect(filtroPorEstado("escalados", ahora)).toEqual(filtroEscalados(ahora));
    expect(filtroPorEstado("resueltos", ahora)).toEqual({ estado: { in: ["RESUELTO", "CERRADO"] } });
    expect(filtroPorEstado("todos", ahora)).toEqual({});
  });
  it("reconoce solo filtros válidos", () => {
    expect(esFiltroCaso("escalados")).toBe(true);
    expect(esFiltroCaso("otro")).toBe(false);
    expect(esFiltroCaso(undefined)).toBe(false);
  });
});
