import { createHash, timingSafeEqual } from "node:crypto";

const hash = (v: string) => createHash("sha256").update(v).digest();

/**
 * Las rutas /api/cron/* exigen `Authorization: Bearer <CRON_SECRET>`.
 * Sin secreto configurado se rechaza todo. Nunca se registra el secreto.
 */
export function cronAutorizado(peticion: Request, secreto: string | undefined): boolean {
  if (!secreto) return false;
  const cabecera = peticion.headers.get("authorization") ?? "";
  const m = /^Bearer (.+)$/.exec(cabecera);
  if (!m) return false;
  return timingSafeEqual(hash(m[1]), hash(secreto));
}
