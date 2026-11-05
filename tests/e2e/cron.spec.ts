import { expect, test } from "@playwright/test";

// Las rutas cron se protegen con CRON_SECRET, no con la sesión: se prueban sin cookies.
test.use({ storageState: { cookies: [], origins: [] } });

for (const ruta of ["/api/cron/diario", "/api/cron/mensual"]) {
  test.describe(ruta, () => {
    test("responde 401 sin la cabecera Authorization", async ({ request }) => {
      const r = await request.get(ruta, { maxRedirects: 0 });
      expect(r.status()).toBe(401);
    });

    test("responde 401 con un secreto incorrecto", async ({ request }) => {
      const r = await request.get(ruta, { headers: { authorization: "Bearer secreto-incorrecto" }, maxRedirects: 0 });
      expect(r.status()).toBe(401);
      expect(await r.text()).not.toContain("secreto-incorrecto");
    });

    test("ejecuta la tarea con el secreto correcto", async ({ request }) => {
      const secreto = process.env.CRON_SECRET;
      test.skip(!secreto, "Define CRON_SECRET en el entorno para probar la ejecución autorizada.");
      const r = await request.get(ruta, { headers: { authorization: `Bearer ${secreto}` }, timeout: 90_000 });
      expect(r.status()).toBe(200);
      const cuerpo = await r.json();
      expect(cuerpo.ok).toBe(true);
      expect(JSON.stringify(cuerpo)).not.toContain(secreto as string);
    });
  });
}
