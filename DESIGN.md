# SL-auto — Design conventions

Adopted during the navigation / app-shell upgrade (see `UI-NAVIGATION-UPGRADE-PROMPT.md` and `docs/navigation-study.html` for the evidence). New features inherit these rules.

## 1. Names come from one place

- `src/lib/nav-groups.ts` is the single source of truth for every destination: `label` (short, ≤ 2 words — sidebar, breadcrumb, mobile bar), `title` (long page heading), `subtitle`, `roles`, `mobileRank`, `hotkey`.
- Never hand-write a destination name in a page. Use `<PageHeader title=…>` and, for records, the record bar — both register the title for the breadcrumb and `document.title` (`components/layout/page-chrome.tsx`).
- A dossier is always named `REF · Assuré` (`lib/dossier-label.ts`) — tabs, breadcrumb, recents, palette, `document.title`.
- Groups: **Opérations**, **Assignations**, **Administration**. "Signaler un bug" lives in the sidebar footer help menu and on Profil (group `placement: 'footer'`).

## 2. Shell anatomy

- **Sidebar** = product navigation only. Tinted active row + 2 px accent bar (no solid fill), hairline border, no shadow, no editing inside the nav. Footer = help menu + collapse toggle (`⌘/Ctrl B`). A **Récents** group lists the last 5 opened records (from the workspace store).
- **Header** = universal actions, in this order: search trigger (`⌘/Ctrl K`), **+ Nouveau** (role-aware), rappels bell, avatar menu (profil, thème, raccourcis, bug, déconnexion). Nothing page-specific goes here.
- **PageHeader** (`components/layout/page-header.tsx`) owns the title (24–28 px / 600, Outfit), optional count pill, `meta`, one primary `actions` slot (at most one filled button), then `tabs`, then `filters`. It moves focus to the H1 on route change and announces the page (`aria-live`).
- **Workspace tabs** (`components/layout/workspace-tabs.tsx`, store in `hooks/use-workspace-tabs.tsx`): hidden until a record is open; one strip per kind (dossier, chiffrage); preview tabs on single click, permanent on double-click / "Ouvrir dans un onglet" / edit; unsaved dot via `useTabDirty`; overflow menu; drag reorder; middle-click closes.
- **Mobile (< lg / 1024 px)**: sidebar hidden, fixed bottom bar with the 3 top-ranked visible destinations + Profil (`mobileRank`), content padded by `60px + safe-area`. Never a hamburger, never a "Plus" tab. Dialogs are bottom sheets, side sheets are full-screen.
- **Record pages** (dossier): one sticky **record bar** (`components/dossiers/record-bar.tsx`, 48 px): ref (mono) · assuré · compagnie · plaque · statut · primary action for the current step · "⋯" menu. Stepper right under it. Context column (Observations / Rappels / Historique) at ≥ xl. Route is "flush" (no layout padding) — see `FLUSH_ROUTE_PATTERNS` in `app/(app)/layout.tsx`.

## 3. Workflow steps

- `lib/dossier-steps.ts` computes `todo | in_progress | done | blocked` per step from dossier fields (same fields as the monitoring funnel). Tests: `npx tsx --test src/lib/__tests__/dossier-steps.test.ts`.
- Rendering (GOV.UK task list): ✓ muted = done, filled accent = active, outline = to-do, dashed grey + lock = blocked (tooltip says why). Helper text = `dd/MM/yyyy HH:mm · user`. Short labels: Mission · Visite avant · Accord · Visite en cours · 2ᵉ accord · Visite après · Rapport · Honoraires.
- Horizontal bar scrolls with fade edges and auto-centres; vertical rail at ≥ 2xl. Scroll-spy via IntersectionObserver; clicking a step moves focus to the section `<h2>`.

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
