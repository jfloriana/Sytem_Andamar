import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { estaAnonimizado } from "@/domain/anonimizacion";
import { estadoDelPlazo } from "@/domain/solicitudes";
import {
  ETIQUETA_ESTADO_SOLICITUD,
  ETIQUETA_PLAZO,
  ETIQUETA_TIPO_SOLICITUD,
  VARIANTE_PLAZO,
  formatoFecha,
  formatoFechaHora,
} from "@/lib/formato";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { AccionesSolicitud, FormularioSupresion } from "../../formularios";

export const metadata: Metadata = { title: "Solicitud de titular" };
export const dynamic = "force-dynamic";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="break-words">{valor || "-"}</dd>
    </div>
  );
}

export default async function PaginaSolicitud({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requerir("ver", "solicitud_titular");
  const solicitud = await prisma.solicitudTitular.findUnique({
    where: { id },
    include: { cliente: { select: { id: true, razonSocial: true, documento: true, estado: true } } },
  });
  if (!solicitud) notFound();

  const plazo = estadoDelPlazo(solicitud, new Date());
  const abierta = solicitud.estado === "PENDIENTE" || solicitud.estado === "EN_PROCESO";
  const puedeEditar = can(usuario, "editar", "solicitud_titular");
  const anonimizado = estaAnonimizado(solicitud.cliente.documento);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cumplimiento" className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Cumplimiento
        </Link>
        <h1 className="break-words text-[28px] font-semibold leading-tight">
          Solicitud de {ETIQUETA_TIPO_SOLICITUD[solicitud.tipo].toLowerCase()}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{ETIQUETA_ESTADO_SOLICITUD[solicitud.estado]}</span>
          <Badge variant={VARIANTE_PLAZO[plazo.estado]}>{ETIQUETA_PLAZO[plazo.estado]}</Badge>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la solicitud</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Dato
              etiqueta="Titular (cliente)"
              valor={
                <Link href={`/clientes/${solicitud.cliente.id}`} className="font-semibold text-primary hover:underline">
                  {solicitud.cliente.razonSocial}
                </Link>
              }
            />
            <Dato etiqueta="Documento" valor={solicitud.cliente.documento} />
            <Dato etiqueta="Solicitada" valor={formatoFechaHora(solicitud.solicitadaAt)} />
            <Dato etiqueta="Vence" valor={formatoFecha(plazo.fechaLimite)} />
            <Dato etiqueta="Atendida" valor={solicitud.atendidaAt ? formatoFechaHora(solicitud.atendidaAt) : null} />
            <Dato etiqueta="Lo que pide el titular" valor={solicitud.detalle} />
            <Dato etiqueta="Respuesta o motivo" valor={solicitud.resolucion} />
          </dl>
        </CardContent>
      </Card>

      {solicitud.tipo === "ACCESO" ? (
        <Card>
          <CardHeader>
            <CardTitle>Entrega de datos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Descarga los datos que Andamar guarda del titular (ficha, contactos, consentimientos y cantidad de registros). La descarga queda en la auditoría.
            </p>
            <div>
              <Button asChild variant="secondary">
                <a href={`/cumplimiento/solicitudes/${solicitud.id}/exportar`} download>
                  Descargar datos del titular (JSON)
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {solicitud.tipo === "RECTIFICACION" && abierta ? (
        <Card>
          <CardHeader>
            <CardTitle>Rectificación</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Corrige los datos en la ficha del cliente y luego marca la solicitud como atendida.</p>
            <div>
              <Button asChild variant="secondary">
                <Link href={`/clientes/${solicitud.cliente.id}/editar`}>Editar datos del cliente</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {abierta && puedeEditar ? (
        <Card>
          <CardHeader>
            <CardTitle>{solicitud.tipo === "SUPRESION" ? "Atender la supresión" : "Atender la solicitud"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {solicitud.tipo === "SUPRESION" && !anonimizado ? <FormularioSupresion solicitudId={solicitud.id} /> : null}
            <AccionesSolicitud solicitudId={solicitud.id} puedeAtender={solicitud.tipo !== "SUPRESION"} enProceso={solicitud.estado === "EN_PROCESO"} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
