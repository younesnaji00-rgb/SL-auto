# Chiffrage redesign — frontend library & pattern research

Date: 2026-09-03. Scope: work-queue table page, document-review detail page, split PDF-vs-line-items editor, app-wide command palette/keyboard. RESEARCH ONLY — no code was changed. All repo facts below were fetched live (GitHub pages / raw READMEs / docs) unless flagged in §6.

Stack constraints verified against `package.json`: Next 15.5.9 (App Router), React 19.2, **Tailwind CSS 3.4.1** (v3, not v4), tailwindcss-animate, shadcn/ui vendored. Anything Tailwind-v4-only or theme-bearing must be restyled into Cream & Ink tokens — we adopt behavior, never foreign visuals.

---

## 1. Already installed / already vendored

**Installed (package.json):**
- `cmdk` ^1.0.0 — command palette engine is ALREADY a dependency
- `tailwindcss-animate` ^1.0.7 — enter/exit keyframes available
- `react-zoom-pan-pinch` ^4.0.3 — zoom/pan container, ALREADY there for the PDF pane
- `pdfjs-dist` ^5.6.205 (+ worker in `public/pdf.worker.min.mjs`), `pdf-lib`, `@react-pdf/renderer` (generation, not viewing)
- `lucide-react`, `date-fns` v3, `recharts`, `embla-carousel-react`, `react-hook-form` + zod, full Radix primitive set, `next-themes`

**NOT installed:** `@tanstack/react-table`, `@tanstack/react-virtual`, `framer-motion`/`motion`, `react-resizable-panels`, `vaul`, `dnd-kit`, `kbar`, `react-hotkeys-hook`, `@formkit/auto-animate`.

**Vendored in `src/components/ui/` (50 files)** — notably beyond stock shadcn: `command.tsx` (cmdk wrapper exists — palette is wiring work, not a new dep), `kbd.tsx`, `sortable-header.tsx`, `filter-chip.tsx`, `saved-views.tsx`, `status-chip.tsx`, `multi-select.tsx`, `empty-state.tsx`, `error-state.tsx`, `page-skeleton.tsx`, `inline-loader.tsx`, `sheet.tsx`, `table.tsx`, `cell-number-input.tsx`, `date-picker.tsx`, `icon-chip.tsx`, `sliding-thumb.tsx`. Do not re-add any of these via shadcn CLI; extend them.

---

## 2. ADOPT NOW shortlist (ranked)

1. **`@tanstack/react-table`** — MIT, 28.4k★, active. Headless (zero CSS, so Tailwind v3 + Cream & Ink is a non-issue). What it buys over the hand-rolled table: controlled `sorting`/`columnFilters`/`columnVisibility` state objects that are trivially persisted to localStorage (per-user column visibility for free), `getFacetedRowModel`/`getFacetedUniqueValues` for filter-chip counts, row selection model, column pinning, and a single row model the peek-panel + keyboard nav can share. Caution: the official shadcn data-table guide now targets **v9** with a `tableFeatures()` tree-shaking registration model (`rowSortingFeature` etc.) and its `<Table/>` markup stays ours; check the npm `latest` tag before install and prefer the stable line — v8 knowledge/examples are far more abundant. Integration cost: medium (rewrite queue table columns as `ColumnDef`s, keep existing `table.tsx`/`sortable-header.tsx` visuals).
2. **`react-resizable-panels`** (bvaughn) — MIT, 5.4k★, active. Powers shadcn's Resizable. Exactly the split-editor need: keyboard-resizable WAI-ARIA separator, collapsible panels, layout persistence (`defaultLayout` + `onLayoutChanged` in current docs; older `autoSaveId` localStorage shortcut — verify which API the installed major exposes: **v4 renamed `PanelGroup`→`Group`, `direction`→`orientation`**; shadcn wrapper updated Feb 2025). Known SSR caveat: slight layout shift with percentage defaults — persist layout in a cookie or accept the shift (client component anyway). Cost: low.
3. **`react-hotkeys-hook`** — MIT, 3.5k★, active (Renovate, 2.3k commits). `useHotkeys` with scopes (`HotkeysProvider`, `toggleScope`) = clean shortcut registry per workspace tab; ignores form tags by default (critical — the app is form-heavy); supports sequences and combos for j/k row nav + `?` help dialog. Tiny. Cost: low.
4. **`@formkit/auto-animate`** — MIT, 13.9k★. One-line `useAutoAnimate` on the `<tbody>` gives smooth FLIP reorder when deadline-sorted rows change rank from Firestore realtime updates — the exact "queue breathes" effect, with zero animation-library commitment. Limitation: animates direct children only; disable during pagination/filter swaps (set `enable(false)`) or it animates bulk swaps distractingly. Cost: trivial.
5. **cmdk (already installed) + vendored `command.tsx`** — 12.9k★, MIT, active. Ship the ⌘K palette now: `Command.Dialog`, nested pages for "go to dossier / filter queue / actions", `keywords` aliases for FR terms. Fine to ~2-3k items without virtualization (per its own docs) — dossier lists fit. Zero new deps; pair with react-hotkeys-hook for the global binding.

