# Loop task ledger — auto-2026-05-22 (second batch)

## Work request

> in the first screenshot when i click comparer, i should be able to zoom in and drag with my mouse, just like how i can do so when i click an image on whatsapp
>
> on the second screenshot, when i click autre in observation in creation de planification, a new field shall pop to enable me to write a custom observation
>
> but in the other observation fields, when i click on autre, the custom obvservation greys out, while it should let me write in the custom observation field since its specified for just that, and when i write in the custom observation field it should be included in the "autre"
>
> whenever i click on modifier in gestion des dossiers inside a dossier and actually start writing, it only allows me to write one letter, and then i have to click on the field to start writing one letter at a time
>
> when a dossier is still stuck at creation step and no planification avant was programmed by the gestionnaire for the agent de terrain, the agent de terrain may still work on it simply by looking up the immatriculation in his search bar and add the pictures without the need of a gestionnaire and make the status update automatically

## Global context

- **Stack**: Next.js 15.5.9 + React 19.2 + Firebase 11.9 + TypeScript 5 + Tailwind.
- **Branch**: continuing on `auto-2026-05-22` (the previous loop's 12 commits are already on it, unpushed).
- **Verify command**: `npm run typecheck`. Outer repo has no `node_modules`; verify via the nested `SL-auto-main/node_modules/.bin/tsc` (same convention every prior task used).
- **Target tree**: outer git repo at `c:\Users\pc\Downloads\SL-auto-main\`.
- **Pre-existing uncommitted modifications** (carried through every prior task untouched): `src/app/(app)/dossiers/client-page.tsx`, `src/app/login/page.tsx`, `src/components/date-range-filter.tsx`, `src/firebase/index.ts`, `src/hooks/use-current-user.tsx`, `src/hooks/use-dossiers.ts`.

## Locked assumptions

- **F1 (zoom/pan)**: reuse `TransformWrapper` + `TransformComponent` from `react-zoom-pan-pinch` (already a dep, see `src/components/document-preview-lightbox.tsx:78-92`). `minScale=1, maxScale=5`, double-click zoom-in, wheel-step 0.2. Images wrap; PDFs continue as `<iframe>`.
- **F2 (Autre custom field)**: when "Autre" preset is picked, expose an enabled textarea adjacent; typed text is saved into the same observation `text` field. For pickers that already disable the textarea on preset selection (`observations-tab.tsx:526,593`), invert the disable rule so it's enabled ONLY when the chosen preset is `'Autre'`.
- **F3 (one-letter typing)**: root cause is `FieldRow` declared inside `InformationTab` function body (`information-tab.tsx:225`) — React recreates the component identity on every keystroke and unmounts the input. Fix: hoist `FieldRow` to module scope, pass `editing` as a prop.
- **F4 (AT direct photo upload)**: add a separate AT-only CTA next to "Nouvelle planification" on `/assignations-atg`; on dossier pick (search dialog mirrors `at-create-planification-flow.tsx`), navigate to `/assignations-atg/{dossierId}?mission=Avant` — the per-dossier ATG view already auto-bumps statut via `maybeAdvanceToExpertise` on first-photo upload.

## Completed

- [x] Information tab — fix one-letter typing bug in Modifier mode (hoist FieldRow) — `60bbadc` (reviewed ✓)
- [x] Comparer panel — zoom + pan for image scans (TransformWrapper) — `1b71e6f` (reviewed ✓)
- [x] "Autre" preset — enable a custom-text textarea adjacent to the picker — `931f395` (reviewed ✓)
- [x] AT direct photo upload — search Création-stuck dossiers + navigate to ATG view — `8db5c9f` (reviewed ✓)
- [x] Admin sees the two AT CTAs on /assignations-atg — `1ab41c3` (reviewed ✓)
- [x] ModalPlanification — hide agent picker and auto-acquire browser location when current user is AT — `0548423` (reviewed ✓)

## Current

_(all 3 follow-up items complete: admin access, hide AT picker, auto-location.)_

## Follow-ups

_(empty)_
