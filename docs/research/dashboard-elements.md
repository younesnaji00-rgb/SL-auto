# Dashboard elements — per-element research (2026-09-06)

**Researcher:** UX-research subagent (Claude), for the role-dashboard build.
**Target context:** SL Auto Expertise, dense French back-office for Moroccan auto-insurance loss adjusting. Four role dashboards: Gestionnaire (case handler), Chiffreur (desk estimator, 24 business-hour SLA queue), Agent de Terrain (field inspector on a phone), Admin (team view + per-user drill-down). Design system locked ("Cream & Ink"): cream canvas, paper cards with light rim, navy ink ladder, ONE teal accent, terracotta only for time markers, status pairs only with a label and only for exceptions, 12 px sentence-case labels, Inter 600 values (36 headline / 24 detail / one ≥48 hero per view), tile padding 16, card padding 24, captions print the real period, charts never animate on entrance, categorical palette teal · terracotta · indigo · plum · olive, one hue for magnitude, no dual axes. An existing "Suivi d'équipe" page has per-step KPI tiles with three-segment meters, a cycle-time table, an aging list and a weekly line chart.
**Source policy honoured:** theory and practitioners first (Few ×3 PDFs read in full, Tufte, Datawrapper ×6, Storytelling with Data, Power BI / Tableau community, Geckoboard, Pencil & Paper, Smashing ×2, LukeW, Hoober via SIDP, field-service product docs, Kaushik, leaderboard-practice and empty-state content guides); design systems only as corroboration. **Sources fetched and read: 34 in full, 6 partial (40 URLs).** Could-not-fetch list in Part D.

---

## PART A — Sources

### A1. Few — Bullet Graph Design Specification (PDF 2013)
https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf — Fetched: YES (read in full)
- "developed to replace the meters and gauges… Its linear and no-frills design provides a rich display of data in a small space."
- Five parts: text label · linear quantitative scale (from zero) · featured bar ("Approximately 1/3rd the thickness of its container") · 1–2 comparative markers (short perpendicular line, less dominant, behind the bar) · 2–5 qualitative ranges, "ideally to three".
- Ranges: "distinct intensities from dark to light of a single hue… darker… for the poor states"; three ranges = 40/25/10 % black. Lower-is-better: reverse the fill order.
- Optional projected segment shows whether a future target is on track.

### A2. Few — Common Pitfalls in Dashboard Design (PDF 2006)
https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf — Fetched: YES (read in full)
- Dashboard = "the most important information needed to achieve one or more objectives, consolidated and arranged on a single screen so the information can be monitored at a glance." Process: "See the big picture… Focus in on the specific items… that need attention… Quickly drill into additional information… to take action."
- #2 context: "Compared to what? Is this good or bad?… Are we on track?" #3: no excess precision ("$3.8M"; seconds are excessive). #4: show the variance directly, "-10%".
- #6: "select the means of display that works best, even if that results in a dashboard… filled with nothing but multiple instances of the same type of graph."
- #9: "The most important data ought to be prominent. Data that requires immediate attention ought to stand out"; top-left is "prime real estate"; a measure and its trend belong side by side. #10: "When everything is visually prominent, nothing stands out." #12: "keep colors subdued and neutral, except when you are using color to highlight something as especially important."

### A3. Few — Our Irresistible Fascination with All Things Circular (PDF 2010)
http://www.perceptualedge.com/articles/visual_business_intelligence/our_fascination_with_all_things_circular.pdf — Fetched: YES (read in full)
- "visual perception supports only rough comparisons of areas and angles."
- "Circular gauges—the darlings of dashboards—waste space… they fail spectacularly when intended for comparison."
- Four people's evaluations as stacked bullet graphs "in less space and in a way that makes comparisons much easier and faster… due in large part to their linear design." Multiple years → "small multiples with a consistent quantitative scale".

### A4. Tufte — Sparkline theory and practice
https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/ — Fetched: YES
- "A sparkline is a small intense, simple, word-sized graphic with typographic resolution."
- No frames/gridlines: "the physical location of the numbers, words, and graphics enforces the implicit grid." Latest value = coloured dot tied to its number; grey band = normal range.
- Aspect: "Variations in slopes are best detected when slopes are around 45°" — "lumpy", not spiky. Sparklines live in tables beside numbers.

### A6. Datawrapper — Stacked column charts, what to consider
https://www.datawrapper.de/blog/stacked-column-charts — Fetched: YES
- "work well when the focus of the chart is to compare the totals and one part of the totals."
- "Bring the most important value to the bottom of the chart and use color to make it stand out." Many parts → "split bars or small multiples".

