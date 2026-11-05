// Datos de la pantalla de inicio: consultas agrupadas y acotadas por rol (`can()` + alcance de cartera).
import type { Prisma } from "@prisma/client";
import { evaluarRiesgo } from "@/domain/riesgo";
import { mesesTerminadosEn } from "@/domain/periodos";
import { estadoDelPlazo } from "@/domain/solicitudes";
import { filtroCartera, filtroPorVendedor } from "@/lib/cartera";
import { can } from "@/lib/permisos";
import { PEDIDOS_VALIDOS } from "@/lib/pedidos";
import { prisma } from "@/lib/prisma";
import { filtroCasos, filtroEscalados } from "@/lib/servicio";
import type { UsuarioSesion } from "@/lib/sesion";

type SegmentoCliente = "A" | "B" | "C" | "SIN_CLASIFICAR";

export interface MesVentas {
  /** Mes en formato AAAA-MM. */
  mes: string;
  /** Abreviatura del mes, por ejemplo «nov». */
  etiqueta: string;
  pedidos: number;
  monto: number;
  margen: number;
}

export interface ClienteRiesgoResumen {
  id: string;
  razonSocial: string;
  segmento: SegmentoCliente;
  vendedor: string;
  diasSinCompra: number | null;
}

export interface MovimientoReciente {
  id: string;
  titulo: string;
  detalle: string;
  fecha: Date;
  href: string | null;
}

export interface ResumenInicio {
  clientes: { activos: number; enRiesgo: number } | null;
  oportunidades: { abiertas: number; monto: number } | null;
  pedidosMes: { cantidad: number; monto: number; margen: number } | null;
  ventas6Meses: MesVentas[] | null;
  casos: { abiertos: number; vencidosSla: number } | null;
  solicitudes: { abiertas: number; porVencer: number; vencidas: number } | null;
  usuariosActivos: number | null;
  segmentos: { segmento: SegmentoCliente; clientes: number }[] | null;
  riesgoTop: ClienteRiesgoResumen[] | null;
  recientes: { origen: "actividad" | "auditoria"; items: MovimientoReciente[] } | null;
}

const NOMBRE_MES = new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" });
const MAX_RIESGO_CANDIDATOS = 40;
const TIPO_ACTIVIDAD = { VISITA: "Visita", LLAMADA: "Llamada", MENSAJE: "Mensaje", TAREA: "Tarea" } as const;

/** Alcance de lectura de actividades, alineado con `can(ver, actividad)`. */
function filtroActividades(usuario: UsuarioSesion): Prisma.ActividadWhereInput {
  if (usuario.rol === "VENDEDOR") return { usuarioId: usuario.id };
  if (usuario.rol === "JEFE_VENTAS") return { OR: [{ usuarioId: usuario.id }, { usuario: { jefeId: usuario.id } }] };
  return {};
}

