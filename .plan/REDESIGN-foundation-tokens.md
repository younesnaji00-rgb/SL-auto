# REDESIGN: Foundation Tokens (Area 1 / 16)

Scope: design token layer — font, palette, radii, base layer utilities. Every downstream area depends on this landing first.

## Files in scope

- [tailwind.config.ts](../tailwind.config.ts)
- [src/app/globals.css](../src/app/globals.css)
- [src/app/layout.tsx](../src/app/layout.tsx)

## Current state (audit)

### Font loading
- [layout.tsx:23](../src/app/layout.tsx#L23) — Inter loaded via raw `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">`. Causes FOUT on cold load. No `next/font` integration.
- [tailwind.config.ts:14-17](../tailwind.config.ts#L14-L17) — `fontFamily.body` and `.headline` both hard-set to `['Inter', 'sans-serif']`. No CSS-variable indirection, so swapping requires editing the Tailwind config.

### Palette — light mode ([globals.css:6-42](../src/app/globals.css#L6-L42))
- `--background: 215 67% 97%` — blue-tinted light. Conflicts with locked v3 warm cream direction.
- `--card: 0 0% 100%` — pure white. Will pop awkwardly against warm cream bg.
- `--primary: 222 83% 58%` — default shadcn blue. Must be teal.
- `--accent: 191 51% 70%` — cyan. Must be mint-teal.
- `--secondary: 220 14% 89%` / `--muted: 220 14% 89%` — cool gray family. Must rebase on warm-neutral.
- `--border: 220 16% 80%` / `--input: 220 16% 82%` — cool neutral. User flagged cool borders felt "different" from warm bg.
- `--ring: 222 83% 58%` — blue. Must follow primary to teal.
- `--sidebar-background: 0 0% 100%` — pure white. Should be slightly warmer cream distinct from main bg (see v3 mockup).
- `--sidebar-accent: 215 67% 97%` — matches main bg; stays as sidebar-hover token but rebased warm.
- `--heading-bg: 220 40% 90%` / `--heading-fg: 220 50% 30%` — separate heading color tokens, cool blue. Used via `h1..h6 @apply text-heading-fg` at [globals.css:89](../src/app/globals.css#L89). Vestigial — headings could just inherit `--foreground` unless there's an intentional subtle shift. Decision: keep the tokens but rebase warm.
- `--chart-1..5: 222 83% 58%, 191 51% 70%, 197 37% 24%, 43 74% 66%, 27 87% 67%` — three blues + amber + orange. Retune to dignified palette matching v3 (navy / powder-blue / near-black / orange / muted-teal).

### Palette — dark mode ([globals.css:43-78](../src/app/globals.css#L43-L78))
- `--background: 222 47% 4%` — very cool dark navy. Should rebase on warm dark (e.g. `30 10% 6%` or similar — warm off-black).
- `--primary: 210 20% 98%` / `--primary-foreground: 222 83% 58%` — **inverted in dark mode** (near-white button with blue text). Inconsistent with light mode. Must also be teal in dark mode for brand coherence.
- `--chart-1..5` completely different from light mode: different hues, not just brightness. Sync palette identity across modes — shift lightness/chroma, not hue.
- `--sidebar-primary: 222 83% 58%` — still blue in dark mode, stale. Retune.

### Base layer ([globals.css:81-106](../src/app/globals.css#L81-L106))
- `h1..h6 @apply text-heading-fg` — no balance/pretty text-wrap.
- `scroll-behavior: smooth` on html — keep.
- `*:focus-visible outline-2 outline-offset-2 outline-ring` — present, good baseline.
- Dark-mode native date input fix present, keep.
- No tabular-nums utility class.
- Body uses `font-body antialiased` — good, just needs Outfit to feed through `font-body`.

### Utilities ([globals.css:108-123](../src/app/globals.css#L108-L123))
- `.scrollbar-thin` — uses `--muted`. Will follow new warm palette automatically.

## Concrete changes

### `src/app/layout.tsx`
- Replace the three `<link>` tags (preconnect + Google Fonts) with `next/font/google` import at the top of the file: `import { Outfit } from 'next/font/google'`.
- Configure `const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-outfit', display: 'swap' })`.
- Apply to `<html className={outfit.variable}>` so the CSS variable is exposed globally.
- Drop the `<head>` block entirely (no more preconnect needed once `next/font` handles it).
- Keep `body className={cn('font-body antialiased')}`.

### `tailwind.config.ts`
- Change `fontFamily.body` and `.headline` to `['var(--font-outfit)', 'sans-serif']` so font swap is CSS-var driven.
- Optional: keep `code: ['monospace']` as-is.
- No other changes — keyframes, animations, colors via HSL vars all stay.

### `src/app/globals.css`
Extract exact HSL values from the v3 mockup screenshot at Phase 1 kickoff. Targets below are starting points to refine:

**Light mode `:root`:**
- `--background: 45 30% 97%` (warm cream, approx `oklch(0.985 0.003 95)`)
- `--card: 45 25% 99%` (slightly paler than bg, still warm)
- `--popover: 45 25% 99%`
- `--primary: 178 55% 28%` (dark teal — "Nouveau dossier" button in v3)
- `--primary-foreground: 45 30% 98%`
- `--secondary: 40 15% 92%` (warm neutral)
- `--muted: 40 15% 92%`
- `--muted-foreground: 30 8% 40%` (warm gray text)
- `--accent: 172 45% 85%` (mint-teal — selection highlight)
- `--accent-foreground: 178 55% 18%`
- `--destructive: 0 65% 55%` (muted red, <80% sat)
- `--border: 40 15% 85%` (warm-neutral border)
- `--input: 40 15% 88%`
- `--ring: 178 55% 28%` (follows primary)
- `--sidebar-background: 45 35% 95%` (slightly warmer/deeper than main bg — v3 distinct sidebar)
- `--sidebar-accent: 172 45% 88%` (mint-teal hover, matches selection)
- `--sidebar-primary: 178 55% 28%`
- `--sidebar-border: 40 15% 82%`
- `--sidebar-ring: 178 55% 28%`
- `--heading-bg: 40 20% 88%` (warm label chip bg if needed)
- `--heading-fg: 178 50% 22%` (deep teal for heading accent)
- Chart palette retune:
  - `--chart-1: 222 45% 30%` (navy — Saham)
  - `--chart-2: 210 55% 75%` (powder blue — RMA)
  - `--chart-3: 0 0% 12%` (near-black warm — Allianz)
  - `--chart-4: 28 75% 58%` (burnt orange — ATLANTA)
  - `--chart-5: 178 35% 50%` (muted teal — fifth slot)

**Dark mode `.dark`:**
- `--background: 30 10% 6%` (warm off-black, not cool navy)
- `--card: 30 10% 8%`
- `--popover: 30 10% 8%`
- `--primary: 172 50% 55%` (mint-teal — still readable on dark, same family as light mint accent)
- `--primary-foreground: 30 10% 6%`
- `--secondary: 30 8% 14%`
- `--muted: 30 8% 14%`
- `--muted-foreground: 30 10% 65%`
- `--accent: 178 35% 22%` (deep teal surface)
- `--accent-foreground: 172 50% 75%`
- `--destructive: 0 55% 45%`
- `--border: 30 8% 18%`
- `--input: 30 8% 16%`
- `--ring: 172 50% 55%`
- `--sidebar-*` mirror with warm-dark values; no more stale `222 83% 58%` primary.
- Chart palette: same hues as light mode, shifted lightness only (e.g. `--chart-1: 222 45% 60%`).

**Base layer additions:**
- Add `h1, h2, h3 { text-wrap: balance; }` and `p { text-wrap: pretty; }`.
- Add a utility class `.tabular` → `font-variant-numeric: tabular-nums;` for data tables (amounts, counts, dates, matricules).
- Consider applying `font-variant-numeric: tabular-nums` to `table` globally in base layer if audit shows tables are universally numeric.

## Constraints / no-go

- Do **not** remove `--heading-bg` / `--heading-fg` — unknown downstream component consumers. Rebase only.
- Do **not** touch `--radius: 0.5rem` — downstream components depend on the computed `md`/`sm` radii.
- Do **not** touch the `@layer utilities .scrollbar-thin` block; it's consumed by scroll areas in dossier detail.
- Do **not** change `darkMode: ['class']` strategy — next-themes depends on it.
- Do **not** add `prefers-color-scheme` auto-detection — user toggles theme explicitly via sidebar.
- Preserve `suppressHydrationWarning` on `<html>` — required by next-themes.
- Do **not** change `lang="en"` on `<html>` — separate i18n decision, not in redesign scope.

## Risk level

**Low-medium.** Font swap is mechanical. Palette rebase is low-risk technically but will change every screen's appearance simultaneously — needs a quick visual pass on each major route before proceeding. The dark-mode inversion fix (`--primary` going from near-white back to teal) is a behavioral change, not just cosmetic, and may surprise users who've been using dark mode.

## Dependencies

None. This is the root; every other area depends on it landing first.

## Exit criteria

- `npm run typecheck` passes.
- `npm run dev` boots, no console errors.
- Light + dark mode toggle still works on sidebar.
- Smoke-test each top-level route (dashboard, dossiers, assignations, utilisateurs, login, editor) — loads without crash, palette reads warm cream + teal, Outfit font applied.
- No blue-tinted background anywhere, no default shadcn blue on buttons.

## Open items to resolve during implementation

1. Extract exact HSL values from v3 screenshot (color-pick the cream bg, teal CTA, mint selection, warm border). The values above are educated starting points.
2. Decide whether to apply `font-variant-numeric: tabular-nums` globally to `table` or only via opt-in `.tabular` class.
3. Decide whether `--heading-bg` / `--heading-fg` stay distinct or collapse into `--foreground` (leaning: keep distinct, rebase warm).
