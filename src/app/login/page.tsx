import type { Metadata } from "next";
import { FormularioLogin } from "./formulario-login";
import { RedCartera } from "./red-cartera";
import "./login.css";

export const metadata: Metadata = { title: "Iniciar sesión" };

const CAPACIDADES = [
  {
    id: "clientes",
    titulo: "Clientes 360",
    texto: "Contactos, historial y actividad de cada cuenta en una sola ficha.",
  },
  {
    id: "pipeline",
    titulo: "Pipeline de ventas",
    texto: "Oportunidades y pedidos con su etapa siempre a la vista.",
  },
  {
    id: "servicio",
    titulo: "Servicio con SLA",
    texto: "Casos con plazos de atención y seguimiento hasta su cierre.",
  },
];

function Marca({ className }: { className?: string }) {
  return (
    <p className={`font-display text-lg font-bold tracking-tight text-white ${className ?? ""}`}>
      CRM-Andamar
    </p>
  );
}

export default function PaginaLogin() {
  return (
    <main
      id="contenido"
      className="login-root min-h-[100dvh] overflow-x-hidden bg-white text-[#0F172A] lg:grid lg:grid-cols-12"
    >
      {/* Panel de marca (escritorio) */}
      <aside className="login-halo relative hidden min-h-[100dvh] overflow-hidden lg:col-span-7 lg:flex lg:flex-col lg:px-14 lg:py-12">
        <div className="login-entra relative">
          <Marca />
        </div>
        <div className="login-entra relative mt-10 max-w-xl" style={{ ["--d" as string]: "80ms" }}>
          <h2 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-5xl">
            Gestione su cartera de clientes en un solo lugar
          </h2>
        </div>
        <div className="relative my-6 min-h-0 flex-1">
          <RedCartera className="pointer-events-none absolute inset-0 h-full w-full" />
        </div>
        <ul className="relative m-0 grid list-none grid-cols-3 gap-4 p-0">
          {CAPACIDADES.map((c, i) => (
            <li
              key={c.id}
              className="login-entra"
              style={{ ["--d" as string]: `${160 + i * 60}ms` }}
            >
              <div
                data-cap={c.id}
                tabIndex={0}
                className="h-full rounded-[1.5rem] bg-white/5 p-1.5 ring-1 ring-white/10 outline-none focus-visible:ring-2 focus-visible:ring-[#8FB4FF]"
              >
                <div className="h-full rounded-[calc(1.5rem-0.375rem)] bg-[#0E2147]/80 px-4 py-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
                  <h3 className="font-display text-sm font-semibold text-white">{c.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-snug text-[#B9C9E8]">{c.texto}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-h-[100dvh] flex-col lg:col-span-5">
        {/* Banda compacta (móvil) */}
        <header className="login-halo relative h-[120px] shrink-0 overflow-hidden px-4 lg:hidden">
          <RedCartera
            etiquetas={false}
            recorte
            className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
          />
          <Marca className="relative pt-5" />
        </header>

        <section className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="login-entra w-full max-w-sm">
            <p className="inline-block rounded-full bg-[#EEF3FF] px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#1D4ED8]">
              ACCESO SEGURO
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-[#0F172A]">
              Bienvenido de nuevo
            </h1>
            <p className="mt-2 text-base text-[#475569]">Ingrese con su cuenta corporativa</p>
            <div className="mt-8">
              <FormularioLogin />
            </div>
          </div>
        </section>

        {/* Capacidades en lista compacta (móvil) */}
        <ul className="m-0 list-none space-y-4 border-t border-slate-200 px-4 py-6 sm:px-8 lg:hidden">
          {CAPACIDADES.map((c) => (
            <li
              key={c.id}
              data-cap={c.id}
              tabIndex={0}
              className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <h3 className="font-display text-sm font-semibold text-[#0F172A]">{c.titulo}</h3>
              <p className="text-sm text-[#475569]">{c.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
