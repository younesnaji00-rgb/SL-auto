# Ecosystem sweep — patterns & components for the `/dossiers` list page

Date: 2026-09-03. Research subagent sweep of GitHub + the React component ecosystem for
adoptable patterns for a data-heavy list page (Next.js 15, Tailwind v3, shadcn/Radix,
Firestore realtime, LOCKED cream/ink/teal design system).

Honesty policy: every source below is tagged with how it was accessed. Several marketing
sites are client-rendered JS shells that WebFetch cannot see through — those are marked
and their claims should be treated as partially verified.

---

## 1. Source log

| # | Source | URL | Status |
|---|--------|-----|--------|
| 1 | sadmann7/shadcn-table (TableCN) README | https://raw.githubusercontent.com/sadmann7/shadcn-table/main/README.md | FETCHED |
| 2 | openstatusHQ/data-table-filters README | https://raw.githubusercontent.com/openstatusHQ/data-table-filters/main/README.md | FETCHED |
| 3 | TanStack Table v8 intro | https://tanstack.com/table/v8/docs/introduction | FETCHED (intro only; feature list from guides below) |
| 4 | TanStack Table v8 column faceting guide | https://tanstack.com/table/v8/docs/guide/column-faceting | FETCHED |
| 5 | TanStack Table v8 fuzzy filtering guide | https://tanstack.com/table/v8/docs/guide/fuzzy-filtering | FETCHED |
| 6 | shadcn/ui official data-table docs | https://ui.shadcn.com/docs/components/data-table | FETCHED |
| 7 | pacocoursey/cmdk README | https://raw.githubusercontent.com/pacocoursey/cmdk/main/README.md | FETCHED |
| 8 | timc1/kbar README | https://raw.githubusercontent.com/timc1/kbar/main/README.md | FETCHED |
| 9 | OpenStatus data-table demo site | https://data-table.openstatus.dev/ | FETCHED (feature text only — page is mostly app shell, no visual detail extractable) |
| 10 | OpenStatus blog "The React data-table I always wanted" | https://www.openstatus.dev/blog/data-table-redesign | FETCHED |
| 11 | openstatusHQ/data-table-filters repo root | https://api.github.com/repos/openstatusHQ/data-table-filters/contents/ | FETCHED (now a monorepo: apps/, packages/, skills/; `src/` no longer at root — 404) |
| 12 | originui.com/tables | https://originui.com/tables (+ r.jina.ai mirror) | FAILED (403 direct; mirror returned only nav shell — one "simple table" entry visible) |
| 13 | origin-space/originui README | https://raw.githubusercontent.com/origin-space/originui/main/README.md | FETCHED |
| 14 | reactbits.dev | https://reactbits.dev/ | FAILED (JS shell, title only) |
| 15 | DavidHDev/react-bits README | https://raw.githubusercontent.com/DavidHDev/react-bits/main/README.md | FETCHED |
| 16 | tremor.so homepage | https://tremor.so/ | FETCHED |
| 17 | 21st.dev tables category | https://21st.dev/s/table | FETCHED (shell only: confirms "313 table components", registry model; no individual listings extractable) |
| 18 | twentyhq/twenty record-table module tree | https://api.github.com/repos/twentyhq/twenty/contents/packages/twenty-front/src/modules/object-record/record-table | FETCHED |
| 19 | twentyhq/twenty record-table-row + components tree | .../record-table/record-table-row (+ /components) | FETCHED |
| 20 | twentyhq/twenty action-menu module | .../modules/action-menu | FAILED (404 — path moved); pattern confirmed via PR/issue below |
| 21 | Twenty PR #9007 + issue #8929 (action menu → page header) | https://github.com/twentyhq/twenty/pull/9007 | SEARCH-SNIPPET |
| 22 | calcom/cal.com bookings module tree | https://api.github.com/repos/calcom/cal.com/contents/apps/web/modules/bookings (+ /views, /components) | FETCHED |
| 23 | calcom/cal.com BookingListContainer.tsx | https://raw.githubusercontent.com/calcom/cal.com/main/apps/web/modules/bookings/components/BookingListContainer.tsx | FETCHED |
| 24 | makeplane/plane issue-layouts tree | https://api.github.com/repos/makeplane/plane/contents/apps/web/core/components/issues/issue-layouts (+ /spreadsheet, /peek-overview) | FETCHED |
| 25 | makeplane/plane spreadsheet issue-row.tsx | https://raw.githubusercontent.com/makeplane/plane/master/apps/web/core/components/issues/issue-layouts/spreadsheet/issue-row.tsx | FETCHED |
| 26 | makeplane/plane peek-overview view.tsx | https://raw.githubusercontent.com/makeplane/plane/master/apps/web/core/components/issues/peek-overview/view.tsx | FETCHED |
| 27 | teableio/teable README | https://raw.githubusercontent.com/teableio/teable/develop/README.md | FETCHED (rendering mechanism NOT confirmed from README) |
| 28 | alexpate/awesome-design-systems | https://raw.githubusercontent.com/alexpate/awesome-design-systems/master/README.md | FETCHED |
| 29 | Refactoring UI notes repos (Swapnil-ingle, erikuus/good-ui, tigerabrodi) | github.com search | SEARCH-SNIPPET |
| 30 | shadcn.io keyboard-nav table block | https://www.shadcn.io/blocks/tables-keyboard-nav | FETCHED (description only; full code truncated) |
| 31 | HuakunShen/shadcn-cmdk | https://github.com/HuakunShen/shadcn-cmdk | SEARCH-SNIPPET |
| 32 | nocodb, documenso, formbricks, appsmith | — | NOT SWEPT (deprioritized; the 5 apps above covered the relevant patterns; nocodb is Vue — not adoptable) |
| 33 | Aceternity UI / Magic UI | — | TRAINING (not fetched this session; flagged below accordingly) |

