# REDESIGN: Assignations (Area 8 / 16)

Scope: two assignment work-queue surfaces that agents/chiffreurs live in daily. Structurally parallel to dossier-list but with deadline tracking + mission categories.

## Files in scope

- [src/app/(app)/assignations-atg/page.tsx](../src/app/(app)/assignations-atg/page.tsx) *(field-agent assignment list)*
- [src/app/(app)/assignations-atg/[dossierId]/page.tsx](../src/app/(app)/assignations-atg/[dossierId]/page.tsx) *(atg detail)*
- [src/app/(app)/assignations-chiffrage/page.tsx](../src/app/(app)/assignations-chiffrage/page.tsx) *(chiffreur list)*
- [src/app/(app)/assignations-chiffrage/[id]/page.tsx](../src/app/(app)/assignations-chiffrage/[id]/page.tsx) *(chiffrage detail)*

## Current state (audit)

### assignations-atg/page.tsx — field-agent work queue

- Data source: `collectionGroup('planifications')` — realtime list of every planif across all dossiers.
- Row shape: agent, type mission (Avant/En cours/Après), dateRDV, zone, adresse, observation.
- Mission-tab filter (Avant / En cours / Après) at the top.
- Deadline rules: 24h default, 48h for nature starting with "contradictoire" (per detail logic, similar pattern to chiffrage).
- Collapsible rows for photos per category.
- `active?: boolean` field toggles mission state.
- `usePersistedFilters('assignations-atg', ...)` — per-user filter memory.
- `DateRangeFilter` + `SortableHeader` + role-aware filtering (`useCurrentUser`).
- `agentTerrainStatuses` imported from `@/lib/dossiers-data` — separate status enum for atg flow.

Design issues inferred from first 100 lines + overall pattern:
- Will have hardcoded color gradients on deadline bars (see chiffrage for template).
- Likely uses `bg-muted/50` hover, which inherits warm palette — fine.
- Mission tabs (Avant/En cours/Après) likely styled via Tabs primitive — inherits teal.
- Empty states probably plain text.
- Role-based row visibility (agent sees own, Admin sees all).

### assignations-chiffrage/page.tsx — chiffreur work queue

