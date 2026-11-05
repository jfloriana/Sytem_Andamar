import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ETAPAS, agruparPorEtapa, etapasDestino, totalesPorEtapa, type Etapa } from "@/domain/oportunidades";
import { filtroPorVendedor } from "@/lib/cartera";
import { recursoVendedor } from "@/lib/comercial";
import { ETIQUETA_ETAPA, formatoDinero, formatoFecha } from "@/lib/formato";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { MoverEtapa } from "./mover-etapa";

export const metadata: Metadata = { title: "Oportunidades" };
export const dynamic = "force-dynamic";

const POR_PAGINA = 25;
const MAX_TABLERO = 500;
const MAX_POR_COLUMNA = 20;
type Params = Record<string, string | string[] | undefined>;
const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const esEtapa = (v: string | undefined): v is Etapa => !!v && (ETAPAS as readonly string[]).includes(v);

const incluir = {
  cliente: { select: { id: true, razonSocial: true } },
  vendedor: { select: { id: true, nombre: true, jefeId: true } },
} satisfies Prisma.OportunidadInclude;

type Fila = Prisma.OportunidadGetPayload<{ include: typeof incluir }>;

function TarjetaOportunidad({ o, puedeMover }: { o: Fila; puedeMover: boolean }) {
  return (
    <li className="rounded border bg-background p-3">
      <Link href={`/oportunidades/${o.id}`} className="font-semibold text-primary hover:underline">
        {o.titulo}
      </Link>
      <p className="text-sm text-muted-foreground">{o.cliente.razonSocial}</p>
      <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
        <span className="font-semibold tabular-nums">{formatoDinero(o.montoEstimado.toString())}</span>
        <span className="text-xs text-muted-foreground">{o.vendedor.nombre}</span>
      </p>
      {o.etapa === "PERDIDA" && o.motivoPerdida ? <p className="mt-1 text-xs text-muted-foreground">Motivo: {o.motivoPerdida}</p> : null}
      {puedeMover ? (
        <div className="no-imprimir mt-2">
          <MoverEtapa
            oportunidadId={o.id}
            titulo={o.titulo}
            destinos={etapasDestino(o.etapa).map((valor) => ({ valor, etiqueta: ETIQUETA_ETAPA[valor] }))}
          />
        </div>
      ) : null}
    </li>
  );
}

