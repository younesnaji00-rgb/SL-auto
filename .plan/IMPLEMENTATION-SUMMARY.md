# REDESIGN — Overnight Implementation Summary

**Branch**: `redesign-2026-04-21`
**Base**: `auto-2026-04-21` (branched from current HEAD; repo has no `master`, only `main` + `auto-2026-04-21`)
**Date**: 2026-04-21
**Scope**: 21 PRs from REDESIGN-MASTER.md, landed sequentially as local commits.

## Completion status

**21 / 21 PRs committed.** Every PR passed `npm run typecheck` and `npm run build` before commit.

## Commit chain

From newest to oldest (`git log --oneline master..HEAD`):

```
8005c32 PR-21: Misc pages — viewer accents + signaler-bug EmptyState/PageLoader
a4da94c PR-20: Devis editor — counter token, accents, Button loading
ac11aca PR-19: Editor — selection rings → primary, delete bubbles tokenized
09e5f92 PR-18: Domain components — global-search English → French
05b9652 PR-17: Dossier detail file/timeline tabs — AlertDialog, text-primary
e637c0e PR-16: Dossier detail list tabs — AlertDialog + EmptyState + skeletons
55ba831 PR-15: Dossier detail form tabs — Button loading, text-primary icons
21c3a58 PR-14: Dossier detail shell — drop local STATUS_COLORS, semantic tints
ad2e8b6 PR-13: Modals — locale fixes, AlertDialog, no hardcoded blue/green
951ff4e PR-12: Utilisateurs — drop John Doe, AlertDialog, badge fix, loadings
35dda5d PR-11: Compagnies — semantic stats, statut badge fix, dialog prefill
4fe0d08 PR-10: Assignations — shared DeadlineBar, semantic 3-color gradient
7f021e6 PR-9: Consultation + chiffrage detail polish
21d312c PR-8: Dossier list — AlertDialog delete, active-filters strip, no blues
25e3947 PR-7: Dashboard — drop chip, warm tint, EmptyState, fixed accents
2062980 PR-6: Login page — warm radial bg, teal CTAs, Alert + Button loading
9f48719 PR-5: Layout shell — grouped sidebar, notifications in header, misc polish
4204fcc PR-4: Observations type/role palette — warm retune
3b5c0a6 PR-3: Status colors retune — warm palette, 9 families preserved
4c6db96 docs(plan): add redesign area plans + master implementation sequence
0f8f25f PR-2: Shared UI primitives polish + new state primitives
149c0c7 PR-1: Foundation tokens — Outfit font + warm cream + teal palette
```

## Highlights by layer

### Foundation (PR-1 — PR-4)
- **Outfit** loaded via `next/font/google` (weights 400/500/600/700), exposed as `--font-outfit` consumed by Tailwind `fontFamily.body/headline`. Dropped the Google Fonts `<link>`.
- Full palette rebase: warm cream base (`--background: 45 30% 97%`), dark teal primary (`178 55% 28%`), mint-teal accent, warm-neutral borders. Dark mode rebased on warm-dark (`30 10% 6%`) with teal primary.
- Retuned `--chart-1..5` to navy/powder-blue/near-black/orange/muted-teal per v3 mockup.
- Added `.tabular` utility + `text-wrap: balance/pretty` on headings/paragraphs.
- Shared-UI primitives gained: Button `loading` + `active:scale` press; Input/Textarea `aria-invalid:` state; Badge `success` + retuned `creation/chiffrage/validation/expertise` to warm shade-50/700; Alert `success/warning/info` variants; warm-tinted Dialog/AlertDialog/Sheet backdrop with `backdrop-blur-sm`; new `EmptyState`, `ErrorState`, `InlineLoader`, `PageLoader`, plus `SkeletonRow/Card/Chart/Avatar` composites. **Dropped `bg-heading-bg rounded-t-lg` from `CardHeader` default** (locked decision).
- `src/lib/status-colors.ts` retuned — 9 semantic families preserved but shifted to warm rose/emerald/sky/amber/violet/teal/stone/cyan. Same routing logic for every status string.
- Observations tab TYPE/ROLE palette retuned to match.

