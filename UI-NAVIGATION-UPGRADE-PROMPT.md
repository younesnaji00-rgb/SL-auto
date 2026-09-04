# Mission : mise à niveau navigation & app shell de SL-auto

You are working on the SL-auto app (this repo). Implement the navigation / app-shell upgrade described below. It comes from a research study of this codebase (audit of `src/app/(app)/layout.tsx`, `components/layout/*`, `components/ui/sidebar.tsx`, `lib/nav-groups.ts`, `components/breadcrumb.tsx`, `components/global-search.tsx`, the dossier detail page + timeline, the dossiers list, `globals.css`) cross-checked against published patterns (NN/g, Atlassian, Material 3, Apple HIG, GOV.UK, Carbon, Linear, Vercel Geist, Stripe, Salesforce, Zendesk, Radix, Next.js docs). Full study with sources: `docs/navigation-study.html` if present, otherwise the Claude artifact "SL-auto Navigation Study".

**Ground rules**

- Work in the folder where this file lives. Do **not** reorganise routes, roles, permissions, Firestore schemas or business flows. Keep the visual identity (warm cream + teal, Outfit headings) — this is about mechanics, consistency and budget, not a re-skin.
- Work in **phases, in order**. Each phase must end with: `npx tsc --noEmit` clean, `npm run build` clean, screenshots you actually look at (desktop 1440 + 390×844 mobile, light + dark) of the pages you touched, and a short summary (what changed, what was deferred and why). Commit at the end of each phase with a message starting `nav-upgrade(phase N):`.
- Before Phase 1, produce a short plan listing the files you will create/modify per phase and wait for approval if you are in an interactive session; if you are running unattended, proceed.
- Small, verified diffs. Prefer extending existing components over new abstractions. Reuse shadcn primitives already in `components/ui`.
- Every user-facing string stays French. No generic placeholder names; Moroccan phone format if you add any (+212).
- Never edit source files with PowerShell `Set-Content`/`-replace` (mojibakes UTF-8 accents). Use proper edit tools or a `node -e` script with `fs.readFileSync/writeFileSync('utf8')`.
- If `.next` gets corrupt on Windows (`routesManifest.dataRoutes is not iterable`), delete `.next` and rebuild. Before screenshotting, `netstat -ano | findstr :<port>` and kill stale servers.
- Reduced motion: every new animation respects `prefers-reduced-motion`. Animate only `transform`/`opacity`; never `transition-all`.

---

## Phase 1 — Consistency & the header (quick wins)

### 1.1 One label source for every destination
- `src/lib/nav-groups.ts` becomes the single source of truth. Rename labels (≤ 2 words) and regroup:
  - **Opérations**: Tableau de bord · Suivi d'équipe · Dossiers · Rappels · Consultation · Compagnies
  - **Assignations**: Chiffrage (`/assignations-chiffrage`) · Terrain (`/assignations-atg`)
  - **Administration**: Utilisateurs · Tampons · Jours fériés
  - "Signaler un bug" leaves the groups and moves to a sidebar-footer help menu (see 1.4). Keep its "always visible" rule.
- Add to each item an optional `title` (long form for page H1, e.g. "Assignations au chiffrage") and `mobileRank?: number` (used in Phase 3).
- `components/breadcrumb.tsx`: delete `ROUTE_LABELS`; derive labels from `NAV_GROUPS`. Drop the "SL-auto" root crumb (the sidebar is the home link). Top-level pages render no breadcrumb. Detail pages resolve the last crumb to the record identity (`REF · Assuré` for dossiers, `dossierNom` for chiffrage, user name for utilisateurs) via a small `resolveCrumb` map; ids are never shown raw.
- Set `document.title = "<page title> · SL-auto"` from the same source (a hook in the PageHeader, see 1.2).
- Role gating, grant/deny overrides, `landingPathFor` and `getDefaultRouteForRole` must keep working unchanged — add a unit-style check (a tiny script or test) that every role still resolves to a landing route.

