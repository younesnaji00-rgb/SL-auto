# SL-auto — Design conventions

Adopted during the navigation / app-shell upgrade (see `UI-NAVIGATION-UPGRADE-PROMPT.md` and `docs/navigation-study.html` for the evidence). New features inherit these rules.

## 1. Names come from one place

- `src/lib/nav-groups.ts` is the single source of truth for every destination: `label` (short, ≤ 2 words — sidebar, breadcrumb, mobile bar), `title` (long page heading), `subtitle`, `roles`, `mobileRank`, `hotkey`.
- Never hand-write a destination name in a page. Use `<PageHeader title=…>` and, for records, the record bar — both register the title for the breadcrumb and `document.title` (`components/layout/page-chrome.tsx`).
- A dossier is always named `REF · Assuré` (`lib/dossier-label.ts`) — tabs, breadcrumb, recents, palette, `document.title`.
- Groups: **Opérations**, **Assignations**, **Administration**. "Signaler un bug" lives in the sidebar footer help menu and on Profil (group `placement: 'footer'`).

## 2. Shell anatomy

- **Sidebar** = product navigation only, on the cream ladder via `sidebar-*` tokens (user ruling: the navy third colour lives INSIDE pages, never on the nav). Active row = `sidebar-active` + 2 px teal bar and icon; hover = `sidebar-accent`; labels/icons `sidebar-muted`; no shadow, no editing inside the nav. Footer = help menu + collapse toggle (`⌘/Ctrl B`). A **Récents** group lists the last 5 opened records (from the workspace store).
- **Header** = universal actions, in this order: search trigger (`⌘/Ctrl K`), **+ Nouveau** (role-aware), rappels bell, avatar menu (profil, thème, raccourcis, bug, déconnexion). Nothing page-specific goes here.
- **PageHeader** (`components/layout/page-header.tsx`) owns the title (24–28 px / 600, Outfit), optional count pill, `meta`, one primary `actions` slot (at most one filled button), then `tabs`, then `filters`. It moves focus to the H1 on route change and announces the page (`aria-live`).
- **Workspace tabs** (`components/layout/workspace-tabs.tsx`, store in `hooks/use-workspace-tabs.tsx`): hidden until a record is open; one strip per kind (dossier, chiffrage); preview tabs on single click, permanent on double-click / "Ouvrir dans un onglet" / edit; unsaved dot via `useTabDirty`; overflow menu; drag reorder; middle-click closes.
- **Mobile (< lg / 1024 px)**: sidebar hidden, fixed bottom bar with the 3 top-ranked visible destinations + Profil (`mobileRank`), content padded by `60px + safe-area`. Never a hamburger, never a "Plus" tab. Dialogs are bottom sheets, side sheets are full-screen.
- **Record pages** (dossier): one sticky **record bar** (`components/dossiers/record-bar.tsx`, 48 px): ref (mono) · assuré · compagnie · plaque · statut · primary action for the current step · "⋯" menu. Stepper right under it. Context column (Observations / Rappels / Historique) at ≥ xl. Route is "flush" (no layout padding) — see `FLUSH_ROUTE_PATTERNS` in `app/(app)/layout.tsx`.

## 3. Workflow steps

- `lib/dossier-steps.ts` computes `todo | in_progress | done | blocked` per step from dossier fields (same fields as the monitoring funnel). Tests: `npx tsx --test src/lib/__tests__/dossier-steps.test.ts`.
- Rendering (GOV.UK task list): ✓ muted = done, filled accent = active, outline = to-do, dashed grey + lock = blocked (tooltip says why). Helper text = `dd/MM/yyyy HH:mm · user`. Short labels: Mission · Visite avant · Accord · Visite en cours · 2ᵉ accord · Visite après · Rapport · Honoraires.
- Horizontal bar scrolls with fade edges and auto-centres; vertical rail at ≥ 2xl. Scroll-spy via IntersectionObserver; clicking a step moves focus to the section `<h2>`.
- **Step separation** (GOV.UK step-by-step / Material vertical stepper): each step is a paper card with a 36 px numbered medallion in a left gutter (✓ when done, teal fill when in progress, outlined when to-do, lock when blocked) joined by a 2 px rail, and 32 px of canvas between cards. Boundaries come from the rail + whitespace — never thick rules or background swaps.

## 4. Lists & tables

