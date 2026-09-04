# Navigation, efficiency tools & feature ideas for "Missions terrain" (/assignations-atg)

Research date: 2026-09-03. Every claim below is tied to a URL that was actually fetched with WebFetch unless explicitly marked *(search snippet only)* or *(training knowledge)*.

## Findings

### A. What real dispatch/FSM products put ON the queue screen

**1. ServiceTitan dispatch board** — https://www.servicetitan.com/features/dispatch-software (fetched)
On-board tools: drag-and-drop tech-to-job matching ("respond to scheduling curveballs... with a simple drag-and-drop"), real-time technician GPS tracking, embedded map ("Map 2.0 gives you the route information you need"), two-way SMS from the board ("send and receive SMS texts" with techs AND customers), Adjustable Capacity Planning (workload allocation per team), route optimization recommendations, automated job-confirmation processing from customer texts, real-time alerts. The pitch is explicitly that dispatchers do "most of their work order management tasks without needing to leave the board."

**2. Salesforce Field Service dispatcher console** — https://trailhead.salesforce.com/content/learn/modules/field-service-dispatcher-console-for-dispatchers/explore-the-dispatcher-console (fetched)
Canonical enterprise layout: left panel = appointment list where dispatchers "filter, sort, and search within the list, and perform actions on selected appointments" (bulk schedule / dispatch / flag / optimize). Right panel = Gantt with a **KPI bar** showing "stats like total scheduled time, average travel time per appointment, and the number of appointments that are in jeopardy." Embedded Google traffic map shows "mobile workers on their daily routes" and territories "as multicolored polygons." Supports keyboard shortcuts in the Gantt. → Evidence that a *summary/KPI strip with a "jeopardy" (at-risk) count* is a first-class pattern in the market leader, and that multi-select bulk actions live on the queue, not the detail page.

**3. Jobber scheduling** — https://getjobber.com/features/scheduling/ (fetched)
Day/week/month view switching, drag-and-drop rescheduling, color coding + filters, automatic route generation for crews ("daily or weekly"), "Map & Routing" view of all visits, real-time team alerts for new assignments/reschedules/cancellations, "Find a Time" suggesting slots based on availability + drive time, live vehicle GPS. Jobber is the SMB benchmark — its board is simpler than ServiceTitan's but still ships: map view, route optimization, drag-drop, and push notifications on assignment.

**4. ServiceM8 feature overview** — https://www.servicem8.com/us/feature-overview (fetched)
Staff map ("Visually see where your staff are in real time"), automated on-the-way SMS ("Automatically SMS clients to notify them you're on the way to the job, with an estimated time of arrival"), job checklists ("ensure jobs are done right the first time"), custom forms ("inspection reports, certificates of compliance"), signature capture ("Record proof that your customer is happy to proceed"), in-app photo/video saved to the job, **offline mode** ("Field staff can access all job information without internet connectivity, and any updates will automatically sync"), 2-tap navigation ("Get directions to the job site in two taps").

**5. Housecall Pro** — https://www.housecallpro.com/features/dispatch/ (fetched; page thin)
Confirms "Real-time fleet tracking," a "Customer Contact / Keep customers up to date" feature and a footer-level "On My Way Texts" product. Weak page but corroborates on-my-way texts as a named, marketed SMB feature.

**6. Operator's guide to dispatch process (FieldProMax)** — https://www.fieldpromax.com/blog/perfect-dispatch-process-in-field-service (fetched)
Practitioner-voiced pain data: dispatchers in an 8-tech shop "burn roughly 15 hours per week wrangling manual schedules: phone-tagging techs, updating paper calendars, handling last-minute reroutes." The #1 predictor of rollout success: "If the techs do not update jobs from the truck, the dispatcher is back to phone-tagging by Wednesday" (and "the board is fiction by Friday"). Highest-leverage process steps: build tomorrow's board tonight (saves 30–60 min/tech), lock the morning board by 7 a.m., tighten arrival windows to two hours **with automated texts** (one shop cut ETA complaints to a third), online booking. Benchmarks: technician idle time up to 40%, median first-time-fix 77%. Explicitly says small shops ask for workflow automation over "flashy" board features.

### B. Keyboard & speed

**7. Superhuman: how to build a remarkable command palette** — https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/ (fetched)
Command palettes solve three problems: feature capacity without UI clutter, discovery by search-by-intent instead of menu spelunking, and staying on the keyboard. Crucially for a mixed-skill base: "users can simply type what they want to do" and "learn the shortcut for next time" — the palette is the *teaching mechanism* for shortcuts, so novices are never blocked. Recommends aliases (alternate terms) so terminology doesn't gate discovery, and per-command icons.

