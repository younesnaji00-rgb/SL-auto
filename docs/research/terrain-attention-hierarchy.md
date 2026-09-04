# Visual Hierarchy & Attention Theory — research for "Missions terrain" (/assignations-atg)

Dimension: what should command attention first on a deadline-driven dispatch list, through which channel, and how much salience one screen can sustain. All sources below were actually fetched and read (some via r.jina.ai when the origin returned 403). Judgements from training knowledge are flagged.

## Findings

### F1. The F-pattern is a *failure state*, not a layout target — it appears when the design gives no cues
Source: https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/ (NN/g, Pernice)
"The F-pattern is the default pattern when there are no strong cues to attract the eyes." It occurs with unformatted, undifferentiated content, and is harmful: "Users may skip important content simply because it appears on the right side." Remedies NN/g gives: front-load important points, use descriptive headings that stand alone, bold key phrases, group related content visually. A 12-column table where all cells look alike is exactly the "no strong cues" condition that triggers F-scanning — meaning the right half of the table barely gets read.

### F2. Layer-cake scanning (headings first, dive on match) is the most effective pattern — group headers are the primary scan anchors
Source: https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/ (NN/g)
Of the four observed patterns (F, spotted, layer-cake, commitment), layer-cake — fixations concentrated on headings/subheadings — is "by far the most effective way in which users can scan pages" short of reading everything. Design guidance: chunk content into sections, use "meaningful subheadings" and "special visual styling for keywords." The spotted pattern (jumping to visually distinct words) works when "important words look different." Directly validates the Aujourd'hui / En retard / À venir grouping: the group headers, not the rows, are what an operator scans first — so headers must visually dominate rows.

### F3. Scanning is task-optimized; consistency and predictable positions are what make repeat scanning fast
Source: https://www.nngroup.com/articles/eyetracking-tasks-efficient-scanning/ (NN/g)
"The same page will be processed differently by the same user when her goal changes." Users follow the principle of least effort and "will try to be as efficient as possible." Guidance: "Be consistent with the position and layout of items in the list"; "Use large, bold text and white space surrounding it to attract the eye"; "Predictable, unambiguous patterns help users get to an optimal scanning algorithm fast." For a daily-use operational tool, users build a scanning algorithm — the design's job is to keep every row and every group identically structured so that algorithm keeps working.

### F4. Horizontal attention leans hard left: ~80% of viewing time on the left half of the page
Source: https://www.nngroup.com/articles/horizontal-attention-leans-left/ (NN/g eyetracking)
Users spend 80% of viewing time on the left half, 20% on the right. "Priority content should be front and center, keeping in mind that the right side of the page garners a lot less attention than the left." Columns 8–12 of a 12-column table are in the attention dead zone; anything decision-critical placed there will be missed.

### F5. Von Restorff / isolation effect: one distinctive item is remembered — but only with restraint, and never via color alone
Source: https://lawsofux.com/von-restorff-effect/ (Laws of UX, Yablonski)
"Make important information or key actions visually distinctive." Cautions: "Use restraint when placing emphasis on visual elements to avoid them competing with one another"; "Don't exclude those with a color vision deficiency or low vision by relying exclusively on color"; "Carefully consider users with motion sensitivity when using motion to communicate contrast." The effect exists *because* the item is isolated — a second and third emphasized item taxes the first. The design system's "one solid terracotta block max per list" rule is a codified Von Restorff constraint.

### F6. Preattentive attributes: hue, intensity, and 2-D position are the fast channels — and emphasis has a hard budget
Source: https://www.perceptualedge.com/articles/ie/visual_perception.pdf (Stephen Few, "Tapping the Power of Visual Perception")
Preattentive perception "does not involve conscious thought; it is automatic and immediate." Position and hue are the strongest attributes for making something pop out; intensity (dark vs. light) and size follow. Few's repeated constraint is restraint: use only a handful of distinct colors, and over-emphasis is self-defeating — once everything is emphasized, nothing stands out (paraphrase of Few's argument; the PDF's worked examples show a single hue against muted gray context). Implication: a countdown chip only works preattentively if the surrounding row is genuinely quiet.

### F7. Practitioner channel ranking: weight + color beat size; 2–3 text colors and 2 weights are enough
Source: https://r.jina.ai/https://medium.com/refactoring-ui/7-practical-tips-for-cheating-at-design-40c736799886 (Wathan & Schoger, Refactoring UI)
Instead of scaling font size for hierarchy, "try using color or font weight to do the same job." Concretely: "stick to two or three colors" (dark for primary, grey for secondary, lighter grey for ancillary) and "two font weights is usually enough" (400–500 normal, 600–700 emphasis). This maps exactly onto the ink ladder: primary cell = ink-1 semibold, secondary = ink-2 regular, metadata = ink-3. Size stays constant across the table; hierarchy comes from weight and ink shade.

