import { describe, expect, it } from "vitest";
import {
  activoEn,
  agruparPorMes,
  porcentaje,
  retencionDelPeriodo,
  semaforo,
  tasaCompletitud,
  tasaConversion,
  tasaPrimerContacto,
  tasaUsuariosActivos,
  tiempoRespuesta,
  type ClientePeriodo,
} from "@/domain/indicadores";
import { mesesTerminadosEn } from "@/domain/periodos";

const d = (s: string) => new Date(s);

describe("porcentaje", () => {
  it("redondea a un decimal", () => {
    expect(porcentaje(1, 3)).toBe(33.3);
    expect(porcentaje(2, 3)).toBe(66.7);
  });
  it("sin denominador devuelve null (no 0 ni NaN)", () => {
    expect(porcentaje(0, 0)).toBeNull();
    expect(porcentaje(5, 0)).toBeNull();
  });
  it("0 sobre algo es 0", () => {
    expect(porcentaje(0, 10)).toBe(0);
  });
});

describe("activoEn (indicador 1: pedido en los 12 meses previos)", () => {
  const corte = d("2026-11-01T00:00:00Z");
  it("un pedido dentro de los 12 meses previos activa al cliente", () => {
    expect(activoEn([d("2026-02-01T00:00:00Z")], corte)).toBe(true);
  });
  it("el límite inicial (hace 12 meses exactos) cuenta; un instante antes no", () => {
    expect(activoEn([d("2025-11-01T00:00:00Z")], corte)).toBe(true);
    expect(activoEn([d("2025-10-31T23:59:59Z")], corte)).toBe(false);
  });
  it("un pedido en el corte o posterior no cuenta (el corte es exclusivo)", () => {
    expect(activoEn([d("2026-11-01T00:00:00Z")], corte)).toBe(false);
  });
  it("sin pedidos no está activo", () => {
    expect(activoEn([], corte)).toBe(false);
  });
});

describe("retencionDelPeriodo (indicador 1)", () => {
  const desde = d("2026-01-01T00:00:00Z");
  const hastaExcl = d("2027-01-01T00:00:00Z");
  const cliente = (id: string, creadoAt: string, fechas: string[]): ClientePeriodo => ({
    id,
    creadoAt: d(creadoAt),
    fechasPedidos: fechas.map(d),
  });

  it("aplica (activos al final - nuevos) / activos al inicio x 100", () => {
    const clientes = [
      cliente("a", "2024-01-01T00:00:00Z", ["2025-06-01T00:00:00Z", "2026-06-01T00:00:00Z"]), // activo inicio y fin
      cliente("b", "2024-01-01T00:00:00Z", ["2025-03-01T00:00:00Z"]), // activo al inicio, ya no al final
      cliente("c", "2024-01-01T00:00:00Z", ["2025-02-01T00:00:00Z", "2026-03-01T00:00:00Z"]), // activo inicio y fin
      cliente("d", "2026-05-01T00:00:00Z", ["2026-06-01T00:00:00Z"]), // nuevo, activo al final
      cliente("e", "2020-01-01T00:00:00Z", []), // nunca compró
    ];
    const r = retencionDelPeriodo(clientes, desde, hastaExcl);
    expect(r.activosInicio).toBe(3);
    expect(r.activosFin).toBe(3);
    expect(r.nuevos).toBe(1);
    expect(r.valor).toBe(66.7); // (3 - 1) / 3
  });

  it("un cliente nuevo sin pedidos no cuenta como nuevo activo", () => {
    const r = retencionDelPeriodo(
      [cliente("a", "2025-01-01T00:00:00Z", ["2025-06-01T00:00:00Z", "2026-06-01T00:00:00Z"]), cliente("n", "2026-06-01T00:00:00Z", [])],
      desde,
      hastaExcl,
    );
    expect(r.nuevos).toBe(0);
    expect(r.valor).toBe(100);
  });

  it("sin activos al inicio no hay retención calculable", () => {
    const r = retencionDelPeriodo([cliente("d", "2026-05-01T00:00:00Z", ["2026-06-01T00:00:00Z"])], desde, hastaExcl);
    expect(r.activosInicio).toBe(0);
    expect(r.valor).toBeNull();
  });

  it("sin clientes devuelve ceros y null", () => {
    expect(retencionDelPeriodo([], desde, hastaExcl)).toEqual({ activosInicio: 0, activosFin: 0, nuevos: 0, valor: null });
  });
});

describe("tasaConversion (indicador 2)", () => {
  it("ganadas del período / creadas del período", () => {
    expect(tasaConversion(9, 50)).toBe(18);
  });
  it("sin oportunidades creadas es null", () => {
    expect(tasaConversion(0, 0)).toBeNull();
  });
});

