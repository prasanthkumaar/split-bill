import { expect, test, type Browser, type Page } from "@playwright/test"

const TEST_EMAIL = "test+clerk_test@example.com"
const TEST_OTP = "424242"

async function login(page: Page) {
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
    await finishSignIn(page)
    await page.waitForURL((url) => !url.pathname.includes("sign-in"), {
      timeout: 15_000,
    })
  }

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
  await expect(page.getByText("Who are you?")).toBeVisible({ timeout: 10_000 })
  return { context, page }
}

test("guest done state persists across refresh and does not block tagging", async ({
  page,
  browser,
}) => {
  const shareUrl = await createSharedBill(page, "Done Guest Test", ["Bob"])
  const { context, page: guestPage } = await openGuestPage(browser, shareUrl)

  try {
    await guestPage.getByRole("button", { name: "Bob" }).click()
    await expect(guestPage.getByTestId("done-toggle")).toHaveText(
      "I've reviewed"
    )
    await expect(
      guestPage.getByText(
        "Please wait until everyone has reviewed, shared items may still affect your total."
      )
    ).toBeVisible()

    await guestPage.getByTestId("done-toggle").click()
    await expect(guestPage.getByText("1 of 2 reviewed")).toBeVisible()
    await expect(
      guestPage.getByTestId("review-participant").first()
    ).toContainText("Reviewed")

    const laksaCombobox = guestPage.getByPlaceholder("Add people...").first()
    await laksaCombobox.fill("Bob")
    await guestPage.getByRole("option", { name: "Bob" }).click()
    await expect(guestPage.getByText("$18.00").first()).toBeVisible()
    await expect(guestPage.getByTestId("done-toggle")).toHaveText("Reviewed")

    await guestPage.reload()
    await expect(guestPage.getByText("Who are you?")).toBeVisible({
      timeout: 10_000,
    })
    await guestPage.getByRole("button", { name: "Bob" }).click()
    await expect(guestPage.getByText("1 of 2 reviewed")).toBeVisible()
    await expect(guestPage.getByTestId("done-toggle")).toHaveText("Reviewed")
    await expect(
      guestPage.getByTestId("review-participant").first()
    ).toContainText("Reviewed")
    await expect(guestPage.getByText("$18.00").first()).toBeVisible()

    await guestPage.getByTestId("done-toggle").click()
    await expect(guestPage.getByText("0 of 2 reviewed")).toBeVisible()
    await expect(guestPage.getByTestId("done-toggle")).toHaveText(
      "I've reviewed"
    )
    await expect(
      guestPage.getByTestId("review-participant").first()
    ).toContainText("Pending")
  } finally {
    await context.close()
  }
})

test("owner can mark done without affecting owner entry", async ({
  page,
  browser,
}) => {
  const shareUrl = await createSharedBill(page, "Done Owner Test", ["Bob"])

  await page.goto(shareUrl)
  await expect(page.getByText("Summary")).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText("0 of 2 reviewed")).toBeVisible()
  await expect(page.getByTestId("current-participant-trigger")).toHaveText(
    "Owner"
  )
  await expect(page.getByTestId("done-toggle")).toHaveText("I've reviewed")
  await expect(
    page.getByText(
      "Please wait until everyone has reviewed, shared items may still affect your total."
    )
  ).toBeVisible()

  await page.getByTestId("done-toggle").click()
  await expect(page.getByText("1 of 2 reviewed")).toBeVisible()
  await expect(page.getByTestId("review-participant").first()).toContainText(
    "Reviewed"
  )

  const guestContext = await browser.newContext()
  const guestPage = await guestContext.newPage()

  try {
    await guestPage.goto(shareUrl)
    await expect(guestPage.getByText("Who are you?")).toBeVisible({
      timeout: 10_000,
    })
    await guestPage.getByRole("button", { name: "Bob" }).click()
    await guestPage.getByTestId("done-toggle").click()
    await expect(guestPage.getByText("2 of 2 reviewed")).toBeVisible()
    await expect(guestPage.getByText("All members have reviewed")).toBeVisible()
  } finally {
    await guestContext.close()
  }
})

test("guest pays to settle the bill while the owner cannot pay", async ({
  page,
  browser,
}) => {
  const shareUrl = await createSharedBill(page, "Pay Settle Test", ["Bob"])

  // Owner reviews first.
  await page.goto(shareUrl)
  await expect(page.getByText("Summary")).toBeVisible({ timeout: 10_000 })
  await page.getByTestId("done-toggle").click()
  await expect(page.getByText("1 of 2 reviewed")).toBeVisible()

  const { context, page: guestPage } = await openGuestPage(browser, shareUrl)

  try {
    // Guest reviews, which opens the pay phase for everyone.
    await guestPage.getByRole("button", { name: "Bob" }).click()
    await guestPage.getByTestId("done-toggle").click()
    await expect(guestPage.getByTestId("paid-toggle")).toContainText(
      "I've paid"
    )

    // The owner is owed and never sees a pay action.
    await expect(page.getByText("All members have reviewed")).toBeVisible()
    await expect(page.getByTestId("paid-toggle")).toHaveCount(0)

    // Guest pays, settling the bill (single guest), reflected for the owner too.
    await guestPage.getByTestId("paid-toggle").click()
    await expect(guestPage.getByTestId("paid-toggle")).toContainText("Paid")
    await expect(guestPage.getByText("All settled")).toBeVisible()
    await expect(
      guestPage.getByTestId("review-participant").first()
    ).toContainText("Paid")
    await expect(page.getByText("All settled")).toBeVisible()

    // Paying is reversible: undoing reverts the bill out of settled.
    await guestPage.getByTestId("paid-toggle").click()
    await expect(guestPage.getByText("All members have reviewed")).toBeVisible()
    await expect(
      guestPage.getByTestId("review-participant").first()
    ).toContainText("Unpaid")
    await expect(page.getByText("All settled")).toHaveCount(0)
  } finally {
    await context.close()
  }
})
