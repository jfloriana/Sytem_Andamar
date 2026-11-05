"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { calcularFechaLimite, cerrarCaso, registrarPrimeraRespuesta, resolverCaso } from "@/domain/sla";
import { registrarAuditoria } from "@/lib/auditoria";
import { buscarCliente, recursoCliente } from "@/lib/clientes";
import { conError, conErrores, crudo, type ResultadoForm } from "@/lib/formularios";
import { can, type Accion } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir, type UsuarioSesion } from "@/lib/sesion";
import { buscarCaso, recursoCaso, responsablesAsignables } from "@/lib/servicio";
import { casoAccionSchema, casoSchema } from "@/lib/validaciones/servicio";

export async function crearCaso(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("crear", "caso");
  const entrada = crudo(formData);
  // El ejecutivo siempre es el responsable de los casos que registra.
  if (usuario.rol === "EJECUTIVO_SERVICIO") entrada.responsableId = usuario.id;
  const datos = casoSchema.safeParse(entrada);
  if (!datos.success) return conErrores(datos.error.flatten().fieldErrors, entrada);
  const d = datos.data;

  const cliente = await buscarCliente(d.clienteId);
  if (!cliente || !can(usuario, "ver", recursoCliente(cliente))) return conErrores({ clienteId: ["Elige un cliente válido."] }, entrada);
  const responsable = (await responsablesAsignables(usuario)).find((r) => r.id === d.responsableId);
  if (!responsable) return conErrores({ responsableId: ["No puedes asignar el caso a esa persona."] }, entrada);

  const aperturaAt = new Date();
  const id = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.caso.create({
      data: {
        clienteId: cliente.id,
        titulo: d.titulo,
        descripcion: d.descripcion,
        prioridad: d.prioridad,
        responsableId: responsable.id,
        aperturaAt,
        fechaLimite: calcularFechaLimite(aperturaAt),
      },
    });
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        accion: "CREAR_CASO",
        entidad: "Caso",
        entidadId: nuevo.id,
        detalle: { clienteId: cliente.id, titulo: d.titulo, prioridad: d.prioridad, responsableId: responsable.id },
      },
      tx,
    );
    return nuevo.id;
  });
  revalidatePath("/casos");
  revalidatePath(`/clientes/${cliente.id}`);
  redirect(`/casos/${id}`);
}

type CasoCargado = NonNullable<Awaited<ReturnType<typeof buscarCaso>>>;

/** Carga el caso del formulario y comprueba el permiso; devuelve un error listo para mostrar si falla. */
async function cargarCaso(
  usuario: UsuarioSesion,
  entrada: Record<string, string>,
  accion: Accion,
): Promise<{ caso: CasoCargado; datos: ReturnType<typeof casoAccionSchema.parse> } | { error: ResultadoForm }> {
  const datos = casoAccionSchema.safeParse(entrada);
  if (!datos.success) return { error: conError("Datos no válidos.", entrada) };
  const caso = await buscarCaso(datos.data.casoId);
  if (!caso) return { error: conError("El caso no existe.", entrada) };
  if (!can(usuario, accion, recursoCaso(caso))) return { error: conError("No tienes permiso para modificar este caso.", entrada) };
  return { caso, datos: datos.data };
}

async function guardarTransicion(
  usuario: UsuarioSesion,
  caso: CasoCargado,
  accion: string,
  cambios: Prisma.CasoUncheckedUpdateInput,
  detalle: Record<string, unknown>,
): Promise<ResultadoForm> {
  await prisma.$transaction(async (tx) => {
    await tx.caso.update({ where: { id: caso.id }, data: cambios });
    await registrarAuditoria({ usuarioId: usuario.id, accion, entidad: "Caso", entidadId: caso.id, detalle: { de: caso.estado, ...detalle } }, tx);
  });
  revalidatePath("/casos");
  revalidatePath(`/casos/${caso.id}`);
  revalidatePath(`/clientes/${caso.clienteId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function responderCaso(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("editar", "caso");
  const cargado = await cargarCaso(usuario, crudo(formData), "editar");
  if ("error" in cargado) return cargado.error;
  const r = registrarPrimeraRespuesta(cargado.caso, new Date());
  if (!r.ok) return conError(r.mensaje, {});
  return guardarTransicion(usuario, cargado.caso, "RESPONDER_CASO", r.cambios, { primeraRespuestaAt: r.cambios.primeraRespuestaAt });
}

export async function resolverCasoAccion(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("resolver", "caso");
  const cargado = await cargarCaso(usuario, crudo(formData), "resolver");
  if ("error" in cargado) return cargado.error;
  const r = resolverCaso(cargado.caso, new Date(), cargado.datos.primerContacto === "on");
  if (!r.ok) return conError(r.mensaje, {});
  return guardarTransicion(usuario, cargado.caso, "RESOLVER_CASO", r.cambios, { resueltoPrimerContacto: r.cambios.resueltoPrimerContacto });
}

export async function cerrarCasoAccion(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("editar", "caso");
  const cargado = await cargarCaso(usuario, crudo(formData), "editar");
  if ("error" in cargado) return cargado.error;
  const r = cerrarCaso(cargado.caso);
  if (!r.ok) return conError(r.mensaje, {});
  return guardarTransicion(usuario, cargado.caso, "CERRAR_CASO", r.cambios, {});
}

export async function reasignarCaso(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("asignar", "caso");
  const cargado = await cargarCaso(usuario, crudo(formData), "asignar");
  if ("error" in cargado) return cargado.error;
  const { caso, datos } = cargado;
  const destino = (await responsablesAsignables(usuario)).find((r) => r.id === datos.responsableId);
  if (!destino) return conErrores({ responsableId: ["Elige una persona del equipo de servicio."] }, {});
  if (caso.estado === "RESUELTO" || caso.estado === "CERRADO") return conError("No se puede reasignar un caso resuelto.", {});
  return guardarTransicion(usuario, caso, "REASIGNAR_CASO", { responsableId: destino.id }, { responsableId: { de: caso.responsableId, a: destino.id } });
}