**8. Retool: designing the command palette** — https://retool.com/blog/designing-the-command-palette (fetched)
Directly addresses mixed skill levels: casual users wanted to click/browse after selection, power users wanted uninterrupted keyboard flow — Retool served both from ONE palette (enter twice for the casual path). Hybrid content-search + action-execution in one box beat VSCode-style bifurcated modes because in practice users don't distinguish "find" from "do." Categorized results + a "Top result" slot preserve relevance.

**9. Linear keyboard model** *(search snippets only — fastshortcuts.com/shortcuts/linear/, ideaplan.io comparison; not fully fetched)*: Linear's public model is Cmd+K for everything, single-key actions (C = create from anywhere), G-chords for navigation, sub-50ms handling, "every common action reachable in two keystrokes or fewer." *(Training knowledge, flagged: Linear also supports j/k or arrow row-traversal with a selection cursor and one-key actions on the focused row; vim j/k lineage comes via Gmail/Superhuman.)*

**10. Superhuman speed philosophy** *(search snippet from blakecrosley.com/guides/design/superhuman + Superhuman help center)*: keyboard-first as the core speed thesis; sub-100ms perceived-responsiveness threshold, 50ms target. Not independently fetched — treat as secondary corroboration.

### C. In-row quick actions, tap targets, glove/outdoor use

**11. NN/g touch targets** — https://www.nngroup.com/articles/touch-target-size/ (fetched)
Minimum 1cm × 1cm targets; "the fat fingers are not the real culprit; the blame should lie on the tiny targets." Small targets = slower taps (Fitts) + accidental taps ("targets must first be big enough, and then also spaced well enough"). **Oversize when the user is in motion**: "if an app is to be used when the user is moving, targets will be harder to hit and thus should be bigger" — Target's in-store app uses ~2cm × 2cm buttons. Directly applicable to an agent standing in a garage lot.

**12. Ruggedized field-app UX (Corvus)** — https://corvusintell.com/blog/field-apps/ruggedized-ux-military-operators/ (fetched)
Extreme-context numbers that bound the "outdoor appraiser" case: gloved minimum touch target 44px, "48–56px is more reliably operated"; consumer screens (400–600 nits) unreadable in direct sun → "Target WCAG AAA (7:1 contrast) for primary status indicators"; one-handed thumb zone = bottom 60% of a 5.5" screen, so "critical interactive controls... in the bottom half of the screen – ideally the bottom 40%," bottom nav bars over top bars; critical functions "within three taps from the application's home state" or field users revert to the phone/radio. Confirmations reserved for "irreversible, high-consequence actions" only.

**13. Bulk actions UX (Eleken)** — https://www.eleken.co/blog-posts/bulk-actions-ux (fetched)
Checkboxes are "the clearest way to signify that users can select more than one item"; 24×24px desktop / 44×44px touch minimums; prefer undo toast over confirmation dialogs ("After the user commits a bulk action, immediately offer a way to revert it"); multi-level feedback (immediate, result summary, inline error context); "Users... won't forgive silent errors or lost data."

**14. Pencil & Paper enterprise data tables** *(search snippet only; article at pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)*: row actions afforded on hover, keep density manageable, bulk actions via checkbox + contextual action bar. Corroborates 11/13; not independently fetched.

### D. Summary/triage strip evidence

**15. Pencil & Paper dashboard UX patterns** — https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards (fetched)
Operational/monitoring dashboards exist "to alert people to problems and anomalies"; surface "the key stuff they can take action on, and any warnings they should quickly be made aware of"; provide "an at-a-glance snapshot" so users don't "check 10,000 screens just to 'know what's up'." Warns against "the data eyeball attack" (density noise) — show less by default; use color as exception signal (red/yellow/green + non-color cue). Combined with Salesforce's KPI bar (#2: scheduled time / travel time / **jeopardy count**), the evidence says: a short strip of 3–4 *actionable* counts is the market pattern; a vanity-metric strip is the anti-pattern.

### E. Zero-training onboarding / affordance

**16. NN/g empty states** — https://www.nngroup.com/articles/empty-state-interface-design/ (fetched)
Three rules: (1) communicate status ("There are no records to display for the selected date range" — verbatim relevant to a filtered dispatch queue!); (2) contextual learning cues ("Star your favorites to list them here" pattern) teach features "without intrusive tutorials"; (3) "provide direct pathways (i.e., links) to getting started with key tasks." "Intentionally designed empty states can help increase user confidence, improve system learnability, and help users get started with key tasks." → the zero-training path is contextual teaching at the moment of emptiness, not tour overlays. *(Training knowledge, flagged: NN/g and others have separately documented that forced product tours are skipped and poorly retained; I did not fetch that article.)*

