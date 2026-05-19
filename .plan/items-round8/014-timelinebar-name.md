# 014 — timeline-bar.tsx sticky bar stamps render name
Status: pending
Type: visual
Cluster: C
Files: src/components/dossier-timeline/timeline-bar.tsx
Depends on: 013 (the stamp prop signature change happens there)
Verify: tsc --noEmit AND build AND screenshots

## User intent
> the logs should never show emails, only the user names

## Done criteria
- The sticky-bar stamp at lines ~64-67 of timeline-bar.tsx renders the name from the extended stamp object (item 013).
- Truncate to fit (existing `max-w-[180px] truncate` preserved).
- Use the same display-user helper as items 012/013 if extracted to `src/lib/display-user.ts`.

## Decisions
- D1 Same display-user helper.
  - {question: Q-7 → C}

### Edge-case probe
- All axes covered by item 013.

## Visual verification
Required viewports: 1920, 1280, 768
Affected routes: /dossiers/[id] (sticky timeline bar)
Manual flow:
  1. Scroll a dossier with workflow entries.
  2. Each sticky-bar step pill shows date + name (or fallback).

## Notes
(populated at dispatch)
