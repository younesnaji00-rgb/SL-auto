# Data-Table UX for Dense Back-Office Apps — Deep Research Report

Date: 2026-09-02. Researcher: Claude (UX research subagent).
Source policy honored: no GOV.UK / Stripe / Material / Polaris / Carbon / Atlassian docs used. All findings below come from practitioner blogs, empirical studies, theory (Tufte/Few lineage), and community threads. Each source lists URL, fetch status, and key verbatim quotes as returned by the fetcher.

Target context (for the condensed rules, not researched): French-language auto-insurance claims back-office; dossier/queue tables 10–100 rows; locked design system (cream canvas, ink text ladder, muted dark-teal accent, terracotta reserved for time markers; 44px rows, hairlines, no zebra, sticky bg-card header).

---

## PART A — SOURCES

### A1. Pencil & Paper — "Data Table Design UX Patterns & Best Practices"
URL: https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables — FETCHED (direct)
The canonical enterprise-data-table practitioner guide. Key extracts:
- Density: three densities named — Condensed 40px, Regular 48px, Relaxed 56px. "Letting users adjust the density of the table is another powerful way to give them control and make them feel comfortable using the interface."
- Zebra: argued AGAINST for interactive tables: "It can become tricky, when using zebra stripes, to effectively differentiate between disabled, hover, focused and active states."
- Row separation: "A simple line division can do the trick just fine. Make sure the border colour is light enough as to not become visual noise."
- Alignment: "Left-align text columns. Everything that's made up of letters should be left-aligned. This is what Western brains are used to." / "Right-align numeric columns." / "Column names (a.k.a headers, heads, titles) should always align according to their column content." Center alignment prevents "quick scanning and noticing irregularities."
- Tabular figures: "Use tabular typography" to prevent "$1,111.11 looking visually smaller than $999.99." Exception: qualitative numbers (dates, zip, phone) left-align.
- Vertical separators: "Vertical separators can make the table become visually busy. They are not always necessary. Make sure you stick to a very thin border of 1px max and a light grey colour."
- Sorting: "as simple as a small chevron next to the column headings"; "The sort chevron shouldn't interfere with the alignment of the heading relative to the column's content." Default sort: "most recent entries at the top (most recently created or modified) or entries most needing action."
- Search: "To ease the 'mental matching' between search and result, consider highlighting the matches within the rows."
- Row actions: "Table actions are typically afforded by hover states... display the right interactions only when and where they are needed."
- Bulk selection: "When a checkbox is shown upon hover, it hints to rows being actionable. Once one or more rows are selected, only then is it relevant to display said actions. This is a very smart use of space."
- Sticky: "Having a sticky header is a great way to allow the user to keep context and navigate easily across the table." / "Having the leftmost column 'sticky' is just as important as the fixed header is for the regular vertical scroll."
- Multi-line cells: vertically center up to ~3 lines; "Multi-line cells should stick to the top of the cell to ensure everything is visible at first glance" beyond that.
- State: "allow their setup to be preserved throughout their browser session or under their user account"; "Provide an option to reset the view to its original (a.k.a default or full) state."

### A2. Pencil & Paper — "Filter UX Design Patterns & Best Practices"
URL: https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering — FETCHED (direct)
- Placement: sidebar "more scalable in terms of real estate"; per-column: "For a table view, an effective way is to embed the mechanism directly at a per-column level... you're maintaining the highest level of context." Horizontal toolbar = hybrid.
- Applied-filter visibility: three mechanisms — preserve state in menus, count badges "(3)", and a summary row of "lozenges or pills".
- "Take some time to prioritize the order you'll display your filters in... high-traffic properties deserve quicker access and higher visibility."
- Defaults: "a good default state which users can then deviate from."
- Apply timing: live-filtering for light data; "Batch-filtering works best for very heavy datasets or low-performing apps."
- Search inside filter panels, with autofocus. Saved views: "save a query for use next time."

### A3. Andrew Coyle — "Design better data tables" (andrewcoyle.com)
URL: https://www.andrewcoyle.com/blog/design-better-data-tables — FETCHED (direct)
- "Reducing visual noise by removing row lines or zebra stripes works well for small datasets."
- "Line divisions help users keep their place" for larger sets; "Alternating rows (aka zebra stripes) help users keep their place when scanning long horizontal datasets."
- Avoid zebra on small sets — "users may misinterpret the highlighting as meaningful."
- "Fixing the row header as a user scrolls provides context on what column the user is on."
- Pagination for prioritization apps; infinite scroll reserved for discovery feeds.
- Hover actions "reduce visual clutter but cause discoverability issues."
- Add/hide columns to "keep the table's data limited to essential information."

