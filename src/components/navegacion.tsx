"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ItemMenu } from "@/lib/menu";

export function Navegacion({ items }: { items: ItemMenu[] }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Módulos">
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const activo = item.href === "/" ? ruta === "/" : ruta.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded px-3 text-sm font-semibold transition-colors hover:bg-muted",
                  activo && "bg-primary/10 text-primary",
                )}
              >
                {item.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
