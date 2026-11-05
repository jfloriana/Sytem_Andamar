import type { Metadata } from "next";
import Link from "next/link";
import { politicaVigente } from "@/lib/cumplimiento";
import { formatoFechaHora } from "@/lib/formato";
import { requerir } from "@/lib/sesion";
import { FormularioPolitica } from "../formularios";
import { SubnavCumplimiento } from "../subnav";

export const metadata: Metadata = { title: "Política de privacidad (edición)" };
export const dynamic = "force-dynamic";

export default async function PaginaEditarPolitica() {
  await requerir("editar", "politica_privacidad");
  const politica = await politicaVigente();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Política de privacidad</h1>
      <SubnavCumplimiento actual="/cumplimiento/politica" />
      <p className="text-sm text-muted-foreground">
        {politica.version === 0
          ? "Se muestra la plantilla de ejemplo; aún no se guardó ninguna versión."
          : `Versión ${politica.version}, guardada por ${politica.autor} el ${politica.actualizadaAt ? formatoFechaHora(politica.actualizadaAt) : ""}.`}{" "}
        La página pública está en{" "}
        <Link href="/privacidad" className="font-semibold text-primary hover:underline">
          /privacidad
        </Link>
        . Este texto no sustituye asesoría legal.
      </p>
      <FormularioPolitica contenido={politica.contenido} />
    </div>
  );
}