### F. Appraisal-specific market features (what competitors advertise)

**17. Snapsheet appraisals** — https://www.snapsheetclaims.com/solutions/insurance-appraisals/ (fetched)
Guided capture: "Intelligent Photo technology guides vehicle owners or repair facilities step by step through the upload process and applies the right overlays for accurate visibility." Headline metric: "3-5 Day average REDUCTION IN CYCLE TIME"; "+20% improvement in appraisal accuracy." "Smart Assignment" auto-routes "estimates to the right specialist"; "Omnichannel comms... through their method of choice"; "task-based workflows, real-time visibility." → the appraisal market sells on **cycle time + guided photo + smart assignment + omnichannel customer comms** — exactly the axes /assignations-atg competes on.

**18. ServiceM8 checklists (help doc)** — https://support.servicem8.com/hc/en-us/articles/200273544-How-to-create-and-use-Checklists (fetched)
Checklist items containing "photo" **auto-open the camera and self-complete on capture**; completing staff member + timestamp auto-recorded in the job Diary (audit trail); items assignable with notifications; reminders can fire at check-in/check-out. This is a shipping blueprint for a "photo checklist with progress" on missions.

**19. CCC / Tractable** *(search snippets only; CCC Play-Store listing fetch came back truncated)*: CCC Mobile Appraiser Pro "assists appraisers in capturing photos for insurers"; CCC "can confirm the quality of unguided photos"; Tractable does automated damage detection/severity from photos; snippets claim 30%+ appraisal cycle-time reduction. Directionally consistent with #17 but not verified on-page.

**20. WhatsApp in Morocco** — https://www.moroccoworldnews.com/2025/06/206465/2025-social-media-barometer-81-of-moroccans-connected-digital-divide-persists/ (fetched)
"75% of the population using the app, and 95% of them checking in daily"; 88% of 18–24s; 81% of Moroccans on social media overall; 19% offline (skewing old/rural). → In Morocco, WhatsApp deep-links are the honest substitute for the US products' SMS pipelines (#1, #4, #5, #6): same job ("on the way" + ETA + confirmations), locally-correct channel. A `wa.me/<phone>?text=<prefilled>` link needs no API contract; the Business API is the later upgrade. *(wa.me mechanics = training knowledge, flagged.)*

