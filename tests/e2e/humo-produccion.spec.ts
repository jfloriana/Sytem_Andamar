import { expect, test } from "@playwright/test";
import { claveE2E, iniciarSesion } from "./helpers";

// Prueba de humo contra la URL publicada: BASE_URL=https://... npm run test:e2e:humo
// Comprueba el inicio de sesión y la carga del tablero de indicadores.
test.use({ storageState: { cookies: [], origins: [] } });

test("inicia sesión y carga el tablero", async ({ page }) => {
  await iniciarSesion(page, "admin@andamar.test", claveE2E());
  await expect(page.getByRole("heading", { name: "Mi día" })).toBeVisible();
  await page.goto("/indicadores");
  await expect(page.getByRole("heading", { level: 1, name: "Indicadores" })).toBeVisible();
  await expect(page.getByText("Retención de clientes", { exact: true })).toBeVisible();
});
