# /dossiers Page Structure & Navigation — Deep Research Report

Date: 2026-09-03. Researcher: UX-research subagent (Claude).
Scope: the LAYER ABOVE in-table patterns (those are covered in `docs/research/tables.md` and `intuitive-crud.md`). Question: is a wide TABLE-FIRST page the right primary surface for `/dossiers` (all-day gestionnaire triage of 10–1000+ claim files), and what list→detail navigation structure should sit around it?

Source policy honored: no GOV.UK/Stripe/Material/Polaris/Carbon/Atlassian docs. Sources are practitioner blogs, product docs/blogs of best-in-class tools (Linear, Superhuman, Zendesk, Twenty, Attio, Notion-ecosystem, VS Code), GitHub repos/raw files, HN threads, and theory (NN/g information-foraging lineage). Every source lists a fetch status. Reddit was again unreachable (both direct and via search snippets) — flagged ABSENT, not faked.

---

## PART A — SOURCE LOG

Legend: FETCHED = page fetched and read via WebFetch (proxy noted where used). SEARCH-SNIPPET = only search-result text seen. FAILED = could not retrieve. TRAINING = model-knowledge claim, flagged.

### Theory: navigation cost, information scent

**S1. NN/g — "No More Pogo Sticking: Protect Users from Wasted Clicks"** — FETCHED
`https://www.nngroup.com/articles/pogo-sticking/`
- Definition: a "hub-and-spoke pattern of navigating from a routing page...to a page deeper in the site's hierarchy, then immediately back to the routing page."
- Cost: "wasted clicks" when "the destination did not match the expectation set by the page leading to it"; "a higher interaction cost results in lower usage over time."
- Fixes offered are all about the ROUTING page, not the detail page: create the missing content, "plain-spoken links, using user-oriented language, instead of 'teasing' links," and "improve the information scent of each item's description on the routing page."
- NOTE: NN/g's framing implies the cheapest fix for list↔detail bouncing is to answer more questions IN THE LIST ROW (scent), before reaching for structural changes.

**S2. NN/g — "Information Scent: How Users Decide Where to Go Next"** — FETCHED
`https://www.nngroup.com/articles/information-scent/`
- Scent = "the user's imperfect estimate of the value that the source will deliver to the user, derived from a representation of the source."
- Users weigh (1) relevance likelihood and (2) time investment, from "the link label, the content that accompanies the link, the context in which the link appears, and any background knowledge."
- Misleading scent burns trust durably: "people will be less likely to click on it knowing that they've been burned in the past."
- Transfer: each dossier row is a "link with scent." A 14-column row is a scent-maximizing representation — that is the table's core strength for triage; the question is only whether *answering* (not just choosing) requires a full page load.

### Master-detail / preview structures

**S3. WebAppHuddle — "How To Design Master Detail UI Pattern (6 design comparison)"** — FETCHED via r.jina.ai proxy (direct = 403)
`https://webapphuddle.com/master-detail-ui-pattern-design/`
- Stacked (list page → separate detail page): "Either the master or the details pane is visible at one time." Pros: cleaner, less cognitive load, small screens. Cons: "Requires additional clicks to toggle views," "Users cannot compare items side-by-side."
- Side-by-side (split view): "The master and detail panes are visible together. This is more suited for wider screen space." Pros: "Enables rapid item comparison," "Better for frequent switching between items," "Reduces navigation steps." Cons: "Demands larger display area," "Higher visual complexity."
- Pop-ups and drill-downs listed as secondary variants without detailed pros/cons.

**S4. Map UI Patterns — "List and details"** — FETCHED
`https://mapuipatterns.com/list-details/`
- Pattern fits "apps for situational awareness, operations, or asset management."
- "Keep the list simple by displaying only the most important columns and removing unnecessary design elements" while a "dedicated details view...for more complex data display or longer forms."
- Anti-pogo device inside detail: "Preview and Next buttons or arrows to navigate between records in a linear fashion. This will reduce the need to toggle back and forth between the list and the details."
- "It isn't uncommon for the details view to require more horizontal space than the list view. It's okay to adjust the width for each view if this mechanism is applied consistently."

