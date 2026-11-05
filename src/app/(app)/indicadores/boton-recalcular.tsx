"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ResultadoForm } from "@/lib/formularios";
import { recalcularAhora } from "./actions";

/** Botón de demostración para ADMIN: recalcula segmentos, riesgo y casos vencidos sin esperar al cron. */
export function BotonRecalcular() {
  const [resultado, accion, pendiente] = useActionState<ResultadoForm, FormData>(() => recalcularAhora(), {});
  return (
    <form action={accion} className="flex flex-col gap-2">
      <Button type="submit" disabled={pendiente}>
        {pendiente ? "Recalculando..." : "Recalcular ahora"}
      </Button>
      <div role="status" aria-live="polite" className="text-sm">
        {resultado.mensaje ? <p>{resultado.mensaje}</p> : null}
        {resultado.error ? <p className="font-semibold text-destructive">{resultado.error}</p> : null}
      </div>
    </form>
  );
}
