import type { MesVentas } from "@/lib/inicio";

const usd = new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compacto = new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 });

/** Escala "bonita" para el eje: el menor múltiplo de 1, 2 o 5 por potencia de 10 que cubre el máximo. */
function maximoEje(max: number): number {
  if (max <= 0) return 100;
  const potencia = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 5, 10]) if (m * potencia >= max) return m * potencia;
  return 10 * potencia;
}

/**
 * Pedidos y margen de los últimos 6 meses. Barras en HTML (sin librería) con la tabla
 * de datos como texto alternativo.
 */
export function GraficoVentas({ datos }: { datos: MesVentas[] }) {
  const tope = maximoEje(Math.max(...datos.map((d) => d.monto), 0));
  const marcas = [tope, tope / 2, 0];
  const resumen = datos.map((d) => `${d.etiqueta}: ${d.pedidos} pedidos, ${usd.format(d.monto)} y margen ${usd.format(d.margen)}`).join("; ");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
          Monto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-navy" />
          Margen
        </span>
      </div>

      <figure role="img" aria-label={`Pedidos de los últimos 6 meses. ${resumen}.`} className="m-0">
        <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-2">
          <div className="relative h-44" aria-hidden="true">
            {marcas.map((m, i) => (
              <span key={m} className="absolute right-0 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground" style={{ top: `${i * 50}%` }}>
                {m === 0 ? "0" : `$${compacto.format(m)}`}
              </span>
            ))}
          </div>
          <div className="relative h-44" aria-hidden="true">
            {marcas.map((m, i) => (
              <span key={m} className="absolute inset-x-0 border-t border-dashed border-border" style={{ top: `${i * 50}%` }} />
            ))}
            <div className="absolute inset-0 grid grid-cols-6 gap-1 sm:gap-3">
              {datos.map((d, i) => (
                <div key={d.mes} className="flex h-full items-end justify-center gap-[3px]" title={`${d.etiqueta}: ${usd.format(d.monto)} · margen ${usd.format(d.margen)}`}>
                  <span
                    className="barra-crece w-full max-w-[22px] rounded-t-[4px] bg-primary"
                    style={{ height: `${Math.max((d.monto / tope) * 100, d.monto > 0 ? 2 : 0)}%`, ["--d" as string]: `${i * 50}ms` }}
                  />
                  <span
                    className="barra-crece w-full max-w-[22px] rounded-t-[4px] bg-navy"
                    style={{ height: `${Math.max((d.margen / tope) * 100, d.margen > 0 ? 2 : 0)}%`, ["--d" as string]: `${i * 50 + 25}ms` }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div />
          <div className="mt-1.5 grid grid-cols-6 gap-1 sm:gap-3" aria-hidden="true">
            {datos.map((d) => (
              <span key={d.mes} className="text-center text-xs font-medium uppercase text-muted-foreground">
                {d.etiqueta}
              </span>
            ))}
          </div>
        </div>
      </figure>

      <details>
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">Ver datos en tabla</summary>
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">Pedidos, monto y margen por mes, últimos 6 meses</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="py-1 pr-2 font-semibold">
                Mes
              </th>
              <th scope="col" className="py-1 pr-2 text-right font-semibold">
                Pedidos
              </th>
              <th scope="col" className="py-1 pr-2 text-right font-semibold">
                Monto
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Margen
              </th>
            </tr>
          </thead>
          <tbody>
            {datos.map((d) => (
              <tr key={d.mes} className="border-t">
                <td className="py-1 pr-2">{d.mes}</td>
                <td className="py-1 pr-2 text-right">{d.pedidos}</td>
                <td className="py-1 pr-2 text-right">{usd.format(d.monto)}</td>
                <td className="py-1 text-right">{usd.format(d.margen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
