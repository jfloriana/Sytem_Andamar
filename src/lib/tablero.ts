// Datos del tablero de indicadores (RF-12): consultas acotadas por rol y filtros, y cálculo con funciones puras.
import type { Prisma } from "@prisma/client";
import { CLV, INDICADORES } from "@/config";
import { clvPorSegmento, type ClvSegmento } from "@/domain/clv";
import { aCsv, type CeldaCsv } from "@/domain/csv";
import {
  agruparPorMes,
  retencionDelPeriodo,
  semaforo,
  tasaCompletitud,
  tasaConversion,
  tasaPrimerContacto,
  tasaUsuariosActivos,
  tiempoRespuesta,
  type ClientePeriodo,
  type MetaIndicador,
  type Semaforo,
} from "@/domain/indicadores";
import { mesesTerminadosEn, restarMeses } from "@/domain/periodos";
import { esClienteCompleto } from "@/domain/calidad-datos";
import { SEGMENTOS_ORDEN, inicioVentana, type Segmento } from "@/domain/segmentacion";
import { filtroCartera } from "@/lib/cartera";
import { ETIQUETA_SEGMENTO } from "@/lib/formato";
import { PEDIDOS_VALIDOS } from "@/lib/pedidos";
import { prisma } from "@/lib/prisma";
import type { UsuarioSesion } from "@/lib/sesion";

const DIA_MS = 24 * 60 * 60 * 1000;
const MAX_FILAS_AUDITORIA = 50_000;

export type ClaveIndicador = "retencion" | "conversion" | "primerContacto" | "tiempoRespuesta" | "completitud" | "usuariosActivos";

export interface PuntoTendencia {
  mes: string;
  valor: number | null;
}

export interface TarjetaIndicador {
  clave: ClaveIndicador;
  titulo: string;
  valor: number | null;
  unidad: "%" | "h";
  meta: number;
  lineaBase: number | null;
  menorEsMejor: boolean;
  semaforo: Semaforo;
  /** Cifras que sostienen el valor, en una línea. */
  detalle: string;
  formula: string;
  tendencia: PuntoTendencia[];
}

export interface FiltrosTablero {
  desde: Date;
  hasta: Date;
  hastaExcl: Date;
  vendedorId?: string;
  segmento?: Segmento;
}

export interface Tablero {
  filtros: FiltrosTablero;
  tarjetas: TarjetaIndicador[];
  distribucion: { segmento: Segmento; clientes: number }[];
  clv: ClvSegmento[];
  retencionClv: number;
  generadoAt: Date;
}

export const esSegmento = (v: string | undefined): v is Segmento => !!v && (SEGMENTOS_ORDEN as readonly string[]).includes(v);

const fmt = (n: number) => new Intl.NumberFormat("es-PE").format(n);

function filtroClientes(usuario: UsuarioSesion, f: FiltrosTablero): Prisma.ClienteWhereInput {
  return {
    AND: [filtroCartera(usuario), f.vendedorId ? { vendedorId: f.vendedorId } : {}, f.segmento ? { segmento: f.segmento } : {}],
  };
}

