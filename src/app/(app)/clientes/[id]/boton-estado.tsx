"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { cambiarEstadoCliente, type ResultadoCliente } from "../actions";

export function BotonEstadoCliente({ clienteId, inactivo, nombre }: { clienteId: string; inactivo: boolean; nombre: string }) {
  const [estado, accion, pendiente] = useActionState<ResultadoCliente, FormData>(cambiarEstadoCliente, {});
  return (
    <form
      action={accion}
      onSubmit={(ev) => {
        const mensaje = inactivo ? `¿Reactivar a ${nombre}?` : `¿Dar de baja a ${nombre}? Se conserva su historial.`;
        if (!window.confirm(mensaje)) ev.preventDefault();
      }}
    >
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="accion" value={inactivo ? "reactivar" : "baja"} />
      <Button type="submit" variant={inactivo ? "secondary" : "destructive"} disabled={pendiente}>
        {inactivo ? "Reactivar cliente" : "Dar de baja"}
      </Button>
      {estado.error ? (
        <p role="alert" className="mt-1 text-xs font-semibold text-destructive">
          {estado.error}
        </p>
      ) : null}
    </form>
  );
}
