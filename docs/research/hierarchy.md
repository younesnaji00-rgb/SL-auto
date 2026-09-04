# Visual Hierarchy & Attention Theory — Research Report

Date: 2026-09-02. Researcher: UX-research subagent.
Target context: dense French back-office app (SL Auto Expertise / Appraisio), locked palette
(cream base + ink value ladder + muted dark teal accent + terracotta strictly for time),
one filled button per page. No palette changes proposed.

Source policy honored: no GOV.UK/Material/Polaris/Carbon/Stripe docs used. NN/g allowed
(they publish eyetracking studies). 19 sources actually fetched; failures listed at the end.

---

## PART A — Sources (per-source: URL, fetched?, key content)

### A1. Stephen Few — "Tapping the Power of Visual Perception" (Perceptual Edge)
- URL: https://www.perceptualedge.com/articles/ie/visual_perception.pdf
- Fetched: YES (PDF; the extraction model's summary partially paraphrased — caveats below)
- Content: Preattentive attributes are perceived "prior to conscious awareness", in well under
  500 ms, in parallel. Few's canonical table (training knowledge, cross-checked with fetch)
  groups attributes into four categories: **form** (length, width, orientation, size, shape,
  enclosure, added marks), **color** (hue, intensity/value), **position** (2-D location), and
  **motion** (flicker). Only a few attributes are perceived *quantitatively* — length and 2-D
  position most precisely; color hue is categorical, not quantitative.
- Fetch-reported specifics: "the number of distinct values that can be discriminated by color
  hue is about seven" — a hard practical ceiling; similar 5–7 ceilings for size steps.
- Caveat: the fetch summary attributed "position along a common scale is the most effective"
  to this PDF — that phrasing is actually Cleveland & McGill's ranking (which Few cites
  elsewhere); treat as (training knowledge, cross-source) rather than a verbatim quote.

### A2. NN/g — "The Layer-Cake Pattern of Scanning Content on the Web"
- URL: https://www.nngroup.com/articles/layer-cake-pattern-scanning/
- Fetched: YES
- Key quotes/findings:
  - "Aside from reading every word, the layer-cake pattern is by far the most effective way to
    scan pages: most of the time, it ensures that users will find the information they are
    looking for."
  - Triggered by **visually distinct, descriptive headings and subheadings**; users fixate
    headings, dip into body text only where a heading earns it.
  - Recommendations: contrast headings via color/size/weight; keep them consistent and
    predictable; front-load headings with information-bearing words; chunk related content;
    "Use the Gestalt proximity principle for non-text layouts (cards, images)."
  - F-pattern vs layer-cake table: F = low efficiency, unpredictable skipping, missed info;
    layer-cake = eyes go straight to headings, users save time.

### A3. NN/g — "F-Shaped Pattern of Reading: Misunderstood, But Still Relevant"
- URL: https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- Fetched: YES
- Key quotes/findings:
  - The F-pattern is a **symptom of poor formatting**, not a layout target: "The F-pattern is
    the default pattern when there are no strong cues to attract the eyes towards meaningful
    information."
  - Users sweep top line fully, second line partially, then scan down the LEFT edge.
  - Consequence: content is missed purely because of position.
  - Fixes: "Include the most important points in the first two paragraphs on the page";
    front-load headings/links with information-bearing words; use bold/bullets/structure so
    users don't default to the F.

### A4. NN/g — "Text Scanning Patterns: Eyetracking Evidence"
- URL: https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/
- Fetched: YES
- Four text patterns, worst → best:
  1. **F-pattern** — no headings/bullets; left/top gets attention, right/bottom starved.
  2. **Spotted** — fixations jump to visually styled words (links, bold, color) or
     task-relevant keywords scattered on the page.
  3. **Layer-cake** — fixations mostly on headings/subheadings; "most effective way in which
     users can scan pages."
  4. **Commitment** — near-full reading; only when motivation is high (instructions, trusted
     source). Best comprehension, most time.
  - Recommendations: chunk into sections with meaningful subheadings; bulleted lists; style
    keywords; avoid walls of text. (Zigzag/exhaustive-review patterns exist for image-heavy
    pages, not detailed in this article.)
