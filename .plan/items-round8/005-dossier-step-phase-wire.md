# 005 — Wire contextPhase into dossier-view step 4 / 9 / 10 panels
Status: pending
Type: visual+behavioral
Cluster: A
Files: src/app/(app)/dossiers/[id]/page.tsx
Depends on: 004
Verify: tsc --noEmit AND build AND dev server boots clean AND screenshots at viewports

## User intent
> it should only show in planification avant in gestion des dossiers, same thing for en cours and apres

## Done criteria
- `dossiers/[id]/page.tsx:192` (step 4 — Plan avant) `<ObservationsTab>` gets `contextPhase="Avant"`.
- `dossiers/[id]/page.tsx:211` (step 9 — Plan en cours) gets `contextPhase="En cours"`.
- `dossiers/[id]/page.tsx:225` (step 10 — Plan après) gets `contextPhase="Après"`.
- All three panels now show only obs whose phaseATG matches that phase (plus catch-all + legacy per item 004 rules).

## Decisions
- D1 Step → phase mapping: step 4 → Avant, step 9 → En cours, step 10 → Après.
  - {resolved-by-code: DOSSIER_TIMELINE_STEPS at src/components/dossier-timeline/timeline.tsx:249-258}

### Edge-case probe
- j. EMPTY STATES: existing empty-state in ObservationsTab handles "no obs" — no change.
- All other axes resolved by item 004.

## Visual verification
Required viewports: 1920, 1280, 768
Affected routes: /dossiers/[id]
Manual flow:
  1. Open a dossier with mixed observations (AT obs on multiple phases).
  2. Scroll to step 4 (Plan avant). Confirm only Avant-tagged AT obs (plus gestionnaire dossiers-source obs) appear.
  3. Scroll to step 9. Confirm only En cours-tagged obs.
  4. Scroll to step 10. Confirm only Après-tagged obs.
  5. Confirm legacy un-tagged AT obs appear in all 3 (per Q-4 A).
  6. Confirm chiffreur obs do NOT appear in any of these step panels.

## Coordination
- Item 006 wires the step-6 (Accord) panel.

## Notes
(populated at dispatch)
