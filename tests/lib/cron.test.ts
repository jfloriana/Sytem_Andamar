import { describe, expect, it } from "vitest";
import { cronAutorizado } from "@/lib/cron";

const peticion = (autorizacion?: string) =>
  new Request("http://localhost/api/cron/diario", { headers: autorizacion ? { authorization: autorizacion } : {} });

describe("cronAutorizado", () => {
  const secreto = "un-secreto-de-prueba-largo";

  it("acepta la cabecera Bearer correcta", () => {
    expect(cronAutorizado(peticion(`Bearer ${secreto}`), secreto)).toBe(true);
  });
  it("rechaza sin cabecera", () => {
    expect(cronAutorizado(peticion(), secreto)).toBe(false);
  });
  it("rechaza un secreto incorrecto o de otra longitud", () => {
    expect(cronAutorizado(peticion("Bearer otro-secreto"), secreto)).toBe(false);
    expect(cronAutorizado(peticion(`Bearer ${secreto}x`), secreto)).toBe(false);
  });
  it("rechaza otro esquema de autorización", () => {
    expect(cronAutorizado(peticion(`Basic ${secreto}`), secreto)).toBe(false);
    expect(cronAutorizado(peticion(secreto), secreto)).toBe(false);
  });
  it("sin CRON_SECRET configurado rechaza todo (falla cerrado)", () => {
    expect(cronAutorizado(peticion("Bearer "), undefined)).toBe(false);
    expect(cronAutorizado(peticion("Bearer undefined"), undefined)).toBe(false);
    expect(cronAutorizado(peticion("Bearer "), "")).toBe(false);
  });
});
