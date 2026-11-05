"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Campo, CampoSelect, CampoTextoLargo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import type { ResultadoForm } from "@/lib/formularios";
import { crearCaso } from "./actions";

interface Props {
  clientes: { id: string; razonSocial: string }[];
  responsables: { id: string; nombre: string }[];
  /** El jefe elige responsable; el ejecutivo queda como responsable de lo que registra. */
  puedeElegirResponsable: boolean;
  clienteId: string;
  cancelar: string;
}

const PRIORIDADES = [
  { valor: "BAJA", etiqueta: "Baja" },
  { valor: "MEDIA", etiqueta: "Media" },
  { valor: "ALTA", etiqueta: "Alta" },
  { valor: "URGENTE", etiqueta: "Urgente" },
];

export function FormularioCaso({ clientes, responsables, puedeElegirResponsable, clienteId, cancelar }: Props) {
  const [estado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(crearCaso, {});
  const valor = (campo: string, defecto = "") => estado.valores?.[campo] ?? defecto;
  const error = (campo: string) => estado.errores?.[campo]?.[0] ?? null;

  return (
    <form action={despachar} noValidate className="flex max-w-xl flex-col gap-4">
      <CampoSelect id="clienteId" name="clienteId" etiqueta="Cliente" defaultValue={valor("clienteId", clienteId)} error={error("clienteId")} required>
        <option value="">Elige un cliente</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.razonSocial}
          </option>
        ))}
      </CampoSelect>
      <Campo id="titulo" name="titulo" etiqueta="Título" defaultValue={valor("titulo")} error={error("titulo")} autoComplete="off" required />
      <CampoTextoLargo id="descripcion" name="descripcion" etiqueta="Descripción" defaultValue={valor("descripcion")} error={error("descripcion")} required />
      <CampoSelect id="prioridad" name="prioridad" etiqueta="Prioridad" defaultValue={valor("prioridad", "MEDIA")} error={error("prioridad")}>
        {PRIORIDADES.map((p) => (
          <option key={p.valor} value={p.valor}>
            {p.etiqueta}
          </option>
        ))}
      </CampoSelect>
      {puedeElegirResponsable ? (
        <CampoSelect
          id="responsableId"
          name="responsableId"
          etiqueta="Responsable"
          defaultValue={valor("responsableId")}
          error={error("responsableId")}
          ayuda="Tiene 24 horas desde la apertura para dar la primera respuesta."
          required
        >
          <option value="">Elige un responsable</option>
          {responsables.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </CampoSelect>
      ) : (
        <p className="text-sm text-muted-foreground">Tú serás el responsable. Tienes 24 horas desde la apertura para dar la primera respuesta.</p>
      )}
      {estado.error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {estado.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : "Registrar caso"}
        </Button>
        <Button asChild variant="secondary">
          <Link href={cancelar}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
