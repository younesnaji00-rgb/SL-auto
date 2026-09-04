# Questioning the Table — research report for "Missions terrain" (/assignations-atg)

Research date: 2026-09-03. All "Findings" cite pages actually fetched in this session (directly or via r.jina.ai proxy, noted). Training-knowledge claims are flagged as such.

## Findings

### Q1. Table vs alternatives for a queue of ~5–50 geographic, time-boxed missions

**F1. Tables earn their place only when cross-row comparison is the real job.**
- NN/g, "Data Tables: Four Major User Tasks" — https://www.nngroup.com/articles/data-tables/
  Tables serve four tasks: find records by criteria, compare data, view/edit a single row, take actions on records. Tables beat cards because "in a table, two adjacent data points are easy to compare because, unlike with a card-based UI, users don't need to either move their eyes much or store information in their working memory." Also: "The default order of the columns should reflect the importance of the data to the user" and the first column should be "a human-readable record identifier."
- uxpatterns.dev, "Table vs List View vs Card Grid" — https://uxpatterns.dev/pattern-guide/table-vs-list-vs-cards
  Explicit default rule: "Start with List View when the dataset is small and scanning matters more than dense comparison. Move to Table only when column comparison becomes the real job." Table = strong sorting + comparison, weak mobile; list = "users scan a single vertical stream and only a few attributes matter per item."
- Smart Interface Design Patterns (Vitaly Friedman), "Cards vs. Lists vs. Tables vs. Data Grids" — https://smart-interface-design-patterns.com/articles/cards-vs-lists-vs-tables-vs-data-grids/
  Choice must be "driven by the type and scope" of user tasks and data density, not intuition. Lists suit fast vertical scanning of small datasets with limited attributes; tables suit structured overview + side-by-side comparison; data grids only for Excel-like manipulation. Warns against piling on features.
- Maeve Shen case study (Medium/Design Bootcamp, via r.jina.ai) — https://medium.com/design-bootcamp/when-to-use-which-component-a-case-study-of-card-view-vs-table-view-7f5a6cff557b
  Cards = browsing/discovery with visual cues; tables = "sort, filter, compare, and analyze"; table readers use an F-pattern starting from column headers.

  **Read against the page:** a field-mission queue is *triage*, not analytics. Nobody compares "Créé par" across 8 missions; the tasks are "which mission is at SLA risk?", "what's next on my route?", "call this insured". By these sources' own criteria that's a list/queue task, with a table defensible only for the dispatcher's monitoring lens.

**F2. What field-service dispatch products actually ship: map + job list + schedule, jobs as cards, never a 12-column table.**
- ServiceM8, "Dispatch Board — Overview" — https://support.servicem8.com/hc/en-us/articles/200272704-Dispatch-Board-Overview
  Dispatch board = map view of all jobs + vertical job list + schedule (day/week/fortnight/month). Jobs are cards showing exactly four things: "the customer name, basic contact details, job status and the first line from the description," color-coded by status (orange quote / blue WO / green complete / red unsuccessful). Dispatchers drag jobs onto staff; queues hold blocked jobs with auto-expiry.
- ServiceM8, "Jobs view in the app" (field-worker side) — https://support.servicem8.com/hc/en-us/articles/4406922335887-How-to-stay-in-control-using-the-Jobs-view-in-the-ServiceM8-App
  Field workers get *smart lists*, not tables: ACTION REQUIRED, FOR MY REVIEW, MY TASKS, MY SCHEDULE (chronological), TODAY (scheduled + queued). Each list shows a count badge; jobs carry "job highlights" that "display context without opening the full record."
- Salesforce Field Service, "Dispatch Console Gantt" — https://help.salesforce.com/s/articleView?id=service.pfs_gantt.htm&language=en_US&type=5
  The dispatcher console is three coordinated panes: appointment list + Gantt (resources × time) + map, with custom filters, territory filtering, color-coding, violation checking.
- ServiceTitan, "Dispatch Software" — https://www.servicetitan.com/features/dispatch-software
  Ships a drag-and-drop dispatch board, "Map 2.0" for routing, customizable schedule view; two-click call/mass-text to technicians is a headline feature (quick actions, not row navigation).
- Jobber, "Scheduling" — https://www.getjobber.com/features/scheduling/
  "Switch between day, week, or month views" plus a map view opened *alongside* the schedule; color-coding, drag-and-drop; crews get job details and real-time alerts on phones.
