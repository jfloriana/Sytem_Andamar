import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CUMPLIMIENTO } from "@/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { estadoDelPlazo } from "@/domain/solicitudes";
import {
  ETIQUETA_ESTADO_SOLICITUD,
  ETIQUETA_PLAZO,
  ETIQUETA_TIPO_SOLICITUD,
  VARIANTE_PLAZO,
  formatoFecha,
  formatoFechaHora,
} from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { filtroSolicitudesSchema } from "@/lib/validaciones/cumplimiento";
import { SubnavCumplimiento } from "./subnav";

export const metadata: Metadata = { title: "Cumplimiento" };
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function PaginaCumplimiento({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requerir("ver", "solicitud_titular");
  const crudos = await searchParams;
  const f = filtroSolicitudesSchema.parse({ estado: primero(crudos.estado), tipo: primero(crudos.tipo), pagina: primero(crudos.pagina) });
  const where: Prisma.SolicitudTitularWhereInput = { ...(f.estado ? { estado: f.estado } : {}), ...(f.tipo ? { tipo: f.tipo } : {}) };

  const [solicitudes, total, abiertas] = await Promise.all([
    prisma.solicitudTitular.findMany({
      where,
      orderBy: { solicitadaAt: "desc" },
      skip: (f.pagina - 1) * CUMPLIMIENTO.porPagina,
      take: CUMPLIMIENTO.porPagina,
      include: { cliente: { select: { id: true, razonSocial: true, documento: true } } },
    }),
    prisma.solicitudTitular.count({ where }),
    prisma.solicitudTitular.findMany({ where: { estado: { in: ["PENDIENTE", "EN_PROCESO"] } }, select: { tipo: true, estado: true, solicitadaAt: true, atendidaAt: true } }),
  ]);
  const ahora = new Date();
  const plazos = abiertas.map((s) => estadoDelPlazo(s, ahora).estado);
  const resumen = {
    abiertas: abiertas.length,
    porVencer: plazos.filter((p) => p === "POR_VENCER").length,
    vencidas: plazos.filter((p) => p === "VENCIDA").length,
  };

  const paginas = Math.max(1, Math.ceil(total / CUMPLIMIENTO.porPagina));
  const enlace = (pagina: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, pagina })) if (v) q.set(k, String(v));
    return `/cumplimiento?${q.toString()}`;
  };
  const puedeCrear = usuario.rol === "ADMIN";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-[28px] font-semibold leading-tight">Cumplimiento</h1>
        {puedeCrear ? (
          <Button asChild>
            <Link href="/cumplimiento/solicitudes/nueva">Nueva solicitud</Link>
          </Button>
        ) : null}
      </div>
      <SubnavCumplimiento actual="/cumplimiento" />

      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          ["Solicitudes abiertas", resumen.abiertas],
          ["Por vencer (48 h o menos)", resumen.porVencer],
          ["Vencidas", resumen.vencidas],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded border p-4">
            <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Plazos: acceso {CUMPLIMIENTO.plazoDiasHabiles.ACCESO} días hábiles; rectificación y supresión {CUMPLIMIENTO.plazoDiasHabiles.SUPRESION} (supuesto documentado en{" "}
        <code>docs/PRIVACIDAD.md</code>; no sustituye asesoría legal).
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de titulares ({total})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="tipo">Tipo</Label>
              <Select id="tipo" name="tipo" defaultValue={f.tipo ?? ""}>
                <option value="">Todos</option>
                {(["ACCESO", "RECTIFICACION", "SUPRESION"] as const).map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETA_TIPO_SOLICITUD[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="estado">Estado</Label>
              <Select id="estado" name="estado" defaultValue={f.estado ?? ""}>
                <option value="">Todos</option>
                {(["PENDIENTE", "EN_PROCESO", "ATENDIDA", "RECHAZADA"] as const).map((e) => (
                  <option key={e} value={e}>
                    {ETIQUETA_ESTADO_SOLICITUD[e]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Filtrar</Button>
            <Button asChild variant="secondary">
              <Link href="/cumplimiento">Limpiar</Link>
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Solicitada</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Plazo</TableHead>
                <TableHead>Vence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitudes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No hay solicitudes para estos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                solicitudes.map((s) => {
                  const plazo = estadoDelPlazo(s, ahora);
                  return (
                    <TableRow key={s.id}>
                      <TableCell etiqueta="Solicitada" className="whitespace-nowrap">
                        {formatoFechaHora(s.solicitadaAt)}
                      </TableCell>
                      <TableCell etiqueta="Cliente">
                        <Link href={`/cumplimiento/solicitudes/${s.id}`} className="font-semibold text-primary hover:underline">
                          {s.cliente.razonSocial}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{s.cliente.documento}</span>
                      </TableCell>
                      <TableCell etiqueta="Tipo">{ETIQUETA_TIPO_SOLICITUD[s.tipo]}</TableCell>
                      <TableCell etiqueta="Estado">{ETIQUETA_ESTADO_SOLICITUD[s.estado]}</TableCell>
                      <TableCell etiqueta="Plazo">
                        <Badge variant={VARIANTE_PLAZO[plazo.estado]}>{ETIQUETA_PLAZO[plazo.estado]}</Badge>
                      </TableCell>
                      <TableCell etiqueta="Vence" className="whitespace-nowrap">
                        {formatoFecha(plazo.fechaLimite)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <nav aria-label="Paginación" className="flex items-center justify-between gap-2 text-sm">
            {f.pagina > 1 ? (
              <Link className="font-semibold text-primary hover:underline" href={enlace(f.pagina - 1)}>
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <span>
              Página {f.pagina} de {paginas}
            </span>
            {f.pagina < paginas ? (
              <Link className="font-semibold text-primary hover:underline" href={enlace(f.pagina + 1)}>
                Siguiente
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </CardContent>
      </Card>
    </div>
  );
}
