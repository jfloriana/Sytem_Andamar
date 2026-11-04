import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, type Accion, type Recurso } from "@/lib/permisos";
import { esRol, type Rol } from "@/lib/roles";

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

/** Usuario de la sesión, verificado contra la base: una baja surte efecto de inmediato. */
export async function usuarioActual(): Promise<UsuarioSesion | null> {
  const sesion = await auth();
  const id = sesion?.user?.id;
  if (!id) return null;
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  });
  if (!usuario || !usuario.activo || !esRol(usuario.rol)) return null;
  return { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
}

/** Exige sesión y permiso; si falta sesión va al login, si falta permiso a /sin-permiso. */
export async function requerir(accion: Accion, recurso: Recurso): Promise<UsuarioSesion> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  if (!can(usuario, accion, recurso)) redirect("/sin-permiso");
  return usuario;
}
