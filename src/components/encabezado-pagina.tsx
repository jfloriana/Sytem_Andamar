import * as React from "react";
import { cn } from "@/lib/utils";

interface Props {
  titulo: string;
  descripcion?: React.ReactNode;
  /** Texto corto sobre el título (por ejemplo, la fecha). */
  sobretitulo?: React.ReactNode;
  acciones?: React.ReactNode;
  className?: string;
}

/** Cabecera común de página: título, subtítulo y acciones. */
export function EncabezadoPagina({ titulo, descripcion, sobretitulo, acciones, className }: Props) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        {sobretitulo ? <p className="mb-1 text-sm font-medium text-muted-foreground">{sobretitulo}</p> : null}
        <h1 className="text-2xl font-semibold leading-tight text-navy md:text-[28px]">{titulo}</h1>
        {descripcion ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="no-imprimir flex flex-wrap items-center gap-2">{acciones}</div> : null}
    </header>
  );
}
