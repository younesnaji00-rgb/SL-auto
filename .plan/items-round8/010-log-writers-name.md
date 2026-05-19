# 010 — Extend logHistorique and logWorkflow to persist userNom
Status: pending
Type: behavioral
Cluster: C
Files: src/app/(app)/dossiers/[id]/log-historique.ts
Depends on: —
Verify: tsc --noEmit AND build AND grep new field on persisted doc shape

## User intent
> the logs should never show emails, only the user names

## Done criteria
- `logHistorique(db, dossierId, action, user, details?, type?, userNom?)` accepts an optional trailing `userNom?: string`.
- `logWorkflow(db, dossierId, action, user, userId, status?, extra?, userNom?)` accepts an optional trailing `userNom?: string`.
- Both writers persist `userNom` on the doc when non-null.
- The denormalized `lastStatusChange.byNom` (mirror of `.by`) is also written.
- Default fallback inside the writer: if userNom is omitted/empty, do not persist the field (so reads can apply the Q-7 fallback).

## Decisions
- D1 Field naming: `userNom` (camelCase, matches `authorNom`, `auteurNom`, `uploadedByNom` elsewhere).
  - {resolved-by-code: src/components/observations-tab.tsx ProofFile uploadedByNom}
- D2 Backwards-compatible: trailing optional parameter, all existing calls keep working.
  - {default-policy: P-BUTTON-VARIANT (additive only)}

### Edge-case probe
- a. EXISTING DATA: legacy entries have no userNom → reader applies P-LOG-NAME-FALLBACK.
- h. SCHEMA IMPACT: 1 new optional string field on historique + workflow docs; no index.
- All other axes: {n/a}.

## Coordination
- Item 011 updates all call sites to pass userNom.
- Items 012, 013, 014 read userNom on the display side.

## Notes
(populated at dispatch)
