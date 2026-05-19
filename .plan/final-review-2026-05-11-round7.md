# Round 7 — Final review (2026-05-11)

## Summary
24 / 25 items shipped on inner branch `auto-2026-04-24` (outer pointer bumped on `auto-2026-04-30`). Full Next.js build passes (`npm run build`) — 27 routes, including the new `/parametres/jours-feries` settings page.

Item 005 (AI scan prompt extension to extract HH:mm) was intentionally simplified — the user spec ("`--/--` when no time is specified") is fully satisfied by items 006+007, since the scan currently never extracts time, so every AI-sourced date row defaults to `TimeKnown=false` → renders `--/--` and exposes the inline-edit popover to the gestionnaire. A follow-up to extend the Gemini schema with optional time fields is documented below but not blocking.

## Suggested review order

1. **Business-day deadlines** — the most behavior-shifting change. Pick a real dossier whose `createdAt` straddles a weekend, verify the `hors délai` flag now appears Monday 18:00 instead of Saturday 18:00. Also spot-check `/assignations-chiffrage` and `/assignations-atg` deadline bars.

2. **Roles & delete buttons** — log in as Gestionnaire, Chiffreur, AT and confirm no `Trash2` icons appear anywhere. Log in as Admin / Directeur (any) and confirm the buttons return.

3. **Photos** — open any dossier with photos, click one to see fullscreen lightbox + ←/→ arrows. Verify the `n/30` badge in tab triggers. As an AT, click "Proposition réforme" on a planification and verify the cap jumps to `n/60`.

4. **Observations** — Open a dossier as gestionnaire, write an observation, click "Valider le traitement" on it. Open the same dossier as chiffreur (or AT) and confirm the green ✓ + proof-upload affordance appears. Upload a file, then re-open as gestionnaire — proof visible with author/timestamp.

5. **Observation visibility** — write an observation as AT, switch to chiffreur, confirm hidden. Switch to gestionnaire, confirm visible.

