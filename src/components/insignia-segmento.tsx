import { Badge } from "@/components/ui/badge";
import { ETIQUETA_SEGMENTO } from "@/lib/formato";

type Segmento = keyof typeof ETIQUETA_SEGMENTO;

const VARIANTE: Record<Segmento, "navy" | "info" | "default"> = {
  A: "navy",
  B: "info",
  C: "default",
  SIN_CLASIFICAR: "default",
};

/** Segmento del cliente como insignia compacta que no se parte en dos líneas. */
export function InsigniaSegmento({ segmento }: { segmento: Segmento }) {
  return <Badge variant={VARIANTE[segmento]}>{ETIQUETA_SEGMENTO[segmento]}</Badge>;
}
