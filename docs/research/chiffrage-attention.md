# Chiffrage Queue — Attention, Deadlines & the DeadlineBar: Theory Research

Date: 2026-09-03. Researcher: UX-research subagent. THEORY ONLY — no code changes.
Context: assignations-chiffrage work queue; 24-business-hour deadline per row; current per-row
"DeadlineBar" (percent-elapsed meter, warning/danger when late, "X h restantes" label, ✓+date when done);
default sort most-urgent-first; « Aujourd'hui » terracotta time chip. Palette LOCKED (cream/ink/one teal,
terracotta = time only, soft-bg chips, no row tint, no zebra) — every recommendation below stays inside it.
Builds ON TOP of docs/research/color.md, hierarchy.md, tables.md (Few color rules, 3-level dominance,
2-cells/row emphasis budget, left-lean fixations) — none of that is re-argued here.

---

## 1. Executive recommendations

**R1. Per-row DeadlineBar: demote or remove — the meter is the wrong encoding for triage.** [converging opinion, built on strong evidence]
A percent-elapsed bar answers "how much of the SLA is consumed?", but the chiffreur's question is "which one
next, and by when?" — answered by sort position + a countdown. Nick Desbarats (who taught Few's bullet-graph
courses) abandoned per-item meters because "Reading the color of an action dot requires considerably less time
than comparing a bar with three shaded background ranges" and because metrics in the OK range "fail to grab
attention" — the meter shows the same graphic for every row, so nothing pops (S8). Repeating the graphic N times
also violates singleton pop-out: preattentive detection needs the target to be unique on one feature dimension
(S1); a bar on every row means urgency is encoded only by the bar's *state*, i.e. by color — which the locked
system already carries better via the terracotta time chip and status chips. Keep: the **"X h restantes" text**
(the load-bearing datum), a **state chip/dot at threshold** (late / <25% remaining only), and the ✓+date for
done. The always-on meter is data-ink spent on rows that need no attention.

