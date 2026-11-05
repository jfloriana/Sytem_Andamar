import type { Metadata } from "next";
import { clienteAutorizado, recursoCliente } from "@/lib/clientes";
import { can } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { actualizarCliente } from "../../actions";
import { FormularioCliente } from "../../formulario-cliente";

export const metadata: Metadata = { title: "Editar cliente" };
export const dynamic = "force-dynamic";

export default async function PaginaEditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requerir("editar", "cliente");
  const cliente = await clienteAutorizado(usuario, id, "editar");
  const puedeReasignar = can(usuario, "reasignar", recursoCliente(cliente));
  const vendedores = puedeReasignar
    ? await prisma.usuario.findMany({
        where: { rol: "VENDEDOR", activo: true, ...(usuario.rol === "JEFE_VENTAS" ? { jefeId: usuario.id } : {}) },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      })
    : [{ id: cliente.vendedor.id, nombre: cliente.vendedor.nombre }];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Editar cliente</h1>
      <FormularioCliente
        accion={actualizarCliente}
        modo="editar"
        clienteId={cliente.id}
        vendedores={vendedores}
        puedeElegirVendedor={puedeReasignar}
        inicial={{
          documento: cliente.documento,
          razonSocial: cliente.razonSocial,
          direccion: cliente.direccion,
          telefono: cliente.telefono ?? "",
          email: cliente.email ?? "",
          vendedorId: cliente.vendedorId,
        }}
        cancelar={`/clientes/${cliente.id}`}
      />
    </div>
  );
}
