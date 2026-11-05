import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { etapasDestino } from "@/domain/oportunidades";
import { oportunidadAutorizada, recursoVendedor } from "@/lib/comercial";
import { ETIQUETA_ETAPA, ETIQUETA_TIPO_ACTIVIDAD, formatoDinero, formatoFecha, formatoFechaHora } from "@/lib/formato";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { MoverEtapa } from "../mover-etapa";

export const metadata: Metadata = { title: "Oportunidad" };
export const dynamic = "force-dynamic";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="break-words">{valor || "-"}</dd>
    </div>
  );
}

export default async function FichaOportunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requerir("ver", "oportunidad");
  const o = await oportunidadAutorizada(usuario, id, "ver");
  const recurso = recursoVendedor("oportunidad", o);
  const puedeEditar = can(usuario, "editar", recurso);

  const actividades = await prisma.actividad.findMany({
    where: { oportunidadId: o.id },
    orderBy: { fecha: "desc" },
    take: 20,
    include: { usuario: { select: { nombre: true } } },
  });
  const desdeCambio = actividades.filter((a) => a.createdAt >= o.etapaCambiadaAt).length;
  const cerrada = o.etapa === "GANADA" || o.etapa === "PERDIDA";
  const destinos = etapasDestino(o.etapa).map((valor) => ({ valor, etiqueta: ETIQUETA_ETAPA[valor] }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/oportunidades" className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Oportunidades
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-[28px] font-semibold leading-tight">{o.titulo}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link href={`/clientes/${o.cliente.id}`} className="font-semibold text-primary hover:underline">
                {o.cliente.razonSocial}
              </Link>
              <Badge variant={o.etapa === "GANADA" ? "success" : o.etapa === "PERDIDA" ? "destructive" : "default"}>{ETIQUETA_ETAPA[o.etapa]}</Badge>
            </p>
          </div>
          {puedeEditar ? (
            <div className="no-imprimir flex flex-wrap items-start gap-2">
              <MoverEtapa oportunidadId={o.id} titulo={o.titulo} destinos={destinos} />
              <Button asChild variant="secondary">
                <Link href={`/oportunidades/${o.id}/editar`}>Editar</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Dato etiqueta="Monto estimado" valor={formatoDinero(o.montoEstimado.toString())} />
            <Dato etiqueta="Vendedor" valor={o.vendedor.nombre} />
            <Dato etiqueta="Creada" valor={formatoFecha(o.createdAt)} />
            <Dato etiqueta="Último cambio de etapa" valor={formatoFechaHora(o.etapaCambiadaAt)} />
            {o.cerradaAt ? <Dato etiqueta="Cerrada" valor={formatoFecha(o.cerradaAt)} /> : null}
            {o.motivoPerdida ? <Dato etiqueta="Motivo de la pérdida" valor={o.motivoPerdida} /> : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actividades</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!cerrada ? (
            <p className="text-sm" role="status">
              {desdeCambio > 0 ? (
                <Badge variant="success">Puede avanzar</Badge>
              ) : (
                <Badge variant="warning">Necesita actividad</Badge>
              )}{" "}
              {desdeCambio > 0
                ? `${desdeCambio} ${desdeCambio === 1 ? "actividad registrada" : "actividades registradas"} desde el último cambio de etapa.`
                : "Registra una actividad antes de avanzar a la siguiente etapa."}
            </p>
          ) : null}
          {puedeEditar && !cerrada ? (
            <div className="no-imprimir">
              <Button asChild variant="secondary">
                <Link href={`/actividades/nueva?clienteId=${o.cliente.id}&oportunidadId=${o.id}&tipo=LLAMADA`}>Registrar actividad</Link>
              </Button>
            </div>
          ) : null}
          {actividades.length === 0 ? (
            <p className="text-muted-foreground">Aún no hay actividades vinculadas a esta oportunidad.</p>
          ) : (
            <ul className="divide-y">
              {actividades.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                  <span className="font-semibold">{ETIQUETA_TIPO_ACTIVIDAD[a.tipo]}</span>
                  <span className="text-sm text-muted-foreground">{a.resultado ?? (a.completada ? "Completada" : "Pendiente")}</span>
                  <time className="w-full text-xs text-muted-foreground" dateTime={a.fecha.toISOString()}>
                    {formatoFechaHora(a.fecha)} · {a.usuario.nombre}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {can(usuario, "crear", "pedido") && o.etapa === "GANADA" ? (
        <div className="no-imprimir">
          <Button asChild>
            <Link href={`/pedidos/nuevo?clienteId=${o.cliente.id}&oportunidadId=${o.id}`}>Registrar pedido de esta venta</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