### A7. Datawrapper — The case against diverging stacked bars
https://www.datawrapper.de/blog/divergingbars — Fetched: YES
- "we can compare the length of bars best if they have a common baseline." Diverging stacks "make it really hard to compare the length of the bars to either side of the middle line."

### A8. Datawrapper — Small multiple line charts, what to consider
https://www.datawrapper.de/blog/what-to-consider-when-creating-small-multiple-line-charts — Fetched: YES
- "Use small multiple line charts to untangle overlapping lines." / "Use normal line charts if you want readers to compare lines with each other at specific points in time."
- "Do not be afraid to shrink your charts. The eye can detect, with great efficiency even at small resolution, variation in size, position, colour and pattern."
- "If possible, avoid independent scales"; sort panels deliberately; colour to "highlight certain panels" with the rest repeated in grey.

### A9. Datawrapper — A friendly guide to choosing a chart type
https://www.datawrapper.de/blog/chart-types-guide — Fetched: YES
- Continuous change: "the classic line chart is… usually a solid choice." "just a few points in time… a column chart is usually a good fit." Dot plots when "not much space for a chart."

### A10. Datawrapper Academy — Range highlights and reference lines
https://www.datawrapper.de/academy/range-highlights-and-lines — Fetched: YES
- Reference lines "highlight thresholds/benchmarks (a target, a baseline…)". Ranges: "a very light color, or decreasing the opacity by a lot"; lines "can often handle a darker, more opaque color".
- Diagonal stripes: "a long-standing convention for forecast, projected, provisional, or incomplete data."

### A12. Storytelling with Data — Bar charts must have a zero baseline
https://www.storytellingwithdata.com/blog/2012/09/bar-charts-must-have-zero-baseline — Fetched: YES
- Cutting bars above zero is "over-emphasizing the difference… in a way that simply isn't honest." "With line graphs, we compare the lines to each other more than their height from the x-axis" — non-zero allowed if labelled.

### A13. Daydreaming Numbers — Time series with an incomplete period
https://daydreamingnumbers.com/how-to-show-time-series-data-with-incomplete-period/ — Fetched: YES
- "Annotating the incomplete period is one of the simplest yet most powerful ways to prevent misunderstanding." Also: labelled estimate; like-for-like comparison to the same point of prior periods; "visually separating the actuals from the forecast" (dotted, lighter).

### A15. Tabular Editor — KPI card best practices (Power BI)
https://tabulareditor.com/blog/kpi-card-best-practices-dashboard-design — Fetched: YES
- "Show three things: the actual value, the target, and the gap between them."
- "Apply both [colour and symbol] to the gap, not the primary value; the gap is the judgment"; pair colour with an arrow so "the signal doesn't depend on color alone."
- "518M" not "517,893,412 because precision doesn't help at the KPI level." "Five is a practical ceiling" per page.

### A17. VizMasters — Big-Ass Numbers (BANs)
https://vizmasters.substack.com/p/big-ass-numbers-bans-why-they-belong — Fetched: YES
- "Our brains catch big, bold numbers faster than we read charts… preattentive processing." Must carry "Up/down trend arrows", "sparklines", "Comparisons like 'vs last month'"; never "without reference".
- "Group 3–4 KPIs at max—less is more"; "Top-left or centre-top"; fails with "10+ BANs with equal weight".

### A18. Kaushik — Four not-useful KPI measurement techniques
https://www.kaushik.net/avinash/insights-web-analytics-kpi-measurement-techniques/ — Fetched: YES
- "Always show raw numbers. Often conversion rates mask the opportunity available." One-visit rows at 100 % bounce: "I can't possibly waste my time with things that bring one visit." Averages hide distributions.

### A19. Geckoboard — Dashboard design best practice
https://www.geckoboard.com/best-practice/dashboard-design/ — Fetched: YES
- "The top left corner… is the best location as that's where your eyes are naturally drawn to first." Context = "the same metric for the previous day, or… a line or column chart… over a longer period."
- "a combination of numbers, bars, lines and tables and not much else"; no area/pie; "Grouping related metrics next to each other makes them easy to find."

### A20. Pencil & Paper — UX pattern analysis: data dashboards
https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards — Fetched: YES
- "the top left area gets more attention, that's where you want to showcase the most global numbers… related sections going top-down."
- Deltas "are either positive, neutral… or negative" and "should catch the eye and be quick and easy to make sense of"; three renderings (icon+colour+%, arrow+plain label, inline dot in rows).
- Comparison control "in the top right corner… compare to last week, last month, last year"; page-level filters hit "every single chart at once". Mobile: "only display that top section… in a vertical layout".