- Oracle Siebel/Facilio Gantt convention (search-result summaries only, pages not deep-fetched — corroboration): dispatch boards conventionally split into an employee-list frame and a calendar/timeline frame with color-coded activity blocks.

  **Convention verdict:** across four fetched products the dispatcher primitives are *schedule/timeline, map, and a card-like job list with status colors*. A wide attribute table appears nowhere as the primary dispatch surface. Time-boxed geographic work is displayed against time and geography.

**F3. Kanban vs list.** Search-result synthesis (Zoobbe/Mursa comparisons; pages not individually fetched — weak evidence, flagged): boards shine when the team needs shared visual status and drag-driven stage changes; lists/tables win "reporting, due-date sweeps, and manager reviews." On this page the stage (Avant/En cours/Après) is already the tab axis and stage transitions happen via field work, not drag — kanban would add motion without a job.

### Q2. Row-click-to-navigate as the only drill-in

**F4. Full-page-per-row is the classic pogo-stick.**
- NN/g, "Pogo Sticking" — https://www.nngroup.com/articles/pogo-sticking/
  Hub-and-spoke bouncing between a list page and detail pages is costly; "higher interaction cost results in lower usage over time." Remedy #1 is to enrich the list items' information scent so users can decide *without* clicking (their Redbox example: surface the differentiating fact — availability — directly in the browse view). For missions the differentiating facts are deadline risk and photo progress; today both require a click (progress isn't even in the row).

**F5. Non-modal side panels are the researched answer for single-record view from a list.**
- NN/g data-tables article (above): non-modal panels "allow for the full display (and editing) of a single record while still allowing the user to view the rest of the table's data."
- Pencil & Paper, "Data Table Design UX Patterns" — https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
  Ranks five drill-in options by disruption: inline expandable rows (least disruptive) → hover tooltips → sidebar panels ("most scalable option" for content needing scroll/subtabs) → modals (cheap to build, "more disruptive") → full-screen. Inline quick actions: "opportunistically display the right interactions only when and where they are needed" (hover-revealed row actions).
- GitLab Pajamas, "Drawer" — https://design.gitlab.com/components/drawer
  Drawer when "the user's primary task remains on the current page and the drawer provides supporting context"; full page when "supplemental content isn't suited for small areas or is part of a flow."
- WebAppHuddle, "Master-Detail UI pattern" (via r.jina.ai) — https://webapphuddle.com/master-detail-ui-pattern-design/
  Side-by-side master-detail wins when "you need to switch between items frequently and want to edit or delete them but still want to stay in the same context"; stacked (full-page) is the phone pattern.
- Microsoft, "List/details pattern" and Windows dev blog (search-result summaries; corroboration): side-by-side for ≥720epx widths, stacked full-page for phone.
- Tess Gadd, "UX cheat sheet: Preview and full display" (uxdesign.cc, via r.jina.ai — **partial fetch, intro only**): establishes the governing principle — "show the user just as much as they need and they can investigate further if needed."

  **Verdict:** the "only way in is a full navigation" design is the single most-criticized aspect. Dispatchers triaging several missions in a row are exactly the "switch between items frequently" case; a peek panel/drawer plus in-row quick actions (call, itinerary, open) is the convergent recommendation of NN/g, Pencil & Paper, GitLab, and the master-detail literature.

### Q3. Twelve columns

**F6. Column count is a prioritization failure, not a data problem.**
- Pencil & Paper (above): "prioritize as a product team which columns are the most important for the user to see upon page load"; offer hide/show/reorder/resize; freeze the identifier column. User-configurable columns are the escape hatch, not the fix for a bad default.
- NN/g (above): default column order must reflect importance; first column = human-readable identifier (Dossier ref — the current page gets this right).
- Denovers, "Enterprise Table UX" — https://www.denovers.com/blog/enterprise-table-ux-design
  "Allow the users to hide irrelevant data columns"; hover-revealed actions; status via row/cell color; 40–56px row heights.
