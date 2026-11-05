import { describe, expect, it } from "vitest";
import { datosClienteAnonimo, datosContactoAnonimo, estaAnonimizado, validarAnonimizacion } from "@/domain/anonimizacion";

describe("datosClienteAnonimo", () => {
  const d = datosClienteAnonimo("clx9abc123def456ghi789jkl");
  it("quita todo dato personal y deja el cliente dado de baja", () => {
    expect(d.razonSocial).toBe("Cliente anonimizado");
    expect(d.direccion).toBe("Anonimizado");
    expect(d.telefono).toBeNull();
    expect(d.email).toBeNull();
    expect(d.condicionesEspeciales).toBeNull();
    expect(d.estado).toBe("INACTIVO");
  });
  it("el documento nuevo es único por cliente, válido (6-20 letras o números) y reconocible", () => {
    expect(d.documento).toMatch(/^ANON[A-Z0-9]{8,16}$/);
    expect(estaAnonimizado(d.documento)).toBe(true);
    expect(datosClienteAnonimo("clx9abc123def456ghi789jkm").documento).not.toBe(d.documento);
    expect(datosClienteAnonimo("clx9abc123def456ghi789jkl").documento).toBe(d.documento);
  });
});

describe("datosContactoAnonimo", () => {
  it("borra nombre, cargo, teléfono y correo", () => {
    expect(datosContactoAnonimo()).toEqual({ nombre: "Contacto anonimizado", cargo: null, telefono: null, email: null });
  });
});

describe("estaAnonimizado", () => {
  it("reconoce solo el prefijo ANON", () => {
    expect(estaAnonimizado("20100000001")).toBe(false);
    expect(estaAnonimizado("ANONABC12345")).toBe(true);
  });
});

describe("validarAnonimizacion", () => {
  it("permite anonimizar un cliente normal", () => {
    expect(validarAnonimizacion({ documento: "20100000001" })).toEqual({ ok: true });
  });
  it("rechaza uno ya anonimizado", () => {
    const r = validarAnonimizacion({ documento: "ANONABC12345" });
    expect(r.ok).toBe(false);
  });
});
