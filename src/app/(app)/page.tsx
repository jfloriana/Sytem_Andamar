import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clasificarTareas, fechaTarea } from "@/domain/actividades";
import { estadoEfectivo } from "@/domain/sla";
import { ETIQUETA_ESTADO_CASO, ETIQUETA_PRIORIDAD, ETIQUETA_TIPO_ACTIVIDAD, VARIANTE_ESTADO_CASO, formatoFechaHora } from "@/lib/formato";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { ETIQUETA_ROL } from "@/lib/roles";
import { requerir, type UsuarioSesion } from "@/lib/sesion";
import { completarActividad } from "./actividades/actions";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

const MAX_TAREAS = 50;
const MAX_CASOS = 10;
const REGISTRADA = { VISITA: "Visita registrada.", LLAMADA: "Llamada registrada.", MENSAJE: "Mensaje registrado.", TAREA: "Tarea guardada." } as const;

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

function ListaTareas({ tareas, vencidas }: { tareas: Tarea[]; vencidas: boolean }) {
  return (
    <ul className="divide-y">
      {tareas.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
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
          <form action={completarActividad}>
            <input type="hidden" name="actividadId" value={t.id} />
            <Button type="submit" variant="secondary" aria-label={`Completar tarea de ${t.cliente.razonSocial}`}>
              Completar
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}

async function SeccionTareas({ usuario }: { usuario: UsuarioSesion }) {
  const { vencidas, pendientes } = await cargarTareas(usuario);
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Vencidas ({vencidas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {vencidas.length === 0 ? <p className="text-muted-foreground">No tienes tareas vencidas.</p> : <ListaTareas tareas={vencidas} vencidas />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pendientes ({pendientes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendientes.length === 0 ? (
            <p className="text-muted-foreground">No tienes tareas pendientes. Crea una con «Nueva tarea».</p>
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
    <Card>
      <CardHeader>
        <CardTitle>{supervisa ? "Casos abiertos del equipo" : "Mis casos abiertos"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm" role="status">
          {escalados > 0 ? <Badge variant="destructive">{escalados} escalados</Badge> : <Badge variant="success">Sin casos escalados</Badge>}
        </p>
        {filas.length === 0 ? (
          <p className="text-muted-foreground">No hay casos abiertos.</p>
        ) : (
          <ul className="divide-y">
            {filas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
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

export default async function PaginaInicio({ searchParams }: { searchParams: Promise<{ registrada?: string }> }) {
  const usuario = await requerir("ver", "politica_privacidad");
  const { registrada } = await searchParams;
  const aviso = REGISTRADA[registrada as keyof typeof REGISTRADA];
  const registraActividades = can(usuario, "crear", "actividad");
  const atiendeCasos = can(usuario, "resolver", "caso");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Mi día</h1>
      <p className="text-muted-foreground">
        Hola, {usuario.nombre}. Ingresaste como {ETIQUETA_ROL[usuario.rol]}.
      </p>
      {aviso ? (
        <p role="status" className="rounded border border-success bg-success/10 p-3 font-semibold text-success">
          {aviso}
        </p>
      ) : null}
      {registraActividades ? (
        <div className="no-imprimir grid gap-2 sm:flex sm:flex-wrap">
          <Button asChild className="min-h-12 text-base sm:min-h-11">
            <Link href="/actividades/nueva?tipo=VISITA">Registrar visita</Link>
          </Button>
          <Button asChild variant="secondary" className="min-h-12 text-base sm:min-h-11">
            <Link href="/actividades/nueva?tipo=TAREA">Nueva tarea</Link>
          </Button>
        </div>
      ) : null}
      {registraActividades ? <SeccionTareas usuario={usuario} /> : null}
      {atiendeCasos ? <SeccionCasos usuario={usuario} /> : null}
      {!registraActividades && !atiendeCasos ? (
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <p className="text-muted-foreground">Usa el menú para consultar los módulos disponibles para tu rol.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
