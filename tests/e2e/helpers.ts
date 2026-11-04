import { expect, type Page } from "@playwright/test";

export const ROLES_E2E = [
  { rol: "ADMIN", email: "admin@andamar.test" },
  { rol: "GERENCIA", email: "gerencia@andamar.test" },
  { rol: "JEFE_VENTAS", email: "jefe.ventas@andamar.test" },
  { rol: "VENDEDOR", email: "vendedor@andamar.test" },
  { rol: "JEFE_SERVICIO", email: "jefe.servicio@andamar.test" },
  { rol: "EJECUTIVO_SERVICIO", email: "ejecutivo.servicio@andamar.test" },
] as const;

export type RolE2E = (typeof ROLES_E2E)[number]["rol"];

export const archivoSesion = (rol: RolE2E) => `playwright/.auth/${rol}.json`;

/** La clave sale del entorno; nunca se escribe en el repositorio. */
export function claveE2E(): string {
  const clave = process.env.E2E_PASSWORD;
  if (!clave) throw new Error("Define E2E_PASSWORD (la misma usada en SEED_PASSWORD).");
  return clave;
}

export async function iniciarSesion(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

export async function esperarInicio(page: Page) {
  await expect(page.getByRole("heading", { name: "Mi día" })).toBeVisible();
}
