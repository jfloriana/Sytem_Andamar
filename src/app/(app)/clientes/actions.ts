"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { registrarAuditoria } from "@/lib/auditoria";
import { buscarCliente, recursoCliente, revisarDuplicados, vendedoresAsignables, type AvisoDuplicado } from "@/lib/clientes";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir, usuarioActual } from "@/lib/sesion";
import { clienteEdicionSchema, clienteSchema, contactoSchema } from "@/lib/validaciones/cliente";

export interface ResultadoCliente {
  ok?: boolean;
  error?: string;
  errores?: Record<string, string[] | undefined>;
  avisos?: AvisoDuplicado[];
}

const DOCUMENTO_REPETIDO = "Ya existe un cliente con ese documento.";

function crudo(formData: FormData): Record<string, string> {
  return Object.fromEntries([...formData].filter(([, v]) => typeof v === "string")) as Record<string, string>;
}

const esDocumentoRepetido = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function crearCliente(_previo: ResultadoCliente, formData: FormData): Promise<ResultadoCliente> {
  const usuario = await requerir("crear", "cliente");
  const entrada = crudo(formData);
  // El vendedor nunca se toma a ciegas: un VENDEDOR siempre crea en su propia cartera.
  if (usuario.rol === "VENDEDOR") entrada.vendedorId = usuario.id;
  const datos = clienteSchema.safeParse(entrada);
  if (!datos.success) return { errores: datos.error.flatten().fieldErrors };
  const d = datos.data;

  const vendedor = (await vendedoresAsignables(usuario)).find((v) => v.id === d.vendedorId);
  const dueno = { vendedorId: d.vendedorId, vendedor: { jefeId: vendedor?.jefeId ?? null } };
  if (!vendedor || !can(usuario, "crear", recursoCliente(dueno))) {
    return { errores: { vendedorId: ["No puedes asignar clientes a ese vendedor."] } };
  }

  const { errorDocumento, avisos } = await revisarDuplicados(usuario, d);
  if (errorDocumento) return { errores: { documento: [errorDocumento] } };
  if (avisos.length > 0 && entrada.confirmarDuplicados !== "1") return { avisos };

  let id: string;
  try {
    id = await prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.create({
        data: {
          documento: d.documento,
          razonSocial: d.razonSocial,
          direccion: d.direccion,
          telefono: d.telefono ?? null,
          email: d.email ?? null,
          vendedorId: d.vendedorId,
          ...(d.contactoNombre
            ? {
                contactos: {
                  create: {
                    nombre: d.contactoNombre,
                    cargo: d.contactoCargo ?? null,
                    telefono: d.contactoTelefono ?? null,
                    email: d.contactoEmail ?? null,
                    principal: true,
                  },
                },
              }
            : {}),
        },
      });
      await registrarAuditoria(
        {
          usuarioId: usuario.id,
          accion: "CREAR_CLIENTE",
          entidad: "Cliente",
          entidadId: cliente.id,
          detalle: { documento: d.documento, razonSocial: d.razonSocial, vendedorId: d.vendedorId, avisosConfirmados: avisos.length },
        },
        tx,
      );
      return cliente.id;
    });
  } catch (e) {
    if (esDocumentoRepetido(e)) return { errores: { documento: [DOCUMENTO_REPETIDO] } };
    throw e;
  }
  revalidatePath("/clientes");
  redirect(`/clientes/${id}`);
}

const CAMPOS_EDITABLES = ["documento", "razonSocial", "direccion", "telefono", "email", "vendedorId"] as const;

export async function actualizarCliente(_previo: ResultadoCliente, formData: FormData): Promise<ResultadoCliente> {
  const usuario = await requerir("editar", "cliente");
  const entrada = crudo(formData);
  const actual = await buscarCliente(entrada.clienteId ?? "");
  if (!actual) return { error: "El cliente no existe." };
  if (!can(usuario, "editar", recursoCliente(actual))) return { error: "No tienes permiso para editar este cliente." };

  const datos = clienteEdicionSchema.safeParse(entrada);
  if (!datos.success) return { errores: datos.error.flatten().fieldErrors };
  const d = datos.data;

  let vendedorId = actual.vendedorId;
  if (d.vendedorId && d.vendedorId !== actual.vendedorId) {
    const nuevo = await prisma.usuario.findUnique({ where: { id: d.vendedorId } });
    const destino = { vendedorId: d.vendedorId, vendedor: { jefeId: nuevo?.jefeId ?? null } };
    if (!nuevo || nuevo.rol !== "VENDEDOR" || !nuevo.activo || !can(usuario, "reasignar", recursoCliente(destino))) {
      return { errores: { vendedorId: ["No puedes reasignar el cliente a ese vendedor."] } };
    }
    vendedorId = nuevo.id;
  }

  const { errorDocumento, avisos } = await revisarDuplicados(usuario, d, actual.id);
  if (errorDocumento) return { errores: { documento: [errorDocumento] } };
  if (avisos.length > 0 && entrada.confirmarDuplicados !== "1") return { avisos };

  const nuevos = { ...d, telefono: d.telefono ?? null, email: d.email ?? null, vendedorId };
  const cambios: Record<string, { de: unknown; a: unknown }> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (actual[campo] !== nuevos[campo]) cambios[campo] = { de: actual[campo], a: nuevos[campo] };
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.cliente.update({
        where: { id: actual.id },
        data: {
          documento: d.documento,
          razonSocial: d.razonSocial,
          direccion: d.direccion,
          telefono: nuevos.telefono,
          email: nuevos.email,
          vendedorId,
        },
      });
      await registrarAuditoria(
        { usuarioId: usuario.id, accion: "ACTUALIZAR_CLIENTE", entidad: "Cliente", entidadId: actual.id, detalle: { cambios } },
        tx,
      );
    });
  } catch (e) {
    if (esDocumentoRepetido(e)) return { errores: { documento: [DOCUMENTO_REPETIDO] } };
    throw e;
  }
  revalidatePath("/clientes");
  redirect(`/clientes/${actual.id}`);
}

