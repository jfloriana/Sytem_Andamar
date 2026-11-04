import { ModuloPendiente } from "@/components/modulo-pendiente";

export const metadata = { title: "Cumplimiento" };

export default function Pagina() {
  return <ModuloPendiente titulo="Cumplimiento" recurso="solicitud_titular" fase={5} />;
}
