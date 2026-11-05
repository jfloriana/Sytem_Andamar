import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dentroDeSla, estadoEfectivo, horasEntre, tiempoResolucionHoras, tiempoRespuestaHoras } from "@/domain/sla";
import {
  ETIQUETA_ESTADO_CASO,
  ETIQUETA_PRIORIDAD,
  VARIANTE_ESTADO_CASO,
  VARIANTE_PRIORIDAD,
  formatoFechaHora,
  formatoHoras,
} from "@/lib/formato";
import { can } from "@/lib/permisos";
import { requerir } from "@/lib/sesion";
import { casoAutorizado, recursoCaso, responsablesAsignables } from "@/lib/servicio";
import { AccionesCaso } from "../acciones-caso";

export const metadata: Metadata = { title: "Caso" };
export const dynamic = "force-dynamic";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="break-words">{valor || "-"}</dd>
    </div>
  );
}

export default async function FichaCaso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requerir("ver", "caso");
  const caso = await casoAutorizado(usuario, id, "ver");
  const recurso = recursoCaso(caso);
  const ahora = new Date();
  const efectivo = estadoEfectivo(caso, ahora);
  const abierto = caso.estado !== "RESUELTO" && caso.estado !== "CERRADO";
  const cumplioPlazo = dentroDeSla(caso);
  const puedeReasignar = abierto && can(usuario, "asignar", recurso);
  const responsables = puedeReasignar ? await responsablesAsignables(usuario) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/casos" className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Casos
        </Link>
        <h1 className="break-words text-[28px] font-semibold leading-tight">{caso.titulo}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/clientes/${caso.cliente.id}`} className="font-semibold text-primary hover:underline">
            {caso.cliente.razonSocial}
          </Link>
          <Badge variant={VARIANTE_ESTADO_CASO[efectivo]}>{ETIQUETA_ESTADO_CASO[efectivo]}</Badge>
          <Badge variant={VARIANTE_PRIORIDAD[caso.prioridad]}>Prioridad {ETIQUETA_PRIORIDAD[caso.prioridad].toLowerCase()}</Badge>
        </p>
        {efectivo === "ESCALADO" && !caso.primeraRespuestaAt ? (
          <p role="status" className="mt-2 font-semibold text-destructive">
            Escalado: sin primera respuesta, vencido hace {formatoHoras(horasEntre(caso.fechaLimite, ahora))}.
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Descripción</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap break-words">{caso.descripcion}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plazo y tiempos</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Dato etiqueta="Responsable" valor={caso.responsable.nombre} />
            <Dato etiqueta="Apertura" valor={formatoFechaHora(caso.aperturaAt)} />
            <Dato etiqueta="Fecha límite (24 h)" valor={formatoFechaHora(caso.fechaLimite)} />
            <Dato etiqueta="Primera respuesta" valor={caso.primeraRespuestaAt ? formatoFechaHora(caso.primeraRespuestaAt) : "Sin responder"} />
            <Dato etiqueta="Tiempo de respuesta" valor={formatoHoras(tiempoRespuestaHoras(caso))} />
            <Dato
              etiqueta="Respuesta dentro del plazo"
              valor={cumplioPlazo === null ? "Aún sin respuesta" : cumplioPlazo ? <Badge variant="success">Sí</Badge> : <Badge variant="destructive">No</Badge>}
            />
            <Dato etiqueta="Resuelto" valor={caso.resueltoAt ? formatoFechaHora(caso.resueltoAt) : "No"} />
            <Dato etiqueta="Tiempo de resolución" valor={formatoHoras(tiempoResolucionHoras(caso))} />
            <Dato etiqueta="Resuelto en el primer contacto" valor={caso.resueltoAt ? (caso.resueltoPrimerContacto ? "Sí" : "No") : "-"} />
          </dl>
        </CardContent>
      </Card>

      {abierto || caso.estado === "RESUELTO" ? (
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <AccionesCaso
              casoId={caso.id}
              puedeResponder={abierto && !caso.primeraRespuestaAt && can(usuario, "editar", recurso)}
              puedeResolver={abierto && can(usuario, "resolver", recurso)}
              puedeCerrar={caso.estado === "RESUELTO" && can(usuario, "editar", recurso)}
              sinPrimeraRespuesta={!caso.primeraRespuestaAt}
              responsables={responsables}
              responsableActual={caso.responsableId}
              puedeReasignar={puedeReasignar}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
