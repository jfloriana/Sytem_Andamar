import { notFound, redirect } from "next/navigation";
import { filtroCartera } from "@/lib/cartera";
import { can, type RecursoConDueno } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import type { UsuarioSesion } from "@/lib/sesion";
import type { Accion } from "@/lib/permisos";

const MAX_CLIENTES_SELECTOR = 1000;

export interface DuenoVendedor {
  vendedorId: string;
  vendedor: { jefeId: string | null };
}

/** Recurso de oportunidad o pedido: el dueño es el vendedor y su jefe define el alcance del equipo. */
export function recursoVendedor(tipo: "oportunidad" | "pedido", r: DuenoVendedor): RecursoConDueno {
  return { tipo, propietarioId: r.vendedorId, jefeDelPropietarioId: r.vendedor.jefeId };
}

export function recursoActividad(a: { usuarioId: string; usuario: { jefeId: string | null } }): RecursoConDueno {
  return { tipo: "actividad", propietarioId: a.usuarioId, jefeDelPropietarioId: a.usuario.jefeId };
}

/** Clientes a los que el usuario puede asociar registros nuevos (su cartera, sin dados de baja). */
export async function clientesParaSelector(usuario: UsuarioSesion) {
  return prisma.cliente.findMany({
    where: { AND: [filtroCartera(usuario), { estado: { not: "INACTIVO" } }] },
    select: { id: true, razonSocial: true, documento: true },
    orderBy: { razonSocial: "asc" },
    take: MAX_CLIENTES_SELECTOR,
  });
}

const incluirVendedor = { vendedor: { select: { id: true, nombre: true, jefeId: true } } } as const;

export async function buscarOportunidad(id: string) {
  return prisma.oportunidad.findUnique({
    where: { id },
    include: { ...incluirVendedor, cliente: { select: { id: true, razonSocial: true } } },
  });
}

/** Carga la oportunidad y exige permiso; sin permiso (incluso por URL directa) va a /sin-permiso. */
export async function oportunidadAutorizada(usuario: UsuarioSesion, id: string, accion: Accion) {
  const oportunidad = await buscarOportunidad(id);
  if (!oportunidad) notFound();
  if (!can(usuario, accion, recursoVendedor("oportunidad", oportunidad))) redirect("/sin-permiso");
  return oportunidad;
}

/** Vendedores a los que se puede reasignar una oportunidad (solo quien puede reasignar). */
export async function vendedoresDelEquipo(usuario: UsuarioSesion) {
  if (usuario.rol !== "JEFE_VENTAS") return [];
  return prisma.usuario.findMany({
    where: { rol: "VENDEDOR", activo: true, jefeId: usuario.id },
    select: { id: true, nombre: true, jefeId: true },
    orderBy: { nombre: "asc" },
  });
}
