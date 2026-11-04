import { test as setup } from "@playwright/test";
import { archivoSesion, claveE2E, esperarInicio, iniciarSesion, ROLES_E2E } from "./helpers";

// Inicia sesión una vez por rol y guarda el estado para reutilizarlo.
for (const { rol, email } of ROLES_E2E) {
  setup(`sesión de ${rol}`, async ({ page }) => {
    await iniciarSesion(page, email, claveE2E());
    await esperarInicio(page);
    await page.context().storageState({ path: archivoSesion(rol) });
  });
}
