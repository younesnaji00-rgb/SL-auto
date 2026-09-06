# Mobile pass — synthesis and binding decisions (2026-09-06)

Six research reports (`mobile-shell-navigation.md` A, `mobile-lists-tables.md` B,
`mobile-forms-inputs.md` C, `mobile-overlays-feedback.md` D, `mobile-record-pages.md`
E, `mobile-density-readability.md` F) feed this file. Owner ask: « implement
everything ». Where a report left an owner question, the call below is mine and
is listed in §9 so the owner can reverse it in one line.

## 1. Breakpoints — three shells (A11, B13.9)

| Class | Width | Chrome |
|---|---|---|
| **phone** | < 768 (`max-md:`) | 48 px top bar with the page title · bottom nav bar · sheets · single column · row lists |
| **tablet** | 768–1023 (`md:max-lg:`) | collapsed 64 px icon rail · 56 px top bar with breadcrumb · tab strip (no drag) · centred dialogs ≤ 640 · side sheets 420 px |
| **desktop** | ≥ 1024 (`lg:`) | unchanged |

`useViewportClass()` (`src/hooks/use-viewport-class.ts`) returns
`'phone' | 'tablet' | 'desktop'`; `useIsPhone()` and `useIsCoarsePointer()` derive
from it. `useIsMobile()` (1024) is retired: every call site is re-read and moved to
the class it actually means. Never `sm:` as "phone" — phone rules are unprefixed
or `max-md:`. Phone landscape (`max-height: 500px`): bottom bar hidden, top bar
40 px. Density zoom is monitor-only (done in `app/layout.tsx`).

## 2. Shell (A)

- **Bottom bar** (`mobile-nav.tsx`): combo rule. Role sees ≤ 4 ranked destinations
  → all + Profil. Role sees ≥ 5 → top 4 + « Plus » (LayoutGrid icon) opening a
  `BottomSheet tall` grouped like the sidebar, then Profil, Signaler un bug,
  Déconnexion. Per role: Admin / Responsable → Tableau de bord · Dossiers ·
  Rappels · Chiffrage · Plus; Gestionnaire → Dossiers · Rappels · Tableau de bord
  · Consultation · Profil; Chiffreur → Chiffrage · Tableau de bord · Profil;
  Directeurs → Consultation · Jours fériés · Profil; Agent de Terrain → Missions ·
  Tableau de bord · Profil. `mobileRank` becomes an explicit per-role order in
  `nav-groups.ts` (`mobileOrder?: Record<role, number>` or per-role arrays). Bar =
  56 px + `max(8px, env(safe-area-inset-bottom))`, 48×48 hit areas, 24 px icons,
  11.5–12 px one-line labels, active pill 56×32 `bg-accent`, badge on Rappels only.
  Never hides on scroll; hidden while the keyboard is open (`visualViewport`
  height shrink > 150 px) and in landscape; replaced by a bottom action bar on
  record/mission/editor pages (one bar at a time).
- **Top bar** (`header.tsx`, phone branch): 48 px + safe-area-top. Leading = brand
  monogram on root destinations, « ‹ Parent » up-link elsewhere (chevron + parent
  short label ≤ 12 chars, from `useCrumbs`). Centre = page title from the
  `PageChromeProvider` registry (`t-title` 17 px/600, one line, ellipsis) + count
  pill. Trailing = at most two 40 px icon buttons (page primary action, bell) +
  32 px avatar. Overflow actions → « ⋯ » `ActionSheet`. Pinned (never scroll-away)
  except read-only viewers. Bell → `BottomSheet tall` of rappels (D10).
