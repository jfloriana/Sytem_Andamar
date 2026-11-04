import { describe, expect, it } from "vitest";
import { crearUsuarioSchema, filtroAuditoriaSchema, loginSchema } from "@/lib/validaciones/usuario";

describe("loginSchema", () => {
  it("normaliza el correo", () => {
    const r = loginSchema.parse({ email: "  Ana@Andamar.TEST ", password: "x" });
    expect(r.email).toBe("ana@andamar.test");
  });
  it("rechaza correo inválido y clave vacía", () => {
    expect(loginSchema.safeParse({ email: "no", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("crearUsuarioSchema", () => {
  const base = { nombre: "Ana Pérez", email: "ana@andamar.test", password: "una-clave-larga-1", rol: "VENDEDOR" };
  it("acepta datos válidos", () => {
    expect(crearUsuarioSchema.safeParse(base).success).toBe(true);
  });
  it("rechaza contraseña corta y rol inválido", () => {
    expect(crearUsuarioSchema.safeParse({ ...base, password: "corta" }).success).toBe(false);
    expect(crearUsuarioSchema.safeParse({ ...base, rol: "ROOT" }).success).toBe(false);
  });
  it("convierte jefeId vacío en indefinido", () => {
    expect(crearUsuarioSchema.parse({ ...base, jefeId: "" }).jefeId).toBeUndefined();
  });
});

describe("filtroAuditoriaSchema", () => {
  it("usa página 1 ante valores raros y descarta fechas mal formadas", () => {
    const r = filtroAuditoriaSchema.parse({ pagina: "abc", desde: "ayer" });
    expect(r.pagina).toBe(1);
    expect(r.desde).toBeUndefined();
  });
});
