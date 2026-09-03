# GitHub & Component-Library Scan — Missions Terrain dispatch table upgrade

Research date: 2026-09-03. Stack constraints applied throughout: Next.js 15 App Router (client components), React 18, **Tailwind v3** (v4-only libraries disqualified), shadcn/ui + Radix, lucide-react, Firestore realtime snapshot (~200 docs, client-side), no paid components, French UI.

Everything below marked **[fetched]** was actually retrieved this session (URL given). Items marked **[training knowledge]** were not verified and should be double-checked before relying on them.

---

## Findings per target

### 1. Data table — TanStack Table + shadcn pattern

**@tanstack/react-table** — [fetched] https://registry.npmjs.org/@tanstack/react-table/latest and https://raw.githubusercontent.com/TanStack/table/main/README.md
- Latest stable is now **v9.2.4, MIT, peer `react >= 18`** — v9 has shipped (this is newer than most 2024-era tutorials assume). Headless: framework-agnostic core, "bring your own UI" — zero Tailwind-version coupling, so it drops into Tailwind v3 with the existing shadcn `Table` primitives unchanged.
- v9 introduces `tableFeatures()` opt-in config (tree-shakes unused features). v8 (`8.x`) is still on npm and is what nearly all copy-paste shadcn examples target. **Recommendation: pin v8 latest** if you want to lift community column defs verbatim; choose v9 only if starting the wiring from scratch (API differs: `createColumnHelper` + `tableFeatures` vs v8's `useReactTable` + implicit features).

**shadcn/ui data-table guide** — [fetched] https://ui.shadcn.com/docs/components/data-table
- Canonical structure: `columns.tsx` (column defs incl. checkbox select column, sortable header via a `DataTableColumnHeader` sub-component), `data-table.tsx` (hook + `flexRender` over `TableHeader`/`TableBody`), plus prebuilt sub-components: **DataTableColumnHeader, DataTablePagination, DataTableViewOptions** (the column-visibility dropdown). Note: the live docs have been rewritten against **TanStack v9** (`useTable()`, `tableFeatures()`) — if you install v8, use the v8-era pattern (`useReactTable`, `getCoreRowModel`, state objects for `sorting`/`columnFilters`/`columnVisibility`/`rowSelection`), which is what most GitHub examples still use.
- **Fit for this page:** client-side row models are exactly right for a 200-doc Firestore snapshot — no pagination server round-trips, no URL-state machinery needed. Multi-sort and column-visibility come free (`enableMultiSort`, `VisibilityState` persisted to localStorage alongside the existing filter persistence). The existing sticky-first-column CSS keeps working because TanStack is headless — you keep your own `<Table>` markup and just swap the row/cell iteration to `table.getRowModel().rows` + `flexRender`.
- Integration effort: **medium (1–2 days)** — the page already has sorting-by-one-column and a filter toolbar; the work is moving 12 hand-written `<TableHead>`s into column defs and re-expressing the current filters as either external pre-filtering (simplest: keep filtering in your own memo, feed filtered rows to the table) or TanStack `columnFilters`.
- Gotcha: with grouped-by-date collapsible sections, either (a) keep one table per date group and share a single `columnVisibility`/`sorting` state object across all instances, or (b) flatten and use TanStack's `getGroupedRowModel`/`getExpandedRowModel` (more rework). Option (a) is the low-risk path.

**sadmann7/shadcn-table (tablecn)** — [fetched] https://raw.githubusercontent.com/sadmann7/shadcn-table/main/README.md and .../LICENSE.md
- **MIT** (verified LICENSE.md). Next.js + TanStack Table + Drizzle/PostgreSQL + PartyKit. Features: server-side pagination/sort/filter, Notion/Airtable-style advanced filter builder, auto-generated faceted filters, row selection with a floating **action bar**, infinite scroll + virtualization.
- **Fit: partial.** The repo's data layer is server-side (Drizzle + nuqs URL state) — wrong shape for a realtime Firestore snapshot. But three UI pieces are liftable with light surgery: the **DataTableFacetedFilter** (multi-select filter with counts — nicer than plain Selects for statut/type), the **floating selection action bar** (bulk quick-actions when rows are checked), and the **advanced filter toolbar** layout. Tailwind version in the repo README is unspecified; the components are plain shadcn-style classes — [training knowledge] earlier releases were Tailwind v3; skim any lifted file for v4-only syntax (`size-*` is fine in TW3.4, but check for `@theme`/oklch tokens) before pasting.
- Related: **Dice UI (diceui.com)** — [fetched via r.jina.ai] https://diceui.com/docs — sadmann7's newer component collection: accessible shadcn-style components (data tables, kanban, media), copy-paste/shadcn-CLI consumption, Radix-based. License not shown on the docs page I fetched — [training knowledge] the diceui/diceui repo is MIT, verify before lifting.

### 2. Peek / detail panel

**shadcn Sheet** — [training knowledge, but already in the codebase's shadcn install] Radix Dialog-based side panel. Standard row-peek pattern: row click sets `selectedMissionId`, `<Sheet open={!!selected}>` renders a read-only summary + "Ouvrir le dossier" link to the full detail page. Keeps the current row-click→navigate behavior available via the button; peek becomes the default. Effort: **small (half-day)**. Gotcha: Radix Sheet traps focus — make sure the row keeps `aria-selected` and Escape closes; don't fetch anew, reuse the row's already-loaded doc from the snapshot.

**react-resizable-panels** — [fetched] https://raw.githubusercontent.com/bvaughn/react-resizable-panels/main/README.md + https://registry.npmjs.org/react-resizable-panels/latest
- **v4.12.3, MIT, peer React ^18 || ^19.** Group/Panel/Separator API; px/%, min/max, collapsible panels; layout persistence (`defaultLayout` / autoSave); imperative refs (`collapse()`, `expand()`); WAI-ARIA separators with keyboard resize. This is also what shadcn's own `resizable` component wraps.
- Fit: use only if you want a persistent **split master-detail** (table left, detail right) instead of an overlay Sheet. On a 12-column table that's tight; recommend **Sheet first**, resizable split as a later desktop-only (`xl:`) enhancement. Effort: small-medium.
- Constraint from README: Panels must be direct DOM children of the Group; some CSS props (display, flex-direction, overflow) are reserved.

### 3. Command palette — cmdk

[fetched] https://raw.githubusercontent.com/pacocoursey/cmdk/main/README.md + https://registry.npmjs.org/cmdk/latest
- **v1.1.1, MIT, peer React ^18 || ^19.** Composable API (`Command`, `Command.Dialog`, `.Input`, `.List`, `.Item`, `.Group`, `.Empty`, `.Loading`); automatic filter/sort; unstyled with `cmdk-*` data-attributes; a11y tested with VoiceOver + Chrome DevTools; `Command.Dialog` composes Radix Dialog. React-strict-mode safe; fine up to 2,000–3,000 items without virtualization (200 missions is trivial). SSR/hydration note: keep the Dialog's `open` default `false` server-side — a non-issue in a `"use client"` page.
- shadcn already ships a styled `Command` component wrapping cmdk, so if the project's shadcn install includes it, **zero new styling work**. Integration with App Router: items call `router.push(...)` — plates/dossier numbers/assurés as searchable items, plus action items ("Filtrer: ATG", "Aujourd'hui"). Global `Ctrl+K` listener in the app shell. Effort: **small (half-day to a day)** including wiring a mission-search index from the snapshot already in memory.

### 4. Map view

- **leaflet** — [fetched] https://registry.npmjs.org/leaflet/latest — v1.9.4, **BSD-2-Clause** (clean).
- **react-leaflet** — [fetched] README + npm: **license is Hippocratic-2.1, not MIT** (an ethical-source license, not OSI-approved — commercially usable but with conduct conditions; some orgs' policies reject it — owner call). Version pinning matters: **v5.0.0 requires React ^19**; for React 18 you must pin **react-leaflet@4.2.1** (verified: peer react ^18, leaflet ^1.9.0, also Hippocratic-2.1).
- OpenStreetMap tiles: free with attribution, subject to the OSMF tile usage policy (light internal-app traffic is fine; heavy production use should move to a provider) — [training knowledge].
- Google Maps JS API: requires API key + billing account; free monthly credit usually covers a small internal app, but it's a key to manage and a ToS to honor — [training knowledge].
- Next.js gotcha (well-known): Leaflet touches `window` at import — load the map component with `next/dynamic` + `ssr: false`, and import leaflet CSS globally — [training knowledge].
- **Recommendation:** leaflet 1.9.4 + react-leaflet 4.2.1 + OSM tiles for the mission map (markers from mission addresses/AT GPS positions), accepting the Hippocratic license, or use vanilla leaflet in a small hand-rolled wrapper (~60 lines) if the license is unwanted. Effort: **medium** — the map itself is a day; geocoding mission addresses (if lat/lng aren't stored) is the real cost.

### 5. Motion / micro-interactions

**react-bits (reactbits.dev)** — [fetched] https://raw.githubusercontent.com/DavidHDev/react-bits/main/README.md
- 165+ animated components, four variants each (JS/TS × CSS/Tailwind), install via shadcn CLI / jsrepo / copy-paste. **License: MIT + Commons Clause** — free to *use* in your product (including commercial); the Commons Clause only bars *selling the components themselves*. Fine for this app. Actively maintained (weekly additions); there is now a paid "React Bits Pro" tier (seen on site nav) — stick to the free registry.
- Tailwind-version note: variants exist for Tailwind, but I could not verify per-component v3 vs v4 syntax (the component page fetch returned only nav chrome — see Could not fetch). Most animation components lean on framer-motion/gsap with minimal utility classes, so v3 compat is likely per component — **check each lifted file**. [partially training knowledge]
- **Suitable for this enterprise page:** CountUp (animate the per-tab mission counts / KPI chips), AnimatedList-style staggered row entrance (keep it ≤ 200 ms, once, on initial load only), and possibly a subtle blur-in on the peek panel. **Avoid:** the background shaders, splash cursors, ballpit/aurora effects, decrypting-text — marketing candy that fights a dispatch operator's scanning task and the cream/teal glass system.

**21st.dev** — [fetched via r.jina.ai] https://21st.dev/
- Community registry: 12,000+ React/Tailwind components in shadcn registry format from 700+ authors; consumed as AI prompts or shadcn CLI installs. **Free tier = browse everything but only 2 component copies per day**; paid membership for unlimited; authors can sell components (per-component licensing varies by author — check each). Verdict: fine as an *inspiration/occasional-lift* source (tables, action bars, empty states), but not a dependable pipeline under the no-paid constraint, and quality is uneven. Treat as browse-first, copy the 1–2 best finds.

**Origin UI** — [fetched] https://raw.githubusercontent.com/origin-space/originui/main/README.md
- Status changed: Origin UI was folded into the coss.com ecosystem and is now a **"pre-acquisition legacy snapshot" in maintenance mode** — MIT for the `apps/origin/` directory (rest of repo AGPLv3 — don't lift from outside `apps/origin/`). Its Tailwind-v3-era table/toolbar/date-picker examples remain a good copy-paste quarry (it historically had strong table and filter-toolbar variants — [training knowledge] for the specifics), but expect no updates. Verify the v3/v4 syntax of any file you take.

**Tremor** — [fetched] https://raw.githubusercontent.com/tremorlabs/tremor/main/README.md + https://tremor.so/docs/getting-started/installation
- 35+ dashboard components (Radix + Tailwind), copy-paste model, **Apache-2.0**. **Disqualifier: "Tremor Raw is designed for React v18.2.0+ and requires Tailwind CSS v4.0+"** (verbatim from install docs). Not usable in this Tailwind v3 codebase without porting. If you want its KPI/progress patterns, re-implement by eye rather than pasting. [training knowledge: older Tremor Raw versions supported v3 — you could hunt the repo's git history, but effort exceeds value.]

### 6. Design-rule repos / written rules

**Anthony Hobday — Visual design safe rules** — [fetched] https://anthonyhobday.com/sideprojects/saferules/ (site, no repo needed). Most relevant to this dense table page:
- Near-black/near-white instead of pure; **saturate neutrals <5% toward one temperature only** (matches the warm cream base — do not mix in cool grays).
- Colors in a palette need **distinct brightness values**; container vs background brightness delta ≥ ~7% in light UIs; borders must contrast with both container and background (relevant to glass rims on cream).
- **Lower the contrast of icons paired with text** (lucide icons in cells at ~60–70% opacity, not full ink).
- Spacing from a scale; outer padding ≥ inner padding; don't put two hard divides next to each other (→ drop row borders where zebra/space already separates; don't border both toolbar and table top).
- Body ≥ 16px is his floor, but for dense enterprise tables 13–14px is standard practice — treat the rule as "don't go below legibility," not literally. Elements ordered by visual weight; nested corner radii = outer − gap.

**Refactoring UI distillations** — [fetched] WebSearch results; the actual rule text below came from search-result summaries + [training knowledge of the book], as the erikuus/good-ui README fetch returned only the intro (see Could not fetch). Candidate repos found: https://github.com/erikuus/good-ui (book summary), https://gist.github.com/tolu-c/28c0e1333e100904bf79e312ff148678 (tips extract), https://github.com/s0xDk/refactoring-ui-skill and https://github.com/LovroPodobnik/refactoring-ui-skill (Claude-Code skills encoding the rules). Rules that matter for this table: **emphasize by de-emphasizing** (mute secondary columns — dates, references — instead of bolding the primary); hierarchy-first action design (one primary action per row max, rest behind a ⋯ menu); labels are a last resort (format values so they self-describe: `+212 6…`, badge colors for statut); more space around groups than within them (date-group headers need breathing room above); use color+weight, not size, to build hierarchy inside a fixed 13–14px table font.

### 7. Dispatch/scheduling-specific

- **schedule-x** — [fetched] https://raw.githubusercontent.com/schedule-x/schedule-x/main/README.md — **MIT** (2023–present, Tom Österlund), material-style event calendar, dedicated React wrapper, i18n built in, actively maintained. [training knowledge: some add-ons — e.g. the scheduling assistant / drag-to-create extras — are paid "premium" packages; the core calendar + week/month views are MIT. Verify per-package before adding.] Best free option if a calendar/agenda view of missions is ever wanted.
- **FullCalendar** — [fetched] https://fullcalendar.io/license — core plugins + `fullcalendar` bundle are **MIT**, but the **Timeline/resource "Scheduler" views are premium** (paid commercial license for a for-profit). A resource-timeline dispatch board (rows = agents, blocks = missions) would land squarely in the paid tier → **disqualified** under no-paid.
- **planby** (EPG/timeline) — [fetched] https://raw.githubusercontent.com/karolkozer/planby/master/README.md — **Custom license, "All Rights Reserved"**, with a Pro tier (drag-drop, vertical mode, calendar views). Not open source → **do not lift code; disqualified.**
- Open dispatch boards found via search (not fetched in depth): https://github.com/clawnify/open-fieldservice (Preact + Hono + SQLite field-service app with dispatch/weekly calendar — pattern inspiration only, different stack) and https://github.com/Beveren-Software-Inc/Field_Service_Management (ERPNext-based visual dispatch board — different stack). Neither yields liftable React/Tailwind code, but both are worth a screenshot-level look for dispatch-board IA conventions.
- Conclusion: for this page a **calendar/timeline is optional**; the higher-value dispatch upgrades are the richer table + peek + palette + map, all coverable with MIT pieces above. If a timeline is demanded later: schedule-x (MIT core) over FullCalendar Premium.

---

## Could not fetch

- **https://www.npmjs.com/package/@tanstack/react-table** — 403 (npm website blocks fetcher). Worked around via registry.npmjs.org JSON (data obtained).
- **https://raw.githubusercontent.com/sadmann7/shadcn-table/main/LICENSE** — 404 (file is `LICENSE.md`; fetched successfully at that path — MIT confirmed).
- **reactbits.dev component pages** (e.g. /text-animations/count-up, even via r.jina.ai) — returned only site navigation/Pro promo, no component source; per-component Tailwind v3/v4 syntax and dependency list (framer-motion vs gsap) unverified.
- **erikuus/good-ui rule content** — README fetch returned only the gitbook intro, not the rules; Refactoring UI rule text above is from search-result extracts + training knowledge of the book.
- Not attempted for scope reasons: awesome-design-systems (index-of-links repo, low signal for this task), Origin UI live site component inventory, Dice UI LICENSE file, GitHub star counts (raw.githubusercontent doesn't carry them; treat all star estimates as unverified).

---

## Recommended shortlist (ranked)

1. **@tanstack/react-table v8 + shadcn data-table pattern** — MIT, headless, Tailwind-agnostic, perfect for a 200-doc client-side snapshot. Column visibility (`DataTableViewOptions`), multi-sort, row selection. Keep one-table-per-date-group with shared state. **Effort: 1–2 days.** Highest value.
2. **cmdk v1.1.1 (via existing shadcn Command)** — MIT, React 18 OK, a11y done. `Ctrl+K` palette over the in-memory mission snapshot + filter/navigation actions. **Effort: 0.5–1 day.** Best effort-to-wow ratio.
3. **Sheet-based row peek** (already-installed shadcn Sheet) — no new deps. **Effort: 0.5 day.** Do before any resizable split.
4. **sadmann7/shadcn-table cherry-picks** — MIT verified: faceted filter with counts, floating bulk-action bar. Skim for TW4-only syntax. **Effort: 0.5–1 day per piece.**
5. **leaflet 1.9.4 (BSD-2) + react-leaflet 4.2.1 (pin! v5 = React 19; Hippocratic-2.1 license — owner sign-off)** + OSM tiles, `next/dynamic ssr:false`. **Effort: ~1 day + geocoding question.**
6. **react-resizable-panels v4 (MIT)** — optional later desktop split-view; persistence built in. **Effort: 0.5 day.**
7. **react-bits CountUp + restrained list-enter animation** — MIT+Commons-Clause (usage fine); verify each file's Tailwind syntax. Skip all decorative effects. **Effort: hours.**
8. **Written rules to encode in DESIGN.md**: Hobday safe rules (verified list above) + Refactoring UI de-emphasis/hierarchy rules for the 12-column density problem.

**Disqualified:** Tremor (Tailwind v4-only, verified), FullCalendar Timeline (premium license, verified), planby (all-rights-reserved, verified), 21st.dev as a pipeline (2 free copies/day; per-author licenses), Origin UI as a dependency (maintenance-mode legacy; MIT quarry only, `apps/origin/` directory only).
