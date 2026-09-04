# Mission : mise à niveau mécanique UI/UX de SL-auto

You are working on the SL-auto app (this repo). Run the same rules-based upgrade that was just completed on another production app. It has two equally important phases: **Phase 1, a full mechanical UI audit + fix** against published numeric design rules — accessibility, contrast, keyboard and focus behavior, form mechanics, tables, geometry, typography, motion, and theming — and **Phase 2, a desktop→mobile retrofit** using proven patterns. Phase 1 stands on its own and comes first: most of its findings (contrast failures, missing focus management, toast-only errors, hard-coded colors) affect every viewport. Do not invent taste — every change below cites a published rule. Work in passes, verify each with a build and screenshots, and keep the app's existing visual identity untouched: this is about mechanics, not a re-skin.

## Method (follow this order)

1. **Audit first, with evidence.** Sweep the codebase and report PASS/FAIL per rule below with `file:line` evidence and P0–P3 severity (P0 = blocks a task, P1 = WCAG AA violation, P2 = published-rule deviation, P3 = polish). Compute real WCAG contrast ratios for the actual token pairs (relative luminance math), don't eyeball.
2. **Fix in passes**: (1) keyboard & overlays, (2) contrast & focus, (3) forms, (4) responsive/mobile shell, (5) geometry & polish. Small verified diffs; run `tsc --noEmit` + the build after each pass.
3. **Verify visually**: screenshot key pages with playwright at desktop width AND 390×844 (`isMobile: true, hasTouch: true, deviceScaleFactor: 2`), light and dark if the app has themes. Look at the screenshots yourself.
4. **Codify**: write the adopted rules into the repo's DESIGN.md (or create one) so future features inherit them.

## Phase 1 — Mechanical rulebook (the numbers)

**Contrast (WCAG 2.2 1.4.3 / 1.4.11):** text < 24px (or < 18.66px bold) needs **4.5:1**; large text 3:1; UI component boundaries, icons and focus indicators need **3:1** non-text contrast. The classic failures: muted/secondary text tokens (often ~3.5:1 on soft surfaces), placeholder text with extra alpha, white 12–14px text on green/amber/red status fills (2.4–3.3:1 — put the label on a tinted badge pair instead: status-text on status-bg), and low-alpha focus rings.

**Focus & keyboard (WCAG 2.4.7/2.4.13, ARIA APG):**
- Focus indicator: `outline: 2px solid <token>; outline-offset: 2px` — outline follows the element's own border-radius (never hard-set a radius or replace box-shadow in a global `:focus-visible` rule; it deforms pills and erases elevation). Define a `--focus` color token per surface scope so it holds ≥3:1 on every background (light, dark, inverse panels).
- Modals/sheets: focus trap (Tab wraps), initial focus to the first field (skip the close button via a `data-dialog-close` attribute), **focus returns to the invoker on close**, Escape closes, `role="dialog" aria-modal aria-labelledby`, `tabIndex={-1}` on the panel. Write one shared `useFocusTrap(active)` hook.
- **Escape stacking bug** (check for it explicitly): if a combobox/dropdown handles Escape with `preventDefault()` but not `stopPropagation()`, and the parent modal listens for Escape on `window`, one keypress closes both and loses the form. Add `stopPropagation()`.
- Comboboxes: `aria-expanded`, `aria-controls`, `aria-activedescendant` + ids on options; arrows/Enter/Escape per APG.
- Add a skip-to-content link (visually hidden until focused) if there's persistent navigation.
- Framer-motion/motion animations ignore the CSS reduced-motion kill switch — wrap the app in `<MotionConfig reducedMotion="user">`.

