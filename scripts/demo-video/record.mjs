/**
 * Record the demo-video scenes by driving the LIVE demo with Playwright.
 * Prereq: node scripts/demo-video/tts.mjs (durations.json must exist).
 * Usage: ACCESS_TOKEN=$(gcloud auth print-access-token) node scripts/demo-video/record.mjs
 * (ACCESS_TOKEN is only used to release the field agent's single-session
 *  claim after the mobile scene — recording works without it, but re-runs
 *  would then be blocked at the field agent login.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out');
const VID = path.join(OUT, 'video');
fs.mkdirSync(VID, { recursive: true });

const BASE = process.env.DEMO_URL || 'https://appraisio-demo-964337881254.northamerica-northeast1.run.app';
const PROJECT_ID = process.env.PROJECT_ID || 'appraisio-demo-ca';
const durations = JSON.parse(fs.readFileSync(path.join(OUT, 'audio', 'durations.json'), 'utf8'));

const DESKTOP = { width: 1920, height: 1080 };
const MOBILE = { width: 412, height: 915 };
const PASSWORD = 'Demo2026!';
const slide = (f) => 'file:///' + path.join(__dirname, 'slides', f).replace(/\\/g, '/');

console.log('warming the demo service…');
await fetch(BASE + '/login').catch(() => {});
await new Promise((r) => setTimeout(r, 3000));

const browser = await chromium.launch({ headless: true });

async function login(page, name) {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#nom').waitFor({ state: 'visible', timeout: 45000 });
  await page.locator('#nom').fill(name);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard|assignations/, { timeout: 45000 });
  await page.waitForTimeout(2500);
}

// One authenticated session, reused by scenes 03–07 (IndexedDB carries the
// Firebase token). Admin Demo is NOT single-session, so this is safe.
const statePath = path.join(OUT, 'state.json');
{
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  await login(page, 'Admin Demo');
  await ctx.storageState({ path: statePath, indexedDB: true });
  await ctx.close();
  console.log('auth state captured');
}

// Re-record selected scenes only: ONLY=05-detail,08-mobile node record.mjs
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;

async function runScene(id, { auth = false, viewport = DESKTOP } = {}, fn) {
  if (ONLY && !ONLY.includes(id)) return;
  const target = (durations[id] + 0.7) * 1000;
  const ctx = await browser.newContext({
    viewport,
    recordVideo: { dir: VID, size: viewport },
    storageState: auth ? statePath : undefined,
    ...(viewport === MOBILE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(40000);
  const t0 = Date.now();
  try {
    await fn(page);
  } catch (err) {
    console.error(`scene ${id} action error (continuing, video keeps last state):`, err.message);
    try { await page.screenshot({ path: path.join(OUT, `${id}-error.png`) }); } catch {}
  }
  const left = target - (Date.now() - t0);
  if (left > 0) await page.waitForTimeout(left);
  const video = page.video();
  await ctx.close();
  await video.saveAs(path.join(VID, `${id}.webm`));
  console.log(`recorded ${id} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

// ── 01 Title slide ──────────────────────────────────────────────────────
await runScene('01-title', {}, async (page) => {
  await page.goto(slide('title.html'));
});

// ── 02 Login: bilingual toggle, then sign in as Admin ───────────────────
await runScene('02-login', {}, async (page) => {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#nom').waitFor({ state: 'visible', timeout: 45000 });
  await page.waitForTimeout(2500);
  // Show the language switcher: EN -> FR -> EN.
  const globe = page.locator('button[aria-label="English"], button[aria-label="Français"]').first();
  await globe.click();
  await page.getByRole('menuitem', { name: 'Français' }).click();
  await page.waitForTimeout(2200);
  await page.locator('button[aria-label="Français"]').first().click();
  await page.getByRole('menuitem', { name: 'English' }).click();
  await page.waitForTimeout(1500);
  // Type credentials slowly (visible typing reads better on video).
  await page.locator('#nom').pressSequentially('Admin Demo', { delay: 90 });
  await page.locator('input[type="password"]').first().pressSequentially(PASSWORD, { delay: 70 });
  await page.waitForTimeout(800);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard/, { timeout: 45000 });
});

// ── 03 Dashboard tour-by-scroll ─────────────────────────────────────────
await runScene('03-dashboard', { auth: true }, async (page) => {
  await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tour="dash-etat-card"]').waitFor({ timeout: 45000 });
  await page.waitForTimeout(6000);
  await page.locator('[data-tour="dash-pie"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(5000);
  await page.locator('[data-tour="dash-changements-1"]').scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(6000);
  await page.mouse.wheel(0, -2000);
});

// ── 04 Files list: search + create dialog ───────────────────────────────
await runScene('04-dossiers', { auth: true }, async (page) => {
  await page.goto(BASE + '/dossiers', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tour="dos-table"]').waitFor({ timeout: 45000 });
  await page.waitForTimeout(4500);
  const search = page.locator('[data-tour="dos-search"] input, input[data-tour="dos-search"]').first();
  await search.pressSequentially('Mitchell', { delay: 120 }).catch(() => {});
  await page.waitForTimeout(2500);
  await search.fill('').catch(() => {});
  await page.waitForTimeout(1500);
  await page.locator('[data-tour="dos-create"]').click().catch(() => {});
  await page.waitForTimeout(4000);
  await page.keyboard.press('Escape');
});

// ── 05 File detail: walk the workflow timeline ──────────────────────────
await runScene('05-detail', { auth: true }, async (page) => {
  // Direct navigation — clicking a row cell opens the status-history sheet,
  // not the file. demo-dossier-04 sits mid-workflow (estimating in progress).
  await page.goto(BASE + '/dossiers/demo-dossier-04', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tour="dosd-timeline"]').waitFor({ timeout: 45000 });
  await page.waitForTimeout(5000);
  const steps = page.locator('[data-tour^="dosd-step-"]');
  const n = Math.min(await steps.count(), 6);
  for (let i = 0; i < n; i++) {
    await steps.nth(i).click().catch(() => {});
    await page.waitForTimeout(4200);
  }
});

// ── 06 Built-in tutorial on the dashboard ───────────────────────────────
await runScene('06-tutorial', { auth: true }, async (page) => {
  await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tour="dash-etat-card"]').waitFor({ timeout: 45000 });
  await page.waitForTimeout(1500);
  await page.locator('button[aria-label="Page tutorial"]').click();
  await page.locator('.driver-popover').waitFor({ timeout: 15000 });
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(3200);
    await page.locator('.driver-popover-next-btn').click().catch(() => {});
  }
  await page.waitForTimeout(2500);
  await page.locator('.driver-popover-close-btn').click().catch(() => {});
});

// ── 07 Monitoring funnel ────────────────────────────────────────────────
await runScene('07-monitoring', { auth: true }, async (page) => {
  await page.goto(BASE + '/monitoring', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tour="mon-kpis"]').waitFor({ timeout: 45000 });
  await page.waitForTimeout(6000);
  await page.locator('[data-tour="mon-kpis"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(4000);
  await page.locator('[data-tour="mon-tab-compagnie"]').click().catch(() => {});
  await page.waitForTimeout(4000);
  await page.locator('[data-tour="mon-tab-global"]').click().catch(() => {});
});

// ── 08 Mobile field agent ───────────────────────────────────────────────
await runScene('08-mobile', { viewport: MOBILE }, async (page) => {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#nom').waitFor({ state: 'visible', timeout: 45000 });
  await page.locator('#nom').fill('Field Agent Demo');
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/assignations-atg/, { timeout: 45000 });
  await page.waitForTimeout(6000);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(4000);
  await page.locator('[data-tour="atg-scan"]').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(3000);
  await page.mouse.wheel(0, -600);
});

// Release the field agent's single-session claim so future logins work.
if (process.env.ACCESS_TOKEN) {
  try {
    const headers = {
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
      'x-goog-user-project': PROJECT_ID,
      'Content-Type': 'application/json',
    };
    const q = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'users' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'email' },
                op: 'EQUAL',
                value: { stringValue: 'field.agent.demo@demo.appraisio.app' },
              },
            },
            limit: 1,
          },
        }),
      },
    ).then((r) => r.json());
    const docName = q?.[0]?.document?.name;
    if (docName) {
      await fetch(`https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=currentSessionId`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: {} }),
      });
      console.log('field agent session released');
    }
  } catch (err) {
    console.warn('session release failed (non-fatal):', err.message);
  }
} else {
  console.warn('ACCESS_TOKEN not set — field agent session NOT released');
}

// ── 09/10 Slides ────────────────────────────────────────────────────────
await runScene('09-tech', {}, async (page) => {
  await page.goto(slide('tech.html'));
});
await runScene('10-closing', {}, async (page) => {
  await page.goto(slide('closing.html'));
});

await browser.close();
console.log('all scenes recorded →', VID);
