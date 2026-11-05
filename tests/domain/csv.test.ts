import { describe, expect, it } from "vitest";
import { aCsv } from "@/domain/csv";

describe("aCsv", () => {
  it("separa por comas y filas con salto de línea", () => {
    expect(aCsv([["a", "b"], [1, 2.5]])).toBe("a,b\r\n1,2.5");
  });
  it("entrecomilla valores con coma, comillas o saltos", () => {
    expect(aCsv([["x, y", 'dice "hola"', "a\nb"]])).toBe('"x, y","dice ""hola""","a\nb"');
  });
  it("null y vacío salen como celda vacía", () => {
    expect(aCsv([[null, "", "z"]])).toBe(",,z");
  });
  it("neutraliza fórmulas de hoja de cálculo en textos", () => {
    expect(aCsv([["=SUM(A1)", "+1", "-2x", "@cmd"]])).toBe("'=SUM(A1),'+1,'-2x,'@cmd");
  });
  it("los números negativos no se alteran", () => {
    expect(aCsv([[-5]])).toBe("-5");
  });
});
