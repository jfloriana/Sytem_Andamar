"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  cambiarActivoSchema,
  cambiarRolSchema,
  crearUsuarioSchema,
} from "@/lib/validaciones/usuario";

export interface ResultadoUsuario {
  ok?: boolean;
  error?: string;
  errores?: Record<string, string[] | undefined>;
}

const RUTA = "/administracion/usuarios";

async function validarJefe(jefeId: string | undefined): Promise<string | null> {
  if (!jefeId) return null;
  const jefe = await prisma.usuario.findUnique({ where: { id: jefeId } });
  if (!jefe || !jefe.activo || jefe.rol !== "JEFE_VENTAS") {
    return "El jefe debe ser un usuario activo con rol Jefe de ventas.";
  }
  return null;
}

export async function crearUsuario(
  _previo: ResultadoUsuario,
  formData: FormData,
): Promise<ResultadoUsuario> {
  const admin = await requerir("crear", "usuario");
  const datos = crearUsuarioSchema.safeParse(Object.fromEntries(formData));
  if (!datos.success) return { errores: datos.error.flatten().fieldErrors };

  const { nombre, email, password, rol } = datos.data;
  const jefeId = rol === "VENDEDOR" ? datos.data.jefeId : undefined;
  const errorJefe = await validarJefe(jefeId);
  if (errorJefe) return { errores: { jefeId: [errorJefe] } };

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (tx) => {
      const nuevo = await tx.usuario.create({
        data: { nombre, email, passwordHash, rol, jefeId: jefeId ?? null },
      });
      await registrarAuditoria(
        {
          usuarioId: admin.id,
          accion: "CREAR_USUARIO",
          entidad: "Usuario",
          entidadId: nuevo.id,
          detalle: { nombre, email, rol, jefeId: jefeId ?? null },
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errores: { email: ["Ya existe un usuario con ese correo."] } };
    }
    throw error;
  }
  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarRol(
  _previo: ResultadoUsuario,
  formData: FormData,
): Promise<ResultadoUsuario> {
  const admin = await requerir("editar", "usuario");
  const datos = cambiarRolSchema.safeParse(Object.fromEntries(formData));
  if (!datos.success) return { error: "Datos inválidos." };
  const { usuarioId, rol } = datos.data;

  if (usuarioId === admin.id) return { error: "No puedes cambiar tu propio rol." };
  const objetivo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!objetivo) return { error: "El usuario no existe." };
  if (objetivo.rol === rol) return { ok: true };

  if (objetivo.rol === "JEFE_VENTAS") {
    const equipo = await prisma.usuario.count({ where: { jefeId: usuarioId, activo: true } });
    if (equipo > 0) return { error: "Reasigna primero a los vendedores de su equipo." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: usuarioId },
      data: { rol, ...(rol === "VENDEDOR" ? {} : { jefeId: null }) },
    });
    await registrarAuditoria(
      {
        usuarioId: admin.id,
        accion: "CAMBIAR_ROL",
        entidad: "Usuario",
        entidadId: usuarioId,
        detalle: { de: objetivo.rol, a: rol },
      },
      tx,
    );
  });
  revalidatePath(RUTA);
  return { ok: true };
}

export async function cambiarActivo(
  _previo: ResultadoUsuario,
  formData: FormData,
): Promise<ResultadoUsuario> {
  const admin = await requerir("editar", "usuario");
  const datos = cambiarActivoSchema.safeParse(Object.fromEntries(formData));
  if (!datos.success) return { error: "Datos inválidos." };
  const { usuarioId, activo } = datos.data;

  if (usuarioId === admin.id) return { error: "No puedes desactivar tu propia cuenta." };
  const objetivo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!objetivo) return { error: "El usuario no existe." };
  if (objetivo.activo === activo) return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: usuarioId },
      // Al reactivar se limpia cualquier bloqueo pendiente.
      data: { activo, ...(activo ? { intentosFallidos: 0, bloqueadoHasta: null } : {}) },
    });
    await registrarAuditoria(
      {
        usuarioId: admin.id,
        accion: activo ? "ACTIVAR_USUARIO" : "DESACTIVAR_USUARIO",
        entidad: "Usuario",
        entidadId: usuarioId,
        detalle: { email: objetivo.email },
      },
      tx,
    );
  });
  revalidatePath(RUTA);
  return { ok: true };
}
