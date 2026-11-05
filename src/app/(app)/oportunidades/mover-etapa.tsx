"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CampoSelect, CampoTextoLargo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import type { Etapa } from "@/domain/oportunidades";
import { enviar } from "@/lib/enviar";
import type { ResultadoForm } from "@/lib/formularios";
import { cambiarEtapa } from "./actions";

interface Props {
  oportunidadId: string;
  titulo: string;
  destinos: { valor: Etapa; etiqueta: string }[];
}

function Dialogo({ oportunidadId, titulo, destinos, alCerrar }: Props & { alCerrar: () => void }) {
  const [estado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(cambiarEtapa, {});
  const [etapa, setEtapa] = useState("");
  const dialogo = useRef<HTMLDialogElement>(null);
  const idBase = `mover-${oportunidadId}`;

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);
  useEffect(() => {
    if (estado.ok) alCerrar();
  }, [estado.ok, alCerrar]);

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${idBase}-titulo`}
      onClose={alCerrar}
      className="w-[min(92vw,28rem)] rounded border bg-background p-0 text-foreground backdrop:bg-black/40"
    >
      <form onSubmit={enviar(despachar)} noValidate className="flex flex-col gap-4 p-4 md:p-6">
        <h2 id={`${idBase}-titulo`} className="text-xl font-semibold">
          Mover «{titulo}»
        </h2>
        <input type="hidden" name="oportunidadId" value={oportunidadId} />
        <CampoSelect
          id={`${idBase}-etapa`}
          name="etapa"
          etiqueta="Nueva etapa"
          value={etapa}
          onChange={(ev) => setEtapa(ev.target.value)}
          error={estado.errores?.etapa?.[0]}
        >
          <option value="">Elige la etapa</option>
          {destinos.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.etiqueta}
            </option>
          ))}
        </CampoSelect>
        {etapa === "PERDIDA" ? (
          <CampoTextoLargo
            id={`${idBase}-motivo`}
            name="motivoPerdida"
            etiqueta="Motivo de la pérdida"
            ayuda="Obligatorio al marcar la oportunidad como perdida."
            aria-required="true"
            defaultValue={estado.valores?.motivoPerdida ?? ""}
            error={estado.errores?.motivoPerdida?.[0]}
          />
        ) : null}
        {estado.error ? (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {estado.error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pendiente}>
            {pendiente ? "Guardando..." : "Mover"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => dialogo.current?.close()}>
            Cancelar
          </Button>
        </div>
      </form>
    </dialog>
  );
}

/** Botón «Mover etapa»: abre un diálogo con las etapas posibles y pide el motivo si se marca como perdida. */
export function MoverEtapa(props: Props) {
  const [abierto, setAbierto] = useState(false);
  if (props.destinos.length === 0) return null;
  return (
    <>
      <Button type="button" variant="secondary" aria-haspopup="dialog" onClick={() => setAbierto(true)}>
        Mover etapa
      </Button>
      {abierto ? <Dialogo {...props} alCerrar={() => setAbierto(false)} /> : null}
    </>
  );
}
