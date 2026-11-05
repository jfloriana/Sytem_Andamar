"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ResultadoForm } from "@/lib/formularios";
import { cambiarEstadoPedido } from "./actions";

interface Props {
  pedidoId: string;
  estado: "ENTREGADO" | "ANULADO";
  descripcion: string;
}

/** Entregar o anular un pedido; anular pide confirmación porque el pedido deja de contar en los cálculos. */
export function BotonEstadoPedido({ pedidoId, estado, descripcion }: Props) {
  const [resultado, accion, pendiente] = useActionState<ResultadoForm, FormData>(cambiarEstadoPedido, {});
  const anular = estado === "ANULADO";
  return (
    <form
      action={accion}
      onSubmit={(ev) => {
        if (anular && !window.confirm(`¿Anular ${descripcion}? Dejará de contar en los cálculos.`)) ev.preventDefault();
      }}
    >
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <input type="hidden" name="estado" value={estado} />
      <Button type="submit" variant={anular ? "destructive" : "secondary"} disabled={pendiente} aria-label={`${anular ? "Anular" : "Marcar entregado"}: ${descripcion}`}>
        {anular ? "Anular" : "Marcar entregado"}
      </Button>
      {resultado.error ? (
        <p role="alert" className="mt-1 text-xs font-semibold text-destructive">
          {resultado.error}
        </p>
      ) : null}
    </form>
  );
}