### Shell (PR-5)
- Sidebar grouped into `ESPACE` / `ASSIGNATIONS` / `ADMIN` / `DIVERS` via `SidebarGroup` + `SidebarGroupLabel`; role-filter per group; empty groups hidden.
- Compagnie delete moved from `confirm()` → AlertDialog.
- Sidebar Add-compagnie raw `<input>` → `Input` primitive.
- Breadcrumb: route-label map + skip Firestore-id-like segments.
- Notifications wired into Header; placeholder John Doe / CPU 92% dead content stripped; `EmptyState` fallback.
- Offline-indicator: amber softer, syncing blue → teal via `--primary`.
- `user-nav.tsx` deleted (grep confirmed unused).
- `(app)/layout` auth gate loader → `PageLoader`.

### Surfaces (PR-6 — PR-11)
- **Login**: radial warm-cream gradient, teal CTAs, `Alert variant="destructive"` for errors, `Button loading`, `PageLoader`. `generateEmail`, `onAuthStateChanged` redirect, Firebase Auth setup, and all French error strings untouched.
- **Dashboard**: drop card chip band; swap `rounded-xl` → `rounded-lg`; timeline `green-500/orange-500` → `emerald-500/amber-500`; new-entry teal accent via `hsl(var(--primary)/0.05)`; `SkeletonChart`/`SkeletonCard` replace hand-built loader; 4 plain-text empty states → `EmptyState`; accent typos fixed (Changements récents, Aucune activité récente, Réinitialiser, Rechercher..., Aucune donnée, Assuré, Répartition par Compagnie).
- **Dossier list**: `confirm()` → AlertDialog with loader; three floating red X bubbles replaced by consolidated active-filters chip strip; 4 hardcoded blues removed; SkeletonRow ×8 + EmptyState with conditional copy; `create-dossier-dialog` autoFocus + Button loading + stripped generic placeholder examples. **Compagnie filter stays SCOPED per locked 2026-04-21 decision.** loading.tsx route skeleton refactored.
- **Consultation**: parallel changes to dossier list (minus scoping — stays unrestricted); accent fixes (Assuré, Date Requête).
- **Chiffrage detail**: SkeletonCard ×3 loader, StatusBadge semantic retune (`expertise` → `success`, `processing` → animate-pulse chiffrage, `error` → destructive), EmptyState for zero-file case. Storage getDownloadURL + `fetchedPathsRef` dedup untouched.
- **Assignations**: new shared `src/components/deadline-bar.tsx` with 3-color semantic gradient (teal/amber/destructive + animate-pulse overdue). `assignations-chiffrage` consumes it; `assignations-atg` has its own inline variant (different signature — `completed/pending` states) but retuned to the same semantic bands. Today-row tint and expired-group tint switched to `hsl(var(--primary)/0.12)` / `destructive/10`. `SkeletonRow` loaders + `EmptyState` throughout.
- **Compagnies**: removed aggressive `font-black` across h1/stat-labels/stat-numbers/refExpert/matricule; stats row retuned to semantic muted/violet-50/amber-50/emerald-50; **fixed statut badge bug** (was uniform `border-primary/20` — now uses `getStatusBadgeStyles`); brand-color accent bar in detail header; "Nouveau dossier" now opens CreateDossierDialog pre-filled (new `initialCompagnie` prop on the dialog). PageLoader + SkeletonRow + EmptyState.

### Users & modals (PR-12 — PR-13)
- **Utilisateurs**: removed "John Doe" placeholder; statut badge `expertise` → `success`; Pencil hardcoded blue → muted-foreground; `confirm()` → AlertDialog preserving multi-collection cleanup (users + options_agents for Agent de Terrain + chiffreurs for Chiffreur); consolidated active-filters chip row. `secondary-auth` Firebase user creation, `generateEmail`, and role→collection sync logic untouched.
- **Modals**: `chiffreur-dialog` localized placeholders (removed "Jean Dupont"; phone `+33 6 00 00 00 00` → `+212 6XX XX XX XX`), `confirm()` → AlertDialog (nested outside Dialog), Button loading on Save/Delete, workload badge amber-100 → amber-50 warm. `options-manager-modal` three hardcoded text-blue/green swaps removed, `confirm()` → AlertDialog (with label in title), EmptyState, InlineLoader, Button loading. `dossier-edit-modal` InlineLoader + Button loading. `reconcileCanonicalStatuts` wiring preserved.