- `components/ui/table.tsx`: row hairlines only, header on `bg-muted/40` with 11.5 px uppercase labels, 44 px rows (36 px in compact density), `scope="col"`, `white-space: nowrap`, `tabular-nums` on all `td/th`. The wrapper is a focusable `role="region"` (`regionLabel` prop).
- Row = link (preview tab); chevron at the row end; all secondary actions in a "⋯" menu with **Supprimer** last, separated, red. No inline delete icons.
- Refs and plates in `font-mono`, ink-coloured (not accent).
- Filters: persisted per page **and** mirrored into `?f=` (shareable) by `usePersistedFilters`. Saved views: `components/ui/saved-views.tsx` (`views_<key>` in localStorage).
- Empty states: state + reason + one action (NN/g).

## 5. Keyboard

Registry: `hooks/use-hotkeys.ts` (single keys and `g`-chords; ignored inside inputs unless `allowInInput`). Sheet: `?`. Show shortcuts in tooltips/menus (`<Kbd>`), never only in the sheet.

| Keys | Action |
|---|---|
| `⌘/Ctrl K`, `/` | Palette / recherche |
| `?` | Raccourcis |
| `c` | Nouveau dossier |
| `g d` · `g r` · `g t` · `g s` · `g c` · `g m` · `g u` | Dossiers · Rappels · Tableau de bord · Suivi · Chiffrage · Terrain · Utilisateurs |
| `⌘/Ctrl B` | Barre latérale |
| `Maj D` | Mode sombre |
| `Alt W` · `Alt 1–9` · `Alt ←/→` · `Alt Maj T` | Onglets : fermer · aller à · précédent/suivant · rouvrir |

(`Ctrl/⌘ W` and `Ctrl Tab` are browser-reserved — tab shortcuts use Alt.)

## 6. Visual tokens (`globals.css`, `tailwind.config.ts`)

- **Type**: `font-body` = Inter (UI, tables, forms; 13–14 px, floor 11 px), `font-headline` = Outfit (H1/H2, KPI values). No `text-[10px]` or smaller.
- **Accent budget**: teal (`primary`) only for the primary button, the active nav item, the focus ring and links. Headings are ink (`foreground`). Refs are ink + mono.
- **Neutral ladder**: `background` → `surface-1` (card) → `surface-2` (hover / table header / section header) → `surface-3`; `hairline` / `hairline-strong`. Structure through hairlines and surface steps, not shadows (shadows only on popovers/dialogs).
- **Status pairs**: `status-{success,warning,danger,info}-{bg,fg}` — every semantic state uses a pair (≥ 4.5:1 in both themes, verified). Solid fills only on the primary button. Retire hand-picked `emerald-*` / `amber-*` / `red-*` classes as you touch them.
- **Radius**: `--radius` 8 px; controls 6 px (`rounded-md`), cards 8–12 px, badges pill. Inner radius = outer − padding.
- **Dark mode**: system by default (`ThemeProvider defaultTheme="system"`); the toggle lives in the avatar menu and on Profil.
- **Density**: `<html data-density="compact">` (Profil → Affichage) shrinks table rows to 36 px.
- **Motion**: animate only `transform`/`opacity`; never `transition-all`; 100–200 ms controls, 200–300 ms panels; everything respects `prefers-reduced-motion` (`motion-reduce:*`, guarded smooth scroll).
- **Inputs**: ≥ 16 px computed font below `md` (`text-base md:text-sm`) so iOS doesn't zoom.

## 7. Loading & feedback

- Every route has a `loading.tsx` built on `<PageSkeleton variant=…>` mirroring its header + primary block (frame-only skeletons are spinner-equivalent).
- Errors inline (`role="alert"`); toasts only for passive confirmations.

## 8. Checklist for a new page

1. Add the destination to `nav-groups.ts` (label, title, roles, `mobileRank` if it belongs in the bottom bar, `hotkey` if it deserves one).
2. Render `<PageHeader …>` first; one primary action in `actions`.
3. Add `loading.tsx`.
4. Tables via `components/ui/table.tsx`; row menu for actions; filters through `usePersistedFilters`.
5. No new hexes — use tokens. No text under 11 px. No `transition-all`.

## 9. Dossier content patterns (added with the documents / information redesign)

