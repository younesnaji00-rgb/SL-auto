# Role-based dashboards — research (2026-09-06)

**Researcher:** Claude (UX-research subagent), on request of the SL Auto owner.

**Target context (3 lines):**
SL Auto Expertise — dense French back-office for a Moroccan auto-insurance loss-adjusting firm. One generic « Tableau de bord » is being replaced by four role dashboards: Gestionnaire (desktop case handler), Chiffreur (desktop estimator, 24 business-hour SLA), Agent de Terrain (phone, missions with RDV at a garage, GPS check-in, photos), and Admin / Responsable d'équipe (desktop, three role tabs + one-person drill-down).
Every role already has a queue page with urgency bands (Chiffrage queue, Missions terrain, Dossiers, Mes rappels); the dashboard must add value beyond "the queue again".

**Source policy honoured:** product docs/changelogs and practitioner blogs first (Linear, Zendesk, Asana, Front, Intercom, ServiceTitan, Jobber, Microsoft, monday, Todoist, Things), then theory (Deming, Muller, calm technology, self-determination research, leaderboard studies), HN and vendor-community threads, NN/g and Smashing/Pencil & Paper as corroboration. No design-system pages were used as primary evidence.

**Sources fetched and read: 38 (YES) + 3 partial. 8 could not be fetched (Part D).**

---

## PART A — Sources

### A1. Linear — My issues (docs)
URL: https://linear.app/docs/my-issues — Fetched: YES
- "My issues is a curated view that shows your most pertinent issues." Four tabs: Assigned, Created, Subscribed, Activity.
- Assigned tab is grouped in a fixed *focus order*: "urgent work, SLA-bound work, blockers, cycle work, other active work, triage, backlog, and completed work" (verbatim). Some sections only appear when they apply.
- Within each group "issues are ordered by priority, with started issues showing first."
- Grouping is overridable from display options but the default is the opinionated order.

### A2. Linear — Triage (docs)
URL: https://linear.app/docs/triage — Fetched: YES
- Triage is "a special inbox for your team" for issues arriving from outside the normal flow; one-key verbs Accept / Duplicate / Decline / Snooze ("until you're ready to take an action" or until new activity).
- "Triage responsibility" names who owns incoming items. Triage items are "excluded from all views since triage is considered to be outside the normal workflow."

### A3. Linear — Inbox (docs)
URL: https://linear.app/docs/inbox — Fetched: YES
- "Inbox shows in-app notifications for work that needs attention." "The Priority tab separates notifications that need your attention from other updates." Snooze "hides a notification … until the selected time."
- Inbox (notifications) and My issues (work) are separate surfaces — a feed you clear vs a curated list you work from.

### A4. Zendesk — Using Agent Home to manage your work efficiently
URL: https://support.zendesk.com/hc/en-us/articles/5064623131418 — Fetched: YES
- Three areas: **Your work** ("Tickets assigned to you that need action"), **Shared work** (CCed, Following), **Completed work** ("last 30 days").
- Sort: "Recommended: Provides suggestions on which tickets to address first", "Oldest updated", "Newest updated". Lists capped at 100.
- Stats tab: "tickets Solved by you this week" and CSAT, plus "Satisfaction statistics for you and your team … for the past 60 days."

### A5. internalnote.com — Preview of the new Agent Home (Thomas Verschoren)
URL: https://internalnote.com/agent-home-beta/ — Fetched: YES
- "It shows Agents an overview of work to be done, as well as a list of recent updated tickets."
- With routing configured, agents can "work to one view and one view only." Wish list: colleague workload visibility, filters.

### A6. internalnote.com — How to get the most out of Agent Home
URL: https://internalnote.com/agent-home-tips/ — Fetched: YES
- "each agent can be sure that, if their Agent Home is empty, they handled all the work." (verbatim)
- With SLAs: "tickets in your Agent Home will be sorted based on the SLA time set and the tickets that meet the nearest reply time breach, will be offered first."
- Recommends deactivating legacy views so agents work from one place; wants "a pill next to each list in the sidebar with the amount of tickets requiring my attention."