### A4. Andrew Coyle — "Table UI considerations for large datasets"
URL: https://www.andrewcoyle.com/blog/table-ui-considerations-for-large-datasets — FETCHED (direct)
- "Allowing horizontal scrolling and fixing the contextual identifying columns (customer name, amount, and balance due) helps the user parse the data without losing their place."
- "Fixing column headings allows the user to scroll many rows without losing the context of the column category."
- "Arrange columns in order of importance and visually distinguish identifying columns" — bold the identifier.
- "a search input that filters data in real-time based on what the user types helps the user find specific items."
- Predefined-list filters "quickly narrow rows to find relevant data."

### A5. Stéphanie Walter — "Enterprise UX: essential resources to design complex data tables"
URL: https://stephaniewalter.design/blog/essential-resources-design-complex-data-tables/ — FETCHED (direct)
- "Do your user research. Understand exactly what users need in those tables."
- "Don't take any table design decisions without really understanding how this table is going to be used."
- Responsive: "hiding columns, vertical scroll, re-ordering columns" — choice "comes down to understanding what people want to do with those tables."
- Also served as reference hub (led to Smashing, Coyle, uxdesign.cc articles below).

### A6. Smashing Magazine — "How To Architect A Complex Web Table" (Slava Shestopalov, 2019)
URL: https://www.smashingmagazine.com/2019/02/complex-web-tables/ — FETCHED (direct)
- Pinned columns: "Columns that contain key information, for instance, element names or statuses, are not scrollable."
- Column widths: "define rational default widths and allow manual resizing if needed"; minimum widths "prevent tables from ungraceful resizing."
- Truncation vs wrap: truncation "better for more or less similar text strings"; wrapping "if seeing the full content is more important."
- Filters live in headers with reset affordance: "Filter boxes usually have 'reset' icon on the right so that users can explicitly disable them and see unfiltered content."
- Mobile: convert "into cards on mobile" since "large tables lose their power on small screens."
- Type size: "16 px (12 pt) is considered to be optimal" for table body text.
- Status color: don't rely "on red text only, a warning icon will give additional clues to color-blind users." Contrast "3:1 is minimally required" for non-text.

### A7. uxdesign.cc — "Designing better data tables for enterprise UX" (via r.jina.ai)
URL: https://uxdesign.cc/data-table-for-enterprise-ux-cb48fb9fdf1e — FETCHED (via r.jina.ai proxy; direct = 403)
- Pagination: show count + next/prev, not page numbers: "When you show pages users won't have any clue what is inside those pages, so it does not make any sense for the user to go to a specific page."
- Search: type-ahead from 2nd character; column-specific search supported.
- Sorting: "Minimize visual noise by displaying sort icons only on hover... If the sort is active for a column, keep the icon visible."
- Freezing: freeze first column(s); "consider freezing the last column as well" when it holds actions.
- Alignment: "By default, all the values should stay left-aligned, but Percentage, Amount and Date should be right-aligned."
- Mobile: "Replace tables with list views on mobile"; full-screen single-task filter/search UIs on small screens.
- Errors: color + icon together for accessibility.

### A8. uxdesign.cc — "Designing better tables for enterprise applications" (Shalabh Gupta?) (via r.jina.ai)
URL: https://uxdesign.cc/designing-better-tables-for-enterprise-applications-f9ef545e9fbd — FETCHED (via r.jina.ai proxy)
- Action proximity: "The proximity of action that needs to be performed on a row should not be furthest away from the identifying column." (Contrarian to the usual far-right kebab.)
- Row-action clutter: "Imagine the same row with five or six options that repeat itself — this would make the table look visually very cluttered." → prefer selection + contextual toolbar.
- Bulk: Google-Inbox-style hover-reveal checkbox; shift-select for power users.
- Anti-pagination for work queues: "A table pattern in an enterprise application is successful if there is no need to paginate to view data." Achieved via workflow-stage filters.
- If more rows exist: "Load More" button — "This loads only what fits in the current view, and if there is a conscious action from the user to load more, then more items are loaded."
- Ambiguous row links: avoid patterns like a link that copies to clipboard — "such ambiguous patterns should be avoided."
- Selection state must persist across pages; "select all" scope (page vs. all) is a known confusion trap.