---

## 2. Table engines

### 2.1 TanStack Table v8 (headless) — the strategic question

Verified from official docs (sources 3–5): headless engine that owns "data-processing,
state-management, and business logic"; you keep 100% of markup/styles — which means the
locked cream/ink/teal system is untouched by adoption. Tradeoff stated by the docs
themselves: "more setup required, no markup, styles or themes provided."

What it would unlock over the current hand-rolled `/dossiers` filtering, feature by
feature:

- **Column visibility** — `column.getIsVisible()/toggleVisibility()` + a shadcn dropdown
  = "Affichage des colonnes" for a 14-column table. This is the single biggest UX win an
  engine gives us: users hide the 6 columns they never read.
- **Column order / pinning / resizing** — built-in state slices. OpenStatus confirmed in
  their blog they built resize/reorder/visibility/sort on top of TanStack (source 10).
- **Faceted filters with counts** (source 4): `getFacetedRowModel` +
  `getFacetedUniqueValues()` returns a `Map` of distinct values → render checkbox
  filters with per-value counts ("Compagnie X (12)"). `getFacetedMinMaxValues()` →
  range filters for montants. Both can be overridden to resolve facets server-side
  (relevant if `/dossiers` moves to server-side Firestore queries).
- **Fuzzy global filter** (source 5): `rankItem` from `@tanstack/match-sorter-utils` as
  a `globalFilterFn`, plus `compareItems` to sort best matches first. Verified code
  shape:
  ```ts
  const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const itemRank = rankItem(row.getValue(columnId), value)
    addMeta({ itemRank })
    return itemRank.passed
  }
  // table option: filterFns: { fuzzy: fuzzyFilter }, globalFilterFn: 'fuzzy'
  ```
- **Row selection APIs** — `getIsSelected/toggleSelected/getSelectedRowModel` replaces
  the bespoke selection mode used for rappels; selection state becomes a plain object
  keyed by row id, trivially wired to a bulk-action bar.

Cost: a real migration. The current page's columns/filters/pagination all become
TanStack column defs + state. shadcn's official pattern (source 6) is the template:
`columns.tsx` + `data-table.tsx` + extracted `DataTableColumnHeader`,
`DataTablePagination`, `DataTableViewOptions`. Note the shadcn docs now describe a
newer feature-declaration system (`tableFeatures()`), i.e. the docs may be tracking
TanStack v9 alpha — pin to v8 for production.

### 2.2 openstatusHQ/data-table-filters — the best single reference (sources 2, 9, 10, 11)

Self-described as "a playbook", not a library: copyable patterns for **faceted filter
sidebar + command-style search + infinite scroll** on TanStack Table + shadcn/ui.

Verified specifics:
- ~10 filter types (checkbox, input, slider, time-range …), column pinning, row
  selection, bulk actions, virtualization.
- **BYOS state**: adapters for nuqs (URL state → shareable filtered views — a direct
  upgrade path for the localStorage saved-views feature), zustand, or in-memory, behind
  a `StoreAdapter` interface.
