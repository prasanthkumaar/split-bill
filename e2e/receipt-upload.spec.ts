import { test, expect } from "@playwright/test"
import type { Page } from "@playwright/test"

const TEST_EMAIL = "test+clerk_test@example.com"
const TEST_OTP = "424242"

async function signInAndCreateBill(page: Page, billName: string) {
  await page.goto("/")
  const landingState = await Promise.race([
    page
      .waitForURL(/sign-in/, { timeout: 10_000 })
      .then(() => "sign-in" as const),
    page
      .getByRole("heading", { name: "Split Bill" })
      .waitFor({ timeout: 10_000 })
      .then(() => "home" as const),
  ])

  if (landingState === "sign-in") {
    await page.getByRole("textbox", { name: "Email address" }).fill(TEST_EMAIL)
    await page.getByRole("button", { name: "Continue", exact: true }).click()
    const otpInput = page.getByRole("textbox", {
      name: "Enter verification code",
    })
    await otpInput.waitFor({ timeout: 10_000 })
    await expect(otpInput).toBeEditable()
    await page.waitForTimeout(1500)
    await otpInput.pressSequentially(TEST_OTP)
    await page.waitForURL((url) => !url.pathname.includes("sign-in"), {
      timeout: 15_000,
    })
  }

  await expect(page.getByRole("heading", { name: "Split Bill" })).toBeVisible({
    timeout: 15_000,
  })

  await page.getByPlaceholder("e.g. Dinner at Burnt Ends").fill(billName)
  await page.getByRole("button", { name: "Create" }).click()
  await expect(page.getByRole("heading", { name: billName })).toBeVisible({
    timeout: 10_000,
  })
}

test("normalizes a MIME-less mobile receipt before parsing", async ({
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

test("keeps transparent receipt backgrounds light in the JPEG OCR payload", async ({
  page,
}) => {
  test.setTimeout(120_000)

  await signInAndCreateBill(page, "Transparent Receipt Test")

  let receivedImageBase64: string | null = null
  let receivedMimeType: string | null = null
  await page.route("**/api/parse-receipt", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as {
      imageBase64?: string
      mimeType?: string
    }
    receivedImageBase64 = body.imageBase64 ?? null
    receivedMimeType = body.mimeType ?? null

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ name: "Transparent Test Item", quantity: 1, unitPrice: 5 }],
        tax: 0,
        serviceCharge: 0,
      }),
    })
  })

  await page
    .locator('input[type="file"]')
    .evaluate<void, HTMLInputElement>(async (input) => {
      const canvas = document.createElement("canvas")
      canvas.width = 64
      canvas.height = 64

      const context = canvas.getContext("2d")
      if (!context) {
        throw new Error("Failed to build transparent test image")
      }

      context.fillStyle = "#111111"
      context.fillRect(20, 20, 24, 24)

      const pngBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png")
      })
      if (!pngBlob) {
        throw new Error("Failed to create transparent test image")
      }

      const file = new File([pngBlob], "transparent-receipt.png", {
        type: "image/png",
      })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      input.files = dataTransfer.files
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })

  await expect(
    page.locator('input[value="Transparent Test Item"]')
  ).toBeVisible({ timeout: 20_000 })
  expect(receivedMimeType).toBe("image/jpeg")
  expect(receivedImageBase64).not.toBeNull()

  const sampledPixels = await page.evaluate(async (imageBase64) => {
    const image = new Image()
    image.src = `data:image/jpeg;base64,${imageBase64}`
    await image.decode()

    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Failed to inspect parsed receipt image")
    }

    context.drawImage(image, 0, 0)
    return {
      background: Array.from(context.getImageData(2, 2, 1, 1).data),
      receiptInk: Array.from(context.getImageData(32, 32, 1, 1).data),
    }
  }, receivedImageBase64!)

  expect(Math.min(...sampledPixels.background.slice(0, 3))).toBeGreaterThan(240)
  expect(Math.max(...sampledPixels.receiptInk.slice(0, 3))).toBeLessThan(80)
})

test("compresses a large JPEG below the parse request byte ceiling", async ({
  page,
}) => {
  test.setTimeout(120_000)

  await signInAndCreateBill(page, "Receipt Compression Test")

  let receivedImageBytes: number | null = null
  let receivedMimeType: string | null = null
  await page.route("**/api/parse-receipt", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as {
      imageBase64?: string
      mimeType?: string
    }
    receivedImageBytes = Buffer.from(body.imageBase64 ?? "", "base64").length
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

  const originalImageBytes = await page
    .locator('input[type="file"]')
    .evaluate<number, HTMLInputElement>(async (input) => {
      const canvas = document.createElement("canvas")
      canvas.width = 2400
      canvas.height = 2400

      const context = canvas.getContext("2d")
      if (!context) {
        throw new Error("Failed to build test image")
      }

      const pixels = context.createImageData(canvas.width, canvas.height)
      let seed = 0x12345678
      for (let index = 0; index < pixels.data.length; index += 4) {
        seed = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        pixels.data[index] = seed & 255
        pixels.data[index + 1] = (seed >>> 8) & 255
        pixels.data[index + 2] = (seed >>> 16) & 255
        pixels.data[index + 3] = 255
      }
      context.putImageData(pixels, 0, 0)

      const jpegBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      })

      if (!jpegBlob) {
        throw new Error("Failed to create test blob")
      }

      const file = new File([jpegBlob], "large-receipt.jpg", {
        type: "image/jpeg",
      })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      input.files = dataTransfer.files
      input.dispatchEvent(new Event("change", { bubbles: true }))

      return file.size
    })

  expect(originalImageBytes).toBeGreaterThan(3_000_000)
  expect(originalImageBytes).toBeLessThanOrEqual(10 * 1024 * 1024)
  await expect(page.getByText("Processing receipt...")).toBeVisible({
    timeout: 5_000,
  })
  await expect(page.getByText("Processing receipt...")).not.toBeVisible({
    timeout: 20_000,
  })
  await expect(page.locator('input[value="Mobile Test Item"]')).toBeVisible({
    timeout: 10_000,
  })
  expect(receivedImageBytes).not.toBeNull()
  expect(receivedImageBytes!).toBeLessThanOrEqual(3_000_000)
  expect(receivedMimeType).toBe("image/jpeg")
})

test("shows a toast when a receipt exceeds the input size limit", async ({
  page,
}) => {
  await signInAndCreateBill(page, "Receipt Size Error Test")

  await page
    .locator('input[type="file"]')
    .evaluate<void, HTMLInputElement>((input) => {
      const oversizedFile = new File(
        [new Uint8Array(10 * 1024 * 1024 + 1)],
        "oversized-receipt.jpg",
        { type: "image/jpeg" }
      )
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(oversizedFile)
      input.files = dataTransfer.files
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })

  await expect(
    page.getByText("Receipt images must be smaller than 10 MB.")
  ).toBeVisible()
  await expect(page.getByText("Processing receipt...")).not.toBeVisible()
})

test("shows a toast when receipt processing fails", async ({ page }) => {
  test.setTimeout(120_000)

  await signInAndCreateBill(page, "Receipt Processing Error Test")
  await page.route("**/api/parse-receipt", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Test receipt parse failure" }),
    })
  })

  await page
    .locator('input[type="file"]')
    .setInputFiles("e2e/fixtures/test-receipt.png")

  await expect(
    page.getByText("Couldn’t process this receipt. Please upload it again.")
  ).toBeVisible({ timeout: 20_000 })
  await expect(
    page.getByRole("button", { name: "Re-upload receipt" })
  ).toBeEnabled()
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