- **PageHeader** on phones: registers `title`, `count`, `primaryAction`,
  `secondaryActions` into the chrome registry and renders only the `tabs` row
  (full-width segmented / scrollable chips, sticky under the top bar at `top: 48px`)
  and the `filters` row (family B's search row). `subtitle`, `meta`, `backHref` are
  not painted on phones. API: `PageHeader` gains `primaryAction?: { label, icon,
  onClick | href }` and `secondaryActions?: ActionItem[]`; existing `actions` JSX
  keeps working on ≥ md.
- **Workspace tabs**: hidden < 768. A « N » switcher chip (folder icon + count) in
  the top bar trailing slot when ≥ 2 tabs of the current kind → `BottomSheet`
  listing open records (56 px rows, dirty dot, 44 px ×, active highlighted,
  « Fermer les autres »). 768–1023: strip returns, drag disabled on coarse pointers.
- **Back / up**: up = the leading link; back = platform. Every overlay
  (`BottomSheet`, `FullScreenDialog`, `ActionSheet`, sheets, photo viewer) pushes
  `history.state.overlay` on open and closes on `popstate`
  (`useOverlayHistory`). No `@capacitor/app` dependency needed: with history
  entries the WebView's default back closes the overlay. Root destinations: no
  interception.
- **Primary action**: list pages → filled 40×40 `+` icon button in the top bar
  (generalised `QuickCreate`); record/mission/editor pages → 56 px bottom action
  bar (one filled button right, ≤ 2 icon actions left) that replaces the nav bar.
  No FAB on phones. The tutorial « ? » launcher is hidden < 768 and becomes a row
  in the Plus sheet / Profil and an item of the « ⋯ » sheet.
- **Search**: no ⌘K on phones; list pages keep their own search field; a 40 px
  search icon in the top bar focuses it. No keyboard hints < md.
- **Viewport**: `interactive-widget=resizes-content` added; shell `h-svh`;
  full-screen overlays `100dvh`; `--bottom-bar` CSS variable = current bottom bar
  height + inset so `<main>`, toasts and sheets offset by it.

## 3. Overlays & feedback (D)

- **`BottomSheet`** (`components/ui/bottom-sheet.tsx`, Radix Dialog): handle zone
  24 px (pill 32×4, 48×48 tap target toggling default ↔ tall), header 48 px
  (`t-title` 17 px left + 44×44 « × » right), body `overflow-y-auto
  overscroll-contain px-4`, sticky footer (`pb-[max(16px,safe-area)]`, primary 48
  px full width at the bottom, ghost « Annuler » above it). Detents: `default`
  ≤ 60 dvh, `tall` 92 dvh. Swipe-to-dismiss on handle + header only (Δy > 96 px
  or v > 0.11 px/ms). Scrim colour-only < md (no blur). Radius 16 top,
  `glass-strong`. Enter 300 `ease-enter`, exit 200 `ease-standard`.
- **`Dialog`** (existing): < md it renders as a `BottomSheet default` when its
  body is short (≤ 3 fields, no picker) — the default; any dialog with > 3 fields
  or a Select/Calendar/Textarea-heavy form opts into `fullScreen` and becomes a
  **`FullScreenDialog`**: 56 px sticky header (« × » 44 left, `t-title` 17,
  text primary right « Enregistrer »/« Envoyer » 44 px tall), body `px-4 pb-24
  overflow-y-auto overscroll-contain` single column, dirty → AlertDialog
  « Abandonner les modifications ? » [Continuer la saisie] [Abandonner]. Focus on
  the heading. Slide from the right 300 / 200. Applies to: planification,
  chiffrage, réclamation, e-mail, create-dossier (if > 3 fields), chiffreur,
  options manager, reforme, devis preview options, rapport type.
- **`ActionSheet`** (`components/ui/action-sheet.tsx`): `BottomSheet default`
  whose body is a list of 52 px rows (icon 20 ink-2 + 15 px label), hairlines,
  destructive last and separated, ≤ 6 rows, no Cancel row. `DropdownMenu` gets a
  phone adapter: every `DropdownMenuContent` renders through `ActionSheet` on
  coarse pointers (`ResponsiveMenu` wrapper); submenus flattened. Hover-revealed
  clusters are gated `[@media(hover:hover)]` and replaced by a permanent 44×44
  « ⋯ » on touch. No long-press in this pass.
- **Tooltips**: `TooltipProvider` disabled on coarse pointers; icon-only controls
  keep `aria-label`; explanatory hints become `Toggletip` (24 px « i » → Popover
  280 px). No `title`-only icons.
- **Toasts**: < md viewport at `left-4 right-4 bottom: calc(var(--bottom-bar) +
  12px)`, `swipeDirection="down"`, one at a time, 5 s passive / 8 s with action,
  errors never as toasts.
- **AlertDialog** on phones: centred, `calc(100% − 32px)` max 360, stacked 48 px
  buttons, destructive on top, « Annuler » below, no scrim-tap dismissal for
  destructive, initial focus on « Annuler », labels name the outcome.
- **Depth budget**: page → one modal → only a non-modal picker or one AlertDialog
  above a FullScreenDialog. Never sheet-on-sheet. A sheet that needs a calendar
  promotes to FullScreenDialog. A peek sheet → observations dialog pair becomes an
  in-sheet expand.
- **Loading**: overlays open with held data; skeleton in the final shape after
  300 ms only; optimistic + rollback for toggles/mark-read/reassign (existing).
- **Palette** < md: no ⌘K chrome; opened from the top-bar search icon as a
  `FullScreenDialog` with the input pinned in the header (16 px), rows 52 px.
- **Bell** < md: `BottomSheet tall`, header « Rappels · n non lus » + « Tout
  marquer comme lu », rows 56 px, tap = close then navigate, footer « Voir tous
  les rappels ».

## 4. Lists & tables (B)

- **Record row** (`components/ui/record-row.tsx` + `MobileList`): below md every
  record `<Table>` renders a `<ul>` of full-bleed rows, hairlines only, no card
  frame, no chevron, no per-row ⋯. Line 1 = identifier `t-mono` 14/600 + decision
  figure trailing (ancienneté / délai chip / short date); line 2 = name `t-body`
  14 ink + « · compagnie » ink-2 (chiffrage: assuré · plaque); line 3 = status chip
  + observation badge. 2-line 64 px, 3-line 84 px, 16 px side padding, vertically
  centred. Whole row = one tap = open. Dossiers rows always 3 lines (status chip
  alone when no observation).
- **Frozen table** survives only for figure comparison (monitoring, utilisateurs
  stats, compagnies amounts, jours fériés): viewport-wide scroll region, right
  edge cutting a column + 24 px fade overlay that disappears at scroll end
  (`ScrollFade` wrapper), identifier + ≤ 3 figure columns by default, « Colonnes »
  `BottomSheet` check list, frozen column `min-w` 8rem on phones, sort in header.
- **Search row**: 48 px sticky under the top bar (`top: 48px`): search Input
  (flex-1, 16 px, leading icon, trailing × clear, `enterkeyhint="search"`),
  « Filtres » 44×44 icon button with count badge, « Trier : <current> » ghost
  where a sort exists. Hides on scroll-down, returns on scroll-up (bands then pin
  at 48). Client-side filtering from the 2nd character, 150 ms debounce.
- **Filtres sheet** (`components/ui/filter-sheet.tsx`): `BottomSheet tall`
  (full height for /dossiers), header « Filtres » + ×, sections `t-label` +
  control with a selection marker, date presets as a single-select chip set, sticky
  footer « Réinitialiser » ghost + filled « Afficher N dossiers » (live count from
  the pending state), batch apply, × discards. Applied-chip row under the search
  row (36 px, horizontal scroll, `FilterChip` with ×, « Tout effacer » when ≥ 2),
  KPI-tile filters (scope, lateOnly, preset) appear as chips too. Selects inside
  the sheet = native `<select>` on coarse pointers (family C), never a nested
  sheet.
- **Sort**: ghost « Trier : Plus récents » → `BottomSheet` « Trier par »
  single-select radio list, 48 px rows, applies on tap. Dossiers: Plus récents /
  Plus anciens / En retard d'abord; chiffrage: Délai le plus proche / le plus
  lointain; consultation: Plus récents / Plus anciens. Mes rappels: none.
- **Selection / Rappeler**: kept. Entry = header « Rappeler » (in the « ⋯ » sheet
  or as the page primary while in mode). In mode the top bar becomes a 56 px
  contextual bar (× left, « 3 sélectionnés », « Tout sélectionner » right), rows
  gain a leading 24 px checkbox, row tap toggles, selected `bg-accent/40`, a 56 px
  bottom action bar « Envoyer à (3) » replaces the nav bar; × / back exits mode.
- **Paging**: phone lists cap at 25 rendered rows + « Afficher 25 de plus » 48 px
  outline with « 25 sur 312 dossiers » caption; queues ≤ 100 render all; no page
  numbers / rows-per-page on phones; restore cap + scroll on back
  (`sessionStorage` keyed by route + filters); `overflow-anchor: auto`.
- **Master-detail** (Mes rappels): single pane; row tap pushes `?id=` detail as a
  full page (top bar « ‹ Rappels » + ref), bottom action bar « Marquer traité »
  tonal + « Ouvrir le dossier » filled; segments « À traiter (n) / Traités » sticky
  under the search row. No sheet for the detail.
- **Band headers**: 40 px, `t-label` + count pill, `bg-surface-2` solid, sticky
  inside their group at `top: 48 + 48`. Sticky budget ≤ 144 px.
- **Row actions**: tap = open only; history chips are not tap targets in rows;
  no swipe actions in this pass.
- **States**: skeleton = the row anatomy × 6 after 200 ms; filtered-empty names
  the fix (« Réinitialiser les filtres »); disconnected banner « Connexion perdue —
  Recharger ». No custom pull-to-refresh; page scroller keeps
  `overscroll-behavior-y: auto`; sheets `contain`.
- **Density switch** hidden < md (one density).

## 5. Forms & inputs (C) — see `mobile-forms-inputs.md`

Appended when the report lands. Until then implementers follow element-specs §7
plus: single column below md, 16 px input text, native `<select>` /
`<input type="date|time">` on coarse pointers, `inputmode`/`autocomplete`/
`enterkeyhint` on every field, labels above, errors inline, submit in the
FullScreenDialog header or a sticky bottom bar on pages.

## 6. Record pages (E) — see `mobile-record-pages.md`

Appended when the report lands.

## 7. Density & readability (F) — see `mobile-density-readability.md`

Appended when the report lands. Provisional: phone page padding 16 px, card
padding 16 px, `t-display` 24 px on phones, 44 px minimum targets with 8 px
between, stat tiles 2-up with one 32 px hero, glass blur on bars only.

## 8. Shared primitives (built first, everyone imports them)

| File | Export | Notes |
|---|---|---|
| `hooks/use-viewport-class.ts` | `useViewportClass`, `useIsPhone`, `useIsCoarsePointer` | matchMedia, SSR-safe (`'desktop'` until mounted, then real) |
| `hooks/use-overlay-history.ts` | `useOverlayHistory(open, onClose)` | pushState on open, close on popstate, pops its own entry on programmatic close |
| `components/ui/bottom-sheet.tsx` | `BottomSheet` `{ open, onOpenChange, title, description?, detent?, footer?, hideHandle?, children }` | D §1 anatomy |
| `components/ui/action-sheet.tsx` | `ActionSheet` `{ open, onOpenChange, title?, items: ActionItem[] }`, `ActionItem` | D §3 |
| `components/ui/full-screen-dialog.tsx` | `FullScreenDialog` `{ open, onOpenChange, title, primary?: { label, onClick, disabled, loading }, dirty?, children }` | D §2 |
| `components/ui/dialog.tsx` | `DialogContent` props `fullScreen?`, `primary?`, `dirty?` | phone: fullScreen → FullScreenDialog, else BottomSheet |
| `components/ui/responsive-menu.tsx` | `ResponsiveMenu` (DropdownMenu ≥ md / ActionSheet on coarse) | D §3 |
| `components/ui/record-row.tsx` | `RecordRow`, `RecordList`, `RecordRowSkeleton` | B §1, §11 |
| `components/ui/search-row.tsx` | `SearchRow` `{ value, onChange, placeholder, filterCount, onFilters, sortLabel, onSort }` | B §3 |
| `components/ui/filter-sheet.tsx` | `FilterSheet`, `FilterSection`, `AppliedChips` | B §4 |
| `components/ui/sort-sheet.tsx` | `SortSheet` | B §5 |
| `components/ui/load-more.tsx` | `LoadMore` + `useRenderCap(items, 25)` | B §7 |
| `components/ui/scroll-fade.tsx` | `ScrollFade` (horizontal scroll cue) | B §2 |
| `components/layout/bottom-action-bar.tsx` | `BottomActionBar` `{ primary, secondary? }` | A6 — sets `--bottom-bar`, hides the nav bar |
| `components/layout/selection-bar.tsx` | `SelectionBar` (contextual top bar) | B §6 |
| `components/ui/toggletip.tsx` | `Toggletip` | D §4 |

## 9. Calls made on the reports' owner questions (reverse in one line)

| # | Question | Call |
|---|---|---|
| A-Q1 | Admin 4th visible tab | Chiffrage; Terrain and Suivi d'équipe in « Plus » |
| A-Q2 | Agent de Terrain bar | 3 tabs: Missions · Tableau de bord · Profil |
| A-Q3 / D-Q3 | « ? » launcher on phones | hidden < md; row in Plus / Profil and « ⋯ » |
| A-Q4 | Capacitor plugins | not changed in this pass (needs an APK rebuild); documented in `docs/ANDROID_CAPACITOR.md` |
| A-Q5 | Bottom action bar replaces nav bar on record pages | yes |
| A-Q6 | Tablet 768–1023 | collapsed icon rail |
| D-Q1 | Scrim blur on phones | none < md |
| D-Q2 | Sheet detents | two, tap-to-toggle, no drag-resize |
| D-Q4 / B-Q3 | Long-press | not in this pass |
| D-Q5 | Bell | sheet |
| D-Q6 | Undo scope | reassign + marquer lu only (audit trail untouched) |
| D-Q7 | Toast library | Radix repositioned |
| B-Q1 | Row headline | ref first |
| B-Q2 | Dossiers line 3 | always present, 84 px |
| B-Q4 | Swipe « Traité » | no |
| B-Q5 | Cap | 25, independent of desktop page size |
| B-Q7 | Live inserts | scroll anchoring only |
| B-Q8 | Monitoring | frozen priority-column tables + « Colonnes » sheet |

---

## 5. Forms & inputs (C) — binding (from `mobile-forms-inputs.md`)

- **Long record form** (Informations and every read-only `dl` tab): on phones
  never a whole-form edit. Each section header keeps « Modifier » (44 px) which
  opens a **section edit sheet** = `FullScreenDialog` titled by the section,
  5–9 fields, single column, `t-label` 12 above, 4 px gap, control 48 px full
  width, 16 px text, 12–16 px between rows, hint `t-caption` between label and
  control. Row sharing ONLY for Nom | Prénom and Date | Heure. The whole-form
  « Modifier » stays ≥ md. Read mode = one-column `dl`: key `t-label` over value
  15/600, 12 px between pairs, action values (`tel:` + call icon, maps, mailto,
  plate mono), « — » for empty, never truncate.
- **`PhoneSelect`** (`components/ui/phone-select.tsx`): tier by option count
  on coarse pointers — 2–5 → segmented control 44 px; 6–12 → `BottomSheet`
  list (48 px rows, radio dot, selected `bg-accent`, closes on tap); > 12 →
  same sheet + 48 px search pinned at top (no autofocus), 3 recents on top.
  Multi-select → sheet with checkboxes + footer « Valider (n) ». Trigger keeps
  the field anatomy (48 px, chevron, value or « Choisir »). Fine pointers keep
  the Radix `Select`. Inside a `BottomSheet` (never a sheet-on-sheet): native
  `<select>`. `Select` gets this behaviour by default so call sites need no
  change: `select.tsx` branches on `useIsCoarsePointer()`.
- **Dates**: near dates (RDV, relance, échéance) → 48 px field opening a
  `BottomSheet` calendar (7 × 44 px cells, month spelled, today ringed, chips
  Aujourd'hui · Demain · Lundi prochain, « Saisir » link). Known/far dates
  (sinistre, requête, mise en circulation, permis) → ONE typed field
  `inputmode=numeric` with a JJ/MM/AAAA mask + trailing 44 px calendar icon.
  Time: native `<input type="time" step="900">`. `DatePicker` gains a
  `horizon: 'near' | 'far'` prop (default `far`); on fine pointers unchanged.
- **Multi-field dialogs**: ≤ 3 controls and no textarea → bottom sheet
  (default `Dialog`); otherwise `fullScreen`. Primary lives in the header
  (D §2 — keyboard reality) and is ALSO repeated as a 48 px full-width button at
  the end of the body for the reader who scrolled (both submit the same form).
  Planification order: Type (segmented) → Agent (search sheet) → Date | Heure →
  Adresse (+ « Ma position ») → Zone → Observation. Create dossier: Compagnie →
  Rôle (segmented) → Nom → Téléphone → Email. `enterkeyhint="next"`, last `done`.
- **Save / dirty**: no sticky save bar on scrolling pages; edits happen in
  sheets. Dirty sheet: × / back / swipe → « Abandonner les modifications ? »;
  scrim tap does not dismiss. Primary never disabled; `loading` while saving.
- **Validation**: on submit; format fields (tel, email, plate, dates) on blur
  once plausible length; keystroke re-validation only after a failed submit.
  Error under the field (icon + 13 px danger text, danger border,
  `aria-invalid`). ≥ 1 error → summary callout at the top of the sheet body,
  focus moved there. No green ticks except the plate match. No error toasts.
- **Attributes** (every breakpoint): tel `type=tel autocomplete=tel
  inputmode=tel`; email `type=email autocomplete=email autocapitalize=none
  autocorrect=off`; km/puissance/montants `inputmode=numeric|decimal
  pattern="[0-9]*"` never `type=number`; plates `autocapitalize=characters
  autocorrect=off spellcheck=false` mono 16 px; names `autocapitalize=words`
  no autocomplete; addresses `autocomplete=off`, textarea grows 2 → 6 rows.
- **Capture**: two explicit affordances — « Prendre une photo »
  (`accept="image/*" capture="environment"`) and « Importer » (`accept="image/*"
  multiple`, no capture); documents: « Scanner » + « Importer un fichier »
  (`image/*,application/pdf`, no capture). Fix photos-tab and mission page.
- **Login**: below md the card becomes the page (24 px padding, logo, `t-title`
  « Connexion », 48 px fields, `autocomplete=username` / `current-password`,
  44 px eye toggle, inline Alert, full-width 48 px « Se connecter », no
  `autoFocus` on touch, safe-area bottom).
- Calls on C's questions: native `<select>` acceptable in Capacitor if the sheet
  misbehaves (documented); AI pre-fill review stays page-level; Date | Heure on
  one row; `dl` sections always expanded; time = native with 15-min steps; Date
  sinistre typed.

## 6. Record pages (E) — binding (from `mobile-record-pages.md`)

- **Hub** at `/dossiers/[id]` below md: merged record top bar (E3) → identity
  block (status chip + « modifié il y a 2 h »; compagnie · plaque line) →
  « À faire » block (existing `getDossierTodos` rows ≥ 48 px, chevron, whole row
  tappable, empty = « Rien à faire ») → « Étapes » task list (8 × 56 px rows:
  28 px medallion, long label, status chip, `>`; blocked rows not links, reason
  inline) → flat summary blocks Observations (3 latest, « Voir »), Rappels
  (mine, open), Historique (4 latest, « Tout voir »). No stepper strip, no
  scroll-spy, no 8 paper sections, no restored last-step.
- **Step screen**: same route, `?etape=N&onglet=x` pushed to history
  (`router.push(url, { scroll: false })`; `?onglet=` via replace; legacy
  `#step-N` → `?etape=N`). Top bar title « 2 · Visite avant » (tap → `BottomSheet`
  « Étapes » with the same 8 rows), back chevron → hub. Facet tabs (E5): fixed
  full-width Material secondary tabs, 48 px, ≤ 3 cells, label 13 px + badge on a
  second 11 px line, no icons < sm, never scroll, 2 px underline, no morph on
  touch. Step status + `StepStamp` as one `t-caption` line under the tabs.
  Footer « ‹ Étape 2/8 › » 48 px at the END of the content (not sticky).
- **Record top bar** (E3): the shell top bar and the record bar MERGE on record
  routes below md: 56 px, back chevron 44, two-line title (mono ref 13 + status
  chip 20; assuré 15/500), trailing « ⋯ » 44 (Précédent/Suivant dossier,
  Nouvelle planification, Envoyer au chiffrage, E-mail, Historique, Supprimer).
  Bell/avatar/+ hidden on record routes. Implemented via `usePhoneChrome({
  upHref, upLabel, subtitle, secondaryActions, primaryAction: null })` +
  `useRegisterPageTitle(ref)` from the record page; the shell's phone top bar
  renders it (it supports `subtitle` / `upHref`).
- **Bottom action bar** (E4): `BottomActionBar` on hub and step screens; one
  primary ≤ 24 chars from `primaryActionForStep` on the next step, else the
  facet's primary (Ajouter une pièce / Prendre des photos / Nouvelle
  observation); rappel session → amber « Sauvegarder (3) » + 44 px « Annuler »;
  read-only roles get no bar; disabled primary carries the blocked reason as
  caption.
- **Context column** content → hub blocks (never a sheet). **Historique** →
  `?vue=historique` full screen: « Dates clés » one-column `dl` (40 px rows),
  log grouped by day with sticky 32 px day headers, 56 px rows (time mono 12 in
  a 44 px column, action 2-line clamp, author caption), tap expands in place,
  load 50 + « Voir plus », no avatars/icons.
- **Sockets** (E6): `grid-cols-2` from 360 px, `min-h-[120px]`, thumbnail band
  72 px + 13 px name 2-line clamp + caption; empty socket = dashed whole-tile
  button; locked prints the reason; tile actions live in the lightbox header;
  « Déposer » = 44 px outline button opening the native file sheet (no
  capture); « 4/6 reçues » caption per section title.
- **Photos** (E7): `grid-cols-3` ≥ 360 (8 px gap, `aspect-square`, 10 px
  radius, no captions, count in the group header); « Prendre des photos » as
  the bottom-bar primary; « Importer » 44 px ghost in the section header;
  `CameraCapture` keeps the 72 px shutter, adds flip 44 bottom-left, done 44
  bottom-right with count, a 56 px captured-thumbnail strip above the shutter,
  icons with a 1 px shadow, stops at `maxCaptures`. Delete from the lightbox
  only (with confirmation). No hover-only delete.
- **Lightbox** (E8): below md full-screen 100 dvh, black ground, 44 px top row
  (× left, « 3 / 12 » centre, ⋯ right = Télécharger / Remplacer / Supprimer),
  pinch + double-tap zoom, swipe prev/next, zoom toolbar hidden on touch; PDFs
  never in an `<iframe>` on phones: pdf.js pages in a vertical scroller, DPR
  capped at 2, only visible ± 1 mounted, page counter, « Ouvrir » secondary.
  Pushes a history entry (`#doc=<id>`).
- **Mission detail** (E10): top bar (back « Missions », ref + assuré, ⋯:
  Itinéraire, Appeler, Observations, Documents); body = geofence banner → facts
  `dl` 2 × 2 (44 px rows, Adresse → maps, Téléphone → tel:) → PHOTO section as
  the body (segmented Avant / En cours / Après 40 px, « 12/40 » counter, 3-col
  grid, camera empty state) → « Documents » collapsed 48 px row (count) →
  « Observations » collapsed row with « Ajouter ». Bottom bar « Prendre des
  photos » (disabled + « Photos complètes (40/40) » at the cap). No
  Photos/Documents toggle cards, 16 px padding.
- **Chiffrage detail** (E11): top bar back to the queue, ref + assuré, status
  chip line 2, ⋯ (Réforme, Observations, Mode traitement). 40 px caption row
  « Correcteur · Reçu le … ». One flat block per family: pill title + « 1er
  accord · Actuel » chip; versions as 56 px rows in lineage order (stage label
  600, file name caption, state chip right, row → lightbox); next legal stage
  as a dashed ghost row printing « Édition sur ordinateur » (devis editing is
  desktop-only: `/devis-editor` below md shows a full-page notice with the
  dossier summary and « Ouvrir sur ordinateur » copy-link). Bottom bar
  [‹][« Envoyer par mail »][›]. Document filter panel → chips above the
  families, not a sheet.
- **Deep links / scroll** (E12): `scroll-padding-top` on `<main>` 56 / 104 px on
  record routes; list pages snapshot `main.scrollTop` + opened id (A3's
  `list-scroll-restore.ts`) and highlight the returned-from row 1.5 s; the
  phone never restores last viewed step; desktop unchanged.
- Calls on E's questions: bottom bar replaces the nav bar on record routes;
  query state on the same route; devis editing desktop-only; gestionnaires may
  capture photos from the record's Photos facet (camera-first « Prendre des
  photos » like the AT); keep the « ‹ Étape 2/8 › » footer; tablets get the
  desktop timeline at one column (`md:max-lg:` — context column already xl
  only); sockets two columns.

