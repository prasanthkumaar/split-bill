import { test, expect } from "@playwright/test"

const TEST_EMAIL = "test+clerk_test@example.com"
const TEST_OTP = "424242"

test("Receipt OCR upload", async ({ page }) => {
  test.setTimeout(120_000)

  // Login
  await page.goto("/")
  await page.waitForURL(/sign-in/, { timeout: 10_000 })
  await page.getByRole("textbox", { name: "Email address" }).fill(TEST_EMAIL)
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Enter verification code" })
    .waitFor({ timeout: 10_000 })
  await page.waitForTimeout(500)
  await page
    .getByRole("textbox", { name: "Enter verification code" })
    .pressSequentially(TEST_OTP)
  await expect(
    page.getByRole("heading", { name: "Split Bill" })
  ).toBeVisible({ timeout: 15_000 })

  // Create a bill
  await page.getByPlaceholder("e.g. Dinner at Burnt Ends").fill("OCR Test")
  await page.getByRole("button", { name: "Create" }).click()
  await expect(page.getByRole("heading", { name: "OCR Test" })).toBeVisible({
    timeout: 10_000,
  })

  // Upload receipt
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles("e2e/fixtures/test-receipt.png")

  // Wait for processing to start
  await expect(page.getByText("Processing receipt...")).toBeVisible({
    timeout: 5_000,
  })

  // Wait for processing to finish
  await expect(page.getByText("Processing receipt...")).not.toBeVisible({
    timeout: 90_000,
  })

  // Screenshot right after processing finishes
  await page.screenshot({ path: "/tmp/receipt-upload-result.png" })

  // Wait for Convex real-time update to populate items
  await expect(page.getByText("Re-upload receipt")).toBeVisible({
    timeout: 10_000,
  })

  // Verify subtotal is non-zero (items were parsed and saved)
  await expect(
    page
      .locator('[class*="flex justify-between"]')
      .filter({ hasText: "Subtotal" })
      .locator("span")
      .last()
  ).not.toContainText("$0.00", { timeout: 10_000 })

  // Final screenshot with items populated
  await page.screenshot({ path: "/tmp/receipt-upload-items.png" })

  const subtotalText = await page
    .locator('[class*="flex justify-between"]')
    .filter({ hasText: "Subtotal" })
    .locator("span")
    .last()
    .textContent()
  console.log(`Subtotal after OCR: ${subtotalText}`)
})
