import { test, expect, type Page } from "@playwright/test";

// Clerk test credentials (dev mode only)
const TEST_EMAIL = "test+clerk_test@example.com";
const TEST_OTP = "424242";

// Known test data for deterministic assertions
const ITEMS = [
  { name: "Margherita Pizza", qty: 1, price: 24.0 },
  { name: "Truffle Fries", qty: 2, price: 12.0 },
  { name: "Craft Beer", qty: 3, price: 15.0 },
];
const TAX = 10.0;
const SERVICE_CHARGE = 8.5;
const SUBTOTAL = 24.0 + 24.0 + 45.0; // 93.00
const TOTAL = SUBTOTAL + TAX + SERVICE_CHARGE; // 111.50
const FRIENDS = ["Alice", "Bob"];

// ── Helpers ──

async function login(page: Page) {
  await page.goto("/");
  // Wait for Clerk sign-in form
  await page.waitForURL(/sign-in/, { timeout: 10_000 });
  await page.getByRole("textbox", { name: "Email address" }).fill(TEST_EMAIL);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Wait for OTP input to be ready (Clerk needs to initiate the verification)
  await page.getByRole("textbox", { name: "Enter verification code" }).waitFor({ timeout: 10_000 });
  // Small delay to let Clerk fully initialise the OTP flow
  await page.waitForTimeout(1500);
  // Clerk OTP input needs pressSequentially (individual keystrokes) to trigger verification
  await page
    .getByRole("textbox", { name: "Enter verification code" })
    .pressSequentially(TEST_OTP);
  // Clerk auto-submits OTP, wait for redirect to dashboard
  await expect(page.getByRole("heading", { name: "Split Bill" })).toBeVisible({
    timeout: 15_000,
  });
}

async function createBill(page: Page, name: string) {
  await page.getByPlaceholder("e.g. Dinner at Burnt Ends").fill(name);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible({
    timeout: 10_000,
  });
}

async function addItem(
  page: Page,
  name: string,
  qty: number,
  price: number
) {
  await page.getByPlaceholder("Item name").fill(name);
  if (qty !== 1) {
    await page.getByPlaceholder("Qty").fill(String(qty));
  }
  await page.getByPlaceholder("Price").fill(price.toFixed(2));
  await page.getByPlaceholder("Price").press("Enter");
  // Wait for the item to appear and form to clear before adding next item
  await expect(page.locator(`input[value="${name}"]`)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByPlaceholder("Item name")).toHaveValue("", { timeout: 5_000 });
}

async function addFriend(page: Page, name: string) {
  await page.getByPlaceholder("Friend's name").fill(name);
  await page.getByPlaceholder("Friend's name").press("Enter");
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByPlaceholder("Friend's name")).toHaveValue("", { timeout: 5_000 });
}

// ── Tests ──