### A7. Asana — New: My Tasks makes it easier to organize your work, your way
URL: https://asana.com/inside-asana/customize-my-tasks — Fetched: YES
- Built-in Today / Upcoming / Later sections; auto-promotion between them was **removed** in favour of user Rules.
- Rationale is flexibility ("organize your work in the way that works best for you") — a consumer-grade stance, weaker for a fixed-process back-office.

### A8. Asana — Launches Workload for visualizing & planning team capacity
URL: https://asana.com/inside-asana/new-workload-resource-management — Fetched: YES
- "Team members perform at their best when they have just the right amount of work on their plates."
- Per-person capacity line; overload is flagged; managers filter by role/person then drag-and-drop to rebalance.
- Customer quote: "see each designer's bandwidth in one view so we know who has capacity to take on new requests and who is overloaded."

### A9. monday.com — Personal dashboards: how to build and optimize your work
URL: https://monday.com/blog/project-management/personal-dashboards/ — Fetched: YES
- "Effective dashboards filter information based on relevance and urgency, highlighting only what requires action."
- Pitfalls listed: information overload, static "passive displays", misaligned metrics that look impressive but don't guide a decision.

### A10. Todoist — Plan your day with the Today view
URL: https://www.todoist.com/help/articles/plan-your-day-with-the-todoist-today-view-UVUXaiSs — Fetched: YES
- "start your day with focus by presenting every task scheduled for today across all your projects."
- Overdue is handled by *rescheduling*, not by a growing red pile: "Keep your Today view focused and realistic by rescheduling some tasks for later in the week."

### A11. vanja.io — Things 3: The Complete System
URL: https://vanja.io/things-3-complete-guide/ — Fetched: YES
- "Today should contain ONLY tasks you will actually complete today. Not aspirational. Not 'it would be nice.' Actual commitments."
- "An overloaded Today creates a defeating feeling each evening." "This Evening" keeps lower-urgency items "visible but unobtrusive".
- Deadlines stay in Anytime and *surface* in Today only when due.

### A12. Atlassian Community — Customize the "Your Work" page?
URL: https://community.atlassian.com/forums/Jira-questions/Customize-the-quot-Your-Work-quot-page/qaq-p/1333207 — Fetched: YES
- Users: "We need more than just a flat list of issues grouped by status. Due dates, for instance, or last update, or grouping by project."
- Atlassian staff: no customisation exists (JRACLOUD-73964). A generic "assigned to me" list without age/due signals is judged useless by its own users.

### A13. ServiceNow developer blog — New York: Agent Workspace
URL: https://developer.servicenow.com/blog.do?p=%2Fpost%2Fny_agent_workspace%2F — Fetched: YES
- Landing page gives "a quick overview of the agent's work and their team at a glance."
- "A given user of a workspace can have one and only one landing page. Which landing page they receive is determined by their groups & roles."

### A14. ServiceNow Community — Default start page based on role/group
URL: https://www.servicenow.com/community/developer-forum/how-to-set-default-start-page-based-on-role-group/m-p/2842616 — Fetched: YES
- Admin wants role-based start pages; platform answer: "not possible based on group/roles, but only possible pr. person or for all." Demand for per-role landing is real and unmet in the platform's classic UI.

### A15. Odoo forum — User's first page after login
URL: https://www.odoo.com/forum/help-1/user-s-first-page-after-login-46627 — Fetched: YES
- Admin wants users to land on "My Dashboard" rather than the Messages page; only achievable by reordering menus for all users. Same demand, same limitation.

### A16. Front — Understanding your inbox sections
URL: https://help.front.com/en/articles/2257 — Fetched: YES
- Sections: Open, Assigned to me, Subscribed, Later, Done, Mentions…
- Later = "a consolidated view of all the conversations that are not yet resolved, but you're not actively working on." Snoozed and *waiting* tickets live there — an explicit actionable / waiting split.

### A17. Intercom — Snooze a conversation
URL: https://www.intercom.com/help/en/articles/6564538-snooze-a-conversation-in-the-next-generation-inbox — Fetched: YES
- "snooze any conversation that's still active, but temporarily on hold. For example, when you're waiting on more information from a customer or another teammate."
- Auto-reopen when "A customer or teammate replies to the conversation." "Snooze helps you streamline your workflow, so you can work on pressing issues first."