### F8. "Rainbow tables" of status badges destroy actionability; only action-required statuses deserve strong treatment
Source: https://r.jina.ai/https://uxmovement.medium.com/the-right-way-to-design-table-status-badges-31f65a927dab (UX Movement)
Excessive color-coding creates a "pixelated rainbow" where "it's hard to recognize which data requires immediate action." Fix: "a visual hierarchy so users can differentiate which statuses they need to act on over ones they don't," combining color with "shape and symbolic contrast." "High-priority statuses are time-sensitive and require action from the user" (their examples: Overdue, Failed) — those get the strong treatment; neutral statuses get outline/ghost styling. "Color coding isn't enough" alone — add fill/shape/text differences.

### F9. Alert density has a practical ceiling; the two-second test
Source: https://r.jina.ai/https://uxdesign.cc/how-to-design-to-alert-users-without-overwhelming-them-4bb41feda9f0 (Kai Wong, UX Collective)
When technicians see multiple alerts "all marked red with 'high priority,'" they cannot rank them. One well-designed alert works; "displaying ten of them on one screen would quickly overwhelm users, causing them to miss critical information." Alarm fatigue: too many alerts desensitize users until they miss real dangers. Acceptance test: "Show it to someone for two seconds and ask: 'What needs attention first?'" — if they can't answer, the screen has an attention problem.

### F10. Alarm-fatigue literature corroborates tiering and rationing of red
Source (search-level corroboration; individual pages summarized in search results): https://fuselabcreative.com/manufacturing-dashboard-ux-design/ and https://www.encardio.com/blog/solving-alert-fatigue-in-infrastructure-monitoring (via WebSearch snippets — not fully fetched, treat as secondary)
Operational dashboards must "distinguish advisory, high, and urgent notifications by color, size, and position"; when a signal is wrong or constant, "the brain learns to discount it, and both response rate and response speed fall." Reinforces F9: "En retard" red must stay rare and true.

### F11. Identifier belongs in the first column; row styling is for place-keeping, not decoration
Source: https://www.andrewcoyle.com/blog/design-better-data-tables (Andrew Coyle)
"It is good practice to place identifier data in the first column." Density trade-off: "Smaller row height enables the user to view more data... However, it affects scannability leading to parsing errors"; many good tables let users control density. "Alternating rows (aka zebra stripes) help users keep their place when scanning long horizontal datasets"; "Line divisions help users keep their place." Wide 12-column rows need place-keeping support (row lines or hover highlight) precisely because the eye travels far horizontally.

### F12. Equal visual weight across columns is a named failure mode; conditionally format only the 2–3 decision columns
Source: https://wpmanageninja.com/designing-big-data-tables/
"Type consistency that makes a UI look coherent makes it impossible to scan when every column carries the same visual weight." And: "Applying conditional formatting to the two or three columns that carry the most decision-relevant values produces a scannable table. Applying it everywhere creates visual noise." This is the direct answer to Q3: yes, it is a real, named failure mode, and the researched remedy is emphasis rationed to the decision columns plus de-emphasis of the rest.

### F13. Triage systems order by acuity — most urgent first — and re-assess continuously
Source: https://www.ncbi.nlm.nih.gov/books/NBK557583/ (StatPearls, Emergency Department Triage)
Triage exists to "categorize patients based on the severity of their injuries and, by extension, the order in which multiple patients require care and monitoring." Highest acuity is seen first (ESI 1 = most urgent; red tag = immediate). Statuses are dynamic: "a patient can change triage statuses with time," so systems re-assess as waits lengthen. Mapped to dispatch: an overdue mission is the highest-acuity item; a mature triage view puts it first and lets items migrate between groups as clocks run.

### F14. The mere-urgency effect: deadlines capture attention over importance — design should surface both
Source: https://r.jina.ai/http://www1.psych.purdue.edu/~gfrancis/Classes/PSY392/ZhuEtAl2018.pdf (Zhu, Yang & Hsee, Journal of Consumer Research 2018)
"People are more likely to perform unimportant tasks (i.e., tasks with objectively lower payoffs) over important tasks" when urgency is present; under urgency, participants "paid significantly more attention to task expiration time... and significantly less attention to the bonus amounts." The effect disappears when payoffs are made salient: highlighting payoffs cut low-value-urgent choices from 33.7% to 20.6%. Two-sided implication: countdown chips will powerfully steer field agents (urgency is preattentive bait — here that is desirable, since the 24-business-hour SLA *is* the business priority), but if some missions matter more than others (e.g., mission type, compagnie SLA), that importance must be visible next to the clock or agents will cherry-pick by timer alone.

### F15. Left-aligned text/badges scan best; minimal separators
Source: https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables (Pencil & Paper) — fetched; hierarchy content thinner than hoped. What it does say: left-align text, right-align numbers; column separators "a very thin border of 1px max and a light grey colour"; minimize visual noise. Secondary corroboration from the Emplifi Soul design system (search snippet, not fully fetched): "Always align the badge to the left in a table for better readability when visually scanning the page," and "Only one badge is allowed per row."