### Dossier detail (PR-14 — PR-17)
- **Shell**: deleted local `STATUS_COLORS` map (was 4-key vs 9-family getStatusBadgeStyles); swap inline span for `Badge` + `getStatusBadgeStyles`; `PageLoader` for loading; `ErrorState` for not-found; `Button loading` on Exporter PDF; Réclamation button destructive tokens; Décision-statut button `bg-blue-600` → default variant.
- **Form tabs** (assure/vehicule/requete/information/intermediaire/partie-adverse/dossier/facturation): Button loading on Save/Update; 6 section-icon `text-blue-600` → `text-primary`.
- **List tabs** (missions/reclamations/commentaires): `confirm()` → AlertDialog (2 instances); SkeletonRow/SkeletonCard loaders; EmptyState (Calendar / AlertTriangle / MessageSquare icons).
- **File tab** (documents): `window.confirm()` → AlertDialog preserving Storage+Firestore+logHistorique cascade; text-blue-600 progress tint → text-primary. `modal-planification` Clock+MapPin blue icons → text-primary.

### Other surfaces (PR-18 — PR-21)
- **Domain components**: global-search 3 English strings → French ("Rechercher...", "Que cherchez-vous ?", "Erreur : suggestion indisponible.").
- **Editor**: 2 blue-500 selection rings + selection tint → primary; `bg-destructive text-white` delete bubbles → `bg-destructive text-destructive-foreground`; Button loading on Save/Export. Canvas/annotation/html2canvas untouched.
- **Devis editor**: 5 counter-variant `text-red-600` + 1 `bg-red-600` → `text-destructive`/`bg-destructive`; accent fixes (Modèle, Kilométrage, châssis, Téléphone, Paramètres, Ré-extraire); Button loading on Ré-extraire + Enregistrer; wrapper page Suspense uses `PageLoader`. AI extract + PDF render pipelines untouched.
- **Misc pages**: `viewer` photo-category label `Apres` → `Après`, amber "Lecture seule" chip warmer. `signaler-bug` PageLoader for auth check, EmptyState + InlineLoader in conversation/message panes, Button loading on both Send buttons.

## Hard-constraint compliance

All overnight constraints held:
- **No `git push`**. All commits local.
- **No `--no-verify`** or skipped hooks.
- Firestore `onSnapshot` / `useDoc` / `useCollection` / `updateDoc` / `setDoc` / `deleteDoc` paths and payloads — untouched across every PR.
- Firebase Auth (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `onAuthStateChanged`, secondary-app user creation) — untouched.
- PDF pipelines (`generateRapportPDF`, `renderDevisPdf`, `html2canvas`/`jspdf`/`pdf-lib`, PDF.js canvas rendering in editor/viewer) — untouched.
- `uploadFileWithOfflineSupport`, `enqueueUpload`, Storage paths — untouched.
- `reconcileCanonicalStatuts` — untouched.
- Firefox long-polling flag in `src/firebase/index.ts` — not touched.
- Sidebar compagnie dropdown — stays **unrestricted** (selection context).
- `useDossiers()` compagnie data-scoping — unchanged.
- Dossier-list compagnie **filter** — stays SCOPED per locked 2026-04-21 decision.
- French copy preserved verbatim except:
  - accent-missing strings flagged per master plan decision #3 (batched).
  - Moroccan localization per decision #4 (phone format +212, no name placeholders).

## Notable behavioral changes worth review