**S5. JobPrep Arena — "Designing Contextual Side-Sheets (Drawers) vs. Modals in Highly Dense Workspace Applications"** — FETCHED
`https://www.jobpreparena.com/blog/designing-contextual-side-sheets-drawers-vs-modals-in-highly-dense-workspace-applications`
- Modals "block the underlying UI"; drawers let users "reference the workspace while interacting with the drawer."
- Drawer use cases: "Detail views maintaining list visibility," "editing a linked record without leaving the primary view," contextual metadata (comments, activity history).
- The triage loop, verbatim: "click a row in a table → drawer opens with full detail. User navigates rows with arrow keys → drawer updates in place." — "This eliminates page transitions during rapid item review."
- Drawer widths: "Narrow (320–400px), Standard (480–560px), Wide (720–800px)" with user-adjustable width via drag handle.
- Pitfalls: don't use "modals for information display when the info doesn't require action"; guard "accidental modal dismissal" with unsaved-change tracking; never stack modals.

**S6. Adrian Roselli — "Table with Expando Rows"** — FETCHED
`http://adrianroselli.com/2019/09/table-with-expando-rows.html`
- Expandable rows are legitimate for "additional details until needed" but demand real a11y work: native `<button>` disclosure, `aria-expanded`, expanded rows after the trigger in source order, `display: table-row` not `block`.
- Screen readers don't announce how many rows appeared; the accessible name must manage expectations.
- Hard limit: the pattern "cannot fix terrible information architecture" — nested tables behind expando buttons are "technically accessible, but still a terrible idea."

**S7. Accordion/expandable-row drawback corpus** — SEARCH-SNIPPET only (eleken.co accordion-ui; uxdesign.cc tabs-vs-accordions; uxpatterns.dev accordion)
- Accordions "diminish content visibility and increase interaction cost"; cause "sudden UI-shifts"; avoid "when users need to see all information simultaneously or when frequent opening and closing creates friction — in such cases, a list or table layout may work better for scanning and comparison."

### Best-in-class products: Linear

**S8. Linear Docs — "Peek preview"** — FETCHED
`https://linear.app/docs/peek`
- "Press and release Space quickly to keep peek open, or hold Space to preview temporarily and close it when released." "Press Esc to close peek."
- "Press Space to open peek, then use ↑ and ↓ to move through adjacent issues or projects while updating the preview."
- Shows "issue details including the description, assignee, status, priority, cycle, labels, estimate, creation date, and updated date."
- Positioning: like "Quicklook in macOS" — "view details of focused issues at a glance from any list or board view" without opening them. Also auto-previews items inside the command menu.

**S9. Linear Docs — "Select issues"** — FETCHED
`https://linear.app/docs/select-issues`
- "Use ↑ / ↓ or J / K to navigate the page to the issue." `X` selects; Shift+↑/↓ extends range; Esc clears; with a selection, "use Cmd/Ctrl K to open the command bar" or right-click for the contextual menu.

**S10. Linear Docs — "Triage"** — FETCHED
`https://linear.app/docs/triage`
- Triage is a dedicated intake queue "outside the normal workflow": review "before they are added to your team's workflow."
- Single-key processing: Accept `1`, duplicate `2`, decline `3`, snooze `H`; reached via `G` then `T`.
- Lesson: a work queue with per-item single-key verdicts is a *separate mode/view*, not the default list.

**S11. Linear (Medium) — "Invisible details" (andreas eldh)** — FETCHED via r.jina.ai (Medium direct = 403)
`https://medium.com/linear-app/invisible-details-2ca718b41a44`
- "The seconds add up when you're taking the action multiple times" — micro-latency compounds for all-day users.
- Contextual menus double as teaching: users can "take almost every action in Linear without lifting your fingers off of the keyboard."

