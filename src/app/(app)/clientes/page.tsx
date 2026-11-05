import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { normalizarTelefono } from "@/domain/normalizacion";
import { filtroCartera } from "@/lib/cartera";
import { ETIQUETA_ESTADO_CLIENTE, ETIQUETA_SEGMENTO, VARIANTE_ESTADO_CLIENTE } from "@/lib/formato";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

const POR_PAGINA = 25;
type Params = Record<string, string | string[] | undefined>;
const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/** Búsqueda por nombre, documento o teléfono (el teléfono se compara por sus dígitos). */
function filtroBusqueda(q: string | undefined): Prisma.ClienteWhereInput {
  if (!q) return {};
  const digitos = normalizarTelefono(q);
  return {
    OR: [
      { razonSocial: { contains: q, mode: "insensitive" } },
      { documento: { contains: q.replace(/[\s-]/g, ""), mode: "insensitive" } },
      ...(digitos.length >= 3 ? [{ telefono: { contains: digitos } }] : []),
    ],
  };
}

export default async function PaginaClientes({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requerir("ver", "cliente");
  const crudos = await searchParams;
  const q = primero(crudos.q)?.trim().slice(0, 80);
  const pagina = Math.max(1, Number.parseInt(primero(crudos.pagina) ?? "1", 10) || 1);
  const where: Prisma.ClienteWhereInput = { AND: [filtroCartera(usuario), filtroBusqueda(q)] };

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      orderBy: { razonSocial: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { vendedor: { select: { nombre: true } } },
    }),
    prisma.cliente.count({ where }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("pagina", String(n));
    return `/clientes?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold leading-tight">Clientes</h1>
        <div className="no-imprimir flex flex-wrap gap-2">
          {can(usuario, "crear", "importacion") ? (
            <Button asChild variant="secondary">
              <Link href="/clientes/importar">Importar CSV</Link>
            </Button>
          ) : null}
          {can(usuario, "crear", "cliente") ? (
            <Button asChild>
              <Link href="/clientes/nuevo">Nuevo cliente</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <form method="get" role="search" className="no-imprimir flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1 md:max-w-md">
          <Label htmlFor="q">Buscar cliente</Label>
          <Input id="q" name="q" type="search" defaultValue={q ?? ""} placeholder="Nombre, documento o teléfono" autoComplete="off" />
        </div>
        <Button type="submit">Buscar</Button>
        {q ? (
          <Button asChild variant="secondary">
            <Link href="/clientes">Limpiar</Link>
          </Button>
        ) : null}
      </form>

      <Card>
        <CardContent className="pt-4 md:pt-6">
          <p className="mb-3 text-sm text-muted-foreground" role="status">
            {total === 0 ? "Sin resultados" : `${total} ${total === 1 ? "cliente" : "clientes"}`}
            {q ? ` para «${q}»` : ""}
          </p>
          {clientes.length === 0 ? (
            <p>
              {q
                ? "No hay clientes que coincidan con la búsqueda."
                : "Aún no hay clientes en tu cartera. Crea el primero con «Nuevo cliente»."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razón social</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell etiqueta="Razón social" className="font-semibold">
                      <Link href={`/clientes/${c.id}`} className="text-primary hover:underline">
                        {c.razonSocial}
                      </Link>
                    </TableCell>
                    <TableCell etiqueta="Documento">{c.documento}</TableCell>
                    <TableCell etiqueta="Teléfono">{c.telefono ?? "-"}</TableCell>
                    <TableCell etiqueta="Vendedor">{c.vendedor.nombre}</TableCell>
                    <TableCell etiqueta="Segmento">{ETIQUETA_SEGMENTO[c.segmento]}</TableCell>
                    <TableCell etiqueta="Estado">
                      <Badge variant={VARIANTE_ESTADO_CLIENTE[c.estado]}>{ETIQUETA_ESTADO_CLIENTE[c.estado]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {paginas > 1 ? (
            <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-2 text-sm">
              {pagina > 1 ? (
                <Link className="flex min-h-11 items-center font-semibold text-primary hover:underline" href={enlace(pagina - 1)}>
                  Anterior
                </Link>
              ) : (
                <span />
              )}
              <span>
                Página {pagina} de {paginas}
              </span>
              {pagina < paginas ? (
                <Link className="flex min-h-11 items-center font-semibold text-primary hover:underline" href={enlace(pagina + 1)}>
                  Siguiente
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