- ServiceM8 job card (F2): a shipping dispatch product shows **four** facts per job. Salesforce's appointment list is a filtered short list, not an attribute dump.
- Horizontal-scroll cost: UX Movement's "condense a wide table" post argues horizontal scrolling "goes against the user's expectation" (paywalled — only the intro was readable; flagged).

  **Applied:** of the 12 columns, the triage-relevant set is ~6: Dossier ref, Assuré (+ phone as an action icon, not a column), Immatriculation, Compagnie, Agent, Date RDV + countdown chip. Zone+Adresse merge into one location line (second row of the cell or subdued second line — the "stack related data" move the responsive-table literature recommends; Stephanie Walter's roundup, https://stephaniewalter.design/blog/essential-resources-design-complex-data-tables/, catalogs exactly this linearization strategy). "Créé le / Créé par / Assigné par" are audit metadata: no fetched source shows audit fields in a queue row; they belong in the detail panel (or a "Détails" subtab of it), consistent with Pencil & Paper's "sidebar panel for content needing subtabs."

### Q4. Date-bucket groups vs single sorted list

**F7. Deadline-bucketed smart lists are the convention for time-boxed work queues.**
- ServiceM8 field app (F5/F2): ships TODAY and ACTION REQUIRED as separate smart lists with counts; MY SCHEDULE is a single chronological list. Both models coexist for different intents.
- GOV.UK-adjacent task-list logic and to-do apps (TickTick/2Do — search-result summaries, flagged): Today groups conventionally absorb overdue items or list them first; "choose stable ordering and grouping rules so users can build muscle memory."
- Ticket-triage writing (Supportbench/BoldDesk et al., search summaries — process-level, flagged): prioritize on urgency/impact and SLA risk, "not on arrival time" — i.e., the late bucket outranks today's bucket.

  **Verdict:** keep the three buckets (they match the smart-list convention and carry count badges well), but order them by risk — **En retard first**, then Aujourd'hui, then À venir — and sort within buckets by deadline, not creation time. A calendar lens (uxpatterns.dev Calendar pattern — https://uxpatterns.dev/patterns/data-display/calendar) is only warranted when users "compare days, weeks, or months at a glance"; it explicitly advises against calendar when the task is action-taking, and warns the real cost is state/accessibility complexity. A 24-business-hour SLA queue rarely needs month-grid comparison.

### Q5. View switcher / saved views

**F8. Multi-view is mainstream but has real cost; opinionated single views are defensible at this scale.**
- ui-patterns.com, "Adaptable View" — https://ui-patterns.com/patterns/AdaptableView
  Provide a switch mechanism when a significant user segment has different needs; settings must persist; risk of overcomplication — "just because a user has the ability to use these tools, doesn't mean that they have the knowledge or willingness."
- Trello/Notion/Productboard view-switcher and saved-views evidence (Atlassian blog + Productboard help, search-result summaries — flagged): switchers + pinnable saved views are now table-stakes in horizontal tools, where the *same data* serves many jobs.
- Vitaly (F1): "start simple and add features only when genuinely needed."

  **Applied:** this page serves exactly two personas with two jobs (dispatcher monitoring; agent working a route). That argues for two *role-shaped defaults* rather than a free-form switcher: a queue list (default) and a map lens tied to the existing Itinéraire concept. A full table⇄map⇄agenda⇄kanban switcher is horizontal-tool machinery this vertical app doesn't need to maintain.

### Q6. Per-mission progress in the list

**F9. Surfacing per-item progress/status directly in the list is a documented pattern.**
- GOV.UK Design System, "Complete multiple tasks" (task list) — https://design-system.service.gov.uk/patterns/complete-multiple-tasks/
  Status tags per task (Incomplete/In progress/Completed/Cannot start yet) so users "see exactly what requires action without revisiting completed sections"; start with the smallest viable status vocabulary.
- ServiceM8 (F2): status color-coding on every job card + "job highlights" showing why a job needs attention *without opening it*.
- NN/g pogo-sticking (F4): put the differentiating information in the browse view.
- Pencil & Paper (F5): "visual cues including images, icons, colour-coding, progress bars" belong in rows.

  **Applied:** a mission's differentiating state is (a) deadline countdown (already a chip — good) and (b) photo progress for the current stage. Evidence supports a compact progress chip per row (e.g., "📷 6/8" or a 3-segment stage indicator), plus a "docs manquants" style flag — this is what turns the list from a directory into a triage queue.

## Could not fetch
- **uxdesign.cc / Tess Gadd "Preview and full display"** — Medium paywall; r.jina.ai returned only the intro (the progressive-disclosure principle quoted above is from that intro; the per-pattern recommendations were not readable). freedium.cfd DNS-failed.
- **UX Movement "The easiest way to condense a wide table"** — Substack paywall; only the intro (horizontal-scroll critique) was readable.
- **webapphuddle.com** — direct fetch 403; succeeded via r.jina.ai (cited above as proxied).
- **GOV.UK old task-list URL** (/patterns/task-list-pages/) — HTTP 410; replaced by /patterns/complete-multiple-tasks/, which was fetched.
- **Reddit r/UXDesign / HN threads** on enterprise tables and row-click vs panel — two targeted searches surfaced no fetchable thread; no Reddit evidence is cited. The kanban-vs-list, to-do-grouping, ticket-triage, Trello-views, and Microsoft list/details claims above rest on **search-result summaries only** and are flagged as weaker evidence.
- Training-knowledge flag: characterizations of Linear/Notion peek behavior beyond the fetched MakeUseOf/Medium search summaries are from training and were deliberately not leaned on.

## Implications for Missions terrain — structural options

### Option A — Triage list + side peek panel (recommended core)
Keep one vertical surface per tab, but rebuild rows as two-line triage entries (~6 primary columns: Ref, Assuré, Immatriculation, Compagnie, Agent, RDV+countdown; second subdued line: Zone · Adresse; phone becomes a call icon-action). Add per-row photo-progress chip and hover quick actions (Appeler, Itinéraire, Ouvrir). Clicking a row opens a right-side non-modal drawer (photos grid, docs, audit metadata Créé le/par + Assigné par, actions); the full page remains reachable via "Ouvrir le dossier".
**Evidence:** NN/g four-tasks + non-modal panel; Pencil & Paper disruption ranking (sidebar = most scalable); GitLab drawer rule; pogo-sticking remedy; ServiceM8 4-fact card + job highlights; GOV.UK status tags.
**Tradeoffs:** desktop-width dependency (panel needs ~1200px+; below that fall back to full-page nav, which is already the mobile pattern); drawer must not duplicate the detail page's logic — reuse tab components.
**Effort:** medium — column restructure + one Sheet/drawer composition from existing detail-page pieces; no data-model change.

### Option B — Dispatch split: list ⇄ map lens (additive to A)
A persistent toggle (persisted per user, per Adaptable View guidance) between the triage list and a map view plotting the same filtered missions, pins color-coded by deadline state, click = same peek panel. This operationalizes the existing per-group Itinéraire button into the industry-standard dispatch surface.
**Evidence:** ServiceM8 dispatch board (map is the hub), Salesforce console map pane, ServiceTitan Map 2.0, Jobber map-alongside-schedule — four for four in fetched field-service products.
**Tradeoffs:** map library + geocoding of Adresse (may not be reliably geocodable in Moroccan addressing); only pays off for the dispatcher persona and agents planning multi-stop days.
**Effort:** high (geocoding pipeline + map component), which is why it's a phase-2 lens, not the default.

### Option C — Agenda/schedule-first (agent-lane timeline)
Rebuild the dispatcher view as agents × day timeline (Salesforce/Siebel Gantt convention), missions as blocks.
**Evidence:** it is *the* enterprise dispatch convention (Salesforce, Siebel, ServiceTitan schedule view).
**Tradeoffs:** those boards exist for capacity balancing and drag-rescheduling across many technicians; with a handful of agents, appointments at coarse times, and a photo-stage (not time-slot) mental model, the machinery outweighs the benefit. uxpatterns.dev's calendar guidance warns against calendar/timeline when the task is action-taking, and flags its state/accessibility cost.
**Effort:** very high. Not recommended now; revisit if agent count and same-day rescheduling grow.

### Option D — Kanban by stage
Columns Avant/En cours/Après with mission cards.
**Evidence against:** stage is already the tab axis; stage transitions are driven by field photo uploads, not dispatcher drag; list views beat boards for "due-date sweeps" (search-summary evidence). Kanban would trade deadline scannability for a status visualization the tabs already provide.
**Effort:** medium, but rejected on fit.

**Recommended path:** A now (prune to ~6 columns + second line, progress chips, quick actions, peek drawer; reorder groups En retard → Aujourd'hui → À venir), B as the follow-up lens, C/D declined with reasons documented.
