# Suivi d'équipe — round 3 (cumulative counts, non-réalisé, redirect-to-step)

## Work request

> if i click on rapport valide card for example and show me the list of the dossiers in that step, instead of taking me to the top of the page of the dossier in gestion des dossiers, it should actually take me into the step where the validation rapport is, basically i should be redirected to the step of what each card represents
>
> when a mission is created, its a +1 in the mission creees card, when the agent de terrain adds photos avant, then its a +1 towards the photos avant card, but for example when the same dossier that had photos avant went to chiffrage and the chiffreur gave either his accord or proposition, the +1 that was in the expertise avant card shouldnt dissapear, the end goal is that when a dossier is fully treated, for example theres 100 missions creees, then all the other cards should reach 100 too, meaning that work is finished
>
> add back the "non realisé" part in each card, so for example if currently theres 15 missions creees, and 10 of them didnt have the accord it should show 10 non realise in the accord card, and when the user clicks on that part it should show them all the dossiers that dont have the accord
>
> lets say there are 15 missions creees, 15 of them had 1er accord, but all of them had to have the + button clicked and making room for a 2eme accord, meaning the chiffreur still has to work and give the accord, but the card would give the impression that the work is complete, so whenever the + button is clicked in piece jointes from gestion des dossiers, the count should reset in accord, not to 0, but depending on how many dossiers had a + sign clicked on, so for example theres only one dossier cree, it went to chiffrage and the chiffreur gave 1er accord, the accord card had a +1, when the gestionnarie clicked on the + sign from gestion des dossiers, meaning the chiffreur has more work to do, the +1 from the accrd card should reset and wait for the chiffreur to give 2eme accord, same thing for proposition by the way, its just that they all fall under one card in suivi d'equipe
>
> in suivi d'equipe, in par utilisateur, show me all the users and not only the ones that had done something, even the others did nothing, show zero on each cell, add a filter to search per username

## Global context

- Stack: Next.js 14 (app router) + Firestore + React + TypeScript + Tailwind. Firebase Hosting.
- Branch: `auto-2026-04-24` (continuing the existing loop branch; prior loop completed at `be0643a`).
- Verify command: `npx tsc --noEmit` from inside `SL-auto-main/`.
- Files in scope:
  - `src/app/(app)/monitoring/funnel.ts` (drop date filter for non-creation steps; accord uses current statut)
  - `src/app/(app)/monitoring/page.tsx` (KpiCard split into réalisé+non-réalisé buttons; show all users; username search)
  - `src/app/(app)/monitoring/dossier-drawer.tsx` (router push with `#step-N` hash)
  - The dossier timeline at `src/components/dossier-timeline/timeline.tsx` already has `<section id="step-N">` anchors and `scroll-mt-24` so a hash navigation will scroll naturally.
- Out of scope: changing the dossier timeline itself; introducing a new "Facture" step in the timeline (no separate facture step today — funnel "Facture validée" card maps to step 7 Rapport).

## Locked assumptions

- **Funnel step → dossier timeline step** for the redirect:
  - `creation` → step 3 (Information)
  - `photosAvant`, `photosEnCours`, `photosApres` → step 5 (Pièces jointes)
  - `accord` → step 6 (Chiffrage)
  - `facture` → step 7 (Rapport — facturation lives here, no separate step)
  - `rapportValide`, `rapport` → step 7 (Rapport)
- **Cumulative semantics**: for steps `creation`, `photosAvant`, `photosEnCours`, `photosApres`, `facture`, `rapportValide`, `rapport` — once a dossier crosses the step, it stays counted regardless of date range. Drop `inRange` filter for these.
- **Accord uses CURRENT state**: `accord` card counts dossiers whose current `statut` is in `ACCORD_BUCKET_MEMBERS`. The + button (in pièces jointes / typed-documents-grid) sets `statut = 'Chiffrage en cours'`, which naturally drops the count until the chiffreur saves the next cardinal accord. No separate "+ counter" needed; the existing logic already handles this once the date filter is removed.
- **Date range filter on the page**: keep applied to the per-utilisateur "did what when" computation only. Steps and per-compagnie become cumulative.
- **Non réalisé per card** = `totalDossiersInScope - réalisé`. Click on the non-réalisé portion → drawer with the dossiers that have NOT done that step. (Step 1 Création has no non-réalisé since it's the total.)
- **Show all users**: the per-utilisateur table includes every user from the `users` collection (not just authors that touched dossiers). Users with no activity show all zeros.
- **Username search**: add a text input above the per-user table that filters rows by display name (case-insensitive contains).

## Completed

- [x] **cumulative-step-counts** — Drop date-range filter from step counts + drill-down drawer — `16342f6`
- [x] **drawer-redirect-to-step** — Drawer row click lands on the matching step inside the dossier — `4a1d619`
- [x] **non-realise-per-card** — Add non-réalisé sub-section to each KPI card with click-through — `a33f755`
- [x] **all-users-and-username-search** — Show every user in Par utilisateur + username search — `ddfa952`

## Current

## Follow-ups
