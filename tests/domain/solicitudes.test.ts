import { describe, expect, it } from "vitest";
import {
  estadoDelPlazo,
  fechaLimiteSolicitud,
  sumarDiasHabiles,
  transicionPermitida,
  validarCierre,
  type SolicitudDominio,
} from "@/domain/solicitudes";

// 2026-11-05 es jueves.
const jueves = new Date("2026-11-05T15:00:00Z");

describe("sumarDiasHabiles", () => {
  it("cero días devuelve la misma fecha", () => {
    expect(sumarDiasHabiles(jueves, 0).toISOString()).toBe(jueves.toISOString());
  });
  it("salta el fin de semana", () => {
    expect(sumarDiasHabiles(jueves, 1).toISOString()).toBe("2026-11-06T15:00:00.000Z"); // viernes
    expect(sumarDiasHabiles(jueves, 2).toISOString()).toBe("2026-11-09T15:00:00.000Z"); // lunes
    expect(sumarDiasHabiles(jueves, 5).toISOString()).toBe("2026-11-12T15:00:00.000Z"); // jueves siguiente
  });
  it("desde sábado cuenta desde el lunes", () => {
    const sabado = new Date("2026-11-07T10:00:00Z");
    expect(sumarDiasHabiles(sabado, 1).toISOString()).toBe("2026-11-09T10:00:00.000Z");
  });
  it("no admite negativos", () => {
    expect(() => sumarDiasHabiles(jueves, -1)).toThrow();
  });
});

describe("fechaLimiteSolicitud", () => {
  it("acceso: 8 días hábiles; rectificación y supresión: 10", () => {
    expect(fechaLimiteSolicitud(jueves, "ACCESO").toISOString()).toBe("2026-11-17T15:00:00.000Z");
    expect(fechaLimiteSolicitud(jueves, "RECTIFICACION").toISOString()).toBe("2026-11-19T15:00:00.000Z");
    expect(fechaLimiteSolicitud(jueves, "SUPRESION").toISOString()).toBe("2026-11-19T15:00:00.000Z");
  });
});

const sol = (p: Partial<SolicitudDominio> = {}): SolicitudDominio => ({
  tipo: "ACCESO",
  estado: "PENDIENTE",
  solicitadaAt: jueves,
  atendidaAt: null,
  ...p,
});
const limite = fechaLimiteSolicitud(jueves, "ACCESO"); // 2026-11-17T15:00Z
const HORA = 60 * 60 * 1000;

describe("estadoDelPlazo", () => {
  it("en plazo cuando falta más del aviso", () => {
    const r = estadoDelPlazo(sol(), new Date(limite.getTime() - 49 * HORA));
    expect(r.estado).toBe("EN_PLAZO");
  });
  it("por vencer cuando faltan 48 horas o menos (límite exacto incluido)", () => {
    expect(estadoDelPlazo(sol(), new Date(limite.getTime() - 48 * HORA)).estado).toBe("POR_VENCER");
    expect(estadoDelPlazo(sol(), new Date(limite.getTime() - 1)).estado).toBe("POR_VENCER");
  });
  it("vencida solo después del plazo (en el instante exacto aún no)", () => {
    expect(estadoDelPlazo(sol(), limite).estado).toBe("POR_VENCER");
    const r = estadoDelPlazo(sol(), new Date(limite.getTime() + 1));
    expect(r.estado).toBe("VENCIDA");
  });
  it("incluye la fecha límite", () => {
    expect(estadoDelPlazo(sol(), jueves).fechaLimite.toISOString()).toBe(limite.toISOString());
  });
  it("cerrada a tiempo y cerrada tarde, según atendidaAt", () => {
    const tarde = new Date(limite.getTime() + HORA);
    expect(estadoDelPlazo(sol({ estado: "ATENDIDA", atendidaAt: limite }), tarde).estado).toBe("CERRADA_A_TIEMPO");
    expect(estadoDelPlazo(sol({ estado: "ATENDIDA", atendidaAt: tarde }), tarde).estado).toBe("CERRADA_TARDE");
    expect(estadoDelPlazo(sol({ estado: "RECHAZADA", atendidaAt: jueves }), tarde).estado).toBe("CERRADA_A_TIEMPO");
  });
  it("una solicitud cerrada sin fecha de atención no se marca tarde", () => {
    expect(estadoDelPlazo(sol({ estado: "ATENDIDA", atendidaAt: null }), new Date(limite.getTime() + 99 * HORA)).estado).toBe("CERRADA_A_TIEMPO");
  });
});

describe("transicionPermitida", () => {
  it("pendiente puede pasar a en proceso, atendida o rechazada", () => {
    expect(transicionPermitida("PENDIENTE", "EN_PROCESO")).toBe(true);
    expect(transicionPermitida("PENDIENTE", "ATENDIDA")).toBe(true);
    expect(transicionPermitida("PENDIENTE", "RECHAZADA")).toBe(true);
  });
  it("en proceso puede cerrarse pero no volver a pendiente", () => {
    expect(transicionPermitida("EN_PROCESO", "ATENDIDA")).toBe(true);
    expect(transicionPermitida("EN_PROCESO", "RECHAZADA")).toBe(true);
    expect(transicionPermitida("EN_PROCESO", "PENDIENTE")).toBe(false);
  });
  it("los estados finales no cambian", () => {
    expect(transicionPermitida("ATENDIDA", "EN_PROCESO")).toBe(false);
    expect(transicionPermitida("RECHAZADA", "ATENDIDA")).toBe(false);
  });
  it("mismo estado no es transición", () => {
    expect(transicionPermitida("PENDIENTE", "PENDIENTE")).toBe(false);
  });
});

describe("validarCierre", () => {
  it("rechazar exige un motivo", () => {
    expect(validarCierre("RECHAZADA", "").ok).toBe(false);
    expect(validarCierre("RECHAZADA", "no").ok).toBe(false);
    expect(validarCierre("RECHAZADA", "No acreditó su identidad.")).toEqual({ ok: true, resolucion: "No acreditó su identidad." });
  });
  it("atender no exige texto", () => {
    expect(validarCierre("ATENDIDA", "")).toEqual({ ok: true, resolucion: null });
    expect(validarCierre("ATENDIDA", "  Datos entregados  ")).toEqual({ ok: true, resolucion: "Datos entregados" });
  });
});
