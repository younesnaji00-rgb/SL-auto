// Phone-viewport screenshot sweep of the app (mobile pass 2026-09-06).
// Signs in with a REAL account, walks every page the role can see, and
// writes PNGs to scripts/ui-shots-mobile/<tag>/<role>/. Uses the Chrome
// already installed on the machine (no browser download).
//
//   LOGIN_NOM="Prénom Nom" LOGIN_PASSWORD="…" npx -p playwright node scripts/ui-shots-mobile.mjs [baseUrl] [tag]
//   PowerShell:  $env:LOGIN_NOM='Prénom Nom'; $env:LOGIN_PASSWORD='…'; npx -p playwright node scripts/ui-shots-mobile.mjs
//
// Optional: SHOT_WIDTH (default 390), SHOT_HEIGHT (844), SHOT_SCALE (2),
// SHOT_THEME (light|dark), SHOT_ONLY=dossiers,dashboard (comma list of files).
// The role is read from the landing page after login; pages the role cannot
// see are skipped (the app redirects them). Firestore keeps a long-polling
// request open, so the script never waits for `networkidle`.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] ?? 'http://localhost:9002').replace(/\/$/, '');
const TAG = process.argv[3] ?? new Date().toISOString().slice(0, 10);
const NOM = process.env.LOGIN_NOM;
const PASSWORD = process.env.LOGIN_PASSWORD;
if (!NOM || !PASSWORD) {
  console.error('Set LOGIN_NOM and LOGIN_PASSWORD (a real account of the firm).');
  process.exit(1);
}
const ONLY = (process.env.SHOT_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const THEME = process.env.SHOT_THEME === 'dark' ? 'dark' : 'light';
const PHONE = {
  width: Number(process.env.SHOT_WIDTH ?? 390),
  height: Number(process.env.SHOT_HEIGHT ?? 844),
  deviceScaleFactor: Number(process.env.SHOT_SCALE ?? 2),
  isMobile: true,
  hasTouch: true,
};

const TOUR_KEYS = ['assignations-atg', 'assignations-chiffrage', 'atg-detail', 'chiffrage-detail', 'compagnies', 'consultation', 'dashboard', 'devis-editor', 'dossier-detail', 'dossiers', 'jours-feries', 'login', 'mes-rappels', 'monitoring', 'signaler-bug', 'tampons', 'utilisateur-detail', 'utilisateurs'];

/** Every screen of the app. `then` drives an interaction before the capture. */
const SHOTS = [
  { file: 'login', path: '/login', noLogin: true },
  { file: 'dashboard', path: '/dashboard' },
  { file: 'dossiers', path: '/dossiers' },
  { file: 'dossiers-filtres', path: '/dossiers', then: async (page) => {
      await page.getByRole('button', { name: /^filtres/i }).first().click();
      await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });
    } },
  { file: 'dossier-detail', path: '/dossiers', then: async (page) => {
      const row = page.locator('[data-mobile-row], table tbody tr, [data-tour="dos-table"] a').first();
      await row.click({ force: true });
      await page.waitForURL(/\/dossiers\/[A-Za-z0-9]/, { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(1500);
    } },
  { file: 'dossier-create', path: '/dossiers', then: async (page) => {
      await page.locator('[data-tour="shell-create"], [data-tour="dos-create"]').first().click();
      await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });
    } },
  { file: 'mes-rappels', path: '/mes-rappels' },
  { file: 'consultation', path: '/consultation' },
  { file: 'compagnies', path: '/compagnies' },
  { file: 'chiffrage', path: '/assignations-chiffrage' },
  { file: 'terrain', path: '/assignations-atg' },
  { file: 'monitoring', path: '/monitoring' },
  { file: 'utilisateurs', path: '/utilisateurs' },
  { file: 'tampons', path: '/tampons' },
  { file: 'jours-feries', path: '/jours-feries' },
  { file: 'profil', path: '/profil' },
  { file: 'signaler-bug', path: '/signaler-bug' },
  { file: 'menu-plus', path: '/dashboard', then: async (page) => {
      const more = page.getByRole('button', { name: /^(plus|menu)$/i }).first();
      if (await more.isVisible().catch(() => false)) {
        await more.click();
        await page.waitForTimeout(500);
      }
    } },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'ui-shots-mobile', TAG);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const ctx = await browser.newContext({ ...PHONE, locale: 'fr-MA', colorScheme: THEME });
  await ctx.addInitScript(({ t, keys }) => {
    try {
      localStorage.setItem('theme', t);
      for (const p of ['sl-auto.tour.', 'appraisio.tour.']) {
        localStorage.setItem(p + 'welcomed', '1');
        localStorage.setItem(p + 'helpBtns', '1');
        for (const k of keys) { localStorage.setItem(p + k, '1'); localStorage.setItem(p + k + '.pointed', '1'); }
      }
    } catch {}
  }, { t: THEME, keys: TOUR_KEYS });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));

  const dismiss = async () => {
    for (let i = 0; i < 3; i++) {
      const later = page.getByRole('button', { name: /^(plus tard|later|fermer)$/i }).first();
      const drv = page.locator('.driver-popover-close-btn').first();
      if (await later.isVisible().catch(() => false)) { await later.click().catch(() => {}); await page.waitForTimeout(400); }
      else if (await drv.isVisible().catch(() => false)) { await drv.click().catch(() => {}); await page.waitForTimeout(400); }
      else break;
    }
  };

  // Login once.
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#nom', { timeout: 30_000 });
  await page.fill('#nom', NOM);
  await page.fill('#password', PASSWORD);
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  await page.waitForTimeout(1500);
  await dismiss();
  const landing = new URL(page.url()).pathname;
  console.log(`logged in as ${NOM} → ${landing}`);

  for (const s of SHOTS) {
    if (ONLY.length && !ONLY.includes(s.file)) continue;
    const target = `${BASE}${s.path}`;
    try {
      if (s.noLogin) {
        const c2 = await browser.newContext({ ...PHONE, locale: 'fr-MA', colorScheme: THEME });
        const p2 = await c2.newPage();
        await p2.goto(target, { waitUntil: 'domcontentloaded' });
        await p2.waitForSelector('#nom', { timeout: 20_000 }).catch(() => {});
        await p2.waitForTimeout(800);
        await p2.screenshot({ path: join(OUT, `${s.file}.png`), fullPage: false });
        await c2.close();
        console.log(`✓ ${s.file}`);
        continue;
      }
      await page.goto(target, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await dismiss();
      const here = new URL(page.url()).pathname;
      if (!here.startsWith(s.path)) { console.log(`– ${s.file} (redirected to ${here}: role cannot see it)`); continue; }
      if (s.then) { await s.then(page); await page.waitForTimeout(600); }
      await page.screenshot({ path: join(OUT, `${s.file}.png`), fullPage: false });
      // Full-page capture too, for scroll-length review.
      await page.screenshot({ path: join(OUT, `${s.file}-full.png`), fullPage: true }).catch(() => {});
      console.log(`✓ ${s.file}`);
      // Close any overlay we opened.
      await page.keyboard.press('Escape').catch(() => {});
    } catch (e) {
      console.log(`✗ ${s.file}: ${String(e.message).split('\n')[0]}`);
    }
  }
  if (errors.length) console.log('page errors:', [...new Set(errors)].join('\n  '));
  console.log(`→ ${OUT}`);
} finally {
  await browser.close();
}
