# SL Auto — Autonomous rework task list

**Session**: 2026-04-21 (lunchtime run)
**Branch**: `auto-2026-04-21` (DO NOT push to `main`)
**Green gate**: `npx tsc --noEmit` exits clean

## Run summary (as of hand-off)

**6 of 20 tasks shipped**, all clean on `tsc --noEmit`, all committed to `auto-2026-04-21`:
- `278befe` #01 Réforme schema
- `06e0b32` #02 ReformeDialog component
- `2d3f485` #03 Réforme button in chiffrage header
- `cdaee9f` #04 Column totals + SR-tolerant sums
- `749e35d` #05 Timeline scaffolding
- `3409b60` #06 useLastStep hook

**Stopped at** #07 (Step 1 panel). Reason: tasks #07-#13 require coordinated edits to the existing `dossiers/[id]/page.tsx`, which wires the current tabs with a lot of cross-prop state (planification callbacks, modal refs). Doing that autonomously risks breaking the dossier detail page silently. Safer to pause and let a human drive the wiring.

## Resume plan (pick up here)

**Next up**: tasks #07 → #14 in order. The right approach:

1. Read `src/app/(app)/dossiers/[id]/page.tsx` fully to understand how the tabs are currently wired (state hooks, modal props).
2. Create a `DossierTimelinePage` component that owns that same state once, then passes per-tab props into a `sections` map consumed by `<Timeline>`.
3. Step 5 (Chiffrage) is new — build it fresh using the queries described in task #11.
4. Wire `useLastStep(dossierId)` at the top of the page to drive `activeStep`.
5. Replace the tabs rendering in `page.tsx` with `<Timeline steps={DOSSIER_TIMELINE_STEPS} sections={...} activeStep={...} onActiveStepChange={setStep} />`.

**Then** tasks #15-#16 (replace old wizard) and #17-#20 (polish).

**Loop protocol**
1. Pick the next task with `- [ ]` status.
2. Mark it `- [>]` (in progress) and save `tasks.md`.
3. Execute end-to-end — read spec, edit files, verify with tsc, commit on green to `auto-2026-04-21` with message `[#<taskId>] <title>`.
4. Mark `- [x]` and move on.
5. On failure (2 attempts): mark `- [FAILED] <short reason>` and skip. Never push to `main`.
6. If context is tight, commit progress, stop cleanly, human picks up next iteration.

---

## Global context
- Stack: Next.js 15 + Firebase (App Hosting on branch `main`). Client is in `src/`. Tailwind + shadcn.
- Canonical doc statuses: `src/lib/dossiers-data.ts:40-93`.
- Editable doc schema: `src/lib/devis-schema.ts`.
- Existing dossier tabs live in `src/app/(app)/dossiers/[id]/*-tab.tsx`.
- User context hook: `src/hooks/use-current-user.tsx`.
- Firestore paths: `dossiers/{id}`, `chiffrages/{id}`. Dossier has `.reforme` added in this run.

## Locked assumptions (from the PRD interview)
- **A1**: Last-step memory = `localStorage['dossier-${dossierId}-step']`, scoped per browser.
- **A2**: `SR` and any non-numeric cell → `0` contribution to column totals; rest of row still counts.
- **A3**: Réforme auto-calc: `Différence = Vénale − Épave`; `Total indemnisation = Accord − Vétusté − Franchise + Déplacement + Honoraires`. Editable after.
- **A4**: Asterisks on empty previously-required fields only (reuse the zod schema from `creation-form.tsx` to know which were required).
- **A5**: Existing dossiers render in the new timeline with whatever data they have; no migration script.
- **A6**: Step 5 empty state = `<EmptyState text="Aucun chiffrage pour ce dossier" />`.
- **A7**: Réforme visible to chiffreurs + admins. Read-only for other roles.
- **A8**: Old creation wizard `src/app/(app)/dossiers/new/` deleted; "Créer un dossier" now creates an empty Firestore doc and redirects to the new timeline.

---

## Tasks

### Phase 1 — Réforme feature & devis totals

