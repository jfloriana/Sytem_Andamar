import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { camposFaltantes } from "@/domain/calidad-datos";
import { construirLineaTiempo, type EventoTiempo } from "@/domain/linea-tiempo";
import { clienteAutorizado, recursoCliente } from "@/lib/clientes";
import {
  ETIQUETA_ESTADO_CLIENTE,
  ETIQUETA_SEGMENTO,
  VARIANTE_ESTADO_CLIENTE,
  formatoDinero,
  formatoFecha,
  formatoFechaHora,
} from "@/lib/formato";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { BotonEstadoCliente } from "./boton-estado";
import { ContactosCliente } from "./contactos";

export const metadata: Metadata = { title: "Ficha de cliente" };
export const dynamic = "force-dynamic";

const LIMITE = 20;

function Vacio({ texto }: { texto: string }) {
  return <p className="text-muted-foreground">{texto}</p>;
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="break-words">{valor || "-"}</dd>
    </div>
  );
}

function Lista({ items }: { items: { id: string; titulo: string; detalle: string; fecha: Date }[] }) {
  return (
    <ul className="divide-y">
      {items.map((i) => (
        <li key={i.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
          <span className="min-w-0 font-semibold">{i.titulo}</span>
          <span className="text-sm text-muted-foreground">{i.detalle}</span>
          <time className="w-full text-xs text-muted-foreground" dateTime={i.fecha.toISOString()}>
            {formatoFechaHora(i.fecha)}
          </time>
        </li>
      ))}
    </ul>
  );
}

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requerir("ver", "cliente");
  const cliente = await clienteAutorizado(usuario, id, "ver");
  const dueno = recursoCliente(cliente);
  // Pedidos, oportunidades y actividades siguen la cartera del cliente. Casos y consentimientos se
  // consultan por rol (el servicio ve el historial del cliente en solo lectura).
  const ver = (tipo: "pedido" | "oportunidad" | "actividad") => can(usuario, "ver", { ...dueno, tipo });
  const permisos = {
    pedidos: ver("pedido"),
    oportunidades: ver("oportunidad"),
    actividades: ver("actividad"),
    casos: can(usuario, "ver", "caso"),
    consentimientos: can(usuario, "ver", "consentimiento"),
  };
  const where = { clienteId: cliente.id };
  const [contactos, pedidos, oportunidades, actividades, casos, consentimientos] = await Promise.all([
    prisma.contacto.findMany({ where, orderBy: [{ principal: "desc" }, { nombre: "asc" }] }),
    permisos.pedidos ? prisma.pedido.findMany({ where, orderBy: { fecha: "desc" }, take: LIMITE }) : [],
    permisos.oportunidades ? prisma.oportunidad.findMany({ where, orderBy: { createdAt: "desc" }, take: LIMITE }) : [],
    permisos.actividades ? prisma.actividad.findMany({ where, orderBy: { fecha: "desc" }, take: LIMITE }) : [],
    permisos.casos ? prisma.caso.findMany({ where, orderBy: { aperturaAt: "desc" }, take: LIMITE }) : [],
    permisos.consentimientos ? prisma.consentimiento.findMany({ where, orderBy: { otorgadoAt: "desc" }, take: LIMITE }) : [],
  ]);

  const principal = contactos.find((c) => c.principal) ?? null;
  const faltan = camposFaltantes({ ...cliente, contactoPrincipal: principal });
  const puedeEditar = can(usuario, "editar", dueno);
  const puedeEditarContactos = can(usuario, "editar", recursoCliente(cliente, "contacto"));

  const eventos: EventoTiempo[] = [
    ...pedidos.map((p) => ({ tipo: "pedido" as const, id: p.id, fecha: p.fecha, titulo: `Pedido ${formatoDinero(p.monto.toString())}`, detalle: p.estado })),
    ...oportunidades.map((o) => ({ tipo: "oportunidad" as const, id: o.id, fecha: o.createdAt, titulo: `Oportunidad: ${o.titulo}`, detalle: o.etapa })),
    ...actividades.map((a) => ({ tipo: "actividad" as const, id: a.id, fecha: a.fecha, titulo: `${a.tipo}`, detalle: a.resultado ?? undefined })),
    ...casos.map((c) => ({ tipo: "caso" as const, id: c.id, fecha: c.aperturaAt, titulo: `Caso: ${c.titulo}`, detalle: c.estado })),
    ...consentimientos.map((c) => ({ tipo: "consentimiento" as const, id: c.id, fecha: c.otorgadoAt, titulo: `Consentimiento ${c.finalidad}`, detalle: c.canal })),
  ];
  const lineaTiempo = construirLineaTiempo(eventos);
  const ETIQUETA_EVENTO = { pedido: "Pedido", oportunidad: "Oportunidad", actividad: "Actividad", caso: "Caso", consentimiento: "Consentimiento" };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/clientes" className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Clientes
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-[28px] font-semibold leading-tight">{cliente.razonSocial}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Documento {cliente.documento}</span>
              <Badge variant={VARIANTE_ESTADO_CLIENTE[cliente.estado]}>{ETIQUETA_ESTADO_CLIENTE[cliente.estado]}</Badge>
              <Badge>{ETIQUETA_SEGMENTO[cliente.segmento]}</Badge>
            </p>
          </div>
          {puedeEditar ? (
            <div className="no-imprimir flex flex-wrap items-start gap-2">
              <Button asChild variant="secondary">
                <Link href={`/clientes/${cliente.id}/editar`}>Editar</Link>
              </Button>
              <BotonEstadoCliente clienteId={cliente.id} inactivo={cliente.estado === "INACTIVO"} nombre={cliente.razonSocial} />
            </div>
          ) : null}
        </div>
      </div>

      <Seccion titulo="Datos">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Dato etiqueta="Dirección" valor={cliente.direccion} />
          <Dato etiqueta="Teléfono" valor={cliente.telefono} />
          <Dato etiqueta="Correo" valor={cliente.email} />
          <Dato etiqueta="Vendedor" valor={cliente.vendedor.nombre} />
          <Dato etiqueta="Condiciones especiales" valor={cliente.condicionesEspeciales} />
          <Dato
            etiqueta="Calidad de datos"
            valor={
              faltan.length === 0 ? (
                <Badge variant="success">Datos completos</Badge>
              ) : (
                <span>
                  <Badge variant="warning">Incompleto</Badge> <span className="text-sm">Falta: {faltan.join(", ")}.</span>
                </span>
              )
            }
          />
        </dl>
      </Seccion>

      <Seccion titulo="Contactos">
        <ContactosCliente
          clienteId={cliente.id}
          puedeEditar={puedeEditarContactos}
          contactos={contactos.map((c) => ({ id: c.id, nombre: c.nombre, cargo: c.cargo, telefono: c.telefono, email: c.email, principal: c.principal }))}
        />
      </Seccion>

      <Seccion titulo="Pedidos">
        {!permisos.pedidos ? (
          <Vacio texto="Tu rol no tiene acceso a los pedidos." />
        ) : pedidos.length === 0 ? (
          <Vacio texto="Sin pedidos registrados." />
        ) : (
          <Lista items={pedidos.map((p) => ({ id: p.id, titulo: formatoDinero(p.monto.toString()), detalle: `Margen ${formatoDinero(p.margen.toString())} · ${p.estado}`, fecha: p.fecha }))} />
        )}
      </Seccion>

      <Seccion titulo="Oportunidades">
        {!permisos.oportunidades ? (
          <Vacio texto="Tu rol no tiene acceso a las oportunidades." />
        ) : oportunidades.length === 0 ? (
          <Vacio texto="Sin oportunidades registradas." />
        ) : (
          <Lista items={oportunidades.map((o) => ({ id: o.id, titulo: o.titulo, detalle: `${o.etapa} · ${formatoDinero(o.montoEstimado.toString())}`, fecha: o.createdAt }))} />
        )}
      </Seccion>

      <Seccion titulo="Actividades">
        {!permisos.actividades ? (
          <Vacio texto="Tu rol no tiene acceso a las actividades." />
        ) : actividades.length === 0 ? (
          <Vacio texto="Sin actividades registradas." />
        ) : (
          <Lista items={actividades.map((a) => ({ id: a.id, titulo: a.tipo, detalle: a.resultado ?? (a.completada ? "Completada" : "Pendiente"), fecha: a.fecha }))} />
        )}
      </Seccion>

      <Seccion titulo="Casos">
        {!permisos.casos ? (
          <Vacio texto="Tu rol no tiene acceso a los casos." />
        ) : casos.length === 0 ? (
          <Vacio texto="Sin casos de servicio." />
        ) : (
          <Lista items={casos.map((c) => ({ id: c.id, titulo: c.titulo, detalle: `${c.prioridad} · ${c.estado}`, fecha: c.aperturaAt }))} />
        )}
      </Seccion>

      <Seccion titulo="Consentimientos">
        {!permisos.consentimientos ? (
          <Vacio texto="Tu rol no tiene acceso a los consentimientos." />
        ) : consentimientos.length === 0 ? (
          <Vacio texto="Sin consentimientos registrados." />
        ) : (
          <ul className="divide-y">
            {consentimientos.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-semibold">
                  {c.finalidad} · {c.canal}
                </span>
                <span className="text-sm text-muted-foreground">
                  {c.retiradoAt ? `Retirado el ${formatoFecha(c.retiradoAt)}` : `Otorgado el ${formatoFecha(c.otorgadoAt)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Línea de tiempo">
        {lineaTiempo.length === 0 ? (
          <Vacio texto="Aún no hay actividad registrada para este cliente." />
        ) : (
          <ol className="divide-y">
            {lineaTiempo.map((e) => (
              <li key={`${e.tipo}-${e.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <Badge>{ETIQUETA_EVENTO[e.tipo]}</Badge>
                <span className="min-w-0 flex-1 font-semibold">{e.titulo}</span>
                <time className="text-xs text-muted-foreground" dateTime={e.fecha.toISOString()}>
                  {formatoFechaHora(e.fecha)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </Seccion>
    </div>
  );
}
