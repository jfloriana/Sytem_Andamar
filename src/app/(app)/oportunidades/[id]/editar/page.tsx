import type { Metadata } from "next";
import Link from "next/link";
import { oportunidadAutorizada, vendedoresDelEquipo } from "@/lib/comercial";
import { can } from "@/lib/permisos";
import { recursoVendedor } from "@/lib/comercial";
import { requerir } from "@/lib/sesion";
import { actualizarOportunidad } from "../../actions";
import { FormularioOportunidad } from "../../formulario-oportunidad";

export const metadata: Metadata = { title: "Editar oportunidad" };
export const dynamic = "force-dynamic";

export default async function PaginaEditarOportunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requerir("editar", "oportunidad");
  const o = await oportunidadAutorizada(usuario, id, "editar");
  const vendedores = can(usuario, "reasignar", recursoVendedor("oportunidad", o)) ? await vendedoresDelEquipo(usuario) : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/oportunidades/${o.id}`} className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← {o.titulo}
        </Link>
        <h1 className="text-[28px] font-semibold leading-tight">Editar oportunidad</h1>
      </div>
      <FormularioOportunidad
        accion={actualizarOportunidad}
        modo="editar"
        oportunidadId={o.id}
        vendedores={vendedores}
        inicial={{ titulo: o.titulo, montoEstimado: o.montoEstimado.toString(), vendedorId: o.vendedorId }}
        cancelar={`/oportunidades/${o.id}`}
      />
    </div>
  );
}
