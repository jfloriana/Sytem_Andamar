"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Headset,
  LayoutDashboard,
  LineChart,
  ShieldCheck,
  ShoppingCart,
  Target,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemMenu } from "@/lib/menu";

const ICONOS: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/clientes": Building2,
  "/oportunidades": Target,
  "/pedidos": ShoppingCart,
  "/casos": Headset,
  "/indicadores": LineChart,
  "/cumplimiento": ShieldCheck,
  "/administracion": UserCog,
};

const esActivo = (ruta: string, href: string) => (href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(`${href}/`));

export function Navegacion({ items }: { items: ItemMenu[] }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Módulos">
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const activo = esActivo(ruta, item.href);
          const Icono = ICONOS[item.href] ?? ClipboardList;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-navy-soft transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-[#8fb4ff]",
                  activo && "bg-white/10 text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-navy-acento",
                )}
              >
                <Icono className={cn("h-[18px] w-[18px] shrink-0", activo ? "text-navy-acento" : "text-navy-soft/80")} aria-hidden="true" />
                {item.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Nombre del módulo actual para la barra superior. */
export function AreaActual({ items }: { items: ItemMenu[] }) {
  const ruta = usePathname();
  const actual = [...items].sort((a, b) => b.href.length - a.href.length).find((i) => esActivo(ruta, i.href));
  return <span className="truncate text-sm font-semibold text-navy">{actual?.etiqueta ?? "CRM-Andamar"}</span>;
}

/**
 * Menú móvil con `<details>` (funciona antes de hidratar). Se cierra al navegar,
 * con Escape y al tocar fuera.
 */
export function MenuMovil({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [ruta]);

  useEffect(() => {
    const cerrarFuera = (e: PointerEvent) => {
      const d = ref.current;
      if (d?.open && e.target instanceof Node && !d.contains(e.target)) d.open = false;
    };
    document.addEventListener("pointerdown", cerrarFuera);
    return () => document.removeEventListener("pointerdown", cerrarFuera);
  }, []);

  return (
    <details
      ref={ref}
      className="group relative md:hidden"
      onKeyDown={(e) => {
        if (e.key === "Escape" && ref.current?.open) {
          ref.current.open = false;
          ref.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-semibold text-navy hover:bg-muted [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span>Menú</span>
      </summary>
      <div className="absolute left-0 top-[calc(100%+8px)] z-40 flex max-h-[calc(100dvh-80px)] w-[min(19rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto rounded-xl bg-navy p-3 shadow-elevada ring-1 ring-white/10">
        {children}
      </div>
    </details>
  );
}
