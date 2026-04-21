# REDESIGN: Shared UI Primitives (Area 2 / 16)

Scope: the shadcn/Radix primitives in `src/components/ui/*` that every page composes. Focus is on interaction polish, missing-state primitives, and retuning hardcoded color variants onto the locked token palette.

## Files in scope

Primitives reviewed for this plan (40 total in directory):
- [button.tsx](../src/components/ui/button.tsx)
- [input.tsx](../src/components/ui/input.tsx), [textarea.tsx](../src/components/ui/textarea.tsx)
- [card.tsx](../src/components/ui/card.tsx)
- [skeleton.tsx](../src/components/ui/skeleton.tsx)
- [badge.tsx](../src/components/ui/badge.tsx)
- [alert.tsx](../src/components/ui/alert.tsx)
- [select.tsx](../src/components/ui/select.tsx), [checkbox.tsx](../src/components/ui/checkbox.tsx), [switch.tsx](../src/components/ui/switch.tsx), [radio-group.tsx](../src/components/ui/radio-group.tsx)
- [dialog.tsx](../src/components/ui/dialog.tsx), [alert-dialog.tsx](../src/components/ui/alert-dialog.tsx), [sheet.tsx](../src/components/ui/sheet.tsx)
- [table.tsx](../src/components/ui/table.tsx), [tabs.tsx](../src/components/ui/tabs.tsx)
- [toast.tsx](../src/components/ui/toast.tsx), [toaster.tsx](../src/components/ui/toaster.tsx)

## Current state (audit)

