"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { valoresIniciales } from "@/domain/actividades";
import { registrarAuditoria } from "@/lib/auditoria";
import { buscarCliente, recursoCliente } from "@/lib/clientes";
import { buscarOportunidad, recursoActividad, recursoVendedor } from "@/lib/comercial";
import { conError, conErrores, crudo, type ResultadoForm } from "@/lib/formularios";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir, usuarioActual } from "@/lib/sesion";
import { actividadSchema } from "@/lib/validaciones/comercial";

export async function crearActividad(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("crear", "actividad");
  const entrada = crudo(formData);
  const datos = actividadSchema.safeParse(entrada);
  if (!datos.success) return conErrores(datos.error.flatten().fieldErrors, entrada);
  const d = datos.data;

  const cliente = await buscarCliente(d.clienteId);
  if (!cliente || !can(usuario, "ver", recursoCliente(cliente))) return conErrores({ clienteId: ["Elige un cliente de tu cartera."] }, entrada);
  if (d.oportunidadId) {
    const oportunidad = await buscarOportunidad(d.oportunidadId);
    if (!oportunidad || oportunidad.clienteId !== cliente.id || !can(usuario, "editar", recursoVendedor("oportunidad", oportunidad))) {
      return conError("La oportunidad no corresponde a ese cliente.", entrada);
    }
  }
  const iniciales = valoresIniciales(d.tipo, d.recordatorioAt ?? null);
  if (!iniciales.ok) return conErrores({ recordatorioAt: [iniciales.mensaje] }, entrada);

  const actividad = await prisma.$transaction(async (tx) => {
    const nueva = await tx.actividad.create({
      data: {
        tipo: d.tipo,
        clienteId: cliente.id,
        oportunidadId: d.oportunidadId ?? null,
        usuarioId: usuario.id,
        fecha: d.fecha ?? new Date(),
        resultado: d.resultado ?? null,
        recordatorioAt: iniciales.recordatorioAt,
        completada: iniciales.completada,
      },
    });
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        accion: "CREAR_ACTIVIDAD",
        entidad: "Actividad",
        entidadId: nueva.id,
        detalle: { tipo: d.tipo, clienteId: cliente.id, oportunidadId: d.oportunidadId ?? null, recordatorioAt: iniciales.recordatorioAt },
      },
      tx,
    );
    return nueva;
  });
  revalidatePath("/");
  revalidatePath(`/clientes/${cliente.id}`);
  if (actividad.oportunidadId) {
    revalidatePath(`/oportunidades/${actividad.oportunidadId}`);
    redirect(`/oportunidades/${actividad.oportunidadId}`);
  }
  redirect(`/?registrada=${d.tipo}`);
}

/** Marca una tarea como completada (desde «Mi día»). */
export async function completarActividad(formData: FormData): Promise<void> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  const actividad = await prisma.actividad.findUnique({
    where: { id: String(formData.get("actividadId") ?? "") },
    include: { usuario: { select: { jefeId: true } } },
  });
  if (!actividad || actividad.completada || !can(usuario, "editar", recursoActividad(actividad))) return;

  await prisma.$transaction(async (tx) => {
    await tx.actividad.update({ where: { id: actividad.id }, data: { completada: true } });
    await registrarAuditoria(
      { usuarioId: usuario.id, accion: "COMPLETAR_ACTIVIDAD", entidad: "Actividad", entidadId: actividad.id, detalle: { tipo: actividad.tipo } },
      tx,
    );
  });
  revalidatePath("/");
  revalidatePath(`/clientes/${actividad.clienteId}`);
}