Optional 6th, only if a queue view ever exceeds ~300 rows: `@tanstack/react-virtual` (7.1k★, MIT, 10-15kb, headless). See §4 for the honest threshold.

---

## 3. STUDY THE PATTERN (mine structure, don't take deps)

- **openstatusHQ/data-table-filters** — 2.2k★, MIT, active. The single most relevant repo for the queue page: faceted filter bar with counts, command-style filter input, 12 filter types, 12 cell renderers (gauge/timestamp/badge — cf. deadline meters), and **row-detail side panel via Sheet** — the exact table-row → side-peek master-detail we want, built on components we already vendor. Distributed as shadcn-registry blocks (nuqs + TanStack Query assumptions in the server examples — we'd keep Firestore realtime and lift the client-side filter/peek structure only). Restyle everything into Cream & Ink.
- **sadmann7/shadcn-table ("tablecn")** — 6.3k★, MIT, very active. Notion/Airtable-style advanced filter builder, Linear-style command filtering, selection action bars. Stack assumes Next + Drizzle + Postgres server-side pagination — does NOT fit Firestore realtime wholesale; mine the filter-builder UX and action-bar pattern.
- **Official shadcn data-table guide** (ui.shadcn.com/docs/components/data-table) — the canonical `DataTableColumnHeader` / `DataTablePagination` / `DataTableViewOptions` decomposition; copy-paste pattern, our styling. Note it does NOT cover faceted filters, pinning, or persisted state — combine with openstatus for those.
- **Paperless-ngx** — 44.8k★ but **GPL-3.0 and Angular**: never copy code. Study the document-detail UX only (PDF preview beside an editable metadata column, document version cards) via docs.paperless-ngx.com screenshots — closest OSS analog to our document-review + transcription flow.
- **wojtekmaj/react-pdf** — 11.2k★, MIT, active; wraps the same `pdfjs-dist` we ship. We already run pdf.js directly with our own worker + `react-zoom-pan-pinch` v4 for zoom/pan — likely no adoption needed. Study its text-layer/annotation-layer wiring if we ever need selectable text in the split view; its Next caveats (dynamic import `ssr:false`, worker module-local `workerSrc`, cMaps copying) match what the app already solved. Zoom = `scale` prop, rotate = `rotate` prop (90/180/270) if we swap in.
- **raunofreiberg/interfaces** — living guidelines doc; rules extracted in §5. Highest signal-to-noise of the "design-rule repos" checked.
- **Refactoring UI note repos** — real ones exist: erikuus/good-ui, narutosstudent/refactoring-ui-notes, plus gists (selcukcihan, tolu-c). Useful reinforcement of hierarchy/spacing rules already codified in our blueprint; skim, don't canonize (the book itself is the source; notes are paraphrases).
- **21st.dev** — community shadcn registry, 12k+ components, 700+ authors; install via shadcn CLI registry URLs or copy; **2 free copies/day, membership for unlimited; per-author publishing means per-component license diligence**. The /s/table category (313 entries) is heavily diluted with pricing tables; credible authors spotted for our needs: **Origin UI** (table variants), **Ruixen** ("Table With Dialog", "InlineAnalyticsTable"), Sean Hello ("Data Grid Table" with draggable rows), Bundui "Payments Table", felipemenezes098 "Complex Data Table". Verdict: a browsing/idea surface, not a supply chain — copy at most a structure, re-token everything, check each component's license before lifting.

---

## 4. REJECTED (with reasons)

- **vaul** (drawer) — 8.6k★ but the repo now carries an explicit notice: **"This repo is unmaintained."** Use our vendored Radix `sheet.tsx`/`dialog.tsx` for the row-peek panel instead; nothing vaul does (mobile snap-point drawers) is core to a desktop work queue.
- **kbar** — 5.2k★, MIT, but fully overlaps cmdk which is already installed and vendored. Two palette engines is one too many.
- **glideapps/glide-data-grid** — 5.3k★, MIT, React 16-19, editing built in — but canvas-rendered: themed via a JS theme object, custom cells drawn with Canvas APIs. Our Cream & Ink CSS tokens, glass rims, and DOM-based a11y patterns don't transfer; peer deps include lodash + marked. Built for millions of rows; a chiffrage line-item grid has dozens. Overkill, wrong rendering model.
- **Handsontable** — commercial: from **$999/developer** (Standard) to $1299 (Priority); free tier is explicitly non-commercial. Rejected on license alone.
- **HeroUI (ex-NextUI) / any full component library** — brings its own theme provider, token system, and framer-motion dependency; wholesale adoption would fight the locked Cream & Ink system and duplicate 50 vendored components. Reject; at most study individual component behavior.
- **framer-motion / `motion`** — 33.5k★, MIT, healthy — rejected *for now* as a dependency: tailwindcss-animate + auto-animate + CSS transitions cover the motion-spec needs (docs/motion-spec.md is binding, 200ms-class interactions). Revisit only if a spec'd interaction (shared-layout transitions) genuinely needs FLIP beyond auto-animate. Note the package renamed: import from `motion/react`, not `framer-motion`.
- **React Bits (DavidHDev/react-bits, reactbits.dev)** — 46.7k★, very active, 165+ components in JS/TS × CSS/Tailwind variants, installable via shadcn CLI (`npx shadcn@latest add @react-bits/...`) — but **license is "MIT + Commons Clause"** (no resale; fine for internal use, still flag for the white-label/demo product line) and the inventory is text animations, background shaders, "Background Studio"/"Texture Lab" — portfolio-flash by design. For a B2B insurance tool: at most an animated number/count-up for dashboard KPI stats, and even that is easily hand-rolled. Nothing here beats vendored components for tables/editors. Effectively rejected; keep as an inspiration bookmark.
- **@tanstack/react-virtual as a default** — honest answer: the queue is typically <100 rows; virtualization below ~200-500 DOM rows buys nothing and costs sticky-header/keyboard-nav/auto-animate complexity. Only adopt if a "all dossiers" view routinely renders 500+ rows unpaginated.
- **alexpate/awesome-design-systems** — 25.9k★ but it's a directory of ~300 corporate design-system marketing pages; low actionable density for us (we have a locked system). goabstract/Awesome-Design-Tools same category. Skip.

---

## 5. Extracted rules — raunofreiberg/interfaces (fetched raw; verbatim quotes) relevant to our table/editor/keyboard work

**Keyboard & lists (queue j/k nav, peek panel):**
- "Focusable elements in a sequential list should be navigable with ↑ ↓" (and deletable with ⌘Backspace)
- "Interactive elements in a vertical or horizontal list should have no dead areas between each element, instead, increase their padding"
- "Tabular figures should be applied with `font-variant-numeric: tabular-nums`, particularly in tables or when layout shifts are undesirable" → deadline meters, montants columns
- "Dropdown menus should trigger on `mousedown`, not `click`" (open on press)

**Focus & a11y:**
- "Box shadow should be used for focus rings, not outline which won't respect radius" (matches glass rim shadows)
- "Icon only interactive elements should define an explicit `aria-label`"
- "Disabled buttons should not have tooltips, they are not accessible"
- "Tooltips triggered by hover should not contain interactive content"
- "When using nested menus, use a prediction cone to prevent accidental closing"

**Motion (aligns with docs/motion-spec.md):**
- "Animation duration should not be more than 200ms for interactions to feel immediate"
- "Actions that are frequent and low in novelty should avoid extraneous animations" → row reorder yes, cell edit no
- "Switching themes should not trigger transitions and animations on elements"
- "Looping animations should pause when not visible on the screen"

**Editor/forms (line-item grid):**
- "Inputs should be wrapped with a `<form>` to submit by pressing Enter"
- "Font size for inputs should not be smaller than 16px to prevent iOS zooming on focus" (AT mobile flows)
- "Buttons should be disabled after submission to avoid duplicate network requests"
- "Toggles should immediately take effect, not require confirmation"

**Data & feedback (Firestore realtime):**
- "Optimistically update data locally and roll back on server error with feedback"
- "Display feedback relative to its trigger: Show a temporary inline checkmark on successful copy"
- "Empty states should prompt to create a new item, with optional templates" (extend vendored `empty-state.tsx`)

**Performance (glass system warning):**
- "Large `blur()` values for `filter` and `backdrop-filter` may be slow" — audit glass rim blur radii on the queue page
- "Hover states should not be visible on touch press, use `@media (hover: hover)`"

---

## 6. Could not fetch / stated from training knowledge

- **Tailwind version of sadmann7/shadcn-table and openstatus blocks** — GitHub pages didn't state v3 vs v4. Both are shadcn-based; recent shadcn registry components increasingly assume Tailwind v4 tokens (`@theme`). **Check each block's CSS for `@theme`/`oklch` before copying; expect light porting to our v3 config.** Same caveat for every 21st.dev component.
- **React 19 compatibility of cmdk, react-resizable-panels, react-hotkeys-hook, auto-animate** — none of the fetched pages stated it explicitly. Training knowledge + ecosystem usage says all four work on React 19; confirm via a scratch install before committing.
- `autoSaveId` on react-resizable-panels **v4** — persistence API confirmed to exist (`defaultLayout`/`onLayoutChanged`), but whether the v3 `autoSaveId` shortcut survived the v4 rename was not verifiable from the README. Check the installed version's types.
- **TanStack Table v8-vs-v9 stability** — shadcn's guide teaches v9 (`tableFeatures()` registration); I could not verify from the fetched pages whether v9 is the npm `latest` stable or still pre-release. Check `npm view @tanstack/react-table dist-tags` before install.
- **reactbits.dev component pages** are JS-rendered — per-component dependency lists (GSAP vs motion) unverifiable; the repo README confirms the four JS/TS×CSS/TW variants but not per-component deps.
- **21st.dev deep pages** — homepage and /s/table fetched via r.jina.ai proxy successfully; individual component licenses/install snippets not individually verified (313 items). Treat per-component.
- **Paperless-ngx UI details** — repo README fetched (44.8k★, GPL-3.0, Angular confirmed); the actual document-detail split-view layout is asserted from training knowledge + docs screenshots, not fetched markup.
- **Origin UI (originui.com)** as a free MIT shadcn collection — from training knowledge (surfaced via its 21st.dev entries); not fetched directly this session. Likely worth a follow-up fetch: it has strong free table/input/stat components in the right register.
- **kbar recency** — GitHub snapshot didn't expose last-commit date; historically slow-moving. Rejection stands on redundancy with cmdk regardless.