### A18. SaaSJet — Ticket age vs time in status
URL: https://saasjet.com/blog/ticket-age-vs-time-in-status/ — Fetched: YES
- "Ticket age helps you find old issues. Current status age and time in status help you determine which issues are actually stuck and why."
- Stuck signals: current-status age vs norm; time in Waiting/Blocked; repeated returns to a status. Threshold highlighting: "say, more than 2 business days in Review".

### A19. NN/g — Dashboards: making charts and graphs easier to understand
URL: https://www.nngroup.com/articles/dashboards-preattentive/ — Fetched: YES
- Operational dashboards "impart critical information quickly to users as they are engaged in time-sensitive tasks"; analytical ones lack that time pressure.
- "Their goal is not to facilitate exploration; instead, they provide information that can be consumed fast, with a minimum of interaction or cognitive processing."
- Length/position are preattentive; "color should not be used to communicate … magnitude."

### A20. NN/g — Intranet portals: personalization hot, mobile weak
URL: https://www.nngroup.com/articles/intranet-portals-personalization/ — Fetched: YES
- "Many users will simply use the default My Page without customizing it." Professionals "often see the need to mess with UI preferences as an annoyance."
- Mobile: focus on "time- and location-dependent tasks."

### A21. NN/g — Customization vs. personalization
URL: https://www.nngroup.com/articles/customization-personalization/ — Fetched: YES
- "Personalization is done by the system … Customization is done by the user." Both should "enhance an already good experience, rather than try to fix a poor one"; customization carries "higher interaction cost".

### A22. Pencil & Paper — Dashboard design UX patterns
URL: https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards — Fetched: YES
- "Since the top left area gets more attention, that's where you want to showcase … the most relevant data."
- "Just because you have the data, doesn't mean it should be shown." "If the divergences are small enough, creating multiple unique versions might not be necessary."

### A23. Smashing Magazine — UX strategies for real-time dashboards (2025)
URL: https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/ — Fetched: YES
- "Use clear indicators to show if an action is required or if everything is operating normally."
- "Limit visible elements to about five"; show "last updated time", cached snapshots labelled "Data as of 10:42 AM."
- "Real-time dashboards are decision assistants, not passive displays."

### A24. Klipfolio — On calm technology and business dashboards
URL: https://www.klipfolio.com/blog/calm-technology-business-dashboards — Fetched: YES
- "Calm technology is any technology that empowers your periphery without disrupting your attention."
- Amber Case: "Technology shouldn't require all of our attention, just some of it, and only when necessary."
- A calm dashboard "sits ready for consultation rather than pinging for attention."

### A25. Deming Institute — Book review: The Tyranny of Metrics (Muller)
URL: https://deming.org/tyranny-of-metrics/ — Fetched: YES
- "Anything that can be measured and rewarded will be gamed."
- Deming: "A numerical goal leads to distortion and faking, especially when the system is not capable of meeting the goal."
- "What could be precisely measured tended to overshadow what was really important." Metrics should "better understand and improve the overall system", not rank people.

### A26. Deming Institute — Red Bead Experiment
URL: https://deming.org/explore/red-bead-experiment/ — Fetched: YES
- "even though a 'willing worker' wants to do a good job, their success is directly tied to and limited by the nature of the system they are working within."
- Names "the fallacy of rating people and ranking them in order of performance" when outcomes are system-driven.

### A27. Yu-kai Chou — Leaderboards that motivate the other 90%
URL: https://yukaichou.com/advanced-gamification/how-to-design-effective-leaderboards-boosting-motivation-and-engagement/ — Fetched: YES
- "A poorly designed leaderboard demotivates the majority to energize the few." Cites "31.3% of participants reported negative psychological effects from rank comparisons."
- Alternatives: micro/relative boards, **self-comparison** ("compete against their own previous performance"), never showing the bottom of the list.

