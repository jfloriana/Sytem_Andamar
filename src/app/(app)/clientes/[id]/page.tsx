import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { camposFaltantes } from "@/domain/calidad-datos";
import { construirLineaTiempo, type EventoTiempo } from "@/domain/linea-tiempo";
import { estadoEfectivo } from "@/domain/sla";
import { clienteAutorizado, recursoCliente } from "@/lib/clientes";
import {
  ETIQUETA_ESTADO_CASO,
  ETIQUETA_ESTADO_CLIENTE,
  ETIQUETA_ESTADO_PEDIDO,
  ETIQUETA_ETAPA,
  ETIQUETA_PRIORIDAD,
  ETIQUETA_SEGMENTO,
  ETIQUETA_TIPO_ACTIVIDAD,
  VARIANTE_ESTADO_CASO,
  VARIANTE_ESTADO_CLIENTE,
  VARIANTE_ESTADO_PEDIDO,
  formatoDinero,
  formatoFecha,
  formatoFechaHora,
} from "@/lib/formato";
import { can } from "@/lib/permisos";
import { resumenPedidosCliente } from "@/lib/pedidos";
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

interface ItemLista {
  id: string;
  titulo: string;
  detalle: string;
  fecha: Date;
  href?: string;
  insignia?: { texto: string; variante: "default" | "success" | "warning" | "destructive" };
}

function Lista({ items }: { items: ItemLista[] }) {
  return (
    <ul className="divide-y">
      {items.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
          <span className="min-w-0 font-semibold">
            {i.href ? (
              <Link href={i.href} className="text-primary hover:underline">
                {i.titulo}
              </Link>
            ) : (
              i.titulo
            )}
          </span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {i.detalle}
            {i.insignia ? <Badge variant={i.insignia.variante}>{i.insignia.texto}</Badge> : null}
          </span>
          <time className="w-full text-xs text-muted-foreground" dateTime={i.fecha.toISOString()}>
            {formatoFechaHora(i.fecha)}
          </time>
        </li>
      ))}
    </ul>
  );
}

