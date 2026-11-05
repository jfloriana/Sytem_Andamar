"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ESCALA_PORCENTAJE, escalaEje } from "./escala";

interface Props {
  datos: { mes: string; valor: number | null }[];
  unidad: string;
  meta: number;
  /** Texto alternativo que resume la serie (el detalle está en la tabla). */
  descripcion: string;
}

const AZUL = "#0f62fe";
const GRIS = "#525252";

/** Tendencia mensual con la meta como línea de referencia. La tabla de datos acompaña a cada gráfico. */
export function GraficoTendencia({ datos, unidad, meta, descripcion }: Props) {
  const maximo = Math.max(meta, ...datos.map((d) => d.valor ?? 0));
  // Los porcentajes van siempre de 0 a 100; las horas, hasta un tope redondo sobre el máximo.
  const escala = unidad === "%" ? ESCALA_PORCENTAJE : escalaEje(maximo * 1.1);
  const formato = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: escala.decimales });
  const formatoValor = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });

  return (
    <div role="img" aria-label={descripcion} className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 0, left: 4 }} accessibilityLayer={false}>
          <CartesianGrid stroke="#e0e0e0" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 12, fill: GRIS }} tickLine={false} tickMargin={6} interval="preserveStartEnd" minTickGap={16} />
          <YAxis
            width={unidad === "%" ? 44 : 48}
            tick={{ fontSize: 12, fill: GRIS }}
            tickLine={false}
            axisLine={false}
            domain={[0, escala.tope]}
            ticks={escala.ticks}
            interval={0}
            tickFormatter={(v: number) => (unidad === "%" ? `${formato.format(v)}%` : formato.format(v))}
          />
          <Tooltip formatter={(v) => [`${formatoValor.format(Number(v))} ${unidad}`, "Valor"]} />
          <ReferenceLine
            y={meta}
            stroke={GRIS}
            strokeDasharray="4 4"
            label={{ value: "Meta", position: "insideTopRight", fontSize: 12, fill: GRIS }}
          />
          <Line type="monotone" dataKey="valor" stroke={AZUL} strokeWidth={2} dot={{ r: 3, fill: AZUL }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
