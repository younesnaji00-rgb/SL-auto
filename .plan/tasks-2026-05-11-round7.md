# Round 7 — Deadlines, observations, photos, roles, dates clés, pièces jointes

## Plan lock status: LOCKED 2026-05-11

(Previous Round 6 tasks archived to `.plan/tasks-2026-05-11-round6.md`.)

The user answered all questions in `questions.md`. Decisions are baked into
each item file. The deep plan + context lives at
`C:/Users/pc/.claude/plans/you-are-driving-an-zany-valiant.md`. This file
is the running index + log.

## Work request (verbatim)
See main plan file. 25 items total (24 original + new item 025 for
admin-editable holidays).

## Global context
- Outer repo: `c:/Users/pc/Downloads/SL-auto-main/` on branch `auto-2026-04-30`
- Inner repo: `c:/Users/pc/Downloads/SL-auto-main/SL-auto-main/` on branch `auto-2026-04-24`
- Verify command: `cd SL-auto-main && npm run typecheck`
- Build command: `cd SL-auto-main && npm run build`
- Dev: `cd SL-auto-main && npm run dev` (port 9002, turbopack)
- Screenshots: Playwright installed (test:e2e script)
- Commit policy: each item commits in BOTH repos. Inner first
  (`auto-2026-04-24`), then outer (`auto-2026-04-30`) to bump the
  submodule pointer. Never push.

## Locked assumptions

A1: Already on the correct branches — don't create new ones.
A2: Roles are added by name in Firestore `options_roles` (gear icon
   in Utilisateurs page). Permissions must be wired by name so new
   roles work — see item 011.
A3: All new business-day code is a pure module; consumers wrap their
   existing `Date.now() - X` computations.

## Shared invariants
- I1: Outfit font + cream/teal palette; no shadcn-blue; no fixed 100vh
- I2: Responsive @ 1920, 1280, 768, 375
- I3: French UI, Moroccan phone format, no placeholder names
- I4: Don't touch Firestore init in `src/firebase/index.ts`
- I5: Don't touch chiffrage cardinal `+` gating
- I6: New roles require explicit permission wiring (canDelete is name-driven)
- I7: Date-key updates denormalize to parent dossier doc

## Pre-mortem
1. Holiday list may go stale yearly → mitigated by item 025 (admin UI)
2. Permissions are name-driven → renaming a role in `options_roles`
   would silently break gating. Documented but accepted.
3. AI-scan schema change touches multiple endpoints — keep date-only
   extraction working when source doc has no time.
4. Per-observation `traitementValide` writes may race (last-write-wins
   acceptable — flag is forward-only/idempotent).
5. Lightbox + photo cap both touch `photos-tab.tsx` — sequence: 019 then 020.
6. Observation visibility filters: must manually verify per-role at the end.

## Checklist

### Cluster A — Business-day deadline counter
- [ ] 001 — Create `src/lib/business-days.ts` utility [behavioral] → items/001-business-days-util.md
- [ ] 002 — Business-day SLA in monitoring funnel [behavioral] → items/002-funnel-sla.md
- [ ] 003 — Business-day SLA in assignations-chiffrage [behavioral] → items/003-chiffrage-sla.md
- [ ] 004 — Business-day SLA in assignations-atg [behavioral] → items/004-atg-sla.md
- [ ] 025 — Holidays settings UI (admin-editable) [visual+behavioral] → items/025-holidays-settings.md

### Cluster B — Dates clés with time
- [ ] 005 — AI scan extracts optional time + persist `<field>TimeKnown` [behavioral] → items/005-scan-time.md
- [ ] 006 — Dates clés render `--/--` when time unknown [visual] → items/006-dates-display.md
- [ ] 007 — Inline edit date/time in dates clés [visual+behavioral] → items/007-dates-edit.md

### Cluster C — Historique + Timeline
- [ ] 008 — Rename "Date mission ATG" → "Date mission AT" [mechanical] → items/008-rename-atg.md
- [ ] 009 — Reorder dates clés rows [visual] → items/009-dates-reorder.md
- [ ] 010 — TimelineBar stamps under each step [visual] → items/010-timelinebar-stamps.md

### Cluster D — Roles + delete-gating
- [ ] 011 — Wire role-name-driven permissions + canDelete [behavioral] → items/011-canDelete.md
- [ ] 012 — Gate all delete buttons with canDelete [behavioral] → items/012-delete-gates.md

### Cluster E — Observations
- [ ] 013 — Observations tab: free-text custom input (XOR with preset) [visual+behavioral] → items/013-obs-customtext.md
- [ ] 014 — Per-observation "Valider le traitement" button (gestionnaire) [visual+behavioral] → items/014-valider-button.md
- [ ] 015 — Per-observation validated indicator + proof upload in chiffrage view [visual+behavioral] → items/015-chiffrage-proof.md
- [ ] 016 — Per-observation validated indicator + proof upload in ATG view [visual+behavioral] → items/016-atg-proof.md
- [ ] 017 — Chiffreur obs hidden from AT; tag `accordSlot` + surface in editor [behavioral] → items/017-chiffreur-obs-vis.md
- [ ] 018 — AT obs hidden from chiffreur; tag phase + surface in planification [behavioral] → items/018-atg-obs-vis.md

### Cluster F — Photos
- [ ] 019 — Lightbox fullscreen + ←/→ navigation [visual] → items/019-lightbox.md
- [ ] 020 — 30-photo cap per section + count badge [behavioral] → items/020-photo-cap.md
- [ ] 021 — Proposition réforme button in ATG → cap = 60 [visual+behavioral] → items/021-reforme.md

### Cluster G — Pièces jointes
- [ ] 022 — Add optional "Autre" slot [visual+behavioral] → items/022-autre-slot.md
- [ ] 023 — Disable Assigner-au-chiffrage until 7 required slots filled [behavioral] → items/023-assigner-gate.md

### Cluster H — User creation
- [ ] 024 — Add Sites multi-select to user form [visual+behavioral] → items/024-sites.md

## Deferred decisions
(populated during execution)

## Follow-ups
(populated during execution)

## Amendment log
(populated during execution)
