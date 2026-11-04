"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});

  return (
    <form action={accion} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={estado.error ? true : undefined}
          aria-describedby={estado.error ? "error-login" : undefined}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={estado.error ? true : undefined}
          aria-describedby={estado.error ? "error-login" : undefined}
        />
      </div>
      {estado.error ? (
        <p id="error-login" role="alert" className="text-sm font-semibold text-destructive">
          {estado.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pendiente}>
        {pendiente ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}
