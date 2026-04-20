import { test, expect } from '@playwright/test';

/**
 * Responsive smoke tests. These do not log in — they only verify the
 * public entry point renders without layout overflow across viewports.
 *
 * To add authenticated flows, use tests/e2e/auth.setup.ts (see README).
 */

test('home loads without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SL|Auto|Expertise/i);

  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 1;
  });
  expect(hasOverflow, 'page has horizontal overflow').toBe(false);
});

test('login page is reachable', async ({ page }) => {
  const res = await page.goto('/login', { waitUntil: 'domcontentloaded' });
  expect(res?.status()).toBeLessThan(500);
});
