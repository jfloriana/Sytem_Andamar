// Línea de tiempo combinada de la vista 360: eventos de varios módulos, del más reciente al más antiguo.

export type TipoEvento = "pedido" | "oportunidad" | "actividad" | "caso" | "consentimiento";

export interface EventoTiempo {
  tipo: TipoEvento;
  id: string;
  fecha: Date;
  titulo: string;
  detalle?: string;
}

export function construirLineaTiempo(eventos: EventoTiempo[], limite = 50): EventoTiempo[] {
  return [...eventos]
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime() || a.id.localeCompare(b.id))
    .slice(0, limite);
}
