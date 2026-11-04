import { defineConfig, devices } from "@playwright/test";

// Playwright no carga .env por sí solo: se lee aquí (sin sobrescribir lo ya definido en el entorno).
try {
  process.loadEnvFile(".env");
} catch {
  // sin .env: se usa solo el entorno
}
process.env.E2E_PASSWORD ||= process.env.SEED_PASSWORD;
// Un BASE_URL vacío en .env cuenta como no definido.
if (!process.env.BASE_URL) delete process.env.BASE_URL;
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

// Las pruebas usan una base de datos de PRUEBAS (distinta de la real) cargada con el seed.
// Antes de la suite: `npm run db:seed` (restablece usuarios y contadores de bloqueo).
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // La base de pruebas es remota (latencia de red): margen mayor que el de 5 s por defecto.
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "es",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  // Con BASE_URL apuntando a una URL publicada no se levanta servidor local.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run build && npm start",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 300_000,
      },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "escritorio",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: "movil",
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
      // auth.spec bloquea una cuenta real: se ejecuta una sola vez (en escritorio).
      testIgnore: [/auth\.setup\.ts/, /auth\.spec\.ts/],
    },
  ],
});
