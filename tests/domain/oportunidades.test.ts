import { describe, expect, it } from "vitest";
import {
  ETAPAS,
  agruparPorEtapa,
  etapasDestino,
  evaluarCambioEtapa,
  esEtapaCerrada,
  totalesPorEtapa,
  type Etapa,
} from "@/domain/oportunidades";

const t0 = new Date("2026-11-01T10:00:00Z");
const despues = new Date("2026-11-02T10:00:00Z");
const antes = new Date("2026-10-31T10:00:00Z");

function cambio(etapaActual: Etapa, etapaNueva: Etapa, extra: Partial<Parameters<typeof evaluarCambioEtapa>[0]> = {}) {
  return evaluarCambioEtapa({ etapaActual, etapaNueva, etapaCambiadaAt: t0, actividadesRegistradas: [despues], ...extra });
}

describe("etapas", () => {
  it("el orden estándar tiene seis etapas y solo GANADA y PERDIDA cierran", () => {
    expect(ETAPAS).toEqual(["PROSPECTO", "CONTACTADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"]);
    expect(ETAPAS.filter(esEtapaCerrada)).toEqual(["GANADA", "PERDIDA"]);
  });
  it("las etapas destino excluyen la actual y no existen si está cerrada", () => {
    expect(etapasDestino("CONTACTADO")).not.toContain("CONTACTADO");
    expect(etapasDestino("CONTACTADO")).toHaveLength(5);
    expect(etapasDestino("GANADA")).toEqual([]);
    expect(etapasDestino("PERDIDA")).toEqual([]);
  });
});

describe("evaluarCambioEtapa (regla 3)", () => {
  it("avanza con una actividad posterior al último cambio", () => {
    expect(cambio("PROSPECTO", "CONTACTADO")).toEqual({ ok: true, cerrada: false, motivoPerdida: null });
  });
  it("bloquea el avance sin ninguna actividad", () => {
    const r = cambio("PROSPECTO", "CONTACTADO", { actividadesRegistradas: [] });
    expect(r).toMatchObject({ ok: false, codigo: "SIN_ACTIVIDAD" });
  });
  it("una actividad anterior al último cambio de etapa no cuenta", () => {
    const r = cambio("PROPUESTA", "NEGOCIACION", { actividadesRegistradas: [antes] });
    expect(r).toMatchObject({ ok: false, codigo: "SIN_ACTIVIDAD" });
  });
  it("una actividad en el mismo instante del cambio sí cuenta", () => {
    expect(cambio("PROPUESTA", "NEGOCIACION", { actividadesRegistradas: [t0] }).ok).toBe(true);
  });
  it("retroceder de etapa no exige actividad", () => {
    expect(cambio("NEGOCIACION", "PROPUESTA", { actividadesRegistradas: [] }).ok).toBe(true);
  });
  it("ganar exige actividad y marca la oportunidad como cerrada", () => {
    expect(cambio("NEGOCIACION", "GANADA", { actividadesRegistradas: [] })).toMatchObject({ ok: false, codigo: "SIN_ACTIVIDAD" });
    expect(cambio("NEGOCIACION", "GANADA")).toEqual({ ok: true, cerrada: true, motivoPerdida: null });
  });
  it("perder exige motivo y no exige actividad", () => {
    const sinMotivo = cambio("CONTACTADO", "PERDIDA", { actividadesRegistradas: [] });
    expect(sinMotivo).toMatchObject({ ok: false, codigo: "MOTIVO_REQUERIDO" });
    const conMotivo = cambio("CONTACTADO", "PERDIDA", { actividadesRegistradas: [], motivoPerdida: "  Precio alto  " });
    expect(conMotivo).toEqual({ ok: true, cerrada: true, motivoPerdida: "Precio alto" });
  });
  it.each([undefined, null, "", "   "])("motivo vacío (%j) no sirve", (motivo) => {
    expect(cambio("PROPUESTA", "PERDIDA", { motivoPerdida: motivo })).toMatchObject({ ok: false, codigo: "MOTIVO_REQUERIDO" });
  });
  it("el motivo no se guarda si la etapa nueva no es PERDIDA", () => {
    expect(cambio("PROSPECTO", "CONTACTADO", { motivoPerdida: "ruido" })).toMatchObject({ ok: true, motivoPerdida: null });
  });
  it("rechaza mover a la misma etapa y mover una oportunidad cerrada", () => {
    expect(cambio("PROPUESTA", "PROPUESTA")).toMatchObject({ ok: false, codigo: "MISMA_ETAPA" });
    expect(cambio("GANADA", "PROSPECTO")).toMatchObject({ ok: false, codigo: "OPORTUNIDAD_CERRADA" });
    expect(cambio("PERDIDA", "PROPUESTA")).toMatchObject({ ok: false, codigo: "OPORTUNIDAD_CERRADA" });
  });
});

describe("tablero", () => {
  const items = [
    { id: "a", etapa: "PROSPECTO" as const, montoEstimado: 100.1 },
    { id: "b", etapa: "PROSPECTO" as const, montoEstimado: 200.2 },
    { id: "c", etapa: "GANADA" as const, montoEstimado: 50 },
  ];
  it("agrupa por todas las etapas, incluso las vacías", () => {
    const g = agruparPorEtapa(items);
    expect(Object.keys(g)).toEqual([...ETAPAS]);
    expect(g.PROSPECTO.map((i) => i.id)).toEqual(["a", "b"]);
    expect(g.PERDIDA).toEqual([]);
  });
  it("suma montos por etapa sin errores de coma flotante", () => {
    const t = totalesPorEtapa(items);
    expect(t.PROSPECTO).toEqual({ cantidad: 2, monto: 300.3 });
    expect(t.GANADA).toEqual({ cantidad: 1, monto: 50 });
    expect(t.NEGOCIACION).toEqual({ cantidad: 0, monto: 0 });
  });
});
