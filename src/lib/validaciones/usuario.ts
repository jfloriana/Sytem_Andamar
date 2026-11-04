import { z } from "zod";
import { AUTH } from "@/config";
import { ROLES } from "@/lib/roles";

const email = z
  .string({ required_error: "Ingresa el correo." })
  .trim()
  .toLowerCase()
  .email("Ingresa un correo válido.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Ingresa la contraseña."),
});

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(120),
  email,
  password: z
    .string()
    .min(AUTH.minLongitudPassword, `La contraseña debe tener al menos ${AUTH.minLongitudPassword} caracteres.`)
    .max(72, "La contraseña no puede superar 72 caracteres."),
  rol: z.enum(ROLES, { errorMap: () => ({ message: "Elige un rol válido." }) }),
  jefeId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const cambiarRolSchema = z.object({
  usuarioId: z.string().min(1),
  rol: z.enum(ROLES, { errorMap: () => ({ message: "Elige un rol válido." }) }),
});

export const cambiarActivoSchema = z.object({
  usuarioId: z.string().min(1),
  activo: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const filtroAuditoriaSchema = z.object({
  usuarioId: z.string().trim().optional(),
  accion: z.string().trim().max(60).optional(),
  entidad: z.string().trim().max(60).optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).catch(1),
});

export type CrearUsuarioEntrada = z.infer<typeof crearUsuarioSchema>;