**S12. Nimit Patil (Substack) — "The UX Psychology Behind Linear's Speed Advantage"** — FETCHED
`https://nimpatil.substack.com/p/the-ux-psychology-behind-linears`
- "How fast something feels often matters more than how fast it actually is."
- "Press 'C' and the create window appears immediately (0ms delay)"; optimistic updates; "contextual continuity" — overlays that "preserve user location, avoiding mentally expensive screen switches."
- "Every action has a one-key shortcut... Muscle memory works faster than looking and clicking."
- "Linear's whole approach focuses on reducing mental load" (Miller's 7±2 framing).

**S13. Gunpowder Labs — "Linear's Delightful Design Patterns You Should Copy"** — FETCHED
`https://gunpowderlabs.com/2024/12/22/linear-delightful-patterns`
- "You can control Linear entirely with the keyboard"; "100ms Instantaneous Interactions."
- Command palette: "a fuzzy finder modal that puts everything an app does at your fingertips," "unobtrusive and doesn't clutter your interface," shows shortcuts alongside options as a learning tool.
- Views: "Customize a view and save it to my sidebar," "Subscribe to a particular view," "Pin individual issues."
- "Every issue, project, view in Linear has its own URL."

### Best-in-class products: email & support inboxes

**S14. Zendesk — "Announcing split view for Agent Home"** — FETCHED
`https://support.zendesk.com/hc/en-us/articles/10418462740634`
- "Split view adds an inbox-style layout to Agent Home. When an agent selects a ticket in Agent Home, the page splits into two panels."
- Why: without it, "agents navigate back and forth between ticket lists and individual tickets, losing context with each switch."
- Audience: "designed for agents who handle high volumes of tickets and need to move quickly between conversations."
- Right panel carries the conversation + composer + properties/context panels — a *working* surface, not just a preview. This is the strongest single piece of evidence that a vendor of all-day case software concluded list→full-page navigation was the bottleneck for heavy users.

**S15. Superhuman blog — "How to build a remarkable command palette"** — FETCHED
`https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/`
- "Command palettes are incredible tools, and their speed and versatility transform users into power users."
- Rules: omnipresent same shortcut everywhere; "Your command palette must be the one place where users can find every command"; "users can default to the palette for anything they need to do"; forgiving fuzzy matching; context-aware ranking.
- Palette as shortcut teacher: users "don't need to take their hands away from the keyboard."

**S16. Superhuman marketing/product pages** — FETCHED (marketing-grade, thin)
`https://blog.superhuman.com/the-fastest-email-experience-ever-made/`
- "Split out messages from your team, VIPs, and most used tools. Focus on what really matters." (Split Inbox = saved segmented queues, not a layout split.)
- "Every action has a blazingly fast shortcut."
- The specific "100ms rule" (Paul Buchheit) and "get through your inbox twice as fast" claims appeared in SEARCH-SNIPPET text, not on the fetched page — flagged as SEARCH-SNIPPET.

**S17. Email reading-pane corpus (Outlook/Gmail)** — SEARCH-SNIPPET only (office-watch.com; learn.microsoft.com Q&A; adogy.com)
- "Many people use the Reading Pane for most of their email work rather than opening emails in separate windows."
- Preview pane "allows users to read email messages without actually opening them... helping users prioritize which emails require immediate attention without requiring multiple clicks."
- No formal usability study surfaced comparing pane vs open-per-message; treat as convention evidence, not measured evidence. TRAINING (flagged): Gmail's reading pane ("vertical split") began as a Labs power feature and is now a standard density option; Outlook has shipped reading-pane-first for two decades.

### Best-in-class products: CRMs and databases

**S18. Twenty CRM (GitHub: twentyhq/twenty) — product page + releases + README** — FETCHED (3 pages)
`https://twenty.com/product`, `https://twenty.com/releases`, `https://raw.githubusercontent.com/twentyhq/twenty/main/README.md`
- Product: "AI chat, settings, and records in a side panels for fast, single-screen access." Table views + "By Stage" kanban with "Drag-and-drop deals between stages."
- Release 0.44.0 (2025-03-17): "Side panel lets you view and edit records without leaving your current page." + "Navigate the side panel with keyboard for better accessibility and faster workflows."
- Release 1.12.0: "The side panel now opens next to your content rather than above it, giving you a better overview." Release 1.14.0: "You can now resize the side panel and navigation menu."
- Release 0.51.0: "You can now rename a view and change its type between kanban or table directly from the view options menu."
- Trajectory note: an open-source Salesforce competitor *added* a record side panel over full-page-only record pages, then iterated it from overlay → side-by-side → resizable. The direction of travel is toward split, not away.

**S19. Attio Help Center — data model / views / records** — FETCHED (views overview page, thin) + SEARCH-SNIPPET (records, kanban pages)
`https://attio.com/help/reference/managing-your-data/views` and siblings
- Fetched: table views = "Manage records and attributes in a spreadsheet-style view"; kanban views for objects and lists; filter/sort per view.
- SEARCH-SNIPPET: "Records are visualized in the form of table rows, kanban cards, and pages." "Every record you see in a table or kanban view links to a record page, which shows all the attributes and data of a record and related data" — i.e., Attio keeps a FULL record page as the deep destination even while offering views; list surfaces and the record page coexist.

**S20. Super.so — "All Notion Database Views Explained"** — FETCHED
`https://super.so/blog/notion-database-views`
- "A Notion database view is simply a saved way to look at the same database." "Edit once and it updates across every Notion database view you have saved, because all views point back to the same pages and properties."
- Table = "scan lots of properties quickly"; Board = "clearest way to run a workflow"; List = "focused list" minimal fields; Calendar = "anything driven by dates."
- Multiple views pay off when each is "purpose built" via "Filters... Sorts... Groups" — not as ornamental toggles.

**S21. UX Patterns for Developers (GitHub: thedaviddias/ux-patterns-for-developers) — "Table vs List vs Cards"** — FETCHED
`https://uxpatterns.dev/pattern-guide/table-vs-list-vs-cards`
- Table: "cross-item comparison is critical," "sorting and filtering matter," "operational interfaces where users sort, filter, and inspect many fields." Density high; mobile weak.
- List view: "users scan a single vertical stream," "only a few attributes matter per item" — "inboxes, activity feeds, and mobile-first records."
- Card grid: "visual content is a primary part of the decision," "browsing matters more than direct comparison"; weak sorting/filtering, weak comparison.
- Default advice: "Move to Table only when column comparison becomes the real job."

**S22. Airtable expanded record** — SEARCH-SNIPPET only (support.airtable.com grid view, community announcements)
- "Click any cell in the row (record) that you want to expand and press Space" → expanded record; Shift+Space expands a single cell. (Same key as Linear peek — Space-to-preview is a cross-product convention.)
- Expanded-record improvements added "a persistent action bar... so common actions like changing between records and the record title stay in the same place" — i.e., next/prev record controls INSIDE the expanded view.

**S23. VS Code docs — "User interface" (preview tabs)** — FETCHED
`https://code.visualstudio.com/docs/getstarted/userinterface`
- "When you single-click or select a file in the Explorer view, it is shown in a preview mode and reuses an existing tab (preview tab)" — italic title.
- "This is useful if you are quickly browsing files and don't want every visited file to have its own tab."
- Promotion to permanent: "When you start editing the file or use double-click to open the file from the Explorer, a new tab is dedicated to that file."
- Directly relevant: the app already has VS-Code-style tabs; VS Code's own rule is *single-click = ephemeral look, edit/double-click = committed tab*.

**S24. cmdk (GitHub: pacocoursey/cmdk) — README** — FETCHED (raw.githubusercontent.com)
- "⌘K is a command menu React component that can also be used as an accessible combobox. You render items, it filters and sorts them automatically." Used for "the Vercel command menu and autocomplete." Composable, keyboard-driven. (Implementation path evidence: the command-palette pattern is commodity infrastructure now.)

### Structure alternatives: kanban, dashboard, queue

**S25. Mursa — "Kanban Board vs List View: Which Wins for Your Workflow"** — FETCHED (single-practitioner data; self-reported numbers unverifiable — treat magnitudes with caution)
`https://www.mursa.me/blog/kanban-vs-list-view-tasks`
- Kanban wins when: "task status matters more than priority," "multiple people touch each task" (handoffs), WIP limits matter.
- Lists win for "high-volume personal task management," "priority-driven workflows," mobile.
- "list capture averaged 1.4 seconds per task versus 4.1 seconds on kanban" (author's own logs).
- Card blind spots: "22 percent of kanban cards...sat untouched for 14 or more days, compared with only 6% of list-view tasks."
- Core framing: "kanban optimizes for the question 'where is everything?' while a list optimizes for 'what do I do now?'"

**S26. Kanban search corpus + HN comments (hn.algolia API)** — FETCHED (API) / SEARCH-SNIPPET
- HN yielded implementation talk, little direct board-vs-table preference data. nck4222 (HN): inboxes are "push" systems while kanban is a "pull" system — mismatched for reactive workloads.
- Snippet corpus: "Board views show work as cards moving across columns... anyone can look at a board and know what is in progress"; "Table view works better if you need to scan many details."

**S27. Pencil & Paper — "Dashboard Design UX Patterns Best Practices"** — FETCHED
`https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards`
- Dashboards "amalgamate multiple data sources to give us a clearer picture of what's going on" — right for monitoring/overview, wrong as a detour when users need to execute tasks immediately.
- Failure modes: "It's like a wall of text, but make it data"; "We have it, so why not show it?"; "data is simply shown but not explained in the least."

**S28. DigiWagon — "Compliance Analyst Workflow UX Patterns"** — FETCHED (closest published analogue to an insurance-claims back office)
`https://digiwagon.com/blogs/compliance-analyst-workflow-ux-patterns/`
- "A compliance analyst workflow interface is a decision-support surface, not a CRUD screen; the patterns reduce cognitive load on high-consequence calls."
- Against naked queues: the plain approve/reject queue "is the wrong pattern for compliance, because it separates the decision from its rationale" → co-locate the item AND its decision context "all visible without navigating away."
- Layering rule: surface "the decision-critical context first... with deeper detail (full transaction history, prior alerts, raw source records) one interaction away rather than crowding the primary view." "The analyst who needs only the summary is not slowed by the full record; the analyst who needs to dig has it one click down."

### Navigation theory & customization

**S29. Pencil & Paper — "Navigation UX Best Practices For SaaS"** — FETCHED
`https://www.pencilandpaper.io/articles/ux-pattern-analysis-navigation`
- Three IA approaches: object-oriented (nouns: Clients, Dossiers), task-oriented (verbs), workflow-based (guided steps); best products mix them — "the most human-centred and efficient one—will likely require more than one of these 3 approaches."
- "Navigation is a process rather than a single thing"; in enterprise, "wasting time just navigating is an important problem to solve and avoid."

**S30. Pencil & Paper — "5 Enterprise UX Examples That Increase Flexibility"** — FETCHED
`https://www.pencilandpaper.io/articles/enterprise-ux-patterns`
- Custom views: "Sometimes the nuances of the view (aka screen) is a tough cookie to crack" — users need role-based ways to re-cut the same data; balance "appropriate guard rails and openness."

**S31. HN thread 30181291 — "Settings are not a design failure" (488 pts, 378 comments)** — FETCHED (API); tangential but useful on view-switcher/customization philosophy
- rhn_mk1: "Is it really fair to your users to presume they are clueless?" (pro-customization). themacguffinman: "Settings are a failure of design" when they exist to patch bad defaults. mwcampbell: for tools embedded in someone's workflow "it makes sense to impose as little as possible." dschuessler: "I wonder to what extent command palettes are the solution... VSCode does it (mostly) right."
- Net reading for view switchers: customization is defensible for all-day professional tools, but each option must serve a distinct real mission, not compensate for an undecided default.

### FAILED / ABSENT
- `https://github.blog/news-insights/product-news/hovercards-on-github/` — 404. GitHub hovercards (hover a user/issue link → mini profile card) exist — TRAINING, flagged; no fetched source.
- Reddit r/UXDesign / r/userexperience — blocked again (direct, old.reddit, via search). ABSENT; no Reddit input in this report.
- `https://github.com/Budibase/budibase/discussions/9651` — FETCHED but content turned out to be a state-refresh support thread, not the side-panel-vs-modal debate the snippet implied. Not used.
- Jira/Height teardowns: no quality practitioner teardown of Jira's list→detail surfaced in searches; Jira's board-first bias and its "open issue in side panel vs new page" behavior are TRAINING knowledge, flagged, and NOT relied on below.
- Attio deep view docs: fetched page was navigation-shell only; record-page claims rest on SEARCH-SNIPPET.

---

## PART B — SYNTHESIS BY RESEARCH QUESTION

### Q1. Is a wide table the right primary surface?

**Yes — for THIS workload the table is the correct backbone, and no fetched source argues otherwise.** The convergent criteria:
- uxpatterns.dev (S21): table when "cross-item comparison is critical," "sorting and filtering matter," for "operational interfaces where users sort, filter, and inspect many fields." A gestionnaire scanning réf/compagnie/statut/dates across hundreds of dossiers is the textbook case.
- Information-scent theory (S1, S2): the row IS the scent. 14 columns of metadata is what lets a user predict "is this the dossier I need?" before committing a click — the researched fix for pogo-sticking is *more scent in the list*, which a card grid or kanban column materially reduces.
- The claims-adjacent analogue (S28) frames the ideal as a "decision-support surface, not a CRUD screen" — which indicts a *naked* table+CRUD-actions page, not the table itself: the missing piece is decision context co-located with the row, "visible without navigating away."

**The alternatives, mapped:**
- **Kanban-by-status**: loses against the table here. Dossier flow is priority/date-driven triage with many metadata dimensions ("what do I do now?", S25), not a drag-driven pipeline; statuses are numerous and workflow transitions are governed by business rules, not free drag. Kanban's strengths (WIP limits, handoff visualization, "where is everything?") aren't the gestionnaire's daily question, and cards hide the very columns (dates, refs, matricule) triage runs on. Card-rot risk: untouched cards go stale unnoticed (S25). At most, kanban is a *secondary saved view* for a supervisor's pipeline overview — never the default.
- **Card grids**: for visual-first browsing (S21) — irrelevant to text/ref-dense dossiers. Rejected.
- **Compact list (2–3 attribute rows)**: right for "a single vertical stream" (S21) — that's the app's *mobile* transform and possibly the left pane of a split view, not the desktop primary.
- **Dashboard-first entry**: dashboards are for synthesis/monitoring, and fail exactly when users "need to execute specific tasks immediately" (S27). The app already has a separate dashboard route; making /dossiers itself dashboard-like would be a regression.
- **Dedicated triage/queue view**: Linear treats Triage as a *separate* mode with single-key verdicts, "outside the normal workflow" (S10). The existing "Rappeler" checkbox mode is the embryonic version of this. The lesson is separation: don't fuse queue-processing chrome into the default browse view; spawn modes.

**Verdict:** keep the table as the master surface. Every credible pressure found is on the *navigation shell around it* (Q2/Q3), not on the tabular form.

### Q2. Pogo-sticking: cost and remedies

The cost is documented (S1): each list→detail→back cycle is interaction-cost waste, and "a higher interaction cost results in lower usage over time"; Zendesk names it for agents explicitly — "losing context with each switch" (S14). Linear's compounding argument (S11): "the seconds add up when you're taking the action multiple times" — for an all-day user, dozens of dossier lookups/day × page-load + scroll-position + mental re-orientation is the single biggest structural tax on the current page.

Remedy ladder found in the evidence (cheap → structural):
1. **More scent in the row** (S1, S2) — already near-max at 14 columns; marginal gains only (e.g., richer statut/observation chips). Largely done.
2. **Hover cards** — context without any click (GitHub precedent — TRAINING only, no fetched source). Weakest-evidence rung; also hover-only surfaces have known a11y/discoverability costs (see tables.md A3/A16).
3. **Peek / preview panel on the list** (S8, S22, S5): Space-or-click opens a read-mostly summary beside/over the list; ↑/↓ (j/k) retargets it in place — "eliminates page transitions during rapid item review" (S5). Convention is strong: Space in Linear AND Airtable; Esc closes. The list keeps scroll position, filters, and selection.
4. **Split view / master-detail** (S14, S3, S18): the preview pane graduates into a full working pane (Zendesk: conversation + composer + context panels). Wins "rapid item comparison" and "frequent switching" (S3); costs width — a 14-column table cannot keep all columns beside a useful detail pane, so the left pane must collapse to a compact list (S4: "Keep the list simple... only the most important columns"), which is a real forfeiture of scanning power. Twenty's answer: user-resizable panel (S18).
5. **Next/Prev inside the detail page** (S4, S22): "Preview and Next buttons or arrows... reduce the need to toggle back and forth." Airtable keeps a "persistent action bar" with record-to-record navigation. Cheap, orthogonal to all other rungs, and works with the existing tab system.

### Q3. What best-in-class products actually do (and what transfers)

| Product | List surface | Detail access | Key mechanism |
|---|---|---|---|
| Linear (S8–S13) | Dense keyboard list/board | Peek (Space, ephemeral) → full issue view (committed) | j/k + Space + Esc; every view has a URL; saved views in sidebar; separate Triage mode with 1/2/3 verdicts |
| Zendesk Agent Home (S14) | Ticket work-list | Split view: list left, working ticket right | Built explicitly for "high volumes... move quickly between conversations" |
| Superhuman (S15, S16) | Split Inbox = saved filtered queues | Reading view, keyboard-only flow | Command palette as "the one place... every command" |
| Twenty (S18) | Table / kanban views, switchable | Side panel "view and edit... without leaving your current page," resizable; full record page still exists | Progressive: overlay → side-by-side → resizable |
| Attio (S19) | Table/kanban views per list | Full record PAGE remains the deep destination | Views for triage, page for depth — two-tier |
| Airtable (S22) | Grid | Space → expanded record overlay with prev/next in persistent bar | Space convention again |
| Notion (S20) | Multiple saved views of one DB | Page per row (side peek / center peek / full page — the side-peek default is TRAINING, unfetched) | Views = filters+sorts+groups, purpose-built |
| VS Code (S23) | File explorer / quick open | Preview tab (single click, italic, reused) vs committed tab (edit/double-click) | Ephemeral-vs-committed distinction |

**The transferable meta-pattern (unanimous across all eight):** two-tier detail access.
- Tier 1 — *ephemeral look*: cheap, keyboard-reachable, in-context, read-mostly, retargetable to the next row without closing (peek/preview pane/expanded overlay/preview tab).
- Tier 2 — *committed workspace*: the full record page/tab with everything editable, own URL.
The current /dossiers has ONLY Tier 2 (plus side sheets for histories). Every studied product that serves all-day operators inserted a Tier 1. None removed their Tier 2 full page to do it — split-view products (Zendesk) are the exception where Tier 1 itself became a working surface, and that was for conversation-shaped work (read+reply), not form-shaped work like a dossier.
- Depth layering rule for what Tier 1 shows (S28): "decision-critical context first... deeper detail one interaction away."

### Q4. Navigation theory

- **Hub-and-spoke vs drill-down vs preview**: hub-and-spoke (list = hub, dossier = spoke) is the right IA for object-oriented back offices (S29) — the pathology is only the *cost per spoke visit* (S1). Preview inserts a zero-cost pseudo-spoke; it doesn't replace the hierarchy.
- **Breadcrumbs vs tabs**: prior report (intuitive-crud §RQ7) covers breadcrumbs; with VS-Code-style tabs already present, tabs ARE the "where am I" mechanism for open dossiers, and VS Code's own preview-tab semantics (S23) resolve the tension between "look at many" and "tab explosion": single-click/peek should NOT mint a permanent tab; editing or an explicit open should.
- **Keyboard list navigation**: convergent convention set — ↑/↓ or j/k to move focus; Space = peek; Enter/O = open committed; X = select; Shift+↑/↓ = range; Esc = close/clear; Cmd/Ctrl+K = palette; single letters for verdict actions in queue modes (S8, S9, S10, S22). Linear's contextual menus display shortcuts inline as the teaching mechanism (S11, S13).
- **Command palette as navigation**: "the one place where users can find every command" (S15), omnipresent binding, fuzzy, context-ranked; commodity to build (cmdk, S24); doubles as settings-discoverability answer (S31). For /dossiers the highest-value palette verbs are "go to dossier <ref>", "apply saved view", and row actions on the focused/selected rows.
- **Speed as structure**: the psychological budget is Linear/Superhuman's ~100ms feel (S12, S13); a Tier-1 preview only beats the full page if it opens near-instantly from cached list data — a preview that spinners defeats its purpose.

### Q5. Multiple views of one dataset — when is a switcher worth it?

- Worth it only when each view answers a *different recurring question* on the same data: Notion's rule — views are "a saved way to look at the same database," valuable when "purpose built" with filters/sorts/groups (S20); P&P: role-based re-cuts of the same screen are a real enterprise need (S30); Twenty/Attio ship table↔kanban per view (S18, S19).
- Not worth it as an ornamental toggle: the customization debate (S31) lands on "impose as little as possible" for workflow tools BUT "settings are a failure" when they patch an undecided default. A layout switcher nobody's mission requires is clutter.
- For /dossiers: the app already has SAVED VIEWS (filter presets) — that is the high-value 80% of the multiple-views idea, already shipped. A table↔kanban↔card switcher would add a weaker surface (Q1) to maintain in a locked design system. The one *layout* dimension with a real mission split is **table-only ("scan wide") vs table+preview-pane ("triage deep")** — i.e., whether the Tier-1 panel is pinned open, a persistable per-user toggle (Twenty ships exactly this as panel open/resize state, S18).

---

## PART C — APPLICATION TO /dossiers (evidence → design)

1. **Keep the 14-column table as the master surface.** (Q1 unanimous.) Do not board-ify, card-ify, or dashboard-ify the default.
2. **Add Tier-1 peek: a right-side preview panel.** Trigger: row click OR Space on the focused row (Enter/double-click keeps meaning full open — mirrors VS Code single-vs-double semantics, S23). Content per S28's layering: identity header (réf, assuré, compagnie, statut chip), the 5–8 decision fields, latest observation, next planification, and the SAME quick actions as the row ⋯ menu; "deeper detail one interaction away" = "Ouvrir le dossier" button + Enter. ↑/↓ retargets the panel without closing (S5, S8). Esc closes. Width 480–560px standard, resizable if cheap (S5, S18). Read-mostly first; inline-editing statut/observation from the panel is a v2 (Twenty proves the trajectory, S18).
3. **Preview must be instant**: render from the already-loaded row/list data + cached dossier doc; skeleton only for the below-the-fold sections (S12; tables.md A20 timing ladder).
4. **Keyboard spine on the list**: j/k or ↑/↓ row focus (visible focus row), Space peek, Enter open, E open-in-permanent-tab (or reuse existing shortcut), X select + Shift-range for Rappeler mode, Esc dismiss (S8, S9, S22). Show shortcuts inside the ⋯ context menu as the teaching surface (S11).
5. **Next/Prev dossier inside the detail page** (S4, S22): chevrons + keyboard (e.g., Alt+J/K or [ ]) iterating the *current filtered list order*, so even committed-tab workflows stop round-tripping. Requires passing the active view's ordered id-list (or query cursor) to the detail route.
6. **Preview-tab semantics for the existing VS-Code-style tabs** (S23): peek/single-click never mints a permanent tab; editing or explicit "ouvrir dans un onglet" does. Prevents tab explosion that would otherwise follow from cheap previews.
7. **No table↔kanban switcher** (Q5). Saved views already cover multi-view value. Revisit kanban only if a supervisor-persona pipeline-overview mission is later confirmed.
8. **Rappeler stays a mode; consider the same chassis for future queue-verdict workflows** (accept/relaunch flows) with single-key verdicts à la Linear Triage 1/2/3 (S10) — but only when a real verdict-queue mission exists.
9. **Command palette (Cmd/Ctrl+K)** as cross-cutting navigation: go-to-dossier by réf, switch saved view, run row actions on focus/selection (S15, S24, S31). Complements, does not replace, the visible UI.
10. **Full detail page remains the committed workspace** — no product studied deleted it (S19 Attio keeps record pages; Twenty keeps record pages alongside the panel). The split-view-as-primary layout (Zendesk-style, compact list left + full working dossier right) is the one structural fork that would *replace* rather than augment; it trades away wide-table scanning and is only justified if observation shows gestionnaires spend most of their day inside dossiers with constant list switching, not scanning. That is an owner call, ideally after the cheaper peek ships and usage is observed.

### Honest limitations
- No controlled study comparing preview-pane vs full-page navigation for task throughput was found (email reading-pane evidence is convention-grade, S17; Mursa's numbers are one practitioner's self-logging, S25).
- Reddit input: ABSENT (blocked). GitHub hovercards and Notion's side-peek default: TRAINING, unfetched. Jira/Height: not usable-quality sources found; excluded from conclusions.
- Zendesk split view was (at fetch time) a closed EAP — vendor conviction, not yet vendor-proven-at-scale.
- Airtable and Attio claims partially rest on SEARCH-SNIPPET text as marked.
