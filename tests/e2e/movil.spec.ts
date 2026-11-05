import { expect, test } from "@playwright/test";
import { archivoSesion } from "./helpers";

// Móvil de referencia de la sección 4.2: 390 x 844.
test.use({ storageState: archivoSesion("VENDEDOR"), viewport: { width: 390, height: 844 }, hasTouch: true });

test.describe("móvil 390x844", () => {
  test("registrar una visita toma 3 pasos o menos desde «Mi día»", async ({ page }) => {
    let pasos = 0;
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Mi día" })).toBeVisible();

    // Paso 1: abrir «Registrar visita» (botón grande en la pantalla de inicio).
    await page.getByRole("link", { name: "Registrar visita" }).click();
    pasos += 1;
    await expect(page.getByRole("heading", { level: 1, name: "Registrar visita" })).toBeVisible();

    // Paso 2: elegir el cliente y anotar el resultado (el tipo ya viene en «Visita»).
    await page.getByLabel("Cliente").selectOption({ label: "Distribuidora Demo Uno" });
    await page.getByLabel("Resultado").fill(`Visita E2E móvil ${Date.now()}`);
    pasos += 1;

    // Paso 3: guardar.
    await page.getByRole("button", { name: "Guardar visita" }).click();
    pasos += 1;

    await expect(page.getByRole("status").filter({ hasText: "Visita registrada." })).toBeVisible();
    expect(pasos).toBeLessThanOrEqual(3);
  });

  test("«Mi día» muestra tareas vencidas y pendientes sin desbordar la pantalla", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 2, name: /^Vencidas/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /^Pendientes/ })).toBeVisible();
    await expect(page.getByText("Demo: llamar para confirmar entrega")).toBeVisible();
    await expect(page.getByText("Demo: enviar lista de precios")).toBeVisible();

    const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(desborda).toBe(false);
  });

  test("completar una tarea la saca de «Mi día»", async ({ page }) => {
    await page.goto("/actividades/nueva?tipo=TAREA");
    await page.getByLabel("Cliente").selectOption({ label: "Ferreteria Demo Dos" });
    const detalle = `Tarea E2E ${Date.now()}`;
    await page.getByLabel("Qué hay que hacer").fill(detalle);
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000).toISOString().slice(0, 16);
    await page.getByLabel("Recordatorio").fill(manana);
    await page.getByRole("button", { name: "Guardar tarea" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Tarea guardada." })).toBeVisible();
    await expect(page.getByText(detalle)).toBeVisible();

    await page.getByRole("listitem").filter({ hasText: detalle }).getByRole("button", { name: /^Completar/ }).click();
    await expect(page.getByText(detalle)).toHaveCount(0);
  });
});
