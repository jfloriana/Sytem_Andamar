import { expect, test } from "@playwright/test";
import { archivoSesion } from "./helpers";

const TITULOS = [
  "Retención de clientes",
  "Conversión de oportunidades",
  "Resolución en primer contacto",
  "Tiempo medio de respuesta",
  "Completitud de datos",
  "Usuarios activos del CRM",
];

test.describe("GERENCIA: tablero de indicadores", () => {
  test.use({ storageState: archivoSesion("GERENCIA") });

  test("muestra los seis indicadores con meta, línea base y semáforo", async ({ page }) => {
    await page.goto("/indicadores");
    await expect(page.getByRole("heading", { level: 1, name: "Indicadores" })).toBeVisible();
    for (const titulo of TITULOS) {
      const tarjeta = page.locator("section[aria-label='Seis indicadores'] > div").filter({ has: page.getByText(titulo, { exact: true }) });
      await expect(tarjeta, titulo).toHaveCount(1);
      await expect(tarjeta.locator("dt", { hasText: "Meta" })).toBeVisible();
      await expect(tarjeta.locator("dt", { hasText: "Línea base" })).toBeVisible();
      // El semáforo siempre lleva texto, no solo color.
      await expect(tarjeta.getByText(/Cumple la meta|Entre línea base y meta|Bajo la línea base|Sin datos/).first()).toBeVisible();
    }
    // Metas y líneas base del spec.
    const retencion = page.locator("section[aria-label='Seis indicadores'] > div").filter({ has: page.getByText("Retención de clientes", { exact: true }) });
    await expect(retencion).toContainText("83 %");
    await expect(retencion).toContainText("78 %");
    const primerContacto = page.locator("section[aria-label='Seis indicadores'] > div").filter({ has: page.getByText("Resolución en primer contacto", { exact: true }) });
    await expect(primerContacto).toContainText("No se mide");
  });

  test("cada gráfico tiene texto alternativo y tabla de datos", async ({ page }) => {
    await page.goto("/indicadores");
    await expect(page.getByRole("img", { name: /Tendencia mensual de Conversión de oportunidades/ })).toBeVisible();
    const tarjeta = page.locator("section[aria-label='Seis indicadores'] > div").filter({ has: page.getByText("Conversión de oportunidades", { exact: true }) });
    await tarjeta.getByText("Datos de la tendencia").click();
    await expect(tarjeta.getByRole("table", { name: /Tendencia mensual de Conversión/ })).toBeVisible();
    await tarjeta.getByText("Cómo se calcula").click();
    await expect(tarjeta.getByText(/creadas en el período x 100/)).toBeVisible();
    await expect(page.getByRole("img", { name: /Clientes por segmento/ })).toBeVisible();
    await expect(page.getByText(/Aproximación simplificada: CLV/)).toBeVisible();
  });

  test("filtra por segmento y período, y rechaza un período inválido", async ({ page }) => {
    await page.goto("/indicadores");
    await page.getByRole("combobox", { name: "Segmento" }).selectOption("A");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/segmento=A/);
    await expect(page.getByText(/Segmento A/).first()).toBeVisible();

    await page.goto("/indicadores?desde=2026-05-01&hasta=2026-04-01");
    await expect(page.getByRole("alert").filter({ hasText: "anterior o igual" })).toBeVisible();
  });

  test("exporta el tablero en CSV", async ({ page }) => {
    await page.goto("/indicadores");
    const descarga = page.waitForEvent("download");
    await page.getByRole("link", { name: "Exportar CSV" }).click();
    const archivo = await descarga;
    expect(archivo.suggestedFilename()).toMatch(/^indicadores-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/);
    const lectura = await archivo.createReadStream();
    const trozos: Buffer[] = [];
    for await (const t of lectura) trozos.push(t as Buffer);
    const texto = Buffer.concat(trozos).toString("utf-8");
    for (const titulo of TITULOS) expect(texto).toContain(titulo);
    expect(texto).toContain("CLV por segmento");
  });

  test("ofrece la vista imprimible y no muestra «Recalcular ahora»", async ({ page }) => {
    await page.goto("/indicadores");
    await expect(page.getByRole("button", { name: "Imprimir / guardar PDF" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recalcular ahora" })).toHaveCount(0);
  });

  test("en pantalla angosta no hay desplazamiento horizontal", async ({ page }, info) => {
    test.skip(info.project.name !== "movil", "Solo aplica al proyecto móvil.");
    await page.goto("/indicadores");
    await expect(page.getByRole("heading", { level: 1, name: "Indicadores" })).toBeVisible();
    const ancho = await page.evaluate(() => ({ contenido: document.documentElement.scrollWidth, ventana: window.innerWidth }));
    expect(ancho.contenido).toBeLessThanOrEqual(ancho.ventana);
  });
});

test.describe("permisos del tablero", () => {
  test.describe("VENDEDOR", () => {
    test.use({ storageState: archivoSesion("VENDEDOR") });
    test("no abre indicadores ni la exportación", async ({ page }) => {
      await page.goto("/indicadores");
      await expect(page).toHaveURL(/sin-permiso/);
      const r = await page.request.get("/indicadores/exportar");
      expect(r.status()).toBe(403);
    });
  });

  test.describe("EJECUTIVO_SERVICIO", () => {
    test.use({ storageState: archivoSesion("EJECUTIVO_SERVICIO") });
    test("no abre indicadores", async ({ page }) => {
      await page.goto("/indicadores");
      await expect(page).toHaveURL(/sin-permiso/);
    });
  });

  test.describe("JEFE_SERVICIO", () => {
    test.use({ storageState: archivoSesion("JEFE_SERVICIO") });
    test("lee los indicadores sin poder recalcular", async ({ page }) => {
      await page.goto("/indicadores");
      await expect(page.getByRole("heading", { level: 1, name: "Indicadores" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Recalcular ahora" })).toHaveCount(0);
    });
  });

  test.describe("JEFE_VENTAS", () => {
    test.use({ storageState: archivoSesion("JEFE_VENTAS") });
    test("ve el tablero de su equipo con filtro de vendedor", async ({ page }) => {
      await page.goto("/indicadores");
      await expect(page.getByRole("heading", { level: 1, name: "Indicadores" })).toBeVisible();
      await expect(page.getByLabel("Vendedor")).toBeVisible();
      await expect(page.getByRole("button", { name: "Recalcular ahora" })).toHaveCount(0);
    });
  });
});

test.describe("ADMIN: recalcular ahora", () => {
  test.use({ storageState: archivoSesion("ADMIN") });

  test("recalcula segmentos, riesgo y casos y deja el histórico en la ficha", async ({ page }) => {
    await page.goto("/indicadores");
    await page.getByRole("button", { name: "Recalcular ahora" }).click();
    await expect(page.getByRole("status").filter({ hasText: /clientes clasificados/ })).toBeVisible({ timeout: 60_000 });

    await page.goto("/clientes?q=Tienda Riesgo Muestra");
    await page.getByRole("link", { name: "Tienda Riesgo Muestra" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tienda Riesgo Muestra" })).toBeVisible();
    await expect(page.getByText("En riesgo", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Segmento A", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Valor del cliente (CLV)", { exact: true })).toBeVisible();
    await expect(page.getByText(/Es una aproximación/)).toBeVisible();
    const mes = new Date().toISOString().slice(0, 7);
    await expect(page.getByRole("table", { name: /Histórico mensual de segmento/ }).getByRole("cell", { name: mes })).toBeVisible();
  });

  test("el recálculo queda en auditoría", async ({ page }) => {
    await page.goto("/administracion/auditoria?accion=RECALCULAR_SEGMENTACION");
    await expect(page.getByRole("cell", { name: "RECALCULAR_SEGMENTACION" }).first()).toBeVisible();
  });
});
