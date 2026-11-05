import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { estadoEfectivo, horasEntre, tiempoRespuestaHoras } from "@/domain/sla";
import {
  ETIQUETA_ESTADO_CASO,
  ETIQUETA_PRIORIDAD,
  VARIANTE_ESTADO_CASO,
  VARIANTE_PRIORIDAD,
  formatoFechaHora,
  formatoHoras,
} from "@/lib/formato";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { FILTROS_CASO, esFiltroCaso, filtroCasos, filtroEscalados, filtroPorEstado } from "@/lib/servicio";

export const metadata: Metadata = { title: "Casos" };
export const dynamic = "force-dynamic";

const POR_PAGINA = 25;
type Params = Record<string, string | string[] | undefined>;
const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function PaginaCasos({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requerir("ver", "caso");
  const crudos = await searchParams;
  const pedido = primero(crudos.estado);
  const filtro = esFiltroCaso(pedido) ? pedido : "abiertos";
  const pagina = Math.max(1, Number.parseInt(primero(crudos.pagina) ?? "1", 10) || 1);
  const ahora = new Date();
  const alcance = filtroCasos(usuario);
  const where: Prisma.CasoWhereInput = { AND: [alcance, filtroPorEstado(filtro, ahora)] };

  const [casos, total, escalados] = await Promise.all([
    prisma.caso.findMany({
      where,
      orderBy: { fechaLimite: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { cliente: { select: { razonSocial: true } }, responsable: { select: { nombre: true } } },
    }),
    prisma.caso.count({ where }),
    prisma.caso.count({ where: { AND: [alcance, filtroEscalados(ahora)] } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (n: number) => `/casos?estado=${filtro}&pagina=${n}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold leading-tight">Casos</h1>
        {can(usuario, "crear", "caso") ? (
          <Button asChild className="no-imprimir">
            <Link href="/casos/nuevo">Nuevo caso</Link>
          </Button>
        ) : null}
      </div>

      <p role="status" className="flex flex-wrap items-center gap-2 text-sm">
        {escalados > 0 ? (
          <Badge variant="destructive">
            {escalados} {escalados === 1 ? "caso escalado" : "casos escalados"}
          </Badge>
        ) : (
          <Badge variant="success">Sin casos escalados</Badge>
        )}
        <span className="text-muted-foreground">Un caso sin primera respuesta pasado su plazo de 24 horas se considera escalado.</span>
      </p>

      <form method="get" className="no-imprimir flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="estado">Mostrar</Label>
          <Select id="estado" name="estado" defaultValue={filtro}>
            {FILTROS_CASO.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.etiqueta}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <Card>
        <CardContent className="pt-4 md:pt-6">
          <p className="mb-3 text-sm text-muted-foreground" role="status">
            {total === 0 ? "Sin casos" : `${total} ${total === 1 ? "caso" : "casos"}`}
          </p>
          {casos.length === 0 ? (
            <p>No hay casos para este filtro.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caso</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Respuesta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {casos.map((c) => {
                  const efectivo = estadoEfectivo(c, ahora);
                  return (
                    <TableRow key={c.id}>
                      <TableCell etiqueta="Caso" className="font-semibold">
                        <Link href={`/casos/${c.id}`} className="text-primary hover:underline">
                          {c.titulo}
                        </Link>
                      </TableCell>
                      <TableCell etiqueta="Cliente">{c.cliente.razonSocial}</TableCell>
                      <TableCell etiqueta="Prioridad">
                        <Badge variant={VARIANTE_PRIORIDAD[c.prioridad]}>{ETIQUETA_PRIORIDAD[c.prioridad]}</Badge>
                      </TableCell>
                      <TableCell etiqueta="Responsable">{c.responsable.nombre}</TableCell>
                      <TableCell etiqueta="Estado">
                        <Badge variant={VARIANTE_ESTADO_CASO[efectivo]}>{ETIQUETA_ESTADO_CASO[efectivo]}</Badge>
                      </TableCell>
                      <TableCell etiqueta="Vence">
                        {formatoFechaHora(c.fechaLimite)}
                        {efectivo === "ESCALADO" && !c.primeraRespuestaAt ? (
                          <span className="block text-xs font-semibold text-destructive">Vencido hace {formatoHoras(horasEntre(c.fechaLimite, ahora))}</span>
                        ) : null}
                      </TableCell>
                      <TableCell etiqueta="Respuesta">{c.primeraRespuestaAt ? formatoHoras(tiempoRespuestaHoras(c)) : "Sin responder"}</TableCell>
                    </TableRow>
                  );
                })}
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
