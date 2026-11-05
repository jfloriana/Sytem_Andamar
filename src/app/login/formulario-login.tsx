"use client";

import { useActionState, useEffect, useState } from "react";
import { iniciarSesion, type EstadoLogin } from "./actions";
import { enviar } from "@/lib/enviar";

const CAMPO =
  "block h-12 w-full rounded-xl border border-[#64748B] bg-white px-3.5 text-base text-[#0F172A] outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-[#64748B] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 aria-[invalid=true]:border-[#B42318]";

function IconoOjo({ tachado }: { tachado: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {tachado ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

export function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});
  const [visible, setVisible] = useState(false);
  const [intento, setIntento] = useState(0);

  // Cada nuevo error reinicia la animación de sacudida.
  useEffect(() => {
    if (estado.error) setIntento((n) => n + 1);
  }, [estado]);

  const describedBy = estado.error ? "error-login" : undefined;
  const invalido = estado.error ? true : undefined;
  const etiquetaToggle = visible ? "Ocultar contraseña" : "Mostrar contraseña";

  return (
    <form onSubmit={enviar(accion)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-[#0F172A]">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={invalido}
          aria-describedby={describedBy}
          className={CAMPO}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-[#0F172A]">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={invalido}
            aria-describedby={describedBy}
            className={`${CAMPO} pr-12`}
          />
          {/* El nombre accesible va como texto oculto (y no como aria-label) para que
              getByLabel("Contraseña") de las pruebas e2e siga resolviendo solo al campo. */}
          <button
            type="button"
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#475569] outline-none transition-colors duration-300 hover:text-[#0F172A] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <IconoOjo tachado={visible} />
            <span className="sr-only">{etiquetaToggle}</span>
          </button>
        </div>
      </div>
      {estado.error ? (
        <p
          key={intento}
          id="error-login"
          role="alert"
          className="login-sacude text-sm font-medium text-[#B42318]"
        >
          {estado.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pendiente}
        className="group mt-1 flex min-h-[48px] w-full items-center justify-between gap-3 rounded-full bg-primary py-1.5 pl-6 pr-1.5 text-base font-medium text-primary-foreground outline-none transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80"
      >
        <span>{pendiente ? "Verificando…" : "Ingresar"}</span>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 17 17 7M8 7h9v9" />
          </svg>
        </span>
      </button>
    </form>
  );
}
