import { describe, expect, it } from "vitest";
import { IMPORTACION } from "@/config";
import { clasificarImportacion, type FilaCsv } from "@/domain/importacion";

const vendedores = [{ id: "v1", email: "vendedor@andamar.test" }];
const fila = (o: Partial<FilaCsv> = {}): FilaCsv => ({
  documento: "20111111111",
  razonSocial: "Cliente Uno SAC",
  direccion: "Av. Lima 123",
  telefono: "987654321",
  email: "uno@cliente.test",
  vendedorEmail: "vendedor@andamar.test",
  contactoNombre: "Ana Pérez",
  contactoTelefono: "987654321",
  contactoEmail: "",
  ...o,
});
const ctx = { existentes: [], vendedores };

describe("clasificarImportacion", () => {
  it("fila válida queda lista para importar con el vendedor resuelto", () => {
    const r = clasificarImportacion([fila()], ctx);
    expect(r.validas).toHaveLength(1);
    expect(r.validas[0].vendedorId).toBe("v1");
    expect(r.errores).toEqual([]);
    expect(r.duplicados).toEqual([]);
  });
  it("informa errores por fila con número de fila (la 1 es el encabezado)", () => {
    const r = clasificarImportacion([fila(), fila({ documento: "1", email: "no-es-correo" })], ctx);
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0].fila).toBe(3);
    expect(r.errores[0].mensajes.length).toBeGreaterThanOrEqual(2);
    expect(r.validas).toHaveLength(1);
  });
  it("vendedor inexistente es error", () => {
    const r = clasificarImportacion([fila({ vendedorEmail: "nadie@x.test" })], ctx);
    expect(r.errores[0].mensajes.join(" ")).toMatch(/vendedor/i);
  });
  it("documento repetido en el archivo: la primera entra, la segunda es duplicado", () => {
    const r = clasificarImportacion([fila(), fila({ razonSocial: "Otro" })], ctx);
    expect(r.validas).toHaveLength(1);
    expect(r.duplicados).toEqual([expect.objectContaining({ fila: 3, motivo: "documento" })]);
  });
  it("documento ya existente en la base es duplicado y no se importa", () => {
    const r = clasificarImportacion([fila()], {
      ...ctx,
      existentes: [{ id: "x", documento: "20111111111", razonSocial: "Z", telefono: null }],
    });
    expect(r.validas).toHaveLength(0);
    expect(r.duplicados[0].motivo).toBe("documento");
  });
  it("nombre o teléfono repetidos solo advierten y la fila se importa", () => {
    const r = clasificarImportacion([fila(), fila({ documento: "20222222222" })], ctx);
    expect(r.validas).toHaveLength(2);
    expect(r.advertencias.map((a) => a.fila)).toEqual([3]);
  });
  it("rechaza más filas que el máximo", () => {
    const filas = Array.from({ length: IMPORTACION.maxFilas + 1 }, (_, i) =>
      fila({ documento: String(20000000000 + i) }),
    );
    expect(() => clasificarImportacion(filas, ctx)).toThrow(/1000/);
  });
  it("parte las filas válidas en lotes", () => {
    const filas = Array.from({ length: 450 }, (_, i) =>
      fila({ documento: String(20000000000 + i), razonSocial: `Cliente ${i}x`, telefono: "" }),
    );
    const r = clasificarImportacion(filas, ctx);
    expect(r.lotes.map((l) => l.length)).toEqual([200, 200, 50]);
  });
});
