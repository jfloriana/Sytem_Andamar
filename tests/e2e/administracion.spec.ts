import { expect, test } from "@playwright/test";
import { archivoSesion } from "./helpers";

test.use({ storageState: archivoSesion("ADMIN") });

test("ADMIN crea un usuario y queda en la auditoría", async ({ page }) => {
  const email = `e2e.${Date.now()}@andamar.test`;
  await page.goto("/administracion/usuarios");
  await page.getByLabel("Nombre").fill("Usuario E2E");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña inicial").fill("clave-e2e-segura-1");
  await page.getByLabel("Rol", { exact: true }).selectOption("EJECUTIVO_SERVICIO");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByText("Usuario creado.")).toBeVisible();
  await expect(page.getByRole("cell", { name: email })).toBeVisible();

  await page.goto("/administracion/auditoria?accion=CREAR_USUARIO");
  await expect(page.getByRole("cell", { name: "CREAR_USUARIO" }).first()).toBeVisible();
});

test("el visor de auditoría filtra por acción", async ({ page }) => {
  await page.goto("/administracion/auditoria");
  await page.getByLabel("Acción contiene").fill("NO_EXISTE_ESTA_ACCION");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByText("No hay registros para estos filtros.")).toBeVisible();
});
