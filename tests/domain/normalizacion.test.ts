import { describe, expect, it } from "vitest";
import {
  normalizarDocumento,
  normalizarNombre,
  normalizarTelefono,
  similitud,
} from "@/domain/normalizacion";

describe("normalizarNombre", () => {
  it("quita tildes, mayúsculas, puntuación y espacios repetidos", () => {
    expect(normalizarNombre("  Panadería   «La Esquina»  ")).toBe("panaderia la esquina");
  });
  it("ignora sufijos societarios", () => {
    expect(normalizarNombre("Distribuidora Sol S.A.C.")).toBe("distribuidora sol");
    expect(normalizarNombre("Distribuidora Sol SAC")).toBe("distribuidora sol");
    expect(normalizarNombre("Ferretería Ríos E.I.R.L.")).toBe("ferreteria rios");
  });
  it("devuelve vacío si no hay contenido", () => {
    expect(normalizarNombre("  .. ")).toBe("");
  });
});

describe("normalizarTelefono", () => {
  it("deja solo dígitos", () => {
    expect(normalizarTelefono("(01) 555-1234")).toBe("015551234");
  });
  it("quita el prefijo de país 51 de un celular", () => {
    expect(normalizarTelefono("+51 987 654 321")).toBe("987654321");
  });
  it("vacío o sin dígitos da cadena vacía", () => {
    expect(normalizarTelefono(undefined)).toBe("");
    expect(normalizarTelefono("abc")).toBe("");
  });
});

describe("normalizarDocumento", () => {
  it("quita espacios y guiones y pasa a mayúsculas", () => {
    expect(normalizarDocumento(" 20-123 456 789 ")).toBe("20123456789");
    expect(normalizarDocumento("ce-ab12")).toBe("CEAB12");
  });
});

describe("similitud", () => {
  it("es 1 para textos iguales y 0 para totalmente distintos", () => {
    expect(similitud("abc", "abc")).toBe(1);
    expect(similitud("abc", "xyz")).toBe(0);
  });
  it("es alta para una errata", () => {
    expect(similitud("panaderia la esquina", "panaderia la esquna")).toBeGreaterThan(0.9);
  });
  it("dos vacíos no son similares", () => {
    expect(similitud("", "")).toBe(0);
  });
});
