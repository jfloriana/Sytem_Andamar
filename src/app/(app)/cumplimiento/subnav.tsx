import Link from "next/link";

const SECCIONES = [
  { href: "/cumplimiento", etiqueta: "Solicitudes de titulares" },
  { href: "/cumplimiento/consentimientos", etiqueta: "Consentimientos" },
  { href: "/cumplimiento/politica", etiqueta: "Política de privacidad" },
];

/** Secciones del módulo; la actual lleva `aria-current`. */
export function SubnavCumplimiento({ actual }: { actual: string }) {
  return (
    <nav aria-label="Secciones de cumplimiento" className="no-imprimir flex flex-wrap gap-2">
      {SECCIONES.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          aria-current={s.href === actual ? "page" : undefined}
          className={`flex min-h-11 items-center rounded border px-3 text-sm font-semibold hover:bg-muted ${s.href === actual ? "border-primary bg-primary/10 text-primary" : "border-input"}`}
        >
          {s.etiqueta}
        </Link>
      ))}
    </nav>
  );
}
