"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { datosClienteAnonimo, datosContactoAnonimo, estaAnonimizado, validarAnonimizacion } from "@/domain/anonimizacion";
import { validarOtorgamiento, validarRetiro, type Canal, type Finalidad } from "@/domain/consentimientos";
import { normalizarDocumento } from "@/domain/normalizacion";
import { transicionPermitida, validarCierre } from "@/domain/solicitudes";
import { registrarAuditoria } from "@/lib/auditoria";
import { conError, conErrores, crudo, type ResultadoForm } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import {
  cambioSolicitudSchema,
  consentimientoSchema,
  politicaSchema,
  retiroSchema,
  solicitudSchema,
  supresionSchema,
} from "@/lib/validaciones/cumplimiento";

function refrescar(clienteId?: string) {
  revalidatePath("/cumplimiento");
  revalidatePath("/cumplimiento/consentimientos");
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

// ---- Solicitudes de titulares ----

export async function crearSolicitud(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("crear", "solicitud_titular");
  const entrada = crudo(formData);
  const datos = solicitudSchema.safeParse(entrada);
  if (!datos.success) return conErrores(datos.error.flatten().fieldErrors, entrada);
  const d = datos.data;

  const cliente = await prisma.cliente.findUnique({ where: { documento: normalizarDocumento(d.documento) }, select: { id: true, documento: true } });
  if (!cliente) return conErrores({ documento: ["No existe un cliente con ese documento."] }, entrada);
  if (estaAnonimizado(cliente.documento)) return conErrores({ documento: ["Ese cliente ya fue anonimizado."] }, entrada);

  const id = await prisma.$transaction(async (tx) => {
    const nueva = await tx.solicitudTitular.create({ data: { clienteId: cliente.id, tipo: d.tipo, detalle: d.detalle ?? null } });
    await registrarAuditoria(
      { usuarioId: usuario.id, accion: "CREAR_SOLICITUD_TITULAR", entidad: "SolicitudTitular", entidadId: nueva.id, detalle: { clienteId: cliente.id, tipo: d.tipo } },
      tx,
    );
    return nueva.id;
  });
  refrescar(cliente.id);
  redirect(`/cumplimiento/solicitudes/${id}`);
}

/** En proceso, atendida o rechazada. La supresión se atiende con `anonimizarYAtender`. */
export async function cambiarEstadoSolicitud(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("editar", "solicitud_titular");
  const entrada = crudo(formData);
  const datos = cambioSolicitudSchema.safeParse(entrada);
  if (!datos.success) return conErrores(datos.error.flatten().fieldErrors, entrada);
  const { solicitudId, hacia, resolucion } = datos.data;

  const solicitud = await prisma.solicitudTitular.findUnique({ where: { id: solicitudId } });
  if (!solicitud) return conError("La solicitud no existe.", entrada);
  if (!transicionPermitida(solicitud.estado, hacia)) return conError("Esta solicitud ya no admite ese cambio de estado.", entrada);
  if (solicitud.tipo === "SUPRESION" && hacia === "ATENDIDA") {
    return conError("Una supresión se atiende con «Anonimizar y atender».", entrada);
  }

  let texto: string | null = null;
  if (hacia !== "EN_PROCESO") {
    const cierre = validarCierre(hacia, resolucion);
    if (!cierre.ok) return conErrores({ resolucion: [cierre.mensaje] }, entrada);
    texto = cierre.resolucion;
  }
  await prisma.$transaction(async (tx) => {
    await tx.solicitudTitular.update({
      where: { id: solicitud.id },
      data: { estado: hacia, ...(hacia === "EN_PROCESO" ? {} : { atendidaAt: new Date(), resolucion: texto }) },
    });
    await registrarAuditoria(
      { usuarioId: usuario.id, accion: "ACTUALIZAR_SOLICITUD_TITULAR", entidad: "SolicitudTitular", entidadId: solicitud.id, detalle: { tipo: solicitud.tipo, de: solicitud.estado, a: hacia } },
      tx,
    );
  });
  revalidatePath(`/cumplimiento/solicitudes/${solicitud.id}`);
  refrescar(solicitud.clienteId);
  return { ok: true, mensaje: "Solicitud actualizada." };
}

/**
 * Atiende una supresión: anonimiza al cliente y sus contactos, retira sus consentimientos y borra el texto libre
 * que pueda identificar a alguien (resultados de actividades, descripciones de casos, detalle de la auditoría del cliente).
 * Los pedidos se conservan (historial comercial); ya no se pueden asociar a una persona.
 */
export async function anonimizarYAtender(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("editar", "solicitud_titular");
  const entrada = crudo(formData);
  const datos = supresionSchema.safeParse(entrada);
  if (!datos.success) return conErrores(datos.error.flatten().fieldErrors, entrada);

  const solicitud = await prisma.solicitudTitular.findUnique({ where: { id: datos.data.solicitudId }, include: { cliente: true } });
  if (!solicitud) return conError("La solicitud no existe.", entrada);
  if (solicitud.tipo !== "SUPRESION") return conError("Solo las solicitudes de supresión anonimizan datos.", entrada);
  if (!transicionPermitida(solicitud.estado, "ATENDIDA")) return conError("Esta solicitud ya fue cerrada.", entrada);
  const valida = validarAnonimizacion(solicitud.cliente);
  if (!valida.ok) return conError(valida.mensaje, entrada);

  const ahora = new Date();
  const clienteId = solicitud.clienteId;
  await prisma.$transaction(async (tx) => {
    const contactos = await tx.contacto.findMany({ where: { clienteId }, select: { id: true } });
    await tx.cliente.update({ where: { id: clienteId }, data: datosClienteAnonimo(clienteId) });
    const c = await tx.contacto.updateMany({ where: { clienteId }, data: datosContactoAnonimo() });
    const consentimientos = await tx.consentimiento.updateMany({ where: { clienteId, retiradoAt: null }, data: { retiradoAt: ahora } });
    const actividades = await tx.actividad.updateMany({ where: { clienteId, resultado: { not: null } }, data: { resultado: null } });
    const casos = await tx.caso.updateMany({ where: { clienteId }, data: { descripcion: "[Anonimizado]" } });
    // El detalle de la auditoría de este cliente puede traer su nombre o teléfono: queda la acción, no el dato.
    const idsAuditados = [clienteId, ...contactos.map((x) => x.id)];
    await tx.auditLog.updateMany({ where: { entidad: { in: ["Cliente", "Contacto"] }, entidadId: { in: idsAuditados } }, data: { detalle: { anonimizado: true } } });
    await tx.solicitudTitular.updateMany({ where: { clienteId, id: { not: solicitud.id } }, data: { detalle: null } });
    await tx.solicitudTitular.update({
      where: { id: solicitud.id },
      data: { estado: "ATENDIDA", atendidaAt: ahora, resolucion: "Datos personales anonimizados.", detalle: null },
    });
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        accion: "ANONIMIZAR_CLIENTE",
        entidad: "Cliente",
        entidadId: clienteId,
        detalle: { solicitudId: solicitud.id, contactos: c.count, consentimientosRetirados: consentimientos.count, actividadesLimpiadas: actividades.count, casosLimpiados: casos.count },
      },
      tx,
    );
  });
  revalidatePath("/clientes");
  revalidatePath(`/cumplimiento/solicitudes/${solicitud.id}`);
  refrescar(clienteId);
  return { ok: true, mensaje: "Datos anonimizados y solicitud atendida." };
}