const humanizar = (accion: string) => {
  const t = accion.toLowerCase().replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export async function cargarResumenInicio(usuario: UsuarioSesion, ahora: Date): Promise<ResumenInicio> {
  const verClientes = can(usuario, "ver", "cliente");
  const verOportunidades = can(usuario, "ver", "oportunidad");
  const verPedidos = can(usuario, "ver", "pedido");
  const verCasos = can(usuario, "ver", "caso");
  const verSolicitudes = can(usuario, "ver", "solicitud_titular");
  const verUsuarios = can(usuario, "ver", "usuario");
  const verIndicadores = can(usuario, "ver", "indicadores");
  const verActividades = can(usuario, "ver", "actividad");
  const verAuditoria = can(usuario, "ver", "auditoria");

  const meses = mesesTerminadosEn(ahora, 6);
  const mesActual = meses[meses.length - 1];
  const cartera = filtroCartera(usuario);
  const porVendedor = filtroPorVendedor(usuario);
  const casosVisibles = filtroCasos(usuario);

  const [
    activos,
    enRiesgo,
    oportunidades,
    pedidos,
    casosAbiertos,
    casosVencidos,
    solicitudes,
    usuariosActivos,
    segmentos,
    candidatosRiesgo,
    actividades,
    auditoria,
  ] = await Promise.all([
    verClientes ? prisma.cliente.count({ where: { AND: [cartera, { estado: "ACTIVO" }] } }) : null,
    verClientes ? prisma.cliente.count({ where: { AND: [cartera, { estado: "EN_RIESGO" }] } }) : null,
    verOportunidades
      ? prisma.oportunidad.aggregate({
          where: { ...porVendedor, etapa: { notIn: ["GANADA", "PERDIDA"] } },
          _count: true,
          _sum: { montoEstimado: true },
        })
      : null,
    verPedidos
      ? prisma.pedido.findMany({
          where: { ...porVendedor, ...PEDIDOS_VALIDOS, fecha: { gte: meses[0].inicio, lt: mesActual.finExcl } },
          select: { fecha: true, monto: true, margen: true },
        })
      : null,
    verCasos ? prisma.caso.count({ where: { AND: [casosVisibles, { estado: { in: ["ABIERTO", "EN_PROCESO", "ESCALADO"] } }] } }) : null,
    // Mismo criterio que `estadoEfectivo` de src/domain/sla.ts, expresado como consulta.
    verCasos ? prisma.caso.count({ where: { AND: [casosVisibles, filtroEscalados(ahora)] } }) : null,
    verSolicitudes
      ? prisma.solicitudTitular.findMany({
          where: { estado: { in: ["PENDIENTE", "EN_PROCESO"] } },
          select: { tipo: true, estado: true, solicitadaAt: true, atendidaAt: true },
        })
      : null,
    verUsuarios ? prisma.usuario.count({ where: { activo: true } }) : null,
    verIndicadores && !verPedidos ? prisma.cliente.groupBy({ by: ["segmento"], where: cartera, _count: { _all: true } }) : null,
    verClientes
      ? prisma.cliente.findMany({
          where: { AND: [cartera, { estado: "EN_RIESGO" }] },
          select: { id: true, razonSocial: true, segmento: true, vendedor: { select: { nombre: true } } },
          take: MAX_RIESGO_CANDIDATOS,
        })
      : null,
    verActividades
      ? prisma.actividad.findMany({
          where: filtroActividades(usuario),
          orderBy: { updatedAt: "desc" },
          take: 6,
          select: {
            id: true,
            tipo: true,
            completada: true,
            updatedAt: true,
            clienteId: true,
            cliente: { select: { razonSocial: true } },
            usuario: { select: { nombre: true } },
          },
        })
      : null,
    verAuditoria
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
          select: { id: true, accion: true, entidad: true, createdAt: true, usuario: { select: { nombre: true } } },
        })
      : null,
  ]);

  // Ventas por mes (UTC, igual que el resto de períodos del sistema).
  let ventas6Meses: MesVentas[] | null = null;
  let pedidosMes: ResumenInicio["pedidosMes"] = null;
  if (pedidos) {
    const serie: MesVentas[] = meses.map((m) => ({
      mes: m.etiqueta,
      etiqueta: NOMBRE_MES.format(m.inicio).replace(".", ""),
      pedidos: 0,
      monto: 0,
      margen: 0,
    }));
    for (const p of pedidos) {
      const idx = meses.findIndex((m) => p.fecha >= m.inicio && p.fecha < m.finExcl);
      if (idx < 0) continue;
      serie[idx].pedidos += 1;
      serie[idx].monto += Number(p.monto);
      serie[idx].margen += Number(p.margen);
    }
    ventas6Meses = serie;
    const ult = serie[serie.length - 1];
    pedidosMes = { cantidad: ult.pedidos, monto: ult.monto, margen: ult.margen };
  }

  // Clientes en riesgo: días sin compra con un solo groupBy sobre los candidatos.
  let riesgoTop: ClienteRiesgoResumen[] | null = null;
  if (candidatosRiesgo) {
    const grupos = candidatosRiesgo.length
      ? await prisma.pedido.groupBy({
          by: ["clienteId"],
          where: { ...PEDIDOS_VALIDOS, clienteId: { in: candidatosRiesgo.map((c) => c.id) } },
          _count: { _all: true },
          _min: { fecha: true },
          _max: { fecha: true },
        })
      : [];
    const porCliente = new Map(grupos.map((g) => [g.clienteId, g]));
    riesgoTop = candidatosRiesgo
      .map((c) => {
        const g = porCliente.get(c.id);
        const ev = evaluarRiesgo(
          g ? { cantidad: g._count._all, primera: g._min.fecha, ultima: g._max.fecha } : { cantidad: 0, primera: null, ultima: null },
          ahora,
        );
        return { id: c.id, razonSocial: c.razonSocial, segmento: c.segmento, vendedor: c.vendedor.nombre, diasSinCompra: ev.diasSinCompra };
      })
      .sort((a, b) => (b.diasSinCompra ?? 0) - (a.diasSinCompra ?? 0))
      .slice(0, 5);
  }

  let resumenSolicitudes: ResumenInicio["solicitudes"] = null;
  if (solicitudes) {
    const plazos = solicitudes.map((s) => estadoDelPlazo(s, ahora).estado);
    resumenSolicitudes = {
      abiertas: solicitudes.length,
      porVencer: plazos.filter((p) => p === "POR_VENCER").length,
      vencidas: plazos.filter((p) => p === "VENCIDA").length,
    };
  }

  let recientes: ResumenInicio["recientes"] = null;
  if (actividades) {
    recientes = {
      origen: "actividad",
      items: actividades.map((a) => ({
        id: a.id,
        titulo: `${TIPO_ACTIVIDAD[a.tipo]}${a.completada ? " completada" : ""}`,
        detalle: `${a.cliente.razonSocial} · ${a.usuario.nombre}`,
        fecha: a.updatedAt,
        href: `/clientes/${a.clienteId}`,
      })),
    };
  } else if (auditoria) {
    recientes = {
      origen: "auditoria",
      items: auditoria.map((r) => ({ id: r.id, titulo: humanizar(r.accion), detalle: r.usuario.nombre, fecha: r.createdAt, href: null })),
    };
  }

  return {
    clientes: activos !== null && enRiesgo !== null ? { activos, enRiesgo } : null,
    oportunidades: oportunidades ? { abiertas: oportunidades._count, monto: Number(oportunidades._sum.montoEstimado ?? 0) } : null,
    pedidosMes,
    ventas6Meses,
    casos: casosAbiertos !== null && casosVencidos !== null ? { abiertos: casosAbiertos, vencidosSla: casosVencidos } : null,
    solicitudes: resumenSolicitudes,
    usuariosActivos,
    segmentos: segmentos ? segmentos.map((s) => ({ segmento: s.segmento, clientes: s._count._all })) : null,
    riesgoTop,
    recientes,
  };
}