### A28. Zoho — 5 toxic sales leaderboard habits and the middle 60%
URL: https://www.zoho.com/blog/crm/sales-gamification-5-toxic-sales-leaderboard-habits-and-the-middle-60.html — Fetched: YES
- "Using dollar sales or unit sales per salesperson as the main leaderboard metric is wrong" — unfair to less experienced staff; "when coached, the middle 60% had the highest performance gains."
- "leaderboards discriminate against rookies"; "put too much emphasis on the individual". Fix: progress vs personal goals, team metrics where cooperation matters.

### A29. Emerald / Internet Research — How leaderboard positions shape our motivation
URL: https://www.emerald.com/intr/article/33/7/1/178330/ — Fetched: YES
- Low-ranked participants initially work harder (competence *frustration*) but by round 5 show "downward movements" — "about to give up because of the chain of discouraging events." Rank exposure buys a short burst, then disengagement at the bottom.

### A30. Innovative Human Capital — Why self-referenced reviews beat peer comparisons
URL: https://www.innovativehumancapital.com/article/comparing-apples-to-oranges-why-self-referenced-performance-reviews-are-more-effective-than-peer-co — Fetched: YES
- "Many studies show self-referenced reviews boost intrinsic motivation more than social comparisons (Van Yperen et al., 2014; Zhan et al., 2018)."
- "social comparison triggers competition and anxiety that undermine well-being and productivity" (Turner & Brown 1978; Suls & Wheeler 2012). Practice: compare to own past.

### A31. brianheger.com — summary of HBR "Are people analytics dehumanizing your employees?" (2022)
URL: https://www.brianheger.com/are-people-analytics-dehumanizing-your-employees-harvard-business-review/ — Fetched: YES (HBR original: PARTIAL, paywalled intro only)
- "increased monitoring can also increase stress, reduce trust, and even cause employees to act less ethically."
- "employee monitoring can signal distrust and lead to employee disengagement." Recommends transparency about what is collected and why.

### A32. Hacker News — "McKinsey: Yes, you can measure software developer productivity" thread
URL: https://news.ycombinator.com/item?id=37203108 — Fetched: YES
- lll-o-lll: "teams and individuals will optimise to increase the score of the metric."
- Shaanie: once points drive evaluations, people "Fight to get the 'easy points', less collaboration etc."
- davesque: "Do companies want the trust of their employees or do they want productivity metrics? Because they can't have both."
- ttr2021: cross-team comparison of subjective units is "a huge no no".

### A33. SimplySfdc — Salesforce "View Dashboard As"
URL: https://www.simplysfdc.com/2021/01/salesforce-view-dashboard-as.html — Fetched: YES
- Options: "me", "the dashboard viewer (login user)", "another person"; selection limited to users "below you in the role hierarchy". Per-person drill-down = a *running-user* selector, not a report per person.

### A34. Microsoft Dynamics 365 blog — New Field Service mobile UX (2023)
URL: https://www.microsoft.com/en-us/dynamics-365/blog/it-professional/2023/10/27/transform-technician-experience-with-the-new-field-service-mobile-ux/ — Fetched: YES
- Home = "the landing page for the app, currently today's bookings"; card shows customer, incident type, address, start time, status.
- "cuts down the number of taps required to complete a booking in nearly half"; "touch targets are larger to eliminate mis-taps for conditions out in the field."

### A35. ServiceTitan help — Field mobile app Home/Jobs screen
URL: https://help.servicetitan.com/how-to/overview-of-the-servicetitan-field-mobile-app-jobs-screen — Fetched: YES
- Home shows "today's schedule and your current job", chronological, auto-reordering as events start/complete. Per-job sync icons (Done / Downloading / Warning); card quick actions: Directions, Contact.

### A36. Jobber help — Jobber app basics
URL: https://help.getjobber.com/hc/en-us/articles/7061327071639-Jobber-App-Basics — Fetched: YES
- "Home in the app keeps you on top of what your team is doing day-to-day so you can see at a quick glance if your day is staying on track." Home = map of the day + "Up Next" by start time + a to-do list of items blocking the next stage.