function Tablero({ filas, puedeEditar, usuario }: { filas: Fila[]; puedeEditar: boolean; usuario: Parameters<typeof can>[0] }) {
  const grupos = agruparPorEtapa(filas);
  const totales = totalesPorEtapa(filas.map((f) => ({ etapa: f.etapa, montoEstimado: Number(f.montoEstimado) })));
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:overflow-x-auto md:pb-2">
      {ETAPAS.map((etapa) => {
        const items = grupos[etapa];
        return (
          <section key={etapa} aria-labelledby={`col-${etapa}`} className="rounded border bg-muted p-3 md:w-72 md:shrink-0">
            <h2 id={`col-${etapa}`} className="flex items-baseline justify-between gap-2 text-base font-semibold">
              <span>{ETIQUETA_ETAPA[etapa]}</span>
              <span className="text-sm font-normal text-muted-foreground tabular-nums">
                {totales[etapa].cantidad} · {formatoDinero(totales[etapa].monto)}
              </span>
            </h2>
            {items.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Sin oportunidades en esta etapa.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {items.slice(0, MAX_POR_COLUMNA).map((o) => (
                  <TarjetaOportunidad key={o.id} o={o} puedeMover={puedeEditar && can(usuario, "editar", recursoVendedor("oportunidad", o))} />
                ))}
                {items.length > MAX_POR_COLUMNA ? (
                  <li className="text-sm text-muted-foreground">Y {items.length - MAX_POR_COLUMNA} más. Usa la vista de lista para verlas todas.</li>
                ) : null}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Lista({ filas }: { filas: Fila[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Oportunidad</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Etapa</TableHead>
          <TableHead>Monto estimado</TableHead>
          <TableHead>Vendedor</TableHead>
          <TableHead>Creada</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((o) => (
          <TableRow key={o.id}>
            <TableCell etiqueta="Oportunidad" className="font-semibold">
              <Link href={`/oportunidades/${o.id}`} className="text-primary hover:underline">
                {o.titulo}
              </Link>
            </TableCell>
            <TableCell etiqueta="Cliente">{o.cliente.razonSocial}</TableCell>
            <TableCell etiqueta="Etapa">
              <Badge variant={o.etapa === "GANADA" ? "success" : o.etapa === "PERDIDA" ? "destructive" : "default"}>{ETIQUETA_ETAPA[o.etapa]}</Badge>
            </TableCell>
            <TableCell etiqueta="Monto estimado">{formatoDinero(o.montoEstimado.toString())}</TableCell>
            <TableCell etiqueta="Vendedor">{o.vendedor.nombre}</TableCell>
            <TableCell etiqueta="Creada">{formatoFecha(o.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function PaginaOportunidades({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requerir("ver", "oportunidad");
  const crudos = await searchParams;
  const vista = primero(crudos.vista) === "lista" ? "lista" : "tablero";
  const etapa = primero(crudos.etapa);
  const pagina = Math.max(1, Number.parseInt(primero(crudos.pagina) ?? "1", 10) || 1);
  const where: Prisma.OportunidadWhereInput = { AND: [filtroPorVendedor(usuario), esEtapa(etapa) ? { etapa } : {}] };

  const [filas, total] = await Promise.all([
    prisma.oportunidad.findMany({
      where,
      include: incluir,
      orderBy: vista === "lista" ? { createdAt: "desc" } : { updatedAt: "desc" },
      skip: vista === "lista" ? (pagina - 1) * POR_PAGINA : 0,
      take: vista === "lista" ? POR_PAGINA : MAX_TABLERO,
    }),
    prisma.oportunidad.count({ where }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (n: number) => {
    const p = new URLSearchParams({ vista: "lista", pagina: String(n) });
    if (esEtapa(etapa)) p.set("etapa", etapa);
    return `/oportunidades?${p.toString()}`;
  };
  const puedeEditar = can(usuario, "editar", "oportunidad");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold leading-tight">Oportunidades</h1>
        {can(usuario, "crear", "oportunidad") ? (
          <Button asChild className="no-imprimir">
            <Link href="/oportunidades/nueva">Nueva oportunidad</Link>
          </Button>
        ) : null}
      </div>

      <div className="no-imprimir flex flex-wrap items-end gap-3">
        <nav aria-label="Vista" className="flex gap-2">
          <Button asChild variant={vista === "tablero" ? "default" : "secondary"}>
            <Link href="/oportunidades?vista=tablero" aria-current={vista === "tablero" ? "page" : undefined}>
              Tablero
            </Link>
          </Button>
          <Button asChild variant={vista === "lista" ? "default" : "secondary"}>
            <Link href="/oportunidades?vista=lista" aria-current={vista === "lista" ? "page" : undefined}>
              Lista
            </Link>
          </Button>
        </nav>
        {vista === "lista" ? (
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="vista" value="lista" />
            <div className="flex flex-col gap-1">
              <Label htmlFor="etapa">Etapa</Label>
              <Select id="etapa" name="etapa" defaultValue={esEtapa(etapa) ? etapa : ""}>
                <option value="">Todas</option>
                {ETAPAS.map((e) => (
                  <option key={e} value={e}>
                    {ETIQUETA_ETAPA[e]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
          </form>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground" role="status">
        {total === 0 ? "Sin oportunidades" : `${total} ${total === 1 ? "oportunidad" : "oportunidades"}`}
        {vista === "tablero" && total > MAX_TABLERO ? `. El tablero muestra las ${MAX_TABLERO} más recientes; usa la lista para ver todas.` : ""}
      </p>

      {total === 0 ? (
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <p>Aún no hay oportunidades en tu embudo. Crea la primera con «Nueva oportunidad».</p>
          </CardContent>
        </Card>
      ) : vista === "tablero" ? (
        <Tablero filas={filas} puedeEditar={puedeEditar} usuario={usuario} />
      ) : (
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <Lista filas={filas} />
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
      )}
    </div>
  );
}
