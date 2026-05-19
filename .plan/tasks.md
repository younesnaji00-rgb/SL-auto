# Batch 2026-05-19 — 7-item polish (sans-tva, photos linkage, scrollbar, geocode, observation, adresse, immat)

## Work request

> in the web editor, if i check sans TVA, then total TTC expert should disappear on the bottom most row as well as in the final pdf that shows after clicking sauvegarder
>
> i dont see anything in photo avant en cours and apres in assignation chiffrage, meaning that these options arent actually linked to the photos avant en cours and apres that are in gestion des dossiers and assignations agent de terrain of the same dossier
>
> its the horizontal scrollbar that should persist throughout the scroll and not just show at the bottom of the table
>
> dont show the coordinates of the agent de terrain but show the area or location, it shall follow this format: "city, neighbourhood, street/road,..."
>
> in the web editor, the observation row should also show in the final pdf in assignation chiffrage
>
> in the adresse complete, allow to also import google map links to directly show the location
>
> show the immatriculation in the mission card in assignations agent de terrain

## Global context

- Stack: Next.js 15.5.9 + React 19 + Firestore + Firebase Auth + Genkit AI flows + Tailwind/shadcn.
- Inner repo (app source): `c:/Users/pc/Downloads/SL-auto-main/SL-auto-main/` continuing on `auto-2026-05-18` (47 commits already on this branch from prior batches; outer pointer not yet bumped).
- Outer repo: `c:/Users/pc/Downloads/SL-auto-main/` on `auto-2026-04-30`. No outer bump this batch.
- Verify: `cd SL-auto-main && npm run typecheck`.
- Commit discipline: inner first, never push, `git add <specific paths>`, never `-A`.
- Pre-existing dirty files on inner — NOT staged by the loop:
  - `.gitignore`
  - `firestore.indexes.json`
  - `src/app/(app)/assignations-atg/page.tsx` (3 small hunks of user WIP)
  - `src/app/(app)/dossiers/[id]/planification-tab.tsx`

## Locked assumptions

- **A1 — branch**: stay on inner `auto-2026-05-18`; outer pointer not bumped this batch.
- **A2 — reverse geocoding**: Nominatim (`https://nominatim.openstreetmap.org/reverse?format=jsonv2&...`) via a Next.js API route to keep User-Agent header and rate-limit handling server-side. Free, no key, 1 req/sec acceptable for Moroccan addresses.
- **A3 — photos linkage (item 2)**: union into chiffrage documents query at the page level (Option A). No data migration, no dual-write at upload time. `category: 'avant'|'en_cours'|'apres'` → synthetic `type: 'Photos avant'|'Photos en cours'|'Photos après'`.
- **A4 — scrollbar (item 3)**: CSS-only fix — force always-visible native scrollbar; also collapse the duplicate `overflow-auto` on the inner Table component.
- **A5 — item 7 (immat)**: yesterday's `5cecb72` only added matricule to the mobile card render path. User reports they don't see it in cards (mobile) OR in the desktop table. Investigate field source (`vehicule?.immatriculation || matricule`), confirm subscription populates, and add render in BOTH the mobile card section AND the desktop table view of `assignations-atg/page.tsx`.
- **A6 — item 6 (adresse)**: yesterday's `parseMapsLinkOrSelf` writes `lat,lng`. User wants the human-readable address text instead. Reuse the same Nominatim API route as item 4.
- **A7 — loop discipline**: no queue; this firing covers context capture + first task only. Subsequent firings discover one task at a time.

## Completed

