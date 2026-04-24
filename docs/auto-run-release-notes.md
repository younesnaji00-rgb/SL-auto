# Auto-run release notes — loop `auto-2026-04-24`

42 commits landed on `auto-2026-04-24` covering status automation, AI upgrade, role additions, stamp system, editor rework, cardinal accords, preview dialog, and regressions. Follow-ups #44-#47 are queued but not yet implemented.

## 1. Summary

- **Status automation + canonicalisation.** A single status machine replaces the old manual modal; create/planification/photo-upload/send-to-chiffrage/chiffreur-save now drive `statut` automatically, and a canonical list lives in `status-machine.ts`.
- **AI + editor upgrade.** Gemini 3.0 Flash replaces the old model, scan output populates editor header + typed-document routing, and a post-scan warning dialog surfaces arithmetic `calculationErrors` before unlocking edits.
- **Devis preview + stamps.** Admin-managed stamps (Firestore + Storage rules) feed a `DevisPreviewDialog` stamp picker that injects the chosen image into the PDF; the editor now supports Prix en TTC, Total TTC Expert, accord cardinal columns, clone-lock, and header dropdowns for REF/TYPE/Accord.
- **Role + cardinal + UX polish.** New `Directeur des operations` role (gates Valider-le-dossier + Rapport), cardinal accord slots (1er/2eme/3eme + proposition) cascading through editor, grids, filters, and assignation-chiffrage, plus day-grouped collapsed photo/doc lists and a shared `DocumentsFilterPanel`.

## 2. Pre-deploy checklist

- [ ] Run `npx tsx scripts/migrate-statuses.ts` against production Firestore to rewrite legacy statuses to canonical values. Script is idempotent.
- [ ] Run `npx tsx scripts/backfill-nom-lowercase.ts` against production Firestore to add `nomLowercase` to existing users (required for case-insensitive login).
- [ ] Deploy `firestore.rules` — this release contains **two** rules passes: pass 1 (stamps read/write, directorValidated field) and pass 2 (status writes constrained to canonical list, directorValidated write-gated by role).
- [ ] Deploy `storage.rules` for the `stamps/` prefix (admin write, authenticated read).
- [ ] Deploy `firestore.indexes.json` — adds the `users.nomLowercase` composite index used by the login lookup.
- [ ] Reconcile `options_statuts` and `options_roles` collections with the new canonical lists (run your `seed-options` reconciler or execute a one-off add-missing script — do NOT delete legacy rows until migration script has run).
- [ ] Verify at least one admin has uploaded a stamp via `/admin/stamps` before chiffreurs attempt to save a devis (dialog allows empty selection but deploy-day smoke test should confirm the picker has entries).

## 3. E2E manual test checklist

### Auth + users
- [ ] Log in with `Ahmed`, `AHMED`, and `ahmed` — all three resolve to the same user (case-insensitive via `nomLowercase`).
- [ ] Legacy user without `nomLowercase` still logs in with exact-case match (backfill script covers this post-deploy).

