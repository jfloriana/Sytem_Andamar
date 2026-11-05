import type { Metadata } from "next";
import Link from "next/link";
import { clientesParaSelector } from "@/lib/comercial";
import { requerir } from "@/lib/sesion";
import { responsablesAsignables } from "@/lib/servicio";
import { FormularioCaso } from "../formulario-caso";

export const metadata: Metadata = { title: "Nuevo caso" };
export const dynamic = "force-dynamic";

export default async function PaginaNuevoCaso({ searchParams }: { searchParams: Promise<{ clienteId?: string }> }) {
  const usuario = await requerir("crear", "caso");
  const { clienteId } = await searchParams;
  const [clientes, responsables] = await Promise.all([clientesParaSelector(usuario), responsablesAsignables(usuario)]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/casos" className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Casos
        </Link>
        <h1 className="text-[28px] font-semibold leading-tight">Nuevo caso</h1>
      </div>
      <FormularioCaso
        clientes={clientes}
        responsables={responsables}
        puedeElegirResponsable={usuario.rol === "JEFE_SERVICIO"}
        clienteId={clienteId ?? ""}
        cancelar={clienteId ? `/clientes/${clienteId}` : "/casos"}
      />
    </div>
  );
}