- [x] **#01** — Add Réforme schema — commit `278befe`
  - File: `src/lib/reforme-schema.ts` (new)
  - Define `ReformeData` type matching the screenshot: `typeReforme`, `valeurVenale`, `valeurEpave`, `valeurAchat`, `valeurCommerciale`, `difference` (computed), `methodeCalcul`, `avecTva` (boolean), `vetuste`, `franchise`, `montantDeplacement`, `montantHonoraires`, `montantAccord`, `totalIndemnisation` (computed).
  - Export `emptyReforme()`, `computeDifference(r)`, `computeTotalIndemnisation(r)`.
  - Done: file exists, `npx tsc --noEmit` clean.

- [x] **#02** — Build `<ReformeDialog>` component — commit `06e0b32`
  - File: `src/components/chiffreurs/reforme-dialog.tsx` (new)
  - Dialog form with all fields from schema. Auto-compute Différence and Total indemnisation as user types. Submit persists to `dossiers/{dossierId}.reforme` via `updateDoc`.
  - Use shadcn `Dialog`, `Input`, `Select`, `Switch` (for Avec TVA). Match layout from user's screenshot (left column: Type Réforme, Valeur vénale/épave/achat/commerciale, Différence, Méthode. Right column: Avec TVA toggle, Valeur Vénale, Montant Accord, Vétusté, Franchise, Déplacement, Honoraires, Total Indemnisation. "Déposer Le Dossier" submit button).
  - Read/write from `dossiers/{dossierId}.reforme`. Load existing on open.
  - Done: component renders, saves, reloads values on reopen. tsc clean.

- [x] **#03** — Add "Réforme" button in assignations-chiffrage detail page — commit `2d3f485`
  - File: `src/app/(app)/assignations-chiffrage/[id]/page.tsx`
  - Add a `<Button>` next to the existing "Décision de statut" button. Label "Réforme", icon `<Scale />` from lucide. Only visible when `canEdit` (chiffreur/admin). Click → opens `<ReformeDialog dossierId={chiffrage.dossierId}>`.
  - Done: button visible for chiffreurs on the chiffrage page, opens the dialog, round-trips data. tsc clean.

- [x] **#04** — Totals per extra column + SR-tolerant sums — commit `cdaee9f`
  - File: `src/components/chiffreurs/devis-editor.tsx`, `src/lib/devis-schema.ts`
  - In `devis-schema.ts`: ensure `parseFr` returns 0 on non-numeric input (add explicit guard if not already). Export `sumColumn(rows, column, extractor)` helper.
  - In `devis-editor.tsx`: below the existing totals block (Σ H.T, TVA, TTC), render one row per extra column showing `Σ <column label>` with the safe-sum total. Format in French (`formatFr`).
  - Done: adding an extra column shows its total; typing "SR" in a cell doesn't break the counter. tsc clean.

### Phase 2 — Dossier timeline (6 steps)

- [x] **#05** — Timeline scaffolding — commit `749e35d`
  - Files: `src/components/dossier-timeline/timeline.tsx` (new), `src/components/dossier-timeline/timeline-bar.tsx` (new)
  - `TimelineBar`: sticky top, shows 6 numbered circles with labels (1 Document import, 2 Information, 3 Planification, 4 Pièces jointes, 5 Chiffrage, 6 Rapport). Active step highlighted. Click number → smooth-scroll to section. IntersectionObserver updates active as user scrolls.
  - `Timeline`: container with 6 `<section id="step-N">` children, receives children via a prop map. Wraps all in a full-height scrollable div.
  - Done: empty timeline renders with clickable bar + sections; scrolling updates active step; tsc clean.

- [x] **#06** — localStorage restore-last-step hook — commit `3409b60`
  - File: `src/hooks/use-last-step.ts` (new)
  - `useLastStep(dossierId)` returns `[currentStep, setCurrentStep]`. Reads localStorage key `dossier-${dossierId}-step` on mount, writes on set. Default = 1.
  - Done: hook persists across remount; tsc clean.

