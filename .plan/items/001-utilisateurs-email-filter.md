# 001 — /utilisateurs reads ?email= query param and filters
Status: pending
Type: behavioral
Cluster: A
Files: src/app/(app)/utilisateurs/client-page.tsx
Depends on: —
Verify: tsc --noEmit AND build AND manual: navigate to /utilisateurs?email=foo@bar.com and confirm filter applies

## User intent (verbatim)
> if theres utilisateur inconnu, then there should be an option to click on the text and it will redirect me to utilisateurs and show me where they're located at

## Done criteria
- On mount, the page reads `useSearchParams().get('email')`.
- If present, the existing search filter (`filters.search`) is initialized
  to the email value so the matching user (if any) appears.
- If no user matches that email, a small dismissable banner renders at the
  top of the list: "Aucun utilisateur ne correspond à l'email '<value>'
  — peut-être un compte supprimé." (per Q-1 → C, recommendation).
- Existing search behavior preserved — user can clear the filter to see
  all users.

## Decisions
- D1 Param shape: `?email=<email>`.
  - {default-policy: P-EDITER-PARAM (descriptive query string)}
- D2 Filter initialization: set `filters.search` to the email string so
  the existing filter helper (which already substring-matches on name) AND
  the email column both produce the match.
  - {resolved-by-code: utilisateurs/client-page.tsx existing filter at lines 297-305}
- D3 No-match UI: top banner per Q-1 → C.
  - {question: Q-1 → recommendation C}

### Edge-case probe
- a. EXISTING DATA: legacy users with same email — show all matches.
- d. ENFORCEMENT LAYER: client-side filter, no server enforcement.
- i. PERMISSION BOUNDARIES: existing /utilisateurs page already admin-gated.
- j. EMPTY STATES: covered by D3.
- All other axes: {n/a}.

## Notes
- Existing search filter does substring match on `nom`/`prenom`. The user's
  email matches `email` field directly — must extend the filter to ALSO
  match on email, or use a separate email-equality check when the
  `?email=` param is present.
