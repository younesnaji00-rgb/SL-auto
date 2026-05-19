# 001 — Extend `addObservation` signature with phaseATG and accordSlot
Status: pending
Type: behavioral
Cluster: A — Observation context + scoping
Files: src/app/(app)/dossiers/[id]/log-observation.ts
Depends on: —
Verify: tsc --noEmit AND build AND grep confirms new optional fields exist in persisted shape

## User intent (verbatim)
> make the observations stay only where they were written ... and same thing for chiffrage depending wether they were on accord or 2eme accord ou +

## Done criteria
- `addObservation(...)` accepts two new OPTIONAL trailing params: `phaseATG?: 'Avant' | 'En cours' | 'Après' | null` and `accordSlot?: '1er accord' | '2ème accord ou +' | null`.
- Both fields are persisted on the observation doc (Firestore subcollection `dossiers/{id}/observations`) only when non-null.
- The `lastObservation` denormalized snapshot on the dossier doc carries the same two fields when present.
- No existing call site breaks (new params are optional).
- No-op when both params are undefined.

## Decisions
- D1 Field names: `phaseATG`, `accordSlot` — match existing field naming style on observations doc.
  - {resolved-by-code: src/components/observations-tab.tsx Observation type fields camelCase}
- D2 Values: phaseATG = exact strings 'Avant' | 'En cours' | 'Après'; accordSlot = '1er accord' | '2ème accord ou +'.
  - {resolved-by-code: src/app/(app)/assignations-atg/[dossierId]/page.tsx MISSION_TABS uses 'Avant'/'En cours'/'Après'}

### Edge-case probe
- a. EXISTING DATA: legacy obs lack both fields → see Q-4 (item 004 handles filter).
- b. TIME & ZONE: {n/a}
- c. SOURCE OF TRUTH: the writer (AT view or chiffrage view) supplies the tag.
- d. ENFORCEMENT LAYER: optional fields, no validation needed.
- e. UNDO/REVERSAL: {n/a — write-once tag}.
- f. CARDINALITY: per-observation (one phase OR one accord, not both).
- g. DERIVED FROM DATA: {resolved-by-code: currentCategory in atg view}.
- h. SCHEMA IMPACT: two new optional string fields. No index needed.
- i. PERMISSION BOUNDARIES: existing canAdd gating unchanged.
- j. EMPTY/PARTIAL/ZERO STATES: {n/a}.
- k. CONCURRENCY: {n/a — additive write}.
- l. LIMITS & GROWTH: {n/a}.
- m. EXTERNAL DEPENDENCIES: {n/a}.
- n. ROLLOUT: all users at once.

## Relevant invariants
- I7: 2ème accord display deferred — but tagging must still happen for forward-compat.

## Coordination
- Items 002, 003, 004, 005, 006, 007 all rely on this signature.

## Notes
(populated at dispatch)
