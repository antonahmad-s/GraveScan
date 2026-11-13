import { defineConfig, devices } from "@playwright/test";

const port = 3100;
// Sandboxes without a downloaded Playwright browser can point at a preinstalled Chromium build.
const executablePath = process.env.GRAVESCAN_CHROMIUM_PATH;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    ...(executablePath === undefined ? {} : { launchOptions: { executablePath, args: ["--no-sandbox"] } }),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node apps/web/src/server.ts",
    url: `http://127.0.0.1:${port}/healthz`,
    env: { PORT: String(port), HOST: "127.0.0.1" },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
