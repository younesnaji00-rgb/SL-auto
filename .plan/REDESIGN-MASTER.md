# REDESIGN MASTER PLAN — SL Auto

Consolidates all 16 area plans into one ordered implementation sequence. Locked 2026-04-21.

## Locked decisions (from [REDESIGN-2026-04-21.md](REDESIGN-2026-04-21.md))

- **Font**: Outfit (via `next/font/google`, weights 400/500/600/700).
- **Base palette**: warm cream background, warm-neutral borders.
- **Primary**: dark teal (CTAs, active states).
- **Accent**: mint-teal (selection highlight).
- **Status colors**: muted amber/green/red/purple/orange (no neon).
- **Layout language**: grouped sidebar sections, status list + side drawer on dashboard, bottom analytics row, ⌘K global search.
- **Hard constraints**: Firestore realtime untouched, French copy verbatim, PDF pipelines untouched, compagnie dropdowns unrestricted, Firefox long-polling flag preserved, no framework migrations.

## Area plan inventory

| # | Area | File | Risk |
|---|------|------|------|
| 1 | Foundation tokens | [REDESIGN-foundation-tokens.md](REDESIGN-foundation-tokens.md) | Low-Med |
| 2 | Shared UI primitives | [REDESIGN-shared-ui.md](REDESIGN-shared-ui.md) | Low |
| 3 | Layout shell | [REDESIGN-layout-shell.md](REDESIGN-layout-shell.md) | Medium |
| 4 | Login | [REDESIGN-login.md](REDESIGN-login.md) | Medium |
| 5 | Dashboard | [REDESIGN-dashboard.md](REDESIGN-dashboard.md) | **High** |
| 6 | Dossier list | [REDESIGN-dossier-list.md](REDESIGN-dossier-list.md) | **High** |
| 7 | Dossier detail | [REDESIGN-dossier-detail.md](REDESIGN-dossier-detail.md) | **Very High** |
| 8 | Assignations | [REDESIGN-assignations.md](REDESIGN-assignations.md) | Medium |
| 9 | Chiffrage + consultation | [REDESIGN-chiffrage-consultation.md](REDESIGN-chiffrage-consultation.md) | Low-Med |
| 10 | Compagnies | [REDESIGN-compagnies.md](REDESIGN-compagnies.md) | Medium |
| 11 | Utilisateurs | [REDESIGN-utilisateurs.md](REDESIGN-utilisateurs.md) | **High** |
| 12 | Modals | [REDESIGN-modals.md](REDESIGN-modals.md) | Medium |
| 13 | Domain components | [REDESIGN-domain-components.md](REDESIGN-domain-components.md) | Medium |
| 14 | Editor | [REDESIGN-editor.md](REDESIGN-editor.md) | Low |
| 15 | Devis editor | [REDESIGN-devis-editor.md](REDESIGN-devis-editor.md) | Medium |
| 16 | Misc pages (viewer, signaler-bug) | [REDESIGN-misc-pages.md](REDESIGN-misc-pages.md) | Low |

## Cross-cutting themes (repeat offenders across areas)

The scan surfaced the same classes of issues in many areas. Tackling them consistently in the foundational passes avoids per-area duplication.

### Hardcoded Tailwind color families (must retune)
| Color | Count | Notable locations |
|---|---|---|
| `text-blue-*` / `bg-blue-*` | 15+ | Login setup button + ShieldCheck, dossier-list refExpert + 3 action icons, dossier-detail Décision-statut button, compagnies Nouveaux stat + pencil icon, utilisateurs pencil icon, options-manager trigger + edit, observations Planification type + Responsable role, devis-editor none but editor line/stamp selection rings (as blue-500) |
| `bg-amber-*` / `text-amber-*` | 8+ | Chiffreur workload badge, observations Chiffreur role, viewer "Lecture seule", offline-indicator, compagnies En cours stat, dashboard changements new-entry dot |
| `bg-red-*` / `text-red-*` / `bg-red-500` | 10+ | dossier-detail réclamation button, devis-editor counter variant (5 instances), dashboard timeline dot |
| `bg-green-*` / `text-green-*` / `bg-green-500` | 7+ | compagnies Terminés stat, observations Expert type, options-manager check icon, dashboard changements done dot + new-entry tint |
| `bg-violet-*` / `text-violet-*` | 3 | observations Admin role, status-colors.ts violet family |
| `bg-indigo-*` / `bg-sky-*` / `bg-cyan-*` / `bg-emerald-*` / `bg-purple-*` | 10+ | status-colors.ts across families, observations role + type maps |
| `bg-slate-*` | 3 | editor/viewer canvas bg (KEEP — preserves PDF contrast), "Page N/N" overlay, status-colors closed family |

