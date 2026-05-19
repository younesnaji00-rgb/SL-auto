# 006 — Wire contextAccord='1er accord' into dossier-view step 6 panel
Status: pending
Type: visual+behavioral
Cluster: A
Files: src/app/(app)/dossiers/[id]/page.tsx
Depends on: 004
Verify: tsc --noEmit AND build AND dev server clean AND screenshots

## User intent
> same thing for chiffrage depending wether they were on accord or 2eme accord ou +

## Done criteria
- `dossiers/[id]/page.tsx:200` (step 6 — Accord) `<ObservationsTab>` gets `contextAccord="1er accord"`.
- This panel now shows only chiffreur obs with accordSlot='1er accord' (plus gestionnaire catch-all + legacy chiffreur obs per Q-4 A).
- Step 11 (2ème accord ou +) ObservationsTab — explicitly NOT added in this round. See assumption A2.

## Decisions
- D1 Step 6 = "1er accord" mapping.
  - {resolved-by-code: timeline.tsx:252 step id 6 label 'Accord'}
- D2 Step 11 deferred — no ObservationsTab change there.
  - {memory: tasks.md A2 (user said "fix it tomorrow")}

### Edge-case probe
- All axes covered by item 004.

## Visual verification
Required viewports: 1920, 1280, 768
Affected routes: /dossiers/[id]
Manual flow:
  1. Open a dossier with chiffreur observations.
  2. Scroll to step 6 (Accord). Confirm only chiffreur obs tagged '1er accord' (plus gestionnaire catch-all + legacy chiffreur obs) appear.
  3. Confirm AT obs do NOT appear in step 6.
  4. Confirm step 11 (2ème accord et +) is UNCHANGED for this round.

## Notes
(populated at dispatch)
