# E2E tests

Playwright tests that run the app against real viewports (laptop 1366, desktop 1920, 4K, tablet) to catch responsive regressions.

## First-time setup

```bash
cd SL-auto-main
npm install -D @playwright/test
npx playwright install chromium
```

## Running

```bash
npm run test:e2e         # headless, all viewports
npm run test:e2e:ui      # interactive mode
```

By default, Playwright starts `npm run dev` automatically. To test a preview/production URL:

```bash
E2E_BASE_URL=https://sl-auto-expertise--preview.web.app npm run test:e2e
```

## Adding tests

Put `.spec.ts` files in this folder. Each test runs in every viewport project (`laptop-1366`, `desktop-1920`, `desktop-4k`, `tablet`).

Keep tests small and focused — one flow per spec file.
