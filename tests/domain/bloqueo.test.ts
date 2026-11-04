import { describe, expect, it } from "vitest";
import {
  estaBloqueado,
  registrarIntentoFallido,
  reiniciarIntentos,
} from "@/domain/bloqueo";
import { AUTH } from "@/config";

const t0 = new Date("2026-01-01T10:00:00Z");
const minutos = (m: number) => new Date(t0.getTime() + m * 60_000);

describe("bloqueo por intentos fallidos", () => {
  it("la configuracion exige 5 intentos", () => {
    expect(AUTH.maxIntentosFallidos).toBe(5);
    expect(AUTH.bloqueoMinutos).toBeGreaterThan(0);
  });

  it("los primeros 4 fallos solo suman y no bloquean", () => {
    let estado = { intentosFallidos: 0, bloqueadoHasta: null as Date | null };
    for (let i = 1; i <= 4; i++) {
      const r = registrarIntentoFallido(estado, t0);
      expect(r.intentosFallidos).toBe(i);
      expect(r.bloqueadoHasta).toBeNull();
      expect(r.bloqueadoAhora).toBe(false);
      estado = r;
    }
  });

  it("el quinto fallo bloquea por el tiempo configurado", () => {
    const r = registrarIntentoFallido({ intentosFallidos: 4, bloqueadoHasta: null }, t0);
    expect(r.intentosFallidos).toBe(5);
    expect(r.bloqueadoAhora).toBe(true);
    expect(r.bloqueadoHasta).toEqual(minutos(AUTH.bloqueoMinutos));
  });

  it("estaBloqueado: antes, justo en el limite y despues", () => {
    const hasta = minutos(15);
    expect(estaBloqueado(hasta, minutos(14))).toBe(true);
    expect(estaBloqueado(hasta, minutos(15))).toBe(false);
    expect(estaBloqueado(hasta, minutos(16))).toBe(false);
    expect(estaBloqueado(null, t0)).toBe(false);
  });

  it("tras vencer el bloqueo, un nuevo fallo cuenta como el primero", () => {
    const vencido = { intentosFallidos: 5, bloqueadoHasta: minutos(15) };
    const r = registrarIntentoFallido(vencido, minutos(20));
    expect(r.intentosFallidos).toBe(1);
    expect(r.bloqueadoHasta).toBeNull();
    expect(r.bloqueadoAhora).toBe(false);
  });

  it("un intento durante el bloqueo no extiende ni reinicia el plazo", () => {
    const activo = { intentosFallidos: 5, bloqueadoHasta: minutos(15) };
    const r = registrarIntentoFallido(activo, minutos(5));
    expect(r.bloqueadoHasta).toEqual(minutos(15));
    expect(r.intentosFallidos).toBe(5);
    expect(r.bloqueadoAhora).toBe(false);
  });

  it("un inicio de sesion correcto reinicia contador y bloqueo", () => {
    expect(reiniciarIntentos()).toEqual({ intentosFallidos: 0, bloqueadoHasta: null });
  });
});
