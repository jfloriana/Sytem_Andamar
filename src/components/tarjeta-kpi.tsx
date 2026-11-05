import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tono = "neutro" | "alerta" | "bueno";

interface Props {
  etiqueta: string;
  valor: string;
  detalle: string;
  href: string;
  icono: LucideIcon;
  tono?: Tono;
  /** Retardo de la entrada, en ms. */
  retardo?: number;
}

const TONO_ICONO: Record<Tono, string> = {
  neutro: "bg-primary/10 text-primary",
  alerta: "bg-destructive/10 text-destructive",
  bueno: "bg-success/10 text-success",
};

/** Indicador del inicio: toda la tarjeta es un enlace al módulo que lo respalda. */
export function TarjetaKpi({ etiqueta, valor, detalle, href, icono: Icono, tono = "neutro", retardo = 0 }: Props) {
  return (
    <Link
      href={href}
      data-kpi={etiqueta}
      style={{ ["--d" as string]: `${retardo}ms` }}
      className="entra group relative flex min-h-[116px] flex-col justify-between gap-3 rounded-card border border-border/80 bg-card p-4 shadow-card transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevada"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{etiqueta}</p>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONO_ICONO[tono])} aria-hidden="true">
          <Icono className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div>
        <p className="font-display text-[28px] font-bold leading-none tracking-tight text-navy tabular-nums">{valor}</p>
        <p className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="min-w-0">{detalle}</span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
        </p>
      </div>
    </Link>
  );
}
