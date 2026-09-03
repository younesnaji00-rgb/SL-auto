# Visual hierarchy & attention — filter toolbar + data table (Consultation page)

Research round 2026-09-03. Topic: what commands attention first and in what order on a
filter-toolbar + data-table page, and whether that order serves the page's task
(« find one dossier »). Sources fetched live via WebSearch/WebFetch; quotes are from the
fetched pages. Training-knowledge claims are flagged inline. Page under diagnosis:
`SL-auto-main\src\app\(app)\consultation\client-page.tsx` (+ `page.tsx` header,
`components/ui/table.tsx` primitives), against the binding rules in
`docs\element-specs.md` addendum B (three dominance levels; ink first / weight second /
size last; proximity beats similarity).

---

## 1. Theory findings (fetched)

### 1.1 Preattentive processing — Healey (NCSU perception page)
URL: https://www.csc2.ncsu.edu/faculty/healey/PP/index.html

- Timing: "Typically, tasks that can be performed on large multi-element displays in
  less than 200 to 250 milliseconds (msec) are considered preattentive."
- Set-size independence: preattentive tasks show "task completion time is relatively
  constant and below some chosen threshold, independent of the number of distractors."
  → a UNIQUE hue/weight target is found instantly no matter how many table rows.
- Conjunctions break it: "A target made up of a combination of non-unique features (a
  conjunction target) normally cannot be detected preattentively." Serial search then
  costs ~25–40 ms per object — i.e., reading the table row by row.
- Feature hierarchy: hue dominates form ("Background variations in colour interfere
  with a viewer's ability to identify the presence of individual shapes"); luminance
  dominates hue (Callaghan); hue dominates texture. → on a cream page, a colored chip
  column wins the first glance over any weight/size difference in text.

### 1.2 Ware (via Few's article, which quotes Ware's preface verbatim)
URL: https://www.perceptualedge.com/articles/ie/visual_perception.pdf (fetched, full PDF)

- Ware, *Information Visualization: Perception for Design*, preface: "We can easily see
  patterns presented in certain ways, but if they are presented in other ways, they
  become invisible.... Following perception-based rules, we can present our data in such
  a way that the important and informative patterns stand out. If we disobey the rules,
  our data will be incomprehensible or misleading."
- Few: "Preattentive perception is done in parallel, but attentive processing is done
  serially and is, therefore, much slower." His figure-3/4 demo: finding 5s among gray
  digits is serial; make the 5s a different color and "perception was easy and
  immediate."
- Few on working memory: sense-making runs on "short-term memory that can only hold
  from three to seven chunks of data at a time. This limitation must be considered when
  designing data presentations." (Nine colored lines force legend↔line shuttling.)
- Few's preattentive attribute inventory for data displays: form (orientation, line
  length/width, size, shape, curvature, added marks, **enclosure**), color (intensity,
  hue), spatial position. "These visual attributes aren't perceptually equal. Some are
  perceptually stronger than others." Hue groups better than orientation (his Fig. 7).

### 1.3 Eyetracking scanning patterns — NN/g (Pernice)
URLs: https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/ ·
https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/

- F-pattern: "Users first read in a horizontal movement, usually across the upper part
  of the content area", a second shorter bar, then "scan the content's left side in a
  vertical movement." It appears when text "has little or no formatting for the web"
  and users want efficiency. Cost: "When people scan in an F-shape, they miss big
  chunks of content based merely on how text flows in a column… users may skip
  important content simply because it appears on the right side of the page."
- Other patterns: **spotted** — fixating words that "visually stand out in the text" or
  "resemble a word that the user looks for" (this is exactly plate/ref lookup);
  **layer-cake** — headings only, "by far the most effective way in which users can
  scan pages"; **commitment** — "users fixate on all or most content words" only under
  high motivation.
- Countermeasures: front-load important words, headings, bolded keywords — i.e., give
  the spotted-scanner targets that pop.

### 1.4 Left-of-centre attention — NN/g
URL: https://www.nngroup.com/articles/horizontal-attention-leans-left/

