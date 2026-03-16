---
name: test
description: Run e2e tests and manual checks for the split-bill app
user-invocable: true
---

# Test Runner

Run automated and manual tests, then report results.

## Step 1: Automated E2E Tests (Playwright)

Prerequisites: dev server on `http://localhost:3000` and Convex dev backend running.

```bash
cd /Users/prasanth/Desktop/repos/split-bill
npx playwright test --config e2e/playwright.config.ts
```

Report: total passed/failed, list any failures with test name and error message.

If tests fail, read `e2e/flows.spec.ts` to understand what the test expects, then investigate the app code.

## Step 2: Manual Checks (agent-browser)

These are non-deterministic and need visual verification. Run each using `agent-browser`.

### Receipt OCR Upload
1. `agent-browser open http://localhost:3000`
2. Navigate to a bill in editing state
3. Check the upload button is visible and not disabled
4. Verify via snapshot that receipt section renders correctly

### Visual Layout
- `agent-browser resize 375 812` then `agent-browser snapshot -i` - check no horizontal overflow on mobile
- `agent-browser resize 1280 800` then `agent-browser snapshot -i` - check content is centred with max-width

### Auth Edge Cases
- `agent-browser open http://localhost:3000/bill/some-fake-id` - should redirect to sign-in
- `agent-browser open http://localhost:3000/share/some-fake-id` - should load without auth (show loading or not found, no redirect)

## Reporting

Summarise results as:

```
E2E: X/Y passed
Manual: [list each check with pass/fail/skip]
Issues: [any failures with details]
```
