import { expect, test } from "@playwright/test";
import { archivoSesion, type RolE2E } from "./helpers";

const CLIENTES = ["Clientes activos", "Clientes en riesgo"];
const COMERCIAL = ["Oportunidades abiertas", "Pedidos del mes"];
const SERVICIO = ["Casos abiertos", "Casos con plazo vencido"];
const CUMPLIMIENTO = ["Solicitudes de titulares", "Usuarios activos"];
const TODOS = [...CLIENTES, ...COMERCIAL, ...SERVICIO, ...CUMPLIMIENTO];

// Indicadores que cada rol debe ver en «Mi día» (y los demás no deben aparecer).
const ESPERADO: Record<RolE2E, string[]> = {
  ADMIN: [...CLIENTES, ...CUMPLIMIENTO],
  GERENCIA: [...CLIENTES, ...COMERCIAL, ...SERVICIO],
  JEFE_VENTAS: [...CLIENTES, ...COMERCIAL],
  VENDEDOR: [...CLIENTES, ...COMERCIAL],
  JEFE_SERVICIO: [...CLIENTES, ...COMERCIAL, ...SERVICIO],
  EJECUTIVO_SERVICIO: [...CLIENTES, ...COMERCIAL, ...SERVICIO],
};

for (const rol of Object.keys(ESPERADO) as RolE2E[]) {
  test.describe(`inicio del rol ${rol}`, () => {
    test.use({ storageState: archivoSesion(rol) });

    test("muestra sus indicadores y ninguno que no le corresponda", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1, name: "Mi día" })).toBeVisible();
      const indicadores = page.getByRole("region", { name: "Indicadores del día" });
      await expect(indicadores).toBeVisible();
      for (const kpi of TODOS) {
        const tarjeta = indicadores.locator(`[data-kpi="${kpi}"]`);
        if (ESPERADO[rol].includes(kpi)) await expect(tarjeta).toBeVisible();
        else await expect(tarjeta).toHaveCount(0);
      }
    });

    test("cada indicador enlaza a su módulo y la página no desborda", async ({ page }) => {
      await page.goto("/");
      const primero = page.getByRole("region", { name: "Indicadores del día" }).locator("a[data-kpi]").first();
      await expect(primero).toHaveAttribute("href", /^\/(clientes|cumplimiento|oportunidades|pedidos|casos)/);
      const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(desborda).toBe(false);
    });
  });
}

test.describe("inicio: ventas y secciones por rol", () => {
  test.describe("VENDEDOR", () => {
    test.use({ storageState: archivoSesion("VENDEDOR") });
    test("ve el gráfico de pedidos con su tabla y sus tareas", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 2, name: /Pedidos de los últimos 6 meses/ })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: /^Vencidas/ })).toBeVisible();
      await expect(page.getByRole("link", { name: "Registrar visita" })).toBeVisible();
    });
  });

  test.describe("ADMIN", () => {
    test.use({ storageState: archivoSesion("ADMIN") });
    test("ve cumplimiento y distribución de cartera, sin tareas ni ventas", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 2, name: "Clientes por segmento" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: /Pedidos de los últimos 6 meses/ })).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 2, name: /^Vencidas/ })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Registrar visita" })).toHaveCount(0);
    });
  });
});
