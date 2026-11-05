"use client";

import { Button } from "@/components/ui/button";

/** Vista imprimible: el navegador guarda como PDF desde el diálogo de impresión. */
export function BotonImprimir() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      Imprimir / guardar PDF
    </Button>
  );
}
