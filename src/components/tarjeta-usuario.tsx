import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ETIQUETA_ROL, type Rol } from "@/lib/roles";

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primera + ultima).toUpperCase();
}

/** Avatar con iniciales; el nombre completo lo da el texto que lo acompaña. */
export function Avatar({ nombre, className = "" }: { nombre: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8fb4ff] font-display text-sm font-bold text-[#0a1730]", className)}
    >
      {iniciales(nombre)}
    </span>
  );
}

/** Tarjeta de usuario del menú lateral, con el cierre de sesión. */
export function TarjetaUsuario({ nombre, rol, cerrarSesion }: { nombre: string; rol: Rol; cerrarSesion: () => Promise<void> }) {
  return (
    <div className="rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <Avatar nombre={nombre} />
        <p className="min-w-0 text-sm">
          <span className="block truncate font-semibold text-white">{nombre}</span>
          <span className="block truncate text-xs text-navy-soft">{ETIQUETA_ROL[rol]}</span>
        </p>
      </div>
      <form action={cerrarSesion} className="mt-3">
        <button
          type="submit"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-[#8fb4ff]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
