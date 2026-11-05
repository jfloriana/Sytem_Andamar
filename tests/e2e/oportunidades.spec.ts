import { expect, test, type Page } from "@playwright/test";
import { archivoSesion } from "./helpers";

// Títulos únicos por corrida; el seed borra las oportunidades de los clientes demo al reiniciar los datos.
const sufijo = `${Date.now()}`.slice(-9);

async function crearOportunidad(page: Page, cliente: string, titulo: string) {
  await page.goto("/oportunidades/nueva");
  await page.getByLabel("Cliente").selectOption({ label: cliente });
  await page.getByLabel("Título").fill(titulo);
  await page.getByLabel("Monto estimado (USD)").fill("2500.50");
  await page.getByRole("button", { name: "Crear oportunidad" }).click();
  await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
}

async function abrirMover(page: Page, etapa: string) {
  await page.getByRole("button", { name: "Mover etapa" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Nueva etapa").selectOption({ label: etapa });
  return dialogo;
}

test.describe("VENDEDOR: embudo de oportunidades", () => {
  test.use({ storageState: archivoSesion("VENDEDOR") });

  test("no avanza de etapa sin actividad y avanza después de registrar una", async ({ page }) => {
    const titulo = `Oportunidad avance ${sufijo}`;
    await crearOportunidad(page, "Distribuidora Demo Uno", titulo);
    await expect(page.getByText("Necesita actividad")).toBeVisible();

    const dialogo = await abrirMover(page, "Contactado");
    await dialogo.getByRole("button", { name: "Mover", exact: true }).click();
    await expect(dialogo.getByRole("alert")).toContainText("Registra al menos una actividad");
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("Prospecto", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Registrar actividad" }).click();
    await page.getByLabel("Resultado").fill("Llamada de seguimiento: pidió propuesta");
    await page.getByRole("button", { name: "Guardar actividad" }).click();
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
    await expect(page.getByText("Puede avanzar")).toBeVisible();

    const mover = await abrirMover(page, "Contactado");
    await mover.getByRole("button", { name: "Mover", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Contactado", { exact: true })).toBeVisible();
    // La actividad anterior no sirve para el siguiente avance: hay que registrar otra.
    await expect(page.getByText("Necesita actividad")).toBeVisible();
  });

  test("marcar una oportunidad como perdida exige el motivo", async ({ page }) => {
    const titulo = `Oportunidad perdida ${sufijo}`;
    await crearOportunidad(page, "Ferreteria Demo Dos", titulo);

    const dialogo = await abrirMover(page, "Perdida");
    await dialogo.getByRole("button", { name: "Mover", exact: true }).click();
    await expect(dialogo.getByText("Indica el motivo de la pérdida.")).toBeVisible();

    await dialogo.getByLabel("Motivo de la pérdida").fill("Precio muy alto");
    await dialogo.getByRole("button", { name: "Mover", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Perdida", { exact: true })).toBeVisible();
    await expect(page.getByText("Precio muy alto")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mover etapa" })).toHaveCount(0);
  });

  test("el tablero muestra las seis etapas y la lista filtra; no ve oportunidades ajenas", async ({ page }) => {
    await page.goto("/oportunidades");
    for (const etapa of ["Prospecto", "Contactado", "Propuesta", "Negociación", "Ganada", "Perdida"]) {
      await expect(page.getByRole("heading", { level: 2, name: new RegExp(`^${etapa}`) })).toBeVisible();
    }
    await expect(page.getByText("Demo: Linea nueva")).toBeVisible();
    await expect(page.getByText("Demo: Oportunidad ajena")).toHaveCount(0);

    await page.getByRole("link", { name: "Lista" }).click();
    await expect(page).toHaveURL(/vista=lista/);
    await expect(page.getByRole("link", { name: "Demo: Linea nueva" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Demo: Oportunidad ajena" })).toHaveCount(0);
  });
});

test.describe("JEFE_VENTAS: equipo y reasignación", () => {
  test.use({ storageState: archivoSesion("JEFE_VENTAS") });

  test("ve la oportunidad del equipo y puede reasignarla", async ({ page }) => {
    await page.goto("/oportunidades?vista=lista");
    await expect(page.getByRole("link", { name: "Demo: Oportunidad ajena" })).toBeVisible();

    const titulo = `Oportunidad reasignada ${sufijo}`;
    await crearOportunidad(page, "Panaderia Ajena Tres", titulo);
    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByLabel("Vendedor responsable").selectOption({ label: "Vendedor Uno" });
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
    await expect(page.getByText("Vendedor Uno")).toBeVisible();
  });
});

test.describe("permisos de oportunidades", () => {
  test("el ejecutivo de servicio las ve pero no puede crearlas ni moverlas", async ({ browser, baseURL }) => {
    const contexto = await browser.newContext({ baseURL, storageState: archivoSesion("EJECUTIVO_SERVICIO") });
    const page = await contexto.newPage();
    await page.goto("/oportunidades");
    await expect(page.getByRole("heading", { level: 1, name: "Oportunidades" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nueva oportunidad" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mover etapa" })).toHaveCount(0);
    await page.goto("/oportunidades/nueva");
    await expect(page).toHaveURL(/\/sin-permiso/);
    await contexto.close();
  });
});