Primary consolidation levers:
- **[src/lib/status-colors.ts](../src/lib/status-colors.ts)**: 3 functions × 9 color families. Retune once in dashboard phase → inherited by dossier-list, dossier-detail, consultation, assignations, compagnies, etc.
- **[observations-tab.tsx](../src/components/observations-tab.tsx) TYPE/ROLE maps**: 4 types + 5 roles with hardcoded palette. Retune in domain-components phase.
- **[dossier-detail page.tsx](../src/app/(app)/dossiers/[id]/page.tsx) STATUS_COLORS**: third copy of status map. Delete, import `getStatusBadgeStyles`.

### `confirm()` / `window.confirm()` calls (must become AlertDialog)
1. Dossier-list delete dossier.
2. Dossier-detail pattern-B list tabs (missions, réclamations, chiffrages, rapports, commentaires) — 5+ instances.
3. Sidebar compagnie delete X button.
4. Utilisateurs delete user.
5. Chiffreur-dialog delete chiffreur.
6. Options-manager delete option.

### "John Doe" / "Jean Dupont" / generic placeholders
- **utilisateurs/client-page.tsx:253** — `"John Doe"` (flagrant).
- **chiffreur-dialog.tsx:137** — `"Jean Dupont"`.
- **chiffreur-dialog.tsx:154** — `"+33 6 00 00 00 00"` (**wrong locale** — Moroccan app).
- **notifications.tsx** (dead code with "John Doe" + "CPU 92%" content).
- Login setup placeholder already uses `"Ex: Ahmed Benali"` ✅ — match this example elsewhere.

### Inline `<Loader2 />` spinners (must use Button `loading` prop or InlineLoader)
Scattered across ~25+ files. Shared-ui adds `loading` to Button; each consumer swap is mechanical.

### Plain-text empty states (must use `EmptyState` primitive)
Scattered across ~15+ files. Shared-ui adds EmptyState; consumers swap as they're touched.

### Accent-missing French copy
- Dashboard: `"Changements recents"`, `"Aucune activite recente"`, `"Reinitialiser"`, `"Assure"`, `"Repartition"`, `"donnee"` (6+).
- Devis-editor: `Modele`, `Kilometrage`, `chassis`, `Telephone`, wrapper `Parametres` (5).
- Viewer: `Apres` (1).
- Global-search English: `"Search..."`, `"What do you need?"`, `"Error: Could not fetch suggestion."` (3).

**All flagged but deferred to user approval for batch fix.** Preserving verbatim per memory rule; corrections need explicit sign-off.

## Implementation sequence — ordered PRs

Each PR is small enough to review in one sitting. Must land in order. Each PR blocks the next.

### PR-1 — Foundation tokens
**Area**: 1 (foundation-tokens).
**Files**: `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`.
**Goal**: swap Inter → Outfit via `next/font`, rebase light + dark palettes on warm cream + teal, add tabular-nums utility, add text-wrap balance to headings.
**Exit**: typecheck + dev boot + no route crashes + dark/light toggle works. Visual palette pass across top routes.