- "80% of the fixations fell on the left half of the screen"; on SERPs "almost all
  fixations (94%) fell on the left side of the page", 60% within the leftmost 400 px.
- Wider screens barely move this: "a 900-pixel increase in screen width has only
  shifted users' peak attention about 200 pixels to the right."
- Implication: "Priority content should be front and center… the very leftmost area
  should be reserved for navigation." Anything essential at the right edge needs extra
  weight (already codified in element-specs B).

### 1.5 Visual hierarchy & dominance levels
URLs: https://www.nngroup.com/articles/visual-hierarchy-ux-definition/ ·
https://www.smashingmagazine.com/2015/02/design-principles-dominance-focal-points-hierarchy/ ·
https://vanseodesign.com/web-design/visual-hierarchy/

- NN/g definition: hierarchy is "the organization of the design elements on the page so
  that the eye is guided to consume each design element in the order of intended
  importance." Key nuance: "It's not the actual color of an element that creates the
  hierarchy, but rather the contrast in value and saturation between the element and
  the context." Quantity rules: ≤ 3 contrast variations, ≤ 3 sizes, ≤ 2 large elements.
- Bradley (Smashing): "The more dominant element will attract the eye and get noticed
  first." Three levels — dominant / sub-dominant / subordinate ("It should recede into
  background to some degree"). "Three is a good number. As a general rule, people can
  perceive three levels of dominance." And: "You can't emphasize everything. It defeats
  the point… all of your design elements compete for attention and nothing stands out."
  Also: "The top of the hierarchy (the dominant element) should help to answer
  questions a visitor might immediately have upon landing on the page."
- Bradley (vanseodesign) visual-weight levers: "larger elements carry more weight";
  "Red seems to be heaviest while yellow seems to be lightest"; "Packing more elements
  into a given space, gives more weight to that space" (density); "A darker object will
  have more weight than a lighter object" (value); "Positive space weighs more than
  negative space." Repetition = equal status: "Repetition instantly communicates that
  elements are at the same level in the hierarchy."

### 1.6 Von Restorff / isolation effect — Laws of UX
URL: https://lawsofux.com/von-restorff-effect/

- "When multiple similar objects are present, the one that differs from the rest is
  most likely to be remembered." Takeaways: "Make important information or key actions
  visually distinctive" and "Use restraint when placing emphasis on visual elements to
  avoid them competing with one another." (Corroborates the addendum-C rule that
  terracotta's power is its exclusivity.)

### 1.7 Gestalt grouping — NN/g
URLs: https://www.nngroup.com/articles/gestalt-proximity/ ·
https://www.nngroup.com/articles/common-region/

- Proximity: "Items close together are likely to be perceived as part of the same
  group"; it "can overpower competing visual cues such as similarity of color or
  shape." Whitespace is the tool: "Using varying amounts of whitespace to either unite
  or separate elements is key to communicating meaningful groupings." Warning both
  ways: "grouping together unrelated elements may camouflage them from users" and
  "far-away items can be easily overlooked by task-focused users."
- Common region: "Items within a boundary are perceived as a group"; "a strong visual
  cue that can overpower other grouping principles such as proximity or similarity."
  But: "When possible, using whitespace alone to create clear groupings reduces the
  visual complexity of a design." → the table's Card is a common region; the toolbar
  correctly has none (whitespace only).

### 1.8 Information scent — NN/g
URL: https://www.nngroup.com/articles/information-scent/

- Scent = "the user's imperfect estimate of the value that the source will deliver to
  the user, derived from a representation of the source." Users pick a path from "(1)
  how likely it is that the page will provide an answer… and (2) how long it's going to
  take to get the answer."
- "The link label, the content that accompanies the link, the context in which the link
  appears, and any background knowledge… all influence the information scent."
  → for a lookup page, the search placeholder («Réf., assuré, matricule…») and column
  headers ARE the scent carriers; generic labels weaken scent.

### 1.9 Banner blindness — NN/g
URL: https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/

