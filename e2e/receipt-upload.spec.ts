import { test, expect } from "@playwright/test"
import type { Page } from "@playwright/test"

const TEST_EMAIL = "test+clerk_test@example.com"
const TEST_OTP = "424242"

async function signInAndCreateBill(page: Page, billName: string) {
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
  await expect(page.getByRole("heading", { name: "Split Bill" })).toBeVisible({
    timeout: 15_000,
  })

  await page.getByPlaceholder("e.g. Dinner at Burnt Ends").fill(billName)
  await page.getByRole("button", { name: "Create" }).click()
  await expect(page.getByRole("heading", { name: billName })).toBeVisible({
    timeout: 10_000,
  })
}

test("Receipt upload normalizes unsupported mobile image types", async ({
  page,
}) => {
  test.setTimeout(120_000)

  await signInAndCreateBill(page, "OCR MIME Test")

  let receivedMimeType: string | null = null
  await page.route("**/api/parse-receipt", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as {
      mimeType?: string
    }
    receivedMimeType = body.mimeType ?? null

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ name: "Mobile Test Item", quantity: 1, unitPrice: 12.34 }],
        tax: 0,
        serviceCharge: 0,
      }),
    })
  })

  await page
    .locator('input[type="file"]')
    .evaluate<void, HTMLInputElement>(async (input) => {
      const canvas = document.createElement("canvas")
      canvas.width = 400
      canvas.height = 800

      const context = canvas.getContext("2d")
      if (!context) {
        throw new Error("Failed to build test image")
      }

      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = "#111111"
      context.font = "32px sans-serif"
      context.fillText("MOBILE RECEIPT", 24, 60)
      context.fillText("$12.34", 24, 120)

      const pngBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png")
      })

      if (!pngBlob) {
        throw new Error("Failed to create test blob")
      }

      const file = new File([await pngBlob.arrayBuffer()], "receipt.heic")
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      input.files = dataTransfer.files
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })

  await expect(page.getByText("Processing receipt...")).toBeVisible({
    timeout: 5_000,
  })
  await expect(page.getByText("Processing receipt...")).not.toBeVisible({
    timeout: 20_000,
  })
  await expect(page.locator('input[value="Mobile Test Item"]')).toBeVisible({
    timeout: 10_000,
  })
  expect(receivedMimeType).toBe("image/jpeg")
})

test("Receipt OCR upload", async ({ page }) => {
  test.setTimeout(120_000)

  await signInAndCreateBill(page, "OCR Test")

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