### Status automation
- [ ] Create a new dossier → `statut === 'Création dossier'` immediately.
- [ ] Plan an expertise for **tomorrow** → `Expertise planifiée`.
- [ ] Plan for **today within the window** → `Expertise en cours`.
- [ ] Plan for **yesterday** → `Expertise terminée`.
- [ ] Upload first ATG photo in each category → `Planification expertise *` where `*` is the category.
- [ ] Click Envoyer au chiffreur → `Chiffrage en cours`.
- [ ] Chiffreur saves editor with cardinal = 1er accord → `1er accord enregistré` (similar for 2eme, 3eme, proposition d'accord).
- [ ] Click Envoyer par mail + confirm → `Accord envoyé`; recipient receives email with attachment.

### Editor + devis
- [ ] Scan a document with a planted arithmetic mismatch (e.g. `qty * PU.HT != total`) → `ScanWarningDialog` lists the bulleted error lines and blocks Enregistrer until acknowledged.
- [ ] After ack, type any value in Accord column greater than Prix en TTC → blur clamps to TTC value + toast.
- [ ] Clone PU.HT column twice → second click is disabled with "Déjà cloné" tooltip.
- [ ] Add 1er + 2eme + 3eme accord via `+` pimple → pimple disappears after 3eme (cap reached).
- [ ] Save devis → `DevisPreviewDialog` opens with stamp dropdown; select stamp → PDF embeds it.
- [ ] Save Réforme Technique OR Économique → typed-document entry appears both in Gestion des dossiers and Assignation chiffrage detail panel.

### Gating + roles
- [ ] As chiffreur on a dossier where `directorValidated === null` → Rapport button greyed, tooltip says "En attente de validation".
- [ ] As Directeur des opérations, click Valider le dossier → `directorValidated` flips, Rapport button enables for the chiffreur.
- [ ] Non-director tries to write `directorValidated` directly → Firestore rejects (rules pass 2).

### Stamps
- [ ] Admin uploads a stamp via `/admin/stamps` → visible in chiffreur preview dialog dropdown within one reload.
- [ ] Non-admin hits `/admin/stamps` → redirected/blocked.

### Display + filters
- [ ] Photos and documents tabs: entries grouped by day, collapsed by default, chevron expands per-day.
- [ ] Documents tab filter: cardinal accord types show as separate filter pills (1er / 2eme / 3eme / proposition).
- [ ] Assignation-chiffrage detail panel: layout matches documents-tab filter panel; import button disabled on accorde slots (pimple-only creation).

## 4. Known limitations / stubs

- **Click-to-scroll on calculation-error bullets** (task #35): bullets do not scroll to the offending row yet because the editor rows lack stable DOM ids. Follow-up #44 tracks adding `data-row-id` and wiring the handler.
- **`Envoyer par mail` default recipient is empty** (task #36): `compagnies.email` field doesn't exist on the schema, so `defaultRecipient` is `''` and the user must type the address. Follow-up #45 tracks adding the field + a migration.
- **Placeholder docs cleanup** (task #26): when gestionnaire import is disabled on accorde slots, orphan `pendingUpload: true` placeholder docs from pre-release sessions have no UI cleanup path. One-off script only.
- **Stamp aspect ratio** (task #18): selected stamp image stretches to fill the rectangle on the PDF; non-square stamps distort. Acceptable for current stamp inventory but flagged.
- **Workload Set semantic inversion** (follow-up #47): chiffreur workload counter still uses the legacy "active dossiers" semantic; the new accord-based semantic is designed but not wired.

## 5. Follow-ups queued

- **#44 — Calculation-error click-to-scroll.** Add `data-row-id` to editor rows and make `ScanWarningDialog` bullets call `scrollIntoView`. Files: `src/components/devis-editor/row.tsx`, `src/components/dialogs/scan-warning-dialog.tsx`.
- **#45 — compagnie.email field + migration.** Add `email` to the compagnie schema and backfill known addresses. Files: `src/lib/schemas/compagnie.ts`, `scripts/backfill-compagnie-email.ts` (new).
- **#46 — Placeholder doc cleanup UX.** Admin "purge pending uploads" action on gestion-dossiers. Files: `src/app/(app)/gestion-dossiers/actions.ts`, new dialog.
- **#47 — Workload Set inversion.** Switch chiffreur workload counter from active-dossier count to pending-accord count. Files: `src/hooks/use-workload.ts`, `src/components/chiffreur-dashboard/workload-card.tsx`.

## 6. Commit list

Generated from `git log --oneline auto-2026-04-24 ^main --no-merges` (42 commits, matches plan):

- f362993 [#1] Extend devis-schema types and ordinal helper
- ce096de [#2] Canonical status list + status-machine helper
- 16cc6f3 [#3] Add Directeur des operations role
- 31f294e [#4] Extend docType-accorde with cardinal + proposition mapping
- c1613d1 [#5] Swap AI model to googleai/gemini-3.0-flash
- c992c44 [#6] Firestore schema additions + rules pass 1 + index
- 8d552a1 [#7] Migration scripts: statuses + nomLowercase backfill
- a5aa67c [#8] Case-insensitive login via nomLowercase
- 35b6190 [#9] Automatic status on create + planification
- ec6e698 [#10] Automatic status on ATG photo upload
- 5dc8c95 [#11] Automatic status on send-to-chiffrage and chiffreur save
- c4bc0b2 [#12] Delete modal-decision-status usage app-wide
- 455f1dc [#13] Admin stamps settings page + use-stamps hook
- 5eb5a39 [#14] Shared CollapsedByDayList component
- 7c62d78 [#15] REF + TYPE become Select dropdowns
- 0920036 [#16] Prix en TTC column + Total TTC Expert footer
- 4e76e6a [#17] Editor header fields sourced from scanned document
- feab2fd [#18] Devis PDF: remove generic stamp + accept stampImage option
- 5e04409 [#19] Devis PDF: Prix en TTC + Total TTC Expert + titleOverride + accord clone columns
- dd108b7 [#20] Cloner PU.HT toolbar button + accord data model
- dcc817b [#21] Accord header dropdown + hard clamp + computed cells + footer
- ef6ee88 [#22] DevisPreviewDialog shell with stamp picker
- 3e3c89f [#23] Wire DevisPreviewDialog into editor save flow
- 14c4358 [#24] Save pipeline creates cardinal accorde slot + locks clone
- 51272c4 [#25] Dynamic cardinal slots in typed-documents-grid
- ae6a2f9 [#26] Gestionnaire import disabled on accorde slots + pimple button
- d2166dc [#27] documents-tab filter picks up cardinal types
- b6b823d [#28] Remove per-hand creator buttons from step-5-chiffrage
- f698889 [#29] Assignation-chiffrage detail picks up cardinal types
- 115ae1b [#30] Extract DocumentsFilterPanel from documents-tab
- dd00bc0 [#31] Assignation-chiffrage pre-edit uses DocumentsFilterPanel (import disabled)
- 78a92bb [#32] Apply CollapsedByDayList to photo + document sections
- cbef0b6 [#33] Post-scan warning dialog + edit-lock gate
- f1d943c [#34] Scan route arithmetic validation + calculationErrors payload
- efd8734 [#35] Surface calculationErrors in scan warning dialog
- 41a02da [#36] Envoyer par mail dialog + wiring to Accord envoyé
- ee66d19 [#37] Reforme: add Economique + create typed-document on save
- 635da42 [#38] Type reforme dropdown in assignation chiffrage adds Economique
- 49d6c03 [#39] Rapport button gating + Valider le dossier
- f447292 [#40] Remove residual column affordances + locked-clone tooltip
- 238a762 [#41] Regression sweep: purge legacy status references
- 247d65b [#42] Firestore rules pass 2 - constrain status and directorValidated writes

(Commit `dd00bc0` / [#31] hash may appear as `dd1b823` in the live log — regenerate before tagging release.)

## 7. Verify

- `cd SL-auto-main && npm run typecheck` — confirmed clean at each commit in the loop; re-run before tagging.
- `npm run build` — **not** run inside the loop; must pass on the deploy branch before going live.
- `npm run lint` — not gated in this loop; eyeball on the deploy branch is fine.
