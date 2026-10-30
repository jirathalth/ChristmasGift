import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop-journey", testMatch: /secret-santa\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "accessibility", testMatch: /accessibility\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-reduced-motion", testMatch: /mobile\.spec\.ts/, use: { ...devices["iPhone 13"], reducedMotion: "reduce" } }
  ],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI }
});