- **Read-only forms** (Informations): `Section` (hairline header with icon + 14 px/600 title) containing definition lists — label 11 px uppercase muted over value 14 px/500; empty = `—` muted. No beige bands, no cell borders. Edit mode swaps the value for the control in place.
- **Document board**: families as hairline-separated blocks with a 13 px/600 name + count pill; slots in a responsive grid (`sm:2 xl:3 2xl:4`), never a horizontal scroller. Slot header carries a status chip (Reçu / En attente / À déposer); document rows are 36 px with hover-revealed delete; "Ajouter un document" is a dashed full-width button.
- **Planifications**: calendar-style list rows (date block · type chip · agent · zone/adresse · Modifier), newest first and emphasised; details in a dialog.
- **Step facets are underline tabs** (`components/dossier-timeline/step-tabs.tsx`, M3 primary tabs / Carbon line tabs): every dossier step is a uniform `.paper` card; inside it, facets switch via tabs (step 1 Informations | Documents — the AI pre-fill strip lives in Informations with the form it feeds; visit steps Planification | Photos | Observations; accord steps Documents | Observations). Selected tab is remembered per step (sessionStorage). Never collapsibles for step facets — their chevrons are invisible to first-time users.
- **Step 1 arrangement** (NN/g: tabs only for content not needed simultaneously): tab **Informations** = purpose-named picker « Pré-remplir depuis un document » + one-line source status + the form, with the source document rendered in a side pane ONLY when the user clicks « Comparer » (never auto-opened — user ruling); tab **Pièces** = a GRID OF SLOT SOCKETS (same three-state tiles as the accord board — one visual language for every document in the dossier; never a checklist/table here) under quiet `t-label` group labels « Pièces requises » / « Autres documents », the single picker « Ajouter des pièces », and the single primary « Envoyer vers chiffrage ». Both tabs carry a state badge (missing fields · n/m pièces). Decision made by the user among four researched layouts (two steps · form + rail · completeness panel · keep tabs) — do not reopen without new evidence.
- **Layout choreography**: every layout change (focus mode, sidebar, panels) animates with the shared `ease-standard` curve (Material standard, cubic-bezier(0.2,0,0,1)) at 300 ms; outgoing content fades first (150 ms), tracks animate (`grid-template-columns` / `grid-template-rows` / `max-width` are animatable — use 0fr/0px tracks with `min-w-0 overflow-hidden` wrappers, never `display:none` mid-motion), incoming content fades in with a 150 ms delay. Anything that must animate out stays mounted via `hooks/use-presence.ts`. All of it under `motion-reduce:transition-none`.
- **Focus mode** (`hooks/use-focus-mode.ts`): « Comparer » raises a page-level signal — the app sidebar collapses (restored on exit), the steps rail/bar and the context column retract, and the form + source document split the width 50/50 (`lg:grid-cols-2`). Any future side-by-side task should raise the same signal rather than invent its own layout.
- **Boîte de dépôt** (`components/dossier-timeline/smart-inbox.tsx`): the single entry point for files, rendered as a PLAIN « Choisir des fichiers » button (no banner, no icon, no copy — user ruling) that is also a drop target (ring highlight on drag-over); the class chips only appear while something is queued or being dragged. Never bring back banners or dashed panels. Upload → `/api/classify-document` (Gemini + retrieval of user-validated examples from `ai_examples`) → filed under the matching slot type → same post-processing as a manual upload. Corrections (select or drag onto a class chip) and confirmations post to `/api/classify-feedback`; InformationTab posts field diffs after an AI pre-fill to `/api/extract-feedback`, which `/api/scan-document` reads back as guidance. Classes live in `lib/doc-classes.ts`; the retrieval layer in `lib/ai-memory.ts` (server-only, Admin SDK). Vector search needs the `ai_examples.embedding` index in `firestore.indexes.json` (`firebase deploy --only firestore:indexes`); until then retrieval falls back to recent examples.
- **Lightbox** (`components/document-preview-lightbox.tsx`): the window follows the media's orientation at lg+ — portrait image/PDF (A4 default) → tall window (height leads, width from the natural ratio), landscape → wide window; below lg it stays the bottom-sheet dialog. Pass `hideCloseButton` — the header has its own controls. Multi-page documents: pass `pages` (the slot's files) + `onPageChange` → ‹ › paging, arrow keys, « i / n ».
- **Multi-page slots**: the files of one slot are the PAGES of one document (carte grise recto/verso). A filled socket with ≥ 2 files shows a 2-up page strip (+n overlay), « n pages » in the meta line, numbered page pills with per-page actions, « Ajouter une page »; the lightbox pages through them. Never list them as separate documents.
- **Car diagrams**: `car-svg-top.tsx` / `car-svg-bottom.tsx` are the single source of geometry; `lib/rapport-car-pdf.tsx` and `lib/rapport-car.ts` must stay faithful ports (same viewBox, zone ids and highlight colour) so the PDF matches the editor.

