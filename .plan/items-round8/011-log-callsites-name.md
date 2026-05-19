# 011 — Pass userNom from all logHistorique / logWorkflow call sites
Status: pending
Type: behavioral
Cluster: C
Files: every file calling logHistorique or logWorkflow (use grep at dispatch)
Depends on: 010
Verify: tsc --noEmit AND build AND grep: every logHistorique/logWorkflow call passes a name

## User intent
> the logs should never show emails, only the user names

## Done criteria
- Every call site of `logHistorique` and `logWorkflow` in the repo is updated to pass `profile?.nom` (or equivalent display name from the local context) as the new trailing parameter.
- Where `profile` is not yet imported, use `useCurrentUser()` to fetch it.
- When `profile?.nom` is empty/null, pass `undefined` and let the writer skip the field — DO NOT pass the email as a fallback (the goal is name OR nothing).

## Decisions
- D1 Source of name: `profile.nom` from `useCurrentUser()`.
  - {resolved-by-code: src/hooks/use-current-user.tsx UserProfile.nom}
- D2 If profile/nom missing: pass undefined (no email leak).
  - {default-policy: P-LOG-NAME-FALLBACK (applied at render side, not write)}

### Edge-case probe
- a. EXISTING DATA: untouched.
- All other axes: {n/a}.

## Coordination
- Items 012/013/014 are READS — they need this DATA to be present.

## Notes
(populated at dispatch — orchestrator should grep for `logHistorique(` and `logWorkflow(` to enumerate sites)