## Could not fetch
- https://uxmovement.substack.com/p/how-to-simplify-a-massive-19-column and https://uxmovement.substack.com/p/the-easiest-way-to-condense-a-wide — paywalled past the intro; only the framing ("trying to display everything at once within a single view" is the core mistake; the fix reduces columns "without removing any data", i.e. cell stacking) was readable.
- https://medium.com/refactoring-ui/7-practical-tips-for-cheating-at-design-40c736799886 and https://uxdesign.cc/how-to-design-to-alert-users-without-overwhelming-them-4bb41feda9f0 — direct fetch 403; succeeded via r.jina.ai (cited above).
- Emplifi Soul badge usage page and the fuselab/encardio alarm-fatigue pages — used only at search-snippet level, marked secondary above.
- No genuine Reddit/HN thread on dispatch-table hierarchy surfaced in searches; nothing cited from there.

## Implications for Missions terrain

1. **Group order: En retard first, then Aujourd'hui, then À venir** (F13, F14, F9). Triage logic is unambiguous: highest acuity leads, and the mere-urgency effect means whatever sits on top gets worked. For the admin/gestionnaire monitoring lateness, overdue-first is correct. Real choice for the *field agent* view: an AT planning their day may legitimately need Aujourd'hui first (route-building), with En retard folded in. Option A (recommended): En retard group first for all roles — it's usually small or empty, so on a good day the screen still opens on Aujourd'hui content with an empty/collapsed overdue group costing one header row. Option B: Aujourd'hui first + a persistent "N missions en retard" pill at the top that jumps/expands the En retard group. Do not bury En retard below À venir under any option.

2. **The first attention anchor should be the En retard group header count, delivered by position + weight, not by more color** (F2, F6, F7). Layer-cake scanning means operators read headers before rows: make each group header a strong horizontal band — 12px sentence-case label per the locked system, plus a bold ink-1 count ("En retard · 3"). Only the En retard count may carry danger color, and only when nonzero. Sticky group headers on scroll support re-orientation (F3, F11).

3. **Kill the equal-weight table: exactly 2–3 emphasized columns** (F12, F7, F11). Emphasize: Dossier ref (first column, ink-1, semibold — the identifier, F11), Date RDV + countdown chip (the decision value), and — desktop/dispatcher only — Agent. Everything else drops to ink-2 regular; Créé le / Créé par / Assigné par drop to ink-3 and are candidates for progressive disclosure (hide behind the row's detail page or a column-visibility control) — they are audit metadata, not dispatch data. Same size everywhere; hierarchy via weight and ink shade only.

4. **Collapse 12 columns toward ~7 slots by stacking related pairs in one cell** (F1, F4, UX Movement framing in Could-not-fetch): Assuré over Immatriculation; Zone over Adresse; Créé le over Créé par (ink-3, or removed). 12 single-value columns guarantees the right half falls in the 20%-attention dead zone (F4) and triggers default F-scanning (F1). Stacked cells keep all data "without removing any data" while pulling the table's width back into the attended zone.

5. **Deadline lives left-of-center, beside the identifier — not at the right edge** (F4, F1). With 80% of gaze on the left half, the countdown chip's column (Date RDV) should sit in position 2–3, right after Dossier ref (or after Assuré at worst). The right edge is the worst place on desktop for the one value that drives every decision. On mobile cards the geometry is compact enough that a chip in the card's top corner works, but leading placement (top-left, after/under the ref) is the safer default for glare/glove conditions.

6. **Ration the danger channel; make neutral chips truly neutral** (F5, F6, F8, F9, F10). The countdown ramp (neutral → warning → danger → En retard) only works if the neutral state is quiet: plain ink-3 text or a ghost outline chip, no fill. Warning gets a tinted chip; danger/En retard gets the only strong semantic fill in the row. If an entire group is overdue, do not paint a wall of red rows — the group header carries the red count and each row carries one compact red chip; row backgrounds stay cream (accent-tinted rows are banned anyway). One solid terracotta block (next RDV) + red only where truly late respects both the Von Restorff budget and the locked palette.

7. **Chips must encode redundantly — color + text (+ optional shape/fill difference), never color alone** (F5, F8). Field agents in sunlight and any color-vision-deficient user must read "3h restantes" / "En retard" as text; the danger state should also differ in fill (solid vs. outline) from the warning state, per UX Movement's shape/symbolic-contrast guidance.

8. **Identical row anatomy across all three groups, both tabs, and every visit** (F3). Same column order, same chip position, same stacking — operators build a scanning algorithm on day one; any per-group variation breaks it. Zebra striping or subtle row lines plus hover highlight for the wide desktop rows (F11) so the eye can travel from ref to phone number without losing the row.

9. **Motion is off the table as an attention channel** (F5 caution; consistent with the project's motion spec). No pulsing/blinking on overdue chips — motion is the strongest but most fatiguing channel and Laws of UX flags motion-sensitivity; position + hue + weight already carry the hierarchy.

10. **If missions differ in importance, show it next to the clock** (F14). Should some compagnies or mission types outrank others, that signal (even just a small ink-1 semibold tag) must sit adjacent to the countdown chip, or the mere-urgency effect predicts agents will sequence purely by timer.

11. **Acceptance test: the two-second test** (F9). Show the rendered list to someone for two seconds and ask "What needs attention first?" The correct answer must be: the En retard count (if any), else the terracotta next-RDV block. If they name anything else — a filter, a column header, a phone number — the salience budget is misallocated.
