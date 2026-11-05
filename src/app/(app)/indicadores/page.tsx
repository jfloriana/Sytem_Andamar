import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLV } from "@/config";
import { resolverPeriodo } from "@/domain/periodos";
import { SEGMENTOS_ORDEN } from "@/domain/segmentacion";
import type { Semaforo } from "@/domain/indicadores";
import { ETIQUETA_SEGMENTO, formatoDinero } from "@/lib/formato";
import { can } from "@/lib/permisos";
import { requerir } from "@/lib/sesion";
import { ETIQUETA_SEMAFORO, calcularTablero, esSegmento, valorTexto, vendedoresParaFiltro, type TarjetaIndicador } from "@/lib/tablero";
import { BotonImprimir } from "./boton-imprimir";
import { BotonRecalcular } from "./boton-recalcular";
import { GraficoSegmentos } from "./grafico-segmentos";
import { GraficoTendencia } from "./grafico-tendencia";

export const metadata: Metadata = { title: "Indicadores" };
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const dia = (d: Date) => d.toISOString().slice(0, 10);
const numero = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });

const VARIANTE_SEMAFORO: Record<Semaforo, "success" | "warning" | "destructive" | "default"> = {
  verde: "success",
  ambar: "warning",
  rojo: "destructive",
  sin_datos: "default",
};