### A9. Medium/Pulsar — "Modern Enterprise UI design — Part 1: Tables" (via r.jina.ai)
URL: https://medium.com/pulsar/modern-enterprise-ui-design-part-1-tables-ad8ee1b9feb — FETCHED via proxy, LOW CONFIDENCE (returned content may be a related article; direct fetch 403). Extracts:
- "add some basic styles that provide a clear separation of rows, aid readability and remove some of the default browser styles."
- Contrast "WCAG 2 AA" minimum; semantic markup for screen readers.
- Responsive: collapsing columns with toggle ("critical columns are still visible on smaller screens") OR horizontal scroll.
- Pagination: "allow the user to choose the number of items per page (ideally saving their choice for the future)"; show total count.
- Table-level operations in "an 'actions' drop-down menu above the table"; row details in modals/detail panels.

### A10. A List Apart — "Zebra Striping: Does it Really Help?" (Jessica Enders, empirical study 1)
URL: https://alistapart.com/article/zebrastripingdoesithelp/ — FETCHED (direct)
- 244 participants, 15-row x 9-column table.
- Accuracy: "there were no statistically significant difference in accuracy between striped answers and plain answers."
- Speed: mixed; only 1 of 6 questions significantly faster with stripes.
- Preference: "the greatest proportion of participants preferred zebra striping (46%), but a significant portion had no preference at all (33%)."
- Conclusion: "the decision about whether to use zebra striping probably comes down to a subjective assessment of likely gains versus the cost of implementation." May help wide tables requiring horizontal travel and low-vision users.

### A11. A List Apart — "Zebra Striping: More Data for the Case" (Enders, study 2)
URL: https://alistapart.com/article/zebrastripingmoredataforthecase/ — FETCHED (direct)
- "For three of the eight questions, the striped version yielded a more accurate response than did the plain and lined versions." Remaining questions: differences "cannot be statistically separated from random noise."
- "in this study at least, zebra striping doesn't harm performance—and in many cases, it actually leads to an improvement." Effects modest.
- Preference: "The typical zebra striping approach (single-color, single-row) is the most preferred: 31%... only 4% rated it as the table that helps the least." Lined tables performed similarly well; double/triple striping poor.
- "The safest option is to shade the alternating, individual rows of your table with a single color." Runner-up: "ruling a line between each row may be the next best option."
- NET: for narrow tables lines ≈ stripes; stripes earn their keep as horizontal travel distance grows.

### A12. UX Movement — "9 Design Techniques for User-Friendly Tables"
URL: https://uxmovement.com/content/9-design-techniques-for-user-friendly-tables/ — FETCHED (direct)
- Abbreviate data ("$104k", "lbs"): "This conserves cell space so that you can make your columns thinner and table easier to read."
- "Tool tips can display the exact value of a rounded number without taking up space."
- Disclosure arrows per row: "More information will display when the user asks for it."
- "The persistent column headers stay with the user so that they can refer to it without having to scroll all the way back to the top."
- Zebra rationale: "Each alternating row is a different shade so that users won't mistake the row they're looking at for an adjacent row."
- "Row numbers tell users how many rows are in a table so that they can get a feel for the information density."
- Group rows into categories with disclosure to "show and hide rows on command."
- Sort arrows in headers; scope attributes for screen readers.

### A13. Darkhorse Analytics — "Clear off the table" (Tufte data-ink applied to tables)
URL: https://darkhorsevisualization.com/blog/clear-off-the-table (redirect from darkhorseanalytics.com) — FETCHED (direct after redirect)
- "Too often when we create a data table, we imprison our data behind a wall of grid lines."
- "Instead we can let the data itself form the structure that aids readability by making better use of alignment and whitespace."
- "Rather than dressing up our data we should be stripping it down."
- The famous GIF removes: heavy grid, fills, borders, bolding, redundant repeated labels; keeps aligned numbers + generous whitespace. Points to Few, Show Me the Numbers ch. 8 as canon.

### A14. Butterick's Practical Typography — "Alternate figures"
URL: https://practicaltypography.com/alternate-figures.html — FETCHED (direct)
- "Tabular figures are essential for one purpose: vertically aligned columns, like you find in grids of numbers."
- Body text: "Proportional figures are preferred because they tend to have more even spacing."
- Lining figures with caps; oldstyle mixes badly with caps ("They look wrong").

