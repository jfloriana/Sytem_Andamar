import type { Metadata } from "next";
import Link from "next/link";
import { clientesParaSelector, oportunidadAutorizada } from "@/lib/comercial";
import { requerir } from "@/lib/sesion";
import { FormularioActividad } from "../formulario-actividad";

export const metadata: Metadata = { title: "Registrar actividad" };
export const dynamic = "force-dynamic";

const TIPOS = ["VISITA", "LLAMADA", "MENSAJE", "TAREA"];

export default async function PaginaNuevaActividad({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; clienteId?: string; oportunidadId?: string }>;
}) {
  const usuario = await requerir("crear", "actividad");
  const q = await searchParams;
  const tipo = TIPOS.includes(q.tipo ?? "") ? q.tipo! : "VISITA";
  const clientes = await clientesParaSelector(usuario);
  const oportunidad = q.oportunidadId ? await oportunidadAutorizada(usuario, q.oportunidadId, "editar") : null;
  const vuelta = oportunidad ? `/oportunidades/${oportunidad.id}` : "/";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={vuelta} className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Volver
        </Link>
        <h1 className="text-[28px] font-semibold leading-tight">{tipo === "TAREA" ? "Nueva tarea" : tipo === "VISITA" ? "Registrar visita" : "Registrar actividad"}</h1>
      </div>
      <FormularioActividad
        clientes={clientes}
        inicial={{ tipo, clienteId: oportunidad?.clienteId ?? q.clienteId ?? "", oportunidadId: oportunidad?.id ?? "" }}
        oportunidadTitulo={oportunidad?.titulo}
        cancelar={vuelta}
      />
    </div>
  );
}
