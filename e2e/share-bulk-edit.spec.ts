import { expect, test, type Browser, type Page } from "@playwright/test"
import {
  parseBulkEditResult,
  prepareBulkEditInput,
} from "../apps/web/app/share/[shareId]/schema"
import { validateBulkEditAssignments } from "../convex/sharing"

function buildInput() {
  return prepareBulkEditInput({
    instructions: "Bob had the laksa, Alice had both teas.",
    participants: [
      { id: "participant-bob", name: "Bob" },
      { id: "participant-alice", name: "Alice" },
    ],
    lineItems: [
      {
        id: "line-item-laksa",
        name: "Laksa",
        quantity: 1,
        unitPrice: 18,
      },
      {
        id: "line-item-tea",
        name: "Iced tea",
        quantity: 2,
        unitPrice: 4,
      },
    ],
  })
}

test("prepareBulkEditInput rejects duplicate participant names", () => {
  expect(() =>
    prepareBulkEditInput({
      instructions: "Split the bill.",
      participants: [
        { id: "participant-1", name: "Alice" },
        { id: "participant-2", name: "alice" },
      ],
      lineItems: [
        {
          id: "line-item-1",
          name: "Laksa",
          quantity: 1,
          unitPrice: 18,
        },
      ],
    })
  ).toThrow("Bulk edit requires unique participant names")
})

test("parseBulkEditResult returns a fully validated review payload", () => {
  const result = parseBulkEditResult(
    buildInput(),
    JSON.stringify({
      assignments: [
        {
          lineItemId: "line-item-laksa",
          unitIndex: 0,
          participantName: "Bob",
        },
        {
          lineItemId: "line-item-tea",
          unitIndex: 0,
          participantName: "Alice",
        },
        {
          lineItemId: "line-item-tea",
          unitIndex: 1,
          participantName: "Alice",
        },
      ],
    })
  )

  expect(result.assignments).toEqual([
    {
      lineItemId: "line-item-laksa",
      lineItemName: "Laksa",
      participantIds: ["participant-bob"],
      participantNames: ["Bob"],
      unitIndex: 0,
      unitPrice: 18,
    },
    {
      lineItemId: "line-item-tea",
      lineItemName: "Iced tea",
      participantIds: ["participant-alice"],
      participantNames: ["Alice"],
      unitIndex: 0,
      unitPrice: 4,
    },
    {
      lineItemId: "line-item-tea",
      lineItemName: "Iced tea",
      participantIds: ["participant-alice"],
      participantNames: ["Alice"],
      unitIndex: 1,
      unitPrice: 4,
    },
  ])
})

test("parseBulkEditResult rejects invalid JSON", () => {
  expect(() => parseBulkEditResult(buildInput(), "not json")).toThrow(
    "Bulk edit model returned invalid JSON"
  )
})

test("parseBulkEditResult rejects unknown participants", () => {
  expect(() =>
    parseBulkEditResult(
      buildInput(),
      JSON.stringify({
        assignments: [
          {
            lineItemId: "line-item-laksa",
            unitIndex: 0,
            participantName: "Charlie",
          },
          {
            lineItemId: "line-item-tea",
            unitIndex: 0,
            participantName: "Alice",
          },
          {
            lineItemId: "line-item-tea",
            unitIndex: 1,
            participantName: "Alice",
          },
        ],
      })
    )
  ).toThrow("Bulk edit model referenced an unknown participant: Charlie")
})

test("parseBulkEditResult rejects missing units", () => {
  expect(() =>
    parseBulkEditResult(
      buildInput(),
      JSON.stringify({
        assignments: [
          {
            lineItemId: "line-item-laksa",
            unitIndex: 0,
            participantName: "Bob",
          },
          {
            lineItemId: "line-item-tea",
            unitIndex: 0,
            participantName: "Alice",
          },
        ],
      })
    )
  ).toThrow("Bulk edit model omitted a unit: Iced tea #2")
})

test("parseBulkEditResult rejects repeated units", () => {
  expect(() =>
    parseBulkEditResult(
      buildInput(),
      JSON.stringify({
        assignments: [
          {
            lineItemId: "line-item-laksa",
            unitIndex: 0,
            participantName: "Bob",
          },
          {
            lineItemId: "line-item-tea",
            unitIndex: 0,
            participantName: "Alice",
          },
          {
            lineItemId: "line-item-tea",
            unitIndex: 0,
            participantName: "Alice",
          },
        ],
      })
    )
  ).toThrow("Bulk edit model repeated a unit: line-item-tea:0")
})