### 1.2 Shared `PageHeader`
- New `src/components/layout/page-header.tsx`: props `title`, `subtitle?`, `count?`, `actions?` (right slot, at most one filled primary), `tabs?`, `filters?`, `backHref?` (mobile "‹ Parent" crumb). Title 24–28 px / 600 (Outfit), subtitle muted 14 px, count as muted pill with `tabular-nums`.
- On mount / route change: set `document.title`, move focus to the H1 (`tabIndex={-1}`), announce "Navigué vers <title>" in a visually hidden `aria-live="polite"` region mounted once in `(app)/layout.tsx`.
- Add a skip-to-content link (visually hidden until focused) at the top of `(app)/layout.tsx`; `<main id="main-content">`.
- Replace the hand-rolled title blocks on **every** page under `src/app/(app)` (19 pages; today H1 sizes range from `text-base` to `text-4xl`). Primary action goes in the `actions` slot (e.g. Dossiers: "Nouveau dossier"; Terrain list: none; Rappels: "Envoyer un rappel"). Filters move into the `filters` slot.
- The dossier detail page uses the record bar variant from Phase 2.2 instead — leave it for now.

### 1.3 Header right cluster
`components/layout/header.tsx` gains, right-aligned, in this order:
1. **Search trigger** — button styled like an input ("Rechercher…" + `⌘K` kbd; `Ctrl K` on Windows). Mount the existing `components/global-search.tsx` here (its content is rebuilt in Phase 3.1; for now make the empty state French and remove the AI call from the default path).
2. **+ Nouveau** — filled primary; dropdown when the role can create more than one thing (Nouveau dossier → opens the existing `create-dossier-dialog`; Nouvelle planification; Nouveau rappel). Hidden if the role can create nothing.
3. **Rappels bell** — mount `components/layout/notifications.tsx`, fed by `useRappels()` (unread count, items link to `/dossiers/{id}`; "Tout marquer comme lu").
4. **Avatar menu** — initials avatar; menu: name + role header, "Mode sombre" switch, langue (only if i18n exists in this folder), "Mon appareil" (link to session card if it exists), separator, "Déconnexion".
- Mobile (`< md`): keep the sidebar trigger for now (replaced in Phase 3.2), show the `backHref` crumb from PageHeader, keep search icon + avatar.

### 1.4 Quiet the sidebar
- Active item: tinted row (`bg-sidebar-accent text-sidebar-accent-foreground font-medium`) + 2 px accent bar on the left (`before:` pseudo), not a solid primary fill. Hover: one step lighter. Icons 16–18 px, muted unless active.
- Remove `shadow-xl` from `<Sidebar>`; rely on `sidebar-border`. Group labels ≥ 12 px.
- **Compagnies** becomes a plain link to `/compagnies`. Remove the collapsible sub-list, the inline "Ajouter" input, the delete ✕ and its `AlertDialog` from the sidebar (all of it exists on the Compagnies page already). If you want per-company shortcuts, they belong to favourites (deferred).
- Add a **Récents** group (last 5 dossiers from `useDossierTabs` storage + a small localStorage MRU written by the dossier page), label `REF · Assuré`, hidden when empty; not shown in icon-collapsed mode beyond tooltips.
- Footer shrinks to: collapse toggle (tooltip shows `⌘B`) + a **help menu** (Raccourcis clavier → opens the `?` sheet from Phase 3.1, Signaler un bug, version). Theme toggle, user card and logout move to the avatar menu (1.3).

### 1.5 Loading & motion hygiene
- Add `loading.tsx` to every route under `src/app/(app)` that lacks one, mirroring that page's PageHeader + primary block (copy the pattern from `dossiers/loading.tsx`). Skeletons must match layout, never be frame-only.
- Replace `transition-all` with explicit properties (`SidebarInset`, buttons, tabs). Sidebar collapse 200–250 ms, decelerate easing.
- Wrap `html { scroll-behavior: smooth }` in `@media (prefers-reduced-motion: no-preference)`.
- Errors are inline (`role="alert"`), toasts only for passive confirmations. Fix any toast-only error paths you touch.

**Phase 1 acceptance**: every page shows the same label in sidebar, breadcrumb, H1 and tab title; every page has one primary action in the same spot; header has search / + Nouveau / bell / avatar; sidebar has no shadow, no CRUD, no theme toggle; `document.title` changes per page; Tab from the top reaches "Aller au contenu".

---

## Phase 2 — Tabs, the dossier page, tables