**Forms (GOV.UK / NN/g / Baymard):** labels above fields, never placeholder-as-label; validation errors **inline next to the field** (`role="alert"`, red border, focus moves to first invalid field) — never toast-only; **submit stays enabled** and explains on click instead of a dead disabled button; `autocomplete` tokens on fields about the user/company (WCAG 1.3.5), but `autocomplete="off"` on third-person data fields (client/employee records — autofill would inject the operator's own identity); `inputMode` numeric/decimal/tel per field, never `type="number"` for codes; mark optional fields, not required ones.

**Tables:** `scope="col"` on every `<th>`; numeric columns right-aligned (`text-end`, not `text-right`) with `tabular-nums`; the overflow wrapper is a focusable labeled region (`role="region" aria-label tabIndex={0}`).

**Geometry & type:** nested border radii are **derived, not picked**: inner = outer − padding (floor ~4–6px) — Apple concentricity; never same-radius nested. Text floor ~11.5px, body 16px. Letter-spacing: +0.05–0.1em on ALL-CAPS only, negative only ≥20px display. One h1 per page via the shared header; landmarks (`nav`/`main`).

**Motion:** transform/opacity only (never animate `width`/`height`/layout, no `transition-all`); 100–200ms utilities, 250–300ms panels; exits ~0.7× entrances; no bounce.

**Dark mode / theming:** every color a theme must swap lives in the token layer (hunt hard-coded hexes in components); scrims, avatars and chart palettes need dark variants; `color-mix(in oklab, <hue> X%, var(--surface))` is a cheap way to make constants theme-aware.

## Phase 2 — Mobile retrofit (proven patterns, sources named)

**One breakpoint of consequence: `lg` / 1024px.** Above it the desktop UI stays untouched; below it the app becomes a phone app (Material compact/medium window classes). Add `export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }` (Next.js) — never `maximum-scale` caps.

**Navigation:** hide the sidebar below lg; add a **fixed bottom navigation bar with 3–5 always-visible labeled destinations** (M3 spec: icon 24px, label ~11.5px, ≥56px items, `pb-[max(6px,env(safe-area-inset-bottom))]`, active pill indicator).
- **Never a hamburger** (NN/g: hidden nav halves discoverability, task time +15–39%) and **never a "More"/overflow tab** (Apple HIG: "Avoid overflow tabs").
- If there are more than 5 destinations, **combine related ones into a single destination** (M3's remedy) and expose the siblings as **visible tab pills at the top of those pages** — ideally mirroring the desktop nav's existing section grouping so nothing is reorganized. Anything living only in the hidden sidebar (theme/lang toggles, etc.) gets a visible home, e.g. a mobile-only card on the settings page.
- Content gets bottom padding = bar height + safe-area inset; offset toasts above the bar.

**Tables → card lists (no horizontal panning, ever):** entity list pages render **tappable cards below `md`** (conditionally rendered real markup — never `display:block` on a `<table>`, which strips table semantics from the a11y tree): 64–72px rows, name + status badge + the row's actions in full view, totals as a footer line; the real table returns at `md`. Simpler tables can instead prune to essential columns (`max-md:hidden`) so they fit the viewport. Filter controls go full-width on mobile.

**Calendar/planning views:** never squeeze a week grid into 360px and never a swipe-pager — use a **7-day date-strip selector + vertical agenda list** of the selected day (Google Calendar's mobile "Schedule" pattern, its default view; Outlook/Apple ship the same): day chips ≥48px, agenda rows ≥64px, today accented, defaults to today.

**KPI/stat tiles:** a **2×2 compact grid** on phones (Material's 4-column compact grid fits two 2-column tiles) — never one long stacked column. Compact tile variant below `sm` (smaller min-height and value size).

**Overlays:** centered modals become **bottom sheets** below lg (`items-end`, rounded top only, `max-h-[92dvh]`, safe-area padding — the primary action lands in the thumb zone); side sheets become **full-screen dialogs** (M3 rule for multi-field tasks). `overscroll-behavior: contain` on every overlay scroller.

**Mechanics:** all inputs ≥ **16px computed font** (below that iOS zooms on focus and stays zoomed); 16px gutters; heights in `dvh` not `vh`; guard raw CSS `:hover` effects with `@media (hover: hover)` (sticky-hover bug — Tailwind v4's `hover:` variant is already guarded, hand-written CSS isn't); if the app uses backdrop-filter/glassmorphism, flatten cards to near-solid below lg and keep blur ≤12px only on overlays + the bar (most expensive effect on mid-tier Android GPUs); `:active` scale feedback on every tappable.

## Pitfalls learned the hard way

- **Never edit source files with PowerShell `Set-Content`/`-replace`** — it mojibakes UTF-8 accents. Use proper edit tools or a `node -e` script with `fs.readFileSync/writeFileSync('utf8')`.
- Next.js + Turbopack on Windows can produce a corrupt `.next` (`routesManifest.dataRoutes is not iterable` on `next start`) — delete `.next` and rebuild.
- Backgrounded dev/prod servers can survive their wrapper being killed on Windows: before screenshotting, `netstat -ano | findstr :<port>` and kill the PID, or your screenshots silently show the **stale** build.
- When hiding a table below `md` in favor of cards, remove any now-dead per-column hiding classes.
- Verify RTL/i18n if the app has it: `text-end` not `text-right`, `ms-/me-/ps-/pe-` not `ml-/mr-/pl-/pr-`, and check the bottom bar mirrors.

## Deliverables

1. The audit report (findings with file:line, severity, rule + source), before any fix.
2. The fixes, in the 5 passes above, each verified (`tsc`, build, screenshots you actually look at — desktop + 390px, both themes if applicable).
3. DESIGN.md updated with the adopted rules so future work inherits them.
4. A final summary: what changed, what was deferred and why.
