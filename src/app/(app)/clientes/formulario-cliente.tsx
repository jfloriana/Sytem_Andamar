"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { Campo, CampoSelect } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { clienteEdicionSchema, clienteSchema } from "@/lib/validaciones/cliente";
import type { ResultadoCliente } from "./actions";

type Accion = (previo: ResultadoCliente, datos: FormData) => Promise<ResultadoCliente>;

interface Props {
  accion: Accion;
  modo: "crear" | "editar";
  vendedores: { id: string; nombre: string }[];
  /** Solo se puede cambiar el vendedor si el rol puede reasignar. */
  puedeElegirVendedor: boolean;
  inicial?: Partial<Record<CampoCliente, string>>;
  clienteId?: string;
  cancelar: string;
}

type CampoCliente =
  | "documento"
  | "razonSocial"
  | "direccion"
  | "telefono"
  | "email"
  | "vendedorId"
  | "contactoNombre"
  | "contactoCargo"
  | "contactoTelefono"
  | "contactoEmail";

type Errores = Partial<Record<string, string>>;

const CAMPOS_VACIOS: Record<CampoCliente, string> = {
  documento: "",
  razonSocial: "",
  direccion: "",
  telefono: "",
  email: "",
  vendedorId: "",
  contactoNombre: "",
  contactoCargo: "",
  contactoTelefono: "",
  contactoEmail: "",
};

/** Validación con el mismo esquema Zod del servidor; devuelve el primer mensaje de cada campo. */
function validar(modo: Props["modo"], valores: Record<string, string>): Errores {
  const r =
    modo === "crear"
      ? clienteSchema.safeParse(valores)
      : clienteEdicionSchema.safeParse(valores);
  if (r.success) return {};
  const campos = r.error.flatten().fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v?.[0]]));
}

export function FormularioCliente({ accion, modo, vendedores, puedeElegirVendedor, inicial, clienteId, cancelar }: Props) {
  const [estado, despachar, pendiente] = useActionState<ResultadoCliente, FormData>(accion, {});
  const [valores, setValores] = useState<Record<string, string>>({
    ...CAMPOS_VACIOS,
    vendedorId: vendedores.length === 1 ? vendedores[0].id : "",
    ...inicial,
  });
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const formulario = useRef<HTMLFormElement>(null);

  const locales = validar(modo, valores);
  const error = (campo: string): string | null =>
    (tocados[campo] ? locales[campo] : undefined) ?? estado.errores?.[campo]?.[0] ?? null;

  const cambiar = (campo: string) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValores((v) => ({ ...v, [campo]: ev.target.value }));
  const tocar = (campo: string) => () => setTocados((t) => ({ ...t, [campo]: true }));
  const props = (campo: CampoCliente) => ({
    id: campo,
    name: campo,
    value: valores[campo],
    onChange: cambiar(campo),
    onBlur: tocar(campo),
    error: error(campo),
  });

  function enviar(confirmarDuplicados: boolean) {
    const invalidos = Object.keys(locales);
    if (invalidos.length > 0) {
      setTocados(Object.fromEntries(invalidos.map((k) => [k, true])));
      formulario.current?.querySelector<HTMLElement>(`[name="${invalidos[0]}"]`)?.focus();
      return;
    }
    const datos = new FormData();
    for (const [k, v] of Object.entries(valores)) datos.set(k, v);
    if (clienteId) datos.set("clienteId", clienteId);
    if (confirmarDuplicados) datos.set("confirmarDuplicados", "1");
    startTransition(() => despachar(datos));
  }

  return (
    <form
      ref={formulario}
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        enviar(false);
      }}
      className="flex flex-col gap-6"
    >
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-xl font-semibold">Datos del cliente</legend>
        <Campo {...props("documento")} etiqueta="Documento" autoComplete="off" inputMode="text" ayuda="RUC, DNI u otro documento. Debe ser único." required />
        <Campo {...props("razonSocial")} etiqueta="Razón social" autoComplete="organization" required />
        <Campo {...props("direccion")} etiqueta="Dirección" autoComplete="street-address" required className="md:col-span-2" />
        <Campo {...props("telefono")} etiqueta="Teléfono" type="tel" inputMode="tel" autoComplete="tel" />
        <Campo {...props("email")} etiqueta="Correo" type="email" autoComplete="email" spellCheck={false} />
        {vendedores.length > 0 ? (
          <CampoSelect
            {...props("vendedorId")}
            etiqueta="Vendedor asignado"
            disabled={!puedeElegirVendedor}
            ayuda={
              puedeElegirVendedor
                ? undefined
                : modo === "crear"
                  ? "Los clientes nuevos se asignan a tu cartera."
                  : "Solo un jefe de ventas puede reasignar el cliente."
            }
          >
            <option value="">Elige un vendedor</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </CampoSelect>
        ) : null}
      </fieldset>

      {modo === "crear" ? (
        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-2 text-xl font-semibold">Contacto principal (opcional)</legend>
          <Campo {...props("contactoNombre")} etiqueta="Nombre del contacto" autoComplete="off" />
          <Campo {...props("contactoCargo")} etiqueta="Cargo" autoComplete="off" />
          <Campo {...props("contactoTelefono")} etiqueta="Teléfono del contacto" type="tel" inputMode="tel" autoComplete="off" />
          <Campo {...props("contactoEmail")} etiqueta="Correo del contacto" type="email" autoComplete="off" spellCheck={false} />
        </fieldset>
      ) : null}

      {estado.error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {estado.error}
        </p>
      ) : null}

      {estado.avisos?.length ? (
        <div role="alert" className="rounded border border-warning bg-warning/10 p-4">
          <p className="font-semibold text-warning">Posible duplicado</p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {estado.avisos.map((a) => (
              <li key={a.texto}>{a.texto}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm">Revisa los datos o confirma que es otro cliente.</p>
          <Button type="button" variant="secondary" className="mt-3" disabled={pendiente} onClick={() => enviar(true)}>
            Guardar de todos modos
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : modo === "crear" ? "Crear cliente" : "Guardar cambios"}
        </Button>
        <Button asChild variant="secondary">
          <Link href={cancelar}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