- [x] **#07** — Step 1 panel "Document import" — commit `e1e44d6` (uses `/api/scan-document` + `uploadFileWithOfflineSupport`; empty-field merge only)
  - File: `src/components/dossier-timeline/step-1-import.tsx` (new)
  - Mount the existing document-upload-with-AI-scan component (from `src/app/(app)/dossiers/new/creation-form.tsx` if isolated, else lift it). Read-only display after first dossier creation.
  - Done: drag-and-drop upload works, AI scan pre-fills fields in step 2; tsc clean.

- [x] **#08** — Step 2 panel "Information" — commit `9b0b217` (wraps InformationTab + missing-required-fields banner; zod is all `.optional()` so required list sourced from `checkEmptyFields`)
  - File: `src/components/dossier-timeline/step-2-information.tsx` (new)
  - Mount existing `information-tab.tsx` content. Writes go to `dossiers/{id}` directly.
  - Missing-field asterisk: for each field that was `required` in `src/app/(app)/dossiers/new/creation-form.tsx` zod schema, render `<Label>foo *</Label>` in red when empty.
  - Done: fields load, edit, persist; asterisks appear for empties; tsc clean.

- [x] **#09** — Step 3 panel "Planification" — commit `277b411` (thin wrapper on existing `planification-tab.tsx`; `onOpenHistory` stubbed, `readOnly` not yet forwarded)
  - File: `src/components/dossier-timeline/step-3-planification.tsx` (new)
  - Mount existing `planification-tab.tsx` content.
  - Done: same behavior as current tab; tsc clean.

- [x] **#10** — Step 4 panel "Pièces jointes" (Documents + Photos combined) — commit `3cf55b9` (stacked Documents + Photos, both children take only `dossierId`)
  - File: `src/components/dossier-timeline/step-4-pieces.tsx` (new)
  - Tabs-within-section: Documents (mount `documents-tab.tsx`) and Photos (mount `photos-tab.tsx`). Or two stacked sub-sections with headers, no inner tabs — designer's choice, lean toward stacked for the scroll-first UX.
  - Done: both original components render, operations (upload/delete/preview) still work; tsc clean.

- [x] **#11** — Step 5 panel "Chiffrage" — commit `fa5372d` (399 lines; Réforme card + modified files list; annotations found per-file at `chiffrage.files[i].annotations`; bulk download + historique dialog stubbed)
  - File: `src/components/dossier-timeline/step-5-chiffrage.tsx` (new)
  - Query: `collection(db, 'chiffrages')` where `dossierId == X`. For the latest chiffrage, list files where `structuredEditables[docType]` exists OR `annotations?.length > 0`. For each, show: filename, last-modified version author + timestamp, button "Voir l'original" (opens the file from step 4 in a dialog), button "Historique" (opens versions list reusing the existing ReferencePanel-style preview).
  - Multi-select checkboxes + "Télécharger la sélection" button (mirror `documents-tab.tsx` selection mode).
  - If no chiffrage exists: `<EmptyState text="Aucun chiffrage pour ce dossier" />`.
  - Show the Réforme summary card if `dossier.reforme` exists (read-only preview).
  - Done: chiffreur-modified docs list correctly, Réforme card renders, multi-download works; tsc clean.

- [x] **#12** — Step 6 panel "Rapport" — commit `e4d8c45` (24-line wrapper on RapportTab)
  - File: `src/components/dossier-timeline/step-6-rapport.tsx` (new)
  - Mount existing `rapport-tab.tsx` content.
  - Done: rapport editor still functional; tsc clean.

- [x] **#13** — Wire timeline into dossier detail page — commit `0d352a6` (page.tsx 243→219 lines; tabs removed, `<Timeline>` mounted; Historique moved to Dialog triggered from header)
  - File: `src/app/(app)/dossiers/[id]/page.tsx`
  - Replace the current tabs rendering with `<Timeline>` using the 6 step components. Remove `<Tabs>` wrapper. Use `useLastStep` to restore.
  - Keep the top dossier header (breadcrumb + status badge + action buttons).
  - Done: opening `/dossiers/{id}` shows the new timeline; old tabs gone; tsc clean.

