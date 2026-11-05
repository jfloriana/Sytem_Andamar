import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { Marca } from "@/components/marca";
import { AreaActual, MenuMovil, Navegacion } from "@/components/navegacion";
import { Avatar, TarjetaUsuario } from "@/components/tarjeta-usuario";
import { menuPara } from "@/lib/menu";
import { ETIQUETA_ROL } from "@/lib/roles";
import { usuarioActual } from "@/lib/sesion";

async function cerrarSesion() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  const items = menuPara(usuario);

  return (
    <div className="min-h-screen bg-canvas md:grid md:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="no-imprimir halo-navy hidden md:sticky md:top-0 md:flex md:h-screen md:flex-col md:px-4 md:py-5">
        <Link href="/" aria-label="CRM-Andamar, ir al inicio" className="mb-6 rounded-lg px-2 py-1 focus-visible:outline-[#8fb4ff]">
          <Marca />
        </Link>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <Navegacion items={items} />
        </div>
        <div className="pt-4">
          <TarjetaUsuario nombre={usuario.nombre} rol={usuario.rol} cerrarSesion={cerrarSesion} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="no-imprimir sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/80 bg-white/90 px-4 py-2 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <MenuMovil>
              <Navegacion items={items} />
              <TarjetaUsuario nombre={usuario.nombre} rol={usuario.rol} cerrarSesion={cerrarSesion} />
            </MenuMovil>
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden text-sm text-muted-foreground md:inline">CRM-Andamar</span>
              <span className="hidden text-muted-foreground md:inline" aria-hidden="true">
                /
              </span>
              <AreaActual items={items} />
            </div>
          </div>
          <p className="flex items-center gap-3 rounded-full border border-border/80 bg-white py-1 pl-1 pr-3 text-sm shadow-card">
            <Avatar nombre={usuario.nombre} className="bg-navy text-white" />
            <span className="hidden min-w-0 leading-tight sm:block">
              <span className="block max-w-[180px] truncate font-semibold">{usuario.nombre}</span>
              <span className="block text-xs text-muted-foreground">{ETIQUETA_ROL[usuario.rol]}</span>
            </span>
          </p>
        </header>
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 outline-none md:px-8 md:py-8">
          {children}
        </main>
        <footer className="no-imprimir border-t border-border/80 px-4 py-4 text-xs md:px-8">
          <Link href="/privacidad" className="font-semibold text-primary hover:underline">
            Política de privacidad
          </Link>
        </footer>
      </div>
    </div>
  );
}
