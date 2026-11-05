import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Navegacion } from "@/components/navegacion";
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
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="no-imprimir hidden border-r bg-muted md:block">
        <div className="p-4">
          <p className="text-lg font-semibold text-primary">CRM-Andamar</p>
        </div>
        <div className="px-2">
          <Navegacion items={items} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="no-imprimir flex items-center justify-between gap-2 border-b px-4 py-2">
          <details className="relative md:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded px-3 text-sm font-semibold hover:bg-muted">
              Menú
            </summary>
            <div className="absolute left-0 top-12 z-10 w-60 rounded border bg-background p-2">
              <Navegacion items={items} />
            </div>
          </details>
          <div className="ml-auto flex items-center gap-3">
            <p className="text-right text-sm">
              <span className="font-semibold">{usuario.nombre}</span>
              <span className="block text-xs text-muted-foreground">{ETIQUETA_ROL[usuario.rol]}</span>
            </p>
            <form action={cerrarSesion}>
              <Button type="submit" variant="secondary">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </header>
        <main id="contenido" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">{children}</main>
        <footer className="no-imprimir border-t px-4 py-3 text-xs">
          <Link href="/privacidad" className="font-semibold text-primary hover:underline">
            Política de privacidad
          </Link>
        </footer>
      </div>
    </div>
  );
}
