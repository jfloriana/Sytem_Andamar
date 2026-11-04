import { ModuloPendiente } from "@/components/modulo-pendiente";

export const metadata = { title: "Clientes" };

export default function Pagina() {
  return <ModuloPendiente titulo="Clientes" recurso="cliente" fase={2} />;
}
