import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileClock,
  FilePlus2,
  Headset,
  History,
  LifeBuoy,
  MapPinned,
  PhoneCall,
  ShieldAlert,
  ShoppingCart,
  Target,
  Users,
} from "lucide-react";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { EstadoVacio } from "@/components/estado-vacio";
import { GraficoVentas } from "@/components/grafico-ventas";
import { InsigniaSegmento } from "@/components/insignia-segmento";
import { TarjetaKpi } from "@/components/tarjeta-kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clasificarTareas, fechaTarea } from "@/domain/actividades";
import { estadoEfectivo } from "@/domain/sla";
import { ETIQUETA_ESTADO_CASO, ETIQUETA_PRIORIDAD, ETIQUETA_SEGMENTO, ETIQUETA_TIPO_ACTIVIDAD, VARIANTE_ESTADO_CASO, formatoDinero, formatoFechaHora } from "@/lib/formato";
import { cargarResumenInicio, type ResumenInicio } from "@/lib/inicio";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir, type UsuarioSesion } from "@/lib/sesion";
import { completarActividad } from "./actividades/actions";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

const MAX_TAREAS = 50;
const MAX_CASOS = 10;
const REGISTRADA = { VISITA: "Visita registrada.", LLAMADA: "Llamada registrada.", MENSAJE: "Mensaje registrado.", TAREA: "Tarea guardada." } as const;
const ZONA = "America/Lima";
const entero = new Intl.NumberFormat("es-PE");
const fechaLarga = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: ZONA });
const horaLima = new Intl.DateTimeFormat("es-PE", { hour: "numeric", hour12: false, timeZone: ZONA });

