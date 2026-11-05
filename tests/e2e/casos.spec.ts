import { expect, test } from "@playwright/test";
import { archivoSesion } from "./helpers";

const sufijo = `${Date.now()}`.slice(-9);

test.describe("JEFE_SERVICIO: bandeja con casos escalados", () => {
  test.use({ storageState: archivoSesion("JEFE_SERVICIO") });

  test("un caso vencido sin primera respuesta aparece como escalado", async ({ page }) => {
    await page.goto("/casos");
    await expect(page.getByRole("heading", { level: 1, name: "Casos" })).toBeVisible();
    await expect(page.getByText(/caso(s)? escalado(s)?/).first()).toBeVisible();

    const vencido = page.getByRole("row").filter({ hasText: "Demo: Entrega incompleta" });
    await expect(vencido).toContainText("Escalado");
    await expect(vencido).toContainText("Sin responder");
    await expect(vencido).toContainText("Vencido hace");

    // Un caso dentro del plazo no se escala.
    const vigente = page.getByRole("row").filter({ hasText: "Demo: Consulta de precios" });
    await expect(vigente).not.toContainText("Escalado");
    await expect(vigente).toContainText("Abierto");
  });

  test("el filtro de escalados deja solo los vencidos", async ({ page }) => {
    await page.goto("/casos?estado=escalados");
    await expect(page.getByRole("link", { name: "Demo: Entrega incompleta" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Demo: Consulta de precios" })).toHaveCount(0);
  });

  test("abre el caso escalado y ve el aviso de plazo vencido", async ({ page }) => {
    await page.goto("/casos?estado=escalados");
    await page.getByRole("link", { name: "Demo: Entrega incompleta" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Demo: Entrega incompleta" })).toBeVisible();
    await expect(page.getByText(/Escalado: sin primera respuesta, vencido hace/)).toBeVisible();
    await expect(page.getByLabel("Reasignar a")).toBeVisible();
  });
});

test.describe("EJECUTIVO_SERVICIO: registrar y resolver", () => {
  test.use({ storageState: archivoSesion("EJECUTIVO_SERVICIO") });

  test("registra un caso y lo resuelve en el primer contacto", async ({ page }) => {
    const titulo = `Reclamo E2E ${sufijo}`;
    await page.goto("/casos/nuevo");
    await page.getByLabel("Cliente").selectOption({ label: "Distribuidora Demo Uno" });
    await page.getByLabel("Título").fill(titulo);
    await page.getByLabel("Descripción").fill("El cliente reporta una caja dañada en la última entrega.");
    await page.getByLabel("Prioridad").selectOption({ label: "Alta" });
    await page.getByRole("button", { name: "Registrar caso" }).click();

    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
    await expect(page.getByText("Sin responder")).toBeVisible();

    await page.getByLabel("Resuelto en el primer contacto").check();
    await page.getByRole("button", { name: "Marcar como resuelto" }).click();

    await expect(page.getByText("Resuelto en el primer contacto", { exact: true }).locator("xpath=following-sibling::dd")).toHaveText("Sí");
    await expect(page.getByText("Respuesta dentro del plazo").locator("xpath=following-sibling::dd")).toContainText("Sí");
    await expect(page.getByRole("button", { name: "Cerrar caso" })).toBeVisible();
  });

  test("registra la primera respuesta y luego resuelve sin marcar primer contacto", async ({ page }) => {
    const titulo = `Consulta E2E ${sufijo}`;
    await page.goto("/casos/nuevo");
    await page.getByLabel("Cliente").selectOption({ label: "Ferreteria Demo Dos" });
    await page.getByLabel("Título").fill(titulo);
    await page.getByLabel("Descripción").fill("Consulta sobre la disponibilidad de un producto.");
    await page.getByRole("button", { name: "Registrar caso" }).click();
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();

    await page.getByRole("button", { name: "Registrar primera respuesta" }).click();
    await expect(page.getByText("Primera respuesta").locator("xpath=following-sibling::dd")).not.toHaveText("Sin responder");
    await expect(page.getByLabel("Resuelto en el primer contacto")).toHaveCount(0);

    await page.getByRole("button", { name: "Marcar como resuelto" }).click();
    await expect(page.getByText("Resuelto en el primer contacto", { exact: true }).locator("xpath=following-sibling::dd")).toHaveText("No");
  });

  test("el ejecutivo solo ve sus propios casos en la bandeja", async ({ page }) => {
    await page.goto("/casos?estado=todos");
    await expect(page.getByRole("link", { name: "Demo: Entrega incompleta" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nuevo caso" })).toBeVisible();
  });
});

test.describe("VENDEDOR", () => {
  test.use({ storageState: archivoSesion("VENDEDOR") });

  test("no abre la bandeja de casos ni por URL directa", async ({ page }) => {
    await page.goto("/casos");
    await expect(page).toHaveURL(/\/sin-permiso/);
  });
});
