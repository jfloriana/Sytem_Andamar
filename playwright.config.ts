import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

// Las pruebas usan una base de datos de PRUEBAS (distinta de la real) cargada con el seed.
// Antes de la suite: `npm run db:seed` (restablece usuarios y contadores de bloqueo).
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
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