- Variants: infinite table w/ server-side filtering + live mode + row detail sheet;
  classic client-side table; "Table Builder" schema-driven variant
  (`createTableSchema` + `col.presets` generating columns, filters and row-detail
  fields from one definition).
- From the redesign blog (source 10), battle-tested lessons directly relevant to us:
  - keyboard: Tab + Enter on rows, `⌘ Esc` reset focus, `⌘ .` clear filters, `⌘ U`
    undo column state; focus reset needed manual `tabindex` manipulation ("no web
    standard solution").
  - sticky headers + horizontal scroll + borders is genuinely painful cross-browser
    (Safari vs Chrome) — they hit the same class of bug our sticky first/last columns
    risk.
  - perf: dedicated context providers per state slice + debounced controls;
    "don't sleep on css and basic html".
- Repo is now a monorepo (apps/, packages/, skills/) with shadcn-CLI-installable
  blocks; components are shadcn-styled → restyle to cream/ink/teal is token-level work,
  not a rewrite.

### 2.3 sadmann7/shadcn-table (TableCN) (source 1)

Server-side pagination/sorting/filtering, **auto-generated filters from column
definitions**, "Notion/Airtable-like" advanced filter builder AND a "Linear-like filter
menu for command palette filtering", action bar on row selection, infinite scroll +
virtualization. Stack: Next.js, shadcn/ui, TanStack Table — but the current main branch
is a full-stack demo (Drizzle + PostgreSQL + TanStack DB + PartyKit multiplayer). For
Firestore we'd cherry-pick the UI layer (filter builder, action bar, filter-menu
command palette), not the data layer. shadcn-styled → restyles cleanly.

### 2.4 shadcn official data-table docs (source 6)

The canonical wiring recipe (see 2.1). Adopt its file architecture and its extracted
reusable sub-components verbatim; it is intentionally boring and matches our stack
exactly.

---

## 3. Command palette / keyboard layer

### 3.1 pacocoursey/cmdk (source 7) — already in our stack via shadcn `<Command>`

Composable command menu; filters + ranks items automatically; `Command.Dialog` composes
Radix Dialog. Completely unstyled (`[cmdk-root]`, `[cmdk-item]` data-attr hooks) →
perfect for the locked design system. Verified capabilities: custom filter fn, nested
"pages" via state (e.g. top level → "Filtrer par compagnie" → value list), sub-item
filtering, async items, fine up to ~2-3k items without virtualization
(`shouldFilter={false}` for manual/server filtering). Since shadcn/ui's Command IS
cmdk, a ⌘K palette costs almost nothing incrementally.

### 3.2 timc1/kbar (source 8)

Action-object API (`id, name, shortcut, keywords, perform`), single-key sequence
shortcuts (`["g","d"]`-style), nested actions with backspace-to-parent, ctrl+n/p nav,
claims "tens of thousands of actions". Verdict: capable but overlapping with cmdk which
we already ship; adopting kbar would add a second palette system. Only worth it if we
want global single-key app shortcuts registered declaratively. Maintenance: active
adoption, but less alive than cmdk.

### 3.3 Wiring "/", ⌘K, j/k, Enter, x

- shadcn's Command docs note cmdk has vim-style bindings in the list by default
  (search snippet, source 31 context).
- shadcn.io ships a "Table Block Keyboard Navigation" block (source 30): arrow keys,
  Enter to select, visual focus indicators, screen-reader support, on plain shadcn
  Table — description verified, code not fully read. Use as a starting point but
  verify its focus model (roving tabindex vs aria-activedescendant) before adoption.
- Twenty isolates row keyboard behavior into tiny effect components —
  `RecordTableRowArrowKeysEffect.tsx` (445 B) and `RecordTableRowHotkeyEffect.tsx`
  (424 B) exist in their record-table-row/components folder (source 19) — a clean
  pattern: keyboard scope mounted/unmounted with the focused row, instead of one giant
  window listener.
- OpenStatus's manual `tabindex` focus-reset trick (source 10) is the honest answer to
  "Escape returns focus to the search box".
- Practical recipe for `/dossiers` (synthesis, not a fetched artifact): one
  `useEffect` keydown listener on the page: `/` → focus search (preventDefault unless
  in input), `⌘K` → open cmdk palette, `j/k`/arrows → move a `focusedRowIndex` (roving
  tabindex on `<tr>`), `Enter` → open dossier, `x` → toggle selection, `Échap` →
  clear focus/selection.

---

## 4. Component registries

