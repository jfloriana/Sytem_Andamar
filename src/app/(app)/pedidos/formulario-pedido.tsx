"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Campo, CampoSelect } from "@/components/campo";
import { Button } from "@/components/ui/button";
import type { ResultadoForm } from "@/lib/formularios";
import { crearPedido } from "./actions";

interface Props {
  clientes: { id: string; razonSocial: string }[];
  inicial: { clienteId: string; oportunidadId: string };
  cancelar: string;
}

export function FormularioPedido({ clientes, inicial, cancelar }: Props) {
  const [estado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(crearPedido, {});
  const valor = (campo: string, defecto = "") => estado.valores?.[campo] ?? defecto;
  const error = (campo: string) => estado.errores?.[campo]?.[0] ?? null;

  return (
    <form action={despachar} noValidate className="flex max-w-xl flex-col gap-4">
      {inicial.oportunidadId ? <input type="hidden" name="oportunidadId" value={inicial.oportunidadId} /> : null}
      <CampoSelect id="clienteId" name="clienteId" etiqueta="Cliente" defaultValue={valor("clienteId", inicial.clienteId)} error={error("clienteId")} required>
        <option value="">Elige un cliente</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.razonSocial}
          </option>
        ))}
      </CampoSelect>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="monto" name="monto" etiqueta="Monto (USD)" inputMode="decimal" defaultValue={valor("monto")} error={error("monto")} autoComplete="off" required />
        <Campo
          id="margen"
          name="margen"
          etiqueta="Margen (USD)"
          inputMode="decimal"
          defaultValue={valor("margen")}
          error={error("margen")}
          ayuda="Ganancia del pedido; no puede superar el monto."
          autoComplete="off"
          required
        />
      </div>
      <Campo
        id="fecha"
        name="fecha"
        type="datetime-local"
        etiqueta="Fecha y hora del pedido (opcional)"
        ayuda="Hora de Lima. Si la dejas vacía se usa el momento actual."
        defaultValue={valor("fecha")}
        error={error("fecha")}
      />
      {estado.error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {estado.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : "Registrar pedido"}
        </Button>
        <Button asChild variant="secondary">
          <Link href={cancelar}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