## 7. Density & readability (F) — binding (from `mobile-density-readability.md`)

All phone rules live in `src/app/mobile.css` (imported after globals) inside
`@media (max-width: 47.9375rem), (max-height: 30rem)` so landscape phones keep
the phone rhythm. Rem-based queries so user font scaling gets the phone layout.

- **Type**: `t-display` 24/700 (17/600 Inter when in the top bar); `t-title`
  20/600; `t-heading` 16/600; `t-body` 15/400 lh 1.45 (field values 15/600);
  `t-body-sm` 14 (second line of a row only); `t-caption` / `t-label` 12;
  `t-mono` 14. Floor 12 px for words, 11 px only for digit pills. Tile figures
  48 / 36 / 24 unchanged (no 28 tier). `html { -webkit-text-size-adjust: 100% }`.
  Inputs 16 px below lg.
- **Spacing**: page margin 16 (never 12 / 24 on phones), 2-up gutter 12, card
  padding 16 (from 24), tile 16, list rows 12 / 16, section gap 24, field gap
  12. Compact height: card 12, section 16. Phone density = comfortable only
  (48 px rows, 64 tall); the desktop compact tier (36/40) never applies on touch.
- **Targets**: rows 48 (tall 64); primary buttons 48; secondary 44; `sm` ≥ 40
  visible + 44 hit; icon buttons 44 visible / 48 hit, corner buttons 48;
  interactive chips 32 visible / 44 hit, ≥ 8 px gap; `FilterChip` × ≥ 24 px;
  static status chips no target rule; ≥ 8 px between same-kind targets.
