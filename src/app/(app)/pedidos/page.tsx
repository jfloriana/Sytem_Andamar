import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { estadosSiguientesPedido } from "@/domain/pedidos";
import { filtroPorVendedor } from "@/lib/cartera";
import { recursoVendedor } from "@/lib/comercial";
import { ETIQUETA_ESTADO_PEDIDO, VARIANTE_ESTADO_PEDIDO, formatoDinero, formatoFecha } from "@/lib/formato";
import { can } from "@/lib/permisos";
import { PEDIDOS_VALIDOS } from "@/lib/pedidos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { BotonEstadoPedido } from "./boton-estado-pedido";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

const POR_PAGINA = 25;
const ESTADOS = ["REGISTRADO", "ENTREGADO", "ANULADO"] as const;
type Params = Record<string, string | string[] | undefined>;
const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const esEstado = (v: string | undefined): v is (typeof ESTADOS)[number] => !!v && (ESTADOS as readonly string[]).includes(v);

export default async function PaginaPedidos({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requerir("ver", "pedido");
  const crudos = await searchParams;
  const estado = primero(crudos.estado);
  const pagina = Math.max(1, Number.parseInt(primero(crudos.pagina) ?? "1", 10) || 1);
  const alcance: Prisma.PedidoWhereInput = { AND: [filtroPorVendedor(usuario), esEstado(estado) ? { estado } : {}] };

  const [pedidos, total, suma] = await Promise.all([
    prisma.pedido.findMany({
      where: alcance,
      orderBy: { fecha: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { cliente: { select: { id: true, razonSocial: true } }, vendedor: { select: { nombre: true, jefeId: true } } },
    }),
    prisma.pedido.count({ where: alcance }),
    // Los anulados no cuentan en los totales.
    prisma.pedido.aggregate({ where: { AND: [alcance, PEDIDOS_VALIDOS] }, _sum: { monto: true, margen: true }, _count: true }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (n: number) => {
    const p = new URLSearchParams({ pagina: String(n) });
    if (esEstado(estado)) p.set("estado", estado);
    return `/pedidos?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold leading-tight">Pedidos</h1>
        {can(usuario, "crear", "pedido") ? (
          <Button asChild className="no-imprimir">
            <Link href="/pedidos/nuevo">Nuevo pedido</Link>
          </Button>
        ) : null}
      </div>

      <form method="get" className="no-imprimir flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="estado">Estado</Label>
          <Select id="estado" name="estado" defaultValue={esEstado(estado) ? estado : ""}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO_PEDIDO[e]}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          ["Pedidos válidos", String(suma._count)],
          ["Monto total", formatoDinero(Number(suma._sum.monto ?? 0))],
          ["Margen total", formatoDinero(Number(suma._sum.margen ?? 0))],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded border p-3">
            <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
            <dd className="text-xl font-semibold tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="-mt-3 text-xs text-muted-foreground">Los totales no incluyen los pedidos anulados.</p>

      <Card>
        <CardContent className="pt-4 md:pt-6">
          <p className="mb-3 text-sm text-muted-foreground" role="status">
            {total === 0 ? "Sin pedidos" : `${total} ${total === 1 ? "pedido" : "pedidos"}`}
          </p>
          {pedidos.length === 0 ? (
            <p>Aún no hay pedidos registrados. Registra el primero con «Nuevo pedido».</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Margen</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((p) => {
                  const puedeEditar = can(usuario, "editar", recursoVendedor("pedido", p));
                  const descripcion = `pedido de ${p.cliente.razonSocial} por ${formatoDinero(p.monto.toString())}`;
                  return (
                    <TableRow key={p.id}>
                      <TableCell etiqueta="Fecha">{formatoFecha(p.fecha)}</TableCell>
                      <TableCell etiqueta="Cliente" className="font-semibold">
                        <Link href={`/clientes/${p.cliente.id}`} className="text-primary hover:underline">
                          {p.cliente.razonSocial}
                        </Link>
                      </TableCell>
                      <TableCell etiqueta="Monto">{formatoDinero(p.monto.toString())}</TableCell>
                      <TableCell etiqueta="Margen">{formatoDinero(p.margen.toString())}</TableCell>
                      <TableCell etiqueta="Estado">
                        <Badge variant={VARIANTE_ESTADO_PEDIDO[p.estado]}>{ETIQUETA_ESTADO_PEDIDO[p.estado]}</Badge>
                      </TableCell>
                      <TableCell etiqueta="Vendedor">{p.vendedor.nombre}</TableCell>
                      <TableCell etiqueta="Acciones" className="no-imprimir">
                        {puedeEditar ? (
                          <div className="flex flex-wrap gap-2 py-1">
                            {estadosSiguientesPedido(p.estado).map((e) => (
                              <BotonEstadoPedido key={e} pedidoId={p.id} estado={e as "ENTREGADO" | "ANULADO"} descripcion={descripcion} />
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
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