### [button.tsx](../src/components/ui/button.tsx)
- Variants: default, destructive, outline, secondary, ghost, link. Sizes: default/sm/lg/icon.
- Uses `transition-colors` only — no `active:scale` press feedback, no transform.
- Hover states: all `hover:bg-*/90` or `hover:bg-accent` — fine, will inherit warm palette once foundation-tokens lands.
- Focus state: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` — standard, good.
- Missing: `active:scale-[0.98]` or `active:translate-y-[1px]` press feedback. No loading state prop.

### [input.tsx](../src/components/ui/input.tsx) and [textarea.tsx](../src/components/ui/textarea.tsx)
- Single variant. No error state. No success state.
- `border border-input bg-background` — inherits palette, fine.
- Focus ring via `focus-visible:ring-2 focus-visible:ring-ring` — fine.
- No `aria-invalid` styling hook. Consumers (forms with zod) must manually add red border.

### [card.tsx](../src/components/ui/card.tsx)
- `CardHeader` applies `bg-heading-bg rounded-t-lg` at [card.tsx:26](../src/components/ui/card.tsx#L26) — uses the vestigial `--heading-bg` / `--heading-fg` tokens that foundation-tokens will rebase warm. Will auto-update.
- `CardTitle` uses `text-heading-fg` — same story.
- `shadow-sm` generic — consider tinted shadow (`shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]`) for the warm-palette feel, but defer unless it reads too flat after foundation-tokens lands.

### [skeleton.tsx](../src/components/ui/skeleton.tsx)
- Single-shape `animate-pulse rounded-md bg-muted` — no structural variants.
- All consumers must compose their own skeleton layouts from primitives. Heavy lifting on consumers.

### [badge.tsx](../src/components/ui/badge.tsx)
- Custom domain variants at [badge.tsx:18-21](../src/components/ui/badge.tsx#L18-L21) hardcoded to Tailwind palette colors:
  - `creation` → `bg-red-100 text-red-800`
  - `chiffrage` → `bg-blue-100 text-blue-800`
  - `validation` → `bg-orange-100 text-orange-800`
  - `expertise` → `bg-green-100 text-green-800`
- These **bypass the warm-palette token system** and will clash with the cream/teal direction (saturated reds, blues, oranges). Must retune via CSS vars or warmer/muted Tailwind shades.
- Also uses `rounded-full` (pill). Per v3 mockup the status dots are pills — keep the pill shape, just rebalance colors.

### [alert.tsx](../src/components/ui/alert.tsx)
- Only 2 variants: default, destructive. Missing `success`, `warning`, `info` — needed for empty-state CTAs, form submission confirmations, Firestore sync banners.

### [select.tsx](../src/components/ui/select.tsx), [checkbox.tsx](../src/components/ui/checkbox.tsx), [switch.tsx](../src/components/ui/switch.tsx), [radio-group.tsx](../src/components/ui/radio-group.tsx)
- Standard shadcn implementations. Inherit `--primary` (checked state) and `--ring` (focus) — will follow teal automatically after foundation-tokens.
- No error-state styling hooks.

### [dialog.tsx](../src/components/ui/dialog.tsx), [alert-dialog.tsx](../src/components/ui/alert-dialog.tsx), [sheet.tsx](../src/components/ui/sheet.tsx)
- Backdrop default `bg-black/80` — harsh with warm cream palette. Should tint warm (e.g. `bg-[hsl(var(--foreground)/0.4)]` or similar) to feel like depth of field, not a cutout.
- Animations via tailwindcss-animate — keep.

### [table.tsx](../src/components/ui/table.tsx)
- Standard shadcn. Hover `hover:bg-muted/50` — follows palette, fine.
- No `font-variant-numeric: tabular-nums` applied. Will need either the global `table` base rule (from foundation-tokens) or opt-in utility class.

### [tabs.tsx](../src/components/ui/tabs.tsx)
- Active tab uses `data-[state=active]:bg-background` — will flip correctly on warm palette.
- Dossier detail has 19+ tabs; at that count the standard horizontal tab bar overflows. Not a primitive concern — handled in dossier-detail plan.

### [toast.tsx](../src/components/ui/toast.tsx) / [toaster.tsx](../src/components/ui/toaster.tsx)
- Radix toast primitives. Variants inherit palette. Success/info/warning variants missing from shared layer — consumers use default+destructive.

### Missing primitives
No components exist for:
- **EmptyState** — icon + title + description + CTA layout for empty tables/lists/dossier states.
- **ErrorState** — error icon + message + retry action for Firestore fetch failures.
- **InlineLoader** — spinner with optional label, for async buttons and small regions.
- **PageLoader** — full-screen loading state used during auth gate (currently ad-hoc `Loader2` spinner at [(app)/layout.tsx](../src/app/(app)/layout.tsx)).

## Concrete changes

### [button.tsx](../src/components/ui/button.tsx)
- Extend base class: add `transition-all duration-150 active:scale-[0.98]` (replace `transition-colors` with `transition-all` so the scale transition works).
- Consider adding `motion-safe:` prefix on the scale to respect `prefers-reduced-motion`: `motion-safe:active:scale-[0.98]`.
- Add a `loading` boolean prop: when true, render a `Loader2` at start of children and set `disabled`. Use `aria-busy="true"`.
- No variant changes — `default/destructive/outline/secondary/ghost/link` all inherit warm palette correctly.

### [input.tsx](../src/components/ui/input.tsx) and [textarea.tsx](../src/components/ui/textarea.tsx)
- Add error state via `aria-invalid="true"` selector: `aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive` at end of className chain.
- This lets react-hook-form / zod set `aria-invalid` and the input self-styles. No new prop needed.

### [card.tsx](../src/components/ui/card.tsx)
- Consider dropping `bg-heading-bg rounded-t-lg` from `CardHeader` default and letting consumers opt-in (via `heading` variant). Current default is strong — every card has a tinted top band, which was fine on cool-blue palette but may feel heavy on warm cream.
- Decision deferred to Phase 1 visual review: land foundation-tokens first, then evaluate if `bg-heading-bg` chip feels right on cream. If not, drop from default.
- Optionally add a `variant` prop: `default` (current) / `plain` (no header tint) / `elevated` (softer shadow, no border).

### [skeleton.tsx](../src/components/ui/skeleton.tsx)
- Keep base `Skeleton` as-is.
- Export new composite components in same file:
  - `SkeletonRow` — one table row shape (h-12, full width, border-b).
  - `SkeletonCard` — card-shaped placeholder with title + 2-line body.
  - `SkeletonChart` — bar-chart placeholder with 5 animated bars of varying height.
  - `SkeletonAvatar` — circular, size variants.
- All use the same `animate-pulse bg-muted` primitive under the hood.

### [badge.tsx](../src/components/ui/badge.tsx)
- Retune the four custom variants to warm palette. Two options — pick at Phase 2:
  1. **Soft colored chips (v3 style)**: keep Tailwind palette but shift to warmer/muted shades, e.g. `creation: bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200` etc.
  2. **CSS var-driven**: add `--badge-creation-bg/fg`, `--badge-chiffrage-bg/fg`, etc. in `globals.css` and reference them here. More work, cleaner system.
- Per v3 mockup, status dots use distinct hues (amber/green/red/purple/orange) — keep the variety, just desaturate.

### [alert.tsx](../src/components/ui/alert.tsx)
- Add variants: `success` (teal/green family), `warning` (amber), `info` (muted teal).
- Reuse same structure — just add entries to the `cva` variant object.

### [dialog.tsx](../src/components/ui/dialog.tsx), [alert-dialog.tsx](../src/components/ui/alert-dialog.tsx), [sheet.tsx](../src/components/ui/sheet.tsx)
- Replace `DialogOverlay` backdrop `bg-black/80` with `bg-[hsl(var(--foreground)/0.55)] backdrop-blur-sm` — tinted + subtle blur. Feels like warm depth not a void.

### [table.tsx](../src/components/ui/table.tsx)
- Add `tabular-nums` to `TableCell` default or to `Table` root — depends on foundation-tokens decision. If global `table { font-variant-numeric: tabular-nums; }` lands, no change needed here.

### [toast.tsx](../src/components/ui/toast.tsx)
- Add variants: `success`, `warning`, `info` matching the alert variants. Keep destructive.

### New primitives (create in `src/components/ui/`)

**`empty-state.tsx`** — composable:
```
<EmptyState
  icon={<FolderOpen />}
  title="Aucun dossier pour le moment"
  description="Créez votre premier dossier pour commencer."
  action={<Button>Nouveau dossier</Button>}
