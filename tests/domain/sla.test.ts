import { describe, expect, it } from "vitest";
import {
  calcularFechaLimite,
  cerrarCaso,
  dentroDeSla,
  estaVencido,
  estadoEfectivo,
  horasEntre,
  registrarPrimeraRespuesta,
  resolverCaso,
  tiempoResolucionHoras,
  tiempoRespuestaHoras,
  type CasoSla,
} from "@/domain/sla";

const apertura = new Date("2026-11-01T10:00:00Z");
const limite = new Date("2026-11-02T10:00:00Z");

function caso(extra: Partial<CasoSla> = {}): CasoSla {
  return { estado: "ABIERTO", aperturaAt: apertura, fechaLimite: limite, primeraRespuestaAt: null, resueltoAt: null, resueltoPrimerContacto: false, ...extra };
}

describe("fecha límite (regla 4)", () => {
  it("es la apertura más 24 horas por defecto", () => {
    expect(calcularFechaLimite(apertura)).toEqual(limite);
  });
  it("acepta otro plazo en horas", () => {
    expect(calcularFechaLimite(apertura, 2)).toEqual(new Date("2026-11-01T12:00:00Z"));
  });
});

describe("vencimiento y escalamiento al consultar", () => {
  it("no vence justo en el límite, sí un instante después", () => {
    expect(estaVencido(caso(), limite)).toBe(false);
    expect(estaVencido(caso(), new Date(limite.getTime() + 1))).toBe(true);
  });
  it("un caso vencido sin primera respuesta se considera ESCALADO", () => {
    const tarde = new Date("2026-11-03T00:00:00Z");
    expect(estadoEfectivo(caso(), tarde)).toBe("ESCALADO");
    expect(estadoEfectivo(caso({ estado: "EN_PROCESO" }), tarde)).toBe("ESCALADO");
  });
  it("dentro del plazo conserva su estado", () => {
    expect(estadoEfectivo(caso(), new Date("2026-11-01T11:00:00Z"))).toBe("ABIERTO");
  });
  it("con primera respuesta nunca se escala por tiempo", () => {
    const c = caso({ estado: "EN_PROCESO", primeraRespuestaAt: new Date("2026-11-01T12:00:00Z") });
    expect(estaVencido(c, new Date("2026-12-01T00:00:00Z"))).toBe(false);
    expect(estadoEfectivo(c, new Date("2026-12-01T00:00:00Z"))).toBe("EN_PROCESO");
  });
  it("un caso resuelto o cerrado no se escala", () => {
    const tarde = new Date("2026-12-01T00:00:00Z");
    expect(estadoEfectivo(caso({ estado: "RESUELTO" }), tarde)).toBe("RESUELTO");
    expect(estadoEfectivo(caso({ estado: "CERRADO" }), tarde)).toBe("CERRADO");
  });
  it("un caso guardado como ESCALADO sigue escalado", () => {
    expect(estadoEfectivo(caso({ estado: "ESCALADO" }), apertura)).toBe("ESCALADO");
  });
});

describe("tiempos", () => {
  it("horasEntre redondea a dos decimales", () => {
    expect(horasEntre(apertura, new Date("2026-11-01T11:30:00Z"))).toBe(1.5);
    expect(horasEntre(apertura, new Date("2026-11-01T10:20:00Z"))).toBe(0.33);
  });
  it("tiempo de respuesta y de resolución son null mientras no ocurran", () => {
    expect(tiempoRespuestaHoras(caso())).toBeNull();
    expect(tiempoResolucionHoras(caso())).toBeNull();
    expect(dentroDeSla(caso())).toBeNull();
  });
  it("calcula respuesta, resolución y cumplimiento del plazo", () => {
    const c = caso({
      primeraRespuestaAt: new Date("2026-11-01T14:00:00Z"),
      resueltoAt: new Date("2026-11-02T10:00:00Z"),
    });
    expect(tiempoRespuestaHoras(c)).toBe(4);
    expect(tiempoResolucionHoras(c)).toBe(24);
    expect(dentroDeSla(c)).toBe(true);
  });
  it("responder pasado el límite no cumple el plazo", () => {
    expect(dentroDeSla(caso({ primeraRespuestaAt: new Date("2026-11-02T10:00:01Z") }))).toBe(false);
  });
});

describe("transiciones de un caso", () => {
  const ahora = new Date("2026-11-01T12:00:00Z");
  it("registrar la primera respuesta pasa a EN_PROCESO", () => {
    expect(registrarPrimeraRespuesta(caso(), ahora)).toEqual({
      ok: true,
      cambios: { estado: "EN_PROCESO", primeraRespuestaAt: ahora },
    });
  });
  it("no se registra una segunda primera respuesta ni sobre un caso cerrado", () => {
    expect(registrarPrimeraRespuesta(caso({ primeraRespuestaAt: apertura }), ahora)).toMatchObject({ ok: false });
    expect(registrarPrimeraRespuesta(caso({ estado: "RESUELTO" }), ahora)).toMatchObject({ ok: false });
  });
  it("resolver sin respuesta previa fija la primera respuesta y permite marcar primer contacto", () => {
    expect(resolverCaso(caso(), ahora, true)).toEqual({
      ok: true,
      cambios: { estado: "RESUELTO", primeraRespuestaAt: ahora, resueltoAt: ahora, resueltoPrimerContacto: true },
    });
  });
  it("resolver con respuesta previa conserva la primera respuesta y no marca primer contacto", () => {
    const previa = new Date("2026-11-01T11:00:00Z");
    const r = resolverCaso(caso({ estado: "EN_PROCESO", primeraRespuestaAt: previa }), ahora, true);
    expect(r).toEqual({
      ok: true,
      cambios: { estado: "RESUELTO", primeraRespuestaAt: previa, resueltoAt: ahora, resueltoPrimerContacto: false },
    });
  });
  it("resolver un caso vencido es posible", () => {
    expect(resolverCaso(caso({ estado: "ESCALADO" }), new Date("2026-12-01T00:00:00Z"), false).ok).toBe(true);
  });
  it("no se resuelve un caso ya resuelto o cerrado", () => {
    expect(resolverCaso(caso({ estado: "RESUELTO" }), ahora, false)).toMatchObject({ ok: false });
    expect(resolverCaso(caso({ estado: "CERRADO" }), ahora, false)).toMatchObject({ ok: false });
  });
  it("solo un caso resuelto puede cerrarse", () => {
    expect(cerrarCaso(caso({ estado: "RESUELTO" }))).toEqual({ ok: true, cambios: { estado: "CERRADO" } });
    expect(cerrarCaso(caso())).toMatchObject({ ok: false });
  });
});
