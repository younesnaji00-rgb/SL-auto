# 009 — Expand "Valider le traitement" button visibility
Status: pending
Type: behavioral
Cluster: B
Files: src/components/observations-tab.tsx
Depends on: —
Verify: tsc --noEmit AND build

## User intent
> i dont see any valider le traitement button

(The button today is gated on `role === 'Gestionnaire'` only — likely the user tested as Admin and saw nothing.)

## Done criteria
- The visibility check changes from `isGestionnaire` to a broader `canValidate` boolean.
- `canValidate = role === 'Gestionnaire' || role === 'Admin' || role === 'Directeur' || role === 'Directeur des opérations' || role === 'Directeur technique'`.
- The button only renders per-observation (preserves Q-8 round 7 = per-observation).
- The button still only renders when the observation is NOT yet validated.
- `handleValidate` checks `canValidate` (not `isGestionnaire`) before writing.

## Decisions
- D1 Expanded role set: Admin family + Gestionnaire.
  - {question: Q-5 → B}
- D2 Per-observation placement (unchanged from round 7).
  - {memory: round 7 questions.md Q-8 = B}

### Edge-case probe
- i. PERMISSION BOUNDARIES: still gated; just wider.
- All other axes: {n/a}.

## Notes
(populated at dispatch)
