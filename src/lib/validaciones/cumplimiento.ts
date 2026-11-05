import { z } from "zod";
import { CUMPLIMIENTO } from "@/config";
import { CANALES, FINALIDADES } from "@/domain/consentimientos";

const idRequerido = (mensaje: string) => z.string({ required_error: mensaje }).trim().min(1, mensaje);

export const solicitudSchema = z.object({
  documento: z.string({ required_error: "Ingresa el documento del cliente." }).trim().min(1, "Ingresa el documento del cliente."),
  tipo: z.enum(["ACCESO", "RECTIFICACION", "SUPRESION"], { errorMap: () => ({ message: "Elige el tipo de solicitud." }) }),
  detalle: z
    .string()
    .trim()
    .max(CUMPLIMIENTO.maxLongitudDetalle, `El detalle admite hasta ${CUMPLIMIENTO.maxLongitudDetalle} caracteres.`)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const cambioSolicitudSchema = z.object({
  solicitudId: idRequerido("La solicitud no es válida."),
  hacia: z.enum(["EN_PROCESO", "ATENDIDA", "RECHAZADA"], { errorMap: () => ({ message: "Estado no válido." }) }),
  resolucion: z
    .string()
    .trim()
    .max(CUMPLIMIENTO.maxLongitudResolucion, `El texto admite hasta ${CUMPLIMIENTO.maxLongitudResolucion} caracteres.`)
    .optional()
    .default(""),
});

export const supresionSchema = z.object({
  solicitudId: idRequerido("La solicitud no es válida."),
  /** Casilla de confirmación: llega como "on". */
  confirmar: z.literal("on", { errorMap: () => ({ message: "Confirma que verificaste la identidad del titular." }) }),
});

export const consentimientoSchema = z.object({
  clienteId: idRequerido("El cliente no es válido."),
  finalidad: z.enum(FINALIDADES as unknown as [string, ...string[]], { errorMap: () => ({ message: "Elige la finalidad." }) }),
  canal: z.enum(CANALES as unknown as [string, ...string[]], { errorMap: () => ({ message: "Elige el canal." }) }),
});

export const retiroSchema = z.object({ consentimientoId: idRequerido("El consentimiento no es válido.") });

export const politicaSchema = z.object({
  contenido: z
    .string({ required_error: "Escribe el texto de la política." })
    .trim()
    .min(50, "La política debe tener al menos 50 caracteres.")
    .max(CUMPLIMIENTO.maxLongitudPolitica, `La política admite hasta ${CUMPLIMIENTO.maxLongitudPolitica} caracteres.`),
});

export const filtroSolicitudesSchema = z.object({
  estado: z.enum(["PENDIENTE", "EN_PROCESO", "ATENDIDA", "RECHAZADA"]).optional().catch(undefined),
  tipo: z.enum(["ACCESO", "RECTIFICACION", "SUPRESION"]).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(10000).catch(1),
});

export const filtroConsentimientosSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  finalidad: z.enum(["SERVICIO", "PROMOCIONES", "ANALITICA"]).optional().catch(undefined),
  estado: z.enum(["vigente", "retirado"]).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(10000).catch(1),
});