- **Tiles / meters**: headline count tiles 2-up (gutter 12, value 36/600
  Inter, label ≤ 16 chars, caption wraps never truncates), ≤ 4 tiles above a
  list; hero 48 1-up; tiles with meter + delta + caption 1-up; `Meter` strip
  12 px with legend below (counts), ≤ 4 segments; `CompareStrip` stacks (label
  row, full-width 20 px band, verdict line); `BarList` label above a full-width
  bar, ≤ 7 rows then « Voir tout »; no charts on phones.
- **Chips**: word chips 12/500, 22–24 px tall; max 2 words / 18 chars; a chip
  that would truncate goes full-width on its own line (never `…` + `title`);
  count pills 11 px digits 16 px tall; static chips never get a rim or ×.
- **Icons**: icon-only allowed for six glyphs only (back, close, search,
  overflow, bell, add), each with `aria-label`; everything else carries a word;
  destructive = a word in the danger pair.
- **Glass**: blur only on the two bars (`blur(12px) saturate(1.2)`, 72 % fill);
  sheets / dialogs / menus / drawer solid `popover` below lg; scrim colour-only
  (40 %); grain (`body::after`) off below lg. Dark mode on phones: 12 px
  captions/labels use `ink-2`.
- **Density zoom**: touch devices never zoom (guard shipped: mouse-class +
  ≥ 1024 px; F adds the both-axes short-side check).
- **Landscape / large font**: never lock orientation; every row / tile / chip /
  bar uses `min-height`; layout survives 320 px with no horizontal scroll
  except real `<table>`s (frozen first column); no `user-scalable=no`.
- **Skeletons**: mirror the phone spec (48 rows, tile label 12×80 + value
  36×64 in 2-up, card p-4, chip 24×72), nothing under 300 ms, no whole-page
  spinner; step papers below the first get `content-visibility: auto;
  contain-intrinsic-size: auto 480px` on the desktop timeline only.
- **French labels**: tile label ≤ 16 chars, bottom-bar word ≤ 10, chip ≤ 18,
  button word ≤ 14, row primary line ≤ 34 chars; accented capitals; insécable
  before « : »; containers hug with `min-width`.
- Calls on F's questions: body 15; grain off < lg; dark captions `ink-2` phones
  only; hero 48 kept 1-up; density guard = mouse-class + width (shipped) plus
  the short-side check; comfortable only on phones; label copy pass done where
  a budget is exceeded, in place.
