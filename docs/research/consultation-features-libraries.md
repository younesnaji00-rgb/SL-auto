# Consultation page — feature supercharging + GitHub/library research
Date: 2026-09-03 · Researcher: product+engineering subagent
Scope: read-only « Consultation » table page (`src/app/(app)/consultation/client-page.tsx`, nested repo).

## 0. Codebase facts the ranking depends on (verified by reading source)

- `src/lib/export-excel.ts` **already exists** (SheetJS `xlsx@0.18.5`, aoa_to_sheet, auto column widths, dd/MM/yyyy dates, assuré/observation flattening) and is already consumed by `src/app/(app)/dossiers/client-page.tsx` — but **not** by consultation. Export on consultation is a ~10-line wire-up of an existing, proven util.
- `components/ui/table.tsx` already supports a **compact density** (`data-density=compact` → 36 px rows via globals.css, per the header comment) — a density toggle is mostly a persisted boolean + one attribute.
- `usePersistedFilters` hook already persists per-page filter state — the same mechanism can persist column visibility / density prefs.
- The page has **no sorting at all** today (rows come in Firestore order), and **rows are not clickable** — no `onClick`, no link to the dossier detail. On a "consult" page that's a dead end.
- All dossiers are already **fully in client memory** (`useDossiers()` + useMemo filtering) — every candidate feature (stats strip, export of the filtered set, client sort, faceted counts) is a pure client computation, no backend work.
- Installed and relevant: `xlsx`, `jspdf` + `jspdf-autotable`, `recharts`, `cmdk`, full Radix set (dialog → Sheet exists), `date-fns`. **Not installed: @tanstack/react-table.**
- Binding rulings (docs/element-specs.md §3 + addendum ter A, quoted from file): "Queues never paginate with page numbers … cap + « Afficher plus » + a visible total"; "Row = one unambiguous click (open); hover-revealed controls are never the only path; bulk selection only where a real batch operation exists"; "Emphasis budget: 2 cells per row"; "toolbar holds the 2–3 workflow filters, the rest behind « Plus de filtres »"; hairlines no zebra; status chips label+colour.

---

## 1. Feature research (what best-in-class list pages actually ship)

### 1.1 Insurance-domain precedents

**CCC ONE (auto appraisal — closest domain comp).** The Workfiles help page itself was 403 (help.cccis.com blocked WebFetch), but the search snippet of that page states verbatim: *"Users can add, remove, and reorder columns and sort by columns in the Workfiles view."* — i.e. the direct competitor category ships **column management + sortable columns** on its claims/workfile list.
Source (search snippet of): https://help.cccis.com/webhelp/repair_facility/estimating/comp_est/Content/Workfile_Workflow/Overview%20Workfiles.htm (403 on direct fetch — flagged).

**Snapsheet.** Marketing/aggregator pages only: *"Snapsheet allows users to configure dashboards, controls, and work queues"*; *"real-time visibility, audit trails, and performance dashboards"*; *"auto-tag key claim details for faster grouping and analysis"*. Takeaway: queue/status visibility ("stats strip" thinking) is table-stakes in claims platforms. Sources: snapsheetclaims.com solutions pages + Capterra/GetApp listings (via WebSearch; no product docs public).

**Guidewire ClaimCenter.** Nothing concrete reachable — docs are behind login; only marketing copy ("govern the entire claims lifecycle"). TRAINING-KNOWLEDGE FLAG: ClaimCenter's UI keeps a recent-claims history / QuickJump tab bar for jumping back to recently opened claims — I could not verify this against any fetched page.

**Duck Creek.** Only feature-marketing reachable (assignment/routing, FNOL). Nothing usable about its list screens. Flagged as not-reached in substance.

### 1.2 Admin/CRM products (fetched or well-snippeted)

