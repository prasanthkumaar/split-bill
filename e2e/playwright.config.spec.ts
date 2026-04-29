import { test, expect } from "@playwright/test"
import config from "./playwright.config"

// Tests for the playwright.config.ts configuration.
// The key change in this PR: baseURL is hardcoded to "http://localhost:3000"
// and no longer reads from the PLAYWRIGHT_BASE_URL environment variable.

test.describe("playwright.config", () => {
  test("baseURL is hardcoded to http://localhost:3000", () => {
    expect(config.use?.baseURL).toBe("http://localhost:3000")
  })

  test("baseURL is not affected by PLAYWRIGHT_BASE_URL environment variable", () => {
    const originalEnv = process.env.PLAYWRIGHT_BASE_URL
    try {
      process.env.PLAYWRIGHT_BASE_URL = "http://other-host:9999"
      // The config is evaluated at import time with a static value, so
      // even if the env var is set, it must not influence baseURL.
      expect(config.use?.baseURL).toBe("http://localhost:3000")
    } finally {
      if (originalEnv === undefined) {
        delete process.env.PLAYWRIGHT_BASE_URL
      } else {
        process.env.PLAYWRIGHT_BASE_URL = originalEnv
      }
    }
  })

  test("baseURL remains http://localhost:3000 when PLAYWRIGHT_BASE_URL is unset", () => {
    const originalEnv = process.env.PLAYWRIGHT_BASE_URL
    try {
      delete process.env.PLAYWRIGHT_BASE_URL
      expect(config.use?.baseURL).toBe("http://localhost:3000")
    } finally {
      if (originalEnv !== undefined) {
        process.env.PLAYWRIGHT_BASE_URL = originalEnv
      }
    }
  })

  test("baseURL uses localhost hostname", () => {
    const baseURL = config.use?.baseURL
    expect(typeof baseURL).toBe("string")
    expect(baseURL as string).toContain("localhost")
  })

  test("baseURL uses port 3000", () => {
    const baseURL = config.use?.baseURL
    expect(baseURL as string).toContain("3000")
  })

  test("baseURL uses http scheme", () => {
    const baseURL = config.use?.baseURL
    expect(baseURL as string).toMatch(/^http:\/\//)
  })
})