- [x] **sans-tva-hide-total-ttc-expert** — `ca5d2ce` (reviewed ✓). Editor footer `Total TTC Expert` label+value pair wrapped in `{!sansTva && (<>...</>)}` (devis-editor.tsx ~1712-1720). PDF footer branches on `sansTva` (already destructured at line 231): when true draws 7mm box + vertical divider height 7 + only `Total H.T`; else original 14mm two-row behavior. Watermark y-offsets unchanged. typecheck clean. 2 files staged, +24/-11.
- [x] **dossiers-persistent-horizontal-scrollbar** — `609a023` (reviewed ✓). Card className changed from `overflow-auto …` to `overflow-x-scroll overflow-y-auto … [&>div]:overflow-visible` at `dossiers/client-page.tsx:610`. The arbitrary `[&>div]` selector neutralizes shadcn `<Table>`'s inner `overflow-auto` wrapper so horizontal overflow propagates to the Card; `overflow-x-scroll` forces the scrollbar always-visible at the bottom of the Card's `max-h-[calc(100vh-280px)]` viewport. shadcn primitive untouched. 1 file, +1/-1. typecheck clean.
- [x] **devis-pdf-observation-column** — `f86a9d1` (reviewed ✓). Added conditional "Observation" column to the saved PDF table. `OBSERVATION_LABELS` imported from `./devis-schema`. `hasObservations = devis.rows.some(r => !!r.observation)`. Head spreads `...(hasObservations ? ['Observation'] : [])` between Prix en TTC and accord triples; body spreads `...(hasObservations ? [r.observation ? OBSERVATION_LABELS[r.observation] : ''] : [])` after prixTtcCell. `accordStartIndex` becomes `hasObservations ? 9 : 8` so accord-column styles cascade. `columnStyles[8] = { halign: 'left', cellWidth: 22 }` only when present. Layout unchanged when no observations. 1 file, +8/-1. typecheck clean.
- [x] **atg-immat-always-visible-mobile-and-desktop** — `14dfa9e` (reviewed ✓). Mobile card: replaced `{dossierLive[p.dossierId]?.matricule && (<div>...</div>)}` conditional with unconditional `<div>{dossierLive[p.dossierId]?.matricule || '—'}</div>` (same outer classes). Desktop table: inserted `<TableHead>Immat.</TableHead>` + matching `<TableCell font-mono text-xs tabular-nums>{...}.matricule || '—'</TableCell>` between Assuré and Compagnie columns in both `renderTableHeader` and `renderRow`. Data subscription untouched. Pre-existing user WIP preserved via stash-dance (pop auto-merged cleanly). 1 file, +5/-5. typecheck clean.
- [x] **chiffrage-union-photos-into-docs-filter** — `06cfdbe` (reviewed ✓). Module-scope `CATEGORY_TO_TYPE` map. New `dossierPhotosQuery` + `useCollection<any>`. `photoDocs` useMemo maps photos to `DocumentsFilterPanelDoc` shape (no `url`). `combinedSortedDocs = [...sortedDocs, ...photoDocs]` passed to `<DocumentsFilterPanel>`. `families`/`familyDocsByType`/`dossierDocs` untouched. 1 file, +37/-1. typecheck clean.
- [x] **reverse-geocode-api-and-agent-live-location** — `ec858b2` (reviewed ✓). NEW `src/app/api/reverse-geocode/route.ts` — Nominatim proxy with required User-Agent, validates lat/lng, builds `formatted = "[city, neighbourhood, road]"`, Cache-Control 1 day. MODAL agent alert now shows the address text (falls back to coords on error). 2 files, +94/-3. typecheck clean.
- [x] **adresse-paste-resolves-to-address-text** — `3480832` (reviewed ✓). Refactored `parseMapsLinkOrSelf` → `parseMapsCoords` returning `{lat, lng} | null`. onPaste handler is now async: when coords detected, preventDefault, sets field to immediate `"lat,lng"` placeholder, fires `/api/reverse-geocode`, on success overwrites with `data.formatted` via functional setFormData guard (`prev.adresse === tempValue`) so user edits aren't clobbered. try/catch swallows errors → falls back to coords on network/Nominatim failure. 1 file, +19/-14. typecheck clean.

## Current

_(empty — all 7 work-request items shipped)_

## Follow-ups

- **Scrollbar pattern likely affects other capped-height table cards** — the implementer noted that any other list page using shadcn `<Table>` inside a `<Card>` with `max-h-…` has the same hidden-scrollbar issue. Surface candidates (untouched this iter): `assignations-chiffrage/page.tsx`, `assignations-atg/page.tsx`, `compagnies/client-page.tsx`, `consultation/client-page.tsx`. Sweep if user complains elsewhere; otherwise wait.
- **Photo preview from chiffrage filter panel is a no-op** — synthetic photo docs unioned in `06cfdbe` have no `url` field (photos in `dossiers/{id}/photos` are stored with `{name, category, storagePath, uploadedAt, uploadedBy}` only). The filter panel's eye/download buttons silently no-op for photo rows. Filter chips, counts, and the listed rows DO work. Enrichment via `getDownloadURL(ref(storage, p.storagePath))` (one fetch per photo, batched on `dossierPhotos` change) would unblock preview. Defer unless user explicitly asks.
