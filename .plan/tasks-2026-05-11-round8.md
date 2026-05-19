# Round 8 — Scoped observations, names-not-emails, lightbox zoom, valider visibility

## Plan lock status: LOCKED 2026-05-11

## Locked answers (from questions.md)
- **Q-1 (custom):** Gestionnaire observations are ALSO context-tagged. When the gestionnaire writes from a planification step (avant/en cours/après), the obs gets `phaseATG=<phase>` and shows in both the dossier step panel AND the AT's ATG view. When gestionnaire writes from an accord step (1er or 2ème ou +), the obs gets `accordSlot=<slot>` and shows in both the dossier step panel AND the chiffreur's chiffrage view. The author's role does NOT drive visibility — the context tag does.
- **Q-2 → A:** Chiffreur compose form has a required "À propos de quel accord ?" Select with options "1er accord" / "2ème accord ou +".
- **Q-3 → A:** AT auto-uses `currentCategory` (active mission tab) as `phaseATG` when writing.
- **Q-4 → A:** Legacy AT obs (no tag) visible in all 3 Plan panels; legacy chiffreur obs in step 6; legacy gestionnaire obs (no tag) visible in all step panels (symmetric extension since gestionnaire obs are now also scoped).
- **Q-5 → B:** Valider button visible to Gestionnaire + Admin + Directeur / Directeur des opérations / Directeur technique.
- **Q-6 → A:** Lightbox X close at top-right.
- **Q-7 → B:** When userNom is missing, display "Utilisateur inconnu" (hides email entirely).
- **Q-8 → A:** Inline X icon inside the SelectTrigger to clear the preset.
- **Q-9 → A:** Lightbox opens fit-to-screen.
- **Q-10 → A:** Zoom controls in a bottom-center floating toolbar.

## Q-1 implications (updates to original plan)
1. Gestionnaire observations are now context-tagged at write time too. Items 005 and 006 must update the ObservationsTab compose flow so writes from those step panels carry the panel's contextPhase/contextAccord as the tag.
2. Item 004 filter logic is context-driven, NOT source-driven. The round-7 cross-role filter is REPLACED by the context filter (chiffreur obs have `accordSlot`, so they naturally never match a `contextPhase` panel; symmetric for AT).
3. The ATG view (item 007) sees ALL obs with matching `phaseATG`, including gestionnaire-written ones (not just AT-source).
4. The chiffrage view filter: when `section='assignations-chiffrage'` and no contextAccord prop set, ObservationsTab shows obs with any `accordSlot` set (plus legacy chiffreur/gestionnaire un-tagged obs). This replaces the round-7 cross-role filter for the chiffrage view.


(Previous Round 7 archive: `tasks-2026-05-11-round7.md`, etc. Round 7 final
review at `final-review-2026-05-11-round7.md`.)

## Work request (verbatim)
> make the observations stay only where they were written, for example, the agent de terrain is in planification avant and he wrote planification avant, it should only show in planification avant in gestion des dossiers, same thing for en cours and apres, and same thing for chiffrage depending wether they were on accord or 2eme accord ou +
>
> the 2eme accord ou + is messed up, lets fix it tomorrow
>
> add a cancel button for when the user accidentally chooses on a observation drop down menu but instead they wanted to add a custom one
>
> the logs should never show emails, only the user names
>
> remove the creation dossier status from the dashboard
>
> the photo shown when i click on it should zoom to the point where it takes the whole screen, with the option to zoom in and out and i should also be able to get out of the lightbox with an x button
>
> i dont see any valider le traitement button

## Global context

- Outer repo: `c:/Users/pc/Downloads/SL-auto-main/` on `auto-2026-04-30`.
- Inner repo: `c:/Users/pc/Downloads/SL-auto-main/SL-auto-main/` on `auto-2026-04-24`.
- Verify: `cd SL-auto-main && npm run typecheck` then `npm run build`.
- Dev: `cd SL-auto-main && npm run dev` (port 9002, turbopack).
- Screenshots: Playwright installed (`test:e2e` script).
- Commit policy: inner repo first, then outer pointer bump. Never push.

## Locked assumptions

A1: On both branches already. Don't create new ones.
A2: 2ème accord ou + (step 11) is broken upstream — explicitly deferred by user.
   Items in this round must still TAG chiffreur observations with their
   accord context (so future fix surfaces them correctly), but the step-11
   panel filtering and UI is OUT OF SCOPE for this round.
A3: react-zoom-pan-pinch 4.0.3 is installed but unused — use it for the
   lightbox zoom feature.
A4: The dossier-view ObservationsTab renders are at lines 192/200/211/225
   of `src/app/(app)/dossiers/[id]/page.tsx`. These were added in earlier
   rounds and ALL currently show every observation (no filtering).