### A15. Joe Natoli (givegoodux) — "UI Design Tweaks That Make Tables Easier to Read"
URL: https://givegoodux.com/ui-design-tweaks-that-make-tables-easier-to-read/ — FETCHED (direct)
Nine tweaks: caps or small labels; sans-serif; smaller label row; grey labels ("make them recede"); left-align labels + text consistently; uniform cell padding; "Replace solid black rules with light grey ones"; dashed verticals if needed; very light alternate-row grey optional.
- "One of the simplest ways to improve UX in data-heavy apps and systems is to visually separate labels from the content they refer to."
- "a label isn't meant to be read, focused on for a length of time; it's meant to be quickly scanned and identified."

### A16. Setproduct — "Data table UI design reference guide for 2026"
URL: https://www.setproduct.com/blog/data-table-ui-design — FETCHED (direct)
- Anatomy reference: 16px horizontal / 8px vertical cell padding illustration; 3 density modes; WCAG 2.2 24x24px target floor.
- Anti-pattern: "Excessive borders everywhere"; let "whitespace and a single subtle row separator carry the structure."
- Frozen edges: "Add a subtle shadow on the frozen edge so it reads as a layer, not a seam."
- Threshold: "past roughly 1,000 rows, client-side rendering of the full set starts to feel heavy on scroll."
- Never "Page 3 of ?" without a total.
- Selection: contextual toolbar "the moment one row is selected"; explicit select-all scope; "Shift+Click range select is expected by power users."
- Loading: "Skeleton rows preserve layout during load, preventing the lurch when data arrives." Empty states: distinguish first-run vs filtered-no-results copy.
- Mobile ranking: 1) horizontal scroll, 2) card transformation (few records), 3) hide non-critical columns, 4) Priority+.
- Anti-patterns flagged: hover-only actions (a11y), tiny fonts for density, jittering sticky headers, filters with no active indication, sort arrows with no direction state.
- Density anecdote (from earlier search snippet, same source family): reviewing 300 records = 9 screens at compact vs 20 at comfortable.

### A17. Baymard — "4 Ways to Optimize the Comparison Feature for Scanning"
URL: https://baymard.com/blog/user-friendly-comparison-tools — FETCHED (direct)
- "alternating shading of rows" and "separating lines" both let users "easily scan across the table to compare specs" (either works; absence of both fails).
- Sticky identifier while scrolling praised by test users: "it freezes your column at the top with the item, that's good."
- "grouping related attributes together made it easier to focus on a broader feature" (vs alphabetical).
- Differences: "hiding is more helpful, so you could parse out the differences faster" (hide-identical beats highlight-different).

### A18. Hacker News — "Ask HN: Have you seen a website with beautiful data tables?" (id 40598266)
URL: https://news.ycombinator.com/item?id=40598266 — FETCHED (via r.jina.ai; direct = 429)
- raxxorraxor: "Maximal readability and no fluff, probably alternating colors for rows if you indeed have many columns."
- Community sentiment: minimalism, alternation only when wide; jQuery DataTables still cited as the pragmatic baseline; few libraries do table UI well.

### A19. Hacker News — thread 39939860 (seeking a beautiful-tables blog post)
URL: https://news.ycombinator.com/item?id=39939860 — FETCHED (via r.jina.ai)
- What the poster remembered as "beautiful": "dropping separator between columns", "doing some visual accents", "very modern yet simple", not "your busy PowerPoint non-tech organisation stuff." I.e., practitioner memory of premium = fewer separators + one deliberate accent.

### A20. Matt Ström-Awn — "UI Density"
URL: https://mattstromawn.com/writing/ui-density/ (redirect from matthewstrom.com) — FETCHED (direct after redirect)
- Four densities: visual ("how many things we see in a given space"), information (Tufte: "Every bit of ink on a graphic requires reason. And nearly always that reason should be that the ink presents new information."), design, temporal ("the amount of things a user can do in a given amount of time").
- UI differs from Tufte's charts: interfaces need "separators, structural elements, and signposts to help a user understand the relationship each piece has to the other" — pure ink-minimization is not the goal in UI.
- Bloomberg Terminal's "real superpower" is speed (temporal density), not clutter.
- "UI density is the value a user gets from the interface divided by the time and space the interface occupies."
- Timing ladder: <100ms feels simultaneous (skip animation); 100ms–1s bridge with transition; 1–10s indeterminate spinner; longer = determinate progress.

