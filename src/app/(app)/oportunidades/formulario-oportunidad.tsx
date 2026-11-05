"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Campo, CampoSelect } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { enviar } from "@/lib/enviar";
import type { ResultadoForm } from "@/lib/formularios";

type Accion = (previo: ResultadoForm, datos: FormData) => Promise<ResultadoForm>;

interface Props {
  accion: Accion;
  modo: "crear" | "editar";
  clientes?: { id: string; razonSocial: string }[];
  /** Vendedores a los que se puede reasignar (solo si el rol puede reasignar). */
  vendedores?: { id: string; nombre: string }[];
  inicial?: Record<string, string>;
  oportunidadId?: string;
  cancelar: string;
}

export function FormularioOportunidad({ accion, modo, clientes = [], vendedores = [], inicial = {}, oportunidadId, cancelar }: Props) {
  const [estado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(accion, {});
  const valor = (campo: string) => estado.valores?.[campo] ?? inicial[campo] ?? "";
  const error = (campo: string) => estado.errores?.[campo]?.[0] ?? null;

  return (
    <form onSubmit={enviar(despachar)} noValidate className="flex max-w-xl flex-col gap-4">
      {oportunidadId ? <input type="hidden" name="oportunidadId" value={oportunidadId} /> : null}
      {modo === "crear" ? (
        <CampoSelect id="clienteId" name="clienteId" etiqueta="Cliente" defaultValue={valor("clienteId")} error={error("clienteId")} required>
          <option value="">Elige un cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razonSocial}
            </option>
          ))}
        </CampoSelect>
      ) : null}
      <Campo id="titulo" name="titulo" etiqueta="Título" defaultValue={valor("titulo")} error={error("titulo")} autoComplete="off" required />
      <Campo
        id="montoEstimado"
        name="montoEstimado"
        etiqueta="Monto estimado (USD)"
        inputMode="decimal"
        defaultValue={valor("montoEstimado")}
        error={error("montoEstimado")}
        ayuda="Hasta 2 decimales."
        autoComplete="off"
        required
      />
      {modo === "editar" && vendedores.length > 0 ? (
        <CampoSelect id="vendedorId" name="vendedorId" etiqueta="Vendedor responsable" defaultValue={valor("vendedorId")} error={error("vendedorId")}>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </CampoSelect>
      ) : null}
      {estado.error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {estado.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : modo === "crear" ? "Crear oportunidad" : "Guardar cambios"}
        </Button>
        <Button asChild variant="secondary">
          <Link href={cancelar}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
