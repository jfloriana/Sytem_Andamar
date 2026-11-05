import { NextResponse } from "next/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/** Respuesta a una solicitud de ACCESO: los datos del titular en JSON. Queda en auditoría. */
export async function GET(_peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  if (!can(usuario, "ver", "solicitud_titular") || !can(usuario, "exportar", "cliente")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  const { id } = await params;
  const solicitud = await prisma.solicitudTitular.findUnique({ where: { id } });
  if (!solicitud) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (solicitud.tipo !== "ACCESO") return NextResponse.json({ error: "Solo las solicitudes de acceso se exportan" }, { status: 400 });

  const cliente = await prisma.cliente.findUniqueOrThrow({
    where: { id: solicitud.clienteId },
    include: {
      vendedor: { select: { nombre: true } },
      contactos: { select: { nombre: true, cargo: true, telefono: true, email: true, principal: true } },
      consentimientos: { select: { finalidad: true, canal: true, otorgadoAt: true, retiradoAt: true }, orderBy: { otorgadoAt: "asc" } },
      _count: { select: { pedidos: true, oportunidades: true, actividades: true, casos: true } },
    },
  });
  const datos = {
    solicitud: { id: solicitud.id, tipo: solicitud.tipo, solicitadaAt: solicitud.solicitadaAt },
    titular: {
      documento: cliente.documento,
      razonSocial: cliente.razonSocial,
      direccion: cliente.direccion,
      telefono: cliente.telefono,
      email: cliente.email,
      estado: cliente.estado,
      vendedor: cliente.vendedor.nombre,
      condicionesEspeciales: cliente.condicionesEspeciales,
    },
    contactos: cliente.contactos,
    consentimientos: cliente.consentimientos,
    registros: cliente._count,
    generadoAt: new Date(),
  };
  await registrarAuditoria({
    usuarioId: usuario.id,
    accion: "EXPORTAR_DATOS_TITULAR",
    entidad: "SolicitudTitular",
    entidadId: solicitud.id,
    detalle: { clienteId: solicitud.clienteId },
  });
  return new NextResponse(JSON.stringify(datos, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="datos-titular-${solicitud.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