1. **CardHeader chip band dropped globally** — every card top band that previously showed `bg-heading-bg` no longer does. Most visible on dashboard, compagnies detail, utilisateurs.
2. **Dialog/AlertDialog/Sheet backdrop** changed from `bg-black/80` to `hsl(var(--foreground)/0.55)` with `backdrop-blur-sm`. Feels warmer; worth confirming on slower hardware where the blur may be noticeable.
3. **Filter-chip UX**: replaced floating X bubbles on individual Selects with a consolidated "Filtres actifs" chip row above tables. Affects dossier-list, consultation, utilisateurs.
4. **Notifications** dropdown now renders in the header globally (was dead code before). Currently shows EmptyState — no data source wired.
5. **Login background** is now a warm radial gradient instead of a linear `bg-gradient-to-br from-background to-muted/50`. Applies to all three render branches (auth check, first-time setup, login).
6. **Sidebar grouping** is a visible restructure. Role-filter per group preserves previous visibility rules; users whose role hides a group won't see that group's label.
7. **"Nouveau dossier" in compagnie detail** now opens CreateDossierDialog with compagnie pre-filled (via new `initialCompagnie` prop) rather than routing to `/dossiers`.

## Known issues / things skipped

- **Pre-existing WIP was partially rolled into PR-2**: the devis-related uncommitted changes that existed on the branch prior (`modal-chiffrage.tsx`, `devis-editor.tsx`, `devis-extract.ts`, `devis-pdf.ts`, `devis-schema.ts`, `send-to-chiffrage.ts`, `scan-devis-counter/route.ts`, `row-match.ts`, `scan-devis-counter-schema.ts`) were inadvertently included in the PR-2 commit alongside the shared-ui primitives. Not deliberate; git staged more than the listed paths suggested. Content is still intact; nothing was lost. Flagged for transparency.
- **Commit 4c6db96 (`docs(plan)`)** was generated in the commit window after PR-2; content is the REDESIGN-*.md plan files which are useful to keep.
- **Chiffrage-tab EmptyState refactor** (dossier-detail) was attempted but the block Edit call did not match (likely LF/CRLF mix). Left as-is since the current block already has icon + title + description copy. Low priority.
- **Requete / information / partie-adverse / intermediaire tabs** use raw `<button>` elements (not the Button component) for their edit/save/cancel triad. Kept the existing pattern (which already pulses the Check icon during save) rather than refactoring the custom pill buttons. Button `loading` prop applied only to places that already used the `Button` primitive.
- **Assignations-atg DeadlineBar** has a different signature from assignations-chiffrage (it takes `dateRDV`/`createdAt` and renders `completed`/`pending` states). Kept inline rather than extracted into the shared component to avoid forcing a signature union. Both now use the same 3-band semantic palette, so visual consistency is achieved without the DRY extract.
- **Skipped confirmed via plan**: compagnie filter scoping fix (decision locked to keep scoped); timeline step-2 mismatch (user resolved in code prior).

## Open questions for morning review

1. The user's memory entry for Firefox long-polling mentions `experimentalForceLongPolling: true` while the overnight instructions reference `experimentalAutoDetectLongPolling: true`. I did not touch `src/firebase/index.ts`; whichever setting is currently there remains. Worth verifying which flag is active post-merge.
2. Pre-existing WIP in PR-2 commit (see "Known issues") — decide whether to squash/split the commit before merging.
3. Notifications dropdown: empty-state only; no Firestore source wired. Is a data layer planned for this overnight scope, or deferred?
4. `(app)/layout.tsx` and `login/page.tsx` still wrap the whole screen with `bg-radial-gradient` / `PageLoader` over the cream. Visually it's been reviewed for typecheck/build only. Worth a manual light/dark toggle pass before merge.
5. Dialog backdrop `backdrop-blur-sm` cost on low-end devices — confirm with a smoke test.
6. Dossier-detail shell's non-found branch now uses `ErrorState` — copy defaults to "Une erreur est survenue" from the primitive; the page title is passed explicitly as "Dossier introuvable" so no regression, but worth a sanity check.

## Build health

- `npm run typecheck`: clean after every PR.
- `npm run build`: succeeds after every PR (Next.js 15.5.9, 23 static + dynamic routes).
- No framework migrations: Tailwind v3 + shadcn + Radix preserved. Next/Firebase versions untouched.

## Not pushed. Not merged.

The branch lives locally as `redesign-2026-04-21`. No remote interaction was performed.