function saludo(ahora: Date): string {
  const h = Number(horaLima.format(ahora)) % 24;
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

const SUBTITULO: Record<UsuarioSesion["rol"], string> = {
  ADMIN: "Estado de la plataforma, solicitudes de titulares y actividad del sistema.",
  GERENCIA: "Panorama de la cartera, las ventas del mes y la atención al cliente.",
  JEFE_VENTAS: "Cartera, pipeline y pedidos de tu equipo comercial.",
  VENDEDOR: "Tus tareas, tu pipeline y los clientes que conviene visitar.",
  JEFE_SERVICIO: "Casos abiertos del equipo y cumplimiento de plazos.",
  EJECUTIVO_SERVICIO: "Tus casos abiertos y los plazos por atender.",
};

async function cargarTareas(usuario: UsuarioSesion) {
  const tareas = await prisma.actividad.findMany({
    where: { usuarioId: usuario.id, completada: false },
    include: { cliente: { select: { id: true, razonSocial: true } } },
    orderBy: { fecha: "asc" },
    take: MAX_TAREAS,
  });
  return clasificarTareas(tareas, new Date());
}

type Tarea = Awaited<ReturnType<typeof cargarTareas>>["vencidas"][number];

const ICONO_TIPO = { VISITA: MapPinned, LLAMADA: PhoneCall, MENSAJE: FileClock, TAREA: CalendarCheck } as const;

function ListaTareas({ tareas, vencidas }: { tareas: Tarea[]; vencidas: boolean }) {
  return (
    <ul className="divide-y divide-border/70">
      {tareas.map((t) => {
        const Icono = ICONO_TIPO[t.tipo];
        return (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 sm:flex-nowrap">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${vencidas ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                aria-hidden="true"
              >
                <Icono className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">
                  {ETIQUETA_TIPO_ACTIVIDAD[t.tipo]}: {t.resultado ?? "Sin detalle"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <Link href={`/clientes/${t.cliente.id}`} className="text-primary hover:underline">
                    {t.cliente.razonSocial}
                  </Link>
                  {" · "}
                  <time dateTime={fechaTarea(t).toISOString()}>{formatoFechaHora(fechaTarea(t))}</time>
                  {vencidas ? <Badge variant="destructive" className="ml-2">Vencida</Badge> : null}
                </p>
              </div>
            </div>
            <form action={completarActividad}>
              <input type="hidden" name="actividadId" value={t.id} />
              <Button type="submit" variant="secondary" aria-label={`Completar tarea de ${t.cliente.razonSocial}`}>
                Completar
              </Button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

async function SeccionTareas({ usuario }: { usuario: UsuarioSesion }) {
  const { vencidas, pendientes } = await cargarTareas(usuario);
  return (
    <>
      <Card className="entra">
        <CardHeader>
          <CardTitle>Vencidas ({vencidas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {vencidas.length === 0 ? (
            <EstadoVacio icono={CheckCircle2} texto="Estás al día: no tienes tareas vencidas." />
          ) : (
            <ListaTareas tareas={vencidas} vencidas />
          )}
        </CardContent>
      </Card>
      <Card className="entra" style={{ ["--d" as string]: "60ms" }}>
        <CardHeader>
          <CardTitle>Pendientes ({pendientes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendientes.length === 0 ? (
            <EstadoVacio
              icono={CalendarCheck}
              texto="No tienes tareas pendientes. Agenda una llamada o una visita para mantener el ritmo con tus clientes."
              accion={{ href: "/actividades/nueva?tipo=TAREA", etiqueta: "Agendar tarea" }}
            />
          ) : (
            <ListaTareas tareas={pendientes} vencidas={false} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

async function SeccionCasos({ usuario }: { usuario: UsuarioSesion }) {
  const supervisa = usuario.rol === "JEFE_SERVICIO";
  const casos = await prisma.caso.findMany({
    where: { estado: { in: ["ABIERTO", "EN_PROCESO", "ESCALADO"] }, ...(supervisa ? {} : { responsableId: usuario.id }) },
    include: { cliente: { select: { razonSocial: true } } },
    orderBy: { fechaLimite: "asc" },
    take: 100,
  });
  const ahora = new Date();
  const filas = casos
    .map((c) => ({ ...c, efectivo: estadoEfectivo(c, ahora) }))
    .sort((a, b) => Number(b.efectivo === "ESCALADO") - Number(a.efectivo === "ESCALADO"))
    .slice(0, MAX_CASOS);
  const escalados = casos.filter((c) => estadoEfectivo(c, ahora) === "ESCALADO").length;

  return (
    <Card className="entra" style={{ ["--d" as string]: "120ms" }}>
      <CardHeader>
        <CardTitle>{supervisa ? "Casos abiertos del equipo" : "Mis casos abiertos"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm" role="status">
          {escalados > 0 ? <Badge variant="destructive">{escalados} escalados</Badge> : <Badge variant="success">Sin casos escalados</Badge>}
        </p>
        {filas.length === 0 ? (
          <EstadoVacio
            icono={LifeBuoy}
            texto="No hay casos abiertos. Cuando se registre uno, aparecerá aquí con su plazo de atención."
            accion={can(usuario, "crear", "caso") ? { href: "/casos/nuevo", etiqueta: "Registrar caso" } : undefined}
          />
        ) : (
          <ul className="divide-y divide-border/70">
            {filas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                <Link href={`/casos/${c.id}`} className="font-semibold text-primary hover:underline">
                  {c.titulo}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {c.cliente.razonSocial} · {ETIQUETA_PRIORIDAD[c.prioridad]}
                </span>
                <Badge variant={VARIANTE_ESTADO_CASO[c.efectivo]}>{ETIQUETA_ESTADO_CASO[c.efectivo]}</Badge>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="secondary" className="self-start">
          <Link href="/casos">Ver todos los casos</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Indicadores({ resumen, usuario }: { resumen: ResumenInicio; usuario: UsuarioSesion }) {
  const propios = usuario.rol === "VENDEDOR";
  const tarjetas: React.ComponentProps<typeof TarjetaKpi>[] = [];
  if (resumen.clientes) {
    tarjetas.push({
      etiqueta: "Clientes activos",
      valor: entero.format(resumen.clientes.activos),
      detalle: propios ? "En tu cartera" : "En la cartera visible",
      href: "/clientes",
      icono: Building2,
    });
    tarjetas.push({
      etiqueta: "Clientes en riesgo",
      valor: entero.format(resumen.clientes.enRiesgo),
      detalle: resumen.clientes.enRiesgo > 0 ? "Compran menos de lo habitual" : "Todos compran con normalidad",
      href: "/clientes/riesgo",
      icono: AlertTriangle,
      tono: resumen.clientes.enRiesgo > 0 ? "alerta" : "bueno",
    });
  }
  if (resumen.oportunidades) {
    tarjetas.push({
      etiqueta: "Oportunidades abiertas",
      valor: entero.format(resumen.oportunidades.abiertas),
      detalle: `${formatoDinero(resumen.oportunidades.monto)} estimados`,
      href: "/oportunidades",
      icono: Target,
    });
  }
  if (resumen.pedidosMes) {
    tarjetas.push({
      etiqueta: "Pedidos del mes",
      valor: entero.format(resumen.pedidosMes.cantidad),
      detalle: `${formatoDinero(resumen.pedidosMes.monto)} · margen ${formatoDinero(resumen.pedidosMes.margen)}`,
      href: "/pedidos",
      icono: ShoppingCart,
    });
  }
  if (resumen.casos) {
    tarjetas.push({
      etiqueta: "Casos abiertos",
      valor: entero.format(resumen.casos.abiertos),
      detalle: usuario.rol === "EJECUTIVO_SERVICIO" ? "Asignados a ti" : "En atención ahora",
      href: "/casos",
      icono: Headset,
    });
    tarjetas.push({
      etiqueta: "Casos con plazo vencido",
      valor: entero.format(resumen.casos.vencidosSla),
      detalle: resumen.casos.vencidosSla > 0 ? "Pasaron su límite de 24 h sin respuesta" : "Todos dentro del plazo",
      href: "/casos?estado=escalados",
      icono: Clock3,
      tono: resumen.casos.vencidosSla > 0 ? "alerta" : "bueno",
    });
  }
  if (resumen.solicitudes) {
    const { abiertas, porVencer, vencidas } = resumen.solicitudes;
    tarjetas.push({
      etiqueta: "Solicitudes de titulares",
      valor: entero.format(abiertas),
      detalle: `${porVencer} por vencer · ${vencidas} vencidas`,
      href: "/cumplimiento",
      icono: ShieldAlert,
      tono: vencidas > 0 ? "alerta" : porVencer > 0 ? "alerta" : "neutro",
    });
  }
  if (resumen.usuariosActivos !== null) {
    tarjetas.push({
      etiqueta: "Usuarios activos",
      valor: entero.format(resumen.usuariosActivos),
      detalle: "Con acceso al sistema",
      href: "/administracion/usuarios",
      icono: Users,
    });
  }
  if (tarjetas.length === 0) return null;
  return (
    <section aria-label="Indicadores del día" className="grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tarjetas.map((t, i) => (
        <TarjetaKpi key={t.etiqueta} {...t} retardo={i * 40} />
      ))}
    </section>
  );
}

const COLOR_SEGMENTO = { A: "bg-navy", B: "bg-primary", C: "bg-[#78a9ff]", SIN_CLASIFICAR: "bg-[#8d8d8d]" } as const;

function DistribucionSegmentos({ datos }: { datos: NonNullable<ResumenInicio["segmentos"]> }) {
  const total = datos.reduce((s, d) => s + d.clientes, 0);
  if (total === 0) {
    return <EstadoVacio icono={Building2} texto="Aún no hay clientes registrados. Crea el primero o importa tu cartera desde un CSV." accion={{ href: "/clientes/nuevo", etiqueta: "Crear cliente" }} />;
  }
  return (
    <div className="flex flex-col gap-4">
      <div role="img" aria-label={`Clientes por segmento: ${datos.map((d) => `${ETIQUETA_SEGMENTO[d.segmento]} ${d.clientes}`).join(", ")}.`} className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
        {datos
          .filter((d) => d.clientes > 0)
          .map((d) => (
            <span key={d.segmento} className={COLOR_SEGMENTO[d.segmento]} style={{ width: `${(d.clientes / total) * 100}%` }} />
          ))}
      </div>
      <ul className="grid gap-2 min-[480px]:grid-cols-2">
        {datos.map((d) => (
          <li key={d.segmento} className="flex items-center justify-between gap-3 rounded-lg bg-canvas px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-sm ${COLOR_SEGMENTO[d.segmento]}`} aria-hidden="true" />
              {ETIQUETA_SEGMENTO[d.segmento]}
            </span>
            <span className="font-semibold tabular-nums">
              {entero.format(d.clientes)} <span className="font-normal text-muted-foreground">({Math.round((d.clientes / total) * 100)} %)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanelVentas({ resumen, usuario }: { resumen: ResumenInicio; usuario: UsuarioSesion }) {
  if (resumen.ventas6Meses) {
    const hay = resumen.ventas6Meses.some((m) => m.pedidos > 0);
    return (
      <Card className="entra lg:col-span-2" style={{ ["--d" as string]: "80ms" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
            Pedidos de los últimos 6 meses
          </CardTitle>
          <p className="text-sm text-muted-foreground">Monto y margen mensual de los pedidos no anulados.</p>
        </CardHeader>
        <CardContent>
          {hay ? (
            <GraficoVentas datos={resumen.ventas6Meses} />
          ) : (
            <EstadoVacio
              icono={ShoppingCart}
              texto="Todavía no hay pedidos en los últimos 6 meses. Cuando registres uno, verás aquí cómo evolucionan las ventas y el margen."
              accion={can(usuario, "crear", "pedido") ? { href: "/pedidos/nuevo", etiqueta: "Registrar pedido" } : undefined}
            />
          )}
        </CardContent>
      </Card>
    );
  }
  if (resumen.segmentos) {
    return (
      <Card className="entra lg:col-span-2" style={{ ["--d" as string]: "80ms" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
            Clientes por segmento
          </CardTitle>
          <p className="text-sm text-muted-foreground">Cómo se reparte la cartera según el margen de los últimos 12 meses.</p>
        </CardHeader>
        <CardContent>
          <DistribucionSegmentos datos={resumen.segmentos} />
        </CardContent>
      </Card>
    );
  }
  return null;
}

function PanelRiesgo({ resumen }: { resumen: ResumenInicio }) {
  if (!resumen.riesgoTop) return null;
  const lista = resumen.riesgoTop;
  return (
    <Card className="entra" style={{ ["--d" as string]: "120ms" }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
          Clientes por recuperar
        </CardTitle>
        <p className="text-sm text-muted-foreground">Llevan más tiempo sin comprar de lo que acostumbran.</p>
      </CardHeader>
      <CardContent>
        {lista.length === 0 ? (
          <EstadoVacio icono={CheckCircle2} texto="Ningún cliente está en riesgo ahora. Revisa la cartera para anticipar nuevas ventas." accion={{ href: "/clientes", etiqueta: "Ver clientes" }} />
        ) : (
          <>
            <ul className="divide-y divide-border/70">
              {lista.map((c) => (
                <li key={c.id} className="flex flex-col gap-1 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/clientes/${c.id}`} className="min-w-0 truncate font-semibold text-primary hover:underline">
                      {c.razonSocial}
                    </Link>
                    <InsigniaSegmento segmento={c.segmento} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.diasSinCompra === null ? "Sin pedidos registrados" : `${entero.format(c.diasSinCompra)} días sin comprar`} · {c.vendedor}
                  </p>
                </li>
              ))}
            </ul>
            <Button asChild variant="secondary" className="mt-3">
              <Link href="/clientes/riesgo">Ver todos los clientes en riesgo</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PanelReciente({ resumen, usuario, ancho }: { resumen: ResumenInicio; usuario: UsuarioSesion; ancho: boolean }) {
  if (!resumen.recientes) return null;
  const { items, origen } = resumen.recientes;
  return (
    <Card className={`entra ${ancho ? "lg:col-span-3" : ""}`} style={{ ["--d" as string]: "160ms" }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" aria-hidden="true" />
          Actividad reciente
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {origen === "auditoria" ? "Últimos cambios registrados en el sistema." : "Lo último que se movió con tus clientes."}
        </p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EstadoVacio
            icono={History}
            texto="Todavía no hay actividad registrada. Anota visitas, llamadas y mensajes para ver aquí el historial."
            accion={can(usuario, "crear", "actividad") ? { href: "/actividades/nueva", etiqueta: "Registrar actividad" } : undefined}
          />
        ) : (
          <ol className="relative flex flex-col gap-3 border-l border-border pl-4">
            {items.map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary" aria-hidden="true" />
                <p className="text-sm font-semibold">{m.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  {m.href ? (
                    <Link href={m.href} className="text-primary hover:underline">
                      {m.detalle}
                    </Link>
                  ) : (
                    m.detalle
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={m.fecha.toISOString()}>{formatoFechaHora(m.fecha)}</time>
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default async function PaginaInicio({ searchParams }: { searchParams: Promise<{ registrada?: string }> }) {
  const usuario = await requerir("ver", "politica_privacidad");
  const { registrada } = await searchParams;
  const aviso = REGISTRADA[registrada as keyof typeof REGISTRADA];
  const registraActividades = can(usuario, "crear", "actividad");
  const atiendeCasos = can(usuario, "resolver", "caso");
  const ahora = new Date();
  const resumen = await cargarResumenInicio(usuario, ahora);
  const nombre = usuario.nombre.split(/\s+/)[0];
  const hayTrabajo = registraActividades || atiendeCasos;

  const secundarias: { href: string; etiqueta: string; icono: React.ComponentType<{ className?: string }> }[] = [];
  if (can(usuario, "crear", "cliente")) secundarias.push({ href: "/clientes/nuevo", etiqueta: "Nuevo cliente", icono: FilePlus2 });
  if (can(usuario, "crear", "pedido")) secundarias.push({ href: "/pedidos/nuevo", etiqueta: "Nuevo pedido", icono: ShoppingCart });
  if (can(usuario, "crear", "caso")) secundarias.push({ href: "/casos/nuevo", etiqueta: "Nuevo caso", icono: Headset });
  if (resumen.clientes) secundarias.push({ href: "/clientes/riesgo", etiqueta: "Ver clientes en riesgo", icono: AlertTriangle });
  if (resumen.solicitudes) secundarias.push({ href: "/cumplimiento", etiqueta: "Revisar solicitudes", icono: ShieldAlert });

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Mi día"
        sobretitulo={<span className="first-letter:uppercase">{fechaLarga.format(ahora)}</span>}
        descripcion={`${saludo(ahora)}, ${nombre}. ${SUBTITULO[usuario.rol]}`}
        className="entra"
      />
      {aviso ? (
        <p role="status" className="rounded-lg border border-success bg-success/10 p-3 font-semibold text-success">
          {aviso}
        </p>
      ) : null}
      {registraActividades || secundarias.length > 0 ? (
        <div className="no-imprimir flex flex-wrap gap-2" aria-label="Acciones rápidas" role="group">
          {registraActividades ? (
            <>
              <Button asChild className="min-h-12 text-base sm:min-h-11 sm:text-sm">
                <Link href="/actividades/nueva?tipo=VISITA">
                  <MapPinned className="h-4 w-4" aria-hidden="true" />
                  Registrar visita
                </Link>
              </Button>
              <Button asChild variant="secondary" className="min-h-12 text-base sm:min-h-11 sm:text-sm">
                <Link href="/actividades/nueva?tipo=TAREA">
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                  Nueva tarea
                </Link>
              </Button>
            </>
          ) : null}
          {secundarias.map((a) => (
            <Button key={a.href} asChild variant="secondary" className="min-h-11">
              <Link href={a.href}>
                <a.icono className="h-4 w-4" aria-hidden="true" />
                {a.etiqueta}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}

      <Indicadores resumen={resumen} usuario={usuario} />

      {resumen.ventas6Meses || resumen.segmentos || resumen.riesgoTop ? (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-3">
          <PanelVentas resumen={resumen} usuario={usuario} />
          <div className={resumen.ventas6Meses || resumen.segmentos ? "" : "lg:col-span-3"}>
            <PanelRiesgo resumen={resumen} />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-3">
        {hayTrabajo ? (
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            {registraActividades ? <SeccionTareas usuario={usuario} /> : null}
            {atiendeCasos ? <SeccionCasos usuario={usuario} /> : null}
          </div>
        ) : null}
        <PanelReciente resumen={resumen} usuario={usuario} ancho={!hayTrabajo} />
      </div>
    </div>
  );
}