- "people's tendency to ignore page elements that they perceive (correctly or
  incorrectly) to be ads" — driven by selective attention. Triggers: "Ad-specific
  placement, like the top of page or the right rail"; ad-like visual design (a user
  ignored a promo for its "Small, rectangular shape in the middle of text" with
  "Colored (blue) background"); proximity to ads. Legitimate content suffers: "big
  images, graphics, or other elements that stand out" get skipped, and "ads can cause
  users to look away from an area and not return to it again."
- Applied to toolbars (my inference, flagged): a toolbar is chrome, not ad-like, and
  sits where users EXPECT controls, so it is not blindness-prone — but a brightly
  colored promotional-looking band above a table would be. The current neutral toolbar
  is on the right side of this research.

### 1.10 Cognitive load — NN/g (Whitenton)
URL: https://www.nngroup.com/articles/minimize-cognitive-load/

- Intrinsic load: "the effort of absorbing that new information and of keeping track of
  their own goals." Extraneous load: "processing that takes up mental resources, but
  doesn't actually help users understand the content (for example, different font
  styles that don't convey any unique meaning)."
- Culprits: "redundant links, irrelevant images, and meaningless typography
  flourishes"; unfamiliar labels/layouts. Remedies: cut clutter, "build on existing
  mental models", offload (defaults, pre-fill).

### 1.11 Progressive disclosure — NN/g (Nielsen)
URL: https://www.nngroup.com/articles/progressive-disclosure/

- "Initially, show users only a few of the most important options… Offer a larger set
  of specialized options upon request."
- The balance: "You have to disclose everything that users frequently need up front, so
  that they have to progress to the secondary display only on rare occasions" but "the
  primary list can't contain too many options or you'll fail to sufficiently focus
  users' attention." Decide by "frequency-of-use statistics" / task analysis.
- Benefits: "learnability, efficiency of use, and error rate."

### 1.12 Squint test — LukeW + search corroboration
URLs: https://www.lukew.com/ff/entry.asp?2013= (fetched) ·
https://polypane.app/blog/debug-your-visual-hierarchy-with-the-squint-test/ ·
https://www.nngroup.com/videos/squint-test/ (search results; not fetched in full)

- LukeW: "Just squint. This will blur the design just enough to quickly identify if the
  important elements stand out." Method: blur → note what survives (contrast, size,
  brightness) → compare against the INTENDED hierarchy. Limits (from search synthesis):
  not a substitute for usability testing; doesn't cover colorblindness.

### 1.13 Sticky headers & frozen columns — Pencil & Paper + search synthesis
URLs: https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
(fetched) · https://www.setproduct.com/blog/data-table-ui-design ·
https://ninjatables.com/sticky-headers-vs-fixed-columns/ (search snippets)

- P&P: "Having a sticky header is a great way to allow the user to keep context and
  navigate easily across the table." And: "In a horizontal scroll situation, having the
  leftmost column 'sticky' is just as important as the fixed header is for the regular
  vertical scroll."
- P&P on row noise: "Vertical separators can make the table become visually busy…
  stick to a very thin border of 1px max and a light grey colour."
- Search synthesis (setproduct/ninjatables): the sticky header exists so users don't
  "scroll back up just to remember which column they are reading"; the frozen ID
  column means "people never lose track of which row a far-right value belongs to";
  add "a subtle shadow on the frozen edge" and watch stacking order. (The specific
  "reads as a layer, not a seam" phrasing lives in the app's own element-specs, sourced
  from P&P in the earlier pass; the fetched P&P page today did not surface that exact
  sentence — flagged.)

### 1.14 First fixations on data-heavy pages — search-level evidence only
URLs (search snippets; full articles NOT fetched — Medium 403):
https://medium.com/@smorrolf/dashboard-vision-what-eye-tracking-reveals-about-how-we-actually-use-dashboards-d2135cb0d425 ·
https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards ·
https://imotions.com/blog/learning/10-terms-metrics-eye-tracking/

- Dashboard eyetracking (snippet): "text — especially numbers — dominates user
  attention. Numbers were the most visually dominant elements, attracting the highest
  focus across all dashboards." And "Since the top left area gets more attention,
  that's where you want to showcase the most global numbers, or the most relevant
  data." Treat as SECONDARY (snippet-level, article body unverified).