### A21. Molly Hellmuth — "The Ultimate Guide to Designing Data Tables" (Medium/Design with Figma)
URL: https://medium.com/design-with-figma/the-ultimate-guide-to-designing-data-tables-7db29713a85a — FETCHED (via r.jina.ai; direct = 403)
- Row heights: Condensed 40px / Regular 48px / Relaxed 56px. "Choose a line height most appropriate for the type and amount of data."
- Padding: "Maintain a minimum of 16px padding on both the right and left of each column. This means the space between each column should total at least 32px."
- Alignment: left text; left "numeric data unrelated to size (dates, zip codes)"; right "numeric data related to size"; "Align headers according to their column data."
- Row styles ladder: Grid "recommended for dense, data heavy tables"; horizontal lines "most common and recommended for all data set sizes"; zebra "recommended for larger data sets"; free form "recommended for small data sets."
- "Use a tabular (or monospaced) font when displaying numbers."

### A22. Refactoring UI (Wathan/Schoger) — via book-notes summaries
URLs: https://refactoringui.com/previews/labels-are-a-last-resort (search snippet), https://www.mohitkhare.com/blog/notes-mohitkhare... (search results) — PARTIAL (search-result extracts; book itself not fetchable)
- "De-emphasize the label by making it smaller, reducing the contrast, using a lighter font weight, or some combination of all three."
- Avoid labels by folding them into values: "12 left in stock" not "In stock: 12"; "3 bedrooms" not "Bedrooms: 3".
- Left-align text, right-align numbers "so digits line up by place value."

---

## PART B — SOURCES TRIED AND NOT FETCHED
- Stephen Few's actual table-design chapter (Show Me the Numbers ch. 8): only a lecture-abstract PDF retrieved (graphics.stanford.edu Few.pdf — content-free for tables). Few's specific rules cited below are (training knowledge, unfetched), corroborated by Darkhorse A13 which explicitly cites him.
- UX Movement Substack ("10 Design Tips for a Better Data Table", "Simplify a massive 19-column table"): PAYWALLED — only intro retrieved.
- Reddit r/UXDesign threads: reddit.com and old.reddit.com blocked ("403 ... network policy"), including via r.jina.ai. Two search passes surfaced no cached thread text. Reddit input is therefore ABSENT, not summarized from memory.
- uxbooth.com "Designing User-Friendly Data Tables": redirect loop direct; r.jina.ai returned 422.
- baymard.com "Product Table" example pages: not attempted individually (subscription-gated beyond blog).
- medium.com direct (pulsar, uxdesign.cc): 403 — mitigated via r.jina.ai (flagged low-confidence for A9).

---

## PART C — SYNTHESIS BY RESEARCH QUESTION

### Q1. Row scanning
- Separation ladder (multiple sources converge): free-form/whitespace for small simple sets → hairlines as the universal default ("most common and recommended for all data set sizes", A21; "A simple line division can do the trick just fine", A1) → zebra only when rows are LONG/wide and the eye must travel horizontally (A3, A10, A11, A17, A18). Enders' two studies: zebra never hurts, helps modestly, is most-preferred; lines are statistically indistinguishable for normal-width tables. So with ~8 columns on desktop and hairlines already present, zebra adds nothing but state-collision risk (A1).
- Row height: practitioner band is 40–56px with 48 default (A1, A21); 44px sits comfortably inside it and above WCAG 24px floor (A16). Compact modes trade scan comfort for screens-of-data (300 records: 9 vs 20 screens, A16-family).
- Alignment: text left; size-numbers (amounts, counts, %) right; qualitative numbers (dates, plaque/immatriculation, phone, codes) LEFT (A1, A7, A21, A22). Headers align with their column's content (A1, A21). Never center columns (A1).
- Tabular figures for any number column (A1, A14, A21): "Tabular figures are essential for one purpose: vertically aligned columns."
- First column = identifier, visually distinguished (bolded) (A4); actions ideally NOT maximally far from the identifier (A8).
- Truncation vs wrap: truncate when strings are similar/predictable, wrap when full content matters (A6); abbreviate aggressively ("$104k") with tooltip for exact value (A12). Multi-line cells top-align past ~3 lines (A1).
- Padding: ≥16px per cell side → ≥32px inter-column gutter (A21); uniform padding all around (A15).