test("validateBulkEditAssignments rejects foreign ids before claims change", () => {
  expect(() =>
    validateBulkEditAssignments({
      assignments: [
        {
          lineItemId: "line-item-laksa",
          participantIds: ["participant-bob"],
          unitIndex: 0,
        },
        {
          lineItemId: "line-item-tea",
          participantIds: ["participant-alice"],
          unitIndex: 0,
        },
        {
          lineItemId: "line-item-foreign",
          participantIds: ["participant-alice"],
          unitIndex: 0,
        },
      ],
      lineItems: [
        { id: "line-item-laksa", quantity: 1 },
        { id: "line-item-tea", quantity: 2 },
      ],
      participantIds: ["participant-bob", "participant-alice"],
    })
  ).toThrow("Bulk edit referenced an unknown unit: line-item-foreign:0")

  expect(() =>
    validateBulkEditAssignments({
      assignments: [
        {
          lineItemId: "line-item-laksa",
          participantIds: ["participant-bob"],
          unitIndex: 0,
        },
        {
          lineItemId: "line-item-tea",
          participantIds: ["participant-alice"],
          unitIndex: 0,
        },
        {
          lineItemId: "line-item-tea",
          participantIds: ["participant-foreign"],
          unitIndex: 1,
        },
      ],
      lineItems: [
        { id: "line-item-laksa", quantity: 1 },
        { id: "line-item-tea", quantity: 2 },
      ],
      participantIds: ["participant-bob", "participant-alice"],
    })
  ).toThrow("Bulk edit referenced an unknown participant")
})

const TEST_EMAIL = "test+clerk_test@example.com"
const TEST_OTP = "424242"

async function login(page: Page) {
  await page.goto("/")
  const needsSignIn = await page
    .getByRole("textbox", { name: "Email address" })
    .waitFor({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false)

  if (needsSignIn) {
    await finishSignIn(page)
    await Promise.race([
      page
        .waitForURL((url) => !url.pathname.includes("sign-in"), {
          timeout: 15_000,
        })
        .catch(() => null),
      page
        .getByRole("heading", { name: "Split Bill" })
        .waitFor({ timeout: 15_000 })
        .catch(() => null),
    ])
  }

  await expect(page.getByRole("heading", { name: "Split Bill" })).toBeVisible({
    timeout: 15_000,
  })
}

async function finishSignIn(page: Page) {
  await page.getByRole("textbox", { name: "Email address" }).fill(TEST_EMAIL)
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  const otpInput = page.getByRole("textbox", { name: "Enter verification code" })
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

test("regular participants never see the bulk edit trigger", async ({
  page,
  browser,
}) => {
  const shareUrl = await createSharedBill(page, "Bulk Edit Guest Test", ["Bob"])
  const { context, page: guestPage } = await openGuestPage(browser, shareUrl)

  await guestPage.getByRole("button", { name: "Bob" }).click()
  await expect(guestPage.getByTestId("bulk-edit-trigger")).toHaveCount(0)

  await context.close()
})

test("owners cannot use bulk edit when participant names are duplicated", async ({
  page,
}) => {
  const shareUrl = await createSharedBill(page, "Bulk Edit Duplicate Test", [
    "Bob",
    "bob",
  ])
  await page.goto(shareUrl)

  await expect(page.getByTestId("bulk-edit-trigger")).toBeDisabled()
  await expect(
    page.getByText("Bulk edit requires unique participant names.")
  ).toBeVisible()
})

test("owners can compose, review, go back, and apply a bulk edit", async ({
  page,
}) => {
  test.setTimeout(120_000)

  const shareUrl = await createSharedBill(page, "Bulk Edit Owner Test", ["Bob"])
  await page.goto(shareUrl)
  await expect(page.getByTestId("bulk-edit-trigger")).toBeVisible({
    timeout: 10_000,
  })

  const prompt = "Assign the laksa to the only participant."

  await page.getByTestId("bulk-edit-trigger").click()
  await page.getByTestId("bulk-edit-prompt").fill(prompt)
  await page.getByTestId("bulk-edit-generate").click()
  await expect(page.getByTestId("bulk-edit-review-item")).toHaveCount(1, {
    timeout: 60_000,
  })

  await page.getByTestId("bulk-edit-back").click()
  await expect(page.getByTestId("bulk-edit-prompt")).toHaveValue(prompt)

  await page.getByTestId("bulk-edit-generate").click()
  await expect(page.getByTestId("bulk-edit-review-item")).toHaveCount(1, {
    timeout: 60_000,
  })

  await page.getByTestId("bulk-edit-apply").click()
  await expect(page.getByTestId("bulk-edit-trigger")).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByText("No items claimed yet.")).toHaveCount(0)
  await expect(page.getByText("Unaccounted")).toHaveCount(0)
})
