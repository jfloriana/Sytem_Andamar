import { ModuloPendiente } from "@/components/modulo-pendiente";

export const metadata = { title: "Pedidos" };

export default function Pagina() {
  return <ModuloPendiente titulo="Pedidos" recurso="pedido" fase={3} />;
}