/** Vendedores que el usuario puede usar como filtro (su equipo si es jefe de ventas). */
export async function vendedoresParaFiltro(usuario: UsuarioSesion) {
  return prisma.usuario.findMany({
    where: { rol: "VENDEDOR", activo: true, ...(usuario.rol === "JEFE_VENTAS" ? { jefeId: usuario.id } : {}) },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
}

function usuariosEnAlcance(usuario: UsuarioSesion, f: FiltrosTablero): Prisma.UsuarioWhereInput {
  if (f.vendedorId) return { activo: true, id: f.vendedorId, ...(usuario.rol === "JEFE_VENTAS" ? { jefeId: usuario.id } : {}) };
  if (usuario.rol === "JEFE_VENTAS") return { activo: true, OR: [{ id: usuario.id }, { jefeId: usuario.id }] };
  return { activo: true };
}

export async function calcularTablero(usuario: UsuarioSesion, f: FiltrosTablero, ahora: Date = new Date()): Promise<Tablero> {
  const meses = mesesTerminadosEn(new Date(f.hastaExcl.getTime() - 1), INDICADORES.mesesTendencia);
  const cortes = meses.map((m) => new Date(Math.min(m.finExcl.getTime(), f.hastaExcl.getTime())));
  const ventanaMin = new Date(Math.min(f.desde.getTime(), meses[0].inicio.getTime()));
  const pedidosMin = new Date(
    Math.min(restarMeses(f.desde, INDICADORES.periodoMeses).getTime(), restarMeses(cortes[0], 2 * INDICADORES.periodoMeses).getTime()),
  );
  const auditoriaMin = new Date(Math.min(f.hastaExcl.getTime() - INDICADORES.diasUsuarioActivo * DIA_MS, meses[0].inicio.getTime() - INDICADORES.diasUsuarioActivo * DIA_MS));
  const cliente = filtroClientes(usuario, f);
  const rango = { gte: ventanaMin, lt: f.hastaExcl };

  const [clientes, pedidos, margenes, oportunidades, casos, usuarios] = await Promise.all([
    prisma.cliente.findMany({
      where: cliente,
      select: {
        id: true,
        createdAt: true,
        estado: true,
        segmento: true,
        documento: true,
        razonSocial: true,
        direccion: true,
        vendedorId: true,
        contactos: { where: { principal: true }, select: { telefono: true, email: true }, take: 1 },
      },
    }),
    prisma.pedido.findMany({
      where: { ...PEDIDOS_VALIDOS, cliente, fecha: { gte: pedidosMin, lt: f.hastaExcl } },
      select: { clienteId: true, fecha: true },
    }),
    prisma.pedido.groupBy({
      by: ["clienteId"],
      where: { ...PEDIDOS_VALIDOS, cliente, fecha: { gte: inicioVentana(ahora) } },
      _sum: { margen: true },
    }),
    prisma.oportunidad.findMany({
      where: { cliente, OR: [{ createdAt: rango }, { cerradaAt: rango }] },
      select: { etapa: true, createdAt: true, cerradaAt: true },
    }),
    prisma.caso.findMany({
      where: { cliente, OR: [{ aperturaAt: rango }, { resueltoAt: rango }] },
      select: { estado: true, aperturaAt: true, primeraRespuestaAt: true, fechaLimite: true, resueltoAt: true, resueltoPrimerContacto: true },
    }),
    prisma.usuario.findMany({ where: usuariosEnAlcance(usuario, f), select: { id: true } }),
  ]);
  const idsUsuarios = usuarios.map((u) => u.id);
  const auditoria = await prisma.auditLog.findMany({
    where: { usuarioId: { in: idsUsuarios }, createdAt: { gte: auditoriaMin, lt: f.hastaExcl } },
    select: { usuarioId: true, createdAt: true },
    take: MAX_FILAS_AUDITORIA,
  });

  const enPeriodo = (d: Date | null) => !!d && d >= f.desde && d < f.hastaExcl;
  const tarjeta = (
    t: Pick<TarjetaIndicador, "clave" | "titulo" | "unidad" | "valor" | "detalle" | "formula" | "tendencia">,
    m: MetaIndicador,
  ): TarjetaIndicador => ({
    ...t,
    meta: m.meta,
    lineaBase: m.lineaBase,
    menorEsMejor: m.menorEsMejor ?? false,
    semaforo: semaforo(t.valor, m),
  });
  const serie = (valores: (number | null)[]): PuntoTendencia[] => meses.map((m, i) => ({ mes: m.etiqueta, valor: valores[i] }));

  // 1. Retención (anual móvil en la tendencia: 12 meses que terminan en cada mes).
  const porCliente = new Map<string, Date[]>();
  for (const p of pedidos) (porCliente.get(p.clienteId) ?? porCliente.set(p.clienteId, []).get(p.clienteId)!).push(p.fecha);
  const clientesPeriodo: ClientePeriodo[] = clientes.map((c) => ({ id: c.id, creadoAt: c.createdAt, fechasPedidos: porCliente.get(c.id) ?? [] }));
  const ret = retencionDelPeriodo(clientesPeriodo, f.desde, f.hastaExcl);
  const tendRet = cortes.map((corte) => retencionDelPeriodo(clientesPeriodo, restarMeses(corte, INDICADORES.periodoMeses), corte).valor);

  // 2. Conversión.
  const ganadasEn = (o: (typeof oportunidades)[number]) => o.etapa === "GANADA" && o.cerradaAt;
  const creadas = oportunidades.filter((o) => enPeriodo(o.createdAt)).length;
  const ganadas = oportunidades.filter((o) => ganadasEn(o) && enPeriodo(o.cerradaAt)).length;
  const creadasMes = agruparPorMes(oportunidades, (o) => o.createdAt, meses);
  const ganadasMes = agruparPorMes(oportunidades.filter(ganadasEn), (o) => o.cerradaAt, meses);

  // 3. Resolución en primer contacto.
  const cerrados = casos.filter((c) => (c.estado === "RESUELTO" || c.estado === "CERRADO") && enPeriodo(c.resueltoAt));
  const primerContacto = cerrados.filter((c) => c.resueltoPrimerContacto).length;
  const resueltosMes = agruparPorMes(
    casos.filter((c) => c.estado === "RESUELTO" || c.estado === "CERRADO"),
    (c) => c.resueltoAt,
    meses,
  );

  // 4. Tiempo de respuesta.
  const tr = tiempoRespuesta(casos.filter((c) => enPeriodo(c.aperturaAt)));
  const aperturasMes = agruparPorMes(casos, (c) => c.aperturaAt, meses);

  // 5. Completitud (foto actual; la tendencia usa los clientes que existían en cada mes).
  const vigentes = clientes.filter((c) => c.estado !== "INACTIVO");
  const completo = (c: (typeof clientes)[number]) => esClienteCompleto({ ...c, contactoPrincipal: c.contactos[0] ?? null });
  const completos = vigentes.filter(completo).length;
  const tendComp = cortes.map((corte) => {
    const existentes = vigentes.filter((c) => c.createdAt < corte);
    return tasaCompletitud(existentes.filter(completo).length, existentes.length);
  });

  // 6. Usuarios activos (escritura en los 30 días previos al corte).
  const activosEn = (corte: Date) => {
    const desde = corte.getTime() - INDICADORES.diasUsuarioActivo * DIA_MS;
    const con = new Set(auditoria.filter((a) => a.createdAt.getTime() >= desde && a.createdAt < corte).map((a) => a.usuarioId));
    return tasaUsuariosActivos(con.size, idsUsuarios.length);
  };
  const conEscritura = new Set(
    auditoria.filter((a) => a.createdAt.getTime() >= f.hastaExcl.getTime() - INDICADORES.diasUsuarioActivo * DIA_MS).map((a) => a.usuarioId),
  ).size;

  const tarjetas: TarjetaIndicador[] = [
    tarjeta(
      {
        clave: "retencion",
        titulo: "Retención de clientes",
        unidad: "%",
        valor: ret.valor,
        detalle: `${fmt(ret.activosInicio)} activos al inicio, ${fmt(ret.activosFin)} al final, ${fmt(ret.nuevos)} nuevos`,
        formula: "(clientes activos al final - nuevos del período) / activos al inicio x 100. Activo = al menos un pedido no anulado en los 12 meses previos. La tendencia usa 12 meses móviles.",
        tendencia: serie(tendRet),
      },
      INDICADORES.retencion,
    ),
    tarjeta(
      {
        clave: "conversion",
        titulo: "Conversión de oportunidades",
        unidad: "%",
        valor: tasaConversion(ganadas, creadas),
        detalle: `${fmt(ganadas)} ganadas cerradas en el período / ${fmt(creadas)} creadas en el período`,
        formula: "Oportunidades GANADA cerradas en el período / oportunidades creadas en el período x 100.",
        tendencia: serie(creadasMes.map((c, i) => tasaConversion(ganadasMes[i].length, c.length))),
      },
      INDICADORES.conversion,
    ),
    tarjeta(
      {
        clave: "primerContacto",
        titulo: "Resolución en primer contacto",
        unidad: "%",
        valor: tasaPrimerContacto(primerContacto, cerrados.length),
        detalle: `${fmt(primerContacto)} en primer contacto / ${fmt(cerrados.length)} casos resueltos o cerrados`,
        formula: "Casos con resolución en primer contacto / casos resueltos o cerrados en el período x 100.",
        tendencia: serie(resueltosMes.map((g) => tasaPrimerContacto(g.filter((c) => c.resueltoPrimerContacto).length, g.length))),
      },
      INDICADORES.primerContacto,
    ),
    tarjeta(
      {
        clave: "tiempoRespuesta",
        titulo: "Tiempo medio de respuesta",
        unidad: "h",
        valor: tr.horasPromedio,
        detalle:
          tr.muestra === 0
            ? "Sin casos con primera respuesta en el período"
            : `${tr.porcentajeEnSla ?? 0} % dentro del plazo (SLA) sobre ${fmt(tr.muestra)} casos respondidos`,
        formula: "Promedio de (primera respuesta - apertura) en horas, de los casos abiertos en el período, más el porcentaje respondido dentro de las 24 horas del SLA.",
        tendencia: serie(aperturasMes.map((g) => tiempoRespuesta(g).horasPromedio)),
      },
      { ...INDICADORES.tiempoRespuesta, menorEsMejor: true },
    ),
    tarjeta(
      {
        clave: "completitud",
        titulo: "Completitud de datos",
        unidad: "%",
        valor: tasaCompletitud(completos, vigentes.length),
        detalle: `${fmt(completos)} clientes completos / ${fmt(vigentes.length)} clientes activos (foto de hoy)`,
        formula: "Clientes completos / clientes activos x 100. Completo = documento, razón social, dirección, vendedor y contacto principal con teléfono o correo. La tendencia usa los datos actuales de los clientes que existían en cada mes.",
        tendencia: serie(tendComp),
      },
      INDICADORES.completitud,
    ),
    tarjeta(
      {
        clave: "usuariosActivos",
        titulo: "Usuarios activos del CRM",
        unidad: "%",
        valor: tasaUsuariosActivos(conEscritura, idsUsuarios.length),
        detalle: `${fmt(conEscritura)} con escrituras en los últimos ${INDICADORES.diasUsuarioActivo} días / ${fmt(idsUsuarios.length)} usuarios activos`,
        formula: `Usuarios con al menos una acción de escritura (auditoría) en los ${INDICADORES.diasUsuarioActivo} días previos al fin del período / usuarios activos x 100. No depende del filtro de segmento.`,
        tendencia: serie(cortes.map(activosEn)),
      },
      INDICADORES.usuariosActivos,
    ),
  ];

  const margenPorCliente = new Map(margenes.map((m) => [m.clienteId, Number(m._sum.margen ?? 0)]));
  const distribucion = SEGMENTOS_ORDEN.map((segmento) => ({ segmento, clientes: vigentes.filter((c) => c.segmento === segmento).length }));
  const clv = clvPorSegmento(
    vigentes.map((c) => ({ segmento: c.segmento, margenAnual: margenPorCliente.get(c.id) ?? 0 })),
    CLV.retencionReferencia,
  );
  return { filtros: f, tarjetas, distribucion, clv, retencionClv: CLV.retencionReferencia, generadoAt: ahora };
}

const dia = (d: Date) => d.toISOString().slice(0, 10);
export const valorTexto = (t: TarjetaIndicador) => (t.valor === null ? "Sin datos" : `${fmt(t.valor)} ${t.unidad}`);
export const ETIQUETA_SEMAFORO: Record<Semaforo, string> = { verde: "Cumple la meta", ambar: "Entre línea base y meta", rojo: "Bajo la línea base", sin_datos: "Sin datos" };

/** Filas del CSV de exportación: indicadores, tendencia, distribución por segmento y CLV. */
export function tableroACsv(t: Tablero): string {
  const filas: CeldaCsv[][] = [
    ["Tablero de indicadores CRM-Andamar"],
    ["Período", `${dia(t.filtros.desde)} a ${dia(t.filtros.hasta)}`],
    ["Vendedor", t.filtros.vendedorId ? "Filtrado" : "Todos"],
    ["Segmento", t.filtros.segmento ? ETIQUETA_SEGMENTO[t.filtros.segmento] : "Todos"],
    [],
    ["Indicador", "Valor", "Unidad", "Meta", "Línea base", "Semáforo", "Detalle"],
    ...t.tarjetas.map((x) => [x.titulo, x.valor, x.unidad, x.meta, x.lineaBase ?? "No se mide", ETIQUETA_SEMAFORO[x.semaforo], x.detalle]),
    [],
    ["Tendencia mensual", ...t.tarjetas[0].tendencia.map((p) => p.mes)],
    ...t.tarjetas.map((x) => [x.titulo, ...x.tendencia.map((p) => p.valor)]),
    [],
    ["Segmento", "Clientes"],
    ...t.distribucion.map((d) => [ETIQUETA_SEGMENTO[d.segmento], d.clientes]),
    [],
    [`CLV por segmento (aproximación; retención ${Math.round(t.retencionClv * 100)} %, descuento ${Math.round(CLV.tasaDescuento * 100)} %)`],
    ["Segmento", "Clientes", "Margen anual (USD)", "CLV promedio (USD)", "CLV total (USD)"],
    ...t.clv.map((c) => [ETIQUETA_SEGMENTO[c.segmento], c.clientes, c.margenTotal, Math.round(c.clvPromedio * 100) / 100, Math.round(c.clvTotal * 100) / 100]),
  ];
  return aCsv(filas);
}