describe("tasaPrimerContacto (indicador 3)", () => {
  it("resueltos en primer contacto / resueltos o cerrados", () => {
    expect(tasaPrimerContacto(7, 10)).toBe(70);
  });
  it("sin casos resueltos es null", () => {
    expect(tasaPrimerContacto(0, 0)).toBeNull();
  });
});

describe("tiempoRespuesta (indicador 4)", () => {
  const caso = (apertura: string, respuesta: string | null, limite: string) => ({
    aperturaAt: d(apertura),
    primeraRespuestaAt: respuesta ? d(respuesta) : null,
    fechaLimite: d(limite),
  });
  it("promedia horas y calcula el porcentaje dentro del SLA", () => {
    const r = tiempoRespuesta([
      caso("2026-11-01T10:00:00Z", "2026-11-01T12:00:00Z", "2026-11-02T10:00:00Z"), // 2 h, dentro
      caso("2026-11-01T10:00:00Z", "2026-11-02T10:00:00Z", "2026-11-02T10:00:00Z"), // 24 h, exacto: dentro
      caso("2026-11-01T10:00:00Z", "2026-11-03T10:00:00Z", "2026-11-02T10:00:00Z"), // 48 h, fuera
    ]);
    expect(r.muestra).toBe(3);
    expect(r.horasPromedio).toBe(24.67);
    expect(r.porcentajeEnSla).toBe(66.7);
  });
  it("ignora los casos sin primera respuesta", () => {
    const r = tiempoRespuesta([
      caso("2026-11-01T10:00:00Z", null, "2026-11-02T10:00:00Z"),
      caso("2026-11-01T10:00:00Z", "2026-11-01T11:00:00Z", "2026-11-02T10:00:00Z"),
    ]);
    expect(r).toEqual({ horasPromedio: 1, porcentajeEnSla: 100, muestra: 1 });
  });
  it("sin respuestas devuelve null", () => {
    expect(tiempoRespuesta([])).toEqual({ horasPromedio: null, porcentajeEnSla: null, muestra: 0 });
  });
});

describe("tasaCompletitud (indicador 5) y tasaUsuariosActivos (indicador 6)", () => {
  it("completos / activos", () => {
    expect(tasaCompletitud(55, 100)).toBe(55);
    expect(tasaCompletitud(0, 0)).toBeNull();
  });
  it("usuarios con escritura / usuarios activos", () => {
    expect(tasaUsuariosActivos(19, 21)).toBe(90.5);
    expect(tasaUsuariosActivos(0, 0)).toBeNull();
  });
});

describe("semaforo", () => {
  const retencion = { lineaBase: 78, meta: 83 };
  it("verde desde la meta (inclusive)", () => {
    expect(semaforo(83, retencion)).toBe("verde");
    expect(semaforo(90, retencion)).toBe("verde");
  });
  it("ámbar entre la línea base y la meta", () => {
    expect(semaforo(78, retencion)).toBe("ambar");
    expect(semaforo(82.9, retencion)).toBe("ambar");
  });
  it("rojo bajo la línea base", () => {
    expect(semaforo(77.9, retencion)).toBe("rojo");
  });
  it("sin datos cuando el valor es null", () => {
    expect(semaforo(null, retencion)).toBe("sin_datos");
  });
  it("sin línea base: ámbar desde el 80 % de la meta", () => {
    const fpc = { lineaBase: null, meta: 70 };
    expect(semaforo(70, fpc)).toBe("verde");
    expect(semaforo(56, fpc)).toBe("ambar");
    expect(semaforo(55.9, fpc)).toBe("rojo");
  });
  it("menor es mejor (tiempo de respuesta): verde hasta la meta", () => {
    const tiempo = { lineaBase: null, meta: 24, menorEsMejor: true };
    expect(semaforo(24, tiempo)).toBe("verde");
    expect(semaforo(30, tiempo)).toBe("ambar");
    expect(semaforo(30.1, tiempo)).toBe("rojo");
  });
});

describe("agruparPorMes", () => {
  const meses = mesesTerminadosEn(d("2026-11-04T00:00:00Z"), 3);
  it("reparte cada elemento en el mes de su fecha y descarta lo que cae fuera o sin fecha", () => {
    const items = [
      { id: 1, f: d("2026-09-30T23:59:59Z") },
      { id: 2, f: d("2026-10-01T00:00:00Z") },
      { id: 3, f: d("2026-11-20T00:00:00Z") },
      { id: 4, f: d("2026-08-31T00:00:00Z") }, // antes de la ventana
      { id: 5, f: d("2026-12-01T00:00:00Z") }, // después de la ventana
      { id: 6, f: null },
    ];
    const g = agruparPorMes(items, (i) => i.f, meses);
    expect(g.map((x) => x.map((i) => i.id))).toEqual([[1], [2], [3]]);
  });
});