function Tarjeta({ t }: { t: TarjetaIndicador }) {
  const hay = t.tendencia.some((p) => p.valor !== null);
  const resumen = t.tendencia.map((p) => `${p.mes}: ${p.valor === null ? "sin datos" : `${numero.format(p.valor)} ${t.unidad}`}`).join("; ");
  return (
    <Card data-indicador={t.clave}>
      <CardHeader>
        <CardTitle className="text-base">{t.titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-[28px] font-bold leading-none tracking-tight text-navy tabular-nums">{valorTexto(t)}</p>
          <Badge variant={VARIANTE_SEMAFORO[t.semaforo]}>{ETIQUETA_SEMAFORO[t.semaforo]}</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Meta</dt>
            <dd className="font-semibold tabular-nums">
              {t.menorEsMejor ? "menos de " : ""}
              {numero.format(t.meta)} {t.unidad}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Línea base</dt>
            <dd className="font-semibold tabular-nums">{t.lineaBase === null ? "No se mide" : `${numero.format(t.lineaBase)} ${t.unidad}`}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">{t.detalle}</p>
        {hay ? (
          <GraficoTendencia datos={t.tendencia} unidad={t.unidad} meta={t.meta} descripcion={`Tendencia mensual de ${t.titulo}. ${resumen}. Meta ${numero.format(t.meta)} ${t.unidad}.`} />
        ) : (
          <p className="text-sm text-muted-foreground">Aún no hay datos mensuales para el gráfico de tendencia.</p>
        )}
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">Datos de la tendencia</summary>
          <table className="mt-1 w-full text-sm tabular-nums">
            <caption className="sr-only">Tendencia mensual de {t.titulo}</caption>
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="py-1 pr-2 font-semibold">
                  Mes
                </th>
                <th scope="col" className="py-1 font-semibold">
                  Valor ({t.unidad})
                </th>
              </tr>
            </thead>
            <tbody>
              {t.tendencia.map((p) => (
                <tr key={p.mes} className="border-t">
                  <td className="py-1 pr-2">{p.mes}</td>
                  <td className="py-1">{p.valor === null ? "Sin datos" : numero.format(p.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">Cómo se calcula</summary>
          <p className="text-sm text-muted-foreground">{t.formula}</p>
        </details>
      </CardContent>
    </Card>
  );
}

export default async function PaginaIndicadores({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await requerir("ver", "indicadores");
  const crudos = await searchParams;
  const ahora = new Date();
  const periodo = resolverPeriodo(primero(crudos.desde), primero(crudos.hasta), ahora);
  const vendedores = await vendedoresParaFiltro(usuario);
  const vendedorId = vendedores.some((v) => v.id === primero(crudos.vendedorId)) ? primero(crudos.vendedorId) : undefined;
  const segmentoTxt = primero(crudos.segmento);
  const segmento = esSegmento(segmentoTxt) ? segmentoTxt : undefined;

  const tablero = await calcularTablero(usuario, { desde: periodo.desde, hasta: periodo.hasta, hastaExcl: periodo.hastaExcl, vendedorId, segmento }, ahora);

  const consulta = new URLSearchParams({ desde: dia(periodo.desde), hasta: dia(periodo.hasta) });
  if (vendedorId) consulta.set("vendedorId", vendedorId);
  if (segmento) consulta.set("segmento", segmento);
  const totalClientes = tablero.distribucion.reduce((s, d) => s + d.clientes, 0);
  const datosSegmentos = tablero.distribucion.map((d) => ({ etiqueta: ETIQUETA_SEGMENTO[d.segmento], clientes: d.clientes }));

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Indicadores"
        descripcion={
          <>
            Período del {dia(periodo.desde)} al {dia(periodo.hasta)}
            {vendedorId ? ` · vendedor ${vendedores.find((v) => v.id === vendedorId)?.nombre}` : ""}
            {segmento ? ` · ${ETIQUETA_SEGMENTO[segmento]}` : ""}
          </>
        }
        acciones={
          <>
            {can(usuario, "exportar", "indicadores") ? (
              <Button asChild variant="secondary">
                <Link href={`/indicadores/exportar?${consulta.toString()}`} prefetch={false}>
                  Exportar CSV
                </Link>
              </Button>
            ) : null}
            <BotonImprimir />
            {can(usuario, "recalcular", "segmentacion") ? <BotonRecalcular /> : null}
          </>
        }
      />

      <form method="get" className="no-imprimir flex flex-wrap items-end gap-3 rounded-card border border-border/80 bg-card p-4 shadow-card" aria-label="Filtros del tablero">
        <div className="flex flex-col gap-1">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" name="desde" type="date" defaultValue={dia(periodo.desde)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" name="hasta" type="date" defaultValue={dia(periodo.hasta)} />
        </div>
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
          Aplicar filtros
        </Button>
      </form>
      {periodo.error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {periodo.error} Se muestra el período por defecto (12 meses hasta hoy).
        </p>
      ) : null}

      <section aria-label="Seis indicadores" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tablero.tarjetas.map((t) => (
          <Tarjeta key={t.clave} t={t} />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clientes por segmento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {totalClientes === 0 ? (
              <p className="text-muted-foreground">No hay clientes para los filtros elegidos.</p>
            ) : (
              <GraficoSegmentos
                datos={datosSegmentos}
                descripcion={`Clientes por segmento: ${datosSegmentos.map((d) => `${d.etiqueta} ${d.clientes}`).join(", ")}.`}
              />
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Participación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tablero.distribucion.map((d) => (
                  <TableRow key={d.segmento}>
                    <TableCell etiqueta="Segmento" className="whitespace-nowrap">{ETIQUETA_SEGMENTO[d.segmento]}</TableCell>
                    <TableCell etiqueta="Clientes">{d.clientes}</TableCell>
                    <TableCell etiqueta="Participación">{totalClientes === 0 ? "-" : `${numero.format((d.clientes / totalClientes) * 100)} %`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valor del cliente (CLV) por segmento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Margen anual</TableHead>
                  <TableHead>CLV promedio</TableHead>
                  <TableHead>CLV total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tablero.clv.map((c) => (
                  <TableRow key={c.segmento}>
                    <TableCell etiqueta="Segmento" className="whitespace-nowrap">{ETIQUETA_SEGMENTO[c.segmento]}</TableCell>
                    <TableCell etiqueta="Margen anual">{formatoDinero(c.margenTotal)}</TableCell>
                    <TableCell etiqueta="CLV promedio">{formatoDinero(c.clvPromedio)}</TableCell>
                    <TableCell etiqueta="CLV total">{formatoDinero(c.clvTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-sm text-muted-foreground">
              Aproximación simplificada: CLV = m x r / (1 + d - r), con m = margen de los últimos 12 meses, r = retención de referencia{" "}
              {Math.round(tablero.retencionClv * 100)} % y d = {Math.round(CLV.tasaDescuento * 100)} %. No es un pronóstico.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
