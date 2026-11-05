import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { can, type Accion, type RecursoConDueno } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import type { UsuarioSesion } from "@/lib/sesion";

/** El dueño de un caso es su responsable; el jefe de servicio lo ve todo por su rol, no por jerarquía. */
export function recursoCaso(c: { responsableId: string }): RecursoConDueno {
  return { tipo: "caso", propietarioId: c.responsableId, jefeDelPropietarioId: null };
}

/** Alcance de lectura: el ejecutivo ve solo sus casos; el resto de roles con permiso ve todos. */
export function filtroCasos(usuario: { id: string; rol: UsuarioSesion["rol"] }): Prisma.CasoWhereInput {
  return usuario.rol === "EJECUTIVO_SERVICIO" ? { responsableId: usuario.id } : {};
}

export type FiltroEstadoCaso = "abiertos" | "escalados" | "resueltos" | "todos";
export const FILTROS_CASO: { valor: FiltroEstadoCaso; etiqueta: string }[] = [
  { valor: "abiertos", etiqueta: "Abiertos" },
  { valor: "escalados", etiqueta: "Escalados (vencidos)" },
  { valor: "resueltos", etiqueta: "Resueltos y cerrados" },
  { valor: "todos", etiqueta: "Todos" },
];

export const esFiltroCaso = (v: string | undefined): v is FiltroEstadoCaso => FILTROS_CASO.some((f) => f.valor === v);

/**
 * Equivalente en consulta de `estadoEfectivo`: escalado = guardado como ESCALADO, o sin primera
 * respuesta, aún abierto y con la fecha límite vencida. Se calcula al leer, sin proceso de fondo.
 */
export function filtroEscalados(ahora: Date): Prisma.CasoWhereInput {
  return {
    OR: [
      { estado: "ESCALADO" },
      { estado: { in: ["ABIERTO", "EN_PROCESO"] }, primeraRespuestaAt: null, fechaLimite: { lt: ahora } },
    ],
  };
}

export function filtroPorEstado(filtro: FiltroEstadoCaso, ahora: Date): Prisma.CasoWhereInput {
  switch (filtro) {
    case "abiertos":
      return { estado: { in: ["ABIERTO", "EN_PROCESO", "ESCALADO"] } };
    case "escalados":
      return filtroEscalados(ahora);
    case "resueltos":
      return { estado: { in: ["RESUELTO", "CERRADO"] } };
    default:
      return {};
  }
}

export async function buscarCaso(id: string) {
  return prisma.caso.findUnique({
    where: { id },
    include: { cliente: { select: { id: true, razonSocial: true } }, responsable: { select: { id: true, nombre: true } } },
  });
}

export async function casoAutorizado(usuario: UsuarioSesion, id: string, accion: Accion) {
  const caso = await buscarCaso(id);
  if (!caso) notFound();
  if (!can(usuario, accion, recursoCaso(caso))) redirect("/sin-permiso");
  return caso;
}

/** Personas a las que se puede asignar un caso: el jefe elige entre el equipo de servicio; el ejecutivo, solo a sí mismo. */
export async function responsablesAsignables(usuario: UsuarioSesion) {
  if (usuario.rol === "EJECUTIVO_SERVICIO") return [{ id: usuario.id, nombre: usuario.nombre }];
  if (usuario.rol !== "JEFE_SERVICIO") return [];
  return prisma.usuario.findMany({
    where: { activo: true, rol: { in: ["EJECUTIVO_SERVICIO", "JEFE_SERVICIO"] } },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
}
