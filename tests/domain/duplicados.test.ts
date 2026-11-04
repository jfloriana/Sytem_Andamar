import { describe, expect, it } from "vitest";
import { detectarDuplicados, type ClienteComparable } from "@/domain/duplicados";

const existentes: ClienteComparable[] = [
  { id: "1", documento: "20111111111", razonSocial: "Panadería La Esquina S.A.C.", telefono: "987654321" },
  { id: "2", documento: "20222222222", razonSocial: "Ferretería Ríos", telefono: null },
];

describe("detectarDuplicados", () => {
  it("documento repetido bloquea", () => {
    const r = detectarDuplicados({ documento: "20-111 111 111", razonSocial: "Otro", telefono: null }, existentes);
    expect(r.bloqueo?.id).toBe("1");
  });
  it("nombre normalizado igual advierte, no bloquea", () => {
    const r = detectarDuplicados({ documento: "20999999999", razonSocial: "panaderia la esquina", telefono: null }, existentes);
    expect(r.bloqueo).toBeNull();
    expect(r.advertencias).toEqual([{ motivo: "nombre", cliente: existentes[0] }]);
  });
  it("nombre muy parecido (errata) advierte", () => {
    const r = detectarDuplicados({ documento: "20999999999", razonSocial: "Ferreteria Rio", telefono: null }, existentes);
    expect(r.advertencias.map((a) => a.motivo)).toEqual(["nombre"]);
  });
  it("teléfono repetido advierte, con distinto formato", () => {
    const r = detectarDuplicados({ documento: "20999999999", razonSocial: "Zzz Qqq", telefono: "+51 987-654-321" }, existentes);
    expect(r.advertencias).toEqual([{ motivo: "telefono", cliente: existentes[0] }]);
  });
  it("un cliente con nombre y teléfono iguales da dos advertencias", () => {
    const r = detectarDuplicados({ documento: "20999999999", razonSocial: "Panaderia La Esquina", telefono: "987654321" }, existentes);
    expect(r.advertencias.map((a) => a.motivo).sort()).toEqual(["nombre", "telefono"]);
  });
  it("sin coincidencias no avisa", () => {
    const r = detectarDuplicados({ documento: "20999999999", razonSocial: "Librería Norte", telefono: "900000000" }, existentes);
    expect(r).toEqual({ bloqueo: null, advertencias: [] });
  });
  it("al editar se excluye al propio cliente", () => {
    const r = detectarDuplicados(
      { documento: "20111111111", razonSocial: "Panadería La Esquina", telefono: "987654321" },
      existentes,
      "1",
    );
    expect(r).toEqual({ bloqueo: null, advertencias: [] });
  });
  it("un nombre vacío tras normalizar nunca coincide", () => {
    const r = detectarDuplicados({ documento: "20999999999", razonSocial: "..", telefono: null }, [
      { id: "9", documento: "1", razonSocial: "..", telefono: null },
    ]);
    expect(r.advertencias).toEqual([]);
  });
});
