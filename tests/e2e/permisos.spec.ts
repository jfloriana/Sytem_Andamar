import { expect, test } from "@playwright/test";
import { archivoSesion, type RolE2E } from "./helpers";

// Menú esperado por rol (módulos del menú lateral o del menú desplegable en móvil).
const MENU: Record<RolE2E, string[]> = {
  ADMIN: ["Inicio", "Clientes", "Indicadores", "Cumplimiento", "Administración"],
  GERENCIA: ["Inicio", "Clientes", "Oportunidades", "Pedidos", "Casos", "Indicadores"],
  JEFE_VENTAS: ["Inicio", "Clientes", "Oportunidades", "Pedidos", "Indicadores"],
  VENDEDOR: ["Inicio", "Clientes", "Oportunidades", "Pedidos"],
  JEFE_SERVICIO: ["Inicio", "Clientes", "Oportunidades", "Pedidos", "Casos", "Indicadores"],
  EJECUTIVO_SERVICIO: ["Inicio", "Clientes", "Oportunidades", "Pedidos", "Casos"],
};

const TODOS = ["Inicio", "Clientes", "Oportunidades", "Pedidos", "Casos", "Indicadores", "Cumplimiento", "Administración"];

for (const rol of Object.keys(MENU) as RolE2E[]) {
  test.describe(`rol ${rol}`, () => {
    test.use({ storageState: archivoSesion(rol) });

    test("ve solo su menú", async ({ page, isMobile }) => {
      await page.goto("/");
      if (isMobile) await page.getByText("Menú", { exact: true }).click();
      const nav = page.getByRole("navigation", { name: "Módulos" }).filter({ visible: true });
      for (const modulo of TODOS) {
        const enlace = nav.getByRole("link", { name: modulo, exact: true });
        if (MENU[rol].includes(modulo)) await expect(enlace).toBeVisible();
        else await expect(enlace).toHaveCount(0);
      }
    });

    if (rol !== "ADMIN") {
      test("no abre Administración ni por URL directa", async ({ page }) => {
        await page.goto("/administracion/usuarios");
        await expect(page).toHaveURL(/\/sin-permiso/);
        await expect(page.getByRole("heading", { name: "Sin permiso" })).toBeVisible();
        await page.goto("/administracion/auditoria");
        await expect(page).toHaveURL(/\/sin-permiso/);
      });
    }
  });
}

// La prueba "un VENDEDOR no abre clientes ajenos ni por URL directa" se agrega en la fase 2,
// cuando existe /clientes/[id] y los datos sembrados tienen clientes de varios vendedores.