/** Baja lógica: el cliente queda INACTIVO (conserva su historial y la auditoría). */
export async function cambiarEstadoCliente(_previo: ResultadoCliente, formData: FormData): Promise<ResultadoCliente> {
  const usuario = await requerir("editar", "cliente");
  const actual = await buscarCliente(String(formData.get("clienteId") ?? ""));
  if (!actual) return { error: "El cliente no existe." };
  if (!can(usuario, "editar", recursoCliente(actual))) return { error: "No tienes permiso para modificar este cliente." };
  const baja = formData.get("accion") === "baja";
  if (baja === (actual.estado === "INACTIVO")) return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.cliente.update({ where: { id: actual.id }, data: { estado: baja ? "INACTIVO" : "ACTIVO" } });
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        accion: baja ? "BAJA_CLIENTE" : "REACTIVAR_CLIENTE",
        entidad: "Cliente",
        entidadId: actual.id,
        detalle: { documento: actual.documento, estadoAnterior: actual.estado },
      },
      tx,
    );
  });
  revalidatePath(`/clientes/${actual.id}`);
  revalidatePath("/clientes");
  return { ok: true };
}

// --- Contactos ---------------------------------------------------------------------------------

async function clienteParaContacto(clienteId: string, accion: "crear" | "editar") {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  const cliente = await buscarCliente(clienteId);
  if (!cliente) return { usuario, cliente: null, permitido: false };
  return { usuario, cliente, permitido: can(usuario, accion, recursoCliente(cliente, "contacto")) };
}

export async function guardarContacto(_previo: ResultadoCliente, formData: FormData): Promise<ResultadoCliente> {
  const entrada = crudo(formData);
  const contactoId = entrada.contactoId || null;
  const { usuario, cliente, permitido } = await clienteParaContacto(entrada.clienteId ?? "", contactoId ? "editar" : "crear");
  if (!cliente) return { error: "El cliente no existe." };
  if (!permitido) return { error: "No tienes permiso para modificar contactos de este cliente." };
  const datos = contactoSchema.safeParse(entrada);
  if (!datos.success) return { errores: datos.error.flatten().fieldErrors };
  const d = datos.data;
  const valores = { nombre: d.nombre, cargo: d.cargo ?? null, telefono: d.telefono ?? null, email: d.email ?? null };

  const id = await prisma.$transaction(async (tx) => {
    if (contactoId) {
      const existe = await tx.contacto.findFirst({ where: { id: contactoId, clienteId: cliente.id } });
      if (!existe) return null;
    }
    const principal = d.principal || (!contactoId && (await tx.contacto.count({ where: { clienteId: cliente.id } })) === 0);
    if (principal) {
      await tx.contacto.updateMany({ where: { clienteId: cliente.id, NOT: { id: contactoId ?? "" } }, data: { principal: false } });
    }
    const guardado = contactoId
      ? await tx.contacto.update({ where: { id: contactoId }, data: { ...valores, ...(principal ? { principal: true } : {}) } })
      : await tx.contacto.create({ data: { ...valores, principal, clienteId: cliente.id } });
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        accion: contactoId ? "ACTUALIZAR_CONTACTO" : "CREAR_CONTACTO",
        entidad: "Contacto",
        entidadId: guardado.id,
        detalle: { clienteId: cliente.id, ...valores, principal },
      },
      tx,
    );
    return guardado.id;
  });
  if (!id) return { error: "El contacto no existe." };
  revalidatePath(`/clientes/${cliente.id}`);
  return { ok: true };
}

export async function eliminarContacto(_previo: ResultadoCliente, formData: FormData): Promise<ResultadoCliente> {
  const entrada = crudo(formData);
  const { usuario, cliente, permitido } = await clienteParaContacto(entrada.clienteId ?? "", "editar");
  if (!cliente) return { error: "El cliente no existe." };
  if (!permitido) return { error: "No tienes permiso para modificar contactos de este cliente." };
  const contacto = await prisma.contacto.findFirst({ where: { id: entrada.contactoId ?? "", clienteId: cliente.id } });
  if (!contacto) return { error: "El contacto no existe." };

  await prisma.$transaction(async (tx) => {
    await tx.contacto.delete({ where: { id: contacto.id } });
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        accion: "ELIMINAR_CONTACTO",
        entidad: "Contacto",
        entidadId: contacto.id,
        detalle: { clienteId: cliente.id, nombre: contacto.nombre, eraPrincipal: contacto.principal },
      },
      tx,
    );
  });
  revalidatePath(`/clientes/${cliente.id}`);
  return { ok: true };
}
