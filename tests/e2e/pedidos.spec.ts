import { expect, test } from "@playwright/test";
import { archivoSesion } from "./helpers";

test.describe("VENDEDOR: pedidos", () => {
  test.use({ storageState: archivoSesion("VENDEDOR") });

  test("registra un pedido, actualiza la ficha y el pedido anulado no cuenta", async ({ page }) => {
    // Monto distintivo para reconocer la fila entre corridas.
    const monto = `${100 + (Date.now() % 800)}.25`;
    await page.goto("/pedidos/nuevo");
    await page.getByLabel("Cliente").selectOption({ label: "Distribuidora Demo Uno" });
    await page.getByLabel("Monto (USD)").fill("0");
    await page.getByLabel("Margen (USD)").fill("5");
    await page.getByRole("button", { name: "Registrar pedido" }).click();
    await expect(page.getByText("El monto debe ser mayor que cero.")).toBeVisible();

    await page.getByLabel("Monto (USD)").fill(monto);
    await page.getByLabel("Margen (USD)").fill("150.50");
    await page.getByRole("button", { name: "Registrar pedido" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Distribuidora Demo Uno" })).toBeVisible();
    await expect(page.getByText("Registrado", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Último pedido", { exact: true }).locator("xpath=following-sibling::dd")).not.toHaveText("Sin pedidos");
    await expect(page.getByText(/sin pedidos anulados/)).toBeVisible();
    // El pedido anulado del seed (9.999) no figura en los totales de la ficha.
    await expect(page.getByText(/sin pedidos anulados/)).not.toContainText("9,999");

    await page.goto("/pedidos");
    const patron = new RegExp(String.raw`US\$\s?` + monto.replace(".", String.raw`\.`));
    const fila = page.getByRole("row").filter({ hasText: patron }).first();
    page.once("dialog", (d) => d.accept());
    await fila.getByRole("button", { name: /^Anular/ }).click();
    await expect(fila.getByText("Anulado")).toBeVisible();
    await expect(fila.getByRole("button")).toHaveCount(0);
  });

  test("el vendedor no ve pedidos de otras carteras", async ({ page }) => {
    await page.goto("/pedidos");
    await expect(page.getByRole("heading", { level: 1, name: "Pedidos" })).toBeVisible();
    await expect(page.getByText("Panaderia Ajena Tres")).toHaveCount(0);
  });
});
