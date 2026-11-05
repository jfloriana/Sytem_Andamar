import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { FormularioSolicitud } from "../../formularios";

export const metadata: Metadata = { title: "Nueva solicitud de titular" };
export const dynamic = "force-dynamic";

export default async function PaginaNuevaSolicitud({ searchParams }: { searchParams: Promise<{ clienteId?: string }> }) {
  await requerir("crear", "solicitud_titular");
  const { clienteId } = await searchParams;
  const cliente = clienteId ? await prisma.cliente.findUnique({ where: { id: clienteId }, select: { documento: true } }) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cumplimiento" className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Cumplimiento
        </Link>
        <h1 className="text-[28px] font-semibold leading-tight">Nueva solicitud de titular</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra la solicitud de acceso, rectificación o supresión de un titular. El plazo corre desde este momento.
        </p>
      </div>
      <FormularioSolicitud documentoInicial={cliente?.documento ?? ""} />
    </div>
  );
}