## 10. Visual hierarchy system (60 / 30 / 10, tone, ink, type roles)

Sources: NN/g "Using Color to Enhance Your Design" (three colours, 60-30-10), Material 3 tone-based surfaces (surface-container ladder), Apple HIG label → quaternaryLabel text hierarchy, Refactoring UI (emphasise by de-emphasising; weight and colour before size; fewer borders; labels are secondary), Stripe (deep-navy ink as the universal text colour + one featured navy surface), IBM Carbon / Linear (few type sizes, 8-pt spacing).

### Colour roles
The third colour is **terracotta** (≈16°) — teal's warm complement and the cream canvas's deepened sibling; the user chose it over plum/ochre after navy surfaces were rejected. Slate navy survives only as the ink hue of text. Keep terracotta rare enough that it never competes with the red status pair.

| Share | Role | Tokens | Where |
|---|---|---|---|
| 60 % | Canvas & paper (warm cream) | `background`, `card`, `surface-1…4`, `hairline` | page, cards, table headers, hovers |
| 30 % | Slate-navy ink + terracotta | `ink`, `ink-2`, `ink-3`, `ink-4`; `tertiary(-deep/-bg/-foreground)` | ink: all text and icons. terracotta: the few in-page warm elements listed below — never the sidebar, never header bands |
| 10 % | Accent (teal) | `primary`, `accent`, `ring` | primary button, active nav, links, focus, selected step |

- **Ink ladder = emphasis, not colour picking**: `ink` values & titles · `ink-2` secondary text, inactive step titles · `ink-3` labels, helper, meta, icons · `ink-4` disabled / decorative only (below 4.5:1 — never for information). Retire `text-foreground/90`, `text-muted-foreground/60`, `opacity-70/80` on text.
- **Terracotta** (`tertiary` tokens — the third colour, user-picked): (a) at most ONE featured card per page (`<Card variant="featured">` / `.paper-featured`); (b) the next-visit date block in Planifications; (c) ordinal medallions on accord families; (d) the warm chart series (`chart-4`). Solid fill = `bg-tertiary text-tertiary-foreground`; on cream use `text-tertiary-deep` / tint `bg-tertiary-bg`. NEVER on actions (teal's job), never near destructive/status UI (it sits close to red), never as header bands, never on the sidebar. Navy (`ink-solid`) is retired to functional dark backdrops only (lightbox media area).
- Semantic status pairs stay separate from the accent; teal never carries meaning.

### Surfaces (tone before borders)
- Canvas `background` (M3 container-low) → paper `card` (container-lowest) → `surface-2` (container: section/table header, sidebar) → `surface-3` (hover) → `surface-4` (pressed/selected).
- `<Card>` default `tonal`: paper + level-1 shadow, **no border** in light mode (hairline ring in dark). `outline` only for a card nested in paper (inner radius = outer − padding). `flat` = `surface-2` well. Never stack two tonal cards.
- Hairlines separate rows inside a surface; spacing separates blocks. Remove a border before adding one.
- Dossier page: the **active step is the only paper card**; other steps sit flat on the canvas with `t-heading text-ink-2` titles.

### Type roles (`globals.css` → `.t-*`)
`t-display` 28/600 Outfit (page title) · `t-title` 20/600 Outfit (active step, card group title, KPI value) · `t-heading` 15/600 (block title) · `t-body` 14 · `t-body-sm` 13 (dense lists) · `t-caption` 12 ink-3 · `t-label` 11/500 caps +0.06em ink-3 · `t-mono` 13 mono. Two families max on a page; hierarchy comes from weight and ink level, not from adding sizes. Body measure ≤ 65ch.

### Spacing rhythm (8-pt)
Page padding 24 (32 at ≥ xl) · between page sections 32 (`space-y-8`) · card padding 20 (`p-5`) · between blocks in a card 16 · label→value 4 · field grid `gap-x-6 gap-y-3`. Start with more space, then tighten; density mode shrinks rows, not padding.

### Reading order (what to see first)
1. Page title (`t-display`) + the single primary action. 2. The featured/active surface. 3. Paper cards in reading order. 4. Meta in `ink-3`. If two things compete, de-emphasise one (Refactoring UI) instead of enlarging the other.
