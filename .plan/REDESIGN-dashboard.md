# REDESIGN: Dashboard (Area 5 / 16)

Scope: the activity hub — status list + drawer pattern, Recharts palette, analytics row. This is the surface the v3 mockup targets directly. **The existing structure already closely matches v3** — most of the work here is polish + palette retune, not restructure.

## Files in scope

- [src/app/(app)/dashboard/page.tsx](../src/app/(app)/dashboard/page.tsx)
- [src/lib/status-colors.ts](../src/lib/status-colors.ts) *(shared helper — retuned here, consumed by every list/detail surface)*

## Current state (audit)

### Structure — already mirrors v3 ✅

The dashboard already implements:
- **Status list card with search** (`Dossier Par État`) at [page.tsx:484-525](../src/app/(app)/dashboard/page.tsx#L484-L525).
- **Row selection with teal accent** (`isSelected ? 'bg-accent border-l-2 border-l-primary'`) at [page.tsx:511](../src/app/(app)/dashboard/page.tsx#L511).
- **Conditional right-drawer pattern**: when a status is selected, pie card swaps out and filtered table appears next to the list at [page.tsx:660-670](../src/app/(app)/dashboard/page.tsx#L660-L670). This is exactly the v3 layout.
- **Bottom analytics row**: Changements Tous / Changements Statut / Répartition Compagnie at [page.tsx:673-734](../src/app/(app)/dashboard/page.tsx#L673-L734).
- **Compagnie horizontal bar chart** — v3's bottom-right panel — already implemented.

### Firestore layer (preserve)
- `onSnapshot` on `dossiers` (ordered by `createdAt`) with client-side compagnie filter at [page.tsx:96-107](../src/app/(app)/dashboard/page.tsx#L96-L107).
- `collectionGroup` query on `workflow` subcollection — real-time activity feed.
- Permission filter: user's `profile.compagnies` clips the dossier list. **Memory rule confirms this is fine** (compagnies dropdown is unrestricted; the per-user data filter here is different and correct).
- `localStorage` last-visit tracking for "new" entry highlights at [page.tsx:81-88](../src/app/(app)/dashboard/page.tsx#L81-L88).

### Design issues

**1. Universal `bg-heading-bg` chip band on every card**
Every `CardHeader` on dashboard uses `bg-heading-bg py-3 rounded-t-xl`. That's 6+ chip bands visible at once. The v3 mockup has clean card headers — no chip, just title text. Heavy chip + warm cream may read busy.

**2. `rounded-xl` vs. token system**
Cards use `rounded-xl` literal, not `rounded-lg` (which maps to `--radius`). Inconsistent with `--radius: 0.5rem`. Either bump `--radius` or switch to `rounded-lg` in consumers.

**3. Hardcoded status colors in [status-colors.ts](../src/lib/status-colors.ts)**
The full status taxonomy maps to `bg-red-100`, `bg-emerald-100`, `bg-blue-100`, `bg-orange-100`, `bg-violet-100`, `bg-teal-100`, `bg-slate-100`, `bg-cyan-100`, `bg-gray-100`. On warm cream, the `-100` shades will read too saturated and cool-toned (blues and violets especially). 9 color families — every status list row + every badge inherits from here.

**4. Hardcoded green/orange on activity timeline**
Changements panel dots at [page.tsx:440](../src/app/(app)/dashboard/page.tsx#L440): `log.status === 'done' ? "bg-green-500" : "bg-orange-500"`. Similarly `bg-green-50/50` + `border-l-green-300` for "new since last visit" at [page.tsx:435](../src/app/(app)/dashboard/page.tsx#L435). Hardcoded semantic colors that bypass the token system.

**5. Aggressive tiny type**
`text-[9px]` for date stamp at [page.tsx:452](../src/app/(app)/dashboard/page.tsx#L452). `text-[10px]` for dossier label, details, user attribution, nature/compagnie/matricule table cells. Dense dashboard. Once Outfit loads with its more rounded letterforms, these sizes may feel even tighter. Review visually — may need to bump `[9px]` → `[10px]` at minimum.

**6. Typo'd French copy (accents missing)**
Several accents dropped:
- `"Changements recents"` → `"Changements récents"` ([page.tsx:343](../src/app/(app)/dashboard/page.tsx#L343))
- `"Aucune activite recente"` → `"Aucune activité récente"` ([page.tsx:425](../src/app/(app)/dashboard/page.tsx#L425))
- `"Reinitialiser"` → `"Réinitialiser"` ([page.tsx:415](../src/app/(app)/dashboard/page.tsx#L415))
- `"Assure"` (column header) → `"Assuré"` ([page.tsx:612](../src/app/(app)/dashboard/page.tsx#L612))
- `"Repartition par Compagnie"` → `"Répartition par Compagnie"` ([page.tsx:693](../src/app/(app)/dashboard/page.tsx#L693))
- `"Aucune donnee"` → `"Aucune donnée"` ([page.tsx:534, 697](../src/app/(app)/dashboard/page.tsx#L534))
- `"Dossier Par État"` header is correct ✅
- Placeholder `"Search..."` should be `"Rechercher..."` ([page.tsx:491](../src/app/(app)/dashboard/page.tsx#L491))

The memory rule says "preserve French copy verbatim" but missing accents are unambiguously bugs, not intentional stylistic choices. **Flag all instances; user decides whether to fix during implementation.** Note: v3 mockup uses correct accents ("Changements récents", "Répartition par Compagnie").

**7. Loading skeleton is manual**
Lines [306-329](../src/app/(app)/dashboard/page.tsx#L306-L329) hand-build skeleton layout with animate-pulse. Should use the new `SkeletonCard` / `SkeletonChart` primitives planned in shared-ui.

**8. Empty states are plain text**
- Filtered status rows empty: `"Aucun statut."` plain italic text ([page.tsx:500](../src/app/(app)/dashboard/page.tsx#L500))
- Pie empty: `"Aucune donnee."` plain italic text ([page.tsx:534](../src/app/(app)/dashboard/page.tsx#L534))
- Changements panel empty: centered Inbox icon + italic text ([page.tsx:422-426](../src/app/(app)/dashboard/page.tsx#L422-L426)) — best of the three, use as template.
- Table empty: `TableCell colSpan={7} text-center py-10 text-muted-foreground italic` ([page.tsx:622-626](../src/app/(app)/dashboard/page.tsx#L622-L626))
- Compagnie chart empty: plain italic text ([page.tsx:697](../src/app/(app)/dashboard/page.tsx#L697))

All should consolidate onto the new `EmptyState` primitive.

**9. Animations**
Staggered fade-in-up with inline style `animationDelay` values sprinkled throughout. Works. Preserve.

**10. Recharts palette via CSS vars**
Good — already reads from `--chart-1..5` at [page.tsx:209-215](../src/app/(app)/dashboard/page.tsx#L209-L215). Foundation-tokens retune propagates automatically.

**11. Pie chart label rendering**
Complex conditional label logic at [page.tsx:553-572](../src/app/(app)/dashboard/page.tsx#L553-L572): if >4 slices, show label outside with slice color; else show white percent inside. Clever, keep.

**12. Pie chart white text**
`fill={statusChartData.length > 4 ? statusChartData[index].fill : '#fff'}` — hardcoded `#fff`. On light mode chart slice, white text is correct. On dark mode, still white — fine. Keep.

**13. Filter chip on new entries**
`bg-green-50/50 dark:bg-green-950/10 rounded-lg p-2 -ml-0.5 border-l-green-300` ([page.tsx:435](../src/app/(app)/dashboard/page.tsx#L435)). Hardcoded success tint. Retune.

**14. Date badge micro-styling**
`text-[9px] font-medium text-muted-foreground whitespace-nowrap ml-2 bg-muted px-1.5 py-0.5 rounded` ([page.tsx:452](../src/app/(app)/dashboard/page.tsx#L452)). Looks like a chip. Fine shape, just sizing.

## Concrete changes

### [status-colors.ts](../src/lib/status-colors.ts) — **retune globally**
This file is consumed by dashboard, dossier-list, dossier-detail (many tabs), consultation, assignations. Retuning here is the biggest palette lever across the app.

**Approach**: keep the 9-family semantic classification (red/emerald/blue/orange/violet/teal/slate/cyan/gray). Shift the background tints warmer and softer to feel right on cream:

- **getStatusBadgeStyles** (`-100` chip backgrounds):
  - `bg-red-100 text-red-700` → `bg-rose-100/70 text-rose-700` (softer, slightly warmer red)
  - `bg-emerald-100 text-emerald-800` → `bg-emerald-50 text-emerald-800` (lighter on cream)
  - `bg-blue-100 text-blue-800` → `bg-sky-50 text-sky-800` (shift to sky so it doesn't fight teal primary)
  - `bg-orange-100 text-orange-800` → `bg-amber-50 text-amber-800` (slightly warmer)
  - `bg-violet-100 text-violet-800` → `bg-violet-50 text-violet-800` (softer, less saturated)
  - `bg-teal-100 text-teal-800` → distinct from primary: use `bg-teal-50 text-teal-700` and check it doesn't visually merge with the selected-row mint-teal accent
  - `bg-cyan-100 text-cyan-800` → `bg-cyan-50 text-cyan-800`
  - `bg-slate-100 text-slate-600` → `bg-stone-100 text-stone-600` (warmer neutral)
  - `bg-gray-100 text-gray-800` → `bg-stone-100 text-stone-700`
  - Dark-mode variants: keep the `/30` alpha pattern but verify against the new warm-dark background.

- **getStatusHeaderStyles** (saturated solid `-500` bars with white text):
  - Shift to `-500`/`-600` levels that read well on white text over cream backdrops — the hues can stay (red-500, emerald-500, etc.) but review each individually. `indigo-500` for expertise should maybe become `sky-600` to avoid fighting violet. `bg-indigo-500` fallback for unknown status should become `bg-stone-500`.

- **getStatusDotColor** (`-500` dot):
  - Same hue shifts as getStatusBadgeStyles. Keep saturated (-500 level) for visibility.

**Decision point**: do this retune in one pass as part of dashboard phase, or as a dedicated pre-cursor to Phase 3? Lean: do it with dashboard since dashboard consumes it most heavily and a visual regression here is easiest to catch.

### [page.tsx](../src/app/(app)/dashboard/page.tsx)

**Card chrome**
- Decide: keep `bg-heading-bg rounded-t-xl` chip on dashboard cards, or override with `className` to drop it and use a clean title + right-aligned filter/action. Lean **drop the chip** on dashboard cards — matches v3 more closely. Override CardHeader `bg-heading-bg` by passing `className="!bg-transparent pb-0 pt-4"` or by adding a `plain` variant to the Card primitive (shared-ui plan mentions this option).
- Replace `rounded-xl` / `rounded-t-xl` literals with `rounded-lg` / `rounded-t-lg` to align with the `--radius` token. Or introduce `--radius-xl` if the larger radius is intentional — lean standardize to `rounded-lg`.
- `shadow-sm hover:shadow-md transition-shadow` — keep, but once palette lands evaluate if a tinted shadow reads better than the default black.

**Status list card**
- Keep the row button pattern, border-l-primary selection accent, and the header search input.
- Retune search placeholder: `"Search..."` → `"Rechercher..."` (add accent for consistency; this matches v3).
- The `getStatusHeaderStyles(item.name)` count pill will inherit the retuned color families.
- Verify `border-l-2 border-l-primary` still reads correctly once primary is teal — the mint accent + teal line should pop.

**Pie card**
- Replace `"Aucune donnee."` (italic text) with `<EmptyState icon={<PieChartIcon />} title="Aucune donnée" description="Les statistiques apparaîtront dès qu'un dossier sera créé." />`.
- Verify chart colors via `--chart-*` read well against cream; if not, bump chart saturation slightly.

**Filtered table card**
- Replace plain-text empty row with proper `<EmptyState>` embedded in `TableCell colSpan={7}`.
- Table cells currently use `text-[10px]` for matricule/nature/compagnie/date — after Outfit loads, review if bumping to `text-xs` (12px) improves readability without forcing scroll. Lean yes.
- Keep `font-mono text-xs` on refExpert link — monospace for refs is a deliberate data-typography choice.
- Add `tabular-nums` to numeric cells via shared-ui's new global utility if applied, otherwise add opt-in class.
- Close button `Fermer` at [page.tsx:602](../src/app/(app)/dashboard/page.tsx#L602) — keep ghost variant, will inherit teal palette.

**Changements panels**
- Timeline dot colors at [page.tsx:440](../src/app/(app)/dashboard/page.tsx#L440): replace `bg-green-500` / `bg-orange-500` with either retuned status-colors helpers or an inline semantic mapping: `log.status === 'done' ? 'bg-emerald-500' : 'bg-amber-500'` (softened warms).
- New-entry highlight at [page.tsx:435](../src/app/(app)/dashboard/page.tsx#L435): replace `bg-green-50/50 dark:bg-green-950/10 ... border-l-green-300 dark:border-l-green-700` with teal-tinted success variant: `bg-[hsl(var(--primary)/0.05)] border-l-[hsl(var(--primary))]`. Signals "new" using the app's accent rather than importing a foreign success green.
- New-entry Plus badge at [page.tsx:446](../src/app/(app)/dashboard/page.tsx#L446): `bg-green-500 text-white` → `bg-primary text-primary-foreground` (teal).
- Empty state at [page.tsx:422-426](../src/app/(app)/dashboard/page.tsx#L422-L426): swap to `<EmptyState icon={<Inbox />} title="Aucune activité récente" description="Les changements apparaîtront ici au fil de l'activité." />`.
- Filter row reset button `"Reinitialiser"` → `"Réinitialiser"`.
- Filter type select placeholder `"Type de changement"` is fine.

**Répartition par Compagnie**
- Correct accents: `"Repartition par Compagnie"` → `"Répartition par Compagnie"`.
- Bar chart `barSize={24}` + `radius={[0, 4, 4, 0]}` — nice. Colors via `--chart-*` auto-retune.
- Per v3 mockup: Saham=navy, RMA=powder-blue, Allianz=near-black, ATLANTA=orange, fifth=muted teal. This ordering depends on `sort((a,b) => b[1]-a[1])` and then the palette rotation. The palette rotation is arbitrary — if specific compagnies should always get specific colors (brand recognition), introduce a `COMPAGNIE_BRAND_COLORS` map (lookup by compagnie name). **Decision defer**: lean keep automatic rotation since the list is user-managed and not fixed.

**Loading skeleton** ([page.tsx:306-329](../src/app/(app)/dashboard/page.tsx#L306-L329))
- Replace hand-built skeleton with composition of shared-ui primitives:
  - Top row: `<SkeletonCard />` × 2 (pie + filter list shapes)
  - Bottom row: `<SkeletonCard />` × 3 (panel shapes)

**Typography cleanups**
- `text-[9px]` date badge → `text-[10px]` minimum.
- `font-bold` → `font-semibold` in most places (Outfit semibold reads as confident; bold may feel heavy).
- Heading sizes: `text-base` CardTitles are fine, keep.

**Accent typo fixes** (list for user review)
- Line 343: `"Changements recents"` → `"Changements récents"`
- Line 425: `"Aucune activite recente"` → `"Aucune activité récente"`
- Line 415: `"Reinitialiser"` → `"Réinitialiser"`
- Line 491: `"Search..."` → `"Rechercher..."`
- Line 534, 697: `"Aucune donnee"` → `"Aucune données"` (or `"Aucune donnée"`)
- Line 612: `"Assure"` → `"Assuré"`
- Line 624: `"Aucun dossier avec ce statut"` — correct
- Line 693: `"Repartition par Compagnie"` → `"Répartition par Compagnie"`

## Constraints / no-go

- Do **not** touch the Firestore `onSnapshot` queries or the `collectionGroup('workflow')` pattern — preserves realtime + permission semantics.
- Do **not** change the compagnie-based client filter at [page.tsx:99-101](../src/app/(app)/dashboard/page.tsx#L99-L101) — that's the per-user data scope (separate from the sidebar compagnie dropdown).
- Do **not** remove `localStorage` last-visit tracking — user-facing feature.
- Do **not** change the `ALL_STATUSES` import from `@/lib/dossiers-data` or invent new status names.
- Do **not** reduce the 9-family status color classification — every status must still map semantically.
- Do **not** change the selection-toggles-drawer conditional layout logic — it's the load-bearing v3 pattern.
- Do **not** change `DatePicker` contract — it's a shared ui primitive.
- Do **not** restructure the pie chart label render logic — it handles both few-slice (internal label) and many-slice (external label) cases deliberately.

## Risk level

**High.** Dashboard is realtime, data-heavy, and every Moroccan insurance user checks it first thing. Status-colors retune ripples to every list/detail surface — a bad color choice is visible everywhere. Chip-band removal changes every card visually. Missing-accent fixes change displayed strings and need user buy-in before shipping.

Mitigate: land foundation-tokens + shared-ui + status-colors retune together behind a single PR, then visually diff dashboard and at least one list surface before merging.

## Dependencies

- **Requires foundation-tokens** — warm cream, teal primary, chart palette.
- **Requires shared-ui** — EmptyState, SkeletonCard, SkeletonChart, optionally CardHeader plain variant.
- **Requires layout-shell** — no direct dep, but dashboard uses the new breadcrumb & notifications.
- **Blocks: dossier-list, dossier-detail, consultation, assignations** — all of these consume `status-colors.ts` helpers. A mid-flight retune would cause inconsistency; retune this area's helper before any downstream list/detail surface is touched.

## Exit criteria

- `npm run typecheck` passes.
- Realtime feed keeps updating (Firestore subscriptions not touched).
- Status selection → drawer → pie-moves-to-bottom flow works as before.
- Every card reads on warm cream without clashing status colors.
- No `bg-green-500`, `bg-orange-500`, `bg-blue-100`, `bg-violet-100` etc. remain in dashboard code (status-colors.ts is the only place these hues live).
- Every empty state uses `EmptyState`.
- Loading state uses new skeleton primitives.
- Status colors still clearly distinguish 9 families — no two reading as the same hue.
- Accent typos fixed (if user approves).
- `tabular-nums` applied to count badges, date columns, matricules.

## Open items to resolve during implementation

1. Drop `bg-heading-bg` chip on dashboard cards — y/n. Lean y.
2. Accent typo fixes — user approval needed for each or batch OK? Lean batch.
3. `rounded-xl` vs `rounded-lg` — lean `rounded-lg` (align with token).
4. Compagnie brand-color lock-in — skip for now (automatic rotation).
5. Should status-colors retune happen as its own commit within the dashboard PR, or in the foundation-tokens PR? Lean dashboard PR so visual changes are co-located.
6. Bump tiny `text-[9px]` → `text-[10px]`? Lean y.
