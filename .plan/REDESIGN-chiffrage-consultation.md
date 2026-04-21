# REDESIGN: Chiffrage + Consultation (Area 9 / 16)

Scope: single-chiffrage detail view (`/chiffrage/[id]`) and the read-only consultation list (`/consultation`). Two unrelated surfaces sharing an area slot because they're both smaller than dossier-list and benefit from the same pattern-level treatment.

## Files in scope

- [src/app/(app)/chiffrage/[id]/page.tsx](../src/app/(app)/chiffrage/[id]/page.tsx)
- [src/app/(app)/consultation/page.tsx](../src/app/(app)/consultation/page.tsx)
- [src/app/(app)/consultation/client-page.tsx](../src/app/(app)/consultation/client-page.tsx)

## Current state (audit)

### Chiffrage detail — `/chiffrage/[id]`

[chiffrage/[id]/page.tsx](../src/app/(app)/chiffrage/[id]/page.tsx) is a chiffreur-facing detail view.

- Data: `onSnapshot(doc(db, 'chiffrages', id))` — single-doc realtime.
- Storage: per-file `getDownloadURL` fetched imperatively, deduped via `fetchedPathsRef`, cached by index in `downloadUrls` state.
- File shape: `{ name, storagePath, type: 'photo' | 'rapport', status: 'pending' | 'processing' | 'done' | 'error', annotations, pdfUrl }`.
- Status progression drives per-file UI (likely icons + colored labels for the 4 states).
- Redirect pattern: if the chiffrage doc vanishes after initial load → toast + `router.push('/dashboard')`. Preserve.
- Has a handmade loading skeleton at [chiffrage/[id]/page.tsx:94-119](../src/app/(app)/chiffrage/[id]/page.tsx#L94-L119) — custom flex layout with `animate-pulse bg-muted` divs, `rounded-xl` card shells, `rounded-lg` thumbnails. Inconsistent radii.
- Imports: `PencilLine`, `Eye`, `FileType` — likely used for per-file actions (annotate / preview / type indicator).

**Design issues** (inferred from top of file; full body not deeply read — apply pattern-level plan):
- Loading skeleton is hand-rolled; should compose shared-ui primitives.
- File status styling likely uses hardcoded `bg-yellow-*` / `bg-red-*` / `bg-green-*`.
- Action icons probably `text-blue-600` (consistent with app pattern).
- `rounded-xl` vs. `rounded-lg` — pick one (lean `rounded-lg` to match token).

### Consultation — `/consultation`

[consultation/page.tsx](../src/app/(app)/consultation/page.tsx) is a thin wrapper around [client-page.tsx](../src/app/(app)/consultation/client-page.tsx). Subtitle: `"Consulter tous les dossiers de sinistres (lecture seule)"`.

**Key structural observation**: [consultation/client-page.tsx:29](../src/app/(app)/consultation/client-page.tsx#L29) has explicit comment `// Fetch ALL dossiers — no company restriction` and uses `useDossiers()` with no argument → fetches unrestricted.

- **Compagnie filter dropdown** at [line 137](../src/app/(app)/consultation/client-page.tsx#L137) uses `compagnies` variable which at [line 25](../src/app/(app)/consultation/client-page.tsx#L25) is unfiltered `dbCompagnies`. **Correct per memory rule.** Unlike dossier-list's violation, consultation is compliant.
- The role-based permission gate elsewhere (e.g. sidebar) allows this route for all users (`roles: null` on sidebar nav item).
- Filter chip X bubbles ([lines 111, 126, 141](../src/app/(app)/consultation/client-page.tsx#L111)): same three floating red bubbles as dossier-list. Same UX issue.
- Uses `getStatusBadgeStyles` + `getStatusDotColor` (inherits dashboard retune).
- `usePersistedFilters('consultation', ...)` — independent persisted state from dossiers.
- Table below is likely a near-duplicate of dossier-list's table but without action column (read-only).
- No action column → no delete/edit → no `confirm()` calls likely here.
- Suspected hardcoded blue on `refExpert` mono link (consistent with dossier-list).
- Same row-slice pagination (no real pagination).

### Duplication between dossier-list and consultation

Both client-pages are near-copies of the filter+table pattern. Worth considering extracting a shared `DossiersTable` component, but that's a larger refactor — **flag for open discussion, don't auto-extract during redesign.** Redesign stays visual-polish scope.

## Concrete changes

### [chiffrage/[id]/page.tsx](../src/app/(app)/chiffrage/[id]/page.tsx)

- **Loading skeleton**: replace hand-rolled layout with composition of shared-ui primitives — `SkeletonCard` × 3 + header skeleton. Use `rounded-lg` consistently.
- **File card (body not fully read but inferred)**: each file row likely renders:
  - Thumbnail (photo) or document icon
  - Filename + metadata
  - Status label ("pending" / "processing" / "done" / "error")
  - Action buttons (Annotate / Preview / Download)
- Retune per-file status label colors to semantic palette:
  - `pending` → muted / amber chip.
  - `processing` → teal (primary) with subtle pulse.
  - `done` → emerald muted.
  - `error` → destructive.
- Action buttons: replace any `text-blue-600` with default ghost variant or `text-primary`.
- **Empty state** (if chiffrage has zero files): `<EmptyState icon={<FileType />} title="Aucun fichier" description="Aucun fichier n'a encore été associé à ce chiffrage." />`.
- Top header: back button + title (likely `Chiffrage: {dossierNom}`) — ensure consistent typography (`text-xl font-semibold tracking-tight`).
- Preserve imperative Storage URL fetching pattern exactly. Preserve `fetchedPathsRef` dedup.
- Preserve redirect-to-dashboard on doc vanish.

### [consultation/page.tsx](../src/app/(app)/consultation/page.tsx)
- h1 typography: `text-3xl font-bold tracking-tight` → `text-4xl font-semibold tracking-tight` (match dossier-list direction).
- Subtitle French preserved verbatim.

### [consultation/client-page.tsx](../src/app/(app)/consultation/client-page.tsx)

Apply the same set of changes the dossier-list plan proposes (minus the memory-rule fix, which doesn't apply here):

- **Remove hardcoded `text-blue-600` on refExpert link** (assumed similar to dossier-list at line 377).
- **Filter chip UX**: replace the three floating red X bubbles with a consolidated "active filters" badge row above or below the filters row (same pattern as dossier-list plan — share the component).
- **Empty state**: `<EmptyState icon={<FolderOpen />} title="Aucun dossier trouvé" description={filtersActive ? "Essayez d'ajuster les filtres." : "Aucun dossier dans le système."} />`.
- **Loading state**: `SkeletonRow` × N inside TableBody.
- **Table chrome**: `Card overflow-hidden border rounded-lg` — fine, already matches.
- **`tabular-nums`** on date/matricule/counter cells.
- **Accent typo check** in French strings (if any missing) — flag during implementation.

## Constraints / no-go

- Do **not** touch the `onSnapshot` listener, `getDownloadURL` pattern, or `fetchedPathsRef` dedup in chiffrage detail — all load-bearing for Storage consistency.
- Do **not** change the file status enum values or the order in which statuses transition.
- Do **not** change the redirect-to-dashboard behavior when chiffrage doc vanishes.
- Do **not** touch `useDossiers()` unrestricted fetch in consultation.
- Do **not** change `usePersistedFilters('consultation', ...)` key — wipes saved filters.
- Do **not** turn consultation into an editable view — it's explicitly "lecture seule" (read-only) per subtitle.
- Do **not** extract `DossiersTable` shared component during redesign — larger refactor, separate discussion.
- Preserve French copy verbatim.

## Risk level

**Low-medium.** Consultation is read-only — nothing destructive to break. Chiffrage detail has imperative Storage URL fetching which is fragile; redesign limits to styling only, no Storage path changes.

## Dependencies

- **Requires foundation-tokens, shared-ui** — primitives.
- **Requires dashboard** — status-colors.ts retune for consultation's status badges + dots.
- **No blocks.**

## Exit criteria

- `npm run typecheck` passes.
- Chiffrage detail: loading skeleton composes shared-ui primitives; file cards read with warm palette; file status labels follow semantic tokens (no hardcoded yellow/green/red).
- Consultation: no `text-blue-*` on refExpert link; filter chip UX matches dossier-list's new pattern; empty state uses EmptyState; `useDossiers()` call remains unrestricted.
- Both surfaces inherit warm cream + teal palette without regressions.

## Open items to resolve during implementation

1. **Consolidate `DossiersTable` across dossier-list and consultation** — do or defer? Lean defer (redesign scope).
2. **Chiffrage file status pulse/animation** — add subtle motion on `processing` status? Lean yes, small touch.
3. **"Active filters" component** — factor once, consume in dossier-list + consultation + possibly assignations. Lean yes.
