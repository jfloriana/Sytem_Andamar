import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AUDITORIA } from "@/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { filtroAuditoriaSchema } from "@/lib/validaciones/usuario";

export const metadata: Metadata = { title: "Auditoría" };
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function PaginaAuditoria({ searchParams }: { searchParams: Promise<Params> }) {
  await requerir("ver", "auditoria");
  const crudos = await searchParams;
  const f = filtroAuditoriaSchema.parse({
    usuarioId: primero(crudos.usuarioId),
    accion: primero(crudos.accion),
    entidad: primero(crudos.entidad),
    desde: primero(crudos.desde),
    hasta: primero(crudos.hasta),
    pagina: primero(crudos.pagina),
  });

  const where: Prisma.AuditLogWhereInput = {
    ...(f.usuarioId ? { usuarioId: f.usuarioId } : {}),
    ...(f.accion ? { accion: { contains: f.accion, mode: "insensitive" } } : {}),
    ...(f.entidad ? { entidad: f.entidad } : {}),
    ...(f.desde || f.hasta
      ? {
          createdAt: {
            ...(f.desde ? { gte: new Date(`${f.desde}T00:00:00.000Z`) } : {}),
            ...(f.hasta ? { lte: new Date(`${f.hasta}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [registros, total, usuarios, entidades] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.pagina - 1) * AUDITORIA.porPagina,
      take: AUDITORIA.porPagina,
      include: { usuario: { select: { nombre: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.usuario.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.auditLog.findMany({ select: { entidad: true }, distinct: ["entidad"], orderBy: { entidad: "asc" } }),
  ]);

  const paginas = Math.max(1, Math.ceil(total / AUDITORIA.porPagina));
  const enlace = (pagina: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, pagina })) if (v) q.set(k, String(v));
    return `/administracion/auditoria?${q.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Auditoría</h1>
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="usuarioId">Usuario</Label>
              <Select id="usuarioId" name="usuarioId" defaultValue={f.usuarioId ?? ""}>
                <option value="">Todos</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="entidad">Entidad</Label>
              <Select id="entidad" name="entidad" defaultValue={f.entidad ?? ""}>
                <option value="">Todas</option>
                {entidades.map((e) => (
                  <option key={e.entidad} value={e.entidad}>
                    {e.entidad}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="accion">Acción contiene</Label>
              <Input id="accion" name="accion" defaultValue={f.accion ?? ""} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="desde">Desde</Label>
              <Input id="desde" name="desde" type="date" defaultValue={f.desde ?? ""} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="hasta">Hasta</Label>
              <Input id="hasta" name="hasta" type="date" defaultValue={f.hasta ?? ""} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Filtrar</Button>
              <Button asChild variant="secondary">
                <Link href="/administracion/auditoria">Limpiar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha (UTC)</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No hay registros para estos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                registros.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </TableCell>
                    <TableCell>{r.usuario.nombre}</TableCell>
                    <TableCell className="font-semibold">{r.accion}</TableCell>
                    <TableCell>
                      {r.entidad} <span className="text-xs text-muted-foreground">{r.entidadId}</span>
                    </TableCell>
                    <TableCell className="max-w-xs break-words font-mono text-xs">
                      {JSON.stringify(r.detalle)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-2 text-sm">
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
