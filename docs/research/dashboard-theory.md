# Deciding What a Dashboard Should Contain — Research Report

Date: 2026-09-06. Researcher: UX-research subagent.
Target context: SL Auto Expertise, dense French back-office for a Moroccan auto loss-adjusting
firm. One "Tableau de bord" per role — Gestionnaire, Chiffreur, Agent de Terrain — plus an
Admin/Responsable d'équipe view with three tabs and a per-user toggle. A separate
"Suivi d'équipe" page already owns the team funnel, per-step cycle time, aging list and weekly
trend; the dashboards must not duplicate it.

Locked doctrine, not re-argued here: Few's "summary + exception on one screen, one exception
colour"; NN/g dashboard guidance; the stat-tile contract (label · 36/24 px value · caption
printing the real period); cream canvas, ink text, teal accent, terracotta reserved for time.

Source policy honoured: books and their authors' own sites (Few, Wexler/Shaffer/Cotgreave,
Tufte, Vacanti, Croll & Yoskovitz, Ries, Kaplan & Norton, Basili), practitioner blogs
(Perceptual Edge, Juice Analytics, Geckoboard, Klipfolio, Smashing, Pencil & Paper,
Nightingale, Eleken, 55 Degrees, Big Agile, ProKanban, Kanban Guides), course syllabi
(Coursera/UC Davis, DataCamp), a Substack and a dev.to post, NN/g. No design-system docs were
used. Reddit and Hacker News were attempted and blocked (see Part D).
Sources fetched: 41 (37 read in full, 4 partial). 12 could not be fetched.

---

## PART A — Sources

### A1. Stephen Few — "Dashboard Confusion" (Perceptual Edge, 2004)
- URL: https://www.perceptualedge.com/articles/ie/dashboard_confusion.pdf
- Fetched: YES (PDF read page by page)
- The canonical definition, verbatim: "A dashboard is a visual display of the most important
  information needed to achieve one or more objectives; consolidated and arranged on a single
  screen so the information can be monitored at a glance."
- Scope is deliberately broad: it serves "whether you're using it to make strategic decisions
  for a huge corporation, run the daily operations of a team, or perform tasks that involve no
  one but yourself. The means is a single-screen display; the purpose is to efficiently keep in
  touch with the information needed to do something."
- "High-level summaries. The information displayed in a dashboard should consist primarily of
  high-level summaries, including exceptions, to communicate at a glance. It quickly tells you
  what's happening, but not why it's happening."
- "Customized. The information on a dashboard must be tailored specifically to the
  requirements of a given person, group, or function; otherwise, it won't serve its purpose."
- Crucial for us — non-quantitative content is legitimate: "useful information isn't always
  quantitative, such as a list of new prospective sales leads or the imminent due dates of a
  project. If the job requires measures that have been officially defined as KPIs, you should
  include them, but not exclusively when other information is required as well."
- "Real-time information? If dashboard users need real-time information to achieve their
  objectives, then the dashboard should display it. Otherwise, periodic snapshots work fine."
- "A dashboard is a type of display or style of presentation, not a specific type of
  information or technology."
- The strategic / analytical / operational split is from the book (Information Dashboard
  Design, ch. 1) and is confirmed by the search-result summary of A6 and by A28; the book
  itself was not fetchable (Part D).

### A2. Stephen Few — "Thirteen Common Mistakes in Dashboard Design" (book excerpt, flylib)
- URL: https://flylib.com/books/en/2.412.1/thirteen_common_mistakes_in_dashboard_design.html
- Fetched: YES. Companion: The Data School walkthrough, part 1,
  https://www.thedataschool.co.uk/anh-vu/are-you-making-these-13-dashboard-design-mistakes/ (YES).
- The 13: (1) exceeding the boundaries of a single screen; (2) supplying inadequate context
  for the data; (3) displaying excessive detail or precision; (4) choosing a deficient
  measure; (5) choosing inappropriate display media; (6) introducing meaningless variety;
  (7) using poorly designed display media; (8) encoding quantitative data inaccurately;
  (9) arranging the data poorly; (10) highlighting important data ineffectively or not at
  all; (11) cluttering the display with useless decoration; (12) misusing or overusing
  color; (13) designing an unattractive visual display.
- Data School on (1): "Viewers should not have to scroll or switch between multiple screens"
  because short-term memory cannot hold the pieces. On (3): "Dashboards should provide a
  high-level overview with just enough information for viewers to grasp it quickly." On (4):
  a measure must state what is measured and its unit and "directly support your intended
  message". On (2): key numbers need "comparisons or trends" but not so much that the core
  message is obscured.
- Original PDF "Common Pitfalls in Dashboard Design" fetched but unreadable (Part D).

### A3. NN/g — "Dashboards: Making Charts and Graphs Easier to Understand"
- URL: https://www.nngroup.com/articles/dashboards-preattentive/
- Fetched: YES
- Definition: "Collections of data visualizations, presented in a single-page view that
  imparts at-a-glance information on which users can act quickly."
- "Their goal is not to facilitate exploration; instead, they provide information that can
  be consumed fast, with a minimum of interaction or cognitive processing."
- Operational dashboards support time-sensitive decisions; analytical ones "help users
  identify the need for further thought, investigation, research, or analysis."
- Encoding: "length" and "2D position" for quantity; "color should not be used to
  communicate information about quantitative values or magnitude"; colour and shape are
  for category membership. Pie charts "should be avoided most of the time"; no 3D.

### A4. Nick Desbarats — "Dashboards should only show the 'most important' metrics… right?"
- URL: https://www.goodreads.com/author_blog_posts/25158937-dashboards-should-only-show-the-most-important-metrics-right?tab=book
- Fetched: YES (Goodreads mirror of the Practical Reporting blog post)
- Contrarian to the "5–7 KPIs" folklore: organisations have "dozens of metrics (or more)
  that would genuinely require action if they went south"; if they are not monitored "many
  problems in the organization will go unnoticed and bad things will happen."
