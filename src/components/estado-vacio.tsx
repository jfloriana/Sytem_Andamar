import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  icono: LucideIcon;
  texto: string;
  accion?: { href: string; etiqueta: string };
  className?: string;
}

/** Estado vacío útil: ícono, una frase y, si aplica, la siguiente acción. */
export function EstadoVacio({ icono: Icono, texto, accion, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-canvas/60 px-4 py-6 text-center", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
        <Icono className="h-5 w-5" />
      </span>
      <p className="max-w-sm text-sm text-muted-foreground">{texto}</p>
      {accion ? (
        <Button asChild variant="secondary" className="min-h-11">
          <Link href={accion.href}>{accion.etiqueta}</Link>
        </Button>
      ) : null}
    </div>
  );
}