**Linear peek** (fetched: https://linear.app/docs/peek): *"Tap `Space` to toggle peek on or off"*, *"hold Space to preview temporarily"*, *"use ↑ and ↓ to move through adjacent issues … while updating the preview"*, shows *"description, assignee, status, priority, cycle, labels, estimate, creation date, and updated date"*. Notably *"Peek can only be launched with the keyboard shortcut"* — Linear treats it as an accelerator layered over the normal click-to-open, never a replacement. Lesson for a read-only claims list: a quick-look panel must complement row-click-opens-dossier, not replace it.

**Attio** (help pages via search snippets; direct URL guess 404'd): *"customize your table view by dragging and dropping columns to reorder them, clicking a column header to sort the entire table by that attribute, and using the Properties menu to hide or show specific attributes"*; saved views with *"saved filters and sort settings"*; per-user vs shared changes distinction. Sources: attio.com/help/reference/managing-your-data/views/* (snippets).

**Airtable** (support docs via search snippets): Hide fields toggle per view; *"Row height: Short, Medium, Tall, or Extra Tall"*; expand record with **Space**; per-view *"Download CSV"*. Sources: support.airtable.com grid-view + views articles (snippets).

**Retool Table** (docs URL 404'd; features via search snippets + forums): *"The Table component enables users to sort, filter, paginate, and download rows of information."* Forum threads are instructive on export pitfalls: users complain the CSV download *"ignores the table column order"* and exports raw query data instead of what's displayed (community.retool.com/t/15097, /t/2437, /t/27809). **Pattern to steal: export must reflect the FILTERED set and the DISPLAYED columns/order, or users file bugs.**

### 1.3 Practitioner table-pattern sources

**Pencil & Paper — enterprise data tables** (fetched: https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables):
- Column customization: *"Giving users control over what they see is a sure way to make the interaction more engaging"* — freeze, reorder, hide, resize, reset-to-default.
- Density: user-adjustable row heights *"Condensed (40px), Regular (48px), Relaxed (56px)"*.
- Detail access patterns enumerated: expandable rows, tooltips, modals, **"Quick view sidebars"**, full-screen.
- Sorting: *"Make sure your default makes sense for your type of data."*
- Emphasizes state preservation + reset-to-default throughout.

**Element-specs addendum ter A** (in-repo, itself sourced from P&P/uxdesign.cc/Carbon/Polaris/NN/g) already encodes the load-bearing table rules; nothing found in this round contradicts it.

**Evil Martians table essay: NOT FOUND.** Searching for it surfaced no such essay — only their control-hierarchy post tweet. The good practitioner table guides that do exist: Pencil & Paper (above), Setproduct data-table reference (setproduct.com/blog/data-table-ui-design, not fetched), Eleken, UI Prep. Flagged honestly: the prompt's premise of an Evil Martians table essay could not be verified.

**NN/g preview-pane article: not found as such.** The list-detail pattern is documented by Microsoft (learn.microsoft.com list-details pattern: list pane + detail pane, *"stacked style or the side-by-side style, based on the amount of available screen space"*) and Android adaptive guides. NN/g's closest is "The Anatomy of a List Entry" (not fetched).

---

## 2. Candidate-by-candidate evaluation (read-only page)

| # | Feature | Value | Effort | Research basis | Verdict |
|---|---------|-------|--------|----------------|---------|
| 1 | **Excel/CSV export of the filtered set** | High — the one thing a read-only consultation page is FOR (hand a list to a compagnie/manager). Airtable ships per-view CSV; Retool ships it built-in; claims platforms ship reporting. | **Trivial** — `exportToExcel` util already exists and is used on the dossiers page; pass `dossierList` (the filtered memo) + the 8 columns. | Airtable Download CSV; Retool table; Retool forums (export must match filtered set + displayed columns — /t/27809, /t/15097) | **Do first** |
| 2 | **Sortable columns** | High — CCC ONE ships it on the workfile list verbatim; Attio's headline interaction; page currently has NO sort at all. | Low — client-side `[...].sort()` on 8 known columns + arrow in header (ter A: "only the sorted column shows its icon", sort affordance in the header). TanStack makes it cleaner but isn't required. | CCC ONE workfiles quote; Attio views; P&P "default makes sense" | **Do** |
| 3 | **Quick-look peek panel (Sheet) on row click** | High — solves the current dead-end row; on a read-only page the peek IS the detail-consumption UX; Linear/Airtable both bind Space to it; P&P lists "quick view sidebars" as a canonical detail-access pattern. Respects "row = one unambiguous click" (the click opens the peek; a « Ouvrir le dossier » button inside navigates). | Medium — Radix Dialog/Sheet already in deps; content = definition list (§10 spec exists); ↑/↓ to move between rows is the differentiator. | linear.app/docs/peek (fetched); Airtable expand-with-Space; P&P; MS list-detail | **Do** |
| 4 | **Stats strip above the table (count by status/nature for the filtered set)** | Med-High — claims platforms lead with queue visibility (Snapsheet dashboards/work queues); openstatus demo puts facet counts + a chart above its table; makes the page feel like a product, demo-friendly. | Low — data already in memory; KPI tile spec §6 exists; counts recompute in the same useMemo. Keep it to counts (no chart) to respect the 3-levels-of-dominance rule. | Snapsheet; openstatus demo/guide; §6 KPI spec | **Do** |
| 5 | **Column visibility (+ persisted prefs)** | Medium — CCC ONE and Attio both ship hide/show; 8 columns is borderline (payoff grows with column count); good "sellable product" signal. | Low-Med — shadcn's official pattern is a `DropdownMenuCheckboxItem` list over `column.getCanHide()`; without TanStack it's a `Set<string>` in `usePersistedFilters`. | ui.shadcn.com data-table guide (fetched); CCC ONE; Attio Properties menu; P&P | **Do (visibility only)** |
| 6 | **Density toggle** | Medium — Airtable row heights, P&P 40/48/56, Carbon's five row sizes; power users scanning 100s of rows want compact. | **Trivial** — table already implements `data-density=compact` (36 px); persist a boolean. | Airtable; P&P quote; in-repo table.tsx comment | **Do (cheap win)** |
| 7 | **Copy-ref affordance on t-mono cells** | Low-Med — refs/matricules get pasted into emails/other systems daily; cheap delight. TRAINING-KNOWLEDGE FLAG: Linear's Cmd+C-copies-issue-ID precedent not verified by fetch. | Trivial — click-to-copy + toast on the two mono columns (or in the peek). | (flagged) | **Do (micro)** |
| 8 | **Column reorder (drag)** | Medium value but the weakest value/effort here — needs dnd-kit or TanStack column-order + drag handles; Attio/CCC ship it, but with 8 fixed, well-ordered columns the payoff is small. | High | Attio drag-drop; CCC ONE | **Defer** |
| 9 | **« Dossiers récents » shortcuts** | Low-Med on THIS page — recognition-over-recall is real, but recents belong app-wide (cmdk is already installed → a global jump menu is the better home). ClaimCenter recent-claims bar is a training-knowledge flag, unverified. | Low (localStorage list) | (flagged) | **Defer / move to global cmdk** |
| 10 | **Row hover cards** | Low — conflicts with ter A ("hover-revealed controls are never the only path"; everything the reader needs is IN the row); the peek panel covers the job without a hover-only path; hover is dead on touch. | Medium | ter A ruling; P&P lists tooltips only for desktop | **Skip** |
| 11 | **Print view** | Low — no product surveyed leads with print; Excel export covers the "give it to someone" job better (sortable, re-filterable); sticky columns/hairlines print badly. `jspdf-autotable` exists if a PDF listing is ever demanded. | Medium for a good one | absence-of-evidence across all sources | **Skip** |
| 12 | **Per-column header filters** | Skip as a *replacement* — the current promoted-filters toolbar IS the researched ruling (§2: ≤3 promoted, applied chips, clear-all). Steal only the openstatus **faceted counts** idea: show « (12) » next to each status/compagnie option, computed from the already-filtered set. | Low for counts | openstatus faceted filters; §2 ruling | **Counts only** |
| 13 | **Virtualization / infinite scroll** | Not now — dataset is fully client-side and ter A's cap + « Afficher plus » already handles overflow; revisit at thousands of rows. | High | ter A; openstatus infinite variant is server-side | **Skip** |

---

## 3. GitHub / library verdicts

### TanStack Table — **adopt v9 (narrowly), or steal-pattern-only**
- Fetched: https://tanstack.com/table/v8/docs/introduction — *"Headless UI library for building powerful tables & datagrids"*; supplies *"functions, state, utilities and event listeners"*, you keep *"full control over markup and styles"*. MIT (training knowledge for the license; LICENSE not fetched — but universally known).
- Fetched: https://tanstack.com/blog/announcing-tanstack-table-v9 — v9 **stable August 2026** (confirmed by InfoQ via search: https://www.infoq.com/news/2026/07/tanstack-table-v9-beta/). *"Features are explicit, modular, and tree-shakeable in Table V9"*; *"Table V9 used up to 86% less retained JavaScript heap than Table V8"*; start ~5 kb and add only registered features; state on TanStack Store.
- Fetched: https://ui.shadcn.com/docs/components/data-table — shadcn's official guide **now targets v9** (`tableFeatures()`, `useTable()`, `createColumnHelper()`, `createSortedRowModel`), and its philosophy matches this codebase exactly: *"It doesn't make sense to combine all of these variations into a single component… we'll lose the flexibility that headless UI provides."*
- Fit: headless → keeps `components/ui/table.tsx` markup and every Cream & Ink ruling untouched. The right integration is **sorting + column-visibility features only**, feeding it the ALREADY-filtered `dossierList` (keep the existing manual filter useMemo; do not adopt its filter row model, and do not enable pagination — ter A forbids page numbers). If only sorting is wanted, hand-rolling is honestly cheaper than the dependency; TanStack earns its keep the moment visibility + sorting + (later) order coexist.

### openstatusHQ/data-table-filters — **steal-pattern-only** (MIT, LICENSE fetched)
- NOTE: the repo moved orgs — `github.com/openstatus/data-table-filters` 404s; it is **openstatusHQ/data-table-filters**. README + LICENSE fetched raw; guide fetched at https://data-table.openstatus.dev/guide; rebuild rationale at https://www.openstatus.dev/blog/nobody-should-hand-code-a-data-table (fetched).
- 2026 rebuild: *"It's not a library. It's a playbook."* Schema builder (`createTableSchema` + `col.*`), BYOS state adapters (nuqs / zustand / memory), 12 cell renderers, cmdk command filtering, **row detail side panels (sheet/drawer)**, faceted counts, infinite scroll, shadcn-registry distribution (`npx shadcn add https://data-table.openstatus.dev/r/data-table.json`), Drizzle helpers server-side.
- Verdict: wholesale adoption = a rewrite (schema-driven tables, nuqs URL state, its own visual language) that would fight element-specs §2/§3 and the Cream & Ink table. Steal: (a) **faceted option counts** in filter dropdowns; (b) the **row-detail Sheet** composition; (c) URL-shareable filter state via nuqs as a later nicety (persisted filters already exist); (d) its cmdk filter-command input if a power-search is ever wanted.

### sadmann7/shadcn-table → now **tablecn** — **skip** (MIT, LICENSE.md fetched)
- README (fetched raw) shows it has grown into a server-first stack: *"Server-side pagination, sorting, and filtering"*, TanStack DB reactive store, Drizzle/PostgreSQL, PartyKit multiplayer. Architecture mismatch with a Firestore client-listener app; its pagination-centric model collides with ter A. One idea worth noting: *"Auto generated filters from column definitions."*

### shadcn/ui official data-table doc — **adopt as the implementation guide**
- Not a dependency; its column-visibility dropdown snippet (`getCanHide()` → `DropdownMenuCheckboxItem` → `column.toggleVisibility()`) is the exact recipe for feature #5, and its per-use-case philosophy legitimizes keeping the bespoke table.

### Tremor tables — **skip**
- Fetched https://tremor.so/docs/ui/table: presentation-layer only (*"Display data efficiently in a column and row format"*), no TanStack integration, no sorting/pagination/export; Tremor Labs now under Vercel. It duplicates, less well for this design system, what `components/ui/table.tsx` already is.

### 21st.dev — **browse-only, skip as a source of record**
- Search-verified: registry marketplace, *"313 table components for React"* at https://21st.dev/s/table, install via shadcn CLI per-component. Quality/licensing varies per author; nothing there beats openstatus/shadcn official for this use. Occasional inspiration browsing only.

### reactbits.dev — **skip for this app** (couldn't fetch content)
- Direct fetch returned only the title "React Bits - Animated UI Components For React" (JS-rendered site). TRAINING-KNOWLEDGE FLAG: its catalog is animated text effects, backgrounds, cursor effects — eye-candy with real value for marketing pages, near-zero for a claims record list; would violate the motion-spec and Cream & Ink restraint anyway.

### Awesome-design-systems / design-rules repos — **not fetched (deprioritized)**
- The repo already carries a stronger, project-specific corpus (element-specs.md, design blueprint, motion spec, docs/research/*). Generic awesome-lists would add nothing binding. Honest gap: no round spent on them.

---

## 4. Risks / notes

- **SheetJS `xlsx@0.18.5`**: TRAINING-KNOWLEDGE FLAG — npm's `xlsx` package stalled at 0.18.5; later fixes (incl. prototype-pollution/ReDoS advisories) ship only from SheetJS's own CDN registry. Not verified this round; worth an `npm audit` look before making export a headline feature.
- Export must serialize the **filtered set in displayed column order** (Retool forum failure mode) and use fr-MA formats (OQLF rules already in addendum ter D).
- Peek panel keyboard behavior (Space / ↑↓) should follow Linear's model but must not break the table's existing focusable scroll-region semantics.
- Any TanStack adoption: pin v9 (stable 2026-08), register only `sorting` + `columnVisibility` features so the bundle stays ~small; v8 docs/tutorials online now mix with v9 — the shadcn doc is v9-based.

## 5. Fetched vs unreachable (honesty ledger)

**Fetched full pages:** ui.shadcn.com/docs/components/data-table · tanstack.com/table/v8/docs/introduction · tanstack.com/blog/announcing-tanstack-table-v9 · raw README+LICENSE of openstatusHQ/data-table-filters · data-table.openstatus.dev/guide · openstatus.dev/blog/nobody-should-hand-code-a-data-table · raw README+LICENSE.md of sadmann7/shadcn-table(tablecn) · pencilandpaper.io enterprise-data-tables · tremor.so/docs/ui/table · linear.app/docs/peek.

**Search-snippet only (not full-fetched):** Airtable support docs · Attio help docs (guessed URL 404) · CCC ONE workfiles help (403) · Retool docs (old URL 404) + forums · Snapsheet/Duck Creek/Guidewire marketing · InfoQ v9 piece · 21st.dev.

**Unreachable / nonexistent:** github.com HTML pages and api.github.com via WebFetch (404s; gh CLI unauthenticated) · reactbits.dev content (JS-only shell) · Evil Martians table essay (appears not to exist) · Guidewire ClaimCenter real UI docs (login-walled) · any Snapsheet product doc.

**Training-knowledge flags:** ClaimCenter recent-claims/QuickJump bar · Linear Cmd+C copy-ID · reactbits catalog contents · TanStack MIT license · xlsx 0.18.5 npm-stall/CVE situation.
