// Supresión de datos del titular (RF-13): qué queda en el cliente y sus contactos tras anonimizar.
import { CUMPLIMIENTO } from "@/config";

export interface DatosClienteAnonimo {
  razonSocial: string;
  documento: string;
  direccion: string;
  telefono: null;
  email: null;
  condicionesEspeciales: null;
  estado: "INACTIVO";
}

/** El documento es único y obligatorio: se reemplaza por uno derivado del id, que no revela el original. */
export function datosClienteAnonimo(clienteId: string): DatosClienteAnonimo {
  const sufijo = clienteId.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-12).padStart(8, "0");
  return {
    razonSocial: "Cliente anonimizado",
    documento: `${CUMPLIMIENTO.prefijoDocumentoAnonimo}${sufijo}`,
    direccion: "Anonimizado",
    telefono: null,
    email: null,
    condicionesEspeciales: null,
    estado: "INACTIVO",
  };
}

export const datosContactoAnonimo = () => ({ nombre: "Contacto anonimizado", cargo: null, telefono: null, email: null });

export const estaAnonimizado = (documento: string): boolean => documento.startsWith(CUMPLIMIENTO.prefijoDocumentoAnonimo);

export function validarAnonimizacion(cliente: { documento: string }): { ok: true } | { ok: false; mensaje: string } {
  if (estaAnonimizado(cliente.documento)) return { ok: false, mensaje: "Este cliente ya fue anonimizado." };
  return { ok: true };
}