| Registry | Status | Verdict for `/dossiers` |
|---|---|---|
| **Origin UI** (originui.com, origin-space/originui) | site 403/shell; repo README FETCHED | README states it is a "pre-acquisition collection … limited support and maintenance"; active development moved to newer "Particles" components on coss ui primitives. MIT. Historically strong table/filter comps (Tailwind + Radix, copy-paste), but **treat as frozen upstream** — fine to copy from, don't expect fixes. Individual table variants could not be enumerated this session. |
| **21st.dev** | shell only | Confirms 313 table components, shadcn-compatible registry with CLI install + Recommended/Most-downloaded sorting. Individual listings NOT extractable without a browser — anything specific from here is unverified until opened manually. Quality varies by author; audit anything before adoption. |
| **React Bits** (reactbits.dev, DavidHDev/react-bits) | site shell; README FETCHED | 165+ animated components in 4 flavors (JS/TS × CSS/Tailwind), MIT + Commons Clause. Positioning is animated flair (text animations, animated backgrounds, cursor effects). **Almost all of it is wrong for a professional insurance back-office** and collides with the no-decoration rule. At most: a count-up number on KPI stats. Do not adopt backgrounds/text effects. Specific component names not verifiable this session. |
| **Tremor** (tremor.so) | homepage FETCHED | 35+ open-source components, React + Tailwind + Radix (+Recharts). Copy-paste AND npm. Relevant pieces: **KPI cards, deltas/badges, spark charts, progress circles, data bars** — exactly what a stat strip above the dossiers table needs — plus date pickers and multi-checkbox filter comps. Blocks/templates are a separate paid product; core is open source. Tailwind-based → recolorable to cream/ink/teal, though Tremor's default look (blue, rounded, shadowed) needs a deliberate token pass, and its charts default to colorful palettes — constrain to the teal ladder. |
| **Aceternity UI / Magic UI** | NOT FETCHED — TRAINING only | Both are motion-heavy marketing-component libraries (framer-motion glows, beams, marquees). Flagged per training as inappropriate for this app; nothing there is worth the restyling fight against the no-gradient/no-sparkle rules. If ever browsed, the only candidates would be their most restrained number-ticker/blur-fade pieces. Unverified this session. |

---

## 5. Open-source apps with excellent list pages

### 5.1 twentyhq/twenty (CRM record tables) — architecture reference (sources 18, 19, 21)

- Record table is a full module with 15 subfolders (components, row/cell/header/body/
  footer/section, states, contexts, hooks, virtualization, stories). The row folder
  alone has 18 components incl. drag overlay, multi-drag counter chip, "action row",
  and the two tiny keyboard-effect components noted in §3.3.
