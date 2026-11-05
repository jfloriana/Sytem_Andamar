import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { evaluarRiesgo } from "@/domain/riesgo";
import { SEGMENTOS_ORDEN } from "@/domain/segmentacion";
import { filtroCartera } from "@/lib/cartera";
import { ETIQUETA_SEGMENTO, formatoFecha } from "@/lib/formato";
import { PEDIDOS_VALIDOS } from "@/lib/pedidos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { esSegmento, vendedoresParaFiltro } from "@/lib/tablero";

export const metadata: Metadata = { title: "Clientes en riesgo" };
export const dynamic = "force-dynamic";

const POR_PAGINA = 25;
type Params = Record<string, string | string[] | undefined>;
const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const dias = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

/** Alerta de clientes en riesgo (RF-08): sin pedidos por más de 1,5 veces su intervalo medio de compra. */
export default async function PaginaRiesgo({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requerir("ver", "cliente");
  const crudos = await searchParams;
  const ahora = new Date();
  const vendedores = await vendedoresParaFiltro(usuario);
  const vendedorId = vendedores.some((v) => v.id === primero(crudos.vendedorId)) ? primero(crudos.vendedorId) : undefined;
  const segmentoTxt = primero(crudos.segmento);
  const segmento = esSegmento(segmentoTxt) ? segmentoTxt : undefined;
  const pagina = Math.max(1, Number.parseInt(primero(crudos.pagina) ?? "1", 10) || 1);

  const clientes = await prisma.cliente.findMany({
    where: {
      AND: [filtroCartera(usuario), { estado: "EN_RIESGO" }, vendedorId ? { vendedorId } : {}, segmento ? { segmento } : {}],
    },
    select: { id: true, razonSocial: true, segmento: true, vendedor: { select: { nombre: true } } },
  });
  const grupos = clientes.length
    ? await prisma.pedido.groupBy({
        by: ["clienteId"],
        where: { ...PEDIDOS_VALIDOS, clienteId: { in: clientes.map((c) => c.id) } },
        _count: { _all: true },
        _min: { fecha: true },
        _max: { fecha: true },
      })
    : [];
  const porCliente = new Map(grupos.map((g) => [g.clienteId, g]));
  const filas = clientes
    .map((c) => {
      const g = porCliente.get(c.id);
      const ev = evaluarRiesgo(g ? { cantidad: g._count._all, primera: g._min.fecha, ultima: g._max.fecha } : { cantidad: 0, primera: null, ultima: null }, ahora);
      return { ...c, ultimoPedido: g?._max.fecha ?? null, ...ev };
    })
    .sort((a, b) => (b.diasSinCompra ?? 0) - (a.diasSinCompra ?? 0));

  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const visibles = filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const enlace = (n: number) => {
    const p = new URLSearchParams({ pagina: String(n) });
    if (vendedorId) p.set("vendedorId", vendedorId);
    if (segmento) p.set("segmento", segmento);
    return `/clientes/riesgo?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/clientes" className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Clientes
        </Link>
        <h1 className="text-[28px] font-semibold leading-tight">Clientes en riesgo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clientes con al menos 3 pedidos que llevan más de 1,5 veces su intervalo habitual de compra (mínimo 30 días) sin comprar. La lista se
          actualiza con la tarea diaria o con «Recalcular ahora»; vuelven a Activo con un nuevo pedido.
        </p>
      </div>

      <form method="get" className="no-imprimir flex flex-wrap items-end gap-3" aria-label="Filtros de clientes en riesgo">
        {vendedores.length > 0 && usuario.rol !== "VENDEDOR" ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor="vendedorId">Vendedor</Label>
            <Select id="vendedorId" name="vendedorId" defaultValue={vendedorId ?? ""}>
              <option value="">Todos</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <Label htmlFor="segmento">Segmento</Label>
          <Select id="segmento" name="segmento" defaultValue={segmento ?? ""}>
            <option value="">Todos</option>
            {SEGMENTOS_ORDEN.map((s) => (
              <option key={s} value={s}>
                {ETIQUETA_SEGMENTO[s]}
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
            {filas.length === 0 ? "Sin clientes en riesgo" : `${filas.length} ${filas.length === 1 ? "cliente en riesgo" : "clientes en riesgo"}`}
          </p>
          {visibles.length === 0 ? (
            <p>No hay clientes en riesgo para los filtros elegidos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Días sin compra</TableHead>
                  <TableHead>Intervalo habitual</TableHead>
                  <TableHead>Último pedido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell etiqueta="Cliente" className="font-semibold">
                      <Link href={`/clientes/${c.id}`} className="text-primary hover:underline">
                        {c.razonSocial}
                      </Link>{" "}
                      <Badge variant="destructive">En riesgo</Badge>
                    </TableCell>
                    <TableCell etiqueta="Vendedor">{c.vendedor.nombre}</TableCell>
                    <TableCell etiqueta="Segmento">{ETIQUETA_SEGMENTO[c.segmento]}</TableCell>
                    <TableCell etiqueta="Días sin compra">{c.diasSinCompra === null ? "-" : `${dias.format(c.diasSinCompra)} días`}</TableCell>
                    <TableCell etiqueta="Intervalo habitual">
                      {c.intervaloMedioDias === null ? "-" : `cada ${dias.format(c.intervaloMedioDias)} días`}
                    </TableCell>
                    <TableCell etiqueta="Último pedido">{c.ultimoPedido ? formatoFecha(c.ultimoPedido) : "-"}</TableCell>
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
