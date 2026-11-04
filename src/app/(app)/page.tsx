import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requerir } from "@/lib/sesion";
import { ETIQUETA_ROL } from "@/lib/roles";

export const metadata: Metadata = { title: "Inicio" };

export default async function PaginaInicio() {
  const usuario = await requerir("ver", "politica_privacidad");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Mi día</h1>
      <Card>
        <CardHeader>
          <CardTitle>Hola, {usuario.nombre}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ingresaste como {ETIQUETA_ROL[usuario.rol]}. Las tareas y visitas del día aparecerán aquí cuando
            se habiliten las actividades.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