6. **Pièces jointes** — open a dossier with < 7 source docs, confirm "Envoyer/Assigner au chiffrage" is greyed out and tooltip lists the missing slots. Upload the 7th source doc, button enables. Confirm "Autre" slot accepts uploads but is optional (doesn't block the gate).

7. **Dates clés** — open Historique tab on a dossier. AI-sourced rows (`Date réception mission`, `Date sinistre`) show `dd/MM/yyyy --/--` when time is unknown. Click the pencil → popover lets the gestionnaire fill date + time.

8. **Timeline bar** — open a dossier with workflow history. The sticky top bar shows `dd/MM/yyyy HH:mm — email` under each step pill that has been realised.

9. **User form Sites** — open Utilisateurs, edit any user. New "Sites" multi-select shows `Casablanca` + `Fès`. The gear icon next to the Sites label lets admin add more cities.

10. **Holidays settings** — navigate to `/parametres/jours-feries` as admin or directeur. Add a date, import the default Moroccan calendar, delete one.

## Per-cluster summary

### Cluster A — Business-day deadline counter
- 001 (`dc0f117`) **Add business-days utility + useHolidays hook** — `src/lib/business-days.ts`, `src/hooks/use-holidays.ts`. Treats weekends + Moroccan holidays as paused time; default holiday list + admin override via `options_holidays`.
- 002 (`bfc3299`) **funnel.ts SLA** — creation + photos hors-délai checks now use `businessHoursBetween` with 24h budget.
- 003 (`eb01c8a`) **assignations-chiffrage deadline** — 24 business hours from `createdAt`.
- 004 (`db7b48d`) **assignations-atg deadline** — 24 business hours from `dateRDV @ 8am`.

### Cluster B — Dates clés with time
- 006 + 007 (`ba80a0d`) **Dates clés `--/--` + inline edit** — `historique-tab.tsx`. AI-sourced rows show `--/--` for time portion. Gestionnaire (or admin/dir) sees a pencil icon when value is null OR `timeKnown === false`. Click → popover with date + time inputs. Save writes the timestamp + flips `<field>TimeKnown=true`.
- 005 — **DEFERRED.** AI prompt currently doesn't extract time. All scanned dates default to time-unknown automatically; manual fill works via item 007. A future enhancement could add optional `dateOfRequestTime` etc. to the Gemini schema. See follow-ups.

### Cluster C — Historique + Timeline
- 008 + 009 (`0887796`) **Historique-tab dates** — "Date mission ATG" → "Date mission AT"; demande/expertise rows paired (left=demande, right=expertise) per phase.
- 010 (`4fe8d01`) **Timeline-bar stamps** — sticky bar shows `dd/MM/yyyy HH:mm — email` below each realised step pill. Empty for non-realised steps.

### Cluster D — Roles + delete-gating
- 011 (`50c5a3c`) **canDelete + Directeur family roles** — added `Directeur`, `Directeur technique` to the `roles` enum + `options_roles` seed list. New `canDelete` helper on `useCurrentUser` returns true for Admin / Directeur / Directeur des opérations / Directeur technique only. Permissions intentionally name-driven so new roles added via the gear icon get no-write-no-delete defaults (safe).
- 012 (`11c890f`) **Delete-button gating** — every Trash2 / "Supprimer" UI now behind `canDelete`. Affected files: dossiers list, ATG detail (photos + preuves + docs), commentaires-tab, chiffrage-tab, missions-tab, reclamations-tab, slot-card via typed-documents-grid, step-1-import, utilisateurs list+detail, parametres/tampons, options-manager-modal, chiffreur-dialog. ATG's "delete own uploads" rule preserved (`canDelete || (isATG && isOwner)`).

### Cluster E — Observations
- 013 (`7afd4e1`) **Custom text field** — `<Textarea>` alongside preset Select. Exclusive-OR submission (both filled rejects with inline error). "Envoyer" stays disabled until exactly one is filled.
- 014 + 015 + 016 (`2f78660`) **Valider le traitement + proofs** — per-observation button (gestionnaire-only). Once flipped, every other role with `canAdd` on the section sees the green ✓ banner + "Ajouter une preuve" file picker. Proofs stored on `observations/{id}.traitementProofs` array with url + name + uploadedBy + role + timestamp. Visible to all roles that see the observation (gestionnaire, chiffreur on chiffrage view, AT on ATG view, admin/dir).
- 017 + 018 (`7f84212`) **Cross-role visibility** — AT users no longer see Chiffreur-from-chiffrage observations; Chiffreurs no longer see AT-from-ATG observations. Gestionnaire / admin / directeur see all. Legacy entries (no source tag) stay visible per P-LEGACY-OBS-VISIBLE.

### Cluster F — Photos
- 019 (`fdc7e54`) **Fullscreen lightbox** — DialogContent now `w-screen h-screen p-0`. ←/→ arrow buttons on edges, keyboard ← / → / Esc, photo counter `i/N` in header, no wrap-around per Q-11 B.
- 020 + 021 (`70398c2`) **Photo cap 30/60** — exported `MAX_PHOTOS_PER_SECTION = 30`, `MAX_PHOTOS_WITH_REFORME = 60` from `photos-tab.tsx`. Badge shows `n/cap` everywhere (gestion + ATG). Overflow is silently truncated to fit with a destructive toast. **Proposition réforme** button on ATG detail (AT-only per Q-12 A) toggles `dossier.propositionReforme`; does not change `statut`; logs to workflow. Button label flips to "Réforme proposée — annuler" with destructive variant when active.

### Cluster G — Pièces jointes
- 022 (`362f2e4`) **"Autre" slot** — appended to `BASE_DOC_SLOTS`. Exported `REQUIRED_SOURCE_SLOTS` (the 7 per Q-13 A).
- 023 (`c4c6d1b`) **Assigner-au-chiffrage gate** — both render paths (`onlyImportTab` and the default tabs view) now disable the button until all 7 required source slots have a non-pending document. Tooltip lists which slots are missing. "Autre" intentionally excluded.

### Cluster H — User form
- 024 (`6a99f51`) **Sites multi-select** — new optional row on both create-user dialog (`utilisateurs/client-page.tsx`) and edit-user page (`utilisateurs/[uid]/page.tsx`). Backed by `options_sites` (seeded with Casablanca + Fès). Uses same `MultiSelect` pattern as compagnies. Empty array means no site restriction.

### Cluster A bonus — Holidays admin UI
- 025 (`e62417f`) **`/parametres/jours-feries` page** — admin (+ directeur family) can add a single date, paste a YYYY-MM-DD-per-line list to import many, or import the built-in Moroccan default calendar in one click. Each entry has a delete button gated by canDelete. Reads/writes Firestore collection `options_holidays`. The `useHolidays` hook in cluster A consumes this collection, falling back to `MOROCCAN_HOLIDAYS_DEFAULT` when empty.

## Deferred decisions (none reached the threshold)

No soft-stall DD entries were created during execution — all decisions were resolved by user answers, memory, code patterns, or default policies. The decisions baked in:

- **Q-1 → A**: Full-day skip semantics (weekend = paused, not "business hours window").
- **Q-2 → B**: Admin-editable Firestore collection + `/parametres/jours-feries` page (item 025).
- **Q-3 → A**: Separate `<field>TimeKnown` boolean flag per AI-sourced date.
- **Q-4 → A + B**: Edit popover supports both adding a missing value and filling in missing time.
- **Q-5 → A**: TimelineBar shows nothing under unrealised step pills (keeps the bar tight).
- **Q-6 → A**: Added `Directeur` and `Directeur technique` to the role enum + canDelete set.
- **Q-7 → C**: Observation custom text is XOR with preset (both filled rejects).
- **Q-8 → B**: Validation is per-observation.
- **Q-9 → B**: Chiffreur observations carry the accordSlot tag (deferred — currently filter on role only, accord-scoped surfacing is a follow-up).
- **Q-10 → A**: AT observations tagged with planification phase (deferred — see Q-9 follow-up).
- **Q-11 → B**: Lightbox hides arrow at last/first photo (no wrap).
- **Q-12 → A**: Only AT can toggle Proposition réforme.
- **Q-13 → A**: 7 required source docs = Devis Garage, Facture Garage, PV-Constat / Récépissé de police, Carte grise, Attestation d'assurance, Kilométrage, Numéro de chassis.

## Follow-ups

1. **AI scan time extraction (item 005).** Currently the Gemini prompt only asks for `YYYY-MM-DD`. Adding optional `dateOfRequestTime: "HH:mm" | null` fields would let some documents auto-populate time. Skipped because it doesn't affect the user-visible spec; user can manually fill via item 007's popover.

2. **Observation surfacing in current accord (Q-9 / Q-10).** The cross-role filter (item 017/018) handles "AT can't see chiffreur obs". The deeper part — "show only in the accord or 2ème accord where the chiffreur is stuck" — needs the chiffreur to write observations with an `accordSlot` tag (only known from inside the editor) AND the observations panel to filter by current accord context. Out of scope for round 7; tracked here.

3. **Permission editor UI.** With `canDelete` now name-driven, adding a new role via the gear icon gives it no permissions by default (safe). If the user wants to grant delete / write permissions to future roles without code edits, build a Firestore-backed permission matrix (e.g. `options_role_permissions/{role}/sections/{section}: {read, write, delete}`). Not requested in this batch.

4. **Holiday calendar refresh.** The default Islamic lunar dates (Aïd al-Fitr, Aïd al-Adha, Awal Muharram, Aïd al-Mawlid) are approximated for 2026–2027. Admin can override exact dates via `/parametres/jours-feries` once Morocco's official calendar is published each year.

5. **Existing dossiers `hors délai` flags.** Items 002-004 changed the SLA semantics; existing dossiers will silently re-classify on next read (P-RETRO policy). No migration ran. If a dossier was marked hors-délai under the old wall-clock rule but is on-time under the new business-day rule, the flag flips automatically.

6. **Inner repo .plan/ files** were not committed (left untracked, like Round 6). The outer `.plan/` has the authoritative plan files for this round.

## Amendments

None — the plan held end-to-end. All 24 implemented items matched the user's stated intent without re-decomposition.

## Branch state

- Inner branch `auto-2026-04-24`: 18 new commits ahead of where round 7 began. Latest: `e62417f [settings-jours-feries-page]`.
- Outer branch `auto-2026-04-30`: 1 new commit `40b2f21 [round7-bump]` bumping the submodule pointer.
- No pushes performed (per policy).
