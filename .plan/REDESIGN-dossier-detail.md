# REDESIGN: Dossier Detail (Area 7 / 16) — the big one

Scope: the core workflow surface at `/dossiers/[id]/*`. 17 tab files + 5 modals + page shell + loading + log helpers. High user dwell time, heavy Firestore realtime, PDF pipeline integration. **Plan at the pattern level**, not per-tab — implementation will handle each tab file, but the pattern-level changes cover them all consistently.

## Files in scope

**Shell**:
- [src/app/(app)/dossiers/[id]/page.tsx](../src/app/(app)/dossiers/[id]/page.tsx) *(247 lines — top header, observations, action bar, Timeline, 4 modals + historique sheet)*
- [src/app/(app)/dossiers/[id]/loading.tsx](../src/app/(app)/dossiers/[id]/loading.tsx)

**Tab files** (17 total — grouped by pattern below):
- Pattern A (form tabs): `assure-tab.tsx`, `vehicule-tab.tsx`, `requete-tab.tsx`, `information-tab.tsx`, `intermediaire-tab.tsx`, `partie-adverse-tab.tsx`, `dossier-tab.tsx`, `facturation-tab.tsx`
- Pattern B (editable-list tabs): `missions-tab.tsx`, `reclamations-tab.tsx`, `chiffrage-tab.tsx`, `rapport-tab.tsx`, `commentaires-tab.tsx`
- Pattern C (file/media tabs): `documents-tab.tsx`, `photos-tab.tsx`
- Pattern D (timeline-view tabs): `historique-tab.tsx`, `planification-tab.tsx`

**Modals** (covered at pattern level here, detailed plan in `modals` area):
- `modal-planification.tsx`, `modal-chiffrage.tsx`, `modal-reclamation.tsx`, `modal-decision-status.tsx`, `modal-telecharger.tsx`, `modal-planification-history.tsx`

**Logging helpers** (not visual, but preserve behavior):
- `log-historique.ts`, `log-observation.ts`

## Current state (audit)

### Shell — [page.tsx](../src/app/(app)/dossiers/[id]/page.tsx)