- Bulk actions: Twenty moved its selection action menu from a floating **BottomBar to
  the page header** (`RecordIndexActionMenuButtons` as small secondary buttons —
  PR #9007 / issue #8929, behind `IS_PAGE_HEADER_V2_ENABLED`). Interesting precedent:
  the floating bottom bulk-bar is not the only defensible pattern; header-anchored
  bulk actions keep the table stable. Known bug in their model (issue #19149):
  "select all" makes custom actions disappear — a reminder to test bulk-bar logic
  against select-all-across-pages.
- **Not adoptable as code**: Recoil + Emotion styled-components, deeply coupled to
  their metadata engine. Steal the decomposition (states/contexts/hooks folders per
  concern; keyboard as mountable effects), not the components.

### 5.2 makeplane/plane (issues list + peek) — the best pattern source of the sweep (sources 24–26)

`issue-row.tsx` (verified, quoted classes):
- Hover-revealed controls: quick-actions menu `"opacity-0 transition-opacity
  group-hover:opacity-100"` with `"!opacity-100"` when its dropdown is open (so the
  menu doesn't vanish while in use); checkbox `"pointer-events-none opacity-0
  transition-opacity group-hover/list-block:pointer-events-auto
  group-hover/list-block:opacity-100"` — named Tailwind groups
  (`group/list-block`) scope hover reveals per-cell. Directly portable to our ⋯ menu
  and selection checkboxes.
- Selected-row tint: `"bg-accent-primary/5"`, hover `"bg-accent-primary/10"` — i.e.
  accent at 5/10% alpha, which maps cleanly to teal-on-cream.
- Sticky first column: `"group/list-block relative left-0 z-10 max-w-lg bg-surface-1
  md:sticky"` + a horizontal-scroll shadow
  `"shadow-[8px_22px_22px_10px_rgba(0,0,0,0.05)]"` toggled by an `isScrolled` ref —
  the "scrolled" affordance our sticky columns currently lack.
- Row is `tabIndex={0}`; row click goes through a `ControlLink` wrapper calling
  `handleIssuePeekOverview()` (real link semantics + programmatic peek).

`peek-overview/view.tsx` (verified): three display modes `side-peek | modal |
full-screen` on one container `"absolute z-[25] flex flex-col overflow-hidden
rounded-sm border … transition-all duration-300"`; side-peek is `"top-0 right-0
bottom-0 w-full border-0 border-l md:w-[50%]"`; Escape closes via
`removeRoutePeekId()` but **checks for open modals/dropdowns/editor first**. The
mode-toggle in the peek header (peek ⇄ modal ⇄ full) is a superb upgrade path for our
VS Code-style preview tabs: preview a dossier without leaving the list, promote to
full page on demand. All Tailwind → restyles to our tokens.

### 5.3 calcom/cal.com (bookings list) (sources 22, 23)

`BookingListContainer.tsx` (verified): TanStack Table (`getCoreRowModel` +
`getSortedRowModel`) even though bookings render as row-cards, proving the engine is
worth it for state alone; `useBookingFilters()` centralizes filter params
(eventTypeIds, teamIds, userIds, attendeeName/Email, bookingUid, date range);
`<DataTableFilters.ActiveFilters>` renders applied-filter chips (same pattern as our
chips, but driven by table state); status ToggleGroup tabs (upcoming/past/…); offset
pagination via a `useDataTable()` context; row click → `setSelectedBookingUid` →
**`BookingDetailsSheet`** (33 KB side sheet, feature-flagged `bookingsV3Enabled`) —
cal.com is also converging on list + side-sheet instead of navigate-away.

### 5.4 OpenStatus light/status viewer — covered in §2.2; it IS a list page and is the closest match to our stack.

### 5.5 teableio/teable (source 27)

"Spreadsheet-simple on the surface, real PostgreSQL underneath"; Grid/Form/Kanban/
Gallery/Calendar views; "millions of rows". README does not confirm the grid's
rendering mechanism (widely described as canvas-based, but NOT verified this session).
If canvas, its grid is un-restylable with CSS and philosophically wrong for a 14-column
back-office table. Treat as inspiration for view-switching UX only. AGPL-3.0 —
license alone disqualifies code adoption.

(nocodb: Vue — excluded. documenso/formbricks/appsmith: not swept; the five above
covered rows/hover/peek/bulk/filters.)

---

## 6. Design-rule documents on GitHub

- **alexpate/awesome-design-systems** (FETCHED) — index of design systems annotated
  by components/voice/kits/source. For table/data rules specifically, drill into:
  IBM Carbon, Atlassian, Salesforce Lightning, Shopify Polaris, VMware Clarity,
  Elastic EUI, Material. Carbon's and EUI's data-table specs are the deepest for
  dense enterprise tables (that ranking is TRAINING-informed; the list itself is
  verified).
- **Refactoring UI notes repos** (SEARCH-SNIPPET): Swapnil-ingle/refactoring-ui-notes,
  erikuus/good-ui, tigerabrodi/refactoring-ui-notes, plus a tips gist. Table-relevant
  rules surfaced in the snippets: don't give every datum its own column — demote
  secondary data to a second line under a primary column; use colored tags derived
  from data; de-emphasize with lighter color/smaller size rather than thin weights.
  Our 14-column table is the textbook target for the "merge columns, use
  subtitles" rule.
- These complement the already-house docs (docs/research/tables.md,
  intuitive-crud.md, docs/design-system-blueprint.md) — no conflict found with the
  locked system.

---

## 7. Cross-cutting adoption notes for `/dossiers`

1. Everything worth adopting is Tailwind/shadcn-native or headless — nothing on the
   shortlist fights the cream/ink/teal lock except Tremor defaults (token pass) and
   React Bits/Aceternity/Magic UI (rejected).
2. The saved-views feature can graduate from localStorage snapshots to
   **URL state via nuqs** (OpenStatus pattern): a saved view becomes a named URL,
   shareable between gestionnaires, no migration of the localStorage feature needed —
   they compose.
3. Firestore realtime + TanStack Table coexist naturally: TanStack takes `data` as a
   plain array each snapshot; all state (sort/filter/selection/visibility) lives
   outside the data. Server-side faceting hooks exist when the list outgrows
   client-side snapshots.
4. Sticky-column + border + sticky-header combinations are a known cross-browser
   minefield (OpenStatus blog) — budget QA time in Safari specifically.
