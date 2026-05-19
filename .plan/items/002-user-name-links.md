# 002 — Wrap user names with Link to /utilisateurs?email=…
Status: pending
Type: visual+behavioral
Cluster: A
Files:
  - src/components/dossier-timeline/timeline.tsx
  - src/components/dossier-timeline/timeline-bar.tsx
  - src/app/(app)/dossiers/[id]/historique-tab.tsx
  - src/lib/display-user.ts (optional helper extension)
Depends on: 001
Verify: tsc --noEmit AND build AND manual: clicking a username in each of the three surfaces redirects to /utilisateurs?email=...

## User intent
> if theres utilisateur inconnu, then there should be an option to click on the text and it will redirect me to utilisateurs and show me where they're located at

## Done criteria
- In `historique-tab.tsx` around line 393, the `<span>` containing
  `displayUserName(entry)` is wrapped in
  `<Link href={`/utilisateurs?email=${encodeURIComponent(entry.user || '')}`}>`.
  Even when `userNom` is missing and "Utilisateur inconnu" renders, the
  Link still works (uses `entry.user` email for lookup).
- In `timeline.tsx` around line 44, the username portion of the stamp
  text becomes a Link using `stamp.user` for the email.
- In `timeline-bar.tsx` around line 67, same pattern using `stamp.user`.
- Link styling: `text-foreground hover:text-primary hover:underline
  underline-offset-2` (P-LINK-WRAP).
- modal-planification-history.tsx is OUT OF SCOPE (no email field
  stored; flagged for a future follow-up).

## Decisions
- D1 Link wraps just the name span, not the whole "par [name]" phrase.
  - {default-policy: P-LINK-WRAP}
- D2 Link styling: subtle underline-on-hover.
  - {default-policy: P-LINK-WRAP}
- D3 Use Next's `Link` from `next/link`. Already used in sidebar / other
  navigation.
  - {resolved-by-code: src/components/layout/sidebar.tsx uses NextLink}
- D4 When `entry.user` / `stamp.user` is empty (defensive), render
  unwrapped fallback text — no broken link.
  - {default-policy: P-EMPTY}

### Edge-case probe
- a. EXISTING DATA: legacy entries with email-only → link still works
  using the email.
- i. PERMISSION BOUNDARIES: /utilisateurs is admin-gated. Non-admin click
  → redirect to login or get a 403. Existing behavior; not our concern.
- j. EMPTY STATES: when no `user` field at all, render text unwrapped.
- All other axes: {n/a}.

## Visual verification
Required viewports: 1920, 1280
Affected routes: /dossiers/[id]
Manual flow:
  1. Open a dossier as Admin. Scroll to historique tab.
  2. Click a username next to a timeline entry. Confirm browser
     navigates to /utilisateurs?email=<that-email>.
  3. Back to dossier. Click a stamp-username in the sticky timeline bar.
     Confirm same redirect.
  4. Click the realised-at stamp in a step section header. Same redirect.
  5. With an "Utilisateur inconnu" entry (legacy log without userNom),
     confirm the text is still a working link.

## Notes
(populated at dispatch)