- iMotions (snippet): Time To First Fixation "indicates the amount of time that it
  takes a respondent… to look at a specific area of interest from stimulus onset."

---

## 2. Diagnosed attention order — Consultation page as coded

Page anatomy (from `client-page.tsx` / `page.tsx` / `table.tsx`): PageHeader
(«Consultation» 30/700 + ink-2 subtitle) → [danger Alert if fetch error] → toolbar
(search `max-w-sm flex-grow` with icon, 3 selects `w-[180px]`, DateRangeFilter, all
`gap-2`) → applied-filter chips row (neutral chips + « Tout réinitialiser » link, only
when filters active) → Card containing the 8-column table (sticky bold `t-mono`
Réf. expert with frozen-edge shadow, Assuré `font-medium`, 4 plain columns, StatusChip
column 6, `t-mono` Matricule, date) → « Afficher plus » outline button + `t-caption`
total with semibold counts.

**Predicted first-time fixation order (squint-level, data present, no error):**

1. **The status-chip column (col 6)** — a repeating band of soft-tinted colored
   enclosures on a cream ground. Healey: hue dominates form; Bradley: density adds
   weight ("packing more elements into a given space gives more weight"); Few:
   enclosure + hue are both preattentive. Repetition down the column builds a colored
   texture stripe that survives the squint. Nothing else on the page has hue.
2. **The page title** — 30/700 full ink top-left; largest dark text, at the F-pattern
   / left-bias origin. (On a tall data-filled viewport the chip band's total colored
   area exceeds the title's; on first paint above the fold they compete, but hue >
   value at equal salience per Healey's hierarchy.)
3. **Header row + the bold left Réf. column** — the darkest text mass; the sticky
   column's semibold mono forms a strong left rail (exactly where 80 % of fixations
   land).
4. **The search field** — leftmost, widest toolbar item (size cue), icon + border.
5. **The select strip + date range** — uniform 180 px boxes; repetition correctly says
   "same level" (Bradley), and they recede as level-3.
6. **Chips row / footer caption / « Afficher plus »** — subordinate; the semibold
   count numbers give the caption a small, correct pop (numbers attract fixation per
   the dashboard-snippet evidence).

**With a fetch error:** the danger Alert wins fixation #1 — correct (alarm hue is the
one legitimate top-position hue per Few's alarm rule already in addendum C).

**Is this the right order for « find one dossier »?** The ideal order for the task is:
title (orient, one fixation) → search box (fastest scent-rich path: type ref/name/
plate) → left identifier rail (spotted-pattern vertical scan) → confirm on Assuré /
Matricule → open row. The current page gets positions 2–5 essentially right: search is
leftmost and widest; the identifier rail is bold, mono, frozen, left. The one inversion
is #1: the STATUS column — irrelevant to a lookup task — carries the page's only hue
and therefore its strongest preattentive signal. Mitigating facts: (a) chips are
soft-bg (value-muted, and NN/g says contrast in value/saturation, not hue itself,
builds hierarchy — muted tints cost less than solid fills); (b) the column sits
right-of-centre, OFF the 80 %-left scan lane, so it distracts the periphery more than
the path; (c) status IS the second cell of the sanctioned 2-cell emphasis budget, and
for the sibling queue pages the same column is task-relevant. So this is a tension to
manage, not a violation.

**Secondary findings:**

- **Three weighted cells per row, not two.** Réf (semibold) + StatusChip is the
  sanctioned budget; `Assuré` also carries `font-medium`. Bradley: "You can't
  emphasize everything"; addendum ter A: "The identifier is the row's ONLY bold cell."
  500-weight is a third, unbudgeted emphasis level → four dominance steps inside the
  table (700-mono / 500 / chip / 400).
- **Toolbar grouping is theory-clean.** One whitespace-separated group (proximity, no
  common region), search first by size+position, selects equal by repetition, chips
  12 px below their cause (`space-y-3`) and 32 px from the table (`space-y-8`):
  outer > inner gap exactly as NN/g proximity demands. No ad-like styling → no
  banner-blindness exposure.
