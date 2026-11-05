import { z } from "zod";

const idRequerido = (mensaje: string) => z.string({ required_error: mensaje }).trim().min(1, mensaje);

export const casoSchema = z.object({
  clienteId: idRequerido("Elige un cliente."),
  titulo: z.string().trim().min(3, "El título debe tener al menos 3 caracteres.").max(120, "El título admite hasta 120 caracteres."),
  descripcion: z.string().trim().min(5, "Describe el caso (mínimo 5 caracteres).").max(1000, "La descripción admite hasta 1000 caracteres."),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"], { errorMap: () => ({ message: "Elige la prioridad." }) }),
  responsableId: idRequerido("Elige un responsable."),
});

export const casoAccionSchema = z.object({
  casoId: idRequerido("El caso no es válido."),
  /** Casilla «resuelto en el primer contacto»: llega como "on" o no llega. */
  primerContacto: z.string().optional(),
  responsableId: z.string().trim().optional(),
});