**R2. Urgency banding: yes — band the queue « En retard / Aujourd'hui / Demain / À venir », and let the band header carry the urgency meaning once instead of every row carrying it.** [converging opinion]
Layer-cake scanning is "by far the most effective way to scan pages" (hierarchy.md A2) and it is triggered by
section headers; grouped structures with 2–3 levels support "high-level scanning and detailed examination of
specific segments" (S14, snippet). Banding makes the existing most-urgent-first sort *legible*: a flat sorted
list encodes urgency only ordinally (row 5 vs row 6 looks identical); a band boundary is a categorical,
position-encoded signal — position is the cheapest, calmest preattentive channel. Trade-off honestly: bands
fight column re-sorting and cross-band comparison; but this queue's task is find-next-action, not compare
(NN/g's four table tasks, S11), so the trade is favorable. Put the count in the band header (« En retard · 3 »)
— that is the calm-tech peripheral signal (R5).

**R3. Column order for the triage decision:** identifier (ref dossier / véhicule, human-readable) → deadline
("X h restantes" + « Aujourd'hui » chip) → status chip → everything else, with non-decision columns demoted to
the detail view. [strong evidence for the ordering principle]
NN/g: "the default order of the columns should reflect the importance of the data," first column "a
human-readable record identifier," related columns adjacent to spare eye travel and working memory (S11).
Eyetracking shows users hop columns hierarchically ("first column, second column, then skipping to the fourth
and sixth") — so the two decision columns (what + when) must be adjacent and left-of-centre, where 80% of
fixations live (hierarchy.md A6). Every column that doesn't feed the "which next?" decision costs fixations;
NN/g task-adaptation research shows repeat users build a scanning algorithm — "predictable, unambiguous
patterns help users get to an optimal scanning algorithm fast" (S12) — fewer, stable columns = faster algorithm.

**R4. Motion allowance: no looping pulse on overdue rows. Ever.** [strong evidence]
NN/g: "never include a permanently moving animation on a web page since it will make it very hard for users to
concentrate" (S5-family); motion is detected by peripheral rods and "it's hard to stop attending to it" (S6);
repeated animation flips from nice to "now it's getting annoying" (S4). A pulse on overdue rows fires on every
glance at the queue, all day — the definition of a nuisance alarm. Permitted budget: one-shot, non-moving-
property transitions only (opacity/color settle when a row arrives or crosses a band, 100ms–1s, honoring
`prefers-reduced-motion`); Val Head: "Animation that involves only non-moving properties, like opacity, color,
and blurs, are unlikely to be problematic" (S7).

**R5. Alarm economics: danger styling must stay rare and actionable, and load should be conveyed by a summary, not by shouting per-row.** [strong evidence from adjacent domains]
Healthcare: 72–99% of monitor alarms are false/non-actionable and the result is desensitization and missed
criticals (S3, S3b). Ops: teams see "over 2,000 alerts weekly" with "only around 3% needing immediate action";
the actionability test — "if the on-call engineer cannot take a specific action to resolve it, the alert should
not exist" (S10, S13). Translation: if on a normal day most rows show warning/danger bars (a 24h SLA queue
easily does), red has already stopped working. Reserve danger treatment for states with a distinct action
(late = escalate/apologize; <25% left = do now), and surface queue-level load as a quiet header count
(« 3 en retard ») — Case: "The periphery is informing without overburdening"; "A calm technology will move
easily from the periphery of our attention, to the center, and back" (S2).

**R6. Time text: keep the countdown in hours; prefer it over both percent and absolute clock times.** [converging opinion + one strong study]
Lewis & Oyserman: the same interval framed in finer units feels more imminent and makes people act sooner
(planning "4 times sooner for a retirement in 10,950 days instead of 30 years") (S9b, search-corroborated).
"18 h restantes" beats "échéance demain 14:00" for prompting action, and beats a percent bar for meaning.
Kiess: prefer countdowns over elapsed time; "Do not use terms such as 'awhile'… lack specificity"; be
consistent in units (S9). Percent-of-SLA-elapsed is the least meaningful of the three framings — nobody plans
around "62% consumed."

---

## 2. Findings by question

### Q1 — What commands attention first; pop-out; the cost of false alarms

- **Feature hierarchy (Healey, S1):** Treisman's feature-integration model — "the early visual system divides
  an image into individual feature maps"; features encoded "in parallel into their respective maps." A unique
  feature pops out preattentively (<250ms); "a target made up of a combination of non-unique features (a
  conjunction target) normally cannot be detected preattentively." So "overdue" must be a *single*-feature
  singleton (one warm hue, or one added mark) — "warm hue + bar + bold" is a conjunction that buys nothing
  extra while spending three budgets.
- **Interference is asymmetric:** "background variations in colour interfere with a viewer's ability to
  identify the presence of individual shapes," but "random variations in shape have no effect on a viewer's
  ability to see colour patterns" (S1). Practical: colored chips scattered through the table will mask any
  shape-based urgency cue (icons, bars); the reverse is safe. This is the theory reason the locked system's
  "terracotta = time only" works — and why per-row colored meters would interfere with reading the chips.
- **Guidance beats capture:** "The data-feature mapping should avoid situations where the display of secondary
  data values masks the information the viewer wants to see" (S1). Capture (motion, sudden onsets) is for
  interrupts; a queue the user is already looking at needs *guidance* — ordering, banding, one scarce hue.
- **How many scannable urgency levels:** hue discrimination ceiling ≈7 but practical scanning ceiling far
  lower (hierarchy.md A1); Desbarats's replacement for bullet graphs uses effectively 4 ordered states
  ("Crisis → Actionably Bad → Actionably Good → Best Case") read as one dot (S8). Three visible urgency levels
  (late / due-now / normal) is the ceiling here — matching the 3-level dominance rule already on file.
- **False-alarm cost:** alarm fatigue is "longer response times or… missing important alarms" (S3); a 2010
  death case where 10 nurses tuned out cardiac alarms. Banner blindness is the same mechanism in pixels: users
  "ignore content that resembles ads" and hot-potato-scan away from once-burned regions — a right-rail got
  "0.8% of attention despite occupying 25% of the content area" (S15). An always-red column trains the same
  avoidance. E-commerce urgency literature confirms decay: constant urgency badges "become background noise"
  and users "start to ignore countdowns" (S16, snippets).

### Q2 — Deadline/SLA visualization: meter vs countdown vs bands vs relative text

- **Against the per-item meter:** S8's eleven downsides of bullet graphs, chiefly: serial comparison cost
  ("comparing a bar with three shaded background ranges"), OK-state noise (healthy rows still render a
  graphic), and ambiguity of range semantics. Applies almost verbatim to a percent-elapsed DeadlineBar.
- **For the countdown:** progress bars won on *learnability* but countdowns are "a more specific indication"
  of time remaining (S9a, ACM TOCHI + practitioner corroboration, snippets); Kiess rules (S9): countdown over
  elapsed; never let the indicator move backwards (SLA pause/business-hours math must not make the bar
  regress — a real hazard with 24-*business*-hour deadlines, and a further point against the bar).
- **For banding + thresholds:** ops tooling converges on *threshold events*, not continuous meters — alerts at
  "25%, 75%, and 90% of SLA time used" (S17, snippets); severity tiers P0–P3 with distinct required actions
  (S13). A queue banded En retard/Aujourd'hui/Demain is the visual equivalent of severity tiers; the per-row
  display then only needs the countdown text plus at most one threshold chip.
- **When red stops working:** when it is on screen at rest. Healthy alerting conversion is "30–50% actionable"
  and below 20% "a noise problem requiring immediate intervention" (S13). Heuristic transfer: if >~⅓ of
  visible rows carry warning/danger color on a typical day, the encoding has failed and thresholds must move.
- **Habituation timescale:** habituation to a constant stimulus, recovery on novelty/reset (S16). Terracotta
  survives *because* it appears only on the temporal slice of rows; the moment it becomes a permanent column
  fixture it becomes the sale-badge that "has been visible for days."

### Q3 — Scanning dense tables; column order for triage

- Four table tasks (S11): find / compare / view-edit one / act. This queue is overwhelmingly *find-next* +
  *act*; design for those, not for comparison (which is what wide, many-column layouts serve).
- Fixation cost is per column visited: the observed hierarchical hop (col 1 → 2 → skip → 4 → 6, S11) means
  every column between decision columns is either skipped (wasted space) or fixated (wasted time). Adjacency
  of related columns is an explicit NN/g rule (S11).
- Task-tuned scanning (S12): experts converge on minimal-fixation algorithms (28–38 fixations for a full-list
  judgment) when the layout is stable — argue against re-flowing or conditionally showing columns.
- Column count: no hard fetched number for "columns before degradation"; converging practitioner rule is
  demote-to-detail anything not needed for the row-level decision (tables.md A3/A12; S11's side-panel advice —
  nonmodal panel so users can still reference neighboring rows). Judgement for this queue: 4–5 columns
  (ref/véhicule, échéance, statut, compagnie or montant, action) and everything else in the detail view.
- The deadline column belongs immediately right of the identifier — left-of-centre (80% of fixations on the
  left half, hierarchy.md A6), and adjacent so "what + when" is one saccade.

### Q4 — Motion as attention

- Peripheral rods detect motion; "moving images have an overpowering effect on the human peripheral vision…
  saber-toothed tigers" (S5-family); "we are sensitive and prone to be distracted by any type of motion
  (meaningful or not)" (S6).
- Repetition kills goodwill: "this [animation] was nice the first time, but now it's getting annoying" (S4);
  competition kills power: "the power of any of these animations… is diminished by competition from all the
  others" (S6) — two pulsing rows already cancel each other.
- Vestibular safety (S7): risk scales with relative size of movement, direction/speed mismatch with user
  action, and perceived distance; safe set = opacity, color, blur; provide reduced-motion handling.
- Frequency budget synthesis [judgement]: in a queue glanced at dozens of times per day, the motion budget is
  ~zero at rest; motion only as one-shot feedback for a state *change the user just caused or that just
  happened* (new row arrives, row completes). Matches docs/motion-spec.md's calm stance.

### Q5 — Calm technology / attention budget

- Case's principles (S2): "Technology should require the smallest possible amount of attention"; "The
  periphery is informing without overburdening"; "The right amount of technology is the minimum needed to
  solve the problem."
- Applied: queue load belongs in the periphery — a header summary (« 3 en retard · 5 aujourd'hui ») readable
  without fixating any row, promotable to the center only when the user engages. This replaces the instinct to
  make each late row louder; the *count* is the ambient signal, the *band* is the focal one.
- PagerDuty/incident.io tiering (S10, S13) is calm tech operationalized: route by severity, consolidate
  ("bundle related alerts… into a single, actionable incident"), suppress the non-actionable.

### Q6 — Group headers / banding evidence

- Grouping "transforms a flat list into an organized structure that supports both high-level scanning and
  detailed examination"; "two to three grouping levels are sufficient, because more lead to fragmented groups"
  (S14, snippets — weakest evidence tier in this report; no controlled grouped-vs-flat study was fetchable).
- Strong indirect support: layer-cake headings are the best-measured scan pattern (hierarchy.md A2); band
  headers are exactly such headings; proximity is the strongest grouping cue and whitespace alone can draw the
  bands — no tinted sections needed, staying inside the no-row-tint rule.
- Cost side [honest]: banding weakens single-column sorting and cross-group comparison, and empty bands need a
  policy (hide, don't show empty « En retard » — its absence *is* the calm signal). One band level only.

---

## 3. Source log

Fetched directly (or via r.jina.ai where noted):
- S1 Healey, "Perception in Visualization" — https://www.csc2.ncsu.edu/faculty/healey/PP/index.html
- S2 Amber Case, Calm Technology principles — https://calmtech.com/
- S3 AHRQ PSNet, "Reducing… Monitor Alert and Alarm Fatigue" — https://psnet.ahrq.gov/perspective/reducing-safety-hazards-monitor-alert-and-alarm-fatigue
- S4 NN/g, "Animation for Attention and Comprehension" — https://www.nngroup.com/articles/animation-usability/
- S5 NN/g multimedia/animation family (search-level for the "permanently moving" quote) — https://www.nngroup.com/articles/guidelines-for-multimedia-on-the-web/
- S6 NN/g, "The Role of Animation and Motion in UX" — https://www.nngroup.com/articles/animation-purpose-ux/
- S7 Val Head, "Designing Safer Web Animation for Motion Sensitivity" (A List Apart) — https://alistapart.com/article/designing-safer-web-animation-for-motion-sensitivity/
- S8 Desbarats, "Why I Stopped Using Bullet Graphs" (Nightingale) — https://nightingaledvs.com/why-i-stopped-using-bullet-graphs-and-what-i-now-use-instead/
- S9 Kiess, "Expressing Time in UI & UX Design" — https://blog.prototypr.io/expressing-time-in-ui-ux-design-5-rules-and-a-few-other-things-eda5531a41a7 (direct 403; recovered via r.jina.ai)
- S10 PagerDuty, "Understanding Alert Fatigue" — https://www.pagerduty.com/resources/digital-operations/learn/alert-fatigue/
- S11 NN/g, "Data Tables: Four Major User Tasks" — https://www.nngroup.com/articles/data-tables/
- S12 NN/g, "Scanning Patterns… Optimized for the Current Task" — https://www.nngroup.com/articles/eyetracking-tasks-efficient-scanning/
- S13 incident.io, "SRE alerting best practices" — https://incident.io/blog/sre-alerting-best-practices
- S15 NN/g, "Banner Blindness: Old and New Findings" — https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/

Search-corroborated only (snippets, page not fetched):
- S3b false-alarm rates 72–99% — PubMed 22839984; NCBI PMC9424650 / NBK555522
- S9a countdown-vs-progress-bar — ACM TOCHI 10.1145/3380961 ("Countdown Timer Speed") + practitioner corroboration
- S9b Lewis & Oyserman 2015, "When Does the Future Begin?" — journals.sagepub.com/doi/abs/10.1177/0956797615572231 + ScienceDaily summary (paper PDF exists at USC Dornsife; not fetched)
- S14 grouped-vs-flat lists — decisionfoundry.com table-anatomy + eleken.co table-design (snippets)
- S16 urgency-cue habituation in e-commerce — growthsuite.net, sellifymate.com, tandfonline 2242966 (snippets)
- S17 SLA breach milestones 25/75/90% — supportbench.com / manageengine.com (snippets)
- Few bullet-graph history + alert-icon workaround — perceptualedge.com blog/spec (snippets)

Could NOT fetch (honest list):
- **Reddit r/UXDesign** — 403 "network policy" direct AND via r.jina.ai. Zero community-thread input in this
  report; nothing was reconstructed from memory.
- **Lewis & Oyserman full paper** — only abstract/press summaries; the "days vs years" effect and its transfer
  to hours-vs-dates in a work queue is an inference [judgement on transfer, strong evidence on the effect].
- **Stephen Few PDFs** (Information Dashboard Design chapters; "Formatting and Layout Matter") — not extracted
  this session; his sparing-alert-icon stance comes secondhand via S8 (Desbarats taught his courses) and
  search snippets.
- **NN/g "Lawn Mower Pattern"** — found in search, not fetched (comparison-table focus; marginal here).
- **Ware, Information Visualization (book)** — training knowledge only, consistent with S1; flagged wherever load-bearing.
- Training-knowledge items used and marked as such: none load-bearing beyond the Ware/pop-out framing already
  cited to S1 and hierarchy.md.