/>
```
- Warm bg, dashed-border optional via prop, centered layout.
- Replaces scattered ad-hoc "Aucun X" text blocks across dossiers, assignations, utilisateurs, missions-tab.

**`error-state.tsx`** — similar shape, with:
- `AlertTriangle` icon in destructive tint.
- Optional `onRetry` callback → renders a retry button.
- Used when Firestore `onSnapshot` errors.

**`inline-loader.tsx`**:
- Small `Loader2` + optional label.
- Replaces scattered `<Loader2 className="h-4 w-4 animate-spin" />` usages across the app.

**`page-loader.tsx`**:
- Full-height centered loader.
- Replaces the ad-hoc pattern in `(app)/layout.tsx` auth gate.

### Focus ring global tightening
- Foundation-tokens already has `*:focus-visible outline-2 outline-offset-2 outline-ring` in globals.
- Audit here: some Radix primitives use `focus-visible:ring-2` (not outline). Keep ring as-is on form primitives (conventional), just verify ring color follows new teal `--ring` after foundation-tokens lands.

## Constraints / no-go

- Do **not** change the `buttonVariants` export signature — many consumers spread `className` + `variant` + `size`.
- Do **not** remove the `asChild` prop on Button — downstream uses `Slot` for `<Link>` composition.
- Do **not** remove the 4 custom badge variants (`creation`, `chiffrage`, `validation`, `expertise`) — consumers depend on the names. Retune colors only.
- Do **not** change the exported names or prop shapes of existing primitives. Net-new components only.
- Do **not** touch `sidebar.tsx` in this area — it's the Radix sidebar provider, belongs to layout-shell.
- Do **not** touch `chart.tsx` (Recharts wrapper) — it belongs to the dashboard area where the Recharts palette is retuned.
- Do **not** touch `form.tsx` — react-hook-form + zod integration is stable.
- Do **not** change animation durations on Radix components globally — the tailwindcss-animate baseline is tuned.

## Risk level

**Low.** These are leaf components. Button / Input / Card / Badge / Alert changes ripple everywhere visually but are mechanical. New primitives (EmptyState, ErrorState, InlineLoader, PageLoader) don't touch any existing callsite until consumers opt in — no risk of regression.

Medium only for the `CardHeader` `bg-heading-bg` decision and the badge variant recolor, because those change every card top band and every status badge in the app simultaneously. Both require a visual review pass after Phase 1.

## Dependencies

- **Requires foundation-tokens to land first.** The warm palette and teal primary drive all variant looks. Without it, button/input/card restyle evaluates against the wrong base.
- **Blocks: layout-shell, login, dashboard, dossier-list, dossier-detail, assignations, utilisateurs, modals, domain-components.** Every downstream area composes these primitives.

## Exit criteria

- `npm run typecheck` passes.
- Every existing button, input, card, badge, alert, table, dialog, toast on any route still renders without crash.
- Button press feedback visible (scale on active).
- Form inputs with `aria-invalid="true"` render with destructive border.
- New primitives (`EmptyState`, `ErrorState`, `InlineLoader`, `PageLoader`) exist, exported, with TypeScript props.
- Badge variants reconciled to warm palette — no saturated blue-100/red-100 chips clashing against cream.

## Open items to resolve during implementation

1. CardHeader `bg-heading-bg` — keep as default or make opt-in via variant? Decide after foundation-tokens visual review.
2. Badge recolor approach — Tailwind shade retune vs CSS-var system. Lean Tailwind retune for minimal churn.
3. Should `Button` gain a `loading` prop now, or defer until first consumer (forms in Phase 3) actually needs it? Lean add now, zero cost.
