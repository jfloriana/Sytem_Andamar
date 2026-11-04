import { ModuloPendiente } from "@/components/modulo-pendiente";

export const metadata = { title: "Casos" };

export default function Pagina() {
  return <ModuloPendiente titulo="Casos" recurso="caso" fase={3} />;
}
