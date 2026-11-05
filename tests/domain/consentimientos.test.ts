import { describe, expect, it } from "vitest";
import {
  contarEnVentanaSemanal,
  estaVigente,
  evaluarContactoPromocional,
  resumenPorFinalidad,
  validarOtorgamiento,
  validarRetiro,
  type ConsentimientoDominio,
} from "@/domain/consentimientos";

const DIA = 24 * 60 * 60 * 1000;
const ahora = new Date("2026-11-05T12:00:00Z");
const haceDias = (n: number) => new Date(ahora.getTime() - n * DIA);

const consent = (parcial: Partial<ConsentimientoDominio> = {}): ConsentimientoDominio => ({
  finalidad: "PROMOCIONES",
  canal: "EMAIL",
  otorgadoAt: haceDias(30),
  retiradoAt: null,
  ...parcial,
});

describe("estaVigente", () => {
  it("vigente si fue otorgado y no se retiró", () => {
    expect(estaVigente(consent(), ahora)).toBe(true);
  });
  it("no vigente si ya se retiró", () => {
    expect(estaVigente(consent({ retiradoAt: haceDias(1) }), ahora)).toBe(false);
  });
  it("retiro programado a futuro sigue vigente; en el instante exacto ya no", () => {
    expect(estaVigente(consent({ retiradoAt: new Date(ahora.getTime() + 1) }), ahora)).toBe(true);
    expect(estaVigente(consent({ retiradoAt: ahora }), ahora)).toBe(false);
  });
  it("no vigente si se otorga en el futuro", () => {
    expect(estaVigente(consent({ otorgadoAt: new Date(ahora.getTime() + 1) }), ahora)).toBe(false);
  });
});

describe("resumenPorFinalidad", () => {
  it("sin registros: las tres finalidades sin registro", () => {
    const r = resumenPorFinalidad([], ahora);
    expect(r.SERVICIO.estado).toBe("SIN_REGISTRO");
    expect(r.PROMOCIONES.estado).toBe("SIN_REGISTRO");
    expect(r.ANALITICA.estado).toBe("SIN_REGISTRO");
  });
  it("vigente con los canales que lo sostienen", () => {
    const r = resumenPorFinalidad([consent({ canal: "EMAIL" }), consent({ canal: "TELEFONO" })], ahora);
    expect(r.PROMOCIONES).toEqual({ estado: "VIGENTE", canales: ["EMAIL", "TELEFONO"] });
  });
  it("retirado cuando todos los registros de la finalidad están retirados", () => {
    const r = resumenPorFinalidad([consent({ retiradoAt: haceDias(2) })], ahora);
    expect(r.PROMOCIONES).toEqual({ estado: "RETIRADO", canales: [] });
  });
  it("basta un canal vigente aunque otro se haya retirado", () => {
    const r = resumenPorFinalidad([consent({ retiradoAt: haceDias(2) }), consent({ canal: "WHATSAPP" })], ahora);
    expect(r.PROMOCIONES).toEqual({ estado: "VIGENTE", canales: ["WHATSAPP"] });
  });
});

describe("validarRetiro", () => {
  it("permite retirar uno vigente y devuelve la fecha de retiro", () => {
    expect(validarRetiro(consent(), ahora)).toEqual({ ok: true, retiradoAt: ahora });
  });
  it("rechaza retirar dos veces", () => {
    const r = validarRetiro(consent({ retiradoAt: haceDias(1) }), ahora);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.mensaje).toMatch(/ya fue retirado/i);
  });
});

describe("validarOtorgamiento", () => {
  it("permite otorgar uno nuevo", () => {
    expect(validarOtorgamiento([], { finalidad: "SERVICIO", canal: "TELEFONO" }, ahora)).toEqual({ ok: true });
  });
  it("rechaza duplicar finalidad y canal vigentes", () => {
    const r = validarOtorgamiento([consent()], { finalidad: "PROMOCIONES", canal: "EMAIL" }, ahora);
    expect(r.ok).toBe(false);
  });
  it("permite volver a otorgar tras un retiro", () => {
    const previo = consent({ retiradoAt: haceDias(1) });
    expect(validarOtorgamiento([previo], { finalidad: "PROMOCIONES", canal: "EMAIL" }, ahora)).toEqual({ ok: true });
  });
  it("otra finalidad o canal no choca", () => {
    expect(validarOtorgamiento([consent()], { finalidad: "PROMOCIONES", canal: "TELEFONO" }, ahora).ok).toBe(true);
    expect(validarOtorgamiento([consent()], { finalidad: "ANALITICA", canal: "EMAIL" }, ahora).ok).toBe(true);
  });
});

describe("contarEnVentanaSemanal", () => {
  it("cuenta lo ocurrido en los últimos 7 días (el límite de 7 días exactos no cuenta)", () => {
    const fechas = [haceDias(0), haceDias(3), haceDias(6.99), haceDias(7), haceDias(20), new Date(ahora.getTime() + DIA)];
    expect(contarEnVentanaSemanal(fechas, ahora)).toBe(3);
  });
  it("sin fechas, cero", () => {
    expect(contarEnVentanaSemanal([], ahora)).toBe(0);
  });
});

describe("evaluarContactoPromocional (regla 6)", () => {
  it("permitido con consentimiento vigente y menos de 2 esta semana", () => {
    expect(evaluarContactoPromocional([consent()], 1, ahora)).toEqual({ permitido: true, motivo: "OK", restantes: 1 });
  });
  it("sin comunicaciones quedan 2", () => {
    expect(evaluarContactoPromocional([consent()], 0, ahora).restantes).toBe(2);
  });
  it("límite semanal: con 2 ya no se permite", () => {
    expect(evaluarContactoPromocional([consent()], 2, ahora)).toEqual({ permitido: false, motivo: "LIMITE_SEMANAL", restantes: 0 });
    expect(evaluarContactoPromocional([consent()], 5, ahora).restantes).toBe(0);
  });
  it("ninguna si retiró el consentimiento de promociones", () => {
    const r = evaluarContactoPromocional([consent({ retiradoAt: haceDias(1) })], 0, ahora);
    expect(r).toEqual({ permitido: false, motivo: "RETIRADO", restantes: 0 });
  });
  it("sin ningún consentimiento de promociones tampoco se permite", () => {
    const r = evaluarContactoPromocional([consent({ finalidad: "SERVICIO" })], 0, ahora);
    expect(r).toEqual({ permitido: false, motivo: "SIN_CONSENTIMIENTO", restantes: 0 });
  });
});
