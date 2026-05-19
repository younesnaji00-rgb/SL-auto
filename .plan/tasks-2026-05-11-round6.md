# Round 6 — Suivi d'équipe layout fix + timeline order, planif dropdowns, 2ème accord step, PJ split

## Work request

> in suivi d'equipe, each bar should have its own horizontal column,
> and the date filter should actually work, when i clicked on the jour button to see the stats for today, i still showed me all 15 missions, meanwhile i created none today, but this should only be for en delai, but for hors delai or non realise, it should show everything no matter what day filter im on
>
> in gestion des dossiers, the order of the timeline is messed up, step one is creation de mission and it jumps straight to planification which is step 4
> this is the correct order:
> 1- creation de mission
> 2- planification avant
> 3- accord
> 4- planification en cours
> 5- 2eme accord +
> 6- planification apres
> 7- rapport
> 8- note d'honoraire
>
> in creation de mission it should have the file picker option to let the ai scan the dropped picture as well as the informations tab and the pieces jointes tab, basically where additional documents are imported
>
> since step 5 would be in creation de mission then theres no need to keep it there
>
> step 2 would be planification avant, since its obvious that its avant then theres no need to keep the dropdown menu when creating a planification to choose which type of RDV, it should default to avant
>
> after that would be accord, and you'll have to cut and paste the three rows which are devis garage, facture garage, and reforme cards from the importer un document in pieces jointes, but for this step 3 specifically there will not be an option for having those pimple like buttons in devis and facture accrode or propose, but if the gestionnaire clicks the button thats in propose or accord, then the newly added card in the ordinal order which in this case will be 2eme shall populate straight to step 5
>
> step 4 would be planification en cours, same thing as step 3, it should always default to RDV en cours
>
> step 5- 2eme accord +, this is after the gestionnaire clicks on the plus button next to proposition or accord, if they do so, the newly added card shall populate in this step, and through this new card they can infinitely add new cards depending on the ordinal order but only if the chiffreur is actually catching up, so basically the first 2 rows of pieces jointes will be split from pieces jointes and will only be reserved to accord and 2eme accord +, and these two rows will further be split into two parts, the 1er accord and proposition and 2 eme accord and proposition, 1er for step 3 and 2 eme and so on for step 5
>
> step 6 is planification apres and its for photos apres so no need to have the type de RDV dropdown again
>
> step 7 is the part where to rapport gets validated and generated
>
> step 8 should be a placeholder for now

## Global context

- **Stack**: Next.js 15 (App Router, turbopack) · React 19 · TypeScript · Firebase 11 · Tailwind · Radix UI · recharts · Genkit AI.
- **Repo layout**: outer wrapper repo at `c:/Users/pc/Downloads/SL-auto-main/`; inner Next.js app is a **nested git repo** at `SL-auto-main/`.
- **Outer branch**: `auto-2026-04-30`. **Inner branch**: `auto-2026-04-24`. Continuing the round-5 loop branches (round 5 history archived to `.plan/tasks-2026-05-06.md`).
- **Verify command**: `cd SL-auto-main && npm run typecheck` (run from outer repo root).
- **Commit policy**: each task makes commits in BOTH repos with matching `[short-tag] description` messages — first inside the inner repo on `auto-2026-04-24`, then in the outer repo on `auto-2026-04-30` to bump the inner pointer. Never push, never force-push.

## Locked assumptions

