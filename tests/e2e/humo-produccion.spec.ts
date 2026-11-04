import { expect, test } from "@playwright/test";
import { claveE2E, iniciarSesion } from "./helpers";

// Prueba de humo contra la URL publicada: BASE_URL=https://... npm run test:e2e:humo
// Hoy comprueba login y la pantalla de inicio; en la fase 4 pasa a comprobar el tablero.
test.use({ storageState: { cookies: [], origins: [] } });

test("inicia sesión y carga la pantalla principal", async ({ page }) => {
  await iniciarSesion(page, "admin@andamar.test", claveE2E());
  await expect(page.getByRole("heading", { name: "Mi día" })).toBeVisible();
});
