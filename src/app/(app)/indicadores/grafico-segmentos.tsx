"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { escalaEje } from "./escala";

interface Props {
  datos: { etiqueta: string; clientes: number }[];
  descripcion: string;
}

// Azules de la paleta sobria; sin clasificar en gris.
const COLORES = ["#002d9c", "#0f62fe", "#78a9ff", "#8d8d8d"];
const GRIS = "#525252";
const entero = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

/** Clientes por segmento. La tabla de datos acompaña al gráfico. */
export function GraficoSegmentos({ datos, descripcion }: Props) {
  const escala = escalaEje(Math.max(...datos.map((d) => d.clientes), 0), { entera: true });
  return (
    <div role="img" aria-label={descripcion} className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={datos} margin={{ top: 8, right: 16, bottom: 0, left: 4 }} accessibilityLayer={false}>
          <CartesianGrid stroke="#e0e0e0" vertical={false} />
          <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: GRIS }} tickLine={false} tickMargin={6} interval={0} />
          <YAxis
            width={44}
            allowDecimals={false}
            tick={{ fontSize: 12, fill: GRIS }}
            tickLine={false}
            axisLine={false}
            domain={[0, escala.tope]}
            ticks={escala.ticks}
            interval={0}
            tickFormatter={(v: number) => entero.format(v)}
          />
          <Tooltip formatter={(v) => [entero.format(Number(v)), "Clientes"]} cursor={{ fill: "rgba(15, 98, 254, 0.06)" }} />
          <Bar dataKey="clientes" radius={[4, 4, 0, 0]} maxBarSize={72} isAnimationActive={false}>
            {datos.map((d, i) => (
              <Cell key={d.etiqueta} fill={COLORES[i % COLORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
