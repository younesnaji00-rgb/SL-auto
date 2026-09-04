# Carry-over prompt — SL-auto UI/UX work (state as of 2026-09-02)

Paste this at the start of a new Claude session working on the SL-auto redesign. It consolidates the working method, the design rulings, and the verification workflow learned across the previous session. Treat every ruling here as binding owner feedback — do not re-litigate or re-propose rejected ideas.

---

## 1. Repo and environment

- Work in the NESTED dev repo `C:\Users\pc\Downloads\SL-auto-main\SL-auto-main`, branch `nav-upgrade`. The outer folder `C:\Users\pc\Downloads\SL-auto-main` is the deploy/git checkout that has drifted — do not confuse them. The user's localhost dev server runs from the nested repo.
- Next.js 15 + Tailwind v3 + shadcn/Radix + Firestore. UI strings are FRENCH (sentence case; labels never uppercase; +212 Moroccan phone cues; no generic placeholder names — leave empty or use format cues).
- Every `vh`/`vw` in CSS must be divided by `var(--app-zoom)` (app-wide density zoom). The app effectively renders at fractional zoom — this matters for pixel-level work (see §5).
- Commit conventions: `git -c core.safecrlf=false add <files>` (mixed CRLF/LF), grouped descriptive commits, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. NEVER commit these pre-existing dirty files (another agent owns them): `src/app/(app)/dossiers/[id]/modal-planification.tsx`, `src/hooks/use-atg-feasibility.ts`, `src/lib/atg-feasibility.ts`, `UI-MECHANICAL-UPGRADE-PROMPT.md`.
- Verification each round: `npx tsc --noEmit -p tsconfig.json` must be clean. The nested repo has NO eslint config — lint from the outer repo: `cd C:\Users\pc\Downloads\SL-auto-main` then `npx eslint --no-ignore --config eslint.config.mjs SL-auto-main/src/<file>` (`--no-ignore` is required or `src/app/**` is skipped). No new errors allowed; pre-existing warnings are fine. Never run `next build` (the user's dev server owns `.next`).
- No authenticated screenshots are possible (server-resolved login, no credentials; do not attempt workarounds). BUT static CSS/component work CAN and MUST be render-verified locally — see §5.

## 2. How to research (owner rulings — mandatory)

- Research is done PER ELEMENT before building: 2–3 sources, a written spec, then build. Specs live in `docs/element-specs.md` (23 element contracts + dated addendums) — read it before styling anything; append new rulings to it.
- Do NOT default to the usual design systems (GOV.UK, Stripe, M3, Polaris, Carbon, Framer). The owner wants the theory behind patterns: practitioner blogs, UX theory articles, Reddit/HN threads, course material, books (Refactoring UI, Norman, Few). Search broadly, follow references, take real time. Corroborate with design systems only as a secondary source.
- Cite what you actually fetched. Mark honestly what you could not fetch or verify — never imply a source you didn't read. A judgement from training knowledge must be flagged as such.
- "Find the best way" from the owner = present researched OPTIONS and wait for their choice, not code.
- One page / one concern at a time. Keep original page layouts (reference structure: commit `3d5629a`); restyle elements in place; never invent structure.
- Fetch workarounds that worked: raw.githubusercontent.com for Carbon (carbon-website mdx) and Polaris (`.md`, not `.mdx`), r.jina.ai partially for M3; NN/g fetches fine.

## 3. Design system (Cream & Ink — locked rulings)

- Identity: cream canvas, ink ladder text, MUTED DARK TEAL accent (`--primary`) — the teal IS the identity, never brighten it, never spread it. Terracotta (`--tertiary`) is the second voice with exactly ONE meaning: TIME (aujourd'hui / prochain / à venir) — `Badge variant="time"`, warm tint on upcoming date blocks, ONE solid block for THE next item per list. Past = neutral. NEVER: terracotta featured blocks per page, title marks, warm borders, warm count pills, warm decoration — all rejected.
- Type: `t-display` 30/700; labels 12/400 sentence case, never uppercase; numbers never in Outfit; values full ink.
- Spacing: card padding 24, tile 16, never 20. Forms: chunked groups, content-sized fields (a postal code field is short, a name field long).
- Tables: text left, numbers right, headers aligned with their column.
- Glass = the EDGE (light rim + shadow), not see-through fills. "Contour highlight" ALWAYS means: rim (inner light ring + top highlight + faint outer line) PLUS a soft glass bottom drop shadow (`shadow-rim` in tailwind.config carries all of it).
- Anti-patterns (auto-reject): navy surfaces, gradients as decoration, sparkle icons, dashed upload panels, "· période" captions, uppercase labels, generic placeholder names, accent-tinted rows for "today" (use an «Aujourd'hui» time chip).
- Rim on sidebar: ACTIVE row only (rim on every row was rejected). Sidebar collapse toggle stays at the TOP in both states. Active nav row's teal bar animates in (`nav-active-in`, 200ms, motion-safe).

## 4. The tab system (browser-tab anatomy — final state, `.tab-slope` in globals.css)

Every view-switcher in the app is a browser-style tab (owner: "every tab switch", including ones like the points-de-choc «Vue dessus/dessous» — sweep with grep for `role="tab"`, `TabsPrimitive.Trigger`, `aria-selected` when adding new ones; only true value-pickers stay segmented). Anatomy:
- Vertical sides, rounded 10px top corners, and 7px outward-curving FEET at the base that merge into the separation line (Firefox anatomy). Body = `::before` (stops 7px above baseline); feet + seam strip = `::after` (reserved — accent bars must be real `<span>`s, never `after:*` utilities).
- Fills: ACTIVE = grey `surface-4` + rim contour; inactive = `card` (drawn, visible); hover (inactive only) = a SLIM PILL (inset 4px 2px, fully rounded) filled entirely with teal `--accent` tint, `--accent-foreground` label, 1px `--primary` ring — reverts to seated tab on click; the radius/ring/feet transitions are the between-selection morph.
- The contour follows the foot curve as a SOFT GRADIENT (like the rest of the glassy edges — crisp drawn lines on the arc were rejected as aliasing): soft dark shade (`--tab-foot-line`, shadow-color/0.15, 1.5px fade) + soft light band (`--tab-foot-rim`, white/0.5) + fill by foot+2px. Registered `@property` for both so they crossfade.
- Activation animation: `tab-slope-in` (fade + 3px rise, 200ms, `cubic-bezier(0.2,0,0,1)`, reduced-motion safe) on both pseudos.
- Track paddings must be ≥ the foot size (px-2 = 8px ≥ 7px feet) or overflow-x-auto strips clip the feet.

## 5. Visual verification workflow (CRITICAL — this unlocked everything)

Pure-CSS/shape work must be verified by LOCAL RENDER before shipping — reasoning about pixels blind produced 6 correction rounds on one tab corner. Method:
1. Extract the CSS block + token stubs into a standalone HTML in the scratchpad (fake track/panel context matching the real usage).
2. Render with playwright-core (already in node_modules): `pw.chromium.launch({ executablePath: 'C:/Users/pc/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe' })` (the default download path errors; use this explicit path, or `chromium-1234/chrome-win64/chrome.exe`).
3. Judge at `deviceScaleFactor: 1` (the user is on 1440p ≈ 1×; high DPR renders hide 1× defects). To inspect pixels, screenshot a small clip, then display it in a second page as `<img>` with `image-rendering: pixelated` at 8–10× width and screenshot that.
4. Iterate against the render until it looks right, THEN commit. Full authenticated pages still need the user's eyes — say so explicitly; never claim visual verification you didn't do.

## 6. Dialogs & lightboxes (final state + the gotcha)

- **Gotcha that caused 3 rounds**: tailwindcss-animate's enter keyframes REPLACE the element's transform. A centred dialog (static `translate(-50%,-50%)`) must re-supply centring INSIDE the animation via `slide-in-from-left-1/2 slide-in-from-top-1/2`, or it animates from off-centre and snaps. Never strip those from a centred dialog; prefer NOT-emitting utilities over out-cascading them with `!important`.
- `DialogContent` has a `calm` prop: fade + centred zoom only (no slide-from-corner, no drift) — used by both lightboxes and the rappel replay dialog. Default dialogs keep the stock entrance.
- Lightboxes (document-preview-lightbox + photos-tab): the window WRAPS the media exactly — width = `min(96vw/zoom, (92svh/zoom − header) × ratio, 1400px)`, media box height via `aspect-[var(--ar)]`; NO letterbox bands ever (the bands were the media area's dark background showing around object-contain). The image ratio is PRELOADED (`new Image()` probe) before the window mounts so it opens at final size — no resize-and-snap; paging keeps the previous ratio until the next is measured and eases the resize (200ms). The lightbox is orientation-aware by construction (portrait scan → tall window; landscape → wide).

## 7. Rappels / replay comparison (final state)

- Purpose: QUICKLY skim what a user did during a session. Everything serves that: compact `.replay-pane` density (card 24→16, tiles 16→10, small square photo thumbnails ~84px auto-fill grid), and both panes render THE SAME components — the frozen before-snapshot (`rappels/{id}/snapshots/before`, real data, never fabricated; honest « — » when a session predates snapshots) feeds the live step components through guarded `*Override` props (undefined = live behaviour untouched).
- Read-only is SURGICAL, not a blanket disabled fieldset (that killed tab switches and collapse/expand): `ReadOnlyUserScope` + `readOnly` props neutralizing the role-gated write paths + no-op callbacks. All navigation (tabs, collapsibles, lightboxes, downloads) works in both panes; zero write paths.
- Pane headers are full-width caps that cannot scroll away: Avant = recessed surface-3 «Avant le rappel — document d'origine» + caption; Après = card «document modifié» + caption + highlight legend (ajouté/modifié/supprimé). The step bar is the REAL `TimelineBar` (same hover slide-reveal as the dossier page) in the sticky glass shell.
- The «champs requis manquants» warning uses the shared `RequiredSummaryLine` (same quiet status-line anatomy as «pièces requises manquantes»); the «champ manquant» pill on the Informations tab is wired to the same `getMissingRequiredFields` source.

## 8. How to work with this owner

- Iterate in small rounds; the owner tests on their machine and sends screenshots. Read feedback CAREFULLY — a short sentence often inverts your assumption (e.g. "it should have the soft gradient just like the rest" meant softer, not crisper). When ambiguous between two readings that lead to opposite work, re-read the thread before acting; if still ambiguous, ask via a question with options.
- Owner corrections are permanent rulings. Track them in `docs/element-specs.md` addendums and in the auto-memory file `project_app_wide_element_pass.md`. Never re-propose anything from the rejected list (§3).
- Delegate bulk work to parallel sub-agents with a full brief (rules from §1–§3 inline, file-ownership boundaries so agents don't collide, report format demanding sources + honest unverified list). Verify tsc yourself after each agent, commit yourself.
- Report honestly every round: what changed, what is verified (tsc/eslint/local render), what still needs the owner's eyes.
