"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { estadoClienteTrasPedido, puedeCambiarEstadoPedido } from "@/domain/pedidos";
import { registrarAuditoria } from "@/lib/auditoria";
import { buscarCliente, recursoCliente } from "@/lib/clientes";
import { buscarOportunidad, recursoVendedor } from "@/lib/comercial";
import { conError, conErrores, crudo, type ResultadoForm } from "@/lib/formularios";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { estadoPedidoSchema, pedidoSchema } from "@/lib/validaciones/comercial";

const UN_DIA_MS = 24 * 60 * 60 * 1000;

export async function crearPedido(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("crear", "pedido");
  const entrada = crudo(formData);
  const datos = pedidoSchema.safeParse(entrada);
  if (!datos.success) return conErrores(datos.error.flatten().fieldErrors, entrada);
  const d = datos.data;
  const fecha = d.fecha ?? new Date();
  if (fecha.getTime() > Date.now() + UN_DIA_MS) return conErrores({ fecha: ["La fecha no puede ser futura."] }, entrada);

  const cliente = await buscarCliente(d.clienteId);
  if (!cliente || !can(usuario, "ver", recursoCliente(cliente))) return conErrores({ clienteId: ["Elige un cliente de tu cartera."] }, entrada);
  if (cliente.estado === "INACTIVO") return conErrores({ clienteId: ["El cliente está dado de baja."] }, entrada);
  if (!can(usuario, "crear", recursoVendedor("pedido", cliente))) return conError("No puedes registrar pedidos para ese cliente.", entrada);

  const oportunidadId = entrada.oportunidadId?.trim() || null;
  if (oportunidadId) {
    const oportunidad = await buscarOportunidad(oportunidadId);
    if (!oportunidad || oportunidad.clienteId !== cliente.id) return conError("La oportunidad no corresponde a ese cliente.", entrada);
  }

  await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.create({
      data: { clienteId: cliente.id, vendedorId: cliente.vendedorId, oportunidadId, fecha, monto: d.monto, margen: d.margen },
    });
    // Un pedido nuevo devuelve a ACTIVO al cliente en riesgo (regla 2).
    const estadoCliente = estadoClienteTrasPedido(cliente.estado);
    if (estadoCliente !== cliente.estado) await tx.cliente.update({ where: { id: cliente.id }, data: { estado: estadoCliente } });
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        accion: "CREAR_PEDIDO",
        entidad: "Pedido",
        entidadId: pedido.id,
        detalle: { clienteId: cliente.id, monto: d.monto, margen: d.margen, oportunidadId, clienteReactivado: estadoCliente !== cliente.estado },
      },
      tx,
    );
  });
  revalidatePath("/pedidos");
  revalidatePath(`/clientes/${cliente.id}`);
  redirect(`/clientes/${cliente.id}`);
}

export async function cambiarEstadoPedido(_previo: ResultadoForm, formData: FormData): Promise<ResultadoForm> {
  const usuario = await requerir("editar", "pedido");
  const entrada = crudo(formData);
  const datos = estadoPedidoSchema.safeParse(entrada);
  if (!datos.success) return conError("Datos no válidos.", entrada);
  const pedido = await prisma.pedido.findUnique({ where: { id: datos.data.pedidoId }, include: { vendedor: { select: { jefeId: true } } } });
  if (!pedido) return conError("El pedido no existe.", entrada);
  if (!can(usuario, "editar", recursoVendedor("pedido", pedido))) return conError("No tienes permiso para modificar este pedido.", entrada);
  if (!puedeCambiarEstadoPedido(pedido.estado, datos.data.estado)) return conError("Ese cambio de estado no es posible.", entrada);

  await prisma.$transaction(async (tx) => {
    await tx.pedido.update({ where: { id: pedido.id }, data: { estado: datos.data.estado } });
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        accion: datos.data.estado === "ANULADO" ? "ANULAR_PEDIDO" : "ENTREGAR_PEDIDO",
        entidad: "Pedido",
        entidadId: pedido.id,
        detalle: { de: pedido.estado, a: datos.data.estado, clienteId: pedido.clienteId },
      },
      tx,
    );
  });
  revalidatePath("/pedidos");
  revalidatePath(`/clientes/${pedido.clienteId}`);
  return { ok: true };
}