**Top header** ([page.tsx:128-150](../src/app/(app)/dossiers/[id]/page.tsx#L128-L150))
- Back button (ghost icon) + h1 `"Dossier : {refExpert}"` with `text-primary` on ref + assuré/compagnie/matricule line + status pill on right.
- Layout is clean, no chip band. Good baseline.

**Status pill color map** at [page.tsx:49-54](../src/app/(app)/dossiers/[id]/page.tsx#L49-L54) — a **third independent copy** of status→color mapping (after dashboard and status-colors.ts). Only covers 4 statuses: Nouveau (blue), En cours (amber), Cloture (green), Annule (red). All use hardcoded Tailwind palette. Should consolidate onto `getStatusBadgeStyles` from status-colors.ts.

**Observations collapsible** ([page.tsx:153-168](../src/app/(app)/dossiers/[id]/page.tsx#L153-L168)) — simple button + ChevronDown rotation. No count badge. `<MessageSquare />` icon. Functional but lacks affordance for "unread/new" observations.

**Action bar** ([page.tsx:171-200](../src/app/(app)/dossiers/[id]/page.tsx#L171-L200))
Sticky bar with buttons:
- `Envoyer vers chiffrage` — outline variant ✅
- `Exporter PDF` — outline variant with inline Loader2 spinner on loading (not Button loading prop) ❌
- `Réclamation` — outline but **hardcoded `border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700`** ❌
- `Historique` — outline ✅
- `Décision de statut` — default variant with **hardcoded `bg-blue-600 hover:bg-blue-700`** ❌

Sticky positioning: `sticky top-0 z-40`. Depends on parent overflow not being `overflow-hidden`. Currently inside `flex flex-col min-h-screen` which should work — but the `(app)/layout.tsx` main wraps in `overflow-y-auto`, so the sticky pins to the main scroll area. Verify still works.

**Timeline stepper** ([page.tsx:202-218](../src/app/(app)/dossiers/[id]/page.tsx#L202-L218))
- 6-step Timeline component from `@/components/dossier-timeline`.
- Steps: Import, Information, Planification, Pieces, Chiffrage, Rapport.
- Active step persisted via `useLastStep(id)` hook.
- Each step renders its own sub-content, which may include the tab files.
- **Timeline internals belong to domain-components plan** — just ensure the stepper visuals match the warm + teal palette when that plan lands.

**Loading state** ([page.tsx:97-105](../src/app/(app)/dossiers/[id]/page.tsx#L97-L105)) — three Skeleton strips. Minimal, doesn't match actual structure (no header/observations/action bar/timeline shapes).

**Not-found state** ([page.tsx:107-122](../src/app/(app)/dossiers/[id]/page.tsx#L107-L122)) — custom AlertCircle + heading + description + back button. Should use `ErrorState` primitive.

### Pattern A — Form tabs (assure, vehicule, requete, information, intermediaire, partie-adverse, dossier, facturation)

Consistent shape:
```
<Card>
  <CardHeader><CardTitle>{section}</CardTitle></CardHeader>
  <CardContent>
    <grid 1-2-3 cols>
      <Label + Input>... repeated
    </grid>
    <Button onClick={handleSave}>
      <Save /> Sauvegarder
    </Button>
  </CardContent>
</Card>
```

Example: [assure-tab.tsx](../src/app/(app)/dossiers/[id]/assure-tab.tsx) — 78 lines, 6 fields (nom, prenom, telephone, email, adresse, CIN), grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, Sauvegarder button with inline `{isSaving ? 'Enregistrement...' : 'Sauvegarder'}` text swap.

Issues across Pattern A:
- `bg-heading-bg` chip inherited from Card default — consistent with rest of app; review whether to drop after foundation-tokens.
- Inline save-spinner pattern (text swap). Replace with Button loading prop.
- No `aria-invalid` hook on inputs for validation errors (where zod is used).
- No dirty-state indication — user can't tell if unsaved changes exist.
- `handleSave` writes directly to Firestore without toast-chain or optimistic UI. Fine for now.

### Pattern B — Editable-list tabs (missions, reclamations, chiffrage, rapport, commentaires)

Consistent shape:
```
<Card>
  <CardHeader flex justify-between>
    <CardTitle />
    <Button variant="outline"><Plus /> Nouvel X</Button>
  </CardHeader>
  <Table>
    <TableHeader />
    <TableBody>
      {items.length === 0 ? <empty row> : items.map(...)}
    </TableBody>
  </Table>
</Card>
```

Example [missions-tab.tsx:33-37](../src/app/(app)/dossiers/[id]/missions-tab.tsx#L33-L37):
```ts
const handleDelete = async (id: string) => {
  if (!confirm('Supprimer cette mission ?')) return;
  ...
};
```

Issues across Pattern B:
- **`confirm()` used for every row-level delete** — same violation as elsewhere. Must become AlertDialog.
- Empty row is plain text colspan — should use EmptyState.
- Inline editable cells use bare Input/Select/DatePicker without save feedback — writes on blur/change via updateDoc. Fine, preserve.
- Loading state is full-height Skeleton rectangle — should use SkeletonRow × N inside the table body.
- Status Select inside cells sometimes uses hardcoded enum values (Expertise/Suivi/Prélèvement in missions). Fine, preserve.

### Pattern C — File/media tabs (documents, photos)

[documents-tab.tsx](../src/app/(app)/dossiers/[id]/documents-tab.tsx) audit (partial read):
- Upload button + file input ref.
- Firestore + Storage reads with `useCollection` + `useStorage`.
- `uploadFileWithOfflineSupport` — offline-queue upload pattern. Preserve verbatim.
- Dialog for document type selection on upload.
- Filter/search for existing docs.
- `logHistorique` / `logWorkflow` side effects.

Photos-tab follows similar pattern but with grid thumbnails + camera capture.

Issues:
- Likely has the same hardcoded blue action-icon tints and `confirm()` delete.
- Upload button probably uses inline spinner.
- Empty state handling likely plain text.
- Document type selector uses `OptionsManagerModal` — belongs to modals plan.

### Pattern D — Timeline-view tabs (historique, planification)

Read-heavy timeline views — vertical list with dots + dates + user attribution. Similar to the dashboard Changements panel pattern.

Issues:
- Probably hardcoded success/warning dot colors.
- Empty state plain text.
- Date formatting consistent with `formatDate(date-fns/fr)` pattern.

### Modals (pattern overview — full detail in modals plan)

`modal-planification.tsx`, `modal-chiffrage.tsx`, `modal-reclamation.tsx`, `modal-decision-status.tsx`, `modal-telecharger.tsx`, `modal-planification-history.tsx`.

Common shape: Dialog + DialogHeader + DialogTitle + form body + DialogFooter with Annuler/Confirmer buttons.

Issues likely across modals:
- Inline Loader2 on confirm (replace with Button loading).
- Hardcoded success/destructive colors.
- Backdrop defaults to pure black (foundation-tokens fixes this).
- Form validation feedback minimal.

### Logging helpers (preserve verbatim — no visual work)

- [log-historique.ts](../src/app/(app)/dossiers/[id]/log-historique.ts): `logHistorique(db, dossierId, action, user, details, type)` — writes to `dossiers/{id}/historique` subcollection.
- `logWorkflow(db, dossierId, action, userEmail, userId, status, extras)` — writes to `dossiers/{id}/workflow` subcollection (consumed by dashboard's collectionGroup query).
- [log-observation.ts](../src/app/(app)/dossiers/[id]/log-observation.ts): similar shape for observations.

**These are load-bearing for Firestore writes. Do not touch.**

## Concrete changes

### [page.tsx](../src/app/(app)/dossiers/[id]/page.tsx)

**1. Kill the local STATUS_COLORS map**
- Delete lines 49-54 entirely.
- Replace usage at [page.tsx:124](../src/app/(app)/dossiers/[id]/page.tsx#L124) with:
  ```ts
  import { getStatusBadgeStyles } from '@/lib/status-colors';
  const statutColor = getStatusBadgeStyles(dossier.statut || 'Nouveau');
  ```
- Status pill at [page.tsx:146](../src/app/(app)/dossiers/[id]/page.tsx#L146) stays the same shape but inherits the retuned color families from status-colors.ts.

**2. Remove hardcoded blues/reds on action bar**
- Réclamation button ([page.tsx:189](../src/app/(app)/dossiers/[id]/page.tsx#L189)): remove `border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700`. Replace with `variant="outline" className="text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/30"`.
- Décision de statut button ([page.tsx:196](../src/app/(app)/dossiers/[id]/page.tsx#L196)): remove `bg-blue-600 hover:bg-blue-700`. Use default variant (teal after foundation-tokens).
- Exporter PDF button ([page.tsx:187](../src/app/(app)/dossiers/[id]/page.tsx#L187)): replace inline Loader2 with Button loading prop. Keep the try/catch/toast flow.

**3. Observations collapsible — add affordance**
- Add a count badge next to the "Observations" label when `observationsCount > 0`. Requires reading the observations subcollection count — could use `useCollection` with `.length`.
- Consider: collapsed by default if no observations, expanded if any. Preserve existing toggle.
- Chevron rotation stays.

**4. Not-found state**
- Replace [page.tsx:107-122](../src/app/(app)/dossiers/[id]/page.tsx#L107-L122) with:
  ```tsx
  <ErrorState
    icon={<AlertCircle />}
    title="Dossier introuvable"
    description="Le dossier que vous recherchez n'existe pas ou a été supprimé."
    action={<Link href="/dossiers"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Retour à la liste</Button></Link>}
  />
  ```

**5. Loading state**
- Replace [page.tsx:97-105](../src/app/(app)/dossiers/[id]/page.tsx#L97-L105) with a skeleton that mirrors real structure:
  - Header row skeleton (ref + meta + status pill).
  - Observations bar skeleton.
  - Action bar skeleton (5 button widths).
  - Timeline skeleton (6 step circles + active content area).
- Or move this logic to [loading.tsx](../src/app/(app)/dossiers/[id]/loading.tsx) and have page.tsx return null while `loading`.

**6. Sticky action bar verify**
- Verify `sticky top-0 z-40` still works given the `(app)/layout.tsx` main uses `overflow-y-auto`. If pinned to wrong container, elevate to `top-14` (below fixed header) with correct offset.

**7. Typography on top header**
- h1 at [page.tsx:138](../src/app/(app)/dossiers/[id]/page.tsx#L138): `text-lg font-bold` — Outfit version should read `text-xl font-semibold tracking-tight` for confident display.
- Subtitle `text-xs text-muted-foreground`: fine, keep.
- Ref mono typography: none currently — consider adding `font-mono` to the `{dossier.refExpert}` span since it's an ID, not prose.

### Pattern A — Form tabs (8 files)

Apply the same set of changes consistently across `assure-tab.tsx`, `vehicule-tab.tsx`, `requete-tab.tsx`, `information-tab.tsx`, `intermediaire-tab.tsx`, `partie-adverse-tab.tsx`, `dossier-tab.tsx`, `facturation-tab.tsx`:

- Save button: replace inline text swap with `<Button loading={isSaving}>Sauvegarder</Button>`.
- Add `aria-invalid` hook to Inputs where validation is applied (noted per-tab during implementation).
- Add "dirty" indicator near the Save button: enable only when values differ from initial; disable + grey out when clean. Small UX upgrade, no data shape change.
- Loading skeleton: hand-rolled Skeletons inside each tab → use `SkeletonCard` with field shapes.
- Empty/not-initialized data: if the tab loads with empty values, show a subtle "Renseigner les informations de [section]" helper text at the top, or leave inputs with placeholders.
- Verify all labels read well after Outfit loads — no truncation changes (Outfit is slightly wider than Inter).

### Pattern B — Editable-list tabs (5 files)

Across `missions-tab.tsx`, `reclamations-tab.tsx`, `chiffrage-tab.tsx`, `rapport-tab.tsx`, `commentaires-tab.tsx`:

- Replace every `confirm('Supprimer cette X ?')` with AlertDialog (one dialog per delete action, not shared). Keep copy specific: "Supprimer cette mission ?", "Supprimer cette réclamation ?", etc.
- Empty state row: replace plain text colspan with `EmptyState` rendered inside `TableCell colSpan={N}`. Copy per tab:
  - Missions: "Aucune mission enregistrée" / "Créez une mission pour commencer."
  - Réclamations: "Aucune réclamation" / "Les réclamations apparaîtront ici."
  - Chiffrages: "Aucun chiffrage" / "Ajoutez un chiffrage pour démarrer."
  - Rapports: "Aucun rapport" / "Rédigez un rapport pour clôturer le dossier."
  - Commentaires: "Aucun commentaire" / "Ajoutez une observation pour démarrer la discussion."
- Loading state: replace full-card Skeleton with `<SkeletonRow />` × 5 inside the table body.
- Inline editable cells: verify palette — Select/Input/DatePicker all inherit teal palette.
- Plus button in header: inherits default variant, will teal.
- Delete trash icon button: keep `variant="ghost" size="icon" text-destructive` pattern.

### Pattern C — File/media tabs (2 files)

`documents-tab.tsx`, `photos-tab.tsx`:

- Replace `confirm()` delete with AlertDialog (likely multiple per file/doc).
- Replace any `text-blue-600` action icons with neutral + row hover pattern.
- Empty state (no documents/photos): `<EmptyState icon={<FileText />} title="Aucun document" description="Téléversez vos documents pour les associer à ce dossier." action={<Button><Upload /> Téléverser</Button>} />`.
- Upload button: Button loading during upload (already likely has this pattern, confirm).
- Document type dropdown modal: belongs to modals plan, verify during implementation that it reflects palette.
- Thumbnail hover states: add `group-hover:scale-[1.02] transition-transform` for subtle lift.
- Preserve `uploadFileWithOfflineSupport` and `logHistorique`/`logWorkflow` side effects exactly.

### Pattern D — Timeline-view tabs (2 files)

`historique-tab.tsx`, `planification-tab.tsx`:

- Timeline dots: use retuned status-colors.ts helpers instead of any hardcoded `bg-green-500` / `bg-amber-500`.
- Empty state: EmptyState with Inbox icon.
- Keep vertical-line visual, just verify `border-muted` reads warm.
- Date formatting: preserve fr locale + `formatDistanceToNow` patterns.

### [loading.tsx](../src/app/(app)/dossiers/[id]/loading.tsx)

- Rebuild to mirror real page shape: header + observations + action bar + timeline step indicators.
- Use composition of shared-ui Skeleton primitives.

## Constraints / no-go

- Do **not** touch `log-historique.ts` or `log-observation.ts` functions — they're the Firestore write contract for every tab + modal.
- Do **not** alter the `Timeline` component usage or steps array — that structure is load-bearing.
- Do **not** change the `useDoc` / `useCollection` / `useStorage` hook consumer patterns.
- Do **not** touch `generateRapportPDF` — PDF pipeline constraint from memory.
- Do **not** change `uploadFileWithOfflineSupport` behavior — offline-sync guarantee.
- Do **not** change any `updateDoc` / `setDoc` / `deleteDoc` paths or payload shapes across tabs.
- Do **not** rename the active step persistence localStorage key (`dashboard_last_visit_*` is different, but `useLastStep(id)` uses its own key — preserve).
- Preserve `section="dossiers"` parameter on ObservationsTab — it's the collection namespace.
- Preserve all French copy across all 17 tabs verbatim (typo review can happen later if user opts in — lots of accent-missing cases likely exist, flag during implementation).

## Risk level

**Very high.** This is the most-used surface in the app with the heaviest Firestore wiring, 17 tab files × pattern-level changes, plus PDF generation, offline upload, and multiple modals. A single wrong Firestore path destroys user data.

Mitigation:
- Implementation splits into 4 sub-PRs (one per pattern A/B/C/D) rather than one mega-PR.
- Each sub-PR changes only style/chrome/primitives — no Firestore calls touched.
- Visual regression review per pattern before merging.
- Shell (page.tsx) changes are a 5th sub-PR, gated on user review.

## Dependencies

- **Requires foundation-tokens, shared-ui, layout-shell** — the primitives this area consumes.
- **Requires dashboard** — status-colors.ts retune must land before this area so all status pills across the 17 tabs read consistently.
- **Blocks domain-components** — dossier-timeline's Timeline + step-1..6 components live in domain-components plan; this area depends on them rendering correctly. But since this area doesn't modify the Timeline internals, they can proceed in parallel once the primitives are in place.
- **Coordinates with modals** — the 6 modals in this area are covered in the modals plan, but changes to their Dialog/Button shell happen at the same time.

## Exit criteria

- `npm run typecheck` passes.
- Every tab still reads/writes Firestore correctly (smoke test: save each form tab, add/delete one list item per list tab, upload+delete one doc+photo).
- Décision de statut flow still transitions statuses correctly and writes workflow log.
- Export PDF still generates and downloads.
- No hardcoded `text-blue-*`, `bg-blue-*`, `bg-red-*`, `bg-green-500`, `bg-orange-500`, etc. remain in any of the 17 tab files or page.tsx.
- No `confirm()` or `window.confirm()` remain in any delete handler.
- Status badge at top of detail page reads via `getStatusBadgeStyles`, not a local map.
- Every tab's empty state uses EmptyState.
- Every tab's loading state uses shared-ui skeleton primitives or matches actual layout.
- Dossier-not-found state uses ErrorState.
- Observations collapsible shows a count badge when items exist.

## Open items to resolve during implementation

1. **Dirty-state indicator on form tabs** — implement now (small) or defer? Lean now — high UX gain.
2. **Observations count badge** — Firestore read cost. Acceptable (subcollection with modest size). Add.
3. **Section collapse memory** — persist which form tabs user last viewed? Already have `useLastStep` for the timeline; extending to tabs is out of scope — defer.
4. **Tab-level unsaved-changes warning on navigation away** — nice-to-have; defer to a later iteration.
5. **"Sauvegarder" copy consistency** — currently "Sauvegarder" / "Enregistrement..." on form tabs but the list tabs don't have save buttons (auto-save on change). Don't unify, preserve per-pattern.
6. Sub-PR split strategy for implementation — 4 pattern PRs + 1 shell PR, or all in one? Lean split.
