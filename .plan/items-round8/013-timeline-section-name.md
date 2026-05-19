# 013 — timeline.tsx step header stamps render name
Status: pending
Type: visual
Cluster: C
Files: src/components/dossier-timeline/timeline.tsx
Depends on: 010
Verify: tsc --noEmit AND build AND dev server clean AND screenshots

## User intent
> the logs should never show emails, only the user names

## Done criteria
- The `stamp.user` reference at line ~44 of timeline.tsx (`${format(stamp.date, ...)} — ${stamp.user}`) is replaced by the same fallback logic as item 012 (use `userNom` from the workflow entry when present, else truncated email, else 'Utilisateur').
- `stampByStep` map (lines 148-163) now extracts both `userNom` and `user` (email) so the renderer can pick.
- The TimelineSection stamp prop signature gains an optional `userNom` field on the `{ date, user }` object: `{ date: Date; user: string; userNom?: string }`.

## Decisions
- D1 Same fallback as item 012 (Q-7 C).
  - {question: Q-7 → C}
- D2 Extract from workflow doc fields `userNom` (new in item 010) and `user` (legacy).
  - {resolved-by-code: log-historique.ts addDoc shape}

### Edge-case probe
- a. EXISTING DATA: legacy workflow entries → P-LOG-NAME-FALLBACK.
- All other axes: {n/a}.

## Visual verification
Required viewports: 1920, 1280
Affected routes: /dossiers/[id]
Manual flow:
  1. Scroll the dossier timeline.
  2. Each step section header below the title shows the realised-at stamp.
  3. Names appear, not emails.

## Coordination
- Item 014 makes the same change in the sticky bar.

## Notes
(populated at dispatch)