## Shared invariants
- I1: Outfit font + cream/teal palette; no shadcn-blue; no fixed 100vh.
- I2: Responsive @ 1920, 1280, 768, 375.
- I3: French UI; user-visible copy mirrors existing tone.
- I4: Don't touch Firestore init in `src/firebase/index.ts`.
- I5: Don't touch chiffrage cardinal `+` gating (per memory).
- I6: New roles enum is name-driven (canDelete by name).
- I7: 2ème accord (step 11) display is OUT OF SCOPE this round.

## Pre-mortem
1. **Chiffreur observation context.** The chiffreur writes from the
   assignations-chiffrage detail page, which has no current-accord state.
   We need a way to attach `accordSlot` at write time. Covered by Q-2.
2. **Legacy observations.** Existing obs have no `phaseATG` / `accordSlot`
   tags. We must decide where they appear. Covered by Q-4.
3. **Gestionnaire observations.** Gestionnaire writes from the
   `section='dossiers'` panels. They typically aren't tied to a phase or
   accord. We must decide their visibility scope. Covered by Q-1.
4. **"Valider le traitement" not seen.** User reports the button is invisible
   to them. Most likely the test user isn't a Gestionnaire (per the strict
   role gate in item 014 of round 7). Item 020 of this round expands the
   role check; Q-5 confirms the expansion target.
5. **logHistorique/logWorkflow don't persist user name** today. Replacing
   email display with name requires either (a) extending these writers to
   store `userNom`, or (b) joining via the user collection at read time. (a)
   is the simpler path. Q-7 picks the fallback when name is missing.
6. **react-zoom-pan-pinch in dialogs** — wrapper components need their own
   width/height so they fill the dialog. Risk of layout breakage. Mitigated
   by item-by-item visual verification.

## Checklist

### Cluster A — Observation context + scoping
- [ ] 001 — Extend `addObservation` signature with optional `phaseATG` and `accordSlot` fields [behavioral] → items/001-addobservation-ctx.md
- [ ] 002 — Pass `phaseATG` from assignations-atg view (currentCategory) into ObservationsTab + addObservation [behavioral] → items/002-atg-tag-phase.md
- [ ] 003 — Pass `accordSlot` from assignations-chiffrage view (via compose-form select) into addObservation [behavioral] → items/003-chiffreur-tag-slot.md
- [ ] 004 — ObservationsTab gains optional `contextPhase` and `contextAccord` props that filter the rendered list [behavioral] → items/004-obs-tab-context-filter.md
- [ ] 005 — Wire `contextPhase` into the dossier-view step-4/9/10 panels [visual+behavioral] → items/005-dossier-step-phase-wire.md
- [ ] 006 — Wire `contextAccord='1er accord'` into the dossier-view step-6 panel [visual+behavioral] → items/006-dossier-step-accord-wire.md
- [ ] 007 — Wire `contextPhase` into the assignations-atg ObservationsTab so AT only sees their own current-phase obs [behavioral] → items/007-atg-view-filter.md

### Cluster B — Compose-form polish
- [ ] 008 — Add a cancel/clear (X) affordance to the observation preset Select [visual+behavioral] → items/008-obs-cancel-button.md
- [ ] 009 — Expand "Valider le traitement" button visibility to Admin + Directeur family [behavioral] → items/009-valider-visibility.md

### Cluster C — Names not emails in logs
- [ ] 010 — Extend `logHistorique` and `logWorkflow` to persist `userNom` alongside `user` (email) [behavioral] → items/010-log-writers-name.md
- [ ] 011 — Update all `logHistorique`/`logWorkflow` call sites to pass the user's display name [behavioral] → items/011-log-callsites-name.md
- [ ] 012 — `historique-tab.tsx` timeline entries render name (with fallback per Q-7) [visual] → items/012-historique-name-display.md
- [ ] 013 — `timeline.tsx` step header stamps render name [visual] → items/013-timeline-section-name.md
- [ ] 014 — `timeline-bar.tsx` sticky-bar stamps render name [visual] → items/014-timelinebar-name.md

### Cluster D — Dashboard
- [ ] 015 — Remove "Création dossier" entry from the dashboard status panel [visual] → items/015-dashboard-remove-creation.md

### Cluster E — Photo lightbox: zoom + X close
- [ ] 016 — `photos-tab.tsx` lightbox: integrate `react-zoom-pan-pinch` (zoom in/out + pan) + add explicit X close button [visual+behavioral] → items/016-lightbox-zoom.md

## Deferred decisions
(populated during execution)

## Follow-ups
(populated during execution)

## Amendment log
(populated during execution)