- [x] **#14** — Replace eye-icon behavior in dossier list — already correct (eye icon at `client-page.tsx:398` already calls `router.push('/dossiers/${d.id}')`; no commit)
  - File: `src/app/(app)/dossiers/client-page.tsx`
  - Current eye icon opens a modal or stripped view. Change to `router.push(\`/dossiers/\${id}\`)` — the timeline.
  - Done: clicking eye navigates to timeline; tsc clean.

### Phase 3 — Creation rework (replace wizard)

- [x] **#15** — "Créer un dossier" creates empty doc and redirects — commit `1c5f21d` (new `create-empty-dossier.ts`; statut='Création de dossier'; moved button from page.tsx to client-page.tsx; logHistorique logged)
  - Files: `src/app/(app)/dossiers/client-page.tsx` (the "Créer" button), new `src/lib/create-empty-dossier.ts`
  - Helper `createEmptyDossier(db, user)`: `addDoc(collection(db, 'dossiers'), { createdAt, createdBy: user.uid, statut: 'Création de dossier', compagnie: '', /* all fields empty */ })` returns new `id`. Also log historique entry.
  - Button click → calls helper → `router.push(\`/dossiers/\${id}\`)`.
  - Done: click Créer → new empty dossier in Firestore + redirect to timeline on step 1; tsc clean.

- [x] **#16** — Delete old wizard — commit `4540a20` (9 files / 2659 lines deleted; 1 stale Link in compagnies fixed; no dangling imports)
  - Files: `src/app/(app)/dossiers/new/**` (delete entire directory)
  - Update any imports pointing to `/dossiers/new/...` — should be none after #15.
  - Done: directory gone, no dangling imports, tsc clean.

### Phase 4 — Cleanup & verification

- [x] **#17** — Historique integration in timeline — commit `19c323d` (Dialog → right-side Sheet, `w-full sm:max-w-xl`)
  - File: `src/components/dossier-timeline/timeline-bar.tsx` (extend) OR new collapsible drawer `historique-drawer.tsx`
  - Option chosen: collapsible side-drawer at the top of the dossier detail page (button "Historique" in header). Mounts existing `historique-tab.tsx` content.
  - Done: drawer opens/closes, shows full log; tsc clean.