- Implication: styled keywords CREATE fixation targets (spotted pattern) — emphasis inside
  a table row will literally pull the eye to it.

### A5. NN/g — "The Principle of Proximity" (Gestalt)
- URL: https://www.nngroup.com/articles/gestalt-proximity/
- Fetched: YES
- Key quotes/findings:
  - "Items close together are likely to be perceived as part of the same group — sharing
    similar functionality or traits."
  - Proximity "can overpower competing visual cues such as similarity of color or shape" —
    it is the STRONGEST grouping cue.
  - Whitespace alone communicates grouping — no borders/boxes needed (dots/triangles demo).
  - Spacing rule: minimal space within a group (label↔field), substantial space between
    groups.
  - Far-away elements "can be easily overlooked by task-focused users who expect all relevant
    information and interactive elements to be placed close together." (Directly relevant to
    where page actions go: keep them near the object they act on.)
  - Warning: responsive reflow can destroy proximity groupings.

### A6. NN/g — "Horizontal Attention Leans Left" (eyetracking study)
- URL: https://www.nngroup.com/articles/horizontal-attention-leans-left/
- Fetched: YES
- Key findings:
  - **80% of fixations land on the left half of the page** (up from 69% in the 2010 study);
    20% on the right half. On SERPs: 94% left, 60% within the leftmost 400 px.
  - "Place important content and calls-to-action front and center on the left side."
  - "If right-side content is essential, increase visual prominence to draw attention."
  - Navigation in conventional spots (top/left) is recognized with few fixations —
    conventions are cheap to process (Jakob's Law).
- Implication: top-right primary actions are a CONVENTION users know (page-level "New X"),
  but they sit in a low-attention zone — they work because of convention + isolation +
  contrast (the one filled button), not because the eye naturally goes there.

### A7. Steven Bradley — "Design Principles: Visual Weight and Direction" (Smashing Magazine)
- URL: https://www.smashingmagazine.com/2014/12/design-principles-visual-weight-direction/
- Fetched: YES
- Visual weight = "a measure of the force that an element exerts to attract the eye."
- Weight-increasing characteristics: **size** (bigger = heavier); **color** ("Red is
  considered the heaviest color and yellow the lightest"; warm advances, cool recedes);
  **value** (dark outweighs light); **saturation** (saturated heavier than desaturated);
  **position** (higher, off-center, foreground = heavier); **texture**, **shape** (regular >
  irregular), **orientation** (vertical > horizontal; diagonal heaviest); **density**
  (concentration of elements); **local whitespace** ("Isolation amplifies an element's
  prominence"); **intrinsic interest** (complex/detailed elements attract attention).
- "Many intrinsic characteristics can be modified to make an element visually weightier or
  lighter" — weight is a SUM; no single attribute decides alone.
- Visual direction (implied lines, arrows, gaze, structural skeleton) guides eyes from one
  focal point to the next.

### A8. Steven Bradley — "Design Principles: Dominance, Focal Points and Hierarchy" (Smashing)
- URL: https://www.smashingmagazine.com/2015/02/design-principles-dominance-focal-points-hierarchy/
- Fetched: YES
- **Three levels of dominance**: dominant / sub-dominant / subordinate.
- "Three is a good number. As a general rule, people can perceive three levels of dominance."
  More levels → differences between adjacent tiers shrink below perceptibility.
- "There needs to be enough difference between these levels for people to distinguish one
  from the next."
- "You can't emphasize everything." Co-dominance (two equal focal points) "could ultimately
  be distracting."
- "Emphasis is relative. For one element to stand out, another has to serve as the
  background." ← the theoretical basis of Refactoring UI's "de-emphasize to emphasize."

### A9. Pencil & Paper — "Data Table Design UX Patterns & Best Practices" (enterprise studio)
- URL: https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
- Fetched: YES
- Table-internal hierarchy:
  - "Left-align text columns. Everything that's made up of letters should be left-aligned."
    Right-align quantitative numbers; left-align qualitative numbers (dates, phones, codes).
    Never center-align data columns. "Match heading alignment to column."
  - Header row distinguished by weight+color, not size.
  - Primary (identifying) column leftmost, sticky on horizontal scroll.
  - Row division: prefer light 1 px borders or row-cards; **avoid zebra stripes** — they
    collide with hover/selected/disabled states ("too many grey variations").
  - Density: condensed 40 px / regular 48 px / relaxed 56 px rows; give users a density
    switcher.
- Actions: row actions hidden until hover (3-dot menu, checkboxes on hover); bulk actions
  appear only after selection — reduces initial clutter, keeps the table's own hierarchy
  clean. Detail views: inline expansion < sidebar < modal < full-screen by information need.
- "A well-thought-out table interaction experience in enterprise software design can enhance
  clarity, ease users' lives and maximize the data's potential."

### A10. IxDF — "Preattentive Visual Properties and How to Use Them in Information Visualization"
- URL: https://ixdf.org/literature/article/preattentive-visual-properties-and-how-to-use-them-in-information-visualization
- Fetched: YES
- Four categories (after Ware): **color** (hue, saturation, lightness), **form** (length,
  width, size, shape, orientation, added marks, spatial grouping…), **movement** (flicker,
  motion), **spatial position** (2-D position, depth).
- Movement "can be used very effectively to call someone's attention" BUT "care should always
  be taken when employing motion" — it becomes "annoying or distracting" (banner-ad history).
- "There is no universal agreement on which attributes… will be most effective for any given
  user group" — test with users.

### A11. Ryan Posternak — "Preattentive attributes of visual perception…" (UX Collective)
- URL: https://uxdesign.cc/preattentive-attributes-of-visual-perception-and-their-application-to-data-visualizations-7b0fb50e1375
- Fetched: YES via r.jina.ai (direct fetch 403)
- Based on Colin Ware's *Information Visualization: Perception for Design*; cites Healey on
  feature hierarchy.
- Form category "has many sub-attributes which can easily be used to either draw or reduce
  attention" — the most VERSATILE lever, not necessarily the loudest.
- Motion: strongest at grabbing attention but "can rapidly become annoying" → in practice the
  last-resort lever for calm UIs.
- "Area is one of the worst ways that our brain receives data information" (size/area is
  read imprecisely — use it for emphasis, not encoding).
- Recommends LAYERING several preattentive properties (e.g., enclosure + line width) rather
  than pushing one attribute hard.

### A12. Polypane — "Debug your visual hierarchy with the squint test"
- URL: https://polypane.app/blog/debug-your-visual-hierarchy-with-the-squint-test/
- Fetched: YES
- "When you focus on the details, the major hierarchy of your website can get away from you."
- What must SURVIVE the blur: the primary CTA/focal point; grouping of related content;
  interactive-vs-static distinction; intentional prominence order.
- Failures it exposes: background chrome louder than content; spacing that breaks logical
  relationships; identical styling on unrelated things ("things that look the same are the
  same" violated); interactive elements indistinguishable from static.

### A13. Luke Wroblewski — "Evaluating User Interfaces with the Squint Test"
- URL: https://www.lukew.com/ff/entry.asp?2013=
- Fetched: YES
- "Just squint. This will blur the design just enough to quickly identify if the important
  elements stand out."
- Without hierarchy, "users' eyes bounce randomly between equally-weighted elements."
- Prioritization precedes styling: know "what product you are making, for whom, and why…
  [then reflect] it through visual hierarchy."
- Quotes Jesse James Garrett: "Problems with visual design can turn users off so quickly that
  they never discover all the smart choices you made with navigation or interaction design."

### A14. Refactoring UI (Wathan & Schoger) — community notes/summaries
- URLs: https://gist.github.com/selcukcihan/b9418596a98abfcd4bbc622550820cc5 (fetched YES);
  corroborated by https://www.sglavoie.com/posts/2023/09/09/book-summary-refactoring-ui/ and
  https://jacobshannon.com/blog/books/refactoring-ui/hierarchy-is-everything/ (search
  snippets, not fully fetched)
- Key rules (from fetched gist + search corroboration):
  - **De-emphasize to emphasize**: "Rather than making primary elements stand out through
    bold styling, shift focus by toning down secondary elements instead."
  - Text hierarchy levers: size, weight, color — but PREFER weight and color over size.
    Three text colors (dark primary / grey secondary / lighter grey tertiary) + two weights
    (400/600) cover most UIs. (Latter sentence: training knowledge of the book, matches
    fetched notes.)
  - Never go below weight 400 in UI; to de-emphasize use lighter COLOR or smaller size, not
    thin weights.
  - "Don't use grey text on colored backgrounds" — pick a color nearer the background.
  - "Labels are a last resort" — let format/position identify data; label:value pairs
    flatten hierarchy.
  - "Every action on a page sits somewhere in a pyramid of importance" — one primary
    (solid), secondary (outline/lower-contrast), tertiary (link-styled). "Take a
    hierarchy-first approach to designing the actions on a page, for a much less busy UI."
  - Destructive ≠ prominent: severity alone doesn't earn a big red button.

### A15. Anthony Hobday — "Visual design rules you can safely follow every time"
- URL: https://anthonyhobday.com/sideprojects/saferules/
- Fetched: YES
- "Use high contrast for important elements" — user-critical items grab attention through
  contrast; structural chrome gets minimal contrast.
- "Everything should be aligned with something else" — alignment signals relationships and
  intent (alignment as invisible hierarchy).
- "Elements should go in order of visual weight" — in a series, heaviest first/outermost.
- "Make outer padding the same or more than inner padding" — proximity math: members of a
  group must sit closer to each other than to the container edge.
- "Lower the contrast of icons paired with text" — icons are geometrically heavy and will
  outshout their labels unless dimmed.
- "Everything in your design should be deliberate."

### A16. Artem Syzonenko — "Buttons on the web: placement and order" (UX Collective)
- URL: https://uxdesign.cc/buttons-placement-and-order-bb1c4abadfcb
- Fetched: YES via r.jina.ai
- Challenges the Z-pattern for web apps: "page content is not fully distributed across the
  page width" — F-shaped, left-concentrated attention describes app pages better.
- "For pages with inputs and controls, use left alignment" of the primary button (aligned
  with the form's content column — shortest eye/mouse travel, on the F's left rail).
- Dialogs: right-align primary (desktop OS convention). Simple informational pages: centered
  can work.
- Notes real-world inconsistency (GitHub, Airbnb, Airtable: left on pages, right in dialogs)
  — no universal standard; pick one convention per context and stick to it.

### A17. Eleken — "Visual Hierarchy in UX: Expert-Backed Tips" (SaaS design agency)
- URL: https://www.eleken.co/blog-posts/visual-hierarchy-in-ux
- Fetched: YES
- "If everything seems important, nothing is important."
- Lever list as ordered: size → contrast → color → position (top-left, center, top-right are
  the high-attention anchors) → spacing → typography weight.
- SaaS-specific mistakes: overloaded focal points; inconsistent spacing; weak/low-contrast
  CTA; typography chaos (too many sizes/fonts); too many hues; desktop hierarchy collapsing
  on mobile.

### A18. Martin Jurasek — "Basic tips to bulletproof your Visual Hierarchy" (Substack)
- URL: https://martinjurasek.substack.com/p/basic-tips-how-to-bulletproof-your
- Fetched: YES
- Process-side finding: broken hierarchy is usually a GOALS failure, not a technique failure
  — "When everything is important, nothing is important." Write down the #1 goal of each
  screen; make an ordered list for complex screens; question needing 8 messages; re-check the
  ordered list at every design stage. Stakeholder pile-on is the root cause of co-dominance.

### A19. Toptal — "Design Principles: An Introduction to Visual Hierarchy"
- URL: https://www.toptal.com/designers/visual/design-principles-hierarchy
- Fetched: YES
- "The largest elements grab attention first, and therefore appear to be the most important."
- Color: "the most impactful creative element in visual design."
- "A moving element will carry greater visual weight in a group of stagnant elements."
- Breaking alignment gives visual weight (deliberate misalignment = emphasis).
- "Visual hierarchy… signals which content is the most important, how content is organized
  into related sections, and which content to focus on first."

### A20. HN Algolia search — "visual hierarchy" stories
- URL: https://hn.algolia.com/api/v1/search?query="visual hierarchy"&tags=story
- Fetched: YES (meta-source). Only low-point stories (≤6 points); no substantive HN thread
  worth mining. Recorded for honesty; contributed nothing beyond links (leemunroe.com
  visual-hierarchy checker, LukeW Apple.com hierarchy).

### Could NOT fetch (honest list)
- **uxdesign.cc direct** — HTTP 403 (recovered via r.jina.ai mirror, A11/A16).
- **Reddit r/UXDesign** (search + threads) — 403 "network policy" both direct and via
  r.jina.ai. Community-mistakes findings therefore come from practitioner articles that echo
  those threads (A8, A17, A18) + (training knowledge, unfetched): recurring r/UXDesign
  complaints — everything-bold text walls, three competing accent colors, "border every
  group" habit, centered enterprise forms, icon soup in toolbars.
- **Medium bootcamp.uxdesign.cc CRUD framework** (Ola Mishina) — 500 via jina, 403 direct,
  301 loop. Its CRUD list-page recipe (headline + add-CTA + search + table) survives in the
  search snippet only — flagged (search snippet, unfetched).
- **Erik Kennedy / Learn UI Design hierarchy lecture** — no fetchable article located (course
  is paywalled). His known heuristics flagged (training knowledge, unfetched): start every
  screen in greyscale to force non-color hierarchy; one accent color used rarely beats many;
  "design v1 ugly-but-ranked, then style".
- **Shift Nudge summaries** — nothing fetchable found beyond marketing pages; skipped rather
  than cite fluff.
- **Colin Ware book text** — book not freely fetchable; his framework reached via IxDF (A10)
  and Posternak (A11). Direct Ware claims flagged (training knowledge, unfetched): motion
  and flicker are the most powerful attention-grabbers, especially in peripheral vision,
  because the visual system evolved to orient to movement; "pop-out" requires the target to
  be unique on ONE feature dimension — two highlighted things in the same dimension force
  serial search.

---

## PART B — Synthesis by research question

### Q1. What commands attention first, and in what order?

The evidence-backed ordering for STIMULUS-driven (bottom-up) attention:

1. **Motion / flicker** — strongest grabber, works in peripheral vision (Ware via A10, A11,
   A19; training knowledge). Universally flagged as too aggressive for calm business UI
   except one-shot transitions (a row briefly settling after creation). Banner-ad history is
   the cautionary tale (A10).
2. **Color contrast** — hue difference against a quiet field; "the most impactful creative
   element" (A19); saturated/warm/dark = heavier (A7). Effective only while scarce: hue
   discrimination ceiling ≈ 7, practical emphasis ceiling far lower (A1).
3. **Size** — "largest elements grab attention first" (A19), but area is read imprecisely
   (A11) — good for emphasis, bad for encoding amounts.
4. **Value/weight contrast** — dark-on-light lightness difference; the workhorse in a
   locked-palette app (A7, A14).
5. **Position** — not a grabber but the strongest STRUCTURAL attribute: left half gets 80%
   of fixations (A6); top-left is the entry point; position + proximity organize everything
   else.
6. **Isolation (local whitespace)** — an element surrounded by emptiness gains weight
   without any styling (A7).

Top-down attention overrides all of this when the user has a task: they hunt for keywords
and known positions (spotted pattern, A4; Jakob's Law, A6). In a daily-use back-office tool,
learned position eventually beats styling — so CONSISTENT placement is itself an attention
system.

Usable in a calm business app: value/weight contrast, size (sparingly), one hue accent,
isolation, position. Not usable: continuous motion, flashing, competing hues.

### Q2. The hierarchy ladder — how many levels, which lever first

- **Three perceivable levels of dominance** per view: dominant, sub-dominant, subordinate
  (A8: "people can perceive three levels of dominance"). More tiers collapse into mush.
  Text can hold ~3 colors + 2 weights (A14) — still three effective tiers (primary /
  secondary / tertiary), with size reserved mostly for the page title.
- **Lever order for text hierarchy in a value-ladder palette** (A14 + A8 + A7):
  1. First pull **color/value** (ink → grey → light grey): cheapest, quietest, doesn't move
     layout.
  2. Then **weight** (400 → 600): use to emphasize; never thin weights (<400) to
     de-emphasize — lighten color instead.
  3. Then **size**: the loudest and most layout-disruptive; one big element per page
     (title or the key number). Don't build 6-step size ramps.
  4. **Saturation** belongs to the accent only; in a cream+ink app the "saturation lever"
     is effectively "does it get teal or not" — a binary, not a ladder.
- **Mechanism**: emphasis is relative — "for one element to stand out, another has to serve
  as the background" (A8). Therefore the practical move is DE-emphasis: pull metadata,
  borders, icons, labels DOWN until the one important thing is left standing (A14, A15).
- **Verification**: squint test (A12, A13). Blur the page; exactly the intended #1/#2/#3
  should survive, groups should still read as groups, and the interactive/static distinction
  should persist.

### Q3. Position, scanning, grouping, alignment

- **Where the eye lands (LTR)**: top-left first; 80% of fixation time on the left half (A6).
  The left edge of a table/list is prime real estate — identifying data goes there (A9).
  Bottom-right and far-right are attention deserts unless the element is prominent or its
  location is a learned convention (A6).
- **Top-right primary actions**: legitimate as a page-level convention ("Nouveau dossier"),
  powered by convention + isolation + being the sole filled element — but for FORMS, the
  primary button belongs left-aligned with the input column (A16): shortest travel, sits on
  the F's left rail. Dialogs keep primary bottom-right (OS convention, A16). Pick these
  three conventions and never mix within a context.
- **F vs Z vs layer-cake**: F-pattern is a failure mode ("default pattern when there are no
  strong cues", A3); Z-pattern is dubious for apps because content doesn't span the width
  (A16); the target is **layer-cake** — bold, front-loaded section headings that let the eye
  hop stripe to stripe (A2). For tables specifically, users scan the left column down, then
  read rows of interest — the F, rotated into usefulness.
- **Gestalt proximity**: the strongest grouping cue, beats color/shape similarity (A5).
  Rules: space-within-group < space-between-groups, always; Hobday's operational form:
  "outer padding ≥ inner padding" (A15). Whitespace alone groups — a filter row does not
  need a box around it (A5). In toolbars/filter rows: cluster the filter controls tightly,
  gap, then the view controls; the gaps ARE the syntax. In card grids: gutter between cards
  must exceed padding inside cards or the grid dissolves.
- **Alignment**: "everything should be aligned with something else" (A15); alignment
  "creates order by connecting elements spatially" and BREAKING alignment gives weight (A19)
  — so a deliberate outdent (e.g., page title or section heading hanging left of the content
  column) is a free emphasis lever. Fewer alignment lines = calmer page; every stray
  x-coordinate is noise.

### Q4. Applied

**List/queue page (header, filters, big table):**
- #1 attention target: **the data itself, specifically the identifying/primary column at the
  left of the table** plus any state that demands action (overdue = terracotta time chip).
  The user's job is triage; the table is the protagonist. Achieved by: quieting everything
  else — light 1 px row borders, no zebra (A9), grey secondary cells, ink primary cell,
  headers small/weighted not sized (A9).
- #2: **the one filled button** (Nouveau/Ajouter), top-right of the header row — sole
  saturated teal element on the page; isolation + contrast makes it findable in the blur
  test (A12) despite living in the low-attention right (A6 — hence it must be the ONLY
  filled thing).
- #3: **the filter/search row**, styled as quiet chrome (outline fields, grey icons, tight
  proximity grouping) sitting between title and table. Findable when wanted, invisible when
  not (A5, A15).
- Page title: identifies, doesn't dominate — one size step up + weight; the layer-cake
  stripe that anchors the top-left entry point (A2, A6).
- Row actions stay hidden until hover; bulk bar appears only on selection (A9) — the table's
  resting state shows data, not machinery.

**Small settings/CRUD page:**
- #1: **the section headings + first field group** — layer-cake structure (A2): each
  settings group = weighted heading, tight label/field pairs under it, big gap before the
  next group (A5). Single column (form research, B-Q4 search corroboration): no Z-scan,
  no ambiguity of order.
- #2: **the save/primary action**, left-aligned with the fields (A16) — one filled button;
  or, for instant-save settings, the currently-edited control's focus state.
- #3: **dangerous/rare operations** (delete, reset), demoted to tertiary link-styling and
  spatially quarantined at the bottom — severity doesn't earn prominence (A14).
- Labels: quiet greys above/beside fields; values darker than labels (the data outranks its
  caption — A14 "labels are a last resort" spirit).

### Q5. Common mistakes practitioners call out

- **Everything emphasized / everything bold** → "when everything is important, nothing is
  important" (A17, A18, A8). Root cause is usually unranked goals/stakeholder pile-on (A18),
  not CSS.
- **Co-dominance**: two focal points of equal weight fight and both lose (A8).
- **Competing accents**: multiple hues used for decoration dilute the one that means
  "act here" (A17; Erik Kennedy greyscale-first heuristic, training knowledge).
- **Everything boxed**: borders around every group when whitespace already groups (A5);
  boxes-in-boxes add density (visual weight, A7) without adding order. Zebra stripes as a
  special case — they consume the grey ladder needed for states (A9).
- **Centered layouts for work tools**: center-aligned data columns break scanning (A9);
  centered buttons belong only on simple informational pages (A16); centered ragged text
  destroys the left rail the F-scan depends on (A3).
- **Icons outshouting text**: geometric icon shapes are heavy; dim them next to labels (A15).
- **Thin-weight de-emphasis**: sub-400 weights become illegible; lighten color instead (A14).
- **Grey text on colored backgrounds** instead of background-tinted text (A14).
- **Hierarchy that dies in the blur**: background chrome louder than content; unrelated
  things styled identically; interactive elements indistinguishable from static (A12).
- **Right-side placement of essential info** without added prominence — 20% of fixations
  live there (A6).
- **Proximity broken by even spacing**: uniform gaps everywhere = no groups at all (A5, A15).

---

## PART C — Notes for the SL-auto / Appraisio context

- The locked palette is actually the theory-compliant setup: an ink VALUE ladder is lever #1
  (A14), teal is the single scarce hue whose meaning is "primary action / selected", and
  terracotta-for-time is a perfect single-dimension pop-out (unique hue on a field of
  cream+ink+teal = preattentive search, Ware/Healey via A11 + training knowledge) — provided
  nothing else is ever warm. Any second warm element on a page destroys the pop-out
  (pop-out requires uniqueness in the feature dimension).
- Dense French back-office: French strings run ~15–20% longer than English — front-loading
  headings with the information-bearing word (A2, A3) matters more, and label-above-field
  with tight proximity survives long labels better than side labels.
- One-filled-button rule = the "importance pyramid" (A14) enforced at the page level; keep
  secondary as outline/ghost teal, tertiary as text links, and NEVER promote destructive
  actions to filled red — quiet tertiary + confirmation instead (A14).
