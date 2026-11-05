import type { Metadata } from "next";
import Link from "next/link";
import { politicaVigente } from "@/lib/cumplimiento";
import { formatoFecha } from "@/lib/formato";

export const metadata: Metadata = { title: "Política de privacidad" };
export const dynamic = "force-dynamic";

/** Página pública (el middleware no la protege): cualquier persona puede leer la política vigente. */
export default async function PaginaPrivacidad() {
  const politica = await politicaVigente();
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto flex max-w-3xl flex-col gap-4 p-4 outline-none md:p-8">
      <Link href="/" className="flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
        ← CRM-Andamar
      </Link>
      <h1 className="text-[28px] font-semibold leading-tight">Política de privacidad</h1>
      <p className="text-sm text-muted-foreground">
        {politica.actualizadaAt ? `Versión ${politica.version}, actualizada el ${formatoFecha(politica.actualizadaAt)}.` : "Texto de ejemplo."}
      </p>
      <article className="whitespace-pre-wrap break-words leading-relaxed">{politica.contenido}</article>
    </main>
  );
}