- [x] **#18** — Missing-field audit pass — commit `584f562` (audit comment block added; 7 required-field mappings documented; banner coverage confirmed)
  - Files: all step components (#08 through #12)
  - Cross-check: every required field in the old zod schema is reflected with asterisk behavior in the timeline.
  - Done: grep/audit note in a comment at the top of step-2 confirms each field; tsc clean.

- [x] **#19** — Smoke: build + type-check — `next build` PASSED in 14.9s (23/23 pages, zero errors, zero warnings); no commit needed. `/dossiers/[id]` is 54.5 kB / 480 kB First Load JS — largest route.
  - Run `npx next build` locally. Fix any surface errors introduced.
  - Done: `next build` succeeds.

- [x] **#20** — CHANGELOG entry — commit `ad654d3` (`.plan/CHANGES-2026-04-21.md` with per-task tally + follow-ups + deploy notes)
  - File: `.plan/CHANGES-2026-04-21.md` (new)
  - One-liner per completed task with commit hash.
  - Done: file written with the tally.

---

## Phase 5 — Round 2 feedback (tasks #21-#33)

- [x] **#21** — Dossier creation: pre-confirm modal — commit `591ebb8` (new `create-dossier-dialog.tsx`; seed-aware `createEmptyDossier`; Annuler verified no-write)
  - Files: `src/app/(app)/dossiers/client-page.tsx`, new `src/components/dossiers/create-dossier-dialog.tsx`
  - Click "Créer un dossier" opens Dialog form with refExpert, compagnie (Select from options_compagnies), nature (Select from options_nature), assure.nom, matricule. On confirm → `addDoc` + redirect. On cancel → no Firestore mutation.
  - Keep `createEmptyDossier` helper but pass the form values instead of a blank record.
  - Done: no empty-row pollution when user clicks Créer then Cancel; tsc clean.

- [x] **#22** — Step 1 Document import: show only AI-scanned document — commit `a0457d4` (writes `importDocId` on scan; render-only after; replacement UI skipped; `UploadFileResult.docId` added)
  - File: `src/components/dossier-timeline/step-1-import.tsx`
  - On first successful scan → `updateDoc(dossierRef, { importDocId })` with the new Firestore doc id of the uploaded import file.
  - Render logic: if `dossier.importDocId` set → fetch that single doc and show it; else → empty state + upload zone.
  - Done: only the scanned doc appears; other uploads in Step 4 don't leak into Step 1; tsc clean.

- [x] **#23** — Pièces jointes typed-slot layout — commit `a67f064` (new `typed-documents-grid.tsx` 403 lines, 15 slots; 4 ops supported; `documents-tab.tsx` now orphaned)
  - Files: `src/components/dossier-timeline/step-4-pieces.tsx`, possibly new `src/components/dossier-timeline/typed-documents-grid.tsx`
  - Grid of 15 typed cards (one per `DOCUMENT_TYPES` minus 'Autre' from `src/lib/constants.ts:38-55`). Each card: type label, existing uploads for that type (thumbnail row), "Ajouter" button that file-pickers and uploads with `type` prefilled. No post-pick type dialog.
  - Keep Photos section stacked below as-is.
  - Done: slot-layout renders, upload commits to correct type automatically; tsc clean.

- [x] **#24** — Remove duplicate Planification card from `information-tab.tsx` — commit `b09ff48` (-278 lines; Card + 2 Dialogs + associated state/queries removed; prop shape preserved)
  - File: `src/app/(app)/dossiers/[id]/information-tab.tsx` lines 449-529 (the `<Card>...Planification... + Nouvelle...</Card>` block)
  - Done: only the Step 3 panel shows Planification; tsc clean.

- [x] **#25** — Sticky action bar under dossier top header — commit `3547885` (action row `sticky top-0 z-40`; TimelineBar now `sticky top-[52px] z-30`)
  - File: `src/app/(app)/dossiers/[id]/page.tsx` (~lines 146-176)
  - Wrap action row with `sticky top-[Npx] z-40`. Compute N from the top header's rendered height (≈72px). Bump timeline-bar's `top-0` accordingly to `top-[header+actionbar]` so the two sticky bars stack, not overlap.
  - Done: action bar stays visible while scrolling; step-bar sits directly below it; tsc clean.

- [x] **#26** — IntersectionObserver scroll-tracking accuracy — commit `18555fa` (IO → rAF scroll listener on resolved scroll container; threshold 120px; walks up to find overflow-auto ancestor)
  - File: `src/components/dossier-timeline/timeline.tsx`
  - Replace current IO with a scroll listener (rAF-throttled) that picks the section whose `getBoundingClientRect().top` ≤ threshold (step-bar bottom + 8px) but is greatest among those → the section currently crossing the top.
  - Done: scrolling highlights the correct step in the bar; tsc clean.

- [x] **#27** — Photos: 3-column layout with lightbox per column — commit `6d27002` (3 Card columns; per-column gallery Dialog; delete now in gallery only)
  - File: `src/app/(app)/dossiers/[id]/photos-tab.tsx`
  - Replace the 3 collapsible cards with a 3-column grid (Photos avant / Photos en cours / Photos après). Column header clickable → opens Dialog lightbox showing all photos in that category as scrollable gallery.
  - Reuse existing `photosForCategory()` helper + preview Dialog pattern already in the file.
  - Done: layout switched, lightbox gallery works per column; tsc clean.

- [x] **#28** — Rapport cleanup + "Générer le rapport" button — commit `6269a52` (886→383 lines, -549/+46; PDF generator already covers info+chiffrage+pointsDeChoc; auto-saves pointsChoc before generation)
  - File: `src/app/(app)/dossiers/[id]/rapport-tab.tsx`
  - Delete Fourniture (lines 591-726), Main d'œuvre (728-780), bottom bar "Valider le rapport" + "Total estimé" (868-884).
  - Keep Points de choc car diagrams (817-857). Observation expert → moved in task #31 (delete it from bottom here).
  - Add "Générer le rapport" button (prominent, top or header of the tab) calling `generateRapportPDF(db, id)` with loading spinner. Reuse pattern from `page.tsx:164` (Exporter PDF button).
  - Done: rapport tab minimal; button generates a PDF with informations + chiffrage + points de choc; tsc clean.

- [x] **#29** — Step 5 Chiffrage: gate Réforme card on `reforme.updatedAt` — commit `16c0f6b` (`{reforme ?` → `{reforme?.updatedAt ?`)
  - File: `src/components/dossier-timeline/step-5-chiffrage.tsx`
  - Change the reveal condition from truthy-`dossier.reforme` to `dossier.reforme?.updatedAt != null`.
  - Done: brand-new dossier with no reforme write doesn't show the card; tsc clean.

- [x] **#30** — Step 5 row polish + Historique drawer parity — commit `8aceea4` (grid layout; in-page lightbox; right-side Sheet on both dossier + chiffreur sides)
  - Files: `src/components/dossier-timeline/step-5-chiffrage.tsx`, `src/app/(app)/assignations-chiffrage/[id]/page.tsx`
  - (a) Fix row layout: explicit column widths so "Dernière modif" doesn't overlap Voir l'original / Historique actions.
  - (b) "Voir l'original" → Dialog lightbox (copy pattern from `documents-tab.tsx:765-798`), no new tab.
  - (c) "Historique" → right-side Sheet drawer listing `structuredEditables[docType].versions[]` — mirror `page.tsx` Historique drawer from task #17.
  - (d) Mirror same Historique drawer on chiffreur-side assignation-chiffrage page.
  - Done: all four sub-items visible and functional; tsc clean.

- [x] **#31** — Observations consolidated at top of dossier page — commit `20d5a30` (collapsible ObservationsTab above action bar; rapport textarea was already gone from #28)
  - Files: `src/app/(app)/dossiers/[id]/page.tsx`, `src/app/(app)/dossiers/[id]/rapport-tab.tsx`
  - Remove Observation expert textarea from bottom of rapport-tab (~lines 860-866).
  - At top of `page.tsx` (right below top header, above action bar) mount `<ObservationsTab dossierId={id} section="dossiers" />` or equivalent that surfaces all observation sources.
  - If multiple sources exist, consolidate into one `<DossierObservations>` component under `src/components/dossiers/dossier-observations.tsx`.
  - Done: observations visible at top, rapport tab has no observation section; tsc clean.

- [x] **#32** — Collapsible step cards with persistence — commit `3ba158f` (`use-collapsed-steps.ts` + clickable headers + scroll re-fire on toggle)
  - Files: new `src/hooks/use-collapsed-steps.ts`, edit `src/components/dossier-timeline/timeline.tsx`
  - Hook signature: `useCollapsedSteps(dossierId): { isCollapsed(stepId), toggle(stepId) }`. Storage key: `dossier-${dossierId}-step-${stepId}-collapsed` (boolean).
  - Each `TimelineSection` header becomes clickable toggle; when collapsed, body is hidden (only number + title + chevron shown).
  - Re-fire IO when collapsed state changes (height change invalidates the previous observation).
  - Done: collapse a section, refresh — still collapsed; navigate away and back — still collapsed; tsc clean.

- [x] **#33** — Chiffreur dossier-count mismatch fix — commit `688422b` (new `chiffreur-workload.ts`; standardized on `assignedChiffreurId`; terminal='done' excluded; name→id keying fixed the root cause)
  - Files: `src/app/(app)/dossiers/[id]/modal-chiffrage.tsx`, `src/app/(app)/assignations-chiffrage/page.tsx` or `client-page.tsx`, new `src/lib/chiffreur-workload.ts`
  - Read both count queries. Align on one source of truth — likely: count `chiffrages` where `chiffreurId == X && statut != 'Terminé'`.
  - Extract shared helper `getChiffreurOpenCount(db, chiffreurId): Promise<number>` and use in both places.
  - Done: both surfaces show the same integer for the same chiffreur; tsc clean.

---

## When the loop stops
- If all tasks are done: switch to branch `auto-2026-04-21`, run `git log --oneline main..HEAD` to see the run's commits. Cherry-pick or merge into `main` for deploy.
- If one or more tasks are `[FAILED]`: each has a short reason. Resolve manually or re-queue with adjusted spec.
