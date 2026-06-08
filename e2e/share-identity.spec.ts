import { expect, test, type Browser, type Page } from "@playwright/test"

const TEST_EMAIL = "test+clerk_test@example.com"
const TEST_OTP = "424242"
const TEST_OWNER_NAME = "Test"

async function login(page: Page) {
  await page.goto("/")
  await page.waitForURL(/sign-in/, { timeout: 10_000 })
  await finishSignIn(page)
  await expect(page.getByRole("heading", { name: "Split Bill" })).toBeVisible({
    timeout: 15_000,
  })
}

async function finishSignIn(page: Page) {
  await page.getByRole("textbox", { name: "Email address" }).fill(TEST_EMAIL)
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  const otpInput = page.getByRole("textbox", {
    name: "Enter verification code",
  })
  await otpInput.waitFor({ timeout: 10_000 })
  await expect(otpInput).toBeEditable()
  await page.waitForTimeout(1500)
  await otpInput.pressSequentially(TEST_OTP)
}

async function createSharedBill(
  page: Page,
  name: string,
  participantNames: string[]
) {
  await login(page)
  await page.getByPlaceholder("e.g. Dinner at Burnt Ends").fill(name)
  await page.getByRole("button", { name: "Create" }).click()
  await expect(page.getByRole("heading", { name })).toBeVisible({
    timeout: 10_000,
  })

  await page.getByPlaceholder("Item name").fill("Laksa")
  await page.getByPlaceholder("Price").fill("18.00")
  await page.getByPlaceholder("Price").press("Enter")
  await expect(page.locator('input[value="Laksa"]')).toBeVisible({
    timeout: 5_000,
  })

  for (const participantName of participantNames) {
    await page.getByPlaceholder("Friend's name").fill(participantName)
    await page.getByPlaceholder("Friend's name").press("Enter")
    await expect(page.getByText(participantName)).toBeVisible()
  }

  await page.getByRole("button", { name: "Share with friends" }).click()
  await expect(page.getByText("shared")).toBeVisible({ timeout: 5_000 })
  return await page.locator("input[readonly]").inputValue()
}

async function openGuestPage(browser: Browser, shareUrl: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(shareUrl)
  await expect(page.getByText("Review your share")).toBeVisible({
    timeout: 10_000,
  })
  return { context, page }
}

test("guest selects an existing participant", async ({ page, browser }) => {
  const shareUrl = await createSharedBill(page, "Identity Guest Test", [
    "Alice",
    "Bob",
  ])

  const { context, page: guestPage } = await openGuestPage(browser, shareUrl)

  await guestPage.getByRole("button", { name: "Bob" }).click()
  await expect(guestPage.getByText("Summary")).toBeVisible()
  await expect(guestPage.getByText("0 of 3 reviewed")).toBeVisible()
  await expect(guestPage.getByTestId("current-participant-trigger")).toHaveText(
    "Bob"
  )
  await expect(
    guestPage.getByRole("heading", { name: "Identity Guest Test" })
  ).toBeVisible()
  await expect(
    guestPage.getByText("Tag everyone to what they had")
  ).toBeVisible()

  await context.close()
})

test("signed-in owner auto-enters the share flow", async ({ page }) => {
  const shareUrl = await createSharedBill(page, "Identity Owner Test", [
    "Alice",
  ])

  await page.goto(shareUrl)

  await expect(page.getByText("Summary")).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText("0 of 2 reviewed")).toBeVisible()
  await expect(page.getByTestId("current-participant-trigger")).toHaveText(
    TEST_OWNER_NAME
  )
  await expect(page.getByText("Review your share")).toHaveCount(0)
  await expect(page.getByText("Tag everyone to what they had")).toBeVisible()
})

test("signed-out owner is redirected to sign in and returns", async ({
  page,
  browser,
}) => {
  const shareUrl = await createSharedBill(page, "Identity Redirect Test", [
    "Alice",
  ])

  const { context, page: guestPage } = await openGuestPage(browser, shareUrl)

  await guestPage
    .getByRole("button", { name: new RegExp(`^${TEST_OWNER_NAME}`) })
    .click()
  await guestPage.waitForURL(/sign-in/, { timeout: 10_000 })

  await finishSignIn(guestPage)
  await expect(
    guestPage.getByRole("heading", { name: "Identity Redirect Test" })
  ).toBeVisible({ timeout: 15_000 })
  await expect(guestPage.getByText("Summary")).toBeVisible()
  await expect(guestPage.getByText("0 of 2 reviewed")).toBeVisible()
  await expect(guestPage.getByTestId("current-participant-trigger")).toHaveText(
    TEST_OWNER_NAME
  )
  await expect(guestPage.getByText("Review your share")).toHaveCount(0)

  await context.close()
})