function Acciones({ children }: { children: React.ReactNode }) {
  return <div className="no-imprimir mb-3 flex flex-wrap gap-2">{children}</div>;
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
  const [resumen, contactos, pedidos, oportunidades, actividades, casos, consentimientos] = await Promise.all([
    permisos.pedidos ? resumenPedidosCliente(cliente.id) : null,
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
  const ahora = new Date();
  const activo = cliente.estado !== "INACTIVO";
  const puedeCrear = (tipo: "pedido" | "oportunidad" | "actividad") => activo && can(usuario, "crear", { ...dueno, tipo });
  const puedeEditarContactos = can(usuario, "editar", recursoCliente(cliente, "contacto"));

  const eventos: EventoTiempo[] = [
    ...pedidos.map((p) => ({ tipo: "pedido" as const, id: p.id, fecha: p.fecha, titulo: `Pedido ${formatoDinero(p.monto.toString())}`, detalle: ETIQUETA_ESTADO_PEDIDO[p.estado] })),
    ...oportunidades.map((o) => ({ tipo: "oportunidad" as const, id: o.id, fecha: o.createdAt, titulo: `Oportunidad: ${o.titulo}`, detalle: ETIQUETA_ETAPA[o.etapa] })),
    ...actividades.map((a) => ({ tipo: "actividad" as const, id: a.id, fecha: a.fecha, titulo: ETIQUETA_TIPO_ACTIVIDAD[a.tipo], detalle: a.resultado ?? undefined })),
    ...casos.map((c) => ({ tipo: "caso" as const, id: c.id, fecha: c.aperturaAt, titulo: `Caso: ${c.titulo}`, detalle: ETIQUETA_ESTADO_CASO[estadoEfectivo(c, ahora)] })),
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
          {resumen ? (
            <Dato
              etiqueta="Último pedido"
              valor={resumen.ultimoPedidoAt ? formatoFecha(resumen.ultimoPedidoAt) : "Sin pedidos"}
            />
          ) : null}
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
        ) : (
          <>
            {puedeCrear("pedido") ? (
              <Acciones>
                <Button asChild variant="secondary">
                  <Link href={`/pedidos/nuevo?clienteId=${cliente.id}`}>Registrar pedido</Link>
                </Button>
              </Acciones>
            ) : null}
            {resumen && resumen.cantidad > 0 ? (
              <p className="mb-2 text-sm text-muted-foreground">
                {resumen.cantidad} {resumen.cantidad === 1 ? "pedido" : "pedidos"} · monto {formatoDinero(resumen.monto)} · margen{" "}
                {formatoDinero(resumen.margen)} (sin pedidos anulados)
              </p>
            ) : null}
            {pedidos.length === 0 ? (
              <Vacio texto="Sin pedidos registrados." />
            ) : (
              <Lista
                items={pedidos.map((p) => ({
                  id: p.id,
                  titulo: formatoDinero(p.monto.toString()),
                  detalle: `Margen ${formatoDinero(p.margen.toString())}`,
                  fecha: p.fecha,
                  insignia: { texto: ETIQUETA_ESTADO_PEDIDO[p.estado], variante: VARIANTE_ESTADO_PEDIDO[p.estado] },
                }))}
              />
            )}
          </>
        )}
      </Seccion>

      <Seccion titulo="Oportunidades">
        {!permisos.oportunidades ? (
          <Vacio texto="Tu rol no tiene acceso a las oportunidades." />
        ) : (
          <>
            {puedeCrear("oportunidad") ? (
              <Acciones>
                <Button asChild variant="secondary">
                  <Link href={`/oportunidades/nueva?clienteId=${cliente.id}`}>Nueva oportunidad</Link>
                </Button>
              </Acciones>
            ) : null}
            {oportunidades.length === 0 ? (
              <Vacio texto="Sin oportunidades registradas." />
            ) : (
              <Lista
                items={oportunidades.map((o) => ({
                  id: o.id,
                  titulo: o.titulo,
                  detalle: formatoDinero(o.montoEstimado.toString()),
                  fecha: o.createdAt,
                  href: `/oportunidades/${o.id}`,
                  insignia: { texto: ETIQUETA_ETAPA[o.etapa], variante: o.etapa === "GANADA" ? "success" : o.etapa === "PERDIDA" ? "destructive" : "default" },
                }))}
              />
            )}
          </>
        )}
      </Seccion>

      <Seccion titulo="Actividades">
        {!permisos.actividades ? (
          <Vacio texto="Tu rol no tiene acceso a las actividades." />
        ) : (
          <>
            {puedeCrear("actividad") ? (
              <Acciones>
                <Button asChild variant="secondary">
                  <Link href={`/actividades/nueva?tipo=VISITA&clienteId=${cliente.id}`}>Registrar visita</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={`/actividades/nueva?tipo=TAREA&clienteId=${cliente.id}`}>Nueva tarea</Link>
                </Button>
              </Acciones>
            ) : null}
            {actividades.length === 0 ? (
              <Vacio texto="Sin actividades registradas." />
            ) : (
              <Lista
                items={actividades.map((a) => ({
                  id: a.id,
                  titulo: ETIQUETA_TIPO_ACTIVIDAD[a.tipo],
                  detalle: a.resultado ?? (a.completada ? "Completada" : "Pendiente"),
                  fecha: a.fecha,
                  insignia: a.completada ? undefined : { texto: "Pendiente", variante: "warning" },
                }))}
              />
            )}
          </>
        )}
      </Seccion>

      <Seccion titulo="Casos">
        {!permisos.casos ? (
          <Vacio texto="Tu rol no tiene acceso a los casos." />
        ) : (
          <>
            {activo && can(usuario, "crear", "caso") ? (
              <Acciones>
                <Button asChild variant="secondary">
                  <Link href={`/casos/nuevo?clienteId=${cliente.id}`}>Nuevo caso</Link>
                </Button>
              </Acciones>
            ) : null}
            {casos.length === 0 ? (
              <Vacio texto="Sin casos de servicio." />
            ) : (
              <Lista
                items={casos.map((c) => {
                  const efectivo = estadoEfectivo(c, ahora);
                  return {
                    id: c.id,
                    titulo: c.titulo,
                    detalle: ETIQUETA_PRIORIDAD[c.prioridad],
                    fecha: c.aperturaAt,
                    href: can(usuario, "ver", { tipo: "caso", propietarioId: c.responsableId }) ? `/casos/${c.id}` : undefined,
                    insignia: { texto: ETIQUETA_ESTADO_CASO[efectivo], variante: VARIANTE_ESTADO_CASO[efectivo] },
                  };
                })}
              />
            )}
          </>
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
