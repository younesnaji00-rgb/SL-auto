// Regenerates the marketing-site screenshots (public/site/shots/*.png) from a
// running demo build, then run `node scripts/site-images.mjs` to refresh the
// WebP variants and the OG card.
//
//   npx -p playwright node scripts/site-shots.mjs [baseUrl]
//   (default baseUrl: http://localhost:9002 with NEXT_PUBLIC_BRAND=demo)
//
// The demo login is a one-click role pick, so the script signs in by clicking
// the role button on /login. If the login UI changes, update ROLE_BUTTON.

import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] ?? 'http://localhost:9002').replace(/\/$/, '');
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public/site/shots');
const ROLE_BUTTON = /manager|gestionnaire/i;

const DESKTOP = { width: 1600, height: 1000, deviceScaleFactor: 2 };
const PHONE = { width: 430, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const SHOTS = [
  { file: 'dashboard.png', path: '/dashboard', viewport: DESKTOP },
  { file: 'dossiers.png', path: '/dossiers', viewport: DESKTOP },
  { file: 'monitoring.png', path: '/monitoring', viewport: DESKTOP },
  // First dossier in the list: open the page and click the first row.
  { file: 'dossier-detail.png', path: '/dossiers', viewport: DESKTOP, then: async page => page.locator('table tbody tr').first().click() },
  { file: 'missions.png', path: '/assignations-atg', viewport: DESKTOP },
  { file: 'mobile-missions.png', path: '/assignations-atg', viewport: PHONE },
];

const browser = await chromium.launch();
try {
  for (const s of SHOTS) {
    const ctx = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: s.viewport.deviceScaleFactor, isMobile: s.viewport.isMobile, hasTouch: s.viewport.hasTouch, locale: 'en-CA' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: ROLE_BUTTON }).first().click();
    await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 30_000 });
    await page.goto(`${BASE}${s.path}`, { waitUntil: 'networkidle' });
    if (s.then) {
      await s.then(page);
      await page.waitForLoadState('networkidle');
    }
    // Let skeletons/animations settle.
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, s.file), fullPage: false });
    console.log('captured', s.file);
    await ctx.close();
  }
} finally {
  await browser.close();
}
