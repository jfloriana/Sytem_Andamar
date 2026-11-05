import type { Metadata } from "next";
import Link from "next/link";
import { requerir } from "@/lib/sesion";
import { Importador } from "./importador";

export const metadata: Metadata = { title: "Importar clientes" };
export const dynamic = "force-dynamic";

export default async function PaginaImportar() {
  await requerir("crear", "importacion");
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/clientes" className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
          ← Clientes
        </Link>
        <h1 className="text-[28px] font-semibold leading-tight">Importar clientes desde CSV</h1>
      </div>
      <Importador />
    </div>
  );
}
