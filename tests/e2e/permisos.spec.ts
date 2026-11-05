import { expect, test, type Browser } from "@playwright/test";
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


// Clientes sembrados: "Distribuidora Demo Uno" es de vendedor@ y "Panaderia Ajena Tres" de bloqueo@.
async function idDeCliente(browser: Browser, baseURL: string | undefined, documento: string): Promise<string> {
  const contexto = await browser.newContext({ baseURL, storageState: archivoSesion("ADMIN") });
  const pagina = await contexto.newPage();
  await pagina.goto(`/clientes?q=${documento}`);
  const href = await pagina.getByRole("link", { name: /Demo|Ajena/ }).first().getAttribute("href");
  await contexto.close();
  expect(href, `cliente ${documento} sembrado`).toMatch(/^\/clientes\//);
  return href!.split("/").pop()!;
}

test.describe("carteras de clientes", () => {
  test.describe("VENDEDOR", () => {
    test.use({ storageState: archivoSesion("VENDEDOR") });

    test("no abre clientes ajenos ni por URL directa, ni los ve en la lista", async ({ page, browser, baseURL }) => {
      const ajeno = await idDeCliente(browser, baseURL, "20100000003");
      await page.goto(`/clientes/${ajeno}`);
      await expect(page).toHaveURL(/\/sin-permiso/);
      await page.goto(`/clientes/${ajeno}/editar`);
      await expect(page).toHaveURL(/\/sin-permiso/);

      await page.goto("/clientes?q=Ajena");
      await expect(page.getByText("No hay clientes que coincidan con la búsqueda.")).toBeVisible();
      await page.goto("/clientes?q=Demo Uno");
      await expect(page.getByRole("link", { name: "Distribuidora Demo Uno" })).toBeVisible();
    });

    test("abre un cliente propio", async ({ page, browser, baseURL }) => {
      const propio = await idDeCliente(browser, baseURL, "20100000001");
      await page.goto(`/clientes/${propio}`);
      await expect(page.getByRole("heading", { level: 1, name: "Distribuidora Demo Uno" })).toBeVisible();
    });
  });

  test.describe("JEFE_VENTAS", () => {
    test.use({ storageState: archivoSesion("JEFE_VENTAS") });
    test("ve los clientes de su equipo", async ({ page, browser, baseURL }) => {
      const ajeno = await idDeCliente(browser, baseURL, "20100000003");
      await page.goto(`/clientes/${ajeno}`);
      await expect(page.getByRole("heading", { level: 1, name: "Panaderia Ajena Tres" })).toBeVisible();
    });
  });

  test.describe("EJECUTIVO_SERVICIO", () => {
    test.use({ storageState: archivoSesion("EJECUTIVO_SERVICIO") });
    test("ve la ficha en solo lectura", async ({ page, browser, baseURL }) => {
      const id = await idDeCliente(browser, baseURL, "20100000003");
      await page.goto(`/clientes/${id}`);
      await expect(page.getByRole("heading", { level: 1, name: "Panaderia Ajena Tres" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
      await page.goto(`/clientes/${id}/editar`);
      await expect(page).toHaveURL(/\/sin-permiso/);
      await page.goto("/clientes/nuevo");
      await expect(page).toHaveURL(/\/sin-permiso/);
    });
  });
});