### A21. NN/g — Dashboards and preattentive attributes
https://www.nngroup.com/articles/dashboards-preattentive/ — Fetched: YES
- "length and 2D position" are strongest; "color should not be used to communicate… quantitative values or magnitude"; "area is a variable that people don't interpret quickly or with accuracy."

### A22. Smashing — UX strategies for real-time dashboards (2025)
https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/ — Fetched: YES
- Freshness widget = sync status + last-updated + refresh; snapshots "labeled with timestamps such as 'Data as of 10:42 AM'". "place critical figures… in the upper left… Limit visible elements to about five." "Animation should clarify, not distract." Offline banner.

### A23. Basedash — Data freshness for BI
https://www.basedash.com/blog/data-freshness-how-current-your-dashboard-data-really-is — Fetched: YES
- "Show a visible 'data as of' timestamp on every dashboard. This is the single highest-leverage habit for freshness trust." "The timestamp should reflect the maximum timestamp in the underlying data, not the time the page rendered." "Set a freshness SLA per dashboard tier."

### A24. Setproduct — Badge UI design
https://www.setproduct.com/blog/badge-ui-design — Fetched: YES
- "Use a dot when the fact that something changed matters more than how much." "Never let a badge count climb past two digits." "Meaning is never carried by color alone."

### A25. Setproduct — Dashboard UI design
https://www.setproduct.com/blog/dashboard-ui-design — Fetched: YES
- Order: header/context → KPI row → primary chart → controls → tables. "first viewport to three or four KPIs at most" (mobile), "3 to 7 KPIs… above-the-fold" (desktop). Mobile: cards stack; "Push secondary filters behind a sheet or drawer."

### A26. Oracle JD Edwards UX One — Team Case Aging page
https://docs.oracle.com/en/applications/jd-edwards/cross-product/9.2/eoaux/ux-one-team-case-aging-page.html — Fetched: YES
- Alert tiles first ("Team Cases Over 30 Days", "Team Overdue Cases"), then "Case Age Distribution", "…by Assignee", "Top 10 Overdue Open Cases", each drilling to the work program.

### A27. ui-patterns.com — Activity Stream
https://ui-patterns.com/patterns/ActivityStream — Fetched: YES
- Grammar "Actor | verb | (object) [context]"; aggregate repeats ("David, Thomas, and Ashley changed their profile pictures"); "Do not use when your system does not have user activity as one of its key elements."

### A28. uxpatterns.dev — Activity feed
https://uxpatterns.dev/patterns/social/activity-feed — Fetched: YES
- Anatomy: container (ordering, batching, insertion rules) · item (actor, object, action, time) · metadata/actions · filters · paging. "Do not rely on color alone to convey severity, completion, or selection state."

### A30. Microsoft Learn — Field Service mobile, refreshed agenda
https://learn.microsoft.com/en-us/dynamics365/field-service/mobile/do-work-newux — Fetched: YES
- Agenda "optimized for frontline workers… quick access to key actions such as updating the booking status, getting directions"; swipe for quick actions; directions icon on the tile; auto-set "Traveling" when directions open.

### A31. Team400 — Field service mobile app design patterns
https://team400.ai/blog/2025-07-field-service-mobile-apps — Fetched: YES
- "Keep it scannable. The tech should know their day in seconds." Row: "Job number, customer name, location, status, time window."
- "Touch targets minimum 44x44pt (48x48 better)", full-width primary buttons; "one hand (or wearing gloves)", "sun glare"; "Colour coding (but not colour alone)"; offline with "Clear indication of sync status".

### A32. LukeW — Touch target sizes
https://www.lukew.com/ff/entry.asp?1085 — Fetched: YES
- Apple 44 pt min; Nokia "8 x 8 mm with 2 mm gaps for thumb usage", lists "minimum of 5 mm line spacing"; "The width of a finger limits the density of items on screen."

### A33. Smart Interface Design Patterns — Tap target cheatsheet (Hoober)
https://smart-interface-design-patterns.com/articles/accessible-tap-target-sizes/ — Fetched: YES
- WCAG AAA 44×44 px; Hoober: top 11 mm (42 px), centre 7 mm (27 px), bottom 12 mm (46 px); bottom nav "at most 5 items".

### A34. ColorUXLab — Mobile colour and contrast
https://coloruxlab.com/guides/mobile-app-color-design — Fetched: YES
- "Under direct sunlight, perceived contrast drops due to screen reflection. For primary mobile actions, aim higher: 7:1 WCAG Level AAA"; "low-contrast colors that work on desktop often fail in direct sunlight."

### A35. Intuit Content Design — Empty states
https://contentdesign.intuit.com/product-and-ui/empty-states/ — Fetched: YES
- Task-completion type: "There are no new updates to share." Do "Nice work! You're all caught up"; don't "Whoops, there's nothing here" / "No results found". Headline clear and brief; say what to do next.