### A37. Team 400 — Mobile apps for field service: design patterns
URL: https://team400.ai/blog/2025-07-field-service-mobile-apps — Fetched: YES
- Home = "Today's jobs in sequence… The tech should know their day in seconds."
- "Touch targets minimum 44x44pt (48x48 better)", gloves/"fat fingers", full-width buttons; offline-first with "Clear indication of sync status"; sun glare → "Large, clear status indicators", avoid "subtle visual differences"; "One-tap photo capture… instead of description."

### A38. Kittl — Mobile-first typography: WCAG made simple
URL: https://www.kittl.com/blogs/mobile-first-typography-wcag-standards-fnt/ — Fetched: YES
- "Direct sunlight measures 32,000–100,000 lux." "Text at 3.8:1 indoors might drop to 2.5:1 in bright conditions."
- "16px as the practical minimum for body text on phones", 17–18px comfortable.

### A39 (partial). The Sweet Setup — Things 3 release
URL: https://thesweetsetup.com/cultured-code-releases-things-3/ — PARTIAL (only the This Evening feature; A11 covers it better).

### A40 (partial). LinearB — SPACE framework explained
URL: https://linearb.io/blog/space-framework — PARTIAL (activity metrics "most valuable when tracked alongside efficiency metrics"; the paper's stronger individual-metrics warning is in D).

---

## PART B — Findings

**B1. The best personal work views are opinionated, fixed-order lists — not widget grids.** Linear's Assigned tab hard-codes a focus order (urgent → SLA-bound → blockers → active → triage → backlog) and hides sections that are empty (A1). Zendesk's "Recommended" sort and SLA-nearest-breach-first ordering do the same (A4, A6). Jira's un-opinionated "flat list grouped by status" is the counter-example its own users call insufficient (A12). Asana moved the other way (removed auto-promotion for user rules, A7), but that is a consumer/prosumer stance NN/g says busy professionals ignore ("simply use the default", A20).
*Implication:* each SL Auto role dashboard is a fixed, role-authored order of blocks. No drag-to-customise widgets.

