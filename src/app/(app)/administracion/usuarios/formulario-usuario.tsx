"use client";

import { useActionState } from "react";
import { crearUsuario, type ResultadoUsuario } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ETIQUETA_ROL, ROLES } from "@/lib/roles";

interface Props {
  jefes: { id: string; nombre: string }[];
}

function Error({ id, mensajes }: { id: string; mensajes?: string[] }) {
  if (!mensajes?.length) return null;
  return (
    <p id={id} className="text-sm font-semibold text-destructive">
      {mensajes[0]}
    </p>
  );
}

export function FormularioUsuario({ jefes }: Props) {
  const [estado, accion, pendiente] = useActionState<ResultadoUsuario, FormData>(crearUsuario, {});
  const e = estado.errores ?? {};

  return (
    <form action={accion} className="grid gap-4 md:grid-cols-2" noValidate>
      <div className="flex flex-col gap-1">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required aria-invalid={!!e.nombre} aria-describedby="e-nombre" />
        <Error id="e-nombre" mensajes={e.nombre} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="nuevo-email">Correo</Label>
        <Input
          id="nuevo-email"
          name="email"
          type="email"
          autoComplete="off"
          required
          aria-invalid={!!e.email}
          aria-describedby="e-email"
        />
        <Error id="e-email" mensajes={e.email} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="nueva-password">Contraseña inicial</Label>
        <Input
          id="nueva-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!e.password}
          aria-describedby="ayuda-password e-password"
        />
        <p id="ayuda-password" className="text-xs text-muted-foreground">
          Mínimo 10 caracteres.
        </p>
        <Error id="e-password" mensajes={e.password} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="nuevo-rol">Rol</Label>
        <Select id="nuevo-rol" name="rol" defaultValue="VENDEDOR" aria-describedby="e-rol">
          {ROLES.map((rol) => (
            <option key={rol} value={rol}>
              {ETIQUETA_ROL[rol]}
            </option>
          ))}
        </Select>
        <Error id="e-rol" mensajes={e.rol} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="nuevo-jefe">Jefe de ventas (solo vendedores)</Label>
        <Select id="nuevo-jefe" name="jefeId" defaultValue="" aria-describedby="e-jefe">
          <option value="">Sin jefe</option>
          {jefes.map((j) => (
            <option key={j.id} value={j.id}>
              {j.nombre}
            </option>
          ))}
        </Select>
        <Error id="e-jefe" mensajes={e.jefeId} />
      </div>
      <div className="flex flex-col justify-end gap-2">
        {estado.ok ? (
          <p role="status" className="text-sm font-semibold text-success">
            Usuario creado.
          </p>
        ) : null}
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
