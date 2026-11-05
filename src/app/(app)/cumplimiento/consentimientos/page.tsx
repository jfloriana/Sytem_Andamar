import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CUMPLIMIENTO } from "@/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ETIQUETA_CANAL, ETIQUETA_FINALIDAD, formatoFecha } from "@/lib/formato";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { filtroConsentimientosSchema } from "@/lib/validaciones/cumplimiento";
import { BotonRetirar } from "../formularios";
import { SubnavCumplimiento } from "../subnav";

export const metadata: Metadata = { title: "Consentimientos" };
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function PaginaConsentimientos({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requerir("ver", "consentimiento");
  await requerir("ver", "solicitud_titular");
  const crudos = await searchParams;
  const f = filtroConsentimientosSchema.parse({
    q: primero(crudos.q),
    finalidad: primero(crudos.finalidad),
    estado: primero(crudos.estado),
    pagina: primero(crudos.pagina),
  });
  const where: Prisma.ConsentimientoWhereInput = {
    ...(f.finalidad ? { finalidad: f.finalidad } : {}),
    ...(f.estado === "vigente" ? { retiradoAt: null } : f.estado === "retirado" ? { retiradoAt: { not: null } } : {}),
    ...(f.q
      ? { cliente: { OR: [{ razonSocial: { contains: f.q, mode: "insensitive" } }, { documento: { contains: f.q, mode: "insensitive" } }] } }
      : {}),
  };
  const [consentimientos, total] = await Promise.all([
    prisma.consentimiento.findMany({
      where,
      orderBy: [{ otorgadoAt: "desc" }, { id: "asc" }],
      skip: (f.pagina - 1) * CUMPLIMIENTO.porPagina,
      take: CUMPLIMIENTO.porPagina,
      include: { cliente: { select: { id: true, razonSocial: true, documento: true } } },
    }),
    prisma.consentimiento.count({ where }),
  ]);
  const puedeRetirar = can(usuario, "editar", "consentimiento");
  const paginas = Math.max(1, Math.ceil(total / CUMPLIMIENTO.porPagina));
  const enlace = (pagina: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, pagina })) if (v) q.set(k, String(v));
    return `/cumplimiento/consentimientos?${q.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Consentimientos</h1>
      <SubnavCumplimiento actual="/cumplimiento/consentimientos" />
      <Card>
        <CardHeader>
          <CardTitle>Registros ({total})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="q">Cliente o documento</Label>
              <Input id="q" name="q" defaultValue={f.q ?? ""} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="finalidad">Finalidad</Label>
              <Select id="finalidad" name="finalidad" defaultValue={f.finalidad ?? ""}>
                <option value="">Todas</option>
                {(["SERVICIO", "PROMOCIONES", "ANALITICA"] as const).map((x) => (
                  <option key={x} value={x}>
                    {ETIQUETA_FINALIDAD[x]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="estado">Estado</Label>
              <Select id="estado" name="estado" defaultValue={f.estado ?? ""}>
                <option value="">Todos</option>
                <option value="vigente">Vigente</option>
                <option value="retirado">Retirado</option>
              </Select>
            </div>
            <Button type="submit">Filtrar</Button>
            <Button asChild variant="secondary">
              <Link href="/cumplimiento/consentimientos">Limpiar</Link>
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Finalidad</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Otorgado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consentimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No hay consentimientos para estos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                consentimientos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell etiqueta="Cliente">
                      <Link href={`/clientes/${c.cliente.id}`} className="font-semibold text-primary hover:underline">
                        {c.cliente.razonSocial}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{c.cliente.documento}</span>
                    </TableCell>
                    <TableCell etiqueta="Finalidad">{ETIQUETA_FINALIDAD[c.finalidad]}</TableCell>
                    <TableCell etiqueta="Canal">{ETIQUETA_CANAL[c.canal]}</TableCell>
                    <TableCell etiqueta="Otorgado">{formatoFecha(c.otorgadoAt)}</TableCell>
                    <TableCell etiqueta="Estado">
                      {c.retiradoAt ? <Badge variant="destructive">Retirado el {formatoFecha(c.retiradoAt)}</Badge> : <Badge variant="success">Vigente</Badge>}
                    </TableCell>
                    <TableCell etiqueta="Acción">
                      {puedeRetirar && !c.retiradoAt ? (
                        <BotonRetirar consentimientoId={c.id} etiqueta={`${ETIQUETA_FINALIDAD[c.finalidad]} por ${ETIQUETA_CANAL[c.canal]} de ${c.cliente.razonSocial}`} />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
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
