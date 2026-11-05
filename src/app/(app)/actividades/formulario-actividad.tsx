"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Campo, CampoSelect, CampoTextoLargo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { enviar } from "@/lib/enviar";
import type { ResultadoForm } from "@/lib/formularios";
import { crearActividad } from "./actions";

interface Props {
  clientes: { id: string; razonSocial: string }[];
  inicial: { tipo: string; clienteId: string; oportunidadId: string };
  oportunidadTitulo?: string;
  cancelar: string;
}

const TIPOS = [
  { valor: "VISITA", etiqueta: "Visita" },
  { valor: "LLAMADA", etiqueta: "Llamada" },
  { valor: "MENSAJE", etiqueta: "Mensaje" },
  { valor: "TAREA", etiqueta: "Tarea con recordatorio" },
];

/** Registro rápido: elegir cliente y escribir el resultado ya basta para guardar una visita. */
export function FormularioActividad({ clientes, inicial, oportunidadTitulo, cancelar }: Props) {
  const [estado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(crearActividad, {});
  const [tipo, setTipo] = useState(estado.valores?.tipo ?? inicial.tipo);
  const valor = (campo: string, defecto = "") => estado.valores?.[campo] ?? defecto;
  const error = (campo: string) => estado.errores?.[campo]?.[0] ?? null;

  return (
    <form onSubmit={enviar(despachar)} noValidate className="flex max-w-xl flex-col gap-4">
      {inicial.oportunidadId ? <input type="hidden" name="oportunidadId" value={inicial.oportunidadId} /> : null}
      {oportunidadTitulo ? (
        <p className="rounded border bg-muted p-3 text-sm">
          Se vinculará a la oportunidad <span className="font-semibold">{oportunidadTitulo}</span>.
        </p>
      ) : null}
      <CampoSelect id="clienteId" name="clienteId" etiqueta="Cliente" defaultValue={valor("clienteId", inicial.clienteId)} error={error("clienteId")} required>
        <option value="">Elige un cliente</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.razonSocial}
          </option>
        ))}
      </CampoSelect>
      <CampoSelect id="tipo" name="tipo" etiqueta="Tipo" value={tipo} onChange={(ev) => setTipo(ev.target.value)} error={error("tipo")}>
        {TIPOS.map((t) => (
          <option key={t.valor} value={t.valor}>
            {t.etiqueta}
          </option>
        ))}
      </CampoSelect>
      <CampoTextoLargo
        id="resultado"
        name="resultado"
        etiqueta={tipo === "TAREA" ? "Qué hay que hacer" : "Resultado"}
        defaultValue={valor("resultado")}
        error={error("resultado")}
        placeholder={tipo === "TAREA" ? "Ej.: enviar la propuesta ajustada" : "Ej.: Quedó en confirmar el pedido el lunes"}
      />
      {tipo === "TAREA" ? (
        <Campo
          id="recordatorioAt"
          name="recordatorioAt"
          type="datetime-local"
          etiqueta="Recordatorio"
          ayuda="Hora de Lima. Aparecerá en «Mi día» y se marcará vencida al pasar."
          defaultValue={valor("recordatorioAt")}
          error={error("recordatorioAt")}
          required
        />
      ) : (
        <Campo
          id="fecha"
          name="fecha"
          type="datetime-local"
          etiqueta="Fecha y hora (opcional)"
          ayuda="Hora de Lima. Si la dejas vacía se usa el momento actual."
          defaultValue={valor("fecha")}
          error={error("fecha")}
        />
      )}
      {estado.error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {estado.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : tipo === "TAREA" ? "Guardar tarea" : tipo === "VISITA" ? "Guardar visita" : "Guardar actividad"}
        </Button>
        <Button asChild variant="secondary">
          <Link href={cancelar}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
