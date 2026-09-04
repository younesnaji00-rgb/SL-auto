# Assignations au chiffrage — Queue → Detail → Editor Structure. Deep Research Report

Date: 2026-09-03. Researcher: UX-research subagent (Claude).
Scope: the chiffrage work-queue page (table of costing assignments under a 24h business-hours SLA), its full-page detail (observations + document slot cards + Éditer deep links), the split-screen devis editor, and the browser-tab-style workspace strip. Users: chiffreurs processing N items/day; gestionnaires/admins supervising.

Source policy honored: theory and practitioner sources only, no GOV.UK/Stripe/Material/Polaris/Carbon. Builds ON TOP of `docs/research/tables.md` (in-table patterns: default sort = action-needed, row = one-click, no pagination ≤100, emphasis budget — NOT re-researched) and `docs/research/dossiers-structure-navigation.md` (master-detail evidence: Linear peek S8, Zendesk split view S14, VS Code preview tabs S23, Superhuman palette S15, drawer triage loop S5, Map-UI next/prev S4, Airtable Space S22 — cited below as `[dossiers SXX]`, not re-fetched). New fetches this report: 16 pages, logged in §2 with status.

---

## 1. Executive summary of recommendations

1. **Keep the table-first master view** for the queue. The queue's daily question is "what do I do now, in what order" — a priority/deadline-driven list, the textbook table case (comparison + sort on SLA/status/chiffreur). No fetched source argues for boards/cards here. [strong evidence — tables.md Q1 + dossiers Q1 + §3.1]
2. **Keep full-page navigation on row click** — but only because the chiffrage detail is a *working* surface, not a lookup. Cooper's posture theory: a surface where a chiffreur spends 10–40 minutes editing devis lines is a **sovereign** workspace and deserves the whole screen; peeks/drawers are for **transient** looks. Do not move the working detail into a drawer. [strong evidence — §3.2]
3. **Kill the return-to-list round trip, not the full page.** The measured bottleneck in processing N items is the list↔item bounce, not the item view itself. Add: « Suivant » / « Précédent » in the detail header iterating the queue's filtered order, and **opt-in auto-advance** — completing an item opens the next one directly (Gmail auto-advance / Zendesk Play submit-and-next), with a « Rester sur le dossier » escape. [strong evidence — §3.3]
4. **Add a « Mode traitement » (Play mode)** as the flagship queue feature: enter the queue in deadline order, one item at a time, Terminer → next, Passer (skip) with optional reason, progress « 3 / 17 », wrap at end, inbox-zero end state. Optionally admin-enforceable order to prevent cherry-picking — this is a *sellable supervision feature*, directly modeled on Zendesk's Enterprise Guided mode. [strong evidence for the pattern; judgement on fit — §3.3, §4]
5. **Add a peek panel (Espace / row focus) for the supervision persona**, read-mostly: identity, deadline, observations, document-slot statuses, assigned chiffreur — gestionnaires scan many chiffrages without ever needing the editor. Same two-tier model as /dossiers (peek = transient, page = sovereign). [converging opinion — dossiers S5/S8/S22 + §3.2]
6. **Default sort = deadline ascending (time-to-breach), with optional urgency banding** (« En retard », « < 4 h », « Aujourd'hui », « Demain+ ») as collapsible groups. Grouping turns SLA state into spatial structure; sorting alone already satisfies the "action-needed first" rule from tables.md. Banding is the premium upgrade, not the prerequisite. [converging opinion — §3.6]
7. **Keyboard spine + palette**: j/k or ↑/↓ row focus, Espace peek, Entrée open, Ctrl+K palette; shortcuts displayed inside menus as the teaching surface. KLM math: every mouse round trip costs ~H(0.4s)+P(1.1s)+M(1.35s) vs ~0.2s per keystroke — for a 30-items/day user this compounds into minutes daily. [strong evidence for theory; converging opinion for the pattern — §3.4]
8. **Row click: keep whole-row navigation but back it with a real link** in the identifier cell (réf as `<a>`), keep « Éditer » explicit on slot cards. Whole-row-only click is an a11y and text-selection hazard; link-in-cell + JS row-click is the documented compromise. [converging opinion — §3.5]
9. **Workspace tabs: adopt preview-tab semantics and treat the queue, not the tab strip, as the to-do memory.** Tab research shows tabs become an anxiety-driven external memory ("black hole effect"); the queue table already IS the durable reminder list, so tabs should hold only work-in-progress editing sessions: peek never mints a tab, editing does, sessions restore after reload. [strong evidence for the risk; judgement on the rule — §3.7]
10. **Presence/collision indicators** (eye icon in queue rows, avatars on the detail) once two roles can touch the same chiffrage — cheap, and it demos extremely well. [converging opinion — §3.8]
11. **In the split-screen editor, mirror the source document.** Smith & Mosier's transcription guideline: the line-item table should match the PDF devis in item ordering and grouping; minimize cursor actions between fields; keystroke-level feedback. [strong evidence — §3.9]

---

## 2. Source log (new fetches)

Legend: FETCHED (direct) / FETCHED-PROXY (via r.jina.ai) / SEARCH-SNIPPET / FAILED.

- **N1. Zendesk Help — "Using Play mode to quickly work through tickets"** — FETCHED. `https://support.zendesk.com/hc/en-us/articles/9186492658714`
- **N2. Zendesk blog — "Play nicely in the ticket queue using the Play button or Guided mode"** — FETCHED. `https://www.zendesk.com/blog/customer-service/support/play-button/`
- **N3. Sarrafzadeh et al., "Exploring Email Triage: Challenges and Opportunities" (CHIIR 2019, Microsoft Research)** — FETCHED-PROXY (PDF parsed via r.jina.ai). `https://www.microsoft.com/en-us/research/wp-content/uploads/2019/02/Email_Triage_CHIIR19.pdf`
- **N4. Cooper, About Face 2.0 — "Postures for the Desktop" (flylib mirror)** — FETCHED. `https://flylib.com/books/en/2.153.1.43/1/`
- **N5. Denton Bishop — "Application Posture" (UX Planet)** — FETCHED-PROXY. `https://uxplanet.org/application-posture-d896bceda537`
- **N6. CMU HCII news — "Overcoming Tab Overload"** (secondhand for the CHI 2021 paper "When the Tab Comes Due", Chang/Kittur et al., which itself was 403) — FETCHED. `https://www.hcii.cmu.edu/news/overcoming-tab-overload`
- **N7. Gloria Mark et al., "The Cost of Interrupted Work: More Speed and Stress" (CHI 2008)** — FETCHED-PROXY. `https://ics.uci.edu/~gmark/chi08-mark.pdf`
- **N8. MTU CS4760 lecture — "Goals, Operators, Methods, Selection (GOMS)" (KLM operator times)** — FETCHED. `https://cs4760.csl.mtu.edu/2026/lectures/goals-operators-methods-selection-goms/`
- **N9. Supportbench — "How do you design a support queue strategy (triage, routing, and ownership rules)?"** — FETCHED. `https://www.supportbench.com/support-queue-strategy-triage-routing-ownership/`
- **N10. cmdk.email — "Gmail Auto-Advance: Go Straight to the Next Email Instead of the Inbox"** — FETCHED. `https://cmdk.email/post/gmail-auto-advance/`
- **N11. NN/g — "The Anatomy of a List Entry"** — FETCHED. `https://www.nngroup.com/articles/list-entries/`
- **N12. tempertemper — "Clickable table rows are a bad idea"** — FETCHED. `https://www.tempertemper.net/blog/clickable-table-rows-are-a-bad-idea`
- **N13. Robert Cooper — "How to make a table row a link"** — FETCHED. `https://robertcooper.me/post/table-row-links`
- **N14. Smith & Mosier, Guidelines for Designing User Interface Software §1 Data Entry (hcibib.org)** — FETCHED. `https://hcibib.org/sam/1.html`
- **N15. Zendesk Help — "Avoiding agent collision"** — FETCHED. `https://support.zendesk.com/hc/en-us/articles/9186264597146`
- **N16. Eleken — "Table Design UX Guide"** — FETCHED. `https://www.eleken.co/blog-posts/table-design-ux`
- SEARCH-SNIPPET corpora (flagged where used): Whittaker & Sidner 1996 "email overload" + Fisher et al. 2006 revisit (abstracts only); SLA-timer vendor pages (HappyFox/Fluent/InvGate — pre-breach alerts at "25%, 75%, and 90% of SLA time used"); Gmail auto-advance how-tos; collision-detection vendor pages (Freshdesk eye icon, Zoho red-glow bubble); KLM overviews.

---

## 3. Findings by question

### 3.1 Is a table-first master view right for a chiffrage queue?

Yes. The generic case is already settled in `tables.md` (comparison + sort + filter = table) and `dossiers-structure-navigation.md` Q1. What is *new* for chiffrage is that this queue is closer to a helpdesk view than to a browse table: bounded (one chiffreur's daily assignments), SLA-driven, and processed to completion. Queue-design practice puts deadline pressure at the center of ordering: "Prioritize tickets nearing SLA deadlines over creation date" (N9), and SLA tooling ships pre-breach alert milestones ("set up alerts at key milestones – 25%, 75%, and 90% of SLA time used" — SEARCH-SNIPPET, HappyFox/Fluent corpus). The existing 24h deadline meter column is therefore the *right* centerpiece — the structural question is only whether the ordering follows it by default (§3.6).

Each row is also the scent that decides "open or not": "too much will overload users…, too little will make them pogo stick" (N11). NN/g's list-entry guidance transfers directly: consistent placement per attribute because users "look from one list entry to another and back again — comparing similar information across different entries," emphasis on 1–2 key attributes only, and "Showing unique indicators for more than 2–3 situations can make the listing page cluttered" (N11) — a caution for a row that currently carries status + nature + observations count + deadline meter simultaneously.

### 3.2 Full-page navigation vs split master-detail vs peek — posture theory decides

Cooper's posture framework (N4, N5) is the cleanest lens the owner asked for:

- **Sovereign**: "Programs that are best used full-screen, monopolizing the user's attention for long periods of time" (N4); "Users of sovereign applications are perpetual intermediates" — optimize for the daily intermediate user, "conservative visual style," "can exploit rich input" (keyboard, accelerators) (N4).
- **Transient**: "needed intermittently for short periods of time usually presenting a single function" — "Purpose and scope must be clear," bold explicit controls (N5).

The chiffrage detail + devis editor is unambiguously sovereign: a chiffreur lives in it for long stretches, and the editor is *already* a split screen (PDF left, line items right). That yields two structural conclusions:

1. **Full-page on row click is correct for the processing persona.** A Zendesk-style persistent list pane (dossiers S14) would nest a master list beside an interface that already needs both halves of the screen — the split-view trade ("Demands larger display area", dossiers S3) is unpayable here. The list's job during processing is better done by « Suivant »/auto-advance (§3.3) than by staying visible.
2. **A peek is still worth adding — for the transient missions**: a gestionnaire checking "où en est ce chiffrage ?", a chiffreur deciding what to open next, anyone reading the latest observation. That's the two-tier meta-pattern every studied product converged on (dossiers Q3: "ephemeral look" vs "committed workspace"): Espace/click = peek panel showing identity, deadline meter, observations, slot-card statuses; Entrée/« Ouvrir » = full page. The drawer triage loop is documented: "click a row in a table → drawer opens with full detail. User navigates rows with arrow keys → drawer updates in place… This eliminates page transitions during rapid item review" (dossiers S5).
3. **Expandable rows** remain the weakest option for this content (multi-section detail): they "diminish content visibility and increase interaction cost" (dossiers S7), and Eleken's own caveat applies — "If most users need that extra info regularly, don't hide it behind an expand" (N16). Rejected as the primary mechanism.

### 3.3 Queue processing: what makes doing N items/day fast

**(a) The bounce is the bottleneck.** "the slow part of triaging email is not reading or deciding. It is the constant context switch between a single message and the full list" (N10). Auto-advance's fix: "You stay in 'reading one message' mode and just keep flowing forward: read, clear, read, clear," and "Many people find it is the single change that makes a real dent in how long the inbox takes each day" (N10). Zendesk productized exactly this for queues: after Submit "the system automatically moves to the next available ticket," with an explicit « Stay on ticket » override, and "When all tickets in a view are processed, the list wraps back to the top" (N1).

**(b) Choosing the next item is itself a cost — and a bias.** "Using the Play button allows agents to spend their mental energy on solving tickets rather than combing through the queue," and "Play mode prevents agents from cherry-picking the easiest tickets or the types of tickets they like handling best" (N2). Next-item selection rule worth copying verbatim: "The next available ticket is the next ticket in the view according to the view's sort order… that you haven't already skipped and that no other agent is currently viewing" (N1). Guided mode adds enforcement: admins "may require agents to enter a reason for skipping the ticket" (N1) — for SL-auto this maps to a gestionnaire-configurable « ordre imposé » with « Passer (motif requis) ».

**(c) Interruption/context-switch science backs the flow design.** Interrupted workers finish but pay: "people in the interrupted conditions experienced a higher workload, more stress, higher frustration, more time pressure, and effort" (N7) — and both same-context and different-context interruptions disrupted equally (N7). A processing mode that removes the between-item navigation removes N-1 self-interruptions per session.

**(d) Triage is multi-pass and deferral-heavy — support both.** The CHIIR study: 48% triage sequentially vs 41% by priority; 51% use multiple passes — "in my first pass I try to get rid of things that don't require a response…; second pass is everything that does require a response" (N3). Deferral is universal: "75% of respondents defer at least one email daily; 44% defer five or more," and "Over 75% of deferred emails required fewer than 30 minutes to handle" (N3). Effort, not importance, drives immediate handling: 87.7% handle immediately when they "know the answer" (N3). Transfer: a chiffreur's natural first pass is knocking out the quick accords/small devis, then the heavy ones. The queue should make a two-pass strategy legal and visible — a « Reporter » (defer/snooze) action with a *reason-state* (e.g. « En attente de pièces ») that visually parks the row without hiding the deadline, plus an effort cue in the row (e.g. line count / document count) so the quick-wins pass is possible without opening items. The 2006 revisit of Whittaker & Sidner (SEARCH-SNIPPET only) found archives grew 10× while inboxes stayed constant — people keep working sets small; the queue view should show *only* the working set by default.

**(e) Done-feedback and the end state.** Inbox-zero theory (Merlin Mann): the zero is attention, not count — the design goal is that a completed item visibly leaves the working set, momentum is felt (progress « 3 / 17 » in Mode traitement), and an earned empty state closes the loop ("A reassuring 'Inbox zero — nice work' is delightful after the user archives their last ticket" — intuitive-crud §25). *Honesty note: 43folders.com itself could not be fetched (cert expired, origin 503); the attention-not-count framing comes from SEARCH-SNIPPET summaries of Mann's series and is flagged as such.*

### 3.4 Keyboard-first: the theory of why it pays

KLM (Card/Moran/Newell) prices the physical acts: K keystroke ≈ 0.2s, P pointing ≈ 1.1s, H homing hand between keyboard and mouse ≈ 0.4s, M mental preparation ≈ 1.35s; "The total time to perform a sequence of gestures is the sum of the individual gestures" (N8). A mouse "open next row" is H+M+P+K ≈ 3.0s; a j+Entrée is ≈ 2 keystrokes with the M deleted once the sequence is habitual (rule: "Delete M if a gesture is fully anticipated by the preceding action", N8). At 30–80 such micro-navigations/day per chiffreur the delta is minutes/day — and the KLM caveat cuts the right way here: "the predictions are only valid for expert users" (SEARCH-SNIPPET, usabilitybok corpus), which is exactly Cooper's "perpetual intermediates" of a sovereign app (N4). The compounding argument is the same one Linear states: "The seconds add up when you're taking the action multiple times" (dossiers S11).

Discoverability is solved by progressive disclosure, not documentation: shortcuts printed beside actions in context menus (dossiers S11) and a Ctrl+K palette as "the one place where users can find every command" (dossiers S15) — the palette serves novices (recognition over recall) while single keys serve experts. Conventions to reuse, not invent: ↑/↓ or J/K move focus, Espace peek, Entrée open, Échap close, X select (dossiers S8/S9/S22), single-digit verdict keys only inside a dedicated queue mode (Linear Triage: Accept `1`, decline `3`, snooze `H` — dossiers S10).

### 3.5 Row-click ambiguity

The case against whole-row-as-button is concrete (N12): the row-button "is in danger of not having a label that describes its purpose"; selecting text to copy it (a plate, a réf) "risk[s] triggering the row's action"; speech-recognition users can't target it; tremor-prone users mis-fire. The case for it is target size and habit: "it can be very convenient to be able to click anywhere on a table row" (N13). The documented compromise (N13, matching tables.md A8's "avoid ambiguous row links"): put a **real link on the identifier cell** (réf dossier as `<a>` — middle-click/ctrl-click into the tab strip works, URL preview works), add JS whole-row click as a convenience on top, and never make the row the *only* path. Inside the detail page the same logic keeps « Éditer » as an explicit labeled button on each slot card — an edit that opens a work session should never be a side effect of an ambiguous click. Peek (Espace / single click) vs open (Entrée / double click / link) mirrors VS Code's ephemeral-vs-committed semantics (dossiers S23).

### 3.6 Grouping vs sorting vs filtering; SLA banding

- Sorting is the floor: default sort by time-to-breach ascending satisfies tables.md's "entries most needing action" rule with zero new UI.
- Grouping earns its place when the *category itself* is the decision: "In place of an endless list, think about ways to chunk the information… with collapsible sections" (N16); UX Movement's grouping rationale (tables.md A12) and Baymard's "grouping related attributes… made it easier to focus" (tables.md A17) point the same way. Urgency bands (« En retard » / « Échéance < 4 h » / « Aujourd'hui » / « Demain et + ») convert the deadline meter from per-row arithmetic into spatial position — the SLA milestone thresholds vendors alert on (25/75/90% of SLA consumed — SEARCH-SNIPPET) are the natural band edges. Cost: grouping breaks cross-group sorting and adds section chrome; keep bands collapsible and skippable (a plain-sort toggle).
- Filtering serves the supervisor: gestionnaires group/filter by **chiffreur** (workload view) or **compagnie**; a chiffreur's own queue rarely needs filters at all — it's already scoped. Per Notion's saved-view rule, each extra view must answer "a *different recurring question*" (dossiers S20): « Ma file » (deadline order), « Par chiffreur » (supervision), « En attente de pièces » (parked) is the honest set.

### 3.7 The workspace tab strip: tabs-as-workspace theory

The CHI 2021 tab research (via N6; paper itself unfetchable) explains both why the strip is loved and how it rots: people keep tabs "using them as reminders or fearing they would have to search for the information again"; "People feared that as soon as something went out of sight, it was gone… Fear of this black hole effect was so strong that it compelled people to keep tabs open" (Kittur, N6); yet "despite people using tabs as an external form of memory, they do not capture the rich structure of their thoughts" (N6), and the researchers' conclusion is that "new interfaces and interactions that can merge tab management and task management in a browser will become increasingly important" (Chang, N6).

Transfer — three rules for the chiffrage tab strip:
1. **The queue is the task list; tabs are only WIP.** The black-hole fear disappears when closing a tab provably loses nothing: the item is still in the queue with its deadline meter. Say it in the UI (closing a tab of a non-terminated chiffrage needs no warning unless the editor holds unsaved lines).
2. **Preview-tab semantics** (dossiers S23): peek and single-click reuse one ephemeral slot; only editing (« Éditer » on a slot card) or explicit open mints a persistent tab. This is the structural fix for tab explosion — cheap looks must not accumulate chrome.
3. **Session restoration**: a sovereign app's tabs must survive reload/crash (the strip is the workspace's memory of in-flight editing sessions, and the rappel-draft/crash-draft infrastructure already exists in this app). Restore the tab set and the active tab.

### 3.8 Multi-user awareness: presence, collision, supervision

Zendesk's collision model (N15) is the reference: "In views, an eye icon appears next to tickets that are being viewed by another agent"; on the ticket, avatar states encode depth of engagement — "Agents outlined in blue are editing the ticket" vs merely viewing vs navigated-away (dimmed) — because "This makes it easier to avoid potentially conflicting updates" (N15). Play mode already consumes presence: the next item skips tickets "no other agent is currently viewing" (N1). Vendor corpus agrees this is table-stakes for shared queues (Freshdesk eye icon, Zoho's red-glowing counter bubble — SEARCH-SNIPPET). For SL-auto: an eye icon on queue rows + viewer avatars on the detail header the moment gestionnaire-and-chiffreur co-access is possible; it also gives supervisors ambient "who is working on what" without a report.

