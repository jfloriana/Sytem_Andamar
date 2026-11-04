import { AUTH } from "@/config";

export interface EstadoBloqueo {
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
}

export interface ResultadoFallo extends EstadoBloqueo {
  /** true solo cuando este fallo es el que dispara el bloqueo. */
  bloqueadoAhora: boolean;
}

export function estaBloqueado(bloqueadoHasta: Date | null, ahora: Date): boolean {
  return bloqueadoHasta !== null && bloqueadoHasta.getTime() > ahora.getTime();
}

export function registrarIntentoFallido(estado: EstadoBloqueo, ahora: Date): ResultadoFallo {
  // Durante un bloqueo vigente no se suma ni se extiende el plazo.
  if (estaBloqueado(estado.bloqueadoHasta, ahora)) {
    return { ...estado, bloqueadoAhora: false };
  }
  // Un bloqueo vencido reinicia la cuenta.
  const base = estado.bloqueadoHasta ? 0 : estado.intentosFallidos;
  const intentosFallidos = base + 1;
  if (intentosFallidos >= AUTH.maxIntentosFallidos) {
    const bloqueadoHasta = new Date(ahora.getTime() + AUTH.bloqueoMinutos * 60_000);
    return { intentosFallidos, bloqueadoHasta, bloqueadoAhora: true };
  }
  return { intentosFallidos, bloqueadoHasta: null, bloqueadoAhora: false };
}

export function reiniciarIntentos(): EstadoBloqueo {
  return { intentosFallidos: 0, bloqueadoHasta: null };
}
