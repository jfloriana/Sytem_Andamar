"use client";

import { useActionState } from "react";
import { CampoSelect } from "@/components/campo";
import { Button } from "@/components/ui/button";
import type { ResultadoForm } from "@/lib/formularios";
import { cerrarCasoAccion, reasignarCaso, responderCaso, resolverCasoAccion } from "./actions";

type Accion = (previo: ResultadoForm, datos: FormData) => Promise<ResultadoForm>;

function Resultado({ r }: { r: ResultadoForm }) {
  if (r.error) {
    return (
      <p role="alert" className="text-sm font-semibold text-destructive">
        {r.error}
      </p>
    );
  }
  return r.ok ? (
    <p role="status" className="text-sm font-semibold text-success">
      Guardado.
    </p>
  ) : null;
}

function FormularioSimple({ accion, casoId, texto, variante = "secondary", children }: {
  accion: Accion;
  casoId: string;
  texto: string;
  variante?: "default" | "secondary";
  children?: React.ReactNode;
}) {
  const [resultado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(accion, {});
  return (
    <form action={despachar} className="flex flex-col items-start gap-2">
      <input type="hidden" name="casoId" value={casoId} />
      {children}
      <Button type="submit" variant={variante} disabled={pendiente}>
        {pendiente ? "Guardando..." : texto}
      </Button>
      <Resultado r={resultado} />
    </form>
  );
}

interface Props {
  casoId: string;
  puedeResponder: boolean;
  puedeResolver: boolean;
  puedeCerrar: boolean;
  /** Si no hay primera respuesta, resolver puede contar como resolución en el primer contacto. */
  sinPrimeraRespuesta: boolean;
  responsables: { id: string; nombre: string }[];
  responsableActual: string;
  puedeReasignar: boolean;
}

export function AccionesCaso(p: Props) {
  const [reasignado, reasignar, pendiente] = useActionState<ResultadoForm, FormData>(reasignarCaso, {});
  return (
    <div className="no-imprimir flex flex-col gap-6">
      {p.puedeResponder ? <FormularioSimple accion={responderCaso} casoId={p.casoId} texto="Registrar primera respuesta" /> : null}
      {p.puedeResolver ? (
        <FormularioSimple accion={resolverCasoAccion} casoId={p.casoId} texto="Marcar como resuelto" variante="default">
          {p.sinPrimeraRespuesta ? (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="primerContacto" className="size-5" />
              Resuelto en el primer contacto
            </label>
          ) : null}
        </FormularioSimple>
      ) : null}
      {p.puedeCerrar ? <FormularioSimple accion={cerrarCasoAccion} casoId={p.casoId} texto="Cerrar caso" /> : null}
      {p.puedeReasignar ? (
        <form action={reasignar} className="flex max-w-sm flex-col items-start gap-2">
          <input type="hidden" name="casoId" value={p.casoId} />
          <CampoSelect
            id="responsableId"
            name="responsableId"
            etiqueta="Reasignar a"
            defaultValue={p.responsableActual}
            error={reasignado.errores?.responsableId?.[0]}
            className="w-full"
          >
            {p.responsables.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </CampoSelect>
          <Button type="submit" variant="secondary" disabled={pendiente}>
            {pendiente ? "Guardando..." : "Reasignar"}
          </Button>
          <Resultado r={reasignado} />
        </form>
      ) : null}
    </div>
  );
}