- **Five promoted filters vs the ≤ 3 rule.** Search + nature + statut + compagnie +
  période are all up front. Element-specs §2 (Polaris) says ≤ 3 promoted; NN/g
  progressive disclosure says primary set must hold what's FREQUENTLY used and no
  more, decided by "frequency-of-use statistics." On a pure-lookup page most sessions
  are search-only; but which two selects are the frequent ones is a domain question,
  not a theory question.
- **Persisted-filter re-entry.** `usePersistedFilters` can restore a filtered view on
  arrival; the only cues are the quiet chips row and the bottom caption. A returning
  user scanning for a known dossier that the persisted filter hides gets a false
  "absent" — the cue for "you are seeing a subset" is subordinate-level while the
  risk is task-fatal. (Scent problem: the page misrepresents "how likely it is that
  the page will provide an answer".)
- **Header labels front-load fine.** «Nature du dossier» / «Type de dossier» differ in
  word 1; «Réf. expert», «Assuré», «Matricule» are single-concept. No fix needed.
- **Sticky header + frozen ID column already match the research** (STICKY_HEAD/
  STICKY_CELL with the 4 px frozen-edge shadow in `table.tsx`), including the z-order
  and hover-tint continuity the practitioner sources warn about.
- **Empty states re-rank correctly.** Filtered-empty promotes the tonal «Effacer les
  filtres» to dominant — the right #1 for the moment (recovery path = strongest
  scent); plain-empty has no action, so the title stays #1.

---

## 3. Recommendations

(numbered list mirrored in the final message; tags per owner policy)

1. [safe] Drop `font-medium` from the Assuré cell → row emphasis = exactly Réf + chip.
2. [safe] Make the persisted-filter re-entry state visibly announced (e.g., the chips
   row is always rendered when a persisted non-default filter exists — it already is —
   plus move/echo the filtered count next to the chips: « 12 / 240 dossiers » at
   chips-row level). Weight stays level-3 text; no new hue.
3. [needs owner ruling] Demote 1–2 selects behind « Plus de filtres » per §2's ≤ 3
   promoted rule — requires knowing which of nature/statut/compagnie/période
   gestionnaires actually use on Consultation.
4. [needs owner ruling] Status-chip muting on lookup-only pages (e.g., dot + plain
   text instead of tinted enclosure on Consultation only) — would fix the #1
   inversion but forks the canonical §11 status idiom across pages.
5. [safe] Keep everything else: toolbar grouping, sticky/frozen implementation, footer
   caption, empty-state ranking all match the fetched research.
6. [safe, process] Add the squint test as the acceptance check for this page with the
   intended order written down: title → search/identifier rail → data.

---

## 4. Honest unfetched list

- **Reddit**: blocked outright, including old.reddit.com ("Claude Code is unable to
  fetch from old.reddit.com"). No practitioner-thread corroboration.
- **uxdesign.cc preattentive-attributes article** (Posternak) and **Medium "Dashboard
  Vision" eyetracking article**: HTTP 403 (Medium infrastructure). Used only their
  search-snippet quotes, flagged as snippet-level above.
- **vanseodesign.com/web-design/visual-weight/**: 404; substituted Bradley's
  visual-hierarchy article on the same site (fetched) which covers the same levers.
- **Ware's book itself**: not directly fetchable; his preface reached me verbatim via
  Few's fetched PDF, and the "four categories of preattentive attributes: form, color,
  position, motion" claim comes from a search snippet of the Posternak article +
  training knowledge (flagged).
- **NN/g squint-test video**: paywalled video, not fetched; squint-test method
  corroborated via LukeW (fetched) + Polypane/Medium search snippets.
- **Treisman's feature-integration papers**: not fetched directly; her findings reach
  this report through Healey's page (which is built on FIT) — the conjunction-search
  and pop-out claims above are Healey's summaries, not the 1980 primary paper.
- **Kara Pernice's full text-scanning article body**: fetched via WebFetch summary —
  quotes are as returned by the fetch tool, not hand-verified against the raw page.