## Could not fetch
- https://www.servicem8.com/features and /us/features — 404 (found the content via /us/feature-overview instead).
- https://www.housecallpro.com/features/on-my-way-texts/ — 404 (feature confirmed only via footer link on the fetched dispatch page).
- https://www.jobber.com/features/routing/ — 301 to homepage (used /features/scheduling/ instead).
- CCC Mobile Appraiser Pro Play Store listing — page fetched but description truncated; no quotable text.
- Pencil & Paper data-tables article, Linear docs/teardowns, Superhuman speed-philosophy essays — search snippets only, not opened; marked as such above.
- No genuine Reddit/HN dispatcher thread was reachable (search surfaced Oracle docs and vendor blogs instead); the FieldProMax piece (#6) summarizes "owner-to-owner conversations across Reddit and Quora" and is the closest fetched proxy.
- GTD/queue-management theory: no primary source fetched; the triage-strip and "attention items first" conclusions rest on #2 and #15, not on GTD writing.

## Implications for Missions terrain (prioritized)

### Table-stakes (buyers of FSM/appraisal tools expect these; evidence: ServiceTitan, Jobber, ServiceM8, Salesforce all ship them)
1. **Summary/triage strip above the tabs** — 3–4 actionable counts max: "En retard: 3 · Aujourd'hui: 5 · Prochaine échéance: 14:30 · Sans agent: 2", each chip = a click-to-filter. Modeled on Salesforce's KPI bar (jeopardy count) + Pencil & Paper's "alert to problems, avoid the eyeball attack." Effort: S (counts already derivable from grouped data). Highest sellability-per-hour on the page.
2. **In-row quick actions: Appeler / WhatsApp / Itinéraire (per-row)** — tel:, wa.me with pre-filled French message, single-stop Google Maps. Evidence: ServiceTitan two-way SMS on board; ServiceM8 on-the-way SMS + 2-tap navigation; WhatsApp = 75% of Moroccans. Desktop: hover-revealed icon cluster (Pencil & Paper snippet pattern); mobile: ≥44–48px targets, bottom-half placement on cards (NN/g, Corvus). Effort: S–M.
3. **Reassign without leaving the queue** — inline agent-switch (dropdown/popover on the row, or drag between agent lanes later). Drag-and-drop reassignment is the signature demo moment of every dispatch board fetched (ServiceTitan, Jobber, Salesforce). A popover reassign is 80% of the value at 20% of the cost. Effort: M (popover) / L (drag).
4. **Empty states that teach** — per NN/g verbatim: filtered-empty says "Aucune mission pour ces filtres" + one-tap "Effacer les filtres"; true-empty in "Avant" teaches the plate-scan/creation path with a CTA. Effort: S. This IS the "baby can use it" pattern with actual evidence behind it — prefer it over tour overlays.
5. **Photo checklist progress on the row/card** — "Photos 4/8" chip per mission, camera auto-open per missing item (ServiceM8: photo items auto-open camera + auto-complete; who/when audit trail — you already log historique). Snapsheet sells guided capture as its headline. Effort: M (define required-shot list per mission type; the plate-scan→photo flow already exists as the entry point).

### Differentiators (sellable "wow", evidence-backed, not yet universal)
6. **ETA sharing with the insured via WhatsApp** — "En route" button on the agent's card → status flip + wa.me message with ETA to the insured. Evidence: ServiceM8's automated on-the-way SMS w/ ETA; FieldProMax: automated arrival texts cut ETA complaints to ⅓; WhatsApp channel fit for Morocco. Effort: S for wa.me deep-link (manual send), L for API automation. Do the deep-link now; sell the API version.
7. **Command palette (Ctrl+K)** — single hybrid palette: search dossiers/plates + actions (filter to late, jump to agent, reassign selected). Superhuman: palette is how novices discover and how they *learn* shortcuts; Retool: one palette serves casual + power users (double-enter pattern). App already has Alt-shortcuts — palette becomes their discovery surface. Effort: M (cmdk-style component + existing search index). Skip full vim j/k for now: evidence for j/k is power-user products (Linear/Superhuman); for a mixed-skill Moroccan back-office, arrow-key row focus + Enter (open) + a couple of palette-taught keys is the right subset.
8. **Bulk actions on selected rows** — checkbox column → action bar (reassign N missions, mark dispatched), undo toast not confirm dialog (Eleken; Salesforce "perform actions on selected appointments"). Effort: M.
9. **Map toggle for the day's missions** — pins per group, colored by status; complements the existing multi-stop Itinéraire button. Every fetched competitor has a map view; for a portfolio demo it's the single most screenshot-able addition. Effort: M–L (Maps JS API cost caveat).
10. **Geofenced/GPS check-in ("Arrivé sur place")** — one-tap check-in stamping time+GPS on the mission (Corvus 3-tap rule; FieldProMax: techs updating from the field is THE adoption predictor; you already have an AT location pipeline per memory). Auto-suggest check-in when within X m is the differentiator layer. Effort: M on existing pipeline.

### Skip (for now) — with reasons
- **Full route optimization engine** (auto-sequencing across agents): ServiceTitan/Jobber sell it, but Jobber's own positioning shows manual drag + per-group multi-stop Maps (already shipped) covers small teams; an optimizer is a solver project with thin demo payoff. Revisit as marketing copy only.
- **Gantt/timeline view**: Salesforce-class enterprise furniture; wrong for ~5-agent Moroccan firms; the grouped queue is the better mental model at this scale.
- **vim j/k + one-key action layer everywhere**: power-user monoculture evidence only; palette + arrows subset first (see #7).
- **Signature capture on this page**: real market feature (ServiceM8) but belongs to the mission-completion/report flow, not the dispatch queue.
- **True offline mode**: ServiceM8 advertises it and Morocco connectivity argues for it, but it's an architecture project (queued writes, conflict handling) — note it on the roadmap/pitch, don't build it into this page pass. A cheap slice: cache today's queue read-only.
- **First-run tour overlays**: no fetched evidence in their favor; NN/g's fetched guidance points to contextual empty-state teaching instead.

### Tap-target spec to apply across all of the above (mobile cards)
Min 44–48px (1cm) per NN/g/Eleken; prefer 48–56px because agents are outdoors/in motion (NN/g "in motion" rule, Corvus glove numbers); primary action in the bottom half of the card/screen; 7:1 contrast on status chips (sunlight); at most 3 taps from queue to any critical action (Corvus).
