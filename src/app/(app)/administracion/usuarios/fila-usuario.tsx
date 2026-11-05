"use client";

import { useActionState } from "react";
import { cambiarActivo, cambiarRol, type ResultadoUsuario } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { ETIQUETA_ROL, ROLES, type Rol } from "@/lib/roles";

export interface UsuarioFila {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  jefe: string | null;
  esYo: boolean;
}

export function FilaUsuario({ usuario }: { usuario: UsuarioFila }) {
  const [estadoRol, accionRol, pendienteRol] = useActionState<ResultadoUsuario, FormData>(cambiarRol, {});
  const [estadoActivo, accionActivo, pendienteActivo] = useActionState<ResultadoUsuario, FormData>(
    cambiarActivo,
    {},
  );
  const error = estadoRol.error ?? estadoActivo.error;
  const etiquetaRol = `Rol de ${usuario.nombre}`;

  return (
    <TableRow>
      <TableCell etiqueta="Nombre" className="font-semibold">{usuario.nombre}</TableCell>
      <TableCell etiqueta="Correo">{usuario.email}</TableCell>
      <TableCell etiqueta="Rol">
        <form action={accionRol} className="flex items-center gap-2">
          <input type="hidden" name="usuarioId" value={usuario.id} />
          <Select
            name="rol"
            defaultValue={usuario.rol}
            aria-label={etiquetaRol}
            disabled={usuario.esYo}
            className="w-44"
          >
            {ROLES.map((rol) => (
              <option key={rol} value={rol}>
                {ETIQUETA_ROL[rol]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" disabled={usuario.esYo || pendienteRol}>
            Guardar rol
          </Button>
        </form>
      </TableCell>
      <TableCell etiqueta="Jefe">{usuario.jefe ?? "-"}</TableCell>
      <TableCell etiqueta="Estado">
        <Badge variant={usuario.activo ? "success" : "destructive"}>{usuario.activo ? "Activo" : "Inactivo"}</Badge>
      </TableCell>
      <TableCell etiqueta="Acciones">
        <form
          action={accionActivo}
          onSubmit={(ev) => {
            const mensaje = usuario.activo
              ? `¿Desactivar a ${usuario.nombre}? No podrá iniciar sesión.`
              : `¿Reactivar a ${usuario.nombre}?`;
            if (!window.confirm(mensaje)) ev.preventDefault();
          }}
        >
          <input type="hidden" name="usuarioId" value={usuario.id} />
          <input type="hidden" name="activo" value={String(!usuario.activo)} />
          <Button
            type="submit"
            variant={usuario.activo ? "destructive" : "secondary"}
            disabled={usuario.esYo || pendienteActivo}
          >
            {usuario.activo ? "Desactivar" : "Reactivar"}
          </Button>
        </form>
        {error ? (
          <p role="alert" className="mt-1 text-xs font-semibold text-destructive">
            {error}
          </p>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