test.describe.serial("Bill splitting flows", () => {
  let billShareUrl: string;

  test("1. Log in with Clerk test credentials", async ({ page }) => {
    await login(page);
  });

  test("2. Create a new bill", async ({ page }) => {
    await login(page);
    await createBill(page, "E2E Test Bill");
    // Should be on the bill edit page
    await expect(page.getByText("editing")).toBeVisible();
  });

  test("3-7. Add items, edit, delete, set tax/svc, verify totals", async ({
    page,
  }) => {
    await login(page);
    await createBill(page, "Totals Test");

    // 3. Add items
    for (const item of ITEMS) {
      await addItem(page, item.name, item.qty, item.price);
    }

    // 4. Edit an item price (change Margherita Pizza from 24 to 26)
    const pizzaPrice = page.locator('input[value="24.00"]').first();
    await pizzaPrice.fill("26.00");
    await pizzaPrice.press("Tab");
    await expect(page.locator('[class*="flex justify-between"]').filter({ hasText: "Subtotal" }).locator("span").last()).toContainText("$95.00", { timeout: 5_000 });

    // Revert to original for rest of test
    const pizzaPriceReverted = page.locator('input[value="26.00"]').first();
    await pizzaPriceReverted.fill("24.00");
    await pizzaPriceReverted.press("Tab");

    // 5. Add and delete an unclaimed item
    await addItem(page, "Temp Item", 1, 5.0);
    // Click the delete button next to Temp Item input (sibling button in same row)
    await page.locator('input[value="Temp Item"]').locator("xpath=../button").click();
    await expect(page.locator('input[value="Temp Item"]')).toHaveCount(0, {
      timeout: 5_000,
    });

    // 6. Set tax and service charge
    await page
      .locator("div")
      .filter({ hasText: /^Tax$/ })
      .getByRole("spinbutton")
      .fill(TAX.toFixed(2));
    await page
      .locator("div")
      .filter({ hasText: /^Tax$/ })
      .getByRole("spinbutton")
      .press("Tab");

    await page
      .locator("div")
      .filter({ hasText: /^Service Charge$/ })
      .getByRole("spinbutton")
      .fill(SERVICE_CHARGE.toFixed(2));
    await page
      .locator("div")
      .filter({ hasText: /^Service Charge$/ })
      .getByRole("spinbutton")
      .press("Tab");

    // 7. Verify totals
    await expect(page.getByText(`$${SUBTOTAL.toFixed(2)}`).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(`$${TOTAL.toFixed(2)}`).first()).toBeVisible();
  });

  test("8-10. Add friends, share bill, copy URL", async ({ page }) => {
    await login(page);
    await createBill(page, "Share Test");

    // Add an item so share button enables
    await addItem(page, "Test Item", 1, 20.0);

    // 8. Add friends
    for (const name of FRIENDS) {
      await addFriend(page, name);
    }
    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Bob")).toBeVisible();

    // 9. Share bill
    await page.getByRole("button", { name: "Share with friends" }).click();
    await expect(page.getByText("shared")).toBeVisible({ timeout: 5_000 });

    // 10. Copy share URL
    const shareInput = page.locator("input[readonly]");
    billShareUrl = await shareInput.inputValue();
    expect(billShareUrl).toContain("/share/");

    await page.getByRole("button").filter({ has: page.locator("svg") }).last().click();
    // After clicking copy, clipboard should have the URL
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText).toBe(billShareUrl);
  });

  test("11-19. Share page: claim via combobox, split, unclaim", async ({
    page,
  }) => {
    await login(page);
    await createBill(page, "Split Math Test");

    // Set up: 2 items, tax, svc, 2 friends
    await addItem(page, "Steak", 1, 40.0);
    await addItem(page, "Salad", 1, 20.0);

    // Set tax & svc
    await page
      .locator("div")
      .filter({ hasText: /^Tax$/ })
      .getByRole("spinbutton")
      .fill("6.00");
    await page
      .locator("div")
      .filter({ hasText: /^Tax$/ })
      .getByRole("spinbutton")
      .press("Tab");
    await page
      .locator("div")
      .filter({ hasText: /^Service Charge$/ })
      .getByRole("spinbutton")
      .fill("4.00");
    await page
      .locator("div")
      .filter({ hasText: /^Service Charge$/ })
      .getByRole("spinbutton")
      .press("Tab");

    await addFriend(page, "Alice");
    await addFriend(page, "Bob");

    // Share
    await page.getByRole("button", { name: "Share with friends" }).click();
    await expect(page.getByText("shared")).toBeVisible({ timeout: 5_000 });

    // Get share URL and navigate to it
    const shareUrl = await page.locator("input[readonly]").inputValue();
    await page.goto(shareUrl);

    // 11. Share page loads without auth, items visible immediately
    await expect(
      page.getByRole("heading", { name: "Split Math Test" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Tag everyone to what they had")).toBeVisible();

    // 13. Tag Alice on Steak via combobox
    const steakCombobox = page.getByPlaceholder("Add people...").first();
    await steakCombobox.fill("Alice");
    await page.getByRole("option", { name: "Alice" }).click();

    // 14. Verify split: Alice has Steak ($40)
    // Alice subtotal $40, proportion = 40/60 = 2/3, extras = 10 * 2/3 = $6.67, total = $46.67
    await expect(page.getByText("$46.67").first()).toBeVisible({ timeout: 5_000 });
    const unaccountedRow = page
      .locator("div")
      .filter({
        has: page.locator("span", { hasText: /^Unaccounted$/ }),
      })
      .first();
    await expect(
      unaccountedRow.getByText("Unaccounted", { exact: true })
    ).toBeVisible({ timeout: 5_000 });
    await expect(unaccountedRow.getByText("$23.33", { exact: true })).toBeVisible({
      timeout: 5_000,
    });

    // 15. Tag Alice on Salad too (Steak placeholder gone, so Salad is now first)
    const saladCombobox = page.getByPlaceholder("Add people...").first();
    await saladCombobox.fill("Alice");
    await page.getByRole("option", { name: "Alice" }).click();
    // Alice subtotal $60, proportion = 60/60 = 100%, extras $10, total $70
    await expect(page.getByText("$70.00").first()).toBeVisible({ timeout: 5_000 });

    // Tag Bob on Steak too (shared with Alice)
    // Steak's placeholder is now empty, target its input via the toolbar
    const steakInput = page.getByRole("toolbar").first().locator("input");
    await steakInput.fill("Bob");
    await page.getByRole("option", { name: "Bob" }).click();

    // Verify split with shared item:
    // Steak split: Alice $20, Bob $20. Salad: Alice $20.
    // Alice subtotal: $40, Bob subtotal: $20. Total claimed: $60.
    // Alice proportion: 40/60 = 2/3, Bob: 20/60 = 1/3
    // Alice extras: 10 * 2/3 = 6.67, Bob extras: 10 * 1/3 = 3.33
    // Alice total: 40 + 6.67 = 46.67, Bob total: 20 + 3.33 = 23.33
    await expect(page.getByText("$46.67").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("$23.33").first()).toBeVisible();

    // 16. Verify breakdown
    await page.getByRole("button", { name: "Show breakdown" }).click();
    await expect(page.getByText("Tax & svc charge").first()).toBeVisible();
    // Alice breakdown: Steak $20, Salad $20, Tax & svc $6.67
    await expect(
      page.locator("div").filter({ hasText: /^Steak\$20\.00$/ }).first()
    ).toBeVisible();

    // 17 & 18. Unclaim: remove Bob from Steak
    // First toolbar is Steak's chip area. Find the chip containing "Bob" and click its remove button.
    await page.getByRole("toolbar").first().locator("[data-slot='combobox-chip']").filter({ hasText: "Bob" }).getByRole("button").click();

    // After unclaim: only Alice has claims, she gets everything
    // Alice total: $60 + $10 = $70
    await expect(page.getByText("$70.00").first()).toBeVisible({ timeout: 5_000 });
    // Bob should not appear in summary (total = 0)
    await expect(
      page
        .locator("div")
        .filter({ hasText: /^Bob\$/ })
    ).toHaveCount(0);
  });

  test("20-24. Confirmation dialogs for destructive actions", async ({
    page,
  }) => {
    await login(page);
    await createBill(page, "Confirm Test");

    await addItem(page, "Burger", 1, 18.0);
    await addItem(page, "Fries", 1, 8.0);
    await addFriend(page, "Charlie");
    await addFriend(page, "Diana");

    // Share so friends can claim
    await page.getByRole("button", { name: "Share with friends" }).click();
    await expect(page.getByText("shared")).toBeVisible({ timeout: 5_000 });

    // Go to share page and tag Charlie on Burger via combobox
    const shareUrl = await page.locator("input[readonly]").inputValue();
    await page.goto(shareUrl);
    await expect(page.getByText("Confirm Test")).toBeVisible({
      timeout: 10_000,
    });
    const burgerCombobox = page.getByPlaceholder("Add people...").first();
    await burgerCombobox.fill("Charlie");
    await page.getByRole("option", { name: "Charlie" }).click();
    await expect(
      page.getByRole("toolbar").first().getByText("Charlie")
    ).toBeVisible({ timeout: 5_000 });

    // Go back to bill edit page (one goBack from share page)
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Confirm Test" })).toBeVisible({ timeout: 10_000 });

    // 20 & 21. Delete Charlie (has claims) - confirm dialog appears, cancel
    await page
      .locator("div")
      .filter({ hasText: /^Charlie$/ })
      .getByRole("button")
      .click();
    await expect(
      page.getByRole("alertdialog", { name: /Delete \u201CCharlie\u201D/ })
    ).toBeVisible();
    await expect(page.getByText("claimed 1 item")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Charlie")).toBeVisible();

    // 22. Confirm friend deletion
    await page
      .locator("div")
      .filter({ hasText: /^Charlie$/ })
      .getByRole("button")
      .click();
    await page.getByRole("button", { name: "Delete" }).click();
    // Charlie should be gone
    await expect(
      page.locator("div").filter({ hasText: /^Charlie$/ })
    ).toHaveCount(0, { timeout: 5_000 });

    // Re-add Charlie and tag them on Burger again for item deletion test
    await addFriend(page, "Charlie");
    await page.goto(shareUrl);
    await expect(page.getByText("Confirm Test")).toBeVisible({
      timeout: 10_000,
    });
    const burgerCombobox2 = page.getByPlaceholder("Add people...").first();
    await burgerCombobox2.fill("Charlie");
    await page.getByRole("option", { name: "Charlie" }).click();
    await expect(
      page.getByRole("toolbar").first().getByText("Charlie")
    ).toBeVisible({ timeout: 5_000 });

    // Go back to bill edit (one goBack from share page)
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Confirm Test" })).toBeVisible({ timeout: 10_000 });

    // 23. Delete Burger (has claims) - confirm dialog
    await page.locator('input[value="Burger"]').locator("xpath=../button").click();
    await expect(
      page.getByRole("alertdialog", { name: /Delete \u201CBurger\u201D/ })
    ).toBeVisible();
    await expect(page.getByText("claimed this item")).toBeVisible();

    // 24. Confirm item deletion
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator('input[value="Burger"]')).toHaveCount(0, {
      timeout: 5_000,
    });
  });

  test("25-28. Dashboard: delete bills, navigation", async ({ page }) => {
    await login(page);

    // Use unique names with timestamp to avoid conflicts with leftover data
    const ts = Date.now();
    const draftName = `Draft ${ts}`;
    const sharedName = `Shared ${ts}`;

    // Create an editing bill to test direct delete
    await createBill(page, draftName);
    await page.getByRole("button").first().click(); // back button
    await expect(page.getByText(draftName)).toBeVisible({
      timeout: 5_000,
    });

    // 26. Delete editing bill (direct, no dialog)
    await page.getByText(draftName).locator("xpath=ancestor::div[contains(@class,'cursor-pointer')]//button").click();
    await expect(page.getByText(draftName)).toHaveCount(0, {
      timeout: 5_000,
    });

    // Create a shared bill to test confirm dialog
    await createBill(page, sharedName);
    await addItem(page, "Dummy", 1, 10.0);
    await addFriend(page, "Zoe");
    await page.getByRole("button", { name: "Share with friends" }).click();
    await expect(page.getByText("shared")).toBeVisible({ timeout: 5_000 });

    // 27. Navigate back to dashboard
    await page.getByRole("button").first().click(); // back button
    await expect(
      page.getByRole("heading", { name: "Split Bill" })
    ).toBeVisible({ timeout: 5_000 });

    // 25. Delete shared bill (confirm dialog)
    await page.getByText(sharedName).locator("xpath=ancestor::div[contains(@class,'cursor-pointer')]//button").click();
    await expect(
      page.getByRole("alertdialog", { name: new RegExp(`Delete \u201C${sharedName}\u201D`) })
    ).toBeVisible();
    await expect(page.getByText("has been shared")).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(sharedName)).toHaveCount(0, {
      timeout: 5_000,
    });

    // 28. Navigate to bill from dashboard
    // Click on any remaining bill
    const firstBill = page.locator("[class*=cursor-pointer]").first();
    if ((await firstBill.count()) > 0) {
      const billName = await firstBill.locator("p").first().innerText();
      await firstBill.click();
      await expect(
        page.getByRole("heading", { name: billName })
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("29. Auth: unauthenticated user redirected from /bill/[id]", async ({ browser }) => {
    // Fresh context with no cookies (unauthenticated)
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/bill/fake-id-12345");
    await page.waitForURL(/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain("sign-in");
    await context.close();
  });

  test("30. Share page: not found for non-existent shareId", async ({ browser }) => {
    // Fresh context (no auth needed, share is public)
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/share/non-existent-share-id");
    await expect(page.getByText("Bill not found")).toBeVisible({ timeout: 10_000 });
    await context.close();
  });

  test("31. Responsive: mobile viewport has no horizontal overflow", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await login(page);

    // Check dashboard
    const dashboardOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(dashboardOverflow).toBe(false);

    // Navigate to a bill
    await createBill(page, `Mobile Test ${Date.now()}`);
    await addItem(page, "Test Item", 1, 10.0);

    // Check bill page
    const billOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(billOverflow).toBe(false);

    await context.close();
  });
});
