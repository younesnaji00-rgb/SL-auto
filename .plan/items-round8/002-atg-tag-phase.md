# 002 — Tag AT observations with `phaseATG` at write time
Status: pending
Type: behavioral
Cluster: A
Files: src/app/(app)/assignations-atg/[dossierId]/page.tsx, src/components/observations-tab.tsx
Depends on: 001
Verify: tsc --noEmit AND build AND manual: AT writes obs on Avant tab → Firestore shows phaseATG='Avant'

## User intent
> the agent de terrain is in planification avant and he wrote planification avant, it should only show in planification avant in gestion des dossiers, same thing for en cours and apres

## Done criteria
- `<ObservationsTab>` accepts a new optional prop `contextPhase?: 'Avant'|'En cours'|'Après'`.
- When `contextPhase` is set, the compose flow passes it to `addObservation(..., phaseATG=contextPhase)`.
- The assignations-atg page (`page.tsx:951`) passes `contextPhase={currentCategoryLabel}` where the label maps `currentCategory` ('avant'|'en_cours'|'apres') → ('Avant'|'En cours'|'Après').
- `handleSaveObservation` in assignations-atg `page.tsx:237-258` (the planification-row inline obs save) also tags with phaseATG matching the planification's category.

## Decisions
- D1 Source of phase: active mission tab via `activeTab` state.
  - {resolved-by-code: src/app/(app)/assignations-atg/[dossierId]/page.tsx line 212 `currentCategory`}
  - {question: Q-3 → A}
- D2 Phase string format: 'Avant' / 'En cours' / 'Après' (matches MISSION_TABS labels).
  - {resolved-by-code: assignations-atg page.tsx MISSION_TABS const}

### Edge-case probe
- a. EXISTING DATA: legacy AT obs without phase → item 004 falls back to all-Plan-steps (per Q-4 A).
- f. CARDINALITY: 1 obs → 1 phase.
- i. PERMISSION BOUNDARIES: unchanged.
- n. ROLLOUT: starts immediately for new writes.
- All other axes: {n/a}.

## Relevant invariants
- I2 responsive (unchanged).

## Coordination
- Item 004 reads `phaseATG` to filter.
- Item 007 also uses this prop on the ATG view side.

## Notes
(populated at dispatch)