// ---- Consentimientos ----

export async function otorgarConsentimiento(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("crear", "consentimiento");
  const entrada = crudo(formData);
  const datos = consentimientoSchema.safeParse(entrada);
  if (!datos.success) return conErrores(datos.error.flatten().fieldErrors, entrada);
  const finalidad = datos.data.finalidad as Finalidad;
  const canal = datos.data.canal as Canal;

  const cliente = await prisma.cliente.findUnique({ where: { id: datos.data.clienteId }, include: { consentimientos: true } });
  if (!cliente) return conError("El cliente no existe.", entrada);
  if (estaAnonimizado(cliente.documento)) return conError("No se registran consentimientos de un cliente anonimizado.", entrada);
  const ahora = new Date();
  const valida = validarOtorgamiento(cliente.consentimientos, { finalidad, canal }, ahora);
  if (!valida.ok) return conError(valida.mensaje, entrada);

  await prisma.$transaction(async (tx) => {
    const nuevo = await tx.consentimiento.create({ data: { clienteId: cliente.id, finalidad, canal, otorgadoAt: ahora } });
    await registrarAuditoria(
      { usuarioId: usuario.id, accion: "OTORGAR_CONSENTIMIENTO", entidad: "Consentimiento", entidadId: nuevo.id, detalle: { clienteId: cliente.id, finalidad, canal } },
      tx,
    );
  });
  refrescar(cliente.id);
  return { ok: true, mensaje: "Consentimiento registrado." };
}

/** Retiro en un clic: sin pasos intermedios; queda en la auditoría. */
export async function retirarConsentimiento(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("editar", "consentimiento");
  const entrada = crudo(formData);
  const datos = retiroSchema.safeParse(entrada);
  if (!datos.success) return conError("Consentimiento no válido.", entrada);

  const actual = await prisma.consentimiento.findUnique({ where: { id: datos.data.consentimientoId } });
  if (!actual) return conError("El consentimiento no existe.", entrada);
  const retiro = validarRetiro(actual, new Date());
  if (!retiro.ok) return conError(retiro.mensaje, entrada);

  await prisma.$transaction(async (tx) => {
    await tx.consentimiento.update({ where: { id: actual.id }, data: { retiradoAt: retiro.retiradoAt } });
    await registrarAuditoria(
      { usuarioId: usuario.id, accion: "RETIRAR_CONSENTIMIENTO", entidad: "Consentimiento", entidadId: actual.id, detalle: { clienteId: actual.clienteId, finalidad: actual.finalidad, canal: actual.canal } },
      tx,
    );
  });
  refrescar(actual.clienteId);
  return { ok: true, mensaje: "Consentimiento retirado." };
}

// ---- Política de privacidad ----

export async function guardarPolitica(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("editar", "politica_privacidad");
  const entrada = crudo(formData);
  const datos = politicaSchema.safeParse(entrada);
  if (!datos.success) return conErrores(datos.error.flatten().fieldErrors, entrada);

  const version = await prisma.$transaction(async (tx) => {
    const ultima = await tx.politicaPrivacidad.aggregate({ _max: { version: true } });
    const nueva = await tx.politicaPrivacidad.create({
      data: { version: (ultima._max.version ?? 0) + 1, contenido: datos.data.contenido, autorId: usuario.id },
    });
    await registrarAuditoria(
      { usuarioId: usuario.id, accion: "ACTUALIZAR_POLITICA_PRIVACIDAD", entidad: "PoliticaPrivacidad", entidadId: nueva.id, detalle: { version: nueva.version } },
      tx,
    );
    return nueva.version;
  });
  revalidatePath("/privacidad");
  revalidatePath("/cumplimiento/politica");
  return { ok: true, mensaje: `Política guardada (versión ${version}).` };
}