- **Suivi d'équipe bars (per-step KPI card)** — already 3 separate `KpiBarRow`s in `monitoring/page.tsx`. User wants each bar in its own row visually distinct (current implementation may need spacing / size tweaks to look like the AskUserQuestion preview: full-width bar with label trailing). To be confirmed task-by-task.
- **Date filter scope** — jour/semaine/mois affect ONLY the green "en délai" count. Hors-délai and non-réalisé show all-time totals. `funnel.ts` already implements this: `computeStepCounts(dossiers, range)` filters by range; `computeStepCountsHorsDelai(dossiers)` and `computeStepCountsRealiseAllTime(dossiers)` ignore range. If user reports filter "doesn't work", investigation needed before code change.
- **Timeline render order** — currently `timeline.tsx:132` sorts steps by numeric `id` ascending, producing 1→4→5→6→7→8→9→10 (jumping past Plan en cours and Photos après to Rapport/Note d'honoraire prematurely). The `DOSSIER_TIMELINE_STEPS` array is already authored in the desired visual order [1, 4, 5, 6, 9, 10, 7, 8]. Fix = render in array order, not by `id`.
- **Final desired timeline (8 steps)** — 1=Création · 2=Plan avant · 3=Accord · 4=Plan en cours · 5=2ème accord+ (NEW) · 6=Plan après · 7=Rapport · 8=Note d'honoraire (placeholder, already exists).
- **Step 1 PJ scope** — embeds full Pièces Jointes tab MINUS devis-garage and facture-garage rows (which move to steps 3 and 5). Photos avant/en-cours/après remain in their planification steps (already done in round 5).
- **Steps 2/4/6 planification dropdown** — RDV type dropdown removed in `modal-planification.tsx`; defaults Avant/En cours/Après per source step (steps already typeFilter-scoped from round 5).
- **Step 3 (Accord)** — receives 1er accord + 1er proposition cardinal slots for devis-garage + facture-garage + reforme cards. Cardinal "+" button on devis/facture, when clicked, spawns the next cardinal in step 5 (NOT in step 3).
- **Step 5 (2ème accord+)** — NEW step, contains 2ème (and 3ème, 4ème, …) cardinals for devis-garage + facture-garage. Chains indefinitely.
- **Step 8 (Note d'honoraire)** — already exists as empty placeholder from round 5 commit `b3d3a2d` / `d3f4459`.

## Completed

- [x] **[timeline-no-sort-by-id] Render timeline steps in array order, not by numeric id** — inner `448d4bd`, outer `332e38b` (single-line change to `timeline.tsx:132`; typecheck clean)
- [x] **[plan-modal-default-type-mission] Hide Type de RDV dropdown when modal opens from typeFilter-scoped step** — inner `53b48cc`, outer `04ddf26` (4 files +28/-23; modal hides dropdown via grid-cols-1, typeFilter propagates through PlanificationTab/Step3Planification/page.tsx; typecheck clean)
- [x] **[timeline-step10-rename-photos-apres] Rename step 10 label "Photos après" → "Planification après"** — inner `f509e1f`, outer `514482a` (single-line label change; typecheck clean)
- [x] **[timeline-fold-pieces-into-step1] Fold Pièces jointes into step 1 and remove standalone step 5** — inner `0cd5546`, outer `c372208` (3 files; Step4Pieces gains `hidePhotos`, embedded in step 1, standalone step 5 removed; typecheck clean)
- [x] **[timeline-add-2eme-accord-step] Add "2ème accord et +" placeholder step (id=11)** — inner `a11b3f7`, outer `997c39c` (2 files; new section between Plan en cours and Plan après with dashed-border placeholder div; typecheck clean)
- [x] **[timeline-step11-align-placeholder-style] Align step 11 placeholder with step 8 styling** — inner `04b7275`, outer `ddc8d98` (page.tsx +3/-2; step 11 now uses centered card with title+subtitle matching step 8; typecheck clean)
- [x] **[timeline-step-keywords-remove-dead-pieces] Remove dead STEP_KEYWORDS entry for removed step 5** — inner `0b456a1`, outer `a5d089c` (1-line delete; typecheck clean)
- [x] **[typed-docs-grid-hide-accord-slots-in-step1] Hide Devis/Facture/Réforme sections from step 1 PJ** — inner `a4786b1`, outer `858d566` (3 files; new `hideAccordSlots` prop threaded through page.tsx → Step4Pieces → TypedDocumentsGrid; typecheck clean)
- [x] **[chiffrage-cardinal-filter-split-step6-step11] Filter Step5Chiffrage rows by cardinal ordinal across steps 6 and 11** — inner `ada1a39`, outer `a1478b8` (2 files; new `cardinalFilter` prop with `parseAccordDocType`-based row filter; step 6 now `1-only`, step 11 placeholder replaced with `Step5Chiffrage cardinalFilter="2-plus"`; typecheck clean)
- [x] **[typed-docs-grid-show-only-accord-slots-in-step6] Surface devis/facture/reforme upload slots in step 6 via showOnlyAccordSlots prop** — inner `08e7d7d`, outer `3d16104` (3 files; new `showOnlyAccordSlots` prop hides Rapport+Autres sections in step 6's TypedDocumentsGrid render, exposing devis/facture/reforme upload affordance; typecheck clean)
- [x] **[slot-card-hide-cardinal-plus-in-step6] Hide cardinal+ pimple button in step 6 via hideCardinalPlus prop** — inner `cae8bd6`, outer `01a6a45` (5 files; threaded `hideCardinalPlus` through SlotCard → FamilyRow → TypedDocumentsGrid → Step4Pieces → step 6 page.tsx; extra-slot pimple+ for base devis garage 2 creation unaffected; typecheck clean)
- [x] **[timeline-badges-show-position] Show 1-8 positional numbers on timeline badges, not internal step ids** — inner `56f346b`, outer `7502a87` (2 files; TimelineSection gains `position` prop, TimelineBar maps `idx+1`; also fixed `isPast` comparison to use array index instead of numeric id; typecheck clean)

## Current

(empty — next iteration discovers fresh)

## Follow-ups

- (round 5 follow-ups carried over — see `.plan/tasks-2026-05-06.md`)
