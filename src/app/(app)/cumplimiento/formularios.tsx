"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, CampoTextoLargo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { CANALES, FINALIDADES } from "@/domain/consentimientos";
import { ETIQUETA_CANAL, ETIQUETA_FINALIDAD, ETIQUETA_TIPO_SOLICITUD } from "@/lib/formato";
import type { ResultadoForm } from "@/lib/formularios";
import {
  anonimizarYAtender,
  cambiarEstadoSolicitud,
  crearSolicitud,
  guardarPolitica,
  otorgarConsentimiento,
  retirarConsentimiento,
} from "./actions";

function Mensaje({ r }: { r: ResultadoForm }) {
  if (r.error) {
    return (
      <p role="alert" className="text-sm font-semibold text-destructive">
        {r.error}
      </p>
    );
  }
  return r.ok ? (
    <p role="status" className="text-sm font-semibold text-success">
      {r.mensaje ?? "Guardado."}
    </p>
  ) : null;
}

/** Retirar un consentimiento: un solo botón, sin confirmación intermedia. */
export function BotonRetirar({ consentimientoId, etiqueta }: { consentimientoId: string; etiqueta: string }) {
  const [resultado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(retirarConsentimiento, {});
  return (
    <form action={despachar} className="flex flex-col items-start gap-1">
      <input type="hidden" name="consentimientoId" value={consentimientoId} />
      <Button type="submit" variant="secondary" disabled={pendiente} aria-label={`Retirar consentimiento ${etiqueta}`}>
        {pendiente ? "Retirando..." : "Retirar"}
      </Button>
      <Mensaje r={resultado} />
    </form>
  );
}

export function FormularioConsentimiento({ clienteId }: { clienteId: string }) {
  const [resultado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(otorgarConsentimiento, {});
  return (
    <form action={despachar} className="no-imprimir mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
      <input type="hidden" name="clienteId" value={clienteId} />
      <CampoSelect id={`finalidad-${clienteId}`} name="finalidad" etiqueta="Finalidad" defaultValue="SERVICIO" error={resultado.errores?.finalidad?.[0]}>
        {FINALIDADES.map((f) => (
          <option key={f} value={f}>
            {ETIQUETA_FINALIDAD[f]}
          </option>
        ))}
      </CampoSelect>
      <CampoSelect id={`canal-${clienteId}`} name="canal" etiqueta="Canal" defaultValue="TELEFONO" error={resultado.errores?.canal?.[0]}>
        {CANALES.map((c) => (
          <option key={c} value={c}>
            {ETIQUETA_CANAL[c]}
          </option>
        ))}
      </CampoSelect>
      <Button type="submit" disabled={pendiente}>
        {pendiente ? "Guardando..." : "Registrar consentimiento"}
      </Button>
      <div className="w-full">
        <Mensaje r={resultado} />
      </div>
    </form>
  );
}

export function FormularioSolicitud({ documentoInicial }: { documentoInicial: string }) {
  const [resultado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(crearSolicitud, {});
  const v = resultado.valores ?? {};
  return (
    <form action={despachar} className="flex max-w-xl flex-col gap-4" noValidate>
      <Campo
        id="documento"
        name="documento"
        etiqueta="Documento del cliente (titular)"
        defaultValue={v.documento ?? documentoInicial}
        error={resultado.errores?.documento?.[0]}
        autoComplete="off"
        required
      />
      <CampoSelect id="tipo" name="tipo" etiqueta="Tipo de solicitud" defaultValue={v.tipo ?? "ACCESO"} error={resultado.errores?.tipo?.[0]}>
        {(["ACCESO", "RECTIFICACION", "SUPRESION"] as const).map((t) => (
          <option key={t} value={t}>
            {ETIQUETA_TIPO_SOLICITUD[t]}
          </option>
        ))}
      </CampoSelect>
      <CampoTextoLargo
        id="detalle"
        name="detalle"
        etiqueta="Detalle de lo que pide el titular (opcional)"
        defaultValue={v.detalle}
        error={resultado.errores?.detalle?.[0]}
      />
      <div>
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Registrando..." : "Registrar solicitud"}
        </Button>
      </div>
      <Mensaje r={resultado} />
    </form>
  );
}

/** Acciones de una solicitud abierta: iniciar atención, atender o rechazar con motivo. */
export function AccionesSolicitud({ solicitudId, puedeAtender, enProceso }: { solicitudId: string; puedeAtender: boolean; enProceso: boolean }) {
  const [resultado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(cambiarEstadoSolicitud, {});
  return (
    <form action={despachar} className="no-imprimir flex max-w-xl flex-col gap-3">
      <input type="hidden" name="solicitudId" value={solicitudId} />
      <CampoTextoLargo
        id="resolucion"
        name="resolucion"
        etiqueta="Respuesta al titular o motivo del rechazo"
        ayuda="Para rechazar, el motivo es obligatorio."
        error={resultado.errores?.resolucion?.[0]}
      />
      <div className="flex flex-wrap gap-2">
        {enProceso ? null : (
          <Button type="submit" name="hacia" value="EN_PROCESO" variant="secondary" disabled={pendiente}>
            Iniciar atención
          </Button>
        )}
        {puedeAtender ? (
          <Button type="submit" name="hacia" value="ATENDIDA" disabled={pendiente}>
            Marcar como atendida
          </Button>
        ) : null}
        <Button type="submit" name="hacia" value="RECHAZADA" variant="secondary" disabled={pendiente}>
          Rechazar
        </Button>
      </div>
      <Mensaje r={resultado} />
    </form>
  );
}

export function FormularioSupresion({ solicitudId }: { solicitudId: string }) {
  const [resultado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(anonimizarYAtender, {});
  return (
    <form action={despachar} className="no-imprimir flex max-w-xl flex-col gap-3 rounded border border-destructive/40 p-4">
      <input type="hidden" name="solicitudId" value={solicitudId} />
      <p className="text-sm">
        Esta acción <strong>anonimiza de forma irreversible</strong> los datos personales del cliente y sus contactos, retira todos sus consentimientos y
        deja el cliente dado de baja. Los pedidos se conservan sin identificar a nadie.
      </p>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="confirmar" className="size-5" />
        Confirmo que verifiqué la identidad del titular y que procede la supresión
      </label>
      {resultado.errores?.confirmar?.[0] ? <p className="text-sm font-semibold text-destructive">{resultado.errores.confirmar[0]}</p> : null}
      <div>
        <Button type="submit" variant="destructive" disabled={pendiente}>
          {pendiente ? "Anonimizando..." : "Anonimizar y atender"}
        </Button>
      </div>
      <Mensaje r={resultado} />
    </form>
  );
}

export function FormularioPolitica({ contenido }: { contenido: string }) {
  const [resultado, despachar, pendiente] = useActionState<ResultadoForm, FormData>(guardarPolitica, {});
  return (
    <form action={despachar} className="flex max-w-3xl flex-col gap-3">
      <CampoTextoLargo
        id="texto-politica"
        name="contenido"
        etiqueta="Texto de la política de privacidad"
        ayuda="Cada guardado crea una versión nueva; la anterior queda en el historial."
        defaultValue={resultado.valores?.contenido ?? contenido}
        error={resultado.errores?.contenido?.[0]}
        rows={18}
      />
      <div>
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : "Guardar política"}
        </Button>
      </div>
      <Mensaje r={resultado} />
    </form>
  );
}
