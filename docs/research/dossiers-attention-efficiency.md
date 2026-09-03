# /dossiers — Attention, Hierarchy & Workflow Efficiency — Deep Research Report

Date: 2026-09-03. Researcher: UX-research subagent.
Scope: theory of preattentive attention, table-scanning behavior, decision/motor laws,
progressive disclosure, and expert-user efficiency — applied to the `/dossiers` master list
(14-column dossier table + sticky actions, toolbar with 8 controls, filter chips, pagination).
Builds ON TOP of `docs/research/hierarchy.md` (2026-09-02) and `docs/research/tables.md`
(2026-09-02); their findings are cited as [H-A#] / [T-A#] and not re-fetched.

Source policy honored: no GOV.UK/Stripe/Material/Polaris/Carbon primary sources. Every source
below is tagged FETCHED / SEARCH-SNIPPET / FAILED / TRAINING.

---

## PART A — SOURCE LOG

### S1. Laws of UX — Hick's Law — FETCHED
URL: https://lawsofux.com/hicks-law/
- "The time it takes to make a decision increases with the number and complexity of choices."
- Takeaways: "Minimize choices when response times are critical"; "Break complex tasks into
  smaller steps"; "Avoid overwhelming users by highlighting recommended options"; "Be careful
  not to oversimplify to the point of abstraction."
- Origin: Hick & Hyman 1952 — reaction time grows with the number of stimuli; "users
  bombarded with choices have to take time to interpret and decide."

### S2. Laws of UX — Fitts's Law — FETCHED
URL: https://lawsofux.com/fittss-law/ (note: /fitts-law/ 404s; double-s URL is live)
- "The time to acquire a target is a function of the distance to and size of the target."
- Movement time depends on distance, inversely on size; "fast movements and small targets
  result in greater error rates."
- Takeaways: sufficient target size, adequate spacing, "minimize the distance between user
  focus areas and related action buttons."
- Cited study: Fitts 1954, "The information capacity of the human motor system in
  controlling the amplitude of movement."

### S3. Laws of UX — Tesler's Law — FETCHED
URL: https://lawsofux.com/teslers-law/
- "For any system there is a certain amount of complexity which cannot be reduced." That core
  "must be assumed by either the system or the user."
- Tesler: "an engineer should spend an extra week reducing the complexity of an application
  versus making millions of users spend an extra minute using the program."
- Tognazzini counterpoint: "people resist reductions to the amount of complexity in their
  lives" — simplify the tool and users attempt more complex tasks with it.

### S4. Laws of UX — Serial Position Effect — FETCHED
URL: https://lawsofux.com/serial-position-effect/
- "Users have a propensity to best remember the first and last items in a series." Middle
  items are "stored less frequently in long-term and working memory."
- "Positioning key actions on the far left and right within elements such as navigation can
  increase memorization." (Ebbinghaus; primacy + recency.)

### S5. Laws of UX — Miller's Law — FETCHED
URL: https://lawsofux.com/millers-law/
- "The average person can only keep 7 (plus or minus 2) items in their working memory."
- "Don't use the 'magical number seven' to justify unnecessary design limitations."
- "Organize content into smaller chunks to help users process, understand, and memorize
  easily." Capacity varies with prior knowledge — experts chunk bigger units.

### S6. Laws of UX — Jakob's Law — FETCHED
URL: https://lawsofux.com/jakobs-law/
- "Users prefer your site to work the same way as all the other sites they already know."
- "By leveraging existing mental models, we can create superior user experiences in which the
  users can focus on their tasks rather than on learning new models."

### S7. Laws of UX — Aesthetic-Usability Effect — FETCHED
URL: https://lawsofux.com/aesthetic-usability-effect/
- "Users often perceive aesthetically pleasing design as design that's more usable."
- Kurosu & Kashimura 1995, 252 participants, 26 ATM variants: "a stronger correlation between
  the participants' ratings of aesthetic appeal and perceived ease of use than … actual ease
  of use."
- Caveat: "visually pleasing design can mask usability problems and prevent issues from being
  discovered during usability testing."

### S8. Laws of UX — Von Restorff Effect — FETCHED
URL: https://lawsofux.com/von-restorff-effect/
- "When multiple similar objects are present, the one that differs from the rest is most
  likely to be remembered." (von Restorff 1933.)
- Cautions: "restraint when placing emphasis on visual elements"; never rely on color alone
  (colorblind users); moderation so emphasized elements don't compete.

### S9. Superhuman blog — "Why Superhuman Mail is built for speed: applying the 100ms rule" — FETCHED
URL: https://blog.superhuman.com/superhuman-is-built-for-speed/
- 100ms rule (Paul Buchheit): "Every digital interaction should be faster than 100ms" so
  interactions "feel instantaneous"; Superhuman targets sub-50ms.
- Amazon: "every 100ms in latency on their site cost them 1% in sales."
- "Gestures are also made easier or avoided altogether in favor of keyboard shortcuts, which
  are faster than a mouse in almost all cases." Command palette (Cmd+K) for discoverability;
  in-UI hints teach shortcuts.
- Triage machinery: Split Inbox (VIPs/teams/others), snooze, bulk archive; "add up to a whole
  new experience" — users report ~3 hours/week saved.

### S10. Linear — Method / Introduction — FETCHED
URLs: https://linear.app/method + https://linear.app/method/introduction
- "There is a lost art of building true quality software."
- "Purpose-built … Flexible software lets everyone invent their own workflows, which
  eventually creates chaos as teams scale." (= opinionated defaults over configurability)
- "Say no to busy work: A tool should work for you, not the other way around. Remove or
  automate 'work around work'."
- "Simple first, then powerful: A tool should be simple to get started with and grow more
  powerful as you scale." / "Decide and move on."
- (Keyboard culture — every action has a shortcut: C create, X actions, S status, A assign,
  P priority — confirmed via SEARCH-SNIPPET reviews, not a fetched Linear post.)

### S11. NN/g — Progressive Disclosure — FETCHED
URL: https://www.nngroup.com/articles/progressive-disclosure/
- "Initially, show users only a few of the most important options. Offer a larger set of
  specialized options upon request."
- Novices: "prioritize their attention so that they spend time only on features that are most
  likely to be useful." Experts: smaller initial display "saves them time because they avoid
  having to scan past a large list of features they rarely use."
- "Improves 3 of usability's 5 components: learnability, efficiency of use, and error rate."
- THE criterion: "disclose everything that users frequently need up front, so that they have
  to progress to the secondary display only on rare occasions."

### S12. NN/g — Tooltip Guidelines — FETCHED
URL: https://www.nngroup.com/articles/tooltip-guidelines/
- "Tooltips are hard to discover because they often lack visual cues."
- "Users shouldn't need to find a tooltip in order to complete their task." Critical or
  actionable info must always be visible.
- "Because tooltips are initiated by a hover gesture … They are not normally available on
  touchscreens."

### S13. NN/g — Data Tables: Four Major User Tasks — FETCHED
URL: https://www.nngroup.com/articles/data-tables/
- Four tasks: find records fitting criteria / compare data / view-edit a single row / take
  action on records.
- Eyetracking: a participant performed "a hierarchical search of the table, moving his eyes
  between the first column, second column, then skipping to the fourth and sixth columns
  before moving to the next row" — users do NOT read rows linearly; they sample a few
  informative columns per row.
- "The default first column should be a human-readable record identifier" — it is what lets
  "users … scan and locate a record of interest."
- "The default order of the columns should reflect the importance of the data," related
  columns adjacent "to prevent excessive eye movement."
- Gazeplots show users bouncing "back and forth between the table's data and the filters."

### S14. NN/g — The Lawn Mower Pattern (comparison-table eyetracking) — FETCHED
URL: https://www.nngroup.com/articles/lawn-mower-pattern/
- In active comparison, users "begin in the top left cell, move to right until the end of the
  row, then drop down to last cell of the next row and move back to the left."
- Users sometimes "scan some rows by reading the content cells first and then the row label."
- "Human beings have limited working memory" → keep column titles visible; make cells
  "stand alone" without needing the header.

### S15. Stephen Few — "Formatting and Layout Matter" (whitepaper PDF) — FETCHED (via r.jina.ai)
URL: https://www.perceptualedge.com/articles/Whitepapers/Formatting_and_Layout_Matter.pdf
- "The size of something on a dashboard serves as a strong visual cue to its importance."
- "When everything is yelling, no voices stand out, and the result is noise that no one wants
  to hear."
- Screen-position hierarchy: upper-left = most emphasis, lower-right = least. Legend in the
  top-left corner = "the most expensive real estate available … prominence it doesn't
  deserve."
- "Don't force people to work this hard to associate items that belong together."
- "When different items on a dashboard look alike in some way, people tend to see them as
  related" — identical styling implies relation (similarity misused = false signals).

### S16. Stephen Few — Information Dashboard Design lecture deck (Berkeley i247) — FETCHED (via r.jina.ai)
URL: https://blogs.ischool.berkeley.edu/i247s12/files/2012/01/Dashboard-Design-Overview-Presentation.pdf
- "Text must be read, processed serially. Graphics can be perceived at a glance, processed in
  parallel."
- "Everything that deserves space on a dashboard is important, but not equally so." Failure
  mode: "everything is visually prominent, which results in nothing standing out."
- "It is best to keep colors subdued and neutral, except when you are using color to
  highlight something as especially important."
- "The prime real estate on the screen has been used for the most important data."
- 13 common mistakes incl. "ineffective emphasis on importance", "useless decoration",
  "misusing/overusing color". Mantra: "Simplify, simplify, simplify."

### S17. Stephen Few — "Effectively Communicating Numbers" (whitepaper) — FETCHED (via r.jina.ai)
URL: https://www.perceptualedge.com/articles/Whitepapers/Communicating_Numbers.pdf
- Tables are for when users "look up individual values or the quantitative values must be
  precise" (a lookup instrument, not a picture).
- "Anything that doesn't contribute in an essential way to the meaning … is a distraction
  that harms communication."
- Palette: "lowly saturated, natural colors found in nature" as baseline; "bright or dark
  colors" ONLY for the emphasized datum.

### S18. Christopher Healey — "Perception in Visualization" (NCSU) — FETCHED
URL: https://www.csc2.ncsu.edu/faculty/healey/PP/index.html
- "Tasks that can be performed on large multi-element displays in less than 200 to 250
  milliseconds (msec) are considered preattentive" — parallel, effort-free detection.
- Preattentive features: hue, orientation, size/length, curvature, luminance, motion
  (flicker/direction/velocity), depth.
- FEATURE HIERARCHY: "the visual system favours colour over shape" — "random variations in
  shape have no effect on a viewer's ability to see colour patterns," but color variation
  DOES disrupt shape detection. Color outranks form; form cannot compete with a stray hue.
- CONJUNCTION SEARCH: a target defined by a combination with no unique single feature ("a red
  circle in a sea of red squares and blue circles") forces "a time-consuming serial search."
  Pop-out requires uniqueness on ONE feature dimension.

### S19. HN — "Ask HN: What are good high-information density UIs?" (id 43925732, 530 pts, 372 comments) — FETCHED (Algolia API)
URL: https://news.ycombinator.com/item?id=43925732
- Praised: Bloomberg Terminal ("designed to be very efficient to use but requiring some
  skills"), McMaster-Carr, btop/htop, TradingView, Blender, Ableton.
- thih9: "professionals often want as much as possible accessible from a single screen, so
  they don't need to click."
- n4kana: "dense UIs are for experts or people who dedicate a lot of time learning the UI."
- danielvaughn: "I do find it frustrating that pretty much all designers lean towards
  low-density by default."
- Consensus mechanics of good density: hierarchy via collapsible sections, keyboard shortcuts
  over clicks, functional (not decorative) color/icons, everything on one screen. Density is
  "appropriate UI for the right audience," not a universal good.

### S20. Fred Hébert — "Complexity Has to Live Somewhere" — FETCHED
URL: https://ferd.ca/complexity-has-to-live-somewhere.html
- "Complexity has to live somewhere. If you are lucky, it lives in well-defined places."
- "With nowhere to go, it has to roam everywhere in your system, both in your code and in
  people's heads."
- "If you embrace it, give it the place it deserves … it might just become a strength."
  (The systems-engineering twin of Tesler's law: the design question is never "remove the
  complexity" but "which side of the screen absorbs it.")

### S21. growth.design — Psychology index (cognitive biases catalog) — FETCHED
URL: https://growth.design/psychology
- Von Restorff: "People notice items that stand out more." Selective attention: "People
  filter out things from their environment when in focus."
- Hick's Law: "More options leads to harder decisions." Progressive disclosure: "Users are
  less overwhelmed if they're exposed to complex features later."
- Default bias: "Users tend not to change an established behavior." Spark effect: "Users are
  more likely to take action when the effort is small."

### S22. Shneiderman — Visual Information-Seeking Mantra — SEARCH-SNIPPET
Search results incl. https://ieeexplore.ieee.org/document/545307/ ("The Eyes Have It", 1996)
and https://www.researchgate.net/publication/4175429 (Craft & Cairns, "Beyond guidelines").
- "Overview first, zoom and filter, then details-on-demand" — proposed 1996; "a useful
  starting point for designing advanced graphical user interfaces." Paper itself not fetched
  (IEEE paywall); mantra text corroborated across multiple results.

### S23. Merlin Mann — Inbox Zero (via Swizero history article) — SEARCH-SNIPPET
URL attempted: https://www.swizero.com/blog/inbox-zero-history-what-merlin-mann-actually-said
— FAILED to fetch (2×, "Command failed"); quote captured from search results page:
- "The real 'zero' in Inbox Zero is more about consciously managing the amount of our
  attention that we commit (or, far more often, cede) to thinking and worrying about what may
  or may not be piling up while we're away doing the real work of our lives."
- Five processing verbs: Delete, Delegate, Respond, Defer, Do. "Mann's framework treated the
  inbox as a processing queue, not a storage system."

### S24. SLA / queue-aging practice (case-management ops) — SEARCH-SNIPPET
Search results incl. one-constellation.com/blog/alert-triage-workflows/,
fastslowmotion.com/salesforce-case-management-best-practices/, servicenow.com HRSD SLA blog.
- "A countdown to the SLA due date is shown for each item — which assists in workload
  management and prioritization." Age-band triage (0–7 / 8–30 / 31–90 / 90+ days) and
  "untriaged queue age — count of items older than 24 hours" as a key ops metric. Aging is
  the standard prioritization signal in every mature case-management stack.

### S25. Superhuman / Linear philosophy corroboration — SEARCH-SNIPPET
blakecrosley.com/guides/design/superhuman ("Speed as the Product"), various Linear reviews.
- Superhuman pillars: "speed, a keyboard-first workflow, and treating your inbox like a
  to-do list." Linear: "Every action in Linear has a keyboard shortcut."

### FAILED (honest list)
- lawsofux.com/fitts-law/ — 404 (recovered at /fittss-law/).
- csc.ncsu.edu/faculty/healey/PP/index.html — 404 (recovered at csc2.ncsu.edu).
- web.archive.org — fetcher refuses the domain outright this session.
- swizero.com Mann-history article — fetch failed twice; used search snippet only.
- Reddit r/UXDesign — 403 "network policy" direct AND via r.jina.ai (consistent with the
  2026-09-02 sessions). Zero Reddit input in this report.
- Stephen Few "Show Me the Numbers" ch.8 text — still not freely fetchable; Few input here
  comes from his three fetched whitepapers/decks (S15–S17) instead.
- growth.design individual case studies — not fetched (index only, S21); their case-study
  pages are heavily scripted and poorly extractable.
- Shneiderman 1996 paper — paywalled; mantra via snippets (S22).

### TRAINING-knowledge items used (flagged inline where cited)
- T1: Colin Ware's point that motion/flicker dominate peripheral attention (already flagged
  in hierarchy.md; reused, not re-verified).
- T2: Superhuman's "get to zero" game loop (the inbox count animating to a sunset image at
  zero) — product behavior known from training, no fetched source.
- T3: Hick's law applies to *unfamiliar* choice sets; for practiced experts choice-reaction
  flattens (Hyman's own data show learning effects). Corroborated by S5's "prior knowledge"
  caveat but the specific expert-flattening claim is training knowledge.

---

## PART B — SYNTHESIS BY RESEARCH QUESTION

### Q1. Preattentive processing & visual weight — the attention order, and the budget

**The physics.** Anything detectable in <200–250ms on a large display is preattentive —
parallel and effort-free (S18). The features that qualify: hue, luminance, size/length,
orientation, motion, enclosure, position (S18; H-A1, H-A10). Everything else — reading a
matricule, parsing a date — is serial: "Text must be read, processed serially. Graphics can
be perceived at a glance, processed in parallel" (S16).

**The order.** For a calm cream+ink page the empirically defensible stack is:

1. **Motion/flicker** — strongest, peripheral-vision grabber (S18; T1) — banned in this
   design system except transitions; correctly so.
2. **Unique hue** — color "favoured over colour over shape"; shape noise cannot mask a hue
   signal, but hue noise destroys shape signals (S18). A single warm chip on a cream+ink
   field is a genuine pop-out.
3. **Luminance/value + size** — dark-on-light contrast and bigger marks (S15: "size … serves
   as a strong visual cue to its importance"; H-A7).
4. **Weight/enclosure** (semibold, badge outline) — form-category cues; real but subordinate
   to any hue present (S18).
5. **Position** — not a grabber but the frame: upper-left = "the most expensive real estate
   available" (S15); the left table edge inherits this row by row (H-A6: 80% of fixations on
   the left half).

**The budget — how many attention levels can one row sustain?** Three constraints converge
on the same small number:

- Perceptual: "people can perceive three levels of dominance" — dominant / sub-dominant /
  subordinate (H-A8).
- Feature-dimension: pop-out requires uniqueness on ONE dimension; "a red circle in a sea of
  red squares and blue circles" forces serial search (S18). Two different warm signals in a
  row (status chip AND observation badge, both colored) are a conjunction — neither pops,
  both must be read.
- Few's noise law: "When everything is yelling, no voices stand out" (S15); "everything is
  visually prominent, which results in nothing standing out" (S16).

**Verdict: a dense row supports exactly three tiers — (1) one preattentive alarm (a single
hue-coded signal, present on SOME rows only — Von Restorff needs rarity, S8), (2) one
identity anchor (weight/mono, on every row — it structures, doesn't alarm), (3) everything
else at body/ink-3 quiet.** A 14-column row where statut is colored, observation is amber,
réf is semibold, and assuré is medium is already spending four emphasis tokens on a
three-token budget.

### Q2. How users actually locate a row — scanning behavior

- Users perform a **hierarchical, sampled scan**: eyes hop "between the first column, second
  column, then skipping to the fourth and sixth columns before moving to the next row" (S13).
  They do not read rows; they sample 3–4 informative columns per row and move on. Columns 5–13
  of a wide table are effectively invisible during row-location — they exist for AFTER the
  row is found (lookup, S17) or never.
- **First-column primacy is literal**: "The default first column should be a human-readable
  record identifier" because that is what lets "users scan and locate a record of interest"
  (S13). The réf-expert column (sticky, mono, semibold) is exactly right and must stay the
  loudest *persistent* element.
- **Where should "needs my attention" live?** Two scan modes must both be served:
  - *Known-item search* (user has a réf or assuré name in mind): served by the identifier
    ladder on the left — top-down attention, styling matters little (H-A4 spotted pattern).
  - *Triage sweep* ("what needs me today?"): served by a preattentive signal that can be
    picked up while the eye rides the left rail. Signal placement should therefore be
    **adjacent to the identifier zone (left third)** — a signal 10 columns to the right is
    off the scan path entirely (S13 sampling; H-A6 left-lean; S15 upper-left emphasis).
    The current page puts STATUT and OBSERVATION at positions 8–9 of 14 — in the sampled-out
    middle. The row's action signals live where the eye doesn't go.
- The lawn-mower full-row sweep (S14) happens only during *active comparison* of adjacent
  rows — rare on a claims queue. Designing 14 always-on columns for a comparison behavior
  that queue users almost never perform inverts the frequency criterion (S11).
- Serial position (S4): first and last positions are remembered; the middle is a memory
  hole. The sticky réf (first) and sticky ⋯ actions (last) already occupy the two privileged
  slots — correct. Whatever matters third-most must fight for position 2–3, not position 8.

### Q3. Decision & motor laws applied to THIS page

- **Hick (S1)**: choice time grows with options. 14 columns is 14 candidate places to look
  per row; 8 toolbar controls is 8 candidate tools per query. Mitigations that don't remove
  power: highlight the recommended option (a default view chip pre-selected), collapse rare
  columns/controls behind disclosure (S11), and rely on expert practice flattening the curve
  (T3 — but only for controls that never move; Jakob's-law-stable layouts are what let
  practice accrue, S6).
- **Fitts (S2)**: the two everyday targets are (a) the row itself → open dossier, and (b) the
  ⋯ menu. The row is a huge target — good — but only if the WHOLE row is clickable, not just
  the réf link. The clickable-chip pattern (STATUT → history, OBSERVATION → history) embeds
  small targets inside a big target: misclick cost + hesitation cost. Fitts favors few, large,
  edge-anchored targets; the sticky right actions column is edge-anchored — good.
- **Miller/chunking (S5)**: 14 columns ≈ 14 items offered to a working memory of 7±2 — but
  experts chunk. The fix is not "delete to 7" but *group into chunks*: identity (réf, assuré),
  parties (compagnie, réf compagnie), vehicle (matricules), dates, state (statut,
  observation). Related columns adjacent (S13) turns 14 items into 5 chunks. Current order
  interleaves chunks (dates split across positions 5, 12, 13; vehicle at 10–11 between state
  and dates).
- **Jakob (S6)**: gestionnaires live in this table all day; their transferred model is
  "claims/ticket queue" (réf → parties → state → dates). Violations of their OWN learned
  layout are costlier than any theoretical improvement — argue for one reorder, then freeze.
- **Tesler + Hébert (S3, S20)**: the irreducible complexity here is "which dossier next?".
  Today the USER absorbs it (scan 14 columns, mentally compute urgency from date création +
  statut + observation). The system should absorb it: compute urgency (age, days-in-status)
  and surface it as one signal. "An engineer should spend an extra week … versus making
  millions of users spend an extra minute" (S3) — here, one gestionnaire × every row × all
  day.
- **Aesthetic-usability (S7)**: the locked cream/glass system buys tolerance — but "visually
  pleasing design can mask usability problems"; a beautiful 14-column table can test well and
  still make triage slow. Measure time-to-first-open, not satisfaction.

### Q4. Progressive disclosure & information scent — row vs hover vs click

Shneiderman's mantra maps 1:1 onto a work queue (S22): **overview first** = the row set with
default view applied; **zoom and filter** = toolbar/chips; **details-on-demand** = the
dossier page / history sheets.

The placement rule is NN/g's frequency criterion (S11): "disclose everything that users
frequently need up front … progress to the secondary display only on rare occasions."
Applied per element:

- **In the row (needed to CHOOSE the row):** identifier, assuré, compagnie, state (statut +
  observation presence), urgency (age). That's what the hierarchical scan samples (S13).
- **Behind hover/tooltip (nice-to-know while choosing):** exact timestamps behind a relative
  age ("12 j" → hover: "créé le 22/08/2026"), full observation text behind the badge. BUT
  tooltips are a crutch with hard limits: "Users shouldn't need to find a tooltip in order to
  complete their task" (S12) and hover doesn't exist on touch (S12) — so hover may ENRICH a
  visible signal, never BE the signal.
- **Behind click (needed only after choosing):** matricule antérieur, date requête, créé par,
  nature/type detail, réf compagnie (lookup values, S17 — precise values for when you've
  already found the row). These are classic details-on-demand: their presence in every row
  taxes every scan to serve an occasional lookup.
- **Information scent:** the row must still SMELL of what's behind the click — the amber
  observation badge is good scent (presence signal + click affordance). A column that is
  usually empty (matricule antérieur) has no scent value; a column that is always full but
  never differentiates (créé par for a small team) has no discrimination value. Both fail the
  "does it help choose a row?" test.

### Q5. Expert efficiency — keyboard, batching, zero-state

- **Speed is a feature, not polish**: sub-100ms interactions "feel instantaneous" (S9);
  Bloomberg's "real superpower" is temporal density (T-A20). For a page used all day, shaving
  one decision-second per dossier dwarfs any visual refinement.
- **Keyboard-first**: "keyboard shortcuts … are faster than a mouse in almost all cases"
  (S9); Linear gives every action a key (S25); dense-UI experts prize "as much as possible
  accessible from a single screen, so they don't need to click" (S19). For /dossiers: ↑/↓ row
  focus, Enter open, `/` focus search, o open observation history — with in-UI hints for
  discoverability (S9's command-palette lesson; the nav-upgrade branch's Alt-shortcuts
  already establish the convention).
- **Batching/triage theory**: Mann's inbox zero is an ATTENTION protocol, not an empty-list
  fetish — "consciously managing the amount of our attention that we commit … to thinking and
  worrying about what may or may not be piling up" (S23). The queue design corollary: the
  page should answer "is anything piling up?" in one glance (a visible count on the default
  triage view), and each item should be touch-once dispatchable (open → act → return to the
  same scroll position). Superhuman's Split Inbox (S9) = pre-chunked queues (S5) = saved
  views; the design already has saved views — the theory says make one of them the *armed
  default*.
- **Zero-state defaults**: "a good default state which users can then deviate from" (T-A2);
  "Users tend not to change an established behavior" (default bias, S21); SLA practice makes
  aging the default sort dimension (S24: "entries most needing action" first, T-A1). A page
  that opens on "all dossiers, newest first" answers the question nobody asked; a page that
  opens on "à traiter — mes dossiers actifs, plus urgents d'abord" answers the day's actual
  question with zero interaction cost (Spark effect, S21: "users are more likely to take
  action when the effort is small").

### Q6. Applied to the /dossiers row anatomy (argued from the above)

**What should command attention first?** None of the current candidates wins as-is:

- The **status chip** is a *categorical* fact — it tells you WHERE the dossier is, not
  whether it needs you. Nine-plus colored chips per screen = hue used for category, which
  spends the page's only preattentive channel (S18: color dominates; S16: "subdued and
  neutral, except … especially important") on information that is not an alarm. A wall of
  colored chips is "everything yelling" (S15).
- The **observation badge** is closer — it's rare, amber, and means "something flagged." It
  is the page's best existing Von-Restorff signal (S8) and should stay warm — but it encodes
  *presence of a note*, not urgency.
- The missing signal the theory demands is **temporal urgency — age of the dossier and/or
  days-in-current-status**. Every strand converges on it: Tesler (system should compute
  "which next", S3/S20); SLA practice (aging IS the triage dimension, S24); terracotta =
  time is ALREADY the design system's reserved warm hue — a lawful pop-out channel sitting
  unused on this page; Few ("especially important" earns the bright color, S16); Von
  Restorff (only overdue rows get it → rare → pops, S8). And it's cheap: `createdAt` is
  already on the doc (client-page.tsx line 276+); days-in-status needs one denormalized
  `statutChangedAt` timestamp (status history currently lives in a per-dossier subcollection,
  status-history-sheet.tsx line 150 — not queryable per-row at list time).

**Attention order the row should implement:**
Tier 1 (preattentive, rare): terracotta age signal on overdue/stale rows only.
Tier 2 (persistent anchor): réf expert (mono semibold, sticky left) + assuré.
Tier 3 (quiet): everything else in ink-3/ink-4, incl. de-saturated status treatment.

**Column verdicts** (promote / keep / demote / remove-to-detail), by scan value (S13),
frequency criterion (S11), and chunking (S5):

| Column | Verdict | Reason |
|---|---|---|
| réf expert | KEEP #1 | human-readable identifier, first-column primacy (S13) |
| assuré | KEEP #2 | the OTHER identifier users search by (name recall beats réf recall) |
| âge / jours-en-statut (NEW) | PROMOTE into left third | the triage signal; terracotta when over threshold (S24, S16, S8) |
| statut | PROMOTE position (left third), DEMOTE color | needed to choose a row, but categorical → mostly-ink chip, hue only for exceptional states |
| observation | PROMOTE position (pair with statut) | rare warning; scent for history behind click |
| compagnie | KEEP (mid) | secondary chooser; chunk with réf compagnie |
| date création (sortable) | KEEP but render relative | absolute dates force mental math; "12 j" + tooltip exact date (S12 enrich-not-replace) |
| matricule | KEEP (mid-right) | known-item search key for AT/terrain calls |
| nature, type | DEMOTE right / candidate for merge | low discrimination during scan; lookup value |
| réf compagnie | DEMOTE right or detail | lookup value (S17), used after row is found |
| matricule antérieur | REMOVE to detail | rarely populated; no scent, no discrimination |
| date sinistre, date requête | REMOVE to detail (or column-picker) | never drive "which row next"; taxes every scan (S11) |
| créé par | REMOVE to detail (or column-picker) | zero triage value in a small team |
| ⋯ actions | KEEP sticky right | edge-anchored (S2), serial-position slot (S4) |

Net: 14 → ~9 visible columns in 5 chunks, one new computed column, with a column-picker
(progressive disclosure, S11) so nothing is lost — complexity moves into the system (S20),
not deleted (S3-Tognazzini: power users will want the hidden columns back sometimes).

**Toolbar (8 controls, Hick S1):** the fix is not fewer capabilities but a stronger
recommended path: default view chip pre-armed ("À traiter"), search first (it subsumes most
filters for known-item tasks), date preset + range collapsed into one control, reset only
visible when a filter is active (state-dependent disclosure).

---

## PART C — CAVEATS

- Every "promote/demote" above is theory-derived, not user-tested. NN/g's own escape hatch
  applies: analytics/usability testing decide the frequency criterion (S11). The owner and
  real gestionnaires know which columns their phone calls actually reference — validate the
  remove-to-detail list against a week of real lookups before shipping.
- Days-in-status requires a schema addition (`statutChangedAt` denormalized on the dossier
  doc + backfill); age-of-dossier needs none.
- De-colorizing the status chip is a visible-behavior change to a feature users already
  learned (Jakob, S6) — if statut colors carry learned meaning for this team, keep hue for
  the 2–3 states that genuinely mean "blocked/action needed" and neutralize the rest, rather
  than neutralizing all.