**B2. "Now / Today" first, and an empty top is a feature.** Things: "ONLY tasks you will actually complete today" (A11); Todoist: keep Today "focused and realistic" (A10); Zendesk: "if their Agent Home is empty, they handled all the work" (A6); calm technology: empower the periphery, demand attention "only when necessary" (A24); Smashing: signal clearly "if an action is required or if everything is operating normally" (A23).
*Implication:* the first block is the smallest possible "À traiter maintenant" set; when it is empty, say so in words (« Rien d'urgent — tout est dans les délais »), don't fill the space.

**B3. Split actionable from waiting-on-others.** Front's *Later* section ("not yet resolved, but you're not actively working on", A16), Intercom's snooze-until-they-reply with auto-reopen (A17), Linear snooze (A2, A3), GTD's Waiting-For list. The split is what stops the list from becoming a scroll of things you cannot act on.
*Implication:* every personal dashboard has an explicit « En attente d'un tiers » block (chiffreur / garage / compagnie / agent), separate from « À faire », and items jump back to « À faire » when the other party acts.

**B4. Age-in-status, not total age, is the leading stuck-signal.** SaaSJet: "Ticket age helps you find old issues. Current status age … help you determine which issues are actually stuck" (A18); Jira users beg for "last update" on Your Work (A12); Zendesk offers "Oldest updated" sort (A4).
*Implication:* the dashboards show *time since last movement* on each item and flag against a role threshold (e.g. dossier without action > 2 business days), instead of a "created" date. This is the value the queue pages (which band by SLA deadline) do not already give.

**B5. Notifications and dashboards are different surfaces.** Linear separates Inbox (feed you clear, Priority tab, snooze) from My issues (curated work list) (A1, A3). Zendesk keeps "Your work" apart from "Shared work" (CCed/Following) (A4).
*Implication:* Rappels stay a feed in « Mes rappels »; the dashboard shows only a *count + the oldest unread* and links through. Do not replicate the rappel list on the dashboard.

**B6. Personal metrics: show progress against self, never rank against peers.** Deming: rating people for system-driven outcomes is a "fallacy" (A26); Muller/Goodhart: "Anything that can be measured and rewarded will be gamed" (A25); leaderboards "demotivate the majority to energize the few" (A27), "discriminate against rookies" (A28), and the low-ranked disengage over time (A29); self-referenced feedback raises intrinsic motivation, peer comparison raises anxiety (A30). Zendesk's Stats tab shows *your own* solved-this-week and CSAT, and the team figure only as a percentage attainment — no rank (A4).
*Implication:* on a personal dashboard, at most one or two own-numbers, framed as "this week vs your last 4 weeks". No position, no percentile, no names of colleagues.

**B7. Individual figures are unfair under uneven assignment; compare to the team's *median* and show the workload context.** Deming's red beads (A26); HN: "Fight to get the 'easy points'" (A32); Zoho: raw per-person volume "unfair to less experienced reps" (A28); Asana Workload exists to *balance load*, not to rate people (A8). SPACE (partial, A40) and HN (A32) both stress that activity counts in isolation are misleading.
*Implication:* the admin per-user view always shows the person's *assigned volume and mix* next to any rate, and compares to the team median with a spread band, never to the top performer. Dispersion is a management signal about the system (assignment), not a verdict.

**B8. Monitoring erodes trust unless it is transparent and reciprocal.** HBR: monitoring "can increase stress, reduce trust, and even cause employees to act less ethically" (A31); HN davesque: trust or metrics, "they can't have both" (A32).
*Implication:* whatever the admin can see about a person, the person can see about themself on their own dashboard, with the same definitions. No hidden admin-only metrics. Label metric definitions in a tooltip.

**B9. The manager pattern is "team overview → one person as running user", scoped by hierarchy.** Salesforce "View Dashboard As … another person" restricted to the role hierarchy (A33); ServiceNow landing page "agent's work and their team at a glance" determined by role (A13); Asana Workload filter-by-person then rebalance (A8).
*Implication:* the admin window keeps the same block layout when a user is selected; the selector changes the *scope*, and a persistent banner names whose data is shown. Admins see all three tabs; a Responsable d'équipe sees only the tab for their team.

**B10. Field workers: home = today's route in time order, current/next job at the top, huge targets, offline state visible.** Microsoft (A34), ServiceTitan (A35), Jobber (A36), Team 400 (A37) all converge: today's bookings in sequence, customer + address + time window + status per card, directions/call as one-tap actions, colour-coded status, larger touch targets, per-job sync icons. Contrast in sunlight collapses (A38), so "avoid subtle visual differences" (A37).
*Implication:* the Agent de Terrain dashboard is a single column: the *next* RDV as a large card with « Itinéraire » / « Appeler le garage » / « Check-in GPS », then the rest of today, then tomorrow collapsed. No charts. AAA-ish contrast on status chips, ≥ 48 px targets, sync/offline indicator.

**B11. Dashboards are consumed, not explored — few elements, most important top-left.** NN/g operational dashboards: "consumed fast, with a minimum of interaction" (A19); Smashing: "about five" visible elements (A23); Pencil & Paper: top-left, "Just because you have the data, doesn't mean it should be shown" (A22).
*Implication:* ≤ 5 blocks per role dashboard; the "now" block top-left; everything else is a link into the existing queue with a count.

**B12. Role-based landing is wanted and repeatedly blocked by platforms.** ServiceNow (A14), Odoo (A15) admins ask for per-role start pages and are told "only per person or for all"; ServiceNow's newer Workspace fixed this with one landing page per role (A13); NN/g: role-based personalization works, individual customisation is ignored (A20, A21). Zendesk made Agent Home the *default* landing and practitioners recommend killing the old views so agents work from one place (A6).
*Implication:* SL Auto can do what those platforms could not — land each role on its own dashboard — provided the dashboard's first block *is* the next action, so it does not cost a click versus the queue.

---

## PART C — Recommendations

### C1. Block order per personal dashboard (French labels)

Rules that apply to all three: fixed order, no customisation; each block has a count in its heading and a « Voir tout → » link into the existing queue; empty blocks collapse to one line of plain text; the "now" block is top-left and uses the queue's own urgency bands so the two pages never disagree; every number shown about the user is self-referenced (this week vs own trailing 4 weeks).

**Gestionnaire (desktop)**
1. **« À traiter maintenant »** — dossiers needing *my* action today, ordered by time-since-last-movement then SLA: RDV to plan, documents missing, accord received to forward, chiffrage returned. Max 8 rows; empty → « Rien à traiter — vos dossiers avancent. »
2. **« Rappels non lus »** — count + the single oldest unread rappel inline (sender, dossier ref, one line); « Ouvrir Mes rappels → ». Not the list.
3. **« En attente d'un tiers »** — grouped counts: chez le chiffreur / chez l'agent de terrain / chez le garage / chez la compagnie, each with the oldest item's age; items > threshold get the amber band. This is the GTD Waiting-For list (B3).
4. **« Bloqués depuis > 2 j ouvrés »** — dossiers with no movement in any status beyond the threshold (B4). Often overlaps 1; keep it because it is the one signal the queue pages don't band on.
5. **« Ma semaine »** — dossiers créés / planifiés / envoyés en chiffrage this week vs my own previous 4-week average, three small numbers, no chart, no team figure.

**Chiffreur (desktop)**
1. **« Prochain à chiffrer »** — one large card: the assignment nearest to SLA breach (Zendesk nearest-breach-first, B1), with « Ouvrir » as the primary action, plus the next two as compact rows. Empty → « File vide — aucun chiffrage en attente. »
2. **« Ma file »** — counts per urgency band (dépassé / < 4 h / < 24 h / à venir) as one row of chips linking into the queue with that band pre-filtered.
3. **« Révisions »** — 2ème/3ème accord requests, separated because they are re-edits with different effort (project rule), oldest first.
4. **« En attente »** — devis sent and awaiting garage/compagnie/gestionnaire response, age since sent; auto-return to block 1 when a revision arrives (Intercom auto-unsnooze, B3).
5. **« Ma semaine »** — chiffrages livrés and % dans le délai, self-referenced only.

**Agent de Terrain (phone, single column)**
1. **« Prochaine mission »** — one full-width card: garage name, address, RDV time, plate/vehicle, status band; buttons « Itinéraire », « Appeler le garage », « Check-in GPS » (≥ 48 px, full width). Sync/offline dot in the card header (A35, A37).
2. **« Aujourd'hui »** — remaining missions in RDV order, one line each (time · garage · status), Avant / En cours / Après as chips not sections.
3. **« Photos à envoyer »** — missions with a check-in but no photo upload; one-tap camera. Appears only when non-empty.
4. **« Demain »** — collapsed count, tap to expand.
5. Nothing else. No charts, no weekly stats on the phone. Contrast: status chips at ≥ 7:1 where possible; never encode status by colour alone (A19, A38).

### C2. Admin / Responsable d'équipe: three tabs + per-user drill-down

- **Tab = role** (Gestionnaires / Chiffreurs / Agents de terrain). Each tab has the *same* block skeleton as that role's personal dashboard, aggregated: « À traiter » becomes « Charge en cours par personne » (a horizontal-bar list, one row per user, length = open items, split by band colour — length is preattentive, colour is not, A19); « En attente d'un tiers » becomes the team's waiting totals with the oldest item; « Bloqués > 2 j » becomes a team list sorted by age with the assignee shown.
- **User selector** at the top-right of the tab (« Voir : Toute l'équipe ▾ »), populated only with users of that role; a Responsable sees only their team's tab(s). Selecting a person: the blocks keep their positions but scope to that person — a persistent banner « Vue : Karim B. — Chiffreur » (Salesforce running-user pattern, A33). The person's own dashboard content appears exactly as they see it (B8), followed by a **« Contexte de charge »** row: items assigned this period, mix of revisions vs new, SLA hours at risk — so any rate below it is read against its denominator (B7).
- **Fair comparison:** every rate for the selected person is shown next to the *team median* and the interquartile range as a quiet band ("vous êtes ici" tick), never next to the best performer and never as a rank. Trend is the person's own trailing 8 weeks (A27 self-comparison, A30).
- **What changes when a user is selected:** scope, banner, the « Contexte de charge » row appears, the per-person bar list is replaced by that person's items. What does *not* change: block order, definitions, thresholds.
- **Never show:** a leaderboard or ordinal rank; a "bottom N"; per-person metrics the person cannot see on their own dashboard; activity counts without the assigned-volume denominator; cross-role comparisons (a chiffreur's numbers vs a gestionnaire's mean nothing, A32 "imaginary units"); real-time "last seen / online" presence as a performance proxy (A31).
- **Workload balance action:** from the team bar list, « Réassigner » on a row opens the existing assignment dialog — the admin view earns its place by letting the manager fix the *system* (assignment), which is what Deming and Asana Workload both point at (A8, A26).

### C3. Landing-page verdict

**Land each role on its role dashboard, with the condition that its first block is the next concrete action.** Evidence: Zendesk made Agent Home the default and practitioners removed the old views so agents "work to one view" (A5, A6); ServiceNow Workspace ties one landing page to role (A13); admins on classic platforms keep asking for exactly this and are refused (A14, A15); NN/g finds role-based personalization is used and individual customisation is not (A20, A21). The counter-risk (a dashboard that costs an extra click before real work) is neutralised by C1's rule that block 1 *is* the item to open — for the Chiffreur it is literally « Prochain à chiffrer — Ouvrir ». Exception: the Agent de Terrain on a phone lands on « Prochaine mission » (which is the dashboard) and never on the missions table. Keep a "remember last page" only for Admin, whose work is exploratory.

### C4. Do-not-build list

1. Customisable/draggable widget grid (A7 vs A20/A21 — ignored by busy professionals; costs interaction).
2. Charts on personal dashboards (A19, A23 — consumed, not explored; a chart of your own throughput invites Goodhart behaviour, A25).
3. Any leaderboard, ranking, percentile, "top/bottom", or medal (A26–A30).
4. A second copy of the rappel list or the queue table on the dashboard (B5; the queue pages already band by urgency).
5. Team-vs-me comparisons on the *personal* dashboard (A30 — keep peers off the individual's screen entirely).
6. Admin-only hidden metrics or "last active" presence timers (A31, A32).
7. Cross-role or cross-team metric comparisons (A32).
8. Total-age-since-creation as the main stuck signal (A18 — use time-in-status).
9. Weekly stats or graphs on the phone dashboard (A34–A37 — one column, today's route only).
10. Real-time auto-refreshing counters that flicker; show « Mis à jour à 10:42 » and refresh on focus instead (A23, A24).

---

## PART D — Could not fetch

| Source | Reason |
|---|---|
| Zendesk "Announcing Agent Home (beta)" https://support.zendesk.com/hc/en-us/articles/5785063561242 | Redirected to a sign-in page. Content covered by A4/A5/A6. |
| Salesforce IdeaExchange "Default landing page for Service Console" | Page rendered only a CSS-error shell. Same demand evidenced by A14/A15. |
| HBR "Are people analytics dehumanizing your employees?" (original) | Paywall — only the intro paragraph returned. Used the brianheger.com summary (A31). |
| Skedulo "What do field service techs want in a mobile app?" | HTTP 403. |
| HN "Measuring developer productivity? A response to McKinsey" (id 37309639) | HTTP 429 rate-limited; the sibling thread (A32) was fetched instead. |
| ACM Queue — SPACE framework paper (Forsgren et al.) | HTTP 403. Individual-metric caution taken second-hand from A40 and A32. |
| Medium — "Linear's notification system treats attention as abundant" | HTTP 403. |
| Reddit r/managers, r/ExperiencedDevs threads | reddit.com blocks this crawler entirely (API refuses the domain). HN threads used as the practitioner-forum substitute. |
| GitLab handbook "Engineering metrics dashboards" | Only the handbook navigation index rendered, not the article body. |
| Trailblazer community thread "Service agents on Salesforce Home" | Fetched but off-topic (it concerns Agentforce AI agents, not human agents' home page). Not used. |
