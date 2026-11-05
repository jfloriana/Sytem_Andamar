import { z } from "zod";
import { ETAPAS } from "@/domain/oportunidades";
import { validarMontosPedido } from "@/domain/pedidos";
import { limaAUtc } from "@/domain/fechas";

const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const idRequerido = (mensaje: string) => z.string({ required_error: mensaje }).trim().min(1, mensaje);

/** Importe en USD con hasta 2 decimales (acepta coma o punto), como número. */
const importe = (nombre: string) =>
  z
    .string({ required_error: `Ingresa ${nombre}.` })
    .trim()
    .min(1, `Ingresa ${nombre}.`)
    .regex(/^\d{1,10}([.,]\d{1,2})?$/, `${nombre[0].toUpperCase()}${nombre.slice(1)} debe ser un número con hasta 2 decimales.`)
    .transform((v) => Number(v.replace(",", ".")));

const fechaHoraOpcional = (mensaje: string) =>
  opcional.pipe(
    z
      .string()
      .optional()
      .transform((v, ctx) => {
        if (!v) return undefined;
        const f = limaAUtc(v);
        if (!f) ctx.addIssue({ code: z.ZodIssueCode.custom, message: mensaje });
        return f ?? undefined;
      }),
  );

export const oportunidadSchema = z.object({
  clienteId: idRequerido("Elige un cliente."),
  titulo: z.string().trim().min(3, "El título debe tener al menos 3 caracteres.").max(120, "El título admite hasta 120 caracteres."),
  montoEstimado: importe("el monto estimado").refine((n) => n > 0, "El monto estimado debe ser mayor que cero."),
});

export const oportunidadEdicionSchema = oportunidadSchema.omit({ clienteId: true }).extend({ vendedorId: opcional });

export const cambioEtapaSchema = z.object({
  oportunidadId: idRequerido("La oportunidad no es válida."),
  etapa: z.enum(ETAPAS, { errorMap: () => ({ message: "Elige la etapa." }) }),
  motivoPerdida: opcional.pipe(z.string().max(300, "El motivo admite hasta 300 caracteres.").optional()),
});

export const actividadSchema = z.object({
  tipo: z.enum(["VISITA", "LLAMADA", "MENSAJE", "TAREA"], { errorMap: () => ({ message: "Elige el tipo." }) }),
  clienteId: idRequerido("Elige un cliente."),
  oportunidadId: opcional,
  fecha: fechaHoraOpcional("La fecha no es válida."),
  resultado: opcional.pipe(z.string().max(500, "El resultado admite hasta 500 caracteres.").optional()),
  recordatorioAt: fechaHoraOpcional("La fecha del recordatorio no es válida."),
});

export const pedidoSchema = z
  .object({
    clienteId: idRequerido("Elige un cliente."),
    fecha: fechaHoraOpcional("La fecha no es válida."),
    monto: importe("el monto"),
    margen: importe("el margen"),
  })
  .superRefine((p, ctx) => {
    for (const mensaje of validarMontosPedido(p.monto, p.margen)) {
      const campo = mensaje.startsWith("El margen") ? "margen" : "monto";
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: mensaje, path: [campo] });
    }
  });

export const estadoPedidoSchema = z.object({
  pedidoId: idRequerido("El pedido no es válido."),
  estado: z.enum(["ENTREGADO", "ANULADO"], { errorMap: () => ({ message: "Estado no válido." }) }),
});
