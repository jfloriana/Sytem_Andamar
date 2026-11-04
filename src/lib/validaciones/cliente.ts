import { z } from "zod";
import { normalizarDocumento, normalizarTelefono } from "@/domain/normalizacion";

const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const emailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.string().email("Ingresa un correo válido.").max(160).optional());

const telefonoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normalizarTelefono(v) : undefined))
  .pipe(
    z
      .string()
      .regex(/^\d{6,15}$/, "El teléfono debe tener entre 6 y 15 dígitos.")
      .optional(),
  );

export const documentoSchema = z
  .string({ required_error: "Ingresa el documento." })
  .transform(normalizarDocumento)
  .pipe(
    z
      .string()
      .min(1, "Ingresa el documento.")
      .regex(/^[A-Z0-9]{6,20}$/, "El documento debe tener entre 6 y 20 letras o números."),
  );

/** Campos comunes del cliente (sin vendedor, que depende del origen: formulario o CSV). */
export const datosClienteBase = {
  documento: documentoSchema,
  razonSocial: z
    .string({ required_error: "Ingresa la razón social." })
    .trim()
    .min(2, "La razón social debe tener al menos 2 caracteres.")
    .max(160, "La razón social no puede superar 160 caracteres."),
  direccion: z
    .string({ required_error: "Ingresa la dirección." })
    .trim()
    .min(5, "La dirección debe tener al menos 5 caracteres.")
    .max(200, "La dirección no puede superar 200 caracteres."),
  telefono: telefonoOpcional,
  email: emailOpcional,
};

const camposContacto = {
  contactoNombre: opcional,
  contactoCargo: opcional,
  contactoTelefono: telefonoOpcional,
  contactoEmail: emailOpcional,
};

type ConContacto = {
  contactoNombre?: string;
  contactoCargo?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
};

/** Si se llena algún dato del contacto, el nombre es obligatorio. */
function exigirNombreDeContacto(d: ConContacto, ctx: z.RefinementCtx) {
  const hayDatos = d.contactoCargo || d.contactoTelefono || d.contactoEmail;
  if (hayDatos && !d.contactoNombre) {
    ctx.addIssue({ code: "custom", path: ["contactoNombre"], message: "Ingresa el nombre del contacto." });
  }
}

export const clienteSchema = z
  .object({
    ...datosClienteBase,
    vendedorId: z.string({ required_error: "Elige el vendedor." }).trim().min(1, "Elige el vendedor."),
    ...camposContacto,
  })
  .superRefine(exigirNombreDeContacto);

export const clienteEdicionSchema = z.object({
  ...datosClienteBase,
  vendedorId: z.string().trim().optional(),
});

export const contactoSchema = z.object({
  nombre: z
    .string({ required_error: "Ingresa el nombre del contacto." })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120),
  cargo: opcional,
  telefono: telefonoOpcional,
  email: emailOpcional,
  principal: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((v) => v === "on" || v === "true"),
});

/** Fila del CSV de importación (el vendedor llega como correo). */
export const filaImportacionSchema = z
  .object({
    ...datosClienteBase,
    vendedorEmail: z
      .string({ required_error: "Falta el correo del vendedor." })
      .trim()
      .toLowerCase()
      .min(1, "Falta el correo del vendedor."),
    ...camposContacto,
  })
  .superRefine(exigirNombreDeContacto);

export type ClienteEntrada = z.infer<typeof clienteSchema>;
export type ContactoEntrada = z.infer<typeof contactoSchema>;
export type FilaImportacionValida = z.infer<typeof filaImportacionSchema>;

/** Valida un campo suelto para el aviso en línea del formulario (cliente). */
export function validarCampoCliente(campo: string, datos: Record<string, string>): string | null {
  const parcial = clienteSchema.safeParse({ ...datos, vendedorId: datos.vendedorId || "x" });
  if (parcial.success) return null;
  return parcial.error.flatten().fieldErrors[campo as keyof ClienteEntrada]?.[0] ?? null;
}
