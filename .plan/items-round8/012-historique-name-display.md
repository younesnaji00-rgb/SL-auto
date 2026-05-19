# 012 — historique-tab.tsx renders user name (not email)
Status: pending
Type: visual
Cluster: C
Files: src/app/(app)/dossiers/[id]/historique-tab.tsx
Depends on: 010
Verify: tsc --noEmit AND build AND dev server clean AND screenshots

## User intent
> the logs should never show emails, only the user names

## Done criteria
- Line ~393 (`{entry.user}` in the timeline entry header) is replaced by a small helper `displayUserName(entry)` that returns:
  - `entry.userNom` when present
  - else the truncated email (everything before `@`) per P-LOG-NAME-FALLBACK / Q-7 C
  - else 'Utilisateur'
- The helper lives at the top of the file (or in a new `src/lib/display-user.ts` if a sibling display surface needs it too — soft-stall decision).

## Decisions
- D1 Fallback: truncated email (everything before @).
  - {question: Q-7 → C}
- D2 Helper location: top of historique-tab.tsx (one-file usage today).
  - {default-policy: P-BUTTON-VARIANT — no new file unless needed}

### Edge-case probe
- a. EXISTING DATA: legacy entries with email only → display truncated email per Q-7.
- All other axes: {n/a}.

## Visual verification
Required viewports: 1920, 1280
Affected routes: /dossiers/[id] (historique tab)
Manual flow:
  1. Open a dossier with workflow entries from MULTIPLE users.
  2. Switch to Historique tab.
  3. Verify each entry shows a display name OR truncated email — never the full `@domain.com` form.
  4. Mix of new (userNom-persisted) and legacy (email-only) entries should render consistently.

## Notes
(populated at dispatch)
