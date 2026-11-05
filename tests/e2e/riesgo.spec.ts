import { expect, test } from "@playwright/test";
import { archivoSesion } from "./helpers";

// Prepara la alerta: «Recalcular ahora» como ADMIN antes de leer la lista con otros roles.
test.describe.configure({ mode: "serial" });

test.describe("clientes en riesgo (RF-08)", () => {
  test.describe("ADMIN", () => {
    test.use({ storageState: archivoSesion("ADMIN") });
    test("recalcula para generar la alerta", async ({ page }) => {
      await page.goto("/indicadores");
      await page.getByRole("button", { name: "Recalcular ahora" }).click();
      await expect(page.getByRole("status").filter({ hasText: /clientes clasificados/ })).toBeVisible({ timeout: 60_000 });
    });
  });

  test.describe("VENDEDOR", () => {
    test.use({ storageState: archivoSesion("VENDEDOR") });

    test("ve solo los clientes en riesgo de su cartera, con días sin compra e intervalo habitual", async ({ page }) => {
      await page.goto("/clientes/riesgo");
      await expect(page.getByRole("heading", { level: 1, name: "Clientes en riesgo" })).toBeVisible();
      const fila = page.getByRole("row").filter({ hasText: "Tienda Riesgo Muestra" });
      await expect(fila).toBeVisible();
      await expect(fila).toContainText("Segmento A");
      await expect(fila).toContainText(/\d+ días/);
      await expect(fila).toContainText("cada 30 días");
      // El cliente en riesgo de otra cartera no aparece.
      await expect(page.getByText("Panaderia Ajena Tres")).toHaveCount(0);
    });

    test("filtra por segmento", async ({ page }) => {
      await page.goto("/clientes/riesgo");
      await page.getByLabel("Segmento").selectOption("C");
      await page.getByRole("button", { name: "Filtrar" }).click();
      await expect(page).toHaveURL(/segmento=C/);
      await expect(page.getByText("Tienda Riesgo Muestra")).toHaveCount(0);
      await page.getByLabel("Segmento").selectOption("A");
      await page.getByRole("button", { name: "Filtrar" }).click();
      await expect(page.getByRole("link", { name: "Tienda Riesgo Muestra" })).toBeVisible();
    });

    test("se llega desde Clientes", async ({ page }) => {
      await page.goto("/clientes");
      await page.getByRole("link", { name: "Clientes en riesgo" }).click();
      await expect(page).toHaveURL(/clientes\/riesgo/);
    });
  });

  test.describe("JEFE_VENTAS", () => {
    test.use({ storageState: archivoSesion("JEFE_VENTAS") });

    test("ve los clientes en riesgo de su equipo y filtra por vendedor", async ({ page }) => {
      await page.goto("/clientes/riesgo");
      await expect(page.getByRole("link", { name: "Tienda Riesgo Muestra" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Panaderia Ajena Tres" })).toBeVisible();
      await page.getByLabel("Vendedor").selectOption({ label: "Vendedor Uno" });
      await page.getByRole("button", { name: "Filtrar" }).click();
      await expect(page.getByRole("link", { name: "Tienda Riesgo Muestra" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Panaderia Ajena Tres" })).toHaveCount(0);
    });
  });
});