### Q2. Emphasis inside a row / data-ink
- Darkhorse/Tufte: "let the data itself form the structure"; strip fills, heavy grids, bolding, redundant labels (A13). But Ström-Awn's correction: UI legitimately needs "separators, structural elements, and signposts" — data-ink is a bias, not a law (A20).
- Emphasis budget: bold the identifying column only (A4); headers recede — smaller, grey, lighter ("a label isn't meant to be read... it's meant to be quickly scanned", A15; Refactoring UI A22).
- Status: color + icon/shape, never color alone (A6, A7); keep the rest of the row quiet so status pops. Fold labels into values where possible (A22).
- Remove: vertical rules (or 1px ultra-light at most, A1); repeated units per cell (put unit in header, A1); browser default chrome (A9); "excessive borders everywhere" is the #1 anti-pattern (A16).

### Q3. Interaction
- Sorting: chevron in header, discovered on hover, PERSISTED when active ("If the sort is active for a column, keep the icon visible", A7); direction state must be visible (A16 anti-pattern list). Default sort should be meaningful: newest or most-action-needed first (A1).
- Filters: toolbar/sidebar for global facets, per-column for context (A2); applied filters must be visible as pills/badges with counts and a reset (A2, A6, A16); prioritize the 2–3 workflow filters, hide the rest behind "more" (A2, A7); live-apply is fine at 10–100 rows (A2).
- Search: real-time from ~2 characters (A4, A7), highlight matches in rows (A1).
- Queues shouldn't paginate at all: "A table pattern in an enterprise application is successful if there is no need to paginate to view data" (A8); if overflow, "Load More" (A8) or count + prev/next — never bare page numbers (A7), never unknown totals (A16). Infinite scroll is for discovery feeds, not prioritization tools (A3).
- Row actions: hover-revealed actions save space but harm discoverability and accessibility (A3, A16) — keep at most 1–2 hover actions plus a guaranteed non-hover path (row click / kebab). Avoid ambiguous row links (A8).
- Bulk selection: only when batch operations genuinely exist; hover-reveal checkbox + contextual toolbar on first selection (A1, A8, A16); shift-click expected (A16); make select-all scope explicit (A16); YAGNI otherwise — repeated per-row buttons "make the table look visually very cluttered" (A8).
- Sticky: header always (A1, A12); first column when horizontal scroll exists (A1, A4); shadow on frozen edge "so it reads as a layer, not a seam" (A16); no jitter (A16).
- Details: expandable row / side panel / modal ladder by depth of content (A1, A9).

### Q4. Density modes & responsive
- Density toggle is the classic power-user gift (A1, A3, A21) but only pays off when users differ in mission (audit vs monitor); persist the choice (A1, A9). For a fixed 44px system with 10–100 rows, a single well-chosen height + optional compact is enough (A16: use compact "only for large datasets where vertical space is constrained").
- Below ~lg: ranked strategies — horizontal scroll with frozen identifier (data integrity), card/list transform (few records), hide non-critical columns with toggle, Priority+ (A16, A6, A7, A9). Cards criticized implicitly: they kill comparison ("large tables lose their power on small screens" cuts both ways — cards lose column-scanning entirely), so reserve card-collapse for small row counts and detail-oriented reading (A16 ranks it #2 only "for few records"). Walter: the choice "comes down to understanding what people want to do with those tables" (A5).
- Mobile filter/search: full-screen single-task overlays (A7).

### Q5. What reads "premium"
- Fewer separators + one deliberate accent; "very modern yet simple", not "busy PowerPoint non-tech organisation stuff" (A19).
- Receding grey uppercase-or-small headers over quiet hairlines (A15, A13).
- Tabular figures and strict right-alignment of money — the single most-cited "professional" tell (A1, A14, A21, A22).
- Skeleton rows on load (no lurch), distinct first-run vs no-results empty states (A16).
- Micro-timing: <100ms = no animation; 100ms–1s = bridge transition (A20).
- Frozen-edge shadows, stable sticky behavior, visible sort/filter state (A16).
- Speed itself is the premium feel: Bloomberg's "real superpower" (A20).
- "Maximal readability and no fluff" (A18).