On assignment itself, queue-strategy practice warns against hero-loading: "Put too much work on a few 'heroes' and you burn them out while others sit underutilized" (N9), with "workload caps" among the mechanisms (N9) — evidence for a per-chiffreur load count surfaced at assignment time.

### 3.9 The split-screen editor (transcription task)

The editor is a transcription/verification task, which has 40-year-old empirical guidance (N14, Smith & Mosier): "When data entry involves transcription from source documents, ensure that form-filling displays match (or are compatible with) those documents, in terms of item ordering, data grouping, etc." (1.4/25); "minimize user actions required for cursor movement from one field to the next" (1.4/26 — Tab order follows the PDF's line order, Entrée commits a line and focuses the next); "Ensure that a user need enter any particular data only once" (1.0/1 — AI-prefilled lines from the scanned PDF are this rule automated); "Provide displayed feedback for all user actions during data entry" and acknowledge completion "with a confirmation message… or else with an error message" (1.0/3, 1.0/12). Sovereign-posture styling applies at full strength here: conservative palette, dense, keyboard-rich (N4).

---

## 4. Structural options for queue → detail → editor

**Option A — « File + colonne vertébrale » (recommended base).** Keep table master + full-page detail + split editor. Add: deadline-ascending default sort; « Suivant / Précédent » in the detail header iterating the current filtered queue order (dossiers S4: next/prev "reduce the need to toggle back and forth"); opt-in auto-advance on « Terminer » with « Rester sur le dossier » escape (N1, N10); peek panel on Espace/click with ↑/↓ retargeting (dossiers S5/S8); identifier-cell real link + JS row click (N13); j/k + Ctrl+K palette; preview-tab semantics on the strip (§3.7).
*Pros*: every piece is evidence-backed and additive; no surface is demolished; sovereign editor keeps full width. *Cons*: many small pieces; auto-advance needs the ordered id-list plumbed into the detail route.

**Option B — Split master-detail (Zendesk-style persistent list pane).** Compact queue list left, chiffrage right.
*Pros*: zero list↔item cost, strongest for pure supervision/monitoring (dossiers S3/S14). *Cons*: the working surface is itself a split (PDF + lines) — a third pane starves all of them; forfeits the wide table's SLA scanning; duplicates what « Suivant »/auto-advance achieves for the processing persona at no width cost. **Rejected as primary**; the peek panel of Option A is its transient-mission substitute.

**Option C — « Mode traitement » overlay (Play/Guided mode), layered on A.** A distinct entered mode (big « Traiter ma file » button): opens item 1 in deadline order full-screen, chrome reduced to progress « 3 / 17 » + deadline meter + « Terminer ✓ » / « Passer » / « Reporter » / « Quitter le mode »; Terminer auto-advances; skip requires a motif when the gestionnaire enables enforced order (N1, N2); items being viewed by someone else are skipped (N1); wrap at end → earned empty state. Single-key verdicts live only here (Linear Triage precedent, dossiers S10).
*Pros*: the differentiator — it operationalizes anti-cherry-picking and mental-energy theory (N2), demos superbly, and is a separate mode so the default view stays calm (dossiers Q1 lesson: "spawn modes"). *Cons*: needs presence + skip bookkeeping; enforcement is an org-policy feature that must stay optional per deployment.

**Recommendation: A + C.** A is the structural correction; C is the productized, sellable layer on top of A's plumbing (they share the ordered-queue iterator).

---

## 5. Feature shortlist for a best-in-class, sellable product (impact / effort)

1. **« Suivant / Précédent » + auto-advance opt-in** — impact ★★★★★ / effort S–M. The single highest-leverage change (N1, N10); prerequisite plumbing for everything below.
2. **« Mode traitement » (Play mode) with progress + skip-with-reason + enforced-order toggle** — impact ★★★★★ (demo/sales headline) / effort M. (N1, N2, dossiers S10.)
3. **Deadline-ascending default sort + urgency bands (collapsible, optional)** — impact ★★★★ / effort S. (§3.6.)
4. **Peek panel (Espace) with ↑/↓ retarget** — impact ★★★★ (supervision persona) / effort M. (dossiers S5/S8/S22.)
5. **Presence/collision: eye icon in queue + viewer avatars on detail** — impact ★★★ (trust + demo) / effort M; also feeds Mode traitement's skip rule. (N15, N1.)
6. **Keyboard spine + Ctrl+K palette with shortcuts shown in menus** — impact ★★★ / effort M (cmdk is commodity — dossiers S24). (N8, dossiers S11/S15.)
7. **« Reporter / En attente de pièces » deferral state with visible parked section** — impact ★★★ (matches measured 75%-defer-daily behavior, N3) / effort S–M.
8. **Tab hygiene: preview tabs + session restore + no-warning close for queue-backed items** — impact ★★★ / effort M. (N6, dossiers S23.)
9. **Charge par chiffreur at assignment time (load-balancing hint)** — impact ★★ (admin persona, sales story) / effort S. (N9.)
10. **Saved views (« Ma file », « Par chiffreur », « En attente »)** — impact ★★ / effort S — only these three; each answers a distinct recurring question (dossiers S20). Skip: kanban switcher (dossiers Q5), bulk actions on the chiffreur queue (no real batch verb exists — tables.md Q3 YAGNI rule), dashboard-first entry.
11. **Effort cue in the row (nb. documents / lignes)** — impact ★★ (enables the legitimate quick-wins pass, N3) / effort S — budget-check against N11's 2–3 indicator cap before adding.

---

## 6. Honest unfetched / secondhand / training-knowledge list

- **"When the Tab Comes Due" (CHI 2021)**: ACM full text 403 (direct + proxy), author mirror joe.cat DNS-dead, web.archive.org blocked by the fetch tool. All quotes are secondhand via the CMU HCII news article (N6, fetched) — researcher quotes, not paper text.
- **Merlin Mann / 43folders**: direct fetch failed (TLS cert expired), proxy reached a Drupal 503. Inbox-zero framing rests on SEARCH-SNIPPET summaries only, flagged in §3.3(e).
- **Whittaker & Sidner 1996 and Fisher et al. 2006 revisit**: abstracts/snippets only (academia.edu/ResearchGate not fetched). Used only for the working-set observation, flagged.
- **usabilitybok.org KLM page**: 403; operator times instead verified via the fetched MTU lecture (N8). The "expert users only" KLM caveat is from the search corpus.
- **SLA milestone thresholds (25/75/90%) and collision-vendor details (Freshdesk/Zoho)**: vendor-marketing SEARCH-SNIPPET grade, used as convention evidence only.
- **Reddit**: attempted once this session (old.reddit.com search via r.jina.ai) → 403 network-policy block, consistent with prior reports. Reddit input is ABSENT from this report.
- **About Face**: quotes are from the flylib mirror of the 2.0 edition (N4) and a practitioner summary (N5), not the current 4th edition; posture taxonomy is stable across editions (training knowledge, flagged).
- **Linear, Superhuman, Zendesk split view, VS Code, Airtable, drawer-loop, Map-UI next/prev, Notion views, cmdk**: cited from `docs/research/dossiers-structure-navigation.md` (fetched there on 2026-09-03), not re-fetched here.
- No controlled study comparing auto-advance vs manual re-selection throughput was found; the auto-advance case rests on converging practitioner/product evidence (N1, N2, N10) plus interruption theory (N7).