### A37. Corporate Traditions — Employee leaderboard
https://blog.corporatetraditions.com/glossary/employee-leaderboard — Fetched: YES
- "Ranking individuals in roles that depend on teamwork produces internal competition and worse collective outcomes." Volume leaderboards "produce gaming, not quality." "Permanent rankings… can damage morale of people who would otherwise be steady contributors."

### A38. The Data School — Dot strip plots & jitter plots
https://www.thedataschool.co.uk/alex-briody/dot-strip-plots-jitter-plots/ — Fetched: YES
- "valuable for visualizing individual data points, revealing the distribution and variability… comparing multiple groups… identifying outliers." Add "Median with Quartiles" or a reference line; strip for small n, jitter for large n.

### A39. Smashing — Designing the perfect date and time picker
https://www.smashingmagazine.com/2017/07/designing-perfect-date-time-picker/ — Fetched: YES
- "prepopulate the dates only if you are certain that the user is likely to choose these dates… persist data after a page refresh… add a 'Reset' link." Narrow screens: full-screen overlay; "at most six taps".

### A40. Corroborating sources (fetched, one line each)
- A5 Tufte notes & sketches — http://www.edwardtufte.com/notes-sketches/?msg_id=0001OR — PARTIAL: "data-intense, design-simple, word-sized graphics".
- A11 Datawrapper, Beautiful colors — https://www.datawrapper.de/blog/beautifulcolors/ — YES: "most of your colors are supposed to be more or less equally attention-grabbing"; pure green vs red/orange fails colour-blind readers.
- A14 RevenueCat, Incomplete periods — https://www.revenuecat.com/docs/dashboard-and-metrics/charts/charts-feature-incomplete-periods — PARTIAL: "render incomplete periods distinctly"; it "will always be the current one".
- A16 phData, Adding context to KPIs — https://www.phdata.io/blog/adding-context-to-kpis-in-tableau/ — YES: sparkline with latest/min/max markers; "it is okay to not have the axis set to 0" for a sparkline; separate up/down arrow fields.
- A29 Aubergine, Chronological activity feeds — https://www.aubergine.co/insights/a-guide-to-designing-chronological-activity-feeds — YES: reverse chronological; type icon, timestamp, "New activity indicators".
- A36 Eleken, Empty state UX — https://www.eleken.co/blog-posts/empty-state-ux — YES: "an empty screen is a win. And it deserves to feel like one"; tone must fit context.
- Refactoring UI — https://www.refactoringui.com/ — PARTIAL: "De-emphasize to emphasize", "Don't rely on color alone", "Don't overlook empty states".
- Datawrapper dot/range gallery — https://www.datawrapper.de/academy/examples-of-datawrapper-dot-charts — PARTIAL (gallery only).

---

## PART B — Element specs

Vocabulary: **label** = 12 px sentence case ink-secondary · **value** = Inter 600 · **status pair** = soft-bg + dark-fg, always with a word, only for exceptions · **teal** = interactive only · **terracotta** = time markers only.

### B1. KPI / stat tile with comparison

**Job.** Answer Few's "Compared to what? Is this good or bad?… Are we on track?" (A2) at a glance; a bare number is pitfall #2.