- "there's never a handful of 'truly important' metrics; there are only metrics that are
  important right now, and those change from one day/week/month to the next."
- Remedy: build "intelligence into the dashboard so that it automatically identifies and
  visually flags metrics that require attention" — "tactical monitoring dashboards" that show
  many metrics organised by role/department/entity, with alerts so users "instantly zero in
  on metrics that require attention."

### A5. Steve Wexler — conversation with Depict Data Studio; Data Rocks review of The Big Book of Dashboards
- URLs: https://depictdatastudio.com/dashboard-design-and-the-big-picture-in-dataviz-a-conversation-with-steve-wexler/ (YES);
  https://www.datarocks.co.nz/blog/data-viz-bookshelf_the-big-book-of-dashboards-wexler-shaffer-cotgreave (YES)
- Wexler's governing goal: "provide the greatest degree of understanding with the least
  amount of effort for your audience"; his favourite chapter is on "how do I best serve my
  audience?"
- The Big Book's definition (from the search-result summary of the Wiley page, corroborated
  by the review): "A dashboard is a visual display of data used to monitor conditions and/or
  facilitate understanding." 28 scenarios, each with "why it works" critique.
- Review's extracted rules: hierarchy through "size (Big Numbers, typography size), colour
  (with highlights), or position"; "Design to a grid"; "Remove everything for which we can't
  have a clear explanation"; iterate in "deep collaboration with my audience".
- BANs ("Big-Ass Numbers", coined by Wexler). From the datarevelations.com search summary
  (page itself 403): Wexler first thought BANs ornamental, then reversed — recommends "BANs
  with context"; they are "conversation starters (and finishers), provide context to
  adjacent charts, and serve as a universal color legend."

### A6. Stephanie Evergreen — "The Fourth Purpose of a Dashboard"
- URL: https://stephanieevergreen.com/the-fourth-purpose-of-a-dashboard/
- Fetched: NO (403; Goodreads mirror only exposed the lede). Search-result summary used.
- Restates Few's taxonomy: strategic = "executives, who want that 30,000 view of their key
  performance indicators, digestible at a glance … no widgets or dropdowns"; analytical =
  "for analysts", dropdowns/filters, layers for drilling; operational = "what you'd want in
  the nuclear power plant monitoring room — an extremely simple, basic, clear design with a
  visual like a bright red dot that jumps out into your face when there's a breach."
- Her lede, verbatim: "We try to please too many audience needs in the same screenshot and
  then no one is happy and the dashboard dies a slow, expensive death."

### A7. Juice Analytics — "9 Lessons on Data Products"
- URL: https://www.juiceanalytics.com/writing/blog-post-title-one-w2xj4
- Fetched: YES. Their 3-part "Guide to Creating Dashboards People Love to Use" PDFs were
  fetched but unreadable (Part D); the guide's Part 1 is described in search results as
  covering audience, dashboard type and "focusing the message on information and metrics
  that matter", Part 2 as "what form it should take".
- Lesson 1, "Apps, not Dashboards": "multiple, small, focused data products" — one dashboard
  that serves everyone confuses everyone.
- Lesson 2, "Form Follows Function": "A data product should be delivered and experienced by
  different audiences in different ways" — executives: static summaries; analysts:
  exploration; decision-makers on the go: real-time mobile.
- Lesson 4, "Lead with Actions": rather than making users drill, "lead with the To Dos or
  Actions".
- Lesson 5: defaults matter because most users never personalise.
- Lesson 6: wrap data in context (scope, purpose, guidance).

### A8. Den Otter Solutions — "Dashboard design: the 5-seconds rule"
- URL: https://denottersolutions.com/en/data-insights/dashboard-design-5-seconds-rule/
- Fetched: YES (the 5-second rule circulates widely — Juice, Tableau community — this is a
  practitioner statement of it; no primary origin found)
- "Within five seconds of opening a dashboard, you should see whether your business is on
  track — without searching, filtering or scrolling."
- Zones: top-left "KPI zone" (big numbers with signal), middle "trend zone", bottom-right
  "detail zone" (tables).
- Count: "six to eight maximum", and start from "three to four numbers the director wants to
  see every morning."
- "three colours maximum, each with a fixed meaning"; every number needs a comparison
  (budget, prior year, target).

### A9. Goal–Question–Metric (Basili, Caldiera, Rombach)
- URL: https://en.wikipedia.org/wiki/GQM
- Fetched: YES
- Three levels, verbatim: Goal — "defined for an object, for a variety of reasons, with
  respect to various models of quality, from various points of view and relative to a
  particular environment"; Question — "used to define models of the object of study and then
  focuses on that object to characterize the assessment or achievement of a specific goal";
  Metric — "associated with every question in order to answer it in a measurable way."
- Read top-down to define, bottom-up to interpret. Phases: planning, definition (11
  sub-steps incl. interviews), data collection, interpretation.
- The goal template (object / purpose / quality focus / viewpoint / context) is from the
  original 1994 paper (training knowledge); the "viewpoint" slot is what makes GQM produce a
  different metric set per role.

### A10. KPI Tree — "What is a metric tree?"
- URL: https://kpitree.co/guides/getting-started/what-is-a-metric-tree
- Fetched: YES
- "A metric tree is a hierarchical model that places your most important business metric at
  the top and decomposes it into the drivers, sub-drivers, and inputs that cause it to move."
- Leaves are "the metrics your teams directly control: activities, conversion rates,
  response times, campaign spend." Rule: "every metric exists because it drives something
  above it."
- "dashboards for surface-level monitoring, and metric trees for the structural
  understanding that drives decisions" — departments navigate the same tree "from their own
  vantage point".

