# Productivity setup — summary

What was wired up in this session, plus the two items that need your green light before I touch them.

## ✅ Done

### 1. Claude Code hook — typecheck after every turn
Edited: `.claude/settings.json` (outer folder)

After I finish responding, the hook runs `tsc --noEmit` inside `SL-auto-main/` and shows the last 40 lines. You'll see type errors before you re-open the app.

### 2. Firebase Emulator Suite wired
Edited:
- `SL-auto-main/firebase.json` — added `emulators` block (auth:9099, firestore:8080, storage:9199, UI:4000)
- `SL-auto-main/src/firebase/index.ts` — auto-connects to emulators when `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`
- `SL-auto-main/package.json` — added `npm run emulators`

**To use:**
```bash
# terminal 1
cd SL-auto-main
npm run emulators

# terminal 2 — add NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true to .env.local first
npm run dev
```
Open http://localhost:4000 to see the emulator UI.

First run needs `firebase login` + `firebase init emulators` once (it'll ask which emulators; the config is already in `firebase.json` so just accept).

### 3. Playwright responsive smoke tests
Added:
- `SL-auto-main/playwright.config.ts` — runs every test at 1366×768 (laptop), 1920×1080 (desktop), 3840×2160 (4K), and iPad
- `SL-auto-main/tests/e2e/smoke.spec.ts` — loads `/` and `/login`, fails if horizontal overflow
- `SL-auto-main/tests/e2e/README.md` — how to add tests
- `package.json` scripts: `test:e2e`, `test:e2e:ui`

**One-time install** (not run yet — didn't want to touch your lockfile):
```bash
cd SL-auto-main
npm install -D @playwright/test
npx playwright install chromium
npm run test:e2e
```

### 4. Gemini eval scaffold
Added: `SL-auto-main/evals/scan-document/` with README + `fixtures/` + `expected/` folders.

Drop 10–20 anonymized PDFs in `fixtures/` with matching `expected/*.json`. Next step is a `run.ts` driver — I left it for when you have your first few fixtures ready, since the driver depends on what you put in them.

### 5. Zod shared schema demo
Added: `SL-auto-main/src/lib/scan-document-schema.ts`

Full Zod schema matching `/api/scan-document`'s output. **Not yet wired into the route** — that's a targeted edit you'll want to review.

To adopt, in `src/app/api/scan-document/route.ts`:
```ts
import { parseScanDocumentOutput } from '@/lib/scan-document-schema';
// after getting Gemini's response:
const parsed = parseScanDocumentOutput(JSON.parse(text));
if (!parsed) return NextResponse.json({ error: 'shape mismatch' }, { status: 502 });
```

## ⚠️ Needs your approval before I touch

### Gemini prompt caching
Your `scan-document`, `scan-devis`, `scan-rapport` routes each send a long French context prompt (insurance domain, Moroccan plates, compagnies list) on every request. Caching that static portion via Gemini's context caching API can cut token cost by ~60–75% for that prefix.

**Why I didn't auto-edit:** those routes are load-bearing for every dossier creation. A silent regression there would be bad. Want me to do one route (say `scan-document`) as a reference and let you QA it before I touch the other two?

### Firebase App Hosting preview URLs
You're on **Firebase App Hosting** (not classic Hosting), so `firebase hosting:channel:deploy` doesn't apply. App Hosting has its own feature: **automatic preview URLs for GitHub PRs**.

It's enabled in the Firebase console, not in code:
1. Firebase console → App Hosting → your backend
2. Settings → enable "Preview on pull requests"
3. Each PR then gets a `your-backend--pr-NN.web.app` URL

I can't toggle that from the filesystem — it's a console click. But once on, your 10-min build still takes 10 min; the change is that each PR gets its own URL so you stop deploying broken things to prod.

**Bonus:** to cut the 10 min itself, your `apphosting.yaml` currently doesn't set `runConfig.cpu` / `memoryMiB`. If you're OK with it I can look at increasing the build-time resources — but that's a paid change, so not auto-applied.
