# 007 — Wire contextPhase into the assignations-atg ObservationsTab
Status: pending
Type: behavioral
Cluster: A
Files: src/app/(app)/assignations-atg/[dossierId]/page.tsx
Depends on: 004
Verify: tsc --noEmit AND build AND manual: switching mission tabs filters obs list

## User intent
> the agent de terrain is in planification avant and he wrote planification avant, it should only show in planification avant ... same thing for en cours and apres

(applies symmetrically to the AT's own ATG view — they only see their own current-phase obs, not all of them)

## Done criteria
- `<ObservationsTab>` at line 951 of `assignations-atg/[dossierId]/page.tsx` receives `contextPhase={currentCategoryLabel}` (the active mission tab's label: 'Avant' | 'En cours' | 'Après').
- When the AT switches mission tab, the observations panel re-filters automatically (the prop changes, useMemo re-runs).
- Same write-time tagging from item 002 is preserved.

## Decisions
- D1 Use `activeTab` (the displayed label) directly — already 'Avant' / 'En cours' / 'Après'.
  - {resolved-by-code: src/app/(app)/assignations-atg/[dossierId]/page.tsx MISSION_TABS line ~60}

### Edge-case probe
- f. CARDINALITY: one current phase at a time (active tab is unique).
- All other axes covered by 002/004.

## Coordination
- None.

## Notes
(populated at dispatch)
