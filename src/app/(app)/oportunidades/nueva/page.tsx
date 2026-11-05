import type { Metadata } from "next";
import Link from "next/link";
import { clientesParaSelector } from "@/lib/comercial";
import { requerir } from "@/lib/sesion";
import { crearOportunidad } from "../actions";
import { FormularioOportunidad } from "../formulario-oportunidad";

export const metadata: Metadata = { title: "Nueva oportunidad" };
export const dynamic = "force-dynamic";

export default async function PaginaNuevaOportunidad({ searchParams }: { searchParams: Promise<{ clienteId?: string }> }) {
  const usuario = await requerir("crear", "oportunidad");
  const { clienteId } = await searchParams;
  const clientes = await clientesParaSelector(usuario);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/oportunidades" className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Oportunidades
        </Link>
        <h1 className="text-[28px] font-semibold leading-tight">Nueva oportunidad</h1>
      </div>
      <FormularioOportunidad
        accion={crearOportunidad}
        modo="crear"
        clientes={clientes}
        inicial={{ clienteId: clienteId ?? "" }}
        cancelar="/oportunidades"
      />
    </div>
  );
}
