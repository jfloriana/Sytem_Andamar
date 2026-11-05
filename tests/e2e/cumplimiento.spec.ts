import { expect, test, type Page } from "@playwright/test";
import { archivoSesion, type RolE2E } from "./helpers";

// Documentos únicos por corrida y por proyecto; el seed borra los clientes "E2E..." al reiniciar los datos.
const sufijo = `${Date.now()}`.slice(-8);

async function crearCliente(page: Page, documento: string, razon: string, contacto?: string) {
  await page.goto("/clientes/nuevo");
  await page.getByLabel("Documento").fill(documento);
  await page.getByLabel("Razón social").fill(razon);
  await page.getByLabel("Dirección").fill("Av. Privacidad 123, Lima");
  await page.getByLabel("Vendedor asignado").selectOption({ label: "Vendedor Uno" });
  if (contacto) {
    await page.getByLabel("Nombre del contacto").fill(contacto);
    await page.getByLabel("Teléfono del contacto").fill("944000222");
  }
  await page.getByRole("button", { name: "Crear cliente" }).click();
  await expect(page.getByRole("heading", { level: 1, name: razon })).toBeVisible();
}

async function registrarSolicitud(page: Page, documento: string, tipo: "Acceso" | "Rectificación" | "Supresión", detalle: string) {
  await page.goto("/cumplimiento/solicitudes/nueva");
  await page.getByLabel("Documento del cliente (titular)").fill(documento);
  await page.getByLabel("Tipo de solicitud").selectOption({ label: tipo });
  await page.getByLabel(/Detalle de lo que pide/).fill(detalle);
  await page.getByRole("button", { name: "Registrar solicitud" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Solicitud de ${tipo.toLowerCase()}` })).toBeVisible();
}

test.describe("ADMIN: consentimientos y solicitudes de titulares (RF-13)", () => {
  test.use({ storageState: archivoSesion("ADMIN") });

  test("retirar un consentimiento toma un clic, sin confirmación, y queda en la auditoría", async ({ page }, info) => {
    const m = info.project.name === "movil" ? "M" : "D";
    const razon = `Bodega Consentimiento ${sufijo}${m}`;
    let hubo = false;
    page.on("dialog", (d) => {
      hubo = true;
      void d.dismiss();
    });
    await crearCliente(page, `E2E${sufijo}${m}1`, razon, "Lucia Consent");

    await page.getByLabel("Finalidad").selectOption({ label: "Promociones" });
    await page.getByLabel("Canal").selectOption({ label: "Correo" });
    await page.getByRole("button", { name: "Registrar consentimiento" }).click();
    await expect(page.getByText("Consentimiento registrado.")).toBeVisible();
    await expect(page.getByTestId("contacto-responsable")).toContainText("se pueden enviar 2 comunicación(es) promocional(es)");

    // Un clic.
    await page.getByRole("button", { name: "Retirar consentimiento Promociones por Correo" }).click();
    await expect(page.getByText(/Retirado el /)).toBeVisible();
    await expect(page.getByTestId("contacto-responsable")).toContainText("el cliente retiró el consentimiento de promociones");
    await expect(page.getByRole("button", { name: /Retirar consentimiento/ })).toHaveCount(0);
    expect(hubo).toBe(false);

    await page.goto("/administracion/auditoria?accion=RETIRAR_CONSENTIMIENTO");
    await expect(page.getByRole("cell", { name: "RETIRAR_CONSENTIMIENTO" }).first()).toBeVisible();
  });

  test("la lista de consentimientos filtra y permite retirar desde Cumplimiento", async ({ page }, info) => {
    const m = info.project.name === "movil" ? "M" : "D";
    const razon = `Minimarket Lista ${sufijo}${m}`;
    await crearCliente(page, `E2E${sufijo}${m}2`, razon);
    await page.getByLabel("Finalidad").selectOption({ label: "Analítica" });
    await page.getByLabel("Canal").selectOption({ label: "Presencial" });
    await page.getByRole("button", { name: "Registrar consentimiento" }).click();
    await expect(page.getByText("Consentimiento registrado.")).toBeVisible();

    await page.goto(`/cumplimiento/consentimientos?q=${encodeURIComponent(razon)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Consentimientos" })).toBeVisible();
    const fila = page.getByRole("row").filter({ hasText: razon });
    await expect(fila).toContainText("Vigente");
    await fila.getByRole("button", { name: /Retirar/ }).click();
    await expect(fila).toContainText("Retirado el");
    await page.goto(`/cumplimiento/consentimientos?q=${encodeURIComponent(razon)}&estado=retirado`);
    await expect(page.getByRole("row").filter({ hasText: razon })).toContainText("Retirado el");
  });

  test("la supresión anonimiza los datos personales y queda en la auditoría", async ({ page }, info) => {
    const m = info.project.name === "movil" ? "M" : "D";
    const razon = `Panaderia Olvidada ${sufijo}${m}`;
    const documento = `E2E${sufijo}${m}3`;
    await crearCliente(page, documento, razon, "Rosa Olvidada");
    const urlCliente = page.url();

    await registrarSolicitud(page, documento, "Supresión", "El titular pide eliminar sus datos.");
    // Sin confirmar no se anonimiza.
    await page.getByRole("button", { name: "Anonimizar y atender" }).click();
    await expect(page.getByText("Confirma que verificaste la identidad del titular.")).toBeVisible();

    await page.getByLabel(/Confirmo que verifiqué la identidad/).check();
    await page.getByRole("button", { name: "Anonimizar y atender" }).click();
    // Al cerrarse la solicitud el formulario desaparece: queda el estado y la respuesta en la ficha de la solicitud.
    await expect(page.getByText("Datos personales anonimizados.")).toBeVisible();
    await expect(page.getByText("Atendida", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Anonimizar y atender" })).toHaveCount(0);

    await page.goto(urlCliente);
    await expect(page.getByRole("heading", { level: 1, name: "Cliente anonimizado" })).toBeVisible();
    await expect(page.getByText("Anonimizado", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Documento ANON/)).toBeVisible();
    await expect(page.getByText("Contacto anonimizado")).toBeVisible();
    await expect(page.getByText(razon)).toHaveCount(0);
    await expect(page.getByText("Rosa Olvidada")).toHaveCount(0);
    await expect(page.getByText("Av. Privacidad 123")).toHaveCount(0);
    // No se registran consentimientos nuevos de un cliente anonimizado.
    await expect(page.getByRole("button", { name: "Registrar consentimiento" })).toHaveCount(0);

    await page.goto("/administracion/auditoria?accion=ANONIMIZAR_CLIENTE");
    await expect(page.getByRole("cell", { name: "ANONIMIZAR_CLIENTE" }).first()).toBeVisible();

    // El documento original queda libre y ya no existe un titular con él.
    await page.goto("/cumplimiento/solicitudes/nueva");
    await page.getByLabel("Documento del cliente (titular)").fill(documento);
    await page.getByRole("button", { name: "Registrar solicitud" }).click();
    await expect(page.getByText("No existe un cliente con ese documento.")).toBeVisible();
  });

  test("acceso: descarga los datos del titular y se atiende; rectificación: el rechazo exige motivo", async ({ page }) => {
    await registrarSolicitud(page, "20100000001", "Acceso", "El titular pide una copia de sus datos.");
    const enlace = page.getByRole("link", { name: "Descargar datos del titular (JSON)" });
    await expect(enlace).toBeVisible();
    const respuesta = await page.request.get((await enlace.getAttribute("href")) as string);
    expect(respuesta.status()).toBe(200);
    const datos = await respuesta.json();
    expect(datos.titular.documento).toBe("20100000001");
    expect(datos.titular.razonSocial).toBe("Distribuidora Demo Uno");

    await page.getByLabel(/Respuesta al titular/).fill("Se envió el reporte por correo.");
    await page.getByRole("button", { name: "Marcar como atendida" }).click();
    await expect(page.getByText("Se envió el reporte por correo.")).toBeVisible();
    await expect(page.getByText("Atendida", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Marcar como atendida" })).toHaveCount(0);

    await registrarSolicitud(page, "20100000002", "Rectificación", "Corregir el teléfono.");
    await expect(page.getByRole("link", { name: "Editar datos del cliente" })).toBeVisible();
    await page.getByRole("button", { name: "Rechazar" }).click();
    await expect(page.getByText(/Indica el motivo del rechazo/)).toBeVisible();
    await page.getByLabel(/Respuesta al titular/).fill("No se acreditó la identidad.");
    await page.getByRole("button", { name: "Rechazar" }).click();
    await expect(page.getByText("No se acreditó la identidad.")).toBeVisible();
    await expect(page.getByText("Rechazada", { exact: true }).first()).toBeVisible();

    await page.goto("/administracion/auditoria?accion=SOLICITUD_TITULAR");
    await expect(page.getByRole("cell", { name: "ACTUALIZAR_SOLICITUD_TITULAR" }).first()).toBeVisible();
  });

  test("la bandeja muestra plazos y filtra por estado", async ({ page }) => {
    await page.goto("/cumplimiento");
    await expect(page.getByRole("heading", { level: 1, name: "Cumplimiento" })).toBeVisible();
    await expect(page.getByText("Solicitudes abiertas")).toBeVisible();
    // La semilla deja una solicitud de acceso pendiente cuyo plazo ya venció.
    await expect(page.getByRole("row").filter({ hasText: "Vencida" }).first()).toBeVisible();
    await page.getByLabel("Estado").selectOption({ label: "Rechazada" });
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(/estado=RECHAZADA/);
    await expect(page.getByRole("row").filter({ hasText: "Pendiente" })).toHaveCount(0);
  });

  test("edita la política de privacidad y la página pública muestra el texto nuevo", async ({ page, browser, baseURL }, info) => {
    const m = info.project.name === "movil" ? "M" : "D";
    const frase = `Revisión de política ${sufijo}${m}: conservamos tus datos solo mientras seas cliente.`;
    await page.goto("/cumplimiento/politica");
    await page.getByLabel("Texto de la política de privacidad").fill(`Política de privacidad de Andamar\n\n${frase}\n\nEste texto no sustituye asesoría legal.`);
    await page.getByRole("button", { name: "Guardar política" }).click();
    await expect(page.getByText(/Política guardada \(versión \d+\)/)).toBeVisible();

    // Sin sesión: la página es pública.
    const contexto = await browser.newContext({ baseURL });
    const publica = await contexto.newPage();
    await publica.goto("/privacidad");
    await expect(publica.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeVisible();
    await expect(publica.getByText(frase)).toBeVisible();
    await contexto.close();
  });
});

const SIN_ACCESO: RolE2E[] = ["GERENCIA", "JEFE_VENTAS", "VENDEDOR", "JEFE_SERVICIO", "EJECUTIVO_SERVICIO"];
for (const rol of SIN_ACCESO) {
  test.describe(`rol ${rol}: sin acceso al módulo Cumplimiento`, () => {
    test.use({ storageState: archivoSesion(rol) });

    test("las pantallas y la descarga están bloqueadas en el servidor", async ({ page }) => {
      for (const ruta of ["/cumplimiento", "/cumplimiento/consentimientos", "/cumplimiento/politica", "/cumplimiento/solicitudes/nueva"]) {
        await page.goto(ruta);
        await expect(page, ruta).toHaveURL(/\/sin-permiso/);
        await expect(page.getByRole("heading", { level: 1, name: "Sin permiso" })).toBeVisible();
      }
      const descarga = await page.request.get("/cumplimiento/solicitudes/no-existe/exportar");
      expect(descarga.status()).toBe(403);
    });

    test("puede leer la política de privacidad", async ({ page }) => {
      await page.goto("/privacidad");
      await expect(page.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeVisible();
    });
  });
}

test.describe("EJECUTIVO_SERVICIO: consentimientos en solo lectura en la vista 360", () => {
  test.use({ storageState: archivoSesion("EJECUTIVO_SERVICIO") });

  test("ve los consentimientos pero no puede retirarlos ni registrarlos", async ({ page }) => {
    await page.goto("/clientes?q=20100000001");
    await page.getByRole("link", { name: "Distribuidora Demo Uno" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Consentimientos" })).toBeVisible();
    await expect(page.getByTestId("contacto-responsable")).toBeVisible();
    await expect(page.getByText("Promociones · Correo").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Retirar consentimiento/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Registrar consentimiento" })).toHaveCount(0);
  });
});

test.describe("VENDEDOR: sin acceso a consentimientos", () => {
  test.use({ storageState: archivoSesion("VENDEDOR") });

  test("la ficha de su cliente avisa que su rol no los ve", async ({ page }) => {
    await page.goto("/clientes?q=20100000001");
    await page.getByRole("link", { name: "Distribuidora Demo Uno" }).click();
    await expect(page.getByText("Tu rol no tiene acceso a los consentimientos.")).toBeVisible();
  });
});

// Capturas de revisión (docs/capturas/): se generan solo con CAPTURAS=1 para no reescribir archivos en cada corrida.
test.describe("capturas de Cumplimiento", () => {
  test.skip(!process.env.CAPTURAS, "Defina CAPTURAS=1 para regenerar docs/capturas/.");
  test.use({ storageState: archivoSesion("ADMIN") });

  test("guarda las pantallas principales", async ({ page }, info) => {
    const sufijoProyecto = info.project.name;
    for (const [ruta, nombre] of [
      ["/cumplimiento", "cumplimiento"],
      ["/cumplimiento/consentimientos", "cumplimiento-consentimientos"],
      ["/privacidad", "privacidad"],
    ] as const) {
      await page.goto(ruta, { waitUntil: "networkidle" });
      await page.screenshot({ path: `docs/capturas/${nombre}-${sufijoProyecto}.png`, fullPage: true });
    }
  });
});