**DeadlineBar component** ([assignations-chiffrage/page.tsx:62-100](../src/app/(app)/assignations-chiffrage/page.tsx#L62-L100)):
- Hardcoded progress gradient: `from-blue-500 to-cyan-400` → `from-cyan-400 to-green-400` → `from-green-400 to-orange-400` → `from-orange-400 to-red-500` → overdue `from-red-500 to-red-600`.
- Hardcoded text colors at each percent band: `text-blue-600 dark:text-blue-400`, `text-green-600`, `text-orange-600`, `text-red-600`.
- 24h / 48h label variant based on `nature.startsWith('contradictoire')`.
- Progress bar is functionally clear but 5 distinct colors is excessive — feels dashboard-flashy.
- The `blue → green → orange → red` semantics are actually backwards to normal urgency: green = "plenty of time", red = "running out". Works, but the starting blue + intermediate cyan feels random.

**Other chiffrage list observations**:
- Uses `getStatusBadgeStyles` from status-colors.ts ✅ (already tokenized).
- `useChiffreurWorkload` hook for per-chiffreur workload counts — data-layer, preserve.
- `computeFileCounts(files)` aggregates photos (avant/en_cours/apres) and docs by type.
- File counts likely displayed as inline badges per row.
- Collapsible row to show file breakdown.
- `photoCatLabels` map already in French.
- DateRangeFilter + SortableHeader + SelectContent shared controls.

### assignations-atg/[dossierId]/page.tsx — atg detail

Inferred from scan: document category dialog, photo preview, observations capture, specific per-mission view. Likely replicates some dossier-detail patterns. Not deeply read here — follows Pattern C (file/media) and Pattern A (form) from dossier-detail.

### assignations-chiffrage/[id]/page.tsx — chiffrage detail

Inferred from scan: async URL fetching, Storage realtime tracking, complex file download flow. Intersects with `chiffrage/[id]` area (area 9) — planned there. This detail file may duplicate logic.

## Concrete changes

### assignations-atg/page.tsx

- Retune any inline hardcoded color usage (likely DeadlineBar-equivalent if duplicated here). Consolidate: if both atg and chiffrage pages have their own `DeadlineBar`, extract to a shared component — one source of truth for deadline visualization.
- Mission tabs (Avant/En cours/Après): verify Tabs primitive inherits teal active state.
- Empty state per mission tab: `<EmptyState icon={<Calendar />} title="Aucune mission {nature}" description="Les nouvelles assignations apparaîtront ici." />`.
- Loading state: `SkeletonRow` × N.
- Row hover: `hover:bg-muted/50` — fine.
- Collapsible rows chevron rotation: verify inherits warm transition.
- Preserve `usePersistedFilters`, `useCurrentUser` role-gate, collectionGroup query.

### assignations-chiffrage/page.tsx

- **Extract and retune `DeadlineBar`** component:
  - Move to `src/components/deadline-bar.tsx` as a shared primitive (consumed by both atg and chiffrage lists).
  - Replace the 5-color gradient with a simpler semantic:
    - `0–50%`: teal (plenty of time) — `bg-primary` or `bg-emerald-500/70`.
    - `50–80%`: amber (attention) — `bg-amber-500`.
    - `80–100%`: red (urgent) — `bg-destructive`.
    - Overdue: solid destructive with optional subtle pulse.
  - Text color follows same semantic; drop dark-mode duplicate classes (inherit from foreground/muted-foreground).
  - Keep 24h/48h label, keep pending/expired states.
- Row hover: `hover:bg-muted/50` — fine.
- File count badges (`badges for photos avant/en_cours/apres + doc types`): use the retuned Badge variants once foundation-tokens + shared-ui + status-colors are in place. Small chips, low risk.
- Empty state: `<EmptyState icon={<Calculator />} title="Aucun chiffrage assigné" description="Les nouvelles assignations de chiffrage apparaîtront ici." />`.
- Loading state: `SkeletonRow` × N.
- Workload counts indicator (if rendered per chiffreur): retune to warm chips.
- `getStatusBadgeStyles` already used — inherits retune from dashboard phase.

### assignations-atg/[dossierId]/page.tsx (detail)

- Follows dossier-detail patterns A+C. Apply the same pattern-level changes:
  - Hardcoded color removal.
  - `confirm()` → AlertDialog.
  - EmptyState for empty lists.
  - Button loading prop.
  - Warm palette inheritance.
- Verify photo categories (avant/en_cours/apres) tabs render correctly.
- Verify observation input uses the new `Textarea` styling.
- Preserve photo upload pipeline (`uploadFileWithOfflineSupport` if used).

### assignations-chiffrage/[id]/page.tsx (detail)

- Overlap with chiffrage area — to be detailed in area 9. Here, just flag that chiffrage detail consumes Storage realtime downloads and the file-preview flow. Apply same pattern-level polish.

### Shared (both list pages)

- Page title h1: `text-3xl font-bold` → `text-4xl font-semibold tracking-tight` once Outfit loads (match dossier-list direction).
- Subtitle: one-line French description.
- Consider a compact workload summary header (e.g. "5 missions en cours, 2 en retard") above the table for at-a-glance context. Nice-to-have, defer unless user opts in.

## Constraints / no-go

- Do **not** touch `collectionGroup('planifications')` or the chiffrage collection queries — realtime contract.
- Do **not** change the deadline calculation logic (24h/48h, RDV+8am start). Business rule.
- Do **not** touch `useChiffreurWorkload` or any workload-count hook.
- Do **not** alter the `active?: boolean` flag flow for missions — ATG-specific state.
- Do **not** change `agentTerrainStatuses` enum or import path.
- Do **not** rename `usePersistedFilters` keys (`assignations-atg`, `assignations-chiffrage`) — that would wipe every user's saved filters.
- Do **not** remove the mission category split (avant/en_cours/apres) or change the routing.
- Do **not** break role-based visibility: Agents see own assignments, Admins see all. That's permission, not the compagnie-dropdown rule.
- Preserve French accents across "Avant" / "En cours" / "Après" — note "Après" has `è` and `missionToCategory` at atg line 49 normalizes "Apres" (accent-less) → "Après" on the way in. Preserve that normalization.

## Risk level

**Medium.** DeadlineBar retune changes every row's visual urgency signal. Done wrong, users misread urgency and miss deadlines. Semantic mapping (teal → amber → red) is safer than the current 5-color gradient but still a visible shift.

Low for: list chrome, empty state, skeleton, badge retune (auto from dashboard phase).

## Dependencies

- **Requires foundation-tokens, shared-ui** — primitives.
- **Requires dashboard** — status-colors.ts retune for any status pills rendered here.
- **Optional: extract `DeadlineBar` to shared component** — light refactor not visible to users, can land in the same PR.

## Exit criteria

- `npm run typecheck` passes.
- Realtime planifications + chiffrage lists keep updating.
- DeadlineBar consolidated into one shared component (or both pages updated consistently if decision is to keep two copies).
- No `from-blue-500`, `to-cyan-400`, `from-green-400`, etc. gradient classes left.
- No `text-blue-600`, `text-green-600`, `text-orange-600`, `text-red-600` hardcoded text colors in deadline readouts.
- Empty states use EmptyState primitive.
- Loading states use SkeletonRow.
- Mission tabs read with teal active state.
- Deadline percentages and overdue states still display correctly.

## Open items to resolve during implementation

1. **DeadlineBar consolidation** — extract shared vs duplicate per page. Lean extract (DRY + single source of visual truth).
2. **Workload summary header** — add to lists y/n. Lean defer.
3. **5-color → 3-color deadline gradient** — user approval. 3-color is cleaner and more accessible, but users may be used to the fine-grained gradient. Flag for review.
4. **`missionToCategory` normalization** — preserve exactly; don't "simplify" the `Apres → Après` fallback (old data may still have non-accented values).
