import { test, expect } from '@playwright/test';

/**
 * End-to-end smoke test for The Condenser core flow:
 *   log in → create a home → add a punch item → (clean up the test home).
 *
 * Credentials come from env vars so they never live in the repo:
 *   CONDENSER_EMAIL=you@example.com CONDENSER_PASSWORD=... npx playwright test
 *
 * Runs against the live Railway app by default (see baseURL in
 * playwright.config.ts); set CONDENSER_URL to point at a local instance.
 *
 * The test deletes the home it creates via the API in a `finally`, so a green
 * or red run leaves your account exactly as it found it.
 */

const EMAIL = process.env.CONDENSER_EMAIL;
const PASSWORD = process.env.CONDENSER_PASSWORD;

test.describe('Condenser core flow', () => {
  test.skip(!EMAIL || !PASSWORD, 'Set CONDENSER_EMAIL and CONDENSER_PASSWORD to run this test');

  test('log in, create a home, and add a punch item', async ({ page, request }) => {
    // Never let the PWA splash screen overlay the UI during the test.
    await page.addInitScript(() => sessionStorage.setItem('condenser_splash_seen_v1', '1'));

    // 1) Log in
    await page.goto('/login');
    await page.locator('#email').fill(EMAIL!);
    await page.locator('#password').fill(PASSWORD!);
    await page.getByRole('button', { name: 'Log In' }).click();

    // We should land on Home, where the New Project tile lives.
    const newProject = page.getByRole('button', { name: /New Project/ });
    await expect(newProject).toBeVisible({ timeout: 20000 });

    // Grab the JWT for API cleanup later.
    const token = await page.evaluate(() => localStorage.getItem('condenser_token'));
    expect(token, 'expected a token in localStorage after login').toBeTruthy();

    const stamp = Date.now();
    const address = `E2E Test ${stamp} Main St`;
    const itemText = `E2E punch item ${stamp}`;
    let projectId = '';

    try {
      // 2) Create a home
      await newProject.click();
      await page.getByPlaceholder('123 Main Street').fill(address);
      await page.getByRole('button', { name: 'Continue' }).click();

      // Skip the upload step straight to the project.
      await page.getByRole('button', { name: 'Skip for now' }).click();
      await expect(page).toHaveURL(/\/project\/[0-9a-f-]+$/, { timeout: 20000 });
      projectId = page.url().split('/project/')[1]!;

      // 3) Add a punch item via the quick-add bar
      const addInput = page.getByPlaceholder(/Add punch item/);
      await addInput.fill(itemText);
      await addInput.press('Enter');

      // 4) It should appear in the list
      await expect(page.getByText(itemText)).toBeVisible({ timeout: 20000 });
    } finally {
      // Clean up: delete the test home so nothing is left behind.
      if (projectId && token) {
        await request.delete(`/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  });
});
