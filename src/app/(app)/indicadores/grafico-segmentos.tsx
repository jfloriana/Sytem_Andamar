"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  datos: { etiqueta: string; clientes: number }[];
  descripcion: string;
}

// Azules de la paleta sobria; sin clasificar en gris.
const COLORES = ["#002d9c", "#0f62fe", "#78a9ff", "#8d8d8d"];
const GRIS = "#525252";

/** Clientes por segmento. La tabla de datos acompaña al gráfico. */
export function GraficoSegmentos({ datos, descripcion }: Props) {
  return (
    <div role="img" aria-label={descripcion} className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid stroke="#e0e0e0" vertical={false} />
          <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: GRIS }} tickLine={false} />
          <YAxis width={40} allowDecimals={false} tick={{ fontSize: 12, fill: GRIS }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => [v, "Clientes"]} />
          <Bar dataKey="clientes" isAnimationActive={false}>
            {datos.map((d, i) => (
              <Cell key={d.etiqueta} fill={COLORES[i % COLORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
