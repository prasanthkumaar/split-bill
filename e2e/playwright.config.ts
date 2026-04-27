import { defineConfig } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000"
const portFromBaseURL = new URL(baseURL).port
const appPort =
  process.env.PORT ??
  (portFromBaseURL.length > 0 ? portFromBaseURL : String(4000))

export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev --workspace=apps/web",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: appPort,
      PLAYWRIGHT_BASE_URL: baseURL,
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
  ],
})
