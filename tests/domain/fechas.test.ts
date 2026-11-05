import { describe, expect, it } from "vitest";
import { limaAUtc, utcALimaInput } from "@/domain/fechas";

describe("fechas en hora de Lima (UTC-5, sin horario de verano)", () => {
  it("convierte la hora local escrita en un formulario a UTC", () => {
    expect(limaAUtc("2026-11-04T09:30")).toEqual(new Date("2026-11-04T14:30:00Z"));
    expect(limaAUtc("2026-12-31T20:00")).toEqual(new Date("2027-01-01T01:00:00Z"));
  });
  it("devuelve null con valores vacíos o inválidos", () => {
    expect(limaAUtc("")).toBeNull();
    expect(limaAUtc(undefined)).toBeNull();
    expect(limaAUtc("ayer")).toBeNull();
    expect(limaAUtc("2026-13-45T99:99")).toBeNull();
  });
  it("ida y vuelta", () => {
    const f = new Date("2026-11-04T14:30:00Z");
    expect(utcALimaInput(f)).toBe("2026-11-04T09:30");
    expect(limaAUtc(utcALimaInput(f))).toEqual(f);
  });
  it("cruza de día hacia atrás", () => {
    expect(utcALimaInput(new Date("2026-11-04T02:00:00Z"))).toBe("2026-11-03T21:00");
  });
});
