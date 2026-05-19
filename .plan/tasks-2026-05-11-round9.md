# Round 9 — Clickable users, observation X overlap, per-slot Éditer, lightbox fit

## Plan lock status: LOCKED 2026-05-11 (round 9)

## Locked answers
- **Q-1 (custom):** Always show the user when filtering by email — no
  "no-match" banner is needed because all current users have names and
  going forward `nom` is mandatory on user creation. If somehow no user
  matches the email, the existing empty state is fine.
- **Q-2 → B:** Per-slot Éditer button sits BELOW the "En attente de
  chiffrage" text.

## Q-1 implication: validate `nom` required on user EDIT form too
The create form already enforces `nom.min(1)`. Verify the edit form at
`src/app/(app)/utilisateurs/[uid]/page.tsx` does the same. Add a small
item 007 to plug any gap (renders as a bonus follow-up if already
correct).

(Previous Round 8 archive: `tasks-2026-05-11-round8.md`. Round 8 ran 16 items
covering context-scoped observations, names-not-emails, lightbox zoom, valider
visibility, dashboard cleanup.)

## Work request (verbatim)
> if theres utilisateur inconnu, then there should be an option to click on the text and it will redirect me to utilisateurs and show me where they're located at
>
> the cancel observation button overlaps with the dropdown menu button
>
> instead of there being a universal "editer web" button in assignation chiffrage, and to reduce confusion, add a editer button on every card slot thats pending chiffrage in assignation chiffrage, and whatever the chiffreur edit it shall show in the gestionnaire, show exactly what type of document did the chiffreur edit
>
> the fit to screen button doesn't work when i click on an individual photo and get redirected to the lightbox window

## Global context
- Outer repo: `c:/Users/pc/Downloads/SL-auto-main/` on `auto-2026-04-30`.
- Inner repo: `c:/Users/pc/Downloads/SL-auto-main/SL-auto-main/` on `auto-2026-04-24`.
- Verify: `cd SL-auto-main && npm run typecheck && npm run build`.
- Dev: `cd SL-auto-main && npm run dev` (port 9002).
- Commit: inner first, then outer pointer bump. Never push.

## Locked assumptions
- A1: All clickable user-name surfaces have an email available
  (entry.user, stamp.user). Exception: modal-planification-history.tsx
  stores only `modifiedBy` UID, no email — that one stays unlinked this
  round.
- A2: react-zoom-pan-pinch 4.0.3 exposes `centerView()` and the
  `TransformWrapper` ref API. Will verify in code at item D-1 time.
- A3: Per-slot Éditer button only appears on pending accord/proposition
  slots (empty `docs` or all-pending-upload), matching the user's
  "thats pending chiffrage" wording.

## Shared invariants
- I1: Outfit font + cream/teal palette; no shadcn-blue.
- I2: Responsive 1920/1280/768/375.
- I3: Don't touch Firestore init.
- I4: Don't touch chiffrage cardinal `+` gating.
- I5: Step 11 (2ème accord ou +) is still deferred from round 8 ("fix it
  tomorrow"). Items here MUST NOT depend on step-11 fixes.

## Pre-mortem
1. **Email → user matching may miss** in `/utilisateurs` for legacy logs
   where the email is now stale or the user was deleted. Q-1 handles this.
2. **Cancel X positioning is sensitive** to Select trigger's chevron
   width. Easy regression. Mitigated by visual check.
3. **Per-slot Éditer button rendering inside SlotCard** requires
   threading a new optional prop from FamilyRow → SlotCard, similar to
   the existing onCreateNextCardinal pattern.
4. **Showing chiffreur edits in historique** is a one-line filter
   change but expands what entries the gestionnaire sees by default —
   could feel noisy. Worth ensuring it's clearly differentiated
   (already differentiated by `type === 'document'` vs `'statut'`).
5. **Lightbox fit-to-screen fix** may interact with the existing
   zoom/pan state and the photo-navigation reset (key-prop). Risk of
   accidentally breaking arrow-key navigation. Tested manually after.

## Checklist

### Cluster A — Clickable user names (Utilisateur inconnu redirect)
- [ ] 001 — `/utilisateurs` list reads `?email=` query param and filters [behavioral] → items/001-utilisateurs-email-filter.md
- [ ] 002 — Wrap user-name text in `timeline.tsx`, `timeline-bar.tsx`, `historique-tab.tsx` with `<Link>` to `/utilisateurs?email=…` [visual+behavioral] → items/002-user-name-links.md

### Cluster B — Observation cancel-X overlap
- [ ] 003 — Reposition the cancel X inside the preset SelectTrigger so it stops overlapping the chevron [visual] → items/003-obs-cancel-x-position.md

### Cluster C — Per-slot Éditer button + chiffreur-edit visibility
- [ ] 004 — Replace the universal "Éditer web" button on assignations-chiffrage with a per-slot "Éditer" button on each pending accord/proposition slot [visual+behavioral] → items/004-per-slot-editer.md
- [ ] 005 — Include `type === 'document'` entries in the gestionnaire's historique tab timeline so chiffreur saves (with their exact doc type) are visible [visual] → items/005-historique-chiffreur-edits.md

### Cluster D — Lightbox fit-to-screen
- [ ] 006 — Fix the Maximize2 (fit-to-screen) button so it actually re-fits the photo using `centerView()` from a TransformWrapper ref [behavioral] → items/006-lightbox-fit.md

### Cluster E — User-form `nom` required (Q-1 implication)
- [ ] 007 — Confirm/enforce `nom` required on user EDIT form [behavioral] → inline (see Locked answers)

## Deferred decisions
(populated during execution)

## Follow-ups
(populated during execution)

## Amendment log
(populated during execution)
