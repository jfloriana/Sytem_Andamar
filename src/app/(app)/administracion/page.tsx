import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requerir } from "@/lib/sesion";

export const metadata: Metadata = { title: "Administración" };

export default async function PaginaAdministracion() {
  await requerir("ver", "usuario");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Administración</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/administracion/usuarios" className="text-primary hover:underline">
                Usuarios y roles
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Altas, bajas y cambio de rol.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/administracion/auditoria" className="text-primary hover:underline">
                Auditoría
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Quién hizo qué y cuándo.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
