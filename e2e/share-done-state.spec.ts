import { expect, test, type Browser, type Page } from "@playwright/test"

const TEST_EMAIL = "test+clerk_test@example.com"
const TEST_OTP = "424242"

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
  await page
    .getByRole("textbox", { name: "Enter verification code" })
    .waitFor({ timeout: 10_000 })
  await page.waitForTimeout(1500)
  await page
    .getByRole("textbox", { name: "Enter verification code" })
    .pressSequentially(TEST_OTP)
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
  await expect(page.getByText("Who are you?")).toBeVisible({ timeout: 10_000 })
  return { context, page }
}

test("guest done state persists across refresh and does not block tagging", async ({
  page,
  browser,
}) => {
  const shareUrl = await createSharedBill(page, "Done Guest Test", ["Bob"])
  const { context, page: guestPage } = await openGuestPage(browser, shareUrl)

  await guestPage.getByRole("button", { name: "Bob" }).click()
  await expect(guestPage.getByTestId("done-toggle")).toHaveText("Mark done")

  await guestPage.getByTestId("done-toggle").click()
  await expect(guestPage.getByText("1 of 2 done")).toBeVisible()
  await expect(
    guestPage.getByTestId("review-participant").first()
  ).toContainText("Bob")

  const laksaCombobox = guestPage.getByPlaceholder("Add people...").first()
  await laksaCombobox.fill("Bob")
  await guestPage.getByRole("option", { name: "Bob" }).click()
  await expect(guestPage.getByText("$18.00").first()).toBeVisible()
  await expect(guestPage.getByTestId("done-toggle")).toHaveText("Mark not done")

  await guestPage.reload()
  await expect(guestPage.getByText("Who are you?")).toBeVisible({
    timeout: 10_000,
  })
  await guestPage.getByRole("button", { name: "Bob" }).click()
  await expect(guestPage.getByText("1 of 2 done")).toBeVisible()
  await expect(guestPage.getByTestId("done-toggle")).toHaveText("Mark not done")
  await expect(guestPage.getByText("$18.00").first()).toBeVisible()

  await guestPage.getByTestId("done-toggle").click()
  await expect(guestPage.getByText("0 of 2 done")).toBeVisible()

  await context.close()
})

test("owner can mark done without affecting owner entry", async ({ page }) => {
  const shareUrl = await createSharedBill(page, "Done Owner Test", ["Bob"])

  await page.goto(shareUrl)
  await expect(page.getByText("Review status")).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId("current-participant-trigger")).toHaveText(
    "Owner"
  )
  await expect(page.getByTestId("done-toggle")).toHaveText("Mark done")

  await page.getByTestId("done-toggle").click()
  await expect(page.getByText("1 of 2 done")).toBeVisible()
  await expect(page.getByTestId("review-participant").first()).toContainText(
    "You"
  )
  await expect(page.getByTestId("review-participant").first()).toContainText(
    "Done"
  )
})
