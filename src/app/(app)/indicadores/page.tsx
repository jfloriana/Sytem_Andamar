import { ModuloPendiente } from "@/components/modulo-pendiente";

export const metadata = { title: "Indicadores" };

export default function Pagina() {
  return <ModuloPendiente titulo="Indicadores" recurso="indicadores" fase={4} />;
}
