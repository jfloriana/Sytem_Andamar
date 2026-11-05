import { expect, test, type Page } from "@playwright/test";
import { archivoSesion } from "./helpers";

// Documentos y nombres únicos por corrida; el seed borra los clientes "E2E..." al reiniciar los datos.
const sufijo = `${Date.now()}`.slice(-9);

test.describe("VENDEDOR: crear cliente, duplicados y vista 360", () => {
  test.use({ storageState: archivoSesion("VENDEDOR") });
  const documento = `E2E${sufijo}`;
  const razon = `Comercial Prueba ${sufijo}`;

  async function llenar(page: Page, doc: string, nombre: string) {
    await page.goto("/clientes/nuevo");
    await page.getByLabel("Documento").fill(doc);
    await page.getByLabel("Razón social").fill(nombre);
    await page.getByLabel("Dirección").fill("Av. Prueba 123, Lima");
  }

  test("valida en línea, crea el cliente y muestra la vista 360", async ({ page }) => {
    await page.goto("/clientes/nuevo");
    await page.getByLabel("Documento").fill("1");
    await page.getByLabel("Razón social").focus();
    await expect(page.getByText("El documento debe tener entre 6 y 20 letras o números.")).toBeVisible();

    await llenar(page, documento, razon);
    await page.getByLabel("Teléfono", { exact: true }).fill(`955${sufijo.slice(-6)}`);
    await page.getByLabel("Nombre del contacto").fill("Marta Prueba");
    await page.getByLabel("Teléfono del contacto").fill("944000111");
    await page.getByRole("button", { name: "Crear cliente" }).click();

    await expect(page.getByRole("heading", { level: 1, name: razon })).toBeVisible();
    await expect(page.getByText("Datos completos")).toBeVisible();
    for (const seccion of ["Datos", "Contactos", "Pedidos", "Oportunidades", "Actividades", "Casos", "Consentimientos", "Línea de tiempo"]) {
      await expect(page.getByRole("heading", { level: 2, name: seccion, exact: true })).toBeVisible();
    }
    await expect(page.getByText("Marta Prueba")).toBeVisible();
    await expect(page.getByText("Sin pedidos registrados.")).toBeVisible();
    await expect(page.getByText("Aún no hay actividad registrada para este cliente.")).toBeVisible();
  });

  test("documento repetido da error y nombre parecido avisa y deja confirmar", async ({ page }) => {
    await llenar(page, documento, "Otro nombre distinto");
    await page.getByRole("button", { name: "Crear cliente" }).click();
    await expect(page.getByText(/Ya existe un cliente con ese documento/)).toBeVisible();

    await llenar(page, `E2E${Number(sufijo) + 1}`, razon.toUpperCase());
    await page.getByRole("button", { name: "Crear cliente" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Posible duplicado" })).toBeVisible();
    await expect(page).toHaveURL(/\/clientes\/nuevo/);
    await page.getByRole("button", { name: "Guardar de todos modos" }).click();
    await expect(page.getByRole("heading", { level: 1, name: razon.toUpperCase() })).toBeVisible();
  });

  test("edita el cliente y agrega un contacto", async ({ page }) => {
    const nombre = `Taller Edicion ${sufijo}`;
    await llenar(page, `E2E${Number(sufijo) + 2}`, nombre);
    await page.getByRole("button", { name: "Crear cliente" }).click();
    await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();

    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByLabel("Dirección").fill("Calle Nueva 456, Lima");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Calle Nueva 456, Lima")).toBeVisible();

    await page.getByText("Agregar contacto").click();
    await page.locator("#c-nuevo-nombre").fill("Pedro Segundo");
    await page.locator("#c-nuevo-email").fill("pedro@prueba.test");
    await page.getByRole("button", { name: "Guardar contacto" }).click();
    await expect(page.getByText("Contacto guardado.")).toBeVisible();
    await expect(page.getByText("Pedro Segundo")).toBeVisible();
  });

  test("busca por nombre, documento y teléfono", async ({ page }) => {
    for (const q of ["Distribuidora Demo", "20100000001", "900000001"]) {
      await page.goto(`/clientes?q=${q}`);
      await expect(page.getByRole("link", { name: "Distribuidora Demo Uno" })).toBeVisible();
    }
    await page.goto("/clientes?q=zzzz-no-existe");
    await expect(page.getByText("No hay clientes que coincidan con la búsqueda.")).toBeVisible();
  });
});

test.describe("ADMIN: importación CSV", () => {
  test.use({ storageState: archivoSesion("ADMIN") });

  test("vista previa con informe de errores y duplicados; importa solo tras confirmar", async ({ page, isMobile }) => {
    // Escribe 558 clientes: se ejecuta una vez (escritorio).
    test.skip(isMobile, "importación con escritura: solo escritorio");
    await page.goto("/clientes/importar");
    await page.getByLabel("Archivo CSV").setInputFiles("samples/clientes_importacion.csv");
    await page.getByRole("button", { name: "Revisar archivo" }).click();

    await expect(page.getByRole("heading", { name: "2. Revisa el informe" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Errores por fila" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Duplicados por documento" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Advertencias (se importan igual)" })).toBeVisible();
    const resumen = page.locator("dl").filter({ hasText: "Filas leídas" });
    await expect(resumen).toContainText("Filas leídas600");
    await expect(resumen).toContainText("Con errores (no se importan)30");
    await expect(resumen).toContainText("Duplicadas por documento (no se importan)12");
    await expect(resumen).toContainText("Listas para importar558");

    // Hasta confirmar, no hay clientes de la muestra en el sistema.
    await page.goto("/clientes?q=2099");
    await expect(page.getByText("No hay clientes que coincidan con la búsqueda.")).toBeVisible();

    await page.goto("/clientes/importar");
    await page.getByLabel("Archivo CSV").setInputFiles("samples/clientes_importacion.csv");
    await page.getByRole("button", { name: "Revisar archivo" }).click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Importar 558 clientes" }).click();
    await expect(page.getByText(/Importación terminada: 558 clientes importados/)).toBeVisible({ timeout: 90_000 });

    await page.goto("/administracion/auditoria?accion=IMPORTAR_CLIENTES");
    await expect(page.getByRole("cell", { name: "IMPORTAR_CLIENTES" }).first()).toBeVisible();
  });

  test("rechaza un archivo sin las columnas obligatorias", async ({ page }) => {
    await page.goto("/clientes/importar");
    await page.getByLabel("Archivo CSV").setInputFiles({ name: "malo.csv", mimeType: "text/csv", buffer: Buffer.from("a,b\n1,2\n") });
    await page.getByRole("button", { name: "Revisar archivo" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Faltan columnas obligatorias" })).toBeVisible();
  });
});

test.describe("tablas", () => {
  test.use({ storageState: archivoSesion("ADMIN") });

  test("ninguna celda queda cortada fuera de la pantalla", async ({ page, isMobile }) => {
    test.skip(!isMobile, "el recorte solo ocurría en móvil; en escritorio las tablas se desplazan");
    for (const ruta of ["/administracion/usuarios", "/administracion/auditoria", "/clientes"]) {
      await page.goto(ruta);
      const ancho = page.viewportSize()!.width;
      const fuera = await page.evaluate((w) => {
        const celdas = [...document.querySelectorAll("td")].filter((c) => c.getBoundingClientRect().width > 0);
        return celdas.filter((c) => c.getBoundingClientRect().right > w + 1).length;
      }, ancho);
      expect(fuera, `celdas fuera de la pantalla en ${ruta}`).toBe(0);
      const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(desborde).toBeLessThanOrEqual(1);
    }
  });
});
