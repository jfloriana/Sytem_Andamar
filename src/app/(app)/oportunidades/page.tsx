import { ModuloPendiente } from "@/components/modulo-pendiente";

export const metadata = { title: "Oportunidades" };

export default function Pagina() {
  return <ModuloPendiente titulo="Oportunidades" recurso="oportunidad" fase={3} />;
}
