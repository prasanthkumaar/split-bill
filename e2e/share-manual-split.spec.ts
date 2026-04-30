import { expect, test, type Page } from "@playwright/test"

const TEST_EMAIL = "test+clerk_test@example.com"
const TEST_OTP = "424242"

async function login(page: Page) {
  await page.goto("/")
  await page.waitForURL(/sign-in/, { timeout: 10_000 })
  await page.getByRole("textbox", { name: "Email address" }).fill(TEST_EMAIL)
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Enter verification code" })
    .waitFor({ timeout: 10_000 })
  await page.waitForTimeout(1500)
  await page
    .getByRole("textbox", { name: "Enter verification code" })
    .pressSequentially(TEST_OTP)
  await expect(page.getByRole("heading", { name: "Split Bill" })).toBeVisible({
    timeout: 15_000,
  })
}

async function createBill(page: Page, name: string) {
  await page.getByPlaceholder("e.g. Dinner at Burnt Ends").fill(name)
  await page.getByRole("button", { name: "Create" }).click()
  await expect(page.getByRole("heading", { name })).toBeVisible({
    timeout: 10_000,
  })
}

async function addItem(page: Page, name: string, qty: number, price: number) {
  await page.getByPlaceholder("Item name").fill(name)
  if (qty !== 1) {
    await page.getByPlaceholder("Qty").fill(String(qty))
  }
  await page.getByPlaceholder("Price").fill(price.toFixed(2))
  await page.getByPlaceholder("Price").press("Enter")
  await expect(page.locator(`input[value="${name}"]`)).toBeVisible({
    timeout: 5_000,
  })
}

async function addFriend(page: Page, name: string) {
  await page.getByPlaceholder("Friend's name").fill(name)
  await page.getByPlaceholder("Friend's name").press("Enter")
  await expect(page.getByText(name)).toBeVisible()
}

test("Share page manual split flow", async ({ page }) => {
  await login(page)
  await createBill(page, "Split Math Test")

  await addItem(page, "Steak", 1, 40)
  await addItem(page, "Salad", 1, 20)

  await page
    .locator("div")
    .filter({ hasText: /^Tax$/ })
    .getByRole("spinbutton")
    .fill("6.00")
  await page
    .locator("div")
    .filter({ hasText: /^Tax$/ })
    .getByRole("spinbutton")
    .press("Tab")
  await page
    .locator("div")
    .filter({ hasText: /^Service Charge$/ })
    .getByRole("spinbutton")
    .fill("4.00")
  await page
    .locator("div")
    .filter({ hasText: /^Service Charge$/ })
    .getByRole("spinbutton")
    .press("Tab")

  await addFriend(page, "Alice")
  await addFriend(page, "Bob")

  await page.getByRole("button", { name: "Share with friends" }).click()
  await expect(page.getByText("shared")).toBeVisible({ timeout: 5_000 })

  const shareUrl = await page.locator("input[readonly]").inputValue()
  await page.goto(shareUrl)

  await expect(
    page.getByRole("heading", { name: "Split Math Test" })
  ).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText("Tag everyone to what they had")).toBeVisible()

  const steakCombobox = page.getByPlaceholder("Add people...").first()
  await steakCombobox.fill("Alice")
  await page.getByRole("option", { name: "Alice" }).click()
  await expect(page.getByText("$46.67").first()).toBeVisible({ timeout: 5_000 })

  const saladCombobox = page.getByPlaceholder("Add people...").first()
  await saladCombobox.fill("Alice")
  await page.getByRole("option", { name: "Alice" }).click()
  await expect(page.getByText("$70.00").first()).toBeVisible({ timeout: 5_000 })

  const steakInput = page.getByRole("toolbar").first().locator("input")
  await steakInput.fill("Bob")
  await page.getByRole("option", { name: "Bob" }).click()

  await expect(page.getByText("$46.67").first()).toBeVisible({ timeout: 5_000 })
  await expect(page.getByText("$23.33").first()).toBeVisible()

  await page.getByRole("button", { name: "Show breakdown" }).click()
  await expect(page.getByText("Tax & svc charge").first()).toBeVisible()
  await expect(
    page.locator("div").filter({ hasText: /^Steak\$20\.00$/ }).first()
  ).toBeVisible()

  await page
    .getByRole("toolbar")
    .first()
    .locator("[data-slot='combobox-chip']")
    .filter({ hasText: "Bob" })
    .getByRole("button")
    .click()

  await expect(page.getByText("$70.00").first()).toBeVisible({ timeout: 5_000 })
  await expect(
    page.locator("div").filter({ hasText: /^Bob\$/ })
  ).toHaveCount(0)
})
