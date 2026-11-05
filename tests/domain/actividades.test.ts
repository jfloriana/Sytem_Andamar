import { describe, expect, it } from "vitest";
import { clasificarTareas, fechaTarea, valoresIniciales } from "@/domain/actividades";

const ahora = new Date("2026-11-04T15:00:00Z");
const t = (id: string, fecha: string, extra: { recordatorioAt?: string; completada?: boolean } = {}) => ({
  id,
  fecha: new Date(fecha),
  recordatorioAt: extra.recordatorioAt ? new Date(extra.recordatorioAt) : null,
  completada: extra.completada ?? false,
});

describe("tareas de Mi día", () => {
  it("la fecha de la tarea es el recordatorio si existe", () => {
    expect(fechaTarea(t("a", "2026-11-01T00:00:00Z", { recordatorioAt: "2026-11-09T00:00:00Z" }))).toEqual(new Date("2026-11-09T00:00:00Z"));
    expect(fechaTarea(t("a", "2026-11-01T00:00:00Z"))).toEqual(new Date("2026-11-01T00:00:00Z"));
  });
  it("separa vencidas y pendientes, ordenadas por fecha, y omite las completadas", () => {
    const r = clasificarTareas(
      [
        t("futura2", "2026-11-04T10:00:00Z", { recordatorioAt: "2026-11-07T10:00:00Z" }),
        t("vieja", "2026-11-01T10:00:00Z", { recordatorioAt: "2026-11-02T10:00:00Z" }),
        t("hecha", "2026-10-01T10:00:00Z", { completada: true }),
        t("futura1", "2026-11-04T10:00:00Z", { recordatorioAt: "2026-11-05T10:00:00Z" }),
        t("reciente", "2026-11-04T14:00:00Z", { recordatorioAt: "2026-11-04T14:59:59Z" }),
      ],
      ahora,
    );
    expect(r.vencidas.map((x) => x.id)).toEqual(["vieja", "reciente"]);
    expect(r.pendientes.map((x) => x.id)).toEqual(["futura1", "futura2"]);
  });
  it("una tarea justo en este instante todavía no está vencida", () => {
    const r = clasificarTareas([t("ahora", "2026-11-04T15:00:00Z")], ahora);
    expect(r.vencidas).toEqual([]);
    expect(r.pendientes).toHaveLength(1);
  });
  it("sin tareas devuelve listas vacías", () => {
    expect(clasificarTareas([], ahora)).toEqual({ vencidas: [], pendientes: [] });
  });
});

describe("valores iniciales de una actividad", () => {
  it("visita, llamada y mensaje ya ocurrieron: nacen completadas y sin recordatorio", () => {
    const r = valoresIniciales("VISITA", new Date("2026-11-09T00:00:00Z"));
    expect(r).toEqual({ ok: true, completada: true, recordatorioAt: null });
    expect(valoresIniciales("LLAMADA", null)).toEqual({ ok: true, completada: true, recordatorioAt: null });
    expect(valoresIniciales("MENSAJE", null)).toMatchObject({ completada: true });
  });
  it("una tarea nace pendiente y exige recordatorio", () => {
    const rec = new Date("2026-11-09T00:00:00Z");
    expect(valoresIniciales("TAREA", rec)).toEqual({ ok: true, completada: false, recordatorioAt: rec });
    expect(valoresIniciales("TAREA", null)).toEqual({ ok: false, mensaje: "La tarea necesita una fecha de recordatorio." });
  });
});
