import type { Metadata } from "next";
import Link from "next/link";
import { clientesParaSelector } from "@/lib/comercial";
import { requerir } from "@/lib/sesion";
import { FormularioPedido } from "../formulario-pedido";

export const metadata: Metadata = { title: "Nuevo pedido" };
export const dynamic = "force-dynamic";

export default async function PaginaNuevoPedido({ searchParams }: { searchParams: Promise<{ clienteId?: string; oportunidadId?: string }> }) {
  const usuario = await requerir("crear", "pedido");
  const q = await searchParams;
  const clientes = await clientesParaSelector(usuario);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/pedidos" className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Pedidos
        </Link>
        <h1 className="text-[28px] font-semibold leading-tight">Nuevo pedido</h1>
      </div>
      <FormularioPedido
        clientes={clientes}
        inicial={{ clienteId: q.clienteId ?? "", oportunidadId: q.oportunidadId ?? "" }}
        cancelar={q.clienteId ? `/clientes/${q.clienteId}` : "/pedidos"}
      />
    </div>
  );
}
