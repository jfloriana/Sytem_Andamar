"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { evaluarCambioEtapa } from "@/domain/oportunidades";
import { registrarAuditoria } from "@/lib/auditoria";
import { buscarCliente, recursoCliente } from "@/lib/clientes";
import { buscarOportunidad, recursoVendedor } from "@/lib/comercial";
import { conError, conErrores, crudo, type ResultadoForm } from "@/lib/formularios";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { cambioEtapaSchema, oportunidadEdicionSchema, oportunidadSchema } from "@/lib/validaciones/comercial";

export async function crearOportunidad(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("crear", "oportunidad");
  const entrada = crudo(formData);
  const datos = oportunidadSchema.safeParse(entrada);
  if (!datos.success) return conErrores(datos.error.flatten().fieldErrors, entrada);
  const d = datos.data;

  const cliente = await buscarCliente(d.clienteId);
  if (!cliente || !can(usuario, "ver", recursoCliente(cliente))) return conErrores({ clienteId: ["Elige un cliente de tu cartera."] }, entrada);
  if (cliente.estado === "INACTIVO") return conErrores({ clienteId: ["El cliente está dado de baja."] }, entrada);
  if (!can(usuario, "crear", recursoVendedor("oportunidad", cliente))) return conError("No puedes crear oportunidades para ese cliente.", entrada);

  const id = await prisma.$transaction(async (tx) => {
    const nueva = await tx.oportunidad.create({
      data: {
        clienteId: cliente.id,
        vendedorId: cliente.vendedorId,
        titulo: d.titulo,
        montoEstimado: d.montoEstimado,
        etapaCambiadaAt: new Date(),
      },
    });
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        accion: "CREAR_OPORTUNIDAD",
        entidad: "Oportunidad",
        entidadId: nueva.id,
        detalle: { clienteId: cliente.id, titulo: d.titulo, montoEstimado: d.montoEstimado, vendedorId: cliente.vendedorId },
      },
      tx,
    );
    return nueva.id;
  });
  revalidatePath("/oportunidades");
  redirect(`/oportunidades/${id}`);
}

export async function actualizarOportunidad(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("editar", "oportunidad");
  const entrada = crudo(formData);
  const actual = await buscarOportunidad(entrada.oportunidadId ?? "");
  if (!actual) return conError("La oportunidad no existe.", entrada);
  if (!can(usuario, "editar", recursoVendedor("oportunidad", actual))) return conError("No tienes permiso para editar esta oportunidad.", entrada);
  const datos = oportunidadEdicionSchema.safeParse(entrada);
  if (!datos.success) return conErrores(datos.error.flatten().fieldErrors, entrada);
  const d = datos.data;

  let vendedorId = actual.vendedorId;
  if (d.vendedorId && d.vendedorId !== actual.vendedorId) {
    const nuevo = await prisma.usuario.findUnique({ where: { id: d.vendedorId } });
    const destino = { vendedorId: d.vendedorId, vendedor: { jefeId: nuevo?.jefeId ?? null } };
    if (!nuevo || nuevo.rol !== "VENDEDOR" || !nuevo.activo || !can(usuario, "reasignar", recursoVendedor("oportunidad", destino))) {
      return conErrores({ vendedorId: ["No puedes reasignar la oportunidad a ese vendedor."] }, entrada);
    }
    vendedorId = nuevo.id;
  }

  await prisma.$transaction(async (tx) => {
    await tx.oportunidad.update({
      where: { id: actual.id },
      data: { titulo: d.titulo, montoEstimado: d.montoEstimado, vendedorId },
    });
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        accion: vendedorId !== actual.vendedorId ? "REASIGNAR_OPORTUNIDAD" : "ACTUALIZAR_OPORTUNIDAD",
        entidad: "Oportunidad",
        entidadId: actual.id,
        detalle: {
          titulo: { de: actual.titulo, a: d.titulo },
          montoEstimado: { de: actual.montoEstimado.toString(), a: d.montoEstimado },
          vendedorId: { de: actual.vendedorId, a: vendedorId },
        },
      },
      tx,
    );
  });
  revalidatePath("/oportunidades");
  redirect(`/oportunidades/${actual.id}`);
}

/** Mueve la oportunidad de etapa aplicando la regla del dominio (actividad previa, motivo de pérdida). */
export async function cambiarEtapa(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("editar", "oportunidad");
  const entrada = crudo(formData);
  const datos = cambioEtapaSchema.safeParse(entrada);
  if (!datos.success) return conErrores(datos.error.flatten().fieldErrors, entrada);
  const d = datos.data;

  const actual = await buscarOportunidad(d.oportunidadId);
  if (!actual) return conError("La oportunidad no existe.", entrada);
  if (!can(usuario, "editar", recursoVendedor("oportunidad", actual))) return conError("No tienes permiso para mover esta oportunidad.", entrada);

  const actividades = await prisma.actividad.findMany({ where: { oportunidadId: actual.id }, select: { createdAt: true } });
  const resultado = evaluarCambioEtapa({
    etapaActual: actual.etapa,
    etapaNueva: d.etapa,
    motivoPerdida: d.motivoPerdida,
    etapaCambiadaAt: actual.etapaCambiadaAt,
    actividadesRegistradas: actividades.map((a) => a.createdAt),
  });
  if (!resultado.ok) {
    return resultado.codigo === "MOTIVO_REQUERIDO"
      ? conErrores({ motivoPerdida: [resultado.mensaje] }, entrada)
      : conError(resultado.mensaje, entrada);
  }

  const ahora = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.oportunidad.update({
      where: { id: actual.id },
      data: {
        etapa: d.etapa,
        etapaCambiadaAt: ahora,
        motivoPerdida: resultado.motivoPerdida,
        cerradaAt: resultado.cerrada ? ahora : null,
      },
    });
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        accion: "CAMBIAR_ETAPA_OPORTUNIDAD",
        entidad: "Oportunidad",
        entidadId: actual.id,
        detalle: { de: actual.etapa, a: d.etapa, motivoPerdida: resultado.motivoPerdida },
      },
      tx,
    );
  });
  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${actual.id}`);
  revalidatePath(`/clientes/${actual.clienteId}`);
  return { ok: true, mensaje: "Etapa actualizada." };
}