### A11. Holistics — "Lean Analytics Part 1" (Croll & Yoskovitz digest)
- URL: https://www.holistics.io/blog/lean-analytics-part-1-an-introduction-to-analytical-thinking/
- Fetched: YES (Ash Maurya's Medium original was 403)
- A good metric is comparative; understandable ("If it's difficult to remember and difficult
  to discuss, it's nearly impossible to turn that insight into a change"); a ratio or rate
  ("Ratios are easier to act on"); behaviour-changing ("The ultimate test for whether a
  metric is actionable").
- "Vanity metrics make you feel good. Actionable metrics change your behaviour."
- "Leading metrics predict the future, lagging metrics explain the past."
- Exploratory vs reporting metrics; correlated vs causal.
- One Metric That Matters: pick it "from the riskiest portion of your business"; avoids
  "data puking".

### A12. Eric Ries — "Vanity Metrics vs. Actionable Metrics" (guest post, tim.blog)
- URL: https://tim.blog/2009/05/19/vanity-metrics-vs-actionable-metrics/
- Fetched: YES
- Vanity metrics "make you feel good, but they don't offer clear guidance for what to do"
  (total hits, messages sent).
- Actionable = demonstrable cause and effect; measure "on a per-customer or per-segment
  basis" — "Metrics are people, too."
- Decision test: "if this test turns out differently from how I expect, will that cast
  serious doubts on what I think I know about my customers?"
- Search-result corroboration: Ries's "three A's" — actionable, accessible, auditable.

### A13. Klipfolio — "Leading vs. Lagging Indicators"; Geckoboard — "Leading, lagging or lost"
- URLs: https://www.klipfolio.com/blog/leading-and-lagging-indicators (YES);
  https://www.geckoboard.com/blog/leading-lagging-or-lost-how-to-find-the-right-key-performance-indicators-for-your-sales-team/ (YES)
- Klipfolio: lagging = "An output: easy to measure, hard to change in the moment. It tells
  you what already happened." Leading = "An input: something you can directly influence …
  It tells you what's likely to come." "If your leading indicators are trending in the wrong
  direction, act before the lagging indicators confirm the damage."
- Geckoboard: leading indicators "change more rapidly and should be checked often. Consider
  adding them to a dashboard so you can track them in real time on a daily or weekly basis."
  Lagging ones "are not a good option for providing feedback to teams". Example pair:
  "Average Stage Length (leading)" vs "Sales Cycle Length (lagging)" — per-stage dwell
  time flags bottlenecks before the cycle finishes.

### A14. Kaplan & Norton — "The Balanced Scorecard: Measures That Drive Performance" (HBR 1992)
- URL: https://hbr.org/1992/01/the-balanced-scorecard-measures-that-drive-performance-2
- Fetched: PARTIAL (paywall; only the lede)
- "What you measure is what you get." Financial measures alone "can give misleading signals
  for continuous improvement".
- From training knowledge of the article: the cockpit analogy (a pilot needs several
  instruments at once, not one), four perspectives (financial, customer, internal process,
  learning/growth), and the recommendation to keep each perspective to a handful of
  measures. Balanced Scorecard is strategic-level; it tells us to balance outcome measures
  (lagging) with driver measures (leading), not what an operator's screen should show.

### A15. Vacanti — Actionable Agile Metrics for Predictability (re-read, weeks 3 and 4)
- URLs: https://tcagley.wordpress.com/2017/10/28/actionable-agile-metrics-for-predictability-by-daniel-s-vacanti-re-read-saturday-week-3-the-basic-metrics-of-flow/ (YES);
  https://tcagley.wordpress.com/2017/11/04/actionable-agile-metrics-for-predictability-by-daniel-s-vacanti-re-read-saturday-week-4-introduction-to-littles-law/ (YES)
- WIP: "The amount work that has arrived to be worked on in a system and has not yet exited
  the system, regardless of whether the item is actively being worked on or being delayed."
  Push systems (work assigned) typically carry higher WIP than pull systems.
- Cycle time: "The amount of elapsed time that a work item spends as work in process" —
  answers "When will it be done?" in calendar time every customer understands.
- Throughput: "A measure of the number of items that transverse the process in any given
  period" (departure rate). When arrival and departure rates desynchronise, WIP and cycle
  time both rise.
- Little's law: "Average cycle time = average work in progress / average throughput."
  Assumptions: input ≈ output; all started work completes; WIP stable; "Average age of WIP is
  not increasing"; consistent units.
- The actionable consequence: "if cycle times are too long, consider reducing WIP
  (continually starting work is a really bad idea)." "your policies shape your data and your
  data shape your policies."

### A16. Kanban Guides — The Kanban Guide (Vacanti & Coleman); ProKanban Pocket Guide ch. 6
- URLs: https://kanbanguides.org/the-kanban-guide/ (YES);
  https://prokanban.org/blog/the-kanban-pocket-guide-chapter-6-the-basic-metrics-of-flow (YES)
- Four mandatory measures: WIP "The number of work items started but not finished";
  Throughput "The number of work items finished per unit of time"; Work Item Age "The elapsed
  time between when a work item started and the current date"; Cycle Time "The elapsed time
  between when a work item started and when a work item finished."
- Service Level Expectation: "A forecast of how long it should take a work item to flow from
  started to finished … a period of elapsed time and a probability associated with that
  period (e.g., '85% of work items will be finished in eight days or less')".
- Active management: "Ensuring work items do not age unnecessarily, using the SLE as a
  reference."
- Pocket guide: "Age is by far the most important of all the flow metrics to track."

### A17. 55 Degrees — "What is Work Item Age?"; Big Agile — "Flow 101"; Yuval Yeret — flow metrics in Scrum events
- URLs: https://www.55degrees.se/blog/post/what-is-work-item-age (YES);
  https://big-agile.com/blog/flow-101-the-metrics-that-predict-delivery (YES);
  https://yuvalyeret.com/blog/4-key-flow-metrics-and-how-to-use-them-in-scrums-events/ (YES)
- 55 Degrees: age = (now − start) + 1; it is a leading indicator because it "highlights work
  that is currently in progress and potentially at risk of taking too long"; "If you manage
  only one thing, manage the age of your work items." Daily question becomes "what's not
  moving?"
- Big Agile: leaders should ask "what is aging, what is blocked, and what decision can I
  make to remove friction?" Weekly 10-minute review: throughput, current WIP, cycle time
  (median and 85th percentile), "top 3 aging items with blockers", one leadership decision.
- Yeret: "Current WIP and Work Item Age are the most important metrics in the Daily Scrum";
  "Work Item Age is a leading indicator only relevant for non-finished items"; inspect
  "right-to-left to unblock items nearing or exceeding the SLE". Throughput and historical
  cycle time belong to planning/review, not the daily view.

### A18. Laws of UX — Miller's Law
- URL: https://lawsofux.com/millers-law/
- Fetched: YES
- "The average person can only keep 7 (plus or minus 2) items in their working memory."
- Takeaway, verbatim: "Don't use the 'magical number seven' to justify unnecessary design
  limitations." "Organize content into smaller chunks to help users process, understand, and
  memorize easily."
- Search-result corroboration (Cowan 2001): the attentional core is ~4 chunks; chunking is
  the lever, not the number.

### A19. Bullet graph — Wikipedia; Few's blog on bullet-graph adoption
- URLs: https://en.wikipedia.org/wiki/Bullet_graph (YES); https://www.perceptualedge.com/blog/?p=375 (PARTIAL)
- "Bullet graphs were developed to overcome the fundamental issues of gauges and meters:
  they typically display too little information, require too much space, and are cluttered
  with useless and distracting decorations."
- Shows "a single, primary measure … compares that measure to one or more other measures …
  (for example, compared to a target), and displays it in the context of qualitative ranges
  of performance, such as poor, satisfactory, and good." Ranges as "varying intensities of a
  single hue … to restrict the use of colors on the dashboard to a minimum."
- Few: "provide more information in a smaller space, which is especially useful for
  dashboards."

### A20. Edward Tufte — "Sparkline theory and practice"
- URL: https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/
- Fetched: YES
- "a small intense, simple, word-sized graphic with typographic resolution" — "data-intense,
  design-simple, word-sized graphics", "datawords".
- Belong "embedded in a sentence, table, headline, map, spreadsheet, graphic" — anywhere "a
  word or number can be"; not a captioned special occasion.
- Rules: lumpy aspect ratio (bank to 45°); show a normal-range band, min/max, and the most
  recent value linked to the adjacent number; "design minimization, not data minimization".

### A21. Smashing Magazine — "Rethinking Data Visualisation: A UX Approach to Dashboards That Actually Drive Decisions" (2026)
- URL: https://www.smashingmagazine.com/2026/08/rethinking-data-visualisation-ux-approach-dashboards/
- Fetched: YES
- The IC dashboard "needed to act as a highly tailored, self-directed mirror that was
  granular, honest, and personal"; on opening it delivers "a clear priority list for the
  week ahead".
- The manager dashboard gives "a macro pulse check on team vulnerabilities", showing "where
  the consistent gaps" are, with a drill-down path to individuals; the manager needs "the
  baseline to intervene before a skill gap evolved into a critical project failure".
- Same metric, different weight: an IC "needs to know if they are pacing correctly"; a
  manager "needs to know precisely who requires immediate support."
- "Information and insight are entirely different states." Design-time question: "what
  should change once this data lands" / "what do I actually change?" Otherwise the
  dashboard defaults to "passive reporting rather than driving action."

### A22. Smashing Magazine — "From Good To Great In Dashboard Design: Research, Decluttering And Data Viz" (2021)
- URL: https://www.smashingmagazine.com/2021/11/dashboard-design-research-decluttering-data-viz/
- Fetched: YES
- Interview questions: "What information do users need the most?" "What is the purpose of
  this dashboard?" "What do users consult this dashboard for?" "How do they go about looking
  for this information currently?" — five users suffice.
- Card sorting to build an "information hierarchy within the dashboard that's consistent
  with users' mental models"; usability testing "arguably the most important" activity.
- "decluttering for the sake of decluttering is a poor design maxim" — declutter from test
  feedback; two-to-three colours; abundant white space; red/green carries a poor/good
  connotation that can mislead.

### A23. Pencil & Paper — "Dashboard Design UX Patterns"
- URL: https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards
- Fetched: YES
- Start from data architecture ("Is the data tracked over time? … Can we calculate if/when
  statements to create insights?").
- User-context mapping: "Find the overlaps and divergences. If the divergences are small
  enough, creating multiple unique versions might not be necessary."
- "Find out what is taking the most time for users to compile."
- Four dashboard kinds: Reporting; Monitoring ("real-time alerts for problems and
  anomalies"); Exploring & Discovery; Functional & Integrated ("guidance on where users
  should focus attention").
- F/Z scanning: "place the most global numbers, or the most relevant data" top-left, "stick
  the important stuff on the left side". "just because you have the data, doesn't mean it
  should be shown."

### A24. Geckoboard — "Effective dashboard design" guide; "Dashboard methodology"
- URLs: https://www.geckoboard.com/resources/dashboard-design/ (YES);
  https://www.geckoboard.com/best-practice/methodology/ (YES)
- "What's the purpose of your dashboard? Who's it for? What do you want them to do
  differently because of it?"
- Metric filters: "Everything should tie back to the purpose of your board"; metrics must
  "Can be influenced by your team", "Can be easily understood", change reasonably often,
  and not fluctuate so wildly that trends vanish.
- Layout: "The top left corner of your dashboard is the best location as that's where your
  eyes are naturally drawn to first"; "Use size and position to emphasize the most important
  information"; "Group your related metrics next to each other"; "Don't be afraid of empty
  space."
- Context: "To know if a number's good or bad your viewers need context" — previous period,
  averages, targets, warning thresholds. Exclude "decorative elements that don't communicate
  data."
- Methodology: strategic goal → immediate objectives → KPIs + supporting metrics; "One
  dashboard per goal/initiative"; "Only include what's important — everything should support
  your board's intent"; "don't be afraid to swap out metrics that aren't useful."

### A25. Nightingale (DVS) — "Adapting Dashboards for Different Formats"; review of Dashboards That Deliver
- URLs: https://nightingaledvs.com/adapting-dasboards-for-different-formats/ (YES);
  https://nightingaledvs.com/review-dashboards-that-deliver/ (PARTIAL — review only)
- Smartphone: "elements are arranged in order of importance — users might not scroll all the
  way to the end"; "Ensure there's not too much of it, that the buttons are large, and that
  all the text fits nicely"; concise labels/abbreviations.
- Desktop: test across monitor sizes. Big screens: large fonts, no ambiguous abbreviations,
  the dashboard "could speak for itself".
- Wexler/Shaffer/Cotgreave's 2025 book runs a seven-step framework: discovery → prototyping
  → development and user testing; 15 scenarios each stating audience, tools, timeline.

### A26. Eleken — "Why users ignore dashboards: 5 reasons"
- URL: https://www.eleken.co/blog-posts/why-users-ignore-dashboards
- Fetched: YES
- "They try to do too much, showing charts, KPIs, filters, tabs, and visual gimmicks, and
  creating cognitive overload."
- "A one-size-fits-all dashboard rarely works for everyone. Different roles care about
  different metrics." → role-based dashboards.
- "One wrong number is often all it takes to create low trust in dashboard data." → show
  timestamps and definitions.
- Also: unfamiliar navigation, no onboarding.

### A27. JTBD.one — "The Post-Dashboard Era: Why Visualization is the Enemy of Execution"
- URL: https://www.jtbd.one/p/the-post-dashboard-era-why-visualization
- Fetched: YES (polemical, but the mechanism is useful)
- "A dashboard displays 100 metrics that are 'Green' to hide the 1 metric that is 'Red'."
- The gap: observe in one place, interpret, navigate elsewhere to act — "Time-to-Action".
  Ideal: each alert paired with a "Resolve" button.
- "Silence is the ultimate metric of success. If the system is working, it should be
  invisible." Humans handle "only exceptions requiring judgment".

### A28. DataCamp — "Effective Dashboard Design" tutorial; Coursera/UC Davis — "Creating Dashboards and Storytelling with Tableau"
- URLs: https://www.datacamp.com/tutorial/dashboard-design-tutorial (YES);
  https://www.coursera.org/learn/dataviz-dashboards (YES)
- DataCamp taxonomy adds Tactical to Few's three: Analytical (analysts, ad hoc), Operational
  (shift leads, real time), Strategic (executives, monthly/quarterly), Tactical (managers,
  "Daily execution", daily/weekly), Explanatory.
- Step 1: "Three core questions the dashboard must answer in plain language"; tie each widget
  to an outcome; profile the audience's cadence and device. Step 2: "Pick a small set of
  KPIs that predict future performance, supported by a few helper metrics." Inverted
  pyramid: top = status and targets; middle = trends; bottom = details and ownership.
  Mistakes: overloading, poor chart choice, "Lack of context — frame metrics with targets,
  units, and timestamps", inconsistency, "Ignoring user needs — observe actual workflows".
- Coursera module 2 makes students "take on the role of a Business Intelligence Analyst
  working with stakeholders" and fill a RACI chart plus a data-requirements template to
  "define objectives, metrics, assumptions, and scope" before touching the tool.

### A29. dev.to — "Why dashboards fail"; Nick Valiotti — "Why most dashboards fail before they're built"
- URLs: https://dev.to/amoakomensa/why-dashboards-fail-2n54 (YES);
  https://nickvaliotti.substack.com/p/why-most-dashboards-fail-before-theyre (YES)
- dev.to: "Vague Objectives: Sometimes stakeholders only say 'we need a dashboard for our
  operations'"; "Clearly define Key Performance Indicators (KPIs) with thresholds, targets,
  and owners"; "Classify metrics into primary (KPIs) and secondary (supporting metrics)";
  "Present historical data alongside current metrics"; add an anomaly view.
- Valiotti: "What 3–5 decisions should this dashboard help us make?" — if stakeholders
  can't answer in 30 seconds, stop. "If you don't know what 'good' looks like, no dashboard
  will help." "Clarity first. Then visuals."

---

## PART B — Findings

**B1. A dashboard is defined by purpose and form, not by metric type.** Few: the most
important information for an objective, on one screen, monitorable at a glance (A1);
NN/g: consumed fast with minimal interaction, not for exploration (A3). Non-numeric content
— "imminent due dates", "a list of new prospective sales leads" — is explicitly allowed
(A1). *Implication:* our role dashboards may legitimately be part worklist; the test is
"needed to do the job, at a glance", not "is it a KPI".

**B2. Taxonomy: our three role screens are operational; the Admin view is tactical.**
Few's strategic / analytical / operational (A1, A6); DataCamp's added tactical layer —
managers, "daily execution", daily/weekly cadence (A28); Pencil & Paper's Monitoring and
Functional & Integrated kinds ("guidance on where users should focus attention") (A23).
Operational screens want the "bright red dot" (A6), tactical ones want comparison plus a
drill path (A21). *Implication:* Gestionnaire/Chiffreur/AT = monitoring + focus guidance;
Admin = tactical comparison with drill-down; nothing here is analytical — analysis lives on
Suivi d'équipe.

**B3. Dashboard ≠ report ≠ worklist, but the operational dashboard borrows from the
worklist.** Juice: "Lead with the To Dos or Actions", "Apps, not Dashboards", form follows
function per audience (A7); JTBD: pair the exception with its "Resolve" action (A27);
Smashing 2026: the IC opens to "a clear priority list" (A21). *Implication:* each role
dashboard's first block is an actionable exception list linking straight into the
dossier — not a chart.

**B4. One audience per screen.** Evergreen: pleasing several audiences on one screen
means "the dashboard dies a slow, expensive death" (A6); Eleken: "Different roles care
about different metrics" (A26); Few: "tailored specifically to … a given person, group, or
function" (A1); Pencil & Paper: split only where divergences are large (A23). *Implication:*
the per-role split is justified; the Admin tabs must reuse each role's vocabulary rather
than invent a fourth.

**B5. Metric selection is a top-down derivation from goal and viewpoint.** GQM's
goal → question → metric with an explicit viewpoint slot (A9); metric trees end at "the
metrics your teams directly control" (A10); Geckoboard: goal → objective → KPI + supporting,
"can be influenced by your team", "one dashboard per goal" (A24); Valiotti: "What 3–5
decisions should this dashboard help us make?" (A29); DataCamp: three plain-language
questions first (A28). *Implication:* write the 3 questions per role before choosing any
tile; every block must answer one of them.

**B6. Actionable beats vanity; ratios and comparisons beat totals.** Ries: cause and
effect, per-segment, the "cast serious doubts" test (A12); Croll & Yoskovitz: comparative,
understandable, ratio, behaviour-changing (A11). *Implication:* "Dossiers total" or
"Créés depuis toujours" are vanity; "En retard / en cours" and "Terminés cette semaine vs
semaine dernière" are actionable.

**B7. Operators need leading indicators; lagging ones belong to the review page.**
Klipfolio's influence test (A13); Geckoboard: leading indicators change fast and belong on
the live dashboard, lagging ones give no feedback to teams (A13); Kanban: "Work Item Age is
a leading indicator only relevant for non-finished items" (A17); throughput and historical
cycle time belong to planning/review events, not the daily view (A17). *Implication:* age
against the 24 h ouvrées SLA is the core dashboard metric; per-step cycle time stays on
Suivi d'équipe.

**B8. The four flow metrics map exactly onto our data.** WIP (A15, A16), age vs SLE
(A16), throughput (A16), cycle time (A16); Little's law ties WIP and throughput to the
cycle time a customer experiences (A15). "If you manage only one thing, manage the age of
your work items" (A17); daily question "what's not moving?" (A17); leader question "what is
aging, what is blocked, and what decision can I make to remove friction?" (A17).
*Implication:* per person: WIP, oldest item, count over SLE; per team: WIP per person vs
throughput per person reveals overload before cycle time degrades.

**B9. How many numbers: chunk, don't count.** Miller's law is not a design limit (A18);
Cowan's ~4 chunks (search corroboration); Den Otter: start from "three to four numbers the
director wants to see every morning", 6–8 maximum (A8); Desbarats: many metrics are fine if
the dashboard flags exceptions automatically (A4). *Implication:* 3–4 stat tiles per screen
as one chunk, one exception list as another, one small comparison block as a third; the
Admin per-person table can carry many columns because exceptions are auto-flagged.

**B10. Placement follows reading gravity; the most important thing goes top-left.**
Geckoboard (A24), Pencil & Paper (A23), Den Otter's KPI/trend/detail zones (A8), DataCamp's
inverted pyramid (status → trends → details/ownership) (A28). On phones, "elements are
arranged in order of importance — users might not scroll all the way to the end" (A25).
*Implication:* the 5-second answer to the role's question sits top-left (desktop) or first
(phone).

**B11. Big numbers need context; sparklines and bullet graphs are the compact way to
give it.** Few's mistake 2 (A2); Geckoboard's context list (A24); Wexler's "BANs with
context" (A5); Tufte: sparklines as word-sized datawords beside the number, showing the last
value and a normal band (A20); bullet graphs for measure-vs-target-in-ranges, single hue
(A19). *Implication:* every stat tile carries a comparison caption; a sparkline only where a
14-day trend changes the reading; bullet graphs only where there is a real target (SLA
compliance rate) — never gauges.

**B12. Common mistakes to design against.** Few's 13 (A2), especially exceeding one
screen, inadequate context, excessive precision, deficient measure, poor arrangement, weak
highlighting, colour misuse; Eleken's overload, one-size-fits-all, distrust (A26); DataCamp's
missing timestamps (A28); Smashing's warning that red/green connotations mislead (A22).
*Implication:* one exception colour; print the period and the "as of" time on tiles;
whole numbers; no decoration.

**B13. Individual vs manager dashboards differ in first block and in the unit of
comparison.** IC: "self-directed mirror", priority list, "am I pacing correctly" (A21);
manager: "macro pulse check", "where the consistent gaps" are, "who requires immediate
support", then drill down (A21); Big Agile's leadership review: throughput, WIP, cycle time
percentiles, top-3 aging with blockers, one decision (A17); Ries: metrics are people —
per-person cohorts (A12). *Implication:* role screens compare me-to-my-SLA and me-to-last-
week; the Admin screen compares person-to-person and flags the outliers.

**B14. Research the users before fixing the blocks.** Smashing's four interview questions
and five-user threshold (A22); Coursera's requirements template before building (A28);
Pencil & Paper's "what is taking the most time to compile" (A23); Geckoboard's "swap out
metrics that aren't useful" (A24). *Implication:* Part C is a research-backed default; a
short interview round with one user per role should confirm the three questions per role.

---

## PART C — Recommendations for SL Auto

Method used: for each audience, a GQM goal with viewpoint (B5), the three plain-language
questions the screen must answer in five seconds (A28, A8), then the ordered blocks. Block
order = reading gravity (B10). Colour: teal accent, ink, terracotta on time markers only;
the single exception colour is the one already locked. All ages and delays are in heures
ouvrées (jours fériés marocains exclus), the existing SLA model. Every tile prints its period
and "Mis à jour à HH:MM" (B12).

### C1. Gestionnaire — « Tableau de bord »

Goal (GQM): keep every dossier I own moving through its next milestone within the SLA,
from the viewpoint of the case handler, today.
Questions: (1) Qu'est-ce qui m'attend maintenant ? (2) Combien de dossiers ai-je en cours et
lesquels sont en retard ? (3) Est-ce que j'avance au même rythme que la semaine dernière ?

1. **« À traiter »** — exception list, top-left, full height of the left column. Rows are
   my dossiers whose current step has an unmet next action, sorted by age (oldest first),
   each row a link into the dossier tab that resolves it (A27). Candidate row types, all
   derived from existing milestones and logs: rappel reçu non lu; dossier créé sans
   planification; mission dont le RDV est passé sans photos; accord reçu du chiffreur non
   transmis; rapport validé non déposé; facture validée sans note d'honoraire. Each row
   shows the age of the wait (« depuis 6 h ouvrées », terracotta once > 24 h) and a
   one-word next action. Justification: Few — due dates and lists are dashboard content
   (A1); Juice "lead with the To Dos" (A7); Smashing IC "priority list" (A21); Kanban "what's
   not moving?" (A17). Cap at ~8 rows with « Voir tout » — the phone rule "might not scroll
   to the end" applies to the desktop eye too (A25).
2. **Four stat tiles** (one chunk, B9), right of or above the list depending on width:
   - « En cours » — nombre de dossiers dont je suis gestionnaire, non clôturés (WIP, A16).
     Caption: « dont N créés cette semaine ».
   - « En retard » — dossiers dont l'étape courante est ouverte depuis plus de 24 h
     ouvrées (age > SLE, A16/A17). Caption: « sur N en cours ». This is the one tile that
     takes the exception colour when > 0 (A4, A27).
   - « Rappels non lus » — rappels reçus, non lus. Caption: « le plus ancien : il y a 2 j ».
   - « Terminés (7 j) » — dossiers passés à rapport déposé (or the firm's chosen terminal
     milestone) au cours des 7 derniers jours, caption « sem. précédente : N » (throughput
     with comparison, A11/A24). A 14-day sparkline of daily completions inside this tile is
     acceptable (A20, A5) — only here.
3. **« Mes dossiers par étape »** — one row per pipeline step (création → photos → accord →
   facture → rapport → honoraires) with a count and a proportional bar, and, in terracotta,
   the number of those that exceed the SLA. This is personal WIP distribution (A15); it
   answers "where is my work piling up" without duplicating the team funnel because it is
   scoped to me and has no cycle-time column (A13, B7).
4. **« Les plus anciens »** — the three oldest open dossiers with age and current step
   (Big Agile's "top 3 aging items with blockers", A17). If block 1 is already sorted by
   age this may collapse into a header line of block 1; keep it separate only if block 1 is
   filtered to unmet actions and some old dossiers have no pending action.

Leave out: per-step cycle time, weekly trend chart, team funnel (Suivi d'équipe owns them,
B7); « Dossiers total » / all-time counts (vanity, B6); charts of compagnies or garages
(analytical, B2); anything about other gestionnaires (B13); gauges (A19).

### C2. Chiffreur — « Tableau de bord »

Goal: deliver each assigned chiffrage within 24 h ouvrées, revisions included, from the
viewpoint of the desk estimator, now.
Questions: (1) Quel dossier dois-je chiffrer maintenant ? (2) Suis-je dans les délais ?
(3) Combien de révisions me reviennent ?

1. **« File d'attente »** — top-left. All assignments with completedAt empty, ordered by
   remaining SLA (createdAt + 24 h ouvrées − now), the smallest first; columns: dossier,
   compagnie, garage/source, « Reste » (remaining business hours, terracotta when < 4 h,
   exception colour when negative), badge « 2ᵉ accord » / « 3ᵉ accord » for revisions, and
   an « Ouvrir » action. This is Work Item Age against an SLE, "right-to-left to unblock
   items nearing or exceeding the SLE" (A17, A16); the queue is the dashboard's action list
   (A7, A27).
2. **Four stat tiles**:
   - « En attente » — chiffrages assignés non terminés (WIP, A16). Caption: « dont N
     révisions ».
   - « Hors délai » — en attente dont l'âge dépasse 24 h ouvrées. Exception colour when > 0.
   - « Terminés (7 j) » — chiffrages avec completedAt dans les 7 derniers jours, caption
     « sem. précédente : N » (throughput, comparison, A11).
   - « Dans les délais (30 j) » — part des chiffrages terminés en ≤ 24 h ouvrées sur 30
     jours, printed as a percentage with the firm's target in the caption (ratio, A11; a
     bullet-style bar measure-vs-target is appropriate here and only here, A19).
3. **« Révisions »** — small block: nombre de 2ᵉ/3ᵉ accords demandés sur 30 j rapporté
   aux accords produits (« 4 révisions / 38 accords »). Revisions are the quality-side
   leading indicator for a chiffreur (A13: leading = something you can still influence);
   a ratio, not a count (A11).

Leave out: cycle-time distribution and percentiles (review-level, A17/B7); other
chiffreurs' throughput (B13); any funnel; charts by compagnie; a trend of revision rate
(Suivi d'équipe if anyone needs it).

### C3. Agent de Terrain — « Tableau de bord » (phone-first)

Goal: be at the right vehicle at the right time with the right photos, within 24 h ouvrées
of planification, from the viewpoint of the inspector, today.
Questions: (1) Où dois-je être ensuite ? (2) Qu'est-ce qui est en retard ? (3) Quelles
photos manquent ?

1. **« Prochaine mission »** — a single card, first on screen: dossier, véhicule /
   immatriculation, adresse, heure du RDV (terracotta countdown), phase (Avant / En cours /
   Après), one large primary action (« Pointer » → GPS check-in, or « Photos » once
   checked in). Nightingale: importance-ordered, large buttons, little text (A25); Juice:
   lead with the action (A7); JTBD: alert + Resolve in one place (A27).
2. **« Aujourd'hui »** — the day's missions ordered by dateRDV, each with time, phase chip,
   and a photo-status mark (photos présentes / manquantes). This is the AT's worklist and
   the only list most agents will scroll (A25, A21).
3. **« En retard »** — missions whose RDV has passed without check-in or without the
   phase's photos, and missions planned more than 24 h ouvrées ago with no RDV done
   (age vs SLE, A16). Exception colour on the block header only when count > 0; empty
   state reads « Rien en retard » — silence is the success signal (A27).
4. **Two stat tiles** (not four — one chunk on a phone, B9): « Missions cette semaine »
   as « 9 faites / 14 planifiées » (progress, comparison, A11/A24) and « Photos
   manquantes » (count over all open missions). Period printed.

Leave out: any chart or sparkline (A25: keep it small and tappable); cycle time; map view
of all missions (a tool, not a dashboard — link it from block 2 if wanted); comparisons
with other agents (B13); weekly trends.

### C4. Admin / Responsable d'équipe — « Tableau de bord » with tabs Gestionnaires · Chiffreurs · Terrain

Goal: spot today who and what needs intervention, from the viewpoint of the team lead,
before the SLA breaches show up in cycle time; then look at one person exactly as they see
themselves.
Questions: (1) Qui est en difficulté maintenant ? (2) Où le travail s'accumule-t-il ?
(3) Le rythme de l'équipe tient-il par rapport à la semaine dernière ?

Per tab, same skeleton, role vocabulary:

1. **Team stat tiles (4)** — « En cours » (team WIP), « En retard » (team items over SLE;
   exception colour when > 0), « Non assignés » (chiffrages sans chiffreur / missions sans
   agent / dossiers sans gestionnaire — arrival not yet pulled, the push-system WIP trap,
   A15), « Terminés (7 j) » with « sem. précédente » caption (throughput comparison, A11).
   Tactical summary first (A28 inverted pyramid; A8 KPI zone).
2. **« Exceptions »** — the union of every team member's exception rows (C1-1, C2-1
   negatives, C3-3), sorted by age, with the owner's name as a column. Desbarats: show many
   things if the screen flags what matters (A4); the manager's "macro pulse check" (A21);
   Big Agile's "top aging items with blockers" (A17). Cap at ~10 with « Voir tout ».
3. **« Par personne »** — the comparison table, one row per user of that role, columns:
   En cours (WIP) · Plus ancien (max age, terracotta) · En retard · Terminés 7 j · Dans les
   délais 30 j (%). Sort default: En retard desc, then Plus ancien desc. Little's law makes
   the reading direct: high WIP with low throughput = rising cycle time for that person
   (A15); the manager needs "who requires immediate support" (A21). A thin inline bar on
   the WIP column is enough; no colour except the exception colour on breached cells (A3:
   colour for category, length for quantity). The row's name is the **per-user toggle**:
   clicking it swaps the page for that person's own dashboard (C1/C2/C3), unchanged, with a
   « Retour à l'équipe » control — the drill path Smashing describes (A21), and the
   cheapest way to honour "one audience per screen" (B4) without a fourth vocabulary.
4. **Optional « Charge »** — WIP per person as a single horizontal bar chart when the team
   is larger than ~8; below that the table already shows it. Arrival/departure balance is
   the manager's lever (A15).

Leave out (and why): the funnel, per-step cycle time, aging list and weekly trend — Suivi
d'équipe owns them (brief); leaderboards or rankings on lagging metrics — "your policies
shape your data" (A15) and lagging feedback does not help teams (A13); all-time totals
(B6); compagnie/garage analytics (analytical, B2); per-user pages with different metrics
from the person's own dashboard (B4, A23).

### C5. Cross-cutting rules for all four

- One screen per role, no scrolling to reach the first exception (A1, A2 mistake 1).
- Every number prints its period and its comparison (A2 mistake 2; A24; A28) —
  the stat-tile caption is exactly this.
- Whole numbers and business hours; no decimals except the SLA percentage (A2 mistake 3).
- One exception colour, used only when something is actually breached; terracotta only
  on time values (locked doctrine, corroborated by A8 "three colours maximum, each with a
  fixed meaning" and A22's red/green warning).
- Sparklines only beside a throughput tile; bullet bar only beside the SLA percentage;
  never gauges, never pies (A19, A20, A3).
- Empty exception lists must render as an explicit « Rien à signaler » line, not a blank
  card (A27).
- Validate the three questions per role with one 20-minute interview per role before
  freezing the blocks (A22, A28, A24).

---

## PART D — Could not fetch

- https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf — fetched as binary; no text layer extractable, no PDF renderer on this machine. Content covered via A2 mirrors.
- https://www.perceptualedge.com/files/Dashboard_Design_Course.pdf — exceeds 10 MB fetch limit.
- https://www.dataplusscience.com/files/Dashboard_Design_Part_1.pdf and Part_2.pdf; https://www.juiceanalytics.com/s/Dashboards_People_Love_To_Use_Whitepaper_v2.pdf — binary, unreadable. Juice covered through A7 and search descriptions.
- https://stephanieevergreen.com/the-fourth-purpose-of-a-dashboard/ — 403; Goodreads mirror gave only the lede; blog index pages 1 and 5 did not list it.
- https://medium.com/lean-stack/lean-analytics-the-one-metric-that-matters-and-other-provocations-fd3006aab17 — 403 (Medium). Replaced by A11.
- https://www.datarevelations.com/bans/ — 403. BAN content taken from search summary and A5's second source.
- https://www.wiley.com/…Big+Book+of+Dashboards… — 403.
- https://www.betterevaluation.org/tools-resources/bullet-graph-design-specification — 403; Wikipedia used instead.
- https://www.smartcville.com/… Big Book review — redirects to an unrelated site.
- Reddit (old.reddit.com search, r/BusinessIntelligence) — blocked at the fetch layer; web search returned no Reddit threads for any phrasing tried.
- Hacker News items 6201876 and 13308263 — HTTP 429 on both attempts.
- https://dataviztoday.com/shownotes/99 — page fetched but contains only the episode teaser, no content.
