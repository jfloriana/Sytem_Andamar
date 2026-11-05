"use client";

import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { eliminarContacto, guardarContacto, type ResultadoCliente } from "../actions";

export interface ContactoVista {
  id: string;
  nombre: string;
  cargo: string | null;
  telefono: string | null;
  email: string | null;
  principal: boolean;
}

function FormularioContacto({ clienteId, contacto }: { clienteId: string; contacto?: ContactoVista }) {
  const [estado, accion, pendiente] = useActionState<ResultadoCliente, FormData>(guardarContacto, {});
  const e = (c: string) => estado.errores?.[c]?.[0] ?? null;
  const p = contacto?.id ?? "nuevo";
  return (
    <form action={accion} className="grid gap-3 md:grid-cols-2" noValidate>
      <input type="hidden" name="clienteId" value={clienteId} />
      {contacto ? <input type="hidden" name="contactoId" value={contacto.id} /> : null}
      <Campo id={`c-${p}-nombre`} name="nombre" etiqueta="Nombre" defaultValue={contacto?.nombre} error={e("nombre")} required />
      <Campo id={`c-${p}-cargo`} name="cargo" etiqueta="Cargo" defaultValue={contacto?.cargo ?? ""} error={e("cargo")} />
      <Campo id={`c-${p}-telefono`} name="telefono" etiqueta="Teléfono" type="tel" inputMode="tel" defaultValue={contacto?.telefono ?? ""} error={e("telefono")} />
      <Campo id={`c-${p}-email`} name="email" etiqueta="Correo" type="email" spellCheck={false} defaultValue={contacto?.email ?? ""} error={e("email")} />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="principal" defaultChecked={contacto?.principal} className="size-5" />
        Contacto principal
      </label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : "Guardar contacto"}
        </Button>
        {estado.ok ? (
          <p role="status" className="text-sm font-semibold text-success">
            Contacto guardado.
          </p>
        ) : null}
        {estado.error ? (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {estado.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function EliminarContacto({ clienteId, contacto }: { clienteId: string; contacto: ContactoVista }) {
  const [estado, accion, pendiente] = useActionState<ResultadoCliente, FormData>(eliminarContacto, {});
  return (
    <form
      action={accion}
      onSubmit={(ev) => {
        if (!window.confirm(`¿Eliminar al contacto ${contacto.nombre}?`)) ev.preventDefault();
      }}
    >
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="contactoId" value={contacto.id} />
      <Button type="submit" variant="destructive" disabled={pendiente} aria-label={`Eliminar a ${contacto.nombre}`}>
        Eliminar
      </Button>
      {estado.error ? (
        <p role="alert" className="mt-1 text-xs font-semibold text-destructive">
          {estado.error}
        </p>
      ) : null}
    </form>
  );
}

export function ContactosCliente({
  clienteId,
  contactos,
  puedeEditar,
}: {
  clienteId: string;
  contactos: ContactoVista[];
  puedeEditar: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {contactos.length === 0 ? <p className="text-muted-foreground">Sin contactos registrados.</p> : null}
      <ul className="flex flex-col gap-3">
        {contactos.map((c) => (
          <li key={c.id} className="rounded border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">
                  {c.nombre} {c.principal ? <Badge variant="success">Principal</Badge> : null}
                </p>
                <p className="text-sm text-muted-foreground">{[c.cargo, c.telefono, c.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
              </div>
              {puedeEditar ? <EliminarContacto clienteId={clienteId} contacto={c} /> : null}
            </div>
            {puedeEditar ? (
              <details className="mt-2">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">Editar contacto</summary>
                <div className="pt-2">
                  <FormularioContacto clienteId={clienteId} contacto={c} />
                </div>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
      {puedeEditar ? (
        <details className="rounded border p-3">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-primary">Agregar contacto</summary>
          <div className="pt-2">
            <FormularioContacto clienteId={clienteId} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