**Anatomy.** (1) Label with the real period: "Dossiers clôturés · 1–7 sept.". (2) Value 36 px (24 px detail), rounded to decision precision (A2 #3, A15). (3) Comparison line — either a delta "▲ +12 % vs 7 j préc." expressed directly as a percentage (A2 #4), or a target shown as a bullet strip (B2), never a second big number (A15 "actual, target, gap"). (4) Optional sparkline (A4): 12–13 points, width ≥ 3 × height so slopes sit near 45°, no axes/frame, last point dotted; the number is already beside it; grey normal band only if a real band exists.

**States.** Neutral delta (≈0) in plain ink (A20). Exception: status pair on the **gap**, not the value (A15 "the gap is the judgment"), always arrow + word (A15, A24, A28). Direction ≠ goodness: arrow = direction, colour = goodness per metric — for "lower is better" (délai, retards) ▼ + success is correct (cf. A1 reversed bands). Small n: if n or previous n < 10, replace "%" with the raw change "+2 (3 → 5)" and always print the count (A18 "Always show raw numbers"). Loading = same-height skeleton; error = "—" with label intact.

**Density.** Padding 16; label→value 4 px; value→comparison 6 px; 3–5 tiles per row (A15, A17, A25); the single ≥48 hero is the number the role acts on (Chiffreur: "à traiter sous 24 h").

**Must-not.** Two big numbers; colour on the value; red/green without a word; seconds or > 1 decimal; percentages at small n; sparkline with axes; comparing a partial period with a full one (A13 like-for-like).

**Sources.** A2, A4, A13, A15, A16, A17, A18, A19, A20, A24, A28.

### B2. Bullet graph (target vs actual)

**Job.** One measure vs target and band in a 16–20 px strip (SLA %, throughput vs objectif). It replaces gauges/donuts: perception "supports only rough comparisons of areas and angles", gauges "fail spectacularly when intended for comparison" (A3; A21).

**Anatomy (A1).** Label left; value at right end (Inter 600, 18–24 px). Scale from zero (0–100 for %); light-grey ticks. Two or three ranges, **one hue, three intensities** — use ink tints (≈12 / 7 / 3 %), darkest = poor; never status colours or multiple hues. Featured bar ≈ 1/3 strip height, navy, over the ranges. Target = short perpendicular ink line, thinner than the bar, drawn behind it; a second comparison (last period) at 75 % strength. Optional lighter projection segment for period targets (A1 p.5).

**States.** Normal = ink only. Exception (bar ends in the poor band / below target past deadline) = status pair on the value text + word ("sous objectif"), not on the bar. Lower-is-better: reverse band order (A1). No target: no marker, caption "sans objectif".

**Density.** Stack strips with a shared scale when units match (A3 fits four people in one gauge's space); fixed label column; 8 px between strips.

**Must-not.** Gauges, donuts, radial progress; > 3 bands; a hue per band; scale not from zero unless the bar becomes a dot (A1); entrance animation.

**Sources.** A1, A2, A3, A10, A21.

### B3. Progress meter / segmented bar (done · late · pending)

**Job.** Composition of a workload in one strip — right when "the focus… is to compare the totals and one part of the totals" (A6): total queue and the late part.

**Anatomy.** 100 % stacked horizontal bar, 8–12 px, radius ≤ 2 px, tile width. **Order is a rule:** the segment the reader must judge sits on the baseline (left) — "Bring the most important value to the bottom… and use color to make it stand out" (A6); floating segments are not comparable (A7). Exception dashboards: **late · pending · done**; completion views (AT day): done first. Colour: only the judged segment takes a status dark-fg, and only if it is > 0; others are ink 20 % / 8 %; never teal. Legend under the bar in the same order with counts: "3 en retard · 12 en cours · 41 terminés · 56 au total"; on-bar labels only for segments ≥ 15 % wide.

**States.** All done: whole bar ink 8 %, legend "0 en retard…". Late = 0: no colour at all. Empty: track + "—". Align the existing Suivi d'équipe meter to this order.

**Must-not.** Diverging/centred stacks (A7); > 4 segments; donut variant; percentages without counts; success-green on "done" (not an exception).

**Sources.** A6, A7, A11, A12, A21.

### B4. Worklist / attention list ("à traiter")

**Job.** Few's step 2 then 3: focus on "items… that need attention", then "drill into additional information… to take action" (A2). Oracle's precedent: alert tiles → distribution → "Top 10 Overdue" list → drill (A26).

**Row (44 px desktop / 48 px mobile, one line).** `[badge] identifier · who · since/deadline · [action]`. Identifier first (tabular numerals); "who" = the one name the role needs (Chiffreur: garage; Gestionnaire: assuré; Admin: assignee). SLA queues show the **countdown** ("échéance dans 3 h", "dépassée depuis 2 h"), not the age; non-SLA lists show age. Deadline < 24 h = terracotta text; past = danger pair + "dépassée". Badge: "a dot when the fact that something changed matters more than how much", a number when the quantity drives the next step (A24); cap "99+". One teal action ("Traiter"); whole row clickable.

**Grouping and cap.** Urgency bands with counted headers — "Dépassées (3)", "Avant 12 h (5)", "Aujourd'hui (7)", "Cette semaine (12)" — deadline ascending inside. Cap 5–7 rows per band, then one "Voir les 12 autres →"; never paginate inside a tile.

**Empty state.** A completion state (A35): headline "Rien en retard", body "Prochaine échéance : demain 09:30 · DOS-2411" in terracotta, icon-sized art at most, tile keeps its height. Intuit: "Nice work! You're all caught up", never "Whoops, there's nothing here" (A35); it "deserves to feel like [a win]" but a back-office stays calm (A36).

**States.** New since last visit: 6 px teal dot before the identifier, cleared on open (A24, A29). Mine vs team: filter chip, not two lists. Loading: 3 skeleton rows.

**Must-not.** Wide tables in a tile; colouring every row; badges without text; showing age when the SLA is a deadline; overdue items below the fold (A2 #9, A19, A20).

**Sources.** A2, A24, A26, A28, A29, A33, A35, A36.

### B5. Trend charts on a dashboard

**Small multiples vs one chart.** One chart (2–3 lines) when readers compare series "at specific points in time"; small multiples "to untangle overlapping lines" or per-person/per-step trends (A8; A3). Same type, size and scale for all — Few #6 explicitly permits a wall of identical small charts. Shrink them (A8); shared y-scale unless the caption says otherwise (A8).

**Line vs bar.** Bars for ≤ 8 periods or when a single period's magnitude matters (A9 "just a few points in time… column chart"); a line for 12–13 weeks of trend (A9). Never both on one axis; no dual axis.

**Window.** 12 or 13 weeks; 13 = a quarter of equal, same-weekday weeks (retail/finance 4-5-4 convention), so week-on-week compares like with like. Caption prints the span: "Sem. 24–36 · 8 juin – 6 sept.".

**Baseline.** Bars start at zero (A12); lines may not, if labelled (A12) — keep zero unless the variation vanishes.

**Direct labelling.** Last value labelled (A4); series named at line end, no legend; highlighted series in one categorical hue, the rest ink 30 % (A8, A11). Target/median = 1 px darker line with an end label; ranges very light (A10).

**"This week so far".** The current period is always incomplete (A14). Do both: (1) draw it in a lighter fill or diagonal stripes — "a long-standing convention for… incomplete data" (A10) — joined by a dashed segment; (2) annotate "sem. en cours (jeu.)" on the axis (A13). No extrapolation unless labelled "projection"; delta tiles compare same weekdays (A13).

**Must-not.** Entrance animation (A22); legends where end labels fit; > 4 lines per panel; area charts (A19); gridlines darker than ink 8 %.

**Sources.** A3, A4, A8, A9, A10, A11, A12, A13, A14, A19, A22.

### B6. Person vs team comparison

**Why not a ranked leaderboard.** Volume leaderboards "produce gaming, not quality"; ranking "roles that depend on teamwork produces… worse collective outcomes"; permanent ranks "damage morale" (A37) — loss adjusting hits all three. Few's team example (A3) judges each person against the same bands, not against each other's rank.

**Element: strip plot with the selected person highlighted.** One horizontal axis per metric (délai moyen, dossiers/semaine, % SLA). Members = unlabelled dots in ink 30 %; the selected person = full ink or indigo (teal stays interactive), labelled with name + value. Team **median** as a 1 px vertical line labelled "médiane équipe 3,2 j" (A38; A10 line styling) — median, because averages hide distributions (A18); optional light quartile band. Jitter colliding dots (A38). Strip 24–32 px; 3–4 strips share a label column.

**"Your median vs team median" tile.** 24 px detail tile: person's median; comparison "médiane équipe 3,2 j · écart −0,6 j" with B1's goodness rule; print n ("sur 47 dossiers"); suppress comparison if n < 10.

**States.** Admin: clicking a dot selects the person (teal hover/focus ring). Team of one: tile only. No data: dot absent, "—", caption "aucun dossier sur la période".

**Must-not.** Ranks, medals, sorted named bars on a shared screen; colouring people by band; other members' names on non-admin dashboards ("vous" vs anonymous dots).

**Sources.** A3, A9, A10, A18, A37, A38.

### B7. Calendar / today strip for field agents

**Job.** "The tech should know their day in seconds" (A31). The agenda list is the home screen; Dynamics 365 makes status update and directions the two quick actions (A30).

**Row.** `time (Inter 600 tabular) · place (quartier, then street) · type (visite garage / expertise / contre-visite) · [status] · [directions]` — Team400's "Job number, customer name, location, status, time window" (A31) trimmed to what the AT needs before opening the dossier. Height ≥ 48 px, ideally 56–64 with two lines; targets 44 pt min, "48x48 better" (A31, A32, A33); ≥ 8 px between interactive elements (A32 "2 mm gaps"). Row tap opens the dossier; directions icon at row end launches the maps app (A30).

**Next appointment.** Exactly one row carries a 3 px terracotta left rule + "Prochain · dans 35 min" (or "En cours"); past rows drop to ink-tertiary. This is the only terracotta on screen.

**Map vs list.** List first; map is a launch-out action, not an embedded preview (A30, A31 "prioritizes the job checklist over navigation tools"). If a preview is wanted: a static thumbnail on the next card only.

**Sunlight contrast.** "For primary mobile actions, aim higher: 7:1" (A34). AT rule: body ink on cream ≥ 7:1, secondary ≥ 4.5:1, no ink-tertiary for must-read text, status dark-fg ≥ 4.5:1 on its soft-bg, no meaning on thin rims. Gloves/one hand (A31) → full-width primary action at the bottom, where targets must be largest (A33: 12 mm / 46 px).

**States.** Offline banner "Hors ligne · dernière synchro 09:12" (A22, A31). Day done: "Journée terminée · 5 visites" + tomorrow's first slot in terracotta. None: "Aucune visite planifiée aujourd'hui" + next date.

**Must-not.** Live map in the list; a week grid on a phone; > 5 bottom-nav items (A33); light-grey metadata; colour-only status (A31).

**Sources.** A22, A30, A31, A32, A33, A34, A35.

### B8. Activity feed / recent changes

**When.** Only where "user activity [is] one of its key elements" (A27): the Admin dashboard, possibly Gestionnaire ("changes on my dossiers by others"). Not on the Chiffreur queue or the AT phone. It is the first tile to cut when the page exceeds one screen (A2 #1).

**Row.** "Actor | verb | (object) [context]" (A27): `Nadia · a validé le chiffrage · DOS-2411 · il y a 12 min`. 16 px type icon in ink-secondary (A29); no avatars; object is the teal link; relative time < 24 h, absolute after.

**Grouping.** Reverse chronological (A29) under 12 px day labels ("Aujourd'hui", "Hier", "Jeudi 4 sept." — sentence case; caps stay reserved to table heads). Aggregate repeats: "Nadia a mis à jour 4 dossiers" with a chevron (A27).

**New since last visit.** A thin ink 30 % rule labelled "Nouveau depuis votre dernière visite (7)" at the boundary; 6 px teal dot per new row (A24, A29). Header indicator = dot, not number, unless the count changes the action (A24).

**Density.** 32 px rows, 8–10 visible, "Voir tout l'historique →"; no infinite scroll in a tile. Live inserts: prepend without motion, or a "3 nouvelles · afficher" pill (A28 insertion rules; A22).

**States.** Empty: "Aucune activité aujourd'hui" — neutral "no info" type (A35).

**Must-not.** Rows coloured by event type; feeds on queue dashboards; avatars; auto-scroll.

**Sources.** A2, A22, A24, A27, A28, A29, A35.

### B9. Period selector and "as of" freshness stamp

**Selector.** Segmented control **Aujourd'hui · 7 j · 30 j** + "Personnalisé…". Defaults: 7 j (Gestionnaire, Admin), Aujourd'hui (Chiffreur, AT); persist across refresh, offer reset (A39). Top-right of the page header on the title line (A20, A25). Page-level: it "affects the whole page… every single chart at once" (A20); tiles that ignore it say "en temps réel". Not sticky — dashboards fit one screen (A2 #1); instead **every caption prints the real period**. Comparison basis lives in the delta line ("vs 7 j préc."); "vs N-1" only where seasonality matters (A20). Mobile: full-width under the title; custom range in a bottom sheet (A39, A25).

**Freshness stamp.** "Show a visible 'data as of' timestamp on every dashboard" (A23): "Données au 6 sept. 14:32" = max data timestamp, not render time (A23); live views "En direct · 14:32" (no seconds, A2 #3). 12 px ink-secondary right of the selector; caption under the title on mobile. Set a freshness SLA per dashboard (A23, e.g. 15 min for queues); when breached the stamp takes the warning pair + "données anciennes" + refresh (A22 widget). Offline: "Hors ligne · dernière synchro 09:12" (A22, A31).

**Must-not.** Picker-only ranges; seconds; "last updated" that is really "page loaded"; hiding that a tile ignores the period; two period controls per page.

**Sources.** A2, A20, A22, A23, A25, A31, A39.

### B10. Layout grid for a role dashboard

**Row plan.** Few: big picture → attention items → drill (A2); top-left first (A2 #9, A19, A20, A22); Setproduct's order corroborates (A25).

| Row | Content | Note |
|---|---|---|
| 0 | Title · period selector · freshness stamp | 48 px |
| 1 | **Exceptions first:** ≥48 hero + 2–4 headline tiles (36 px) | "3–4 KPIs at max" (A17), ceiling five (A15) |
| 2 | **Worklist** (left) + bullet/meter tiles (right) | tallest row; the action gateway |
| 3 | **Trends last:** weekly line / small multiples, team strips | chart row |
| (4) | Activity feed — Admin only | optional |

Three content rows fit 1366×768 without scrolling (A2 #1). A fourth row's worth of content goes to the role's full page behind "Voir tout →".

**12 columns.** Card padding 24, gutter 16–24, tile padding 16. Row 1: 4+4+4 or 3+3+3+3 — **tile rows end on a full row**; five metrics → demote one to a 24 px detail tile, or 6+6 over two rows (ragged rows read as "stretched to fill", A2 #13). Row 2: worklist 8 + meters 4 (Admin 7 + 5). Row 3: chart 8 + strips 4, or three 4-col small multiples on a shared scale (A8). Equal heights per row; charts take the widest column (45° rule, A4). Left → right = most actionable → most contextual (A2, A20); a measure sits beside its trend (A2 #9).

**Mobile stacking (A20, A25).** One column: title → period control → hero → worklist (5 rows + link) → the one meter that matters → headline tiles as a 2×2 grid of 24 px detail tiles → trend (last point labelled only) → rest behind "Plus"; filters in a sheet. Never stack four 36 px tiles above the worklist.

**Consistency.** Same tile anatomy and chart type for the same job on all four dashboards (A2 #6); one accent; colour only on exceptions (A2 #12).

**Must-not.** Logo/nav in the top-left (A2 #9); horizontal scrolling rows; five tile widths; trends above the worklist; more than one hero; a desktop dashboard that scrolls when a link would do.

**Sources.** A2, A4, A8, A15, A17, A19, A20, A22, A25.

---

## PART C — Open questions for the owner

**C1. Baseline segment of the done/late/pending meter.** (a) late first everywhere; (b) done first everywhere; (c) late-first on desk/Admin dashboards, done-first on the AT strip. **Recommend (c)** — desk views are exception views, the AT strip is a completion view (A6 rule applies to whichever is judged).

**C2. Trend window.** (a) 12 weeks ("3 mois", matches Suivi d'équipe); (b) 13 weeks (a quarter of equal weeks); (c) 8 weeks as bars. **Recommend (b)** if management reports by quarter, else keep (a).

**C3. Team dots on non-admin dashboards.** (a) anonymous grey dots + median; (b) "vous vs médiane" tile only; (c) nothing outside Admin. **Recommend (a)** — distribution without a leaderboard (A37).

**C4. Colour on deltas.** (a) every up/down coloured (industry default, noisy); (b) colour only when a target/SLA band is breached, plain-ink arrows otherwise; (c) danger only, never success. **Recommend (b)** — matches the locked "only when there IS an exception" rule and Few #12; (c) is a stricter acceptable variant.

**C5. Activity feed placement.** (a) Admin only; (b) Admin + Gestionnaire; (c) dossier history tab only. **Recommend (a)**; add (b) only if Gestionnaires ask "who touched my dossier".

---

## PART D — Could not fetch

| Source | URL | Reason |
|---|---|---|
| Few — Sparklines for dashboards | https://www.perceptualedge.com/articles/visual_business_intelligence/sparklines_for_dashboards.pdf | 404 |
| Few — Dashboard Design for At-a-Glance Monitoring (course deck) | https://www.perceptualedge.com/files/Dashboard_Design_Course.pdf | > 10 MB fetch limit |
| Tableau blog — Few riffs on bullet graphs | https://www.tableau.com/blog/stephen-few-riffs-bullet-graphs | 403 |
| Data Revelations — In praise of BANs | https://www.datarevelations.com/bans/ | 403 (A17 used instead) |
| Storytelling with Data — sparkline / pie / horizontal-bar posts | guessed URLs under /blog/2020/2/18, /2011/11, /2012/09 | 404 (A12 fetched) |
| Datawrapper — dot plots blog | https://www.datawrapper.de/blog/dotplots/ | 404 (A9, A38 cover it) |
| Smashing — Dashboard design UX patterns (2022) | https://www.smashingmagazine.com/2022/04/dashboard-design-ux-patterns/ | 404 |
| Domo — Cleveland dot plot | https://www.domo.com/learn/charts/cleveland-dot-plot | 405 |
| Design Bootcamp (Medium) — Work list UX friction | http://medium.com/design-bootcamp/work-list-ux-friction-list-management-f588b937cbad | 403 paywall |
| NN/g — Anatomy of a list entry | https://www.nngroup.com/articles/the-anatomy-of-a-list-entry/ | 404 (quoted second-hand in docs/research/mes-rappels-queue.md) |
| Material 3 — Accessibility basics | https://m3.material.io/foundations/accessible-design/accessibility-basics | 404 (A32/A33 give the same 44/48 px from primary research) |
| Geckoboard — Build a dashboard people actually use | https://www.geckoboard.com/best-practice/dashboard-design/build-a-dashboard-that-people-actually-use/ | 404 (A19 fetched) |
| Reddit r/PowerBI, r/UXDesign arrow-colour threads | search only | No fetchable Reddit page; Fabric community threads confirm "green up / red down" is the naive default the spec overrides per metric. |
