"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
  return (
    <div role="img" aria-label={descripcion} className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid stroke="#e0e0e0" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 12, fill: GRIS }} tickLine={false} />
          <YAxis
            width={36}
            tick={{ fontSize: 12, fill: GRIS }}
            tickLine={false}
            axisLine={false}
            domain={[0, (max: number) => Math.max(max, meta) * 1.1]}
          />
          <Tooltip formatter={(v) => [`${v} ${unidad}`, "Valor"]} />
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
