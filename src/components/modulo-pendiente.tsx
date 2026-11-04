import type { Accion, TipoRecurso } from "@/lib/permisos";
import { requerir } from "@/lib/sesion";

interface Props {
  titulo: string;
  recurso: TipoRecurso;
  fase: number;
  accion?: Accion;
}

/** Pantalla provisoria de un módulo que se construye en una fase posterior; ya aplica la autorización. */
export async function ModuloPendiente({ titulo, recurso, fase, accion = "ver" }: Props) {
  await requerir(accion, recurso);
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-[28px] font-semibold leading-tight">{titulo}</h1>
      <p className="text-muted-foreground">Este módulo se habilita en la fase {fase} del proyecto.</p>
    </div>
  );
}