### 2.1 One `WorkspaceTabs` component
- Replace `components/layout/dossier-tabs-bar.tsx` and `chiffrage-tabs-bar.tsx` with `components/layout/workspace-tabs.tsx` (prop `kind: 'dossier' | 'chiffrage'`) over a shared store (generalise `use-dossier-tabs.ts` / `use-chiffrage-tabs.ts` into one hook keyed by kind; keep the sessionStorage keys backward-compatible).
- Strip is **hidden while only the permanent list tab exists**. It stays mounted across all routes (dimmed when the current route isn't in its section) so open work never disappears.
- Tab label `REF · Assuré` (same string as breadcrumb/H1); tooltip adds compagnie + plaque.
- **Unsaved dot**: driven by the rappel draft buffer (`draftStore.pendingCount > 0`) and any dirty form the page exposes through a small `useDirtyRegistry` context; closing a dirty tab asks for confirmation.
- Overflow: when tabs exceed the width, show a "▾ N autres" menu instead of native horizontal scroll. Middle-click closes. Keyboard: `⌘/Ctrl W` close active, `⌘/Ctrl 1–9` jump, `⌘/Ctrl Shift T` reopen last closed (keep a 10-item closed history).
- **Preview tabs**: a single click on a list row opens a preview tab (italic label) that is replaced by the next preview; double-click, edit, or pin makes it permanent. `⌘/Ctrl Enter` on a row = open permanent tab without navigating.
- `role="tablist"` / `role="tab"` / `aria-selected` stay; arrow keys move between tabs.

### 2.2 Dossier record bar (one sticky row)
In `src/app/(app)/dossiers/[id]/page.tsx`:
- Replace the non-sticky header + sticky action row + sticky rappel banner with **one sticky record bar (~48 px)**: ref (mono) · assuré · compagnie · plaque (mono) · status badge · last observation badge (truncated, tooltip) · one primary action for the current step (e.g. "Planifier" / "Envoyer au chiffrage" / "Générer le rapport") · "⋯" menu (Envoyer un email, Historique, Exporter, Supprimer last and red).
- The rappel-session state becomes a slim amber segment inside the record bar (bell icon + "N modifications" + Sauvegarder / Annuler) rather than a third row. Keep all its behaviour (`handleValiderTraitement`, discard confirm).
- The step bar sits directly under the record bar (~40 px, single row). Update `ACTIVE_THRESHOLD` and the `top-[…]` offsets in `timeline-bar.tsx` accordingly — measure, don't guess.
- Above `xl` (1280 px): add an optional right context column (280 px, sticky under the bars) with three compact cards: Observations (last 3 + link), Rappels (active count + next date), Historique (last 3 entries + "Voir tout" opening the existing Sheet). Below `xl` these stay in their current sheets/dialogs.

### 2.3 Stepper with real status
In `components/dossier-timeline/timeline.tsx`, `timeline-bar.tsx` and a new `lib/dossier-steps.ts`:
- Compute a status per step from dossier data — **not** from array position and not from workflow-log keyword matching: `'todo' | 'in_progress' | 'done' | 'blocked'`. Derive from: planifications by type (Avant / En cours / Après), accord slots filled (1er, 2ème+), rapport generated, note d'honoraire present, chiffrage sent. Put the rules in one pure function with a table-driven spec and a small test file.
- Stamps ("Y. Naji · 30/08 14:12") come from the same data (createdBy/updatedAt of the relevant sub-document), rendered as helper text under the label. Every step can now show a stamp.
- Rendering (GOV.UK task-list semantics): `done` = ✓ muted; active = filled accent; `todo` = outline; `blocked` = grey, not clickable, tooltip explains why. Whole step is the control; keyboard focusable; `aria-current="step"`.
- Labels (short): Mission · Visite avant · Accord · Visite en cours · 2ᵉ accord · Visite après · Rapport · Honoraires. Keep step ids unchanged.
- No clipping: below `2xl` the row scrolls with fade edges and auto-centres the active step; at `2xl` and above render the vertical rail variant on the left (sticky) instead of the horizontal bar.
- Section navigation: switch the scroll listener to `IntersectionObserver`; clicking a step scrolls and moves focus to the section `<h2>`.
- Add "Tout déplier / Tout replier" next to the stepper; sections with `in_progress` or `blocked` status default open.
- Expose `getStepStatuses(dossier)` so `monitoring/page.tsx` can reuse it later (do not refactor monitoring in this phase).

### 2.4 Section rhythm on the dossier page
- One surface level per section: the section is the card; inner blocks separate with hairlines or 24 px gaps, not nested bordered cards.
- Uniform section header row: title · status chip · stamp · right-aligned actions (Modifier, Comparer…). Remove floating unanchored buttons.
- Drop-zone collapses to a one-line target once a document exists; the "no document" empty state is one sentence + one button.

### 2.5 Tables (start with `dossiers/client-page.tsx`, then apply the same to assignations lists and utilisateurs)
- `components/ui/table.tsx`: row hairlines only (no vertical cell borders), header on `bg-muted/40` with 12 px uppercase muted labels, 44 px rows, `scope="col"` on every `<th>`, wrapper `role="region" aria-label tabIndex={0}`. Retire `bg-heading-bg` on `<thead>`.
- Columns: `white-space: nowrap` + sensible `min-width`; refs and plaques in mono with `tabular-nums`; truncate long text with a `title` tooltip. Numeric columns `text-end`.
- Row = link to the dossier (opens a preview tab), chevron at the row end as the visible affordance; the inline view/history/delete icons become a "⋯" `DropdownMenu` (Ouvrir, Historique, Assigner, Exporter, separator, Supprimer in red).
- Sticky header inside the scroll region. Bulk-action bar (count · Assigner · Exporter · Annuler) slides in when `selectedRows` is non-empty.
- Filters become popover chips in the PageHeader `filters` slot: Statut ▾ · Compagnie ▾ · Période ▾ · + Filtre; applied-filter chips stay. Add a **Vues** menu: save the current filter set under a name (per user, localStorage first; Firestore `users/{uid}/views` if trivial), and reflect filters in URL search params so views are shareable.
- Column chooser surfaced as a "Colonnes" popover in the toolbar (state already exists).

**Phase 2 acceptance**: dossier page has exactly two sticky rows under the app header; record identity never leaves the screen; stepper shows ✓ for genuinely completed steps and a stamp on every completed step; tab strip is absent when nothing is open and never scrolls horizontally; Dossiers table has no vertical borders, no wrapping refs, no red trash in rows.

---

## Phase 3 — Command palette, keyboard, mobile shell, tokens

### 3.1 ⌘K as a navigation layer
Rebuild `components/global-search.tsx` on the existing `cmdk` `CommandDialog`:
- Groups: **Récents** (open tabs + MRU) · **Dossiers** (search by `refExpert` prefix, `matricule` via `normalizePlate` / `plate-match.ts`, assuré name — client-side index of the already-loaded scoped dossiers first, Firestore `>=`/`<=` prefix query as fallback) · **Aller à** (every visible nav item, role-filtered) · **Actions** (Nouveau dossier, Nouvelle planification, Envoyer un rappel, Mode sombre, Raccourcis clavier).
- Fuzzy match on labels; show the shortcut in a `<kbd>` slot on each item; `↵` opens, `⌘↵` opens in a new workspace tab; Backspace on empty input pops a nested page; focus is trapped and restored on close. Empty state in French.
- Keep the AI answer as an optional last row ("Demander à l'assistant…") that triggers `getAiSuggestion` only on select — never on every keystroke.

### 3.2 Shortcuts registry
- One `hooks/use-hotkeys.ts` registry (ignore when focus is in inputs/contenteditable/dialogs unless the binding says otherwise). Bindings: `g d` Dossiers · `g r` Rappels · `g t` Tableau de bord · `g c` Chiffrage · `g m` Terrain · `c` Nouveau dossier · `/` focus search · `?` shortcut sheet · `⌘/Ctrl K` palette · `⌘/Ctrl B` sidebar · list pages: `j`/`k` move row focus, `↵` open, `x` select.
- `?` opens a searchable sheet listing every binding (grouped). Show shortcut hints inside tooltips of the commands they trigger (search button, + Nouveau, sidebar toggle, row actions).

### 3.3 Mobile shell (below `lg` / 1024 px)
- Hide the sidebar Sheet and its trigger. Add a fixed **bottom navigation bar** with 3–4 labelled destinations derived from `NAV_GROUPS[].items[].mobileRank` per role (Agent de Terrain: Missions · Scanner · Rappels · Profil; Gestionnaire: Dossiers · Rappels · Recherche · Profil; Admin/Responsable: Tableau de bord · Dossiers · Rappels · Profil). Spec: 24 px icons, ≥ 56 px items, active pill indicator, `pb-[max(6px,env(safe-area-inset-bottom))]`. Never a hamburger, never a "Plus" tab; anything else lives on the Profil page (theme, langue, mon appareil, signaler un bug, déconnexion).
- Content bottom padding = bar height + safe area; toasts offset above the bar.
- Camera capture is the single FAB on the mission detail page (bottom-end, 56 px); the help button, if any, moves to Profil.
- Centred dialogs become bottom sheets below `lg` (`items-end`, rounded top only, `max-h-[92dvh]`, safe-area padding, `overscroll-behavior: contain`); side sheets become full-screen dialogs.
- Lists render card rows (64–72 px, name + status badge + row actions visible) below `md` with real markup — never `display:block` on a `<table>`. Filters open in a bottom sheet.
- Inputs ≥ 16 px computed font on mobile; `dvh` not `vh`; guard hand-written `:hover` with `@media (hover: hover)`.

### 3.4 Token pass (`globals.css`, `tailwind.config.ts`)
- **Accent budget**: remove the global `h1–h6 { color: heading-fg }` rule — headings use `foreground`; teal is for the primary button, active nav, focus ring, links. Ref columns are ink + mono, not teal.
- **Neutral ladder**: add `--surface-1` (card), `--surface-2` (hover / table header / section header), `--hairline` (= border), `--hairline-strong` (inputs, focus edge), `--text-muted` (≥ 4.5:1 on every surface — compute, don't eyeball). Retire `--heading-bg` / `--heading-fg` usages progressively (grep them; replace with surface-2 / foreground).
- **Depth**: hairlines over shadows. Cards: 1 px hairline, no hover shadow; shadows only on popovers/dialogs (2 small stacked layers). Header: hairline, no blur.
- **Type**: keep Outfit for H1/H2 and KPI values; add a text face for UI (Inter or IBM Plex Sans via `next/font`, exposed as `--font-ui`); body/table 14 px, labels 12 px, floor 12 px (fix the 10 px sidebar labels and badges); `font-variant-numeric: tabular-nums` on all numeric columns and KPIs.
- **Status pairs**: every semantic state is a `--status-<x>-bg` / `--status-<x>-fg` pair with dark variants at ≥ 4.5:1; replace hand-picked amber/emerald/red hexes in components (rappel banner, Sauvegarder button, "Overdue" pill) with the pairs. Solid fills only on the primary button.
- **Dark mode**: `enableSystem` on the ThemeProvider (default `system`); toggle lives in the avatar menu.
- Optional density switch (Compact 36 px / Normal 44 px rows) persisted per user, exposed in the avatar menu.

**Phase 3 acceptance**: from anywhere, `⌘K` + 3 keystrokes opens a dossier by ref or plaque; `?` lists every shortcut; on a 390 px viewport there is no hamburger, a labelled bottom bar, and no horizontal scroll anywhere; all headings are ink-coloured; no `text-[10px]` remains; contrast of muted text ≥ 4.5:1 in both themes.

---

## Phase 4 — Explore (only after 1–3 are merged)
- Side-peek on list pages via an intercepting route (`@peek/(.)dossiers/[id]`), `Space` toggles, `↑/↓` moves through rows; hard navigation still renders the full page.
- Rappels as an inbox: unread, `j/k`, `u` toggle read, deep-link to `/dossiers/{id}#step-{n}` with focus moved to that section.

---

## Deliverables per phase
1. Plan (files per task) → 2. implementation → 3. `tsc`, build, screenshots looked at (desktop + 390 px, light + dark) → 4. commit `nav-upgrade(phase N): …` → 5. summary: what changed, what was deferred and why, any rule from this file you could not honour and the reason.
Also append the adopted conventions (labels source, PageHeader usage, accent budget, token names, shortcut list) to `DESIGN.md` (create it if missing) so future features inherit them.
