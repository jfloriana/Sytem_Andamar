import { describe, expect, it } from "vitest";
import { camposFaltantes, esClienteCompleto, porcentajeCompletitud } from "@/domain/calidad-datos";

const completo = {
  documento: "20111111111",
  razonSocial: "Cliente SA",
  direccion: "Av. Lima 123",
  vendedorId: "v1",
  contactoPrincipal: { telefono: "999111222", email: null },
};

describe("calidad de datos (regla 5)", () => {
  it("cliente con todo es completo", () => {
    expect(esClienteCompleto(completo)).toBe(true);
    expect(camposFaltantes(completo)).toEqual([]);
  });
  it("contacto principal con solo correo cuenta", () => {
    expect(esClienteCompleto({ ...completo, contactoPrincipal: { telefono: null, email: "a@b.pe" } })).toBe(true);
  });
  it("sin contacto principal es incompleto", () => {
    const c = { ...completo, contactoPrincipal: null };
    expect(esClienteCompleto(c)).toBe(false);
    expect(camposFaltantes(c)).toEqual(["contacto principal"]);
  });
  it("contacto principal sin teléfono ni correo es incompleto", () => {
    const c = { ...completo, contactoPrincipal: { telefono: " ", email: "" } };
    expect(camposFaltantes(c)).toEqual(["teléfono o correo del contacto principal"]);
  });
  it("espacios en blanco cuentan como vacío", () => {
    const c = { ...completo, direccion: "   ", vendedorId: "" };
    expect(camposFaltantes(c)).toEqual(["dirección", "vendedor"]);
  });
  it("porcentaje de completitud", () => {
    expect(porcentajeCompletitud([completo, { ...completo, direccion: "" }])).toBe(50);
    expect(porcentajeCompletitud([])).toBe(0);
  });
});
