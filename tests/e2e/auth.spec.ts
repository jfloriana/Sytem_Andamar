import { expect, test } from "@playwright/test";
import { claveE2E, esperarInicio, iniciarSesion } from "./helpers";

// Estas pruebas parten sin sesión.
test.use({ storageState: { cookies: [], origins: [] } });

test("inicio de sesión correcto lleva a Mi día", async ({ page }) => {
  await iniciarSesion(page, "admin@andamar.test", claveE2E());
  await esperarInicio(page);
});

test("clave incorrecta muestra un error claro", async ({ page }) => {
  await iniciarSesion(page, "gerencia@andamar.test", "clave-incorrecta-123");
  await expect(page.getByRole("alert")).toContainText("Correo o contraseña incorrectos");
  await expect(page).toHaveURL(/\/login/);
});

test("bloqueo tras 5 intentos fallidos, incluso con la clave correcta", async ({ page }) => {
  const email = "bloqueo@andamar.test"; // cuenta dedicada; el seed la restablece
  for (let i = 1; i <= 4; i++) {
    await iniciarSesion(page, email, `incorrecta-${i}-xxxxx`);
    await expect(page.getByRole("alert")).toContainText("Correo o contraseña incorrectos");
  }
  await iniciarSesion(page, email, "incorrecta-5-xxxxx");
  await expect(page.getByRole("alert")).toContainText("bloqueada");

  await iniciarSesion(page, email, claveE2E());
  await expect(page.getByRole("alert")).toContainText("bloqueada");
  await expect(page).toHaveURL(/\/login/);
});

test("sin sesión, una ruta interna redirige al login", async ({ page }) => {
  await page.goto("/administracion/usuarios");
  await expect(page).toHaveURL(/\/login/);
});
