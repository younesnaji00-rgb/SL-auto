# REDESIGN: Dossier List (Area 6 / 16)

Scope: the main dossiers index (`/dossiers`), its skeleton, and the create-dossier dialog. Core list surface users live in.

## Files in scope

- [src/app/(app)/dossiers/page.tsx](../src/app/(app)/dossiers/page.tsx) *(thin wrapper)*
- [src/app/(app)/dossiers/client-page.tsx](../src/app/(app)/dossiers/client-page.tsx) *(main list component — 507 lines)*
- [src/app/(app)/dossiers/loading.tsx](../src/app/(app)/dossiers/loading.tsx)
- [src/components/dossiers/create-dossier-dialog.tsx](../src/components/dossiers/create-dossier-dialog.tsx)
- *(sheets reviewed briefly but belong to modals plan: `assignment-history-sheet.tsx`, `status-history-sheet.tsx`, `workflow-status-sheet.tsx`)*

## Current state (audit)

### ⚠️ Memory-rule violation — compagnie filter dropdown is scoped
[client-page.tsx:65-69](../src/app/(app)/dossiers/client-page.tsx#L65-L69):
```ts
const compagnies = useMemo(() => {
  if (userCompagnies.length === 0) return allCompagnies;
  const allowed = userCompagnies.map(c => c.toLowerCase().trim());
  return allCompagnies.filter(c => allowed.includes(c.label.toLowerCase().trim()));
}, [allCompagnies, userCompagnies]);
```

Memory rule (`feedback_compagnie_scoping.md`): **"never scope compagnie dropdowns by user; full list for everyone, every role."**

This code explicitly filters the compagnie FILTER dropdown by the user's assigned compagnies — direct rule violation. The `useDossiers(userCompagnies)` call on the next line is separate (data scoping, not dropdown scoping) and is acceptable.

**Action**: raise this as a fix-before-redesign question to the user. If memory still stands, swap `compagnies` → `allCompagnies` for the filter select. Flag for confirmation since memory claims are point-in-time and could have been reversed.

### Hardcoded blue everywhere
- Line 377: `text-blue-600 dark:text-blue-400` on refExpert link.
- Line 419: `text-blue-600 dark:text-blue-400` on Eye action icon.
- Line 430: same on Users icon.
- Line 441: same on History icon.

Four hardcoded blues that bypass the token system and will clash with the teal primary palette.

### Destructive `window.confirm()`
[client-page.tsx:177](../src/app/(app)/dossiers/client-page.tsx#L177):
```ts
if (!window.confirm('SUPPRIMER CE DOSSIER DÉFINITIVEMENT ?\n...')) return;
```

Browser-native confirm, all-caps shouting copy, and a `\n` literal. Violates the redesign skill rule "no `window.alert()`" (and `confirm()` belongs to the same family). Must become `AlertDialog`.

### Filter chip removal buttons
Lines 239, 256, 274 — each active filter shows a `-top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive` X button floating on top of the Select. Visually noisy — three red bubbles floating at once. Cleaner pattern: a single "Filtres actifs" chip row above the table showing active filters as removable badges, rather than bubbles on the selects themselves.

### Loading states
- [client-page.tsx:355](../src/app/(app)/dossiers/client-page.tsx#L355): `<TableRow>...Chargement des dossiers...</TableRow>` plain text.
- [loading.tsx](../src/app/(app)/dossiers/loading.tsx): dedicated `/dossiers/loading.tsx` route-level loader with manual Skeleton composition. `border rounded-xl bg-card` — inconsistent with Card primitive's `rounded-lg`.

### Empty state
[client-page.tsx:357](../src/app/(app)/dossiers/client-page.tsx#L357): `"Aucun dossier trouvé."` plain italic colspan row. Should use EmptyState inside TableCell.

### Delete button loading spinner
Inline `<Loader2 className="h-4 w-4 animate-spin" />` at [client-page.tsx:455-459](../src/app/(app)/dossiers/client-page.tsx#L455-L459). Should use Button loading prop once available.

### Action icons not tokenized
Lines 419, 430, 441 use `text-blue-600` for Eye/Users/History. They should either inherit the default ghost-button foreground or use `text-primary` for teal affinity.

### Status cell "il y a X" timestamp
Lines 394-398 display `formatDistanceToNow(lastStatusChange.at, { locale: fr })` below the badge when the displayed status matches the last change. Nice detail — preserve.

### Bottom pagination
Lines 472-483: rows-per-page select + "Total: {N} dossiers" counter. Minimal, fine. No actual paging — just `.slice(0, rowsPerPage)`. Preserve but note: this isn't true pagination, it's a view cap. Not a redesign concern, but worth noting.

### page.tsx wrapper
[page.tsx:9](../src/app/(app)/dossiers/page.tsx#L9): `text-3xl font-bold tracking-tight` on h1. Will render as Outfit display — likely look great. Keep `tracking-tight` for large display text (per redesign skill typography guide).

### create-dossier-dialog.tsx
- Radix Select empty-value workaround (`NONE_VALUE = '__none__'`) — keep, correctly documented.
- Dialog `sm:max-w-md` — standard small dialog.
- Labels: Référence expert, Compagnie, Nature du dossier, Nom de l'assuré, Matricule véhicule. French correct.
- Placeholders: "Ex: SL-2026-001", "Ex: 12345-A-6" — realistic, good.
- No `autoFocus` on refExpert first field — should add.
- "Tous les champs sont facultatifs" description — good.
- Inline Loader2 on confirm button [line 239](../src/components/dossiers/create-dossier-dialog.tsx#L239). Replace with Button loading prop.
- Compagnie dropdown here uses unfiltered `dbCompagnies` — **correct per memory rule**. The contrast with client-page.tsx filtering is telling: the modal was built correctly, the filter was retrofitted incorrectly.
- Error handling via toast destructive variant — correct, no change.

## Concrete changes

### [page.tsx](../src/app/(app)/dossiers/page.tsx)
- No structural changes.
- Subtitle `"Gérer et suivre tous les dossiers de sinistres"` — correct French, keep.
- Consider adding a right-aligned action area in the header (e.g., "Nouveau dossier" CTA) rather than inside `client-page`, but defer — current layout works and keeps the page wrapper simple.

### [client-page.tsx](../src/app/(app)/dossiers/client-page.tsx)

**1. Fix memory-rule violation (compagnie filter scoping)**
- Replace filter dropdown source: use `allCompagnies` instead of `compagnies` in the filter Select at [client-page.tsx:271](../src/app/(app)/dossiers/client-page.tsx#L271).
- Keep `useDossiers(userCompagnies...)` data-scoping as-is.
- Requires user confirmation since it's behavioral, not visual. Top-of-list for implementation review.

**2. Remove hardcoded blues**
- Line 377 refExpert link: `text-blue-600 dark:text-blue-400` → `text-primary hover:underline` (teal).
- Lines 419, 430, 441 action icons: remove color, let ghost button foreground handle it. Or apply `text-primary` if we want to emphasize them — lean `text-muted-foreground group-hover:text-foreground` so they only light up on row hover.

**3. Replace `window.confirm()` with AlertDialog**
- Wrap the delete IconButton with an `AlertDialog`. Title: `"Supprimer ce dossier ?"`. Description: `"Cette action supprime définitivement le dossier ainsi que tous les documents, photos et l'historique associés. Elle est irréversible."`. Confirm button: destructive variant with copy `"Supprimer"`. Cancel: `"Annuler"`.
- Remove the `\nCette action supprimera...` text and all-caps shouting from the existing confirm.
- Preserve the `logWorkflow` + `deleteDossier` side effects on confirmation.

**4. Filter chip UX rework**
- Remove the three floating red X bubbles on individual Selects.
- Below the filters row, add a conditional "active filters" strip that shows each active filter as a removable Badge (outline variant, X icon, click = clear that filter). Example: `Nature: Accident × | Statut: Nouveau × | Compagnie: RMA ×`.
- Include a `"Tout réinitialiser"` button at the right of that strip when multiple filters are active.
- Hide the strip entirely when no filters are active.

**5. Loading state**
- Replace [client-page.tsx:355](../src/app/(app)/dossiers/client-page.tsx#L355) with multiple `<SkeletonRow />` placeholders inside the TableBody (e.g., 10 rows) — keeps the table chrome stable during load rather than showing text in a single row.
- Or lean harder on `loading.tsx` route-level skeleton and keep client-page loading branch minimal (returns null or same skeleton).

**6. Empty state**
- Replace [client-page.tsx:357](../src/app/(app)/dossiers/client-page.tsx#L357) with:
  ```tsx
  <TableRow>
    <TableCell colSpan={9} className="p-0">
      <EmptyState
        icon={<FolderOpen />}
        title="Aucun dossier trouvé"
        description={filtersActive ? "Essayez d'ajuster les filtres ou créez un nouveau dossier." : "Créez votre premier dossier pour commencer."}
        action={canEditDossiers ? <Button onClick={handleOpenCreate}><Plus className="mr-2 h-4 w-4"/>Nouveau dossier</Button> : null}
      />
    </TableCell>
  </TableRow>
  ```
- Compute `filtersActive` from current filter state.

**7. Delete button spinner**
- Use `<Button loading={deletingId === d.id} variant="ghost" size="icon">...</Button>` once Button loading prop is available.

**8. Card + Table chrome**
- [client-page.tsx:325](../src/app/(app)/dossiers/client-page.tsx#L325) `<Card className="overflow-hidden border rounded-lg">` — fine, matches token. No change.
- Table header row `bg-muted/50` → inherits warm palette.

**9. Row styles**
- Hover: `hover:bg-muted/50` — fine on warm cream.
- Export mode row highlight: `bg-primary/5` → teal-tinted cream. Fine.

**10. Refinements**
- Add `tabular-nums` to matricule, dates, and the total counter.
- `font-mono text-sm font-bold` on refExpert → keep mono, drop `font-bold` for `font-semibold` (Outfit).
- Status badge uses `getStatusBadgeStyles` which will be retuned in dashboard phase — no change needed here beyond inheriting.

**11. Page title / heading**
- h1 in [page.tsx:9](../src/app/(app)/dossiers/page.tsx#L9) is `text-3xl font-bold`. Once Outfit loads, consider: `text-4xl font-semibold tracking-tight` — feels more intentional. Defer to visual review.

### [loading.tsx](../src/app/(app)/dossiers/loading.tsx)
- Replace with composition of shared-ui skeleton primitives:
  - Page header: `<Skeleton className="h-8 w-40" />` + action skeleton.
  - Filter row: 4 filter-width skeletons.
  - Table: header + 10 `<SkeletonRow />` children.
- Change `rounded-xl` to `rounded-lg` for consistency with token.
- Match actual table column count (9 including Actions in view mode).

### [create-dossier-dialog.tsx](../src/components/dossiers/create-dossier-dialog.tsx)
- Add `autoFocus` to refExpert Input.
- Use Button loading prop on the Créer button.
- No structural changes; dialog chrome already clean.
- Once Dialog backdrop is retuned in shared-ui, this dialog inherits.
- Compagnie dropdown already uses unrestricted `dbCompagnies` — correct, don't change.

## Constraints / no-go

- Do **not** touch `useDossiers()` data-scoping by `userCompagnies` — that's data filtering, separate from dropdown scoping, and is correct.
- Do **not** touch the `logWorkflow` / `deleteDossier` side effect order on delete. The workflow log must happen before the delete so the dossier ref still exists.
- Do **not** touch the export-to-Excel pipeline (`exportToExcel`, `EXPORT_COLUMNS`). The selected-columns × selected-rows filtering logic is intentional.
- Do **not** change `usePersistedFilters('dossiers', filterDefaults)` contract — it's shared with other list surfaces.
- Do **not** change `useOptions` hook usage — it reads from Firestore with a fallback to `defaultCompagnies`/`defaultNatures`/`defaultStatuses`. Preserve the fallback shape.
- Do **not** change the Radix Select `NONE_VALUE = '__none__'` workaround in create-dialog.
- Preserve all French copy verbatim except:
  - Delete confirmation text becomes AlertDialog (rewrite non-shouting).

## Risk level

**High** (structural, data-path-adjacent):
- Compagnie filter scoping fix: behavioral change, user-visible. Needs explicit user confirmation.
- Delete `confirm()` → AlertDialog: standard swap but destructive action — must be tested end-to-end.

**Medium:**
- Active filters strip — new UI component, needs design approval.

**Low:**
- Color swaps, empty state, skeleton cleanup.

## Dependencies

- **Requires foundation-tokens** — warm palette, teal primary.
- **Requires shared-ui** — EmptyState, SkeletonRow, Button loading prop, AlertDialog.
- **Requires dashboard** — status-colors.ts retune lands with dashboard; this area inherits the new status pill colors automatically.
- **Does not block** any downstream area — dossier-detail is separate.

## Exit criteria

- `npm run typecheck` passes.
- Compagnie filter dropdown shows all compagnies regardless of user role (unless user confirms the scoping is intentional).
- No `text-blue-*` / `bg-blue-*` classes in client-page.
- Delete action flows through AlertDialog, preserves the workflow log + deletion order.
- Empty state renders with icon, description, and conditional "Nouveau dossier" action.
- Filter active strip renders with removable badges (or decision made to defer).
- Loading state renders proper skeleton rows.
- Status badge colors still distinguish states post-retune.
- Create-dossier dialog autofocuses refExpert, uses Button loading.

## Open items to resolve during implementation

1. **Compagnie filter scoping** — confirm memory rule still applies; if so, unscope. **User decision required.**
2. **Filter active chips strip** — implement now or defer? Lean implement (cleaner than three floating X bubbles).
3. **True pagination vs row-slice cap** — current implementation slices the full list. Not a redesign concern, but note for future.
4. **Page heading typography** — bump to `text-4xl font-semibold tracking-tight`? Lean yes, defer to visual review.
5. **Action icons color** — `text-primary` (always teal) vs `text-muted-foreground group-hover:text-foreground` (subtle). Lean the latter.