### PR-2 — Shared UI primitives
**Area**: 2 (shared-ui).
**Files**: `src/components/ui/button.tsx`, `input.tsx`, `textarea.tsx`, `card.tsx`, `badge.tsx`, `alert.tsx`, `skeleton.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `toast.tsx`.
**Goal**: Button press feedback + loading prop; Input/Textarea aria-invalid hook; **drop `bg-heading-bg rounded-t-lg` from `CardHeader` default** (match v3 — clean title, no chip band); new `EmptyState`, `ErrorState`, `InlineLoader`, `PageLoader`, `SkeletonRow`, `SkeletonCard`, `SkeletonChart` components; retuned badge custom variants (`creation/chiffrage/validation/expertise` + new `success`); alert variants (success/warning/info); tinted Dialog backdrop; tabular-nums on tables.
**Exit**: no existing consumer breaks; new primitives exported + typed; no chip band on any Card headers.

### PR-3 — Status colors retune
**Touches**: [src/lib/status-colors.ts](../src/lib/status-colors.ts).
**Goal**: shift 9 color families warmer (`bg-red-100` → `bg-rose-100/70`, `bg-blue-100` → `bg-sky-50` shifted off teal, etc.). Single-file change. Inherited by every list/detail surface.
**Exit**: every dossier-status badge + dot + header bar renders warm; no status collisions.

### PR-4 — Observations type/role palette
**Touches**: [src/components/observations-tab.tsx](../src/components/observations-tab.tsx).
**Goal**: retune TYPE_BADGE_STYLES (4 types) + ROLE_BADGE_STYLES (5 roles) to warm palette. Single file.
**Exit**: observation feed chips read consistent with status-colors.

### PR-5 — Layout shell
**Area**: 3 (layout-shell).
**Goal**: grouped sidebar sections (ESPACE/ASSIGNATIONS/ADMIN/DIVERS), compagnie delete AlertDialog, notifications wired into header with EmptyState shell, breadcrumb route label map (no raw Firestore IDs), offline-indicator warm retune, delete `user-nav.tsx` dead code, PageLoader in auth gate.
**Exit**: sidebar grouped correctly with role filtering preserved; compagnies dropdown in sidebar stays unrestricted; no `confirm()` on compagnie delete; no "John Doe" strings in notifications.

### PR-6 — Login
**Area**: 4 (login).
**Goal**: radial-gradient warm bg, remove 2 hardcoded blues, Alert for errors, Button loading on CTAs, preserve email generation + setup flow + Firebase auth logic verbatim.
**Exit**: first-time setup still creates Admin; login still works for existing users; no blue left.

### PR-7 — Dashboard
**Area**: 5 (dashboard).
**Goal**: drop `bg-heading-bg` chip from dashboard cards, replace rounded-xl with rounded-lg, replace timeline green/orange dots with semantic tokens, replace plain-text empty states with EmptyState, replace manual skeleton with shared-ui primitives, fix typo-missing accents (user-approval gate), consolidate status-colors usage.
**Exit**: realtime feed still updates; status selection + drawer flow preserved; no blue/amber/green leaks.

### PR-8 — Dossier list
**Area**: 6 (dossier-list).
**Goal**: remove 4 hardcoded blues, replace `confirm()` with AlertDialog, consolidated "active filters" strip, Empty/Skeleton primitives, create-dossier-dialog polish (no name placeholder, Button loading).
**Note**: compagnie filter stays scoped to user's assigned compagnies (decision locked — filter contexts may scope when data is already scoped).
**Exit**: delete flow routes through AlertDialog; no blue action icons; filter dropdown still shows only user's compagnies.

### PR-9 — Consultation + chiffrage detail
**Area**: 9 (chiffrage-consultation).
**Goal**: apply dossier-list pattern changes to consultation (minus compagnie fix — already compliant); chiffrage detail skeleton, file status semantic retune, empty state.
**Exit**: realtime + Storage fetching preserved; consultation clean of blues.

### PR-10 — Assignations (atg + chiffrage lists + detail)
**Area**: 8 (assignations).
**Goal**: extract shared `DeadlineBar` component (3-color semantic gradient), retune list chrome, empty states, detail polish.
**Exit**: deadline calculation preserved; mission categories (avant/en_cours/après) unaffected.

### PR-11 — Compagnies
**Area**: 10 (compagnies).
**Goal**: drop `font-black` abuse, retune hardcoded Nouveaux/En cours/Terminés stat palette, **fix statut badge bug** (uses plain outline, not getStatusBadgeStyles), "Nouveau Dossier" opens CreateDossierDialog pre-filled.
**Exit**: per-status badge colors render correctly; stats cards read semantic; brand-color left border preserved.

### PR-12 — Utilisateurs
**Area**: 11 (utilisateurs).
**Goal**: remove "John Doe" placeholder (leave empty), fix statut badge (`expertise` → `success`), remove hardcoded blue, AlertDialog for delete, Button loading on create/save/delete.
**Exit**: `secondary-auth` user-creation flow preserved; role-collection sync (Agent de Terrain → options_agents, Chiffreur → chiffreurs) preserved; no name placeholder text.

### PR-13 — Modals (shared)
**Area**: 12 (modals).
**Goal**: chiffreur-dialog locale fix (phone `+33` → empty with `+212 6XX XX XX XX` hint, name placeholder removed entirely), options-manager AlertDialog + color cleanup, dossier-edit-modal button loading.
**Exit**: no hardcoded blue/green on action icons; reconcile-canonical-statuts still works; no generic name placeholders remain.

### PR-14 — Dossier detail (A: shell + page.tsx)
**Area**: 7 shell portion.
**Goal**: delete local STATUS_COLORS map (import getStatusBadgeStyles), remove hardcoded red on Réclamation + blue on Décision-statut, ErrorState for not-found, observations count badge, PageLoader for loading.
**Exit**: Décision-statut flow preserved, PDF export preserved.

### PR-15 — Dossier detail (B: form tabs)
**Area**: 7 pattern A.
**Files**: 8 form tab files (assure/vehicule/requete/information/intermediaire/partie-adverse/dossier/facturation).
**Goal**: Button loading on Save; aria-invalid hook on inputs; dirty-state indicator.
**Exit**: Firestore writes unchanged per tab.

### PR-16 — Dossier detail (C: list tabs)
**Area**: 7 pattern B.
**Files**: 5 list tab files (missions/reclamations/chiffrage/rapport/commentaires).
**Goal**: AlertDialog for 5× `confirm()`; EmptyState in empty table cells; SkeletonRow loading.
**Exit**: inline cell editing preserved; write paths unchanged.

### PR-17 — Dossier detail (D: file/media + timeline tabs)
**Area**: 7 patterns C+D.
**Files**: documents-tab, photos-tab, historique-tab, planification-tab.
**Goal**: EmptyState for empty grids/timelines, Button loading on upload, semantic retune on timeline dots.
**Exit**: uploadFileWithOfflineSupport preserved; log-historique/log-observation preserved.

### PR-18 — Domain components
**Area**: 13 (domain-components).
**Goal**: **flag timeline step-2 mismatch for user decision**, global-search English → French (3 strings), camera/voice polish, typed-documents-grid polish.
**Exit**: ⌘K works; car diagram renders warm+teal.

### PR-19 — Editor
**Area**: 14 (editor).
**Goal**: blue-500 → primary on selection rings (3 instances), `text-white` → `text-destructive-foreground` on delete bubbles, Button loading on Save/Export, EmptyState in stamp popover.
**Exit**: no canvas logic touched; annotation model untouched.

### PR-20 — Devis editor
**Area**: 15 (devis-editor).
**Goal**: counter variant `text-red-600` → `text-destructive` (5 instances, user approval), accent typos (user approval), Button loading.
**Exit**: AI extract + PDF render preserved; structured devis schema unchanged.

### PR-21 — Misc pages
**Area**: 16 (misc-pages).
**Goal**: viewer amber retune + `Apres` accent fix; signaler-bug EmptyState × 3 + PageLoader + Button loading.
**Exit**: read-only contracts preserved; bug-report chat preserved.

## Decisions (all resolved 2026-04-21)

1. ~~Dossier-list compagnie filter scoping~~ → **keep scoped**. Memory rule updated: filter contexts may scope; selection contexts (sidebar, create-dossier) stay unrestricted. PR-8 keeps current filter behavior.
2. ~~Timeline step-2 mismatch~~ → **user resolved in code**. page.tsx now maps all 7 sections (id=2 → `Step2Observations`, id=3..7 → Information..Rapport).
3. ~~Accent-missing French fixes~~ → **apply batch** across ~15 instances.
4. ~~Moroccan localizations~~ → **apply**. Phone format `+212` not `+33`. No name placeholders at all.
5. ~~Name placeholders~~ → **remove entirely**. No "John Doe", no "Jean Dupont", no "Ex: Ahmed Benali". Empty `placeholder=""` or format-cue text only.
6. ~~Counter variant color~~ → **reuse `text-destructive`** (same red as errors). Simpler, no new token.
7. ~~CardHeader chip vestige~~ → **drop globally**. Match v3 mockup: clean title with optional leading status-dot, no tinted band. `Card` primitive's `CardHeader` default drops `bg-heading-bg rounded-t-lg`.

### Design polish (lower priority — decide during implementation)
- 5-color → 3-color DeadlineBar gradient.
- Assignations workload summary header.
- Observations count badge on dossier-detail collapsible.

## Risk stratification (which surfaces need the most eyes on review)

**Untestable in CI** (Playwright exists but no comprehensive visual regression): manual review required for every surface.

**Top-5 regression risks**:
1. Dossier-detail (PRs 14-17) — 17 tab files + 6 modals + Firestore write paths.
2. Utilisateurs (PR-12) — Firebase Auth secondary-app user creation is fragile.
3. Dashboard (PR-7) — realtime feed + status-colors propagation.
4. Dossier-list (PR-8) — compagnie scoping fix is behavioral + visible.
5. Devis-editor (PR-20) — quote/invoice data model with AI extraction.

**Rollback strategy**: each PR is independent post-PR-2; reverting is a clean git revert. Foundation-tokens (PR-1) and shared-ui (PR-2) are harder to revert once consumers depend on them, so **do them together as a single atomic bundle** if possible.

## Go-live criteria (after all PRs land)

- `npm run typecheck` passes.
- `npm run build` succeeds.
- Smoke-test on every top-level route (dashboard, dossiers, assignations-atg, assignations-chiffrage, consultation, compagnies, utilisateurs, chiffrage, devis-editor, editor, viewer, signaler-bug, login).
- All Firestore subscriptions (`onSnapshot`) still fire updates.
- All PDF pipelines still generate output (dossier rapport, devis-editor export, editor annotations).
- All Storage paths still read/write (photos, documents, voice notes, logos, stamps).
- `secondary-auth` user-creation still preserves admin session.
- Compagnie dropdown unrestricted on every role, every place.
- Warm cream + teal visible end-to-end; no default shadcn blue anywhere outside the slate PDF-viewer background.
- Outfit font loaded; no FOUT on cold load.
- Dark mode works.

---

**End of master plan. Loop terminated — ScheduleWakeup not called.**
