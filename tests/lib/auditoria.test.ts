import { describe, expect, it } from "vitest";
import { limpiarDetalle } from "@/lib/auditoria";

describe("limpiarDetalle", () => {
  it("elimina secretos a cualquier profundidad", () => {
    const r = limpiarDetalle({
      email: "a@b.c",
      passwordHash: "x",
      password: "y",
      anidado: { passwordHash: "z", ok: 1 },
      lista: [{ password: "p", n: 2 }],
    });
    expect(r).toEqual({ email: "a@b.c", anidado: { ok: 1 }, lista: [{ n: 2 }] });
  });

  it("serializa fechas y deja intactos los valores simples", () => {
    const r = limpiarDetalle({ f: new Date("2026-01-01T00:00:00Z"), n: 3, b: true, nulo: null });
    expect(r).toEqual({ f: "2026-01-01T00:00:00.000Z", n: 3, b: true, nulo: null });
  });
});
