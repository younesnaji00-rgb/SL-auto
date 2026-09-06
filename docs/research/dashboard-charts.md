# Dashboard charts — which visual form for which metric (2026-09-06)

Scope: the operations / claims dashboards of SL Auto as they grow past the four stat
tiles: backlog aging, throughput, cycle time, SLA compliance, supplement/revision rate,
per-person load, per-compagnie and per-type mix, geographic spread of missions, photo
turnaround, weekly/monthly trends, forecasts. This note decides the *visual form* and the
*drawing rules* per metric type, then recommends how to draw them in this repo.

It builds on, and does not repeat, `docs/research/dashboard-theory.md` (Kanban flow
metrics §A15–A17, B7–B8: age vs SLE is the live metric, throughput and historical cycle
time belong to the review page) and `docs/research/dashboard-elements.md` (B1 stat tile,
B2 bullet, B3 segmented meter, B5 trend rules, B6 strip plot, Tufte sparkline anatomy in
A4). Where a rule below already exists there it is cited as `elements B2` etc.

Local facts that shape the recommendation (read 2026-09-06):

- `package.json`: `recharts ^2.15.1` is installed; the only import in `src/` is the shadcn
  wrapper `src/components/ui/chart.tsx` (ChartContainer/ChartTooltip/ChartLegend). **No
  page imports it.** No d3, visx, nivo, chart.js, uPlot or Tremor. `d3-scale`, `d3-shape`,
  `d3-array` exist only as transitive deps of recharts (`victory-vendor`).
- `src/app/(app)/monitoring/page.tsx` (Suivi d'équipe) draws everything **without a chart
  library**: the funnel = `KpiCard` tiles; « Volume par étape » = a horizontal bar list of
  absolutely-positioned `<span>` divs with `width: calc((100% - 2.25rem) * frac)` and the
  count printed at the bar tip; « Délais par étape » (cycle time) = a `<Table>` of medians;
  « Répartition par compagnie » = a table. The weekly trend card was removed in commit
  `1f45266` (`computeWeeklyTrend` survives only in `metrics.ts` + its test).
- `src/app/globals.css`: tokens `--chart-1…5`, `--ink…ink-4`, `--surface-1…4`,
  `--hairline`, `--hairline-strong`, light + dark values; `font-variant-numeric:
  tabular-nums` already declared (lines 271, 504) and `.t-mono`. Font = Inter (has `tnum`).
- `docs/motion-spec.md` §8: charts never animate their entrance (`isAnimationActive=
  {false}`), KPI numbers never count up. `docs/element-specs.md` §22: `chart-1…5` fixed
  by entity, gridlines `hairline`, no dual axis, no status green as a series, no hue by rank.

---

## PART A — Sources (fetched, with what each contributed)

Legend: ✓ = fetched and read. Sources are numbered S1–S66 and cited by number below.
Big design-system pages were used only as corroboration (S43, S45 are library docs).

### A. Flow metrics (Kanban / ActionableAgile family)

- **S1** ✓ 55 Degrees — Managing Work Item Age in ActionableAgile
  https://www.55degrees.se/blog/post/managing-work-item-age-in-actionableagile
  "the columns reflect your workflow stages and the items show as dots in the appropriate
  column"; "A dot may reflect more than one work item if they are in the same workflow
  stage and have the same Work Item Age"; "ActionableAgile overlays percentile lines from
  the Cycle Time data to add this context right where you need it"; "If you can only
  measure and manage one thing, make it Work Item Age."
- **S2** ✓ Nave — Aging Chart https://getnave.com/aging-chart
  "each column representing a state in your workflow"; "The percentile lines on your Aging
  Chart represent your past performance and show the cycle times needed to complete your
  previous work"; "A big cluster of dots indicates that there is too much work in progress
  in a certain state"; "take a closer look at the tasks that move to the yellow zone."
- **S3** ✓ Nave — Cycle Time Scatterplot https://getnave.com/cycle-time-scatterplot
  "Each data point corresponds to an individual completed work item"; "the higher the dot,
  the longer it took"; "The dotted horizontal lines … are called percentile lines"; look for
  "Gaps, high variability, clusters of dots, or a progressively growing triangle shape".
- **S4** ✓ Cagley — Vacanti re-read, week 11: cycle time scatterplots
  https://tcagley.wordpress.com/2018/01/06/actionable-agile-metrics-for-predictability-by-daniel-s-vacanti-re-read-saturday-week-11-introduction-to-cycle-time-scatterplots/
  "The x-axis usually is denominated in calendar days or weeks. The y-axis represents cycle
  time in days"; data "do not follow a normal distribution" so use percentiles, not averages
  ("If Bill Gates walks into a bar…"); 50th = "50% of the stories complete in under 7 days",
  85th = the commitment level.
- **S5** ✓ ProKanban — CFDs: cutting through the colourful clutter
  https://prokanban.org/blog/cumulative-flow-diagrams-cutting-through-the-colourful-clutter
  First impression "a bunch of random blocks of colour that resembled a badly constructed
  rainbow"; WIP is "the only metric on a CFD that reflects an exact count at a given time";
  cycle time from a CFD "is approximate"; throughput read off it "is an average — not an
  exact count"; do not forecast from it: "Plans based on averages fail — on average"; read
  the *pattern*: bands narrowing (starvation) or widening (aging build-up).
- **S6** ✓ ProKanban — What is throughput https://prokanban.org/blog/what-is-throughput-and-why-should-you-care
  "look at a chart of throughput data over time, and layer in qualitative context such as
  organizational changes, onboarding…"; "Throughput fuels probabilistic forecasting."
- **S7** ✓ ActionableAgile docs — Cycle Time Histogram https://55degrees.atlassian.net/wiki/spaces/AAS/pages/699269592
  x = cycle time, y = "the number of items that had that particular cycle time"; percentile
  lines read "XX% of items finished in X days or less".
- **S8** ✓ 55 Degrees — pace percentiles (teaser only) https://www.55degrees.se/blog/post/pace-percentiles-signals
  Only useful line: people "very often misinterpret what this particular signal really tells us" — i.e. even the vendor flags stage-level percentile bands as easy to misread.
- **S9** ✓ bagile — DIY "When will it be done?" https://www.bagile.co.uk/diy-when-will-it-be-done/
  10 000 trials; result communicated as a percentile table: "50th centile 35.37 Days 50% chance 100 work items completed by 16-May-23", likewise 75/85/95.
- **S10** ✓ Hammarberg — Monte Carlo in one Sheets function https://www.marcusoft.net/2024/03/monte-carlo-simulation.html
  Sample "a random day throughput" until backlog hits zero, "10000 is probably needed"; output = histogram of completion dates **plus** a three-line percentile table "With 50% certainty 2024-06-10 / 80% 2024-07-03 / 95% 2024-07-16"; caveat: past throughput only.
- **S11** ✓ Businessmap — Kanban forecasting https://businessmap.io/blog/kanban-forecasting
  "choosing the 85th percentile means there is an 85% chance the forecasted duration is accurate based on historical data"; prerequisite "how stable and predictable your workflow is"; "Notice if the bands are expanding … more work is entering the process than exiting."
- **S12** ✓ Broken Build — Kanban burn-up example https://www.brokenbuild.net/examples/kanban-burnup-chart
  Burn-up = "total scope" line + "completed work" line "rising toward the total scope" + three forecast lines (min / average / max velocity); aimed at "Product Managers, Scrum Masters, and Program Leads" for a release scope.

### B. Trend visuals

- **S13** ✓ Datawrapper — What to consider when creating line charts https://www.datawrapper.de/blog/line-charts
  "line charts have the big advantage that they don't need to start from zero", but "Consider extending your y-axis to zero" when data comes close to it; "if you only have a few values of one category at the same time intervals" use columns; "Consider turning off automatic labeling and place the labels yourself"; "Grey is a great color to separate what's important in your chart from what's not important"; annotate where data becomes projection.
- **S14** ✓ Datawrapper Academy — Why our column and bar charts start at zero https://www.datawrapper.de/academy/why-our-column-and-bar-charts-start-at-zero
  "Truncated y-axes in column charts and bar charts are considered deceptive and misleading"; Pandey et al. 2015: viewers "perceived the underlying message in its exaggerated form"; alternatives: dot/range plots ("there's no filled bar or column that would indicate" zero), lines, or plot the differences.
- **S15** ✓ Chad Skelton — Bar charts should always start at zero. But what about line charts? https://www.chadskelton.com/2018/06/bar-charts-should-always-start-at-zero.html
  In the same 2015 study "the gap between the control and the deceptive line chart was greater than it was for the bar charts" even "though the axes were properly labelled"; "Most line charts should start at zero" except when zero is arbitrary or a small important change is invisible; risk is lower for "internal dashboards" than for the public.
- **S16** ✓ Voilà — A golden ratio for truncated y-axes https://chezvoila.com/blog/yaxis/
  If a line chart does not start at zero, "The bottom third of the plot area should remain empty"; 20 % "veers very close to the bottom, like a plane that's flying too low".
- **S17** ✓ Datawrapper (Rost 2018) — Dual-axis charts https://www.datawrapper.de/blog/dualaxis/
  "The scales of dual axis charts are arbitrary and can therefore (deliberately) mislead readers"; the cited study: "the superimposed chart performed poorly both in terms of accuracy and time"; alternatives: side-by-side charts, indexed charts, prioritise + annotate, connected scatter.
- **S18** ✓ Datawrapper — What to consider when creating dual-axis charts https://www.datawrapper.de/blog/dual-axis-charts-guide
  "Only use dual-axis charts when comparing data series with different units"; "Use dual-axis charts if your audience knows how to read them"; if forced: "If you start one axis at zero, start the other one at zero, too", "Avoid line crossovers", different mark types per axis; otherwise "consider indexed charts" or small multiples.
- **S19** ✓ Antichaos — Line chart: better ways to compare years https://antichaosdata.com/line-chart-better/
  Current year "a bold color", "grayscale lines for previous years – dark-gray for the most recent year, toned down to light-gray for years longer ago"; "when a year has passed, the 'new current' year is automatically the new 'bold' line"; thicker lines alone "makes it even harder to understand the values of that line".
- **S20** ✓ Metabase Learn — Period-over-period comparisons https://www.metabase.com/learn/metabase-basics/querying-and-dashboards/time-series/time-series-comparisons
  Trend tiles "compare to static values (like to a goal you've set), or to several periods"; a trend tile can carry "two comparisons: one comparison with the previous month, and one with the same month a year ago"; filter "after summarizing the data, not before" so prior periods stay complete.
- **S21** ✓ Juice Analytics — Better know a visualization: small multiples https://www.juiceanalytics.com/writing/better-know-visualization-small-multiples
  "Small multiples should share the same measures, scales, size, and shape"; "Placement … should reflect some logical order"; "The simplicity of the chart is critical."
- **S22** ✓ Storytelling with Data — #SWDchallenge small multiples https://www.storytellingwithdata.com/blog/2020/1/6/swdchallenge-small-multiples
  "the axes and scale should generally be [consistent] across the repeated charts"; "the reader only has to figure out how to read one graph and then they know how to read the rest".
- **S23** ✓ Datawrapper — What to consider when creating tables https://www.datawrapper.de/blog/guide-what-to-consider-when-creating-tables
  Heatmap cells: "The higher a number, the darker/more saturated the cell background becomes"; "Consider showing bars not for each of your number columns, but only the most important one(s)"; sparklines show "how something developed in-between"; whole-cell colour must be "pastel background colors".

### C. Distribution visuals

- **S24** ✓ Nightingale (Desbarats) — I've stopped using box plots. Should you? https://nightingaledvs.com/ive-stopped-using-box-plots-should-you/
  Box plots "require audiences to understand the concept of dividing a sorted set of values into ranges"; "always make distributions look 'bell shaped'"; strip plots are grasped "in a few seconds" and explained in one sentence ("Each dot is the age of a study participant"); jitter for "dozens to hundreds"; distribution heatmaps for hundreds+.
- **S25** ✓ Nightingale (Desbarats) — I stopped using box plots: the aftermath https://nightingaledvs.com/i-stopped-using-box-plots-the-aftermath/
  Quartiles "are chart features, not insights"; outliers are just as visible "as distant dots"; overlaying boxes on strips "add[s] complexity without revealing insights"; the strongest argument is not making the audience feel "needlessly stupid".
- **S26** ✓ Quantize Analytics — AR dashboard examples https://www.quantizeanalytics.co.uk/accounts-receivable-dashboard-examples/
  Aging is shown as "a stacked bar chart … overdue periods (e.g., 1-30 days, 31-60 days, 61-90 days, over 90 days)" with segments "on-time and various overdue periods" — the industry-default aging-bucket form.

### D. Composition (part-to-whole)

- **S27** ✓ Few — Save the Pies for Dessert (2007, PDF read via pdftotext) https://www.perceptualedge.com/articles/visual_business_intelligence/save_the_pies_for_dessert.pdf
  "Pie charts only make it easy to judge the magnitude of a slice when it is close to 0%, 25%, 50%, 75%, or 100%"; a bar on a "percentage scale conveys a part-to-whole relationship only slightly less effectively than a pie chart"; labelling every slice "turned the pie chart into an awkwardly arranged equivalent of a table"; "Our eyes are great at comparing differences in 2-D location and differences in line length, but not 2-D areas and angles"; for change over time "Nothing shows change through time better than a line."
- **S28** ✓ Datawrapper — Pie charts, what to consider https://www.datawrapper.de/blog/pie-charts
  "Pie charts work best if you only have a few values – five max"; "work best for values around 25%, 50% or 75%"; "not the best choice if you want readers to compare the size of shares"; "One pie chart can only show one total"; use "shades of one color" for the rest.
- **S29** ✓ Kosara (eagereyes) — Illustrated tour of the pie chart study https://eagereyes.org/blog/2016/an-illustrated-tour-of-the-pie-chart-study-results
  "we do not read pie charts by angle" — arc length and/or area; "the donut chart is no worse than the pie chart" (thinnest ring marginally worse); exploded / irregular slices raise error.
- **S30** ✓ Nightingale (Desbarats) — Have I resolved the pie chart debate? https://nightingaledvs.com/have-i-resolved-the-pie-chart-debate/
  Pie only when "It's more important to show what fraction of the total each part represents, as opposed to showing precise comparisons" and "fewer than about six or seven parts"; bars when the message is "Mrs. Perez donated more than Mrs. Smith"; stacked bars for "cumulative subtotals of absolute values".
- **S31** ✓ Nightingale — Likert data seven ways https://nightingaledvs.com/visualizing-likert-scale-data-same-data-displayed-seven-different-ways/
  In a 100 % stack "it isn't possible to have a common baseline on both the left- and right-hand side"; small multiples let "our eyes only need to scroll across the screen". (Its diverging-stack endorsement is contradicted by elements A7 and S27's baseline argument for non-Likert data — we keep A7.)

### E. Comparison / ranking / heat tables

- **S32** ✓ Klipfolio — Bullet charts https://www.klipfolio.com/blog/bullet-charts-targets
  Three layers: "a tick-line representing your target, a solid bar showing your current value, and a shaded background bar representing a comparative benchmark"; "information-dense yet instantly readable"; a gauge suits only "a single metric against one target".
- **S33** ✓ EU Data Visualisation Guide — Sorting bars https://data.europa.eu/apps/data-visualisation-guide/sorting-bars
  No inherent order → "ordered based on the numerical values, so that the biggest bars are on one side"; inherent order (age classes, ratings) → "ordered according to this inherent ordering".
- **S34** ✓ Datawrapper — Which color scale to use https://www.datawrapper.de/blog/which-color-scale-to-use-in-data-vis
  Sequential "for visualizing numbers that go from low to high"; diverging for "negative and positive values"; categorical hues for "categories that don't have an intrinsic order"; classed vs unclassed gradients both valid.
- **S35** ✓ Datawrapper Academy — How to create a heatmap https://www.datawrapper.de/academy/how-to-create-a-heatmap
  "Steps show all the values within a certain range with the same color. Continous assigns each value an own color"; custom min/center/max; if values are hidden "turn on the option Show values in tooltips instead"; colour legend available.
- **S36** ✓ Zendesk Explore — Ticket creation heatmap recipe https://support.zendesk.com/hc/en-us/articles/4408826529562-Explore-recipe-Ticket-creation-heatmap
  Columns "Day of week", rows "Hour"; gradient from white to one colour "to represent heavy traffic"; cells carry "% of Total"; "a compact and easy to read way" to see activity by time.
- **S37** ✓ Grafana — Hourly heatmap panel https://grafana.com/grafana/plugins/marcusolsson-hourly-heatmap-panel/
  "aggregates data into buckets by day and hour"; borders "distinguish cells with similar values"; "choose the hours to display. This can be used to set working hours".
- **S38** ✓ HN comment 10714119 (via hn.algolia API) https://hn.algolia.com/api/v1/search?query=%22gauge%20charts%22%20dashboard&tags=comment
  "Gauge charts, which are cousins of a pie chart, i.e. the thing you use when you care about how nice something looks, as opposed to actually making it useful"; "charts and dashboards are means to an end, not end in itself."

### F. Geography

- **S39** ✓ Ericson — When maps shouldn't be maps https://www.ericson.net/content/2011/10/when-maps-shouldnt-be-maps/
  Map only when geography is the question; "the most important trends … don't correspond to clear geographic patterns" → sorted table; a map forces readers to "visually sum up all the colors… in their head".
- **S40** ✓ Datawrapper — Choropleth maps, what to consider https://www.datawrapper.de/blog/choroplethmaps
  "If you want to point out the numeric differences between regions, consider another chart type, a table or text instead"; absolute counts → "consider a symbol map instead", which "will often just answer the question 'Where do most people live?'"; "Readers will have a hard time perceiving the small differences between colors".
- **S41** ✓ Datawrapper Academy — Symbol maps https://www.datawrapper.de/academy/how-to-create-a-symbol-map-in-datawrapper
  Symbol maps are for "data about specific locations (e.g. cities)"; need "latitudes/longitudes"; place names are ambiguous.
- **S42** ✓ xkcd 1138 "Heatmap" https://xkcd.com/1138/
  Geographic heatmaps of usage are "indistinguishable from maps of the location of" the population — the population-map trap.

### G. Implementation

- **S43** ✓ shadcn/ui — Chart https://ui.shadcn.com/docs/components/chart
  "We use Recharts under the hood"; colours via `--chart-1` referenced as `var(--color-KEY)`; `accessibilityLayer` "adds keyboard access and screen reader support"; "Keep a height, `min-h-*`, or `aspect-*` on `ChartContainer` so `ResponsiveContainer` can measure on first render"; component now targets Recharts v3.
- **S44** ✓ recharts issue #3595 https://github.com/recharts/recharts/issues/3595
  "ResponsiveContainer doesn't let me render charts on server or when JavaScript is disabled" — it reads `window`; ask: default width/height and "All DOM operations should be in `useEffect`".
- **S45** ✓ recharts API — ResponsiveContainer https://recharts.github.io/en-US/api/ResponsiveContainer/
  `initialDimension` default `{width:-1,height:-1}` (values before ResizeObserver runs); `aspect`, `minWidth`, `minHeight`, `debounce`; relies on ResizeObserver.
- **S46** ✓ recharts wiki — Recharts and accessibility https://github.com/recharts/recharts/wiki/Recharts-and-accessibility
  `accessibilityLayer` "false by default in 2.x, and true by default in 3.0"; arrow keys move the active index; container gets `role="application"` so JAWS/NVDA enter Forms Mode; VoiceOver users must "turn QuickNav off".
- **S47** ✓ Ashlee M. Boyer — Accessibility review of shadcn/ui charts https://ashleemboyer.com/blog/a-quick-ish-accessibility-review-shadcn-ui-charts/
  "The 'screen reader support' claim is false. No information is presented about the data by a screen reader when using the left or right arrow keys"; "The charts tested do not have a text alternative"; legend "has no directly coded relationship to the chart"; tooltips "are not hoverable or persistent"; colour is "the only way someone can visually distinguish data".
- **S48** ✓ ustwo — Accessible bar and line charts https://engineering.ustwo.com/articles/creating-an-accessible-barchart/
  Wrap the library SVG in `<div role="img" aria-label>` because "Everything inside a containing element with role="img" is ignored by screen readers"; add a `figure` with short + long description; an accessible x-axis overlay; pattern "can be used to augment any inaccessible charting library".
- **S49** ✓ Léonie Watson — Accessible SVG line graphs https://tink.uk/accessible-svg-line-graphs/
  ARIA table roles inside SVG (`role="table"/"row"/"columnheader"/"cell"`), `aria-hidden` on axis text; works "with Jaws in Chrome and IE, but only partially in Firefox", "NVDA struggles" → "provide an alternative view of the information", graphical and tabular.
- **S50** ✓ Fizz Studio (Elavsky) — Accessible charts with ARIA https://blog.fizz.studio/accessible-charts-with-aria/
  `graphics-document` / `graphics-object` / `graphics-symbol` roles, `aria-roledescription` so a reader says "bar element"; "ARIA is very useful, but widely misunderstood and misused"; author "noticed glitches in browser and screen reader support".
- **S51** ✓ Sara Soueidan — Accessible data charts, Khan Academy report https://www.sarasoueidan.com/blog/accessible-data-charts-for-khan-academy-2018-annual-report/
  `role="img"` + `aria-label` + `aria-describedby` long text; "The state of SVG accessibility support in browsers and screen readers is still highly inconsistent, even when ARIA is used."
- **S52** ✓ Chart.js docs — Accessibility https://www.chartjs.org/docs/latest/general/accessibility.html
  "The canvas content will not be accessible to screen readers"; give the canvas `role` + `aria-label` and real fallback content.
- **S53** ✓ uPlot README https://github.com/leeoniya/uPlot
  "~50 KB min", Canvas 2D, time-series first, "no animations or transitions", no stacked series, no built-in panning; for streaming/100k-point cases.
- **S54** ✓ visx README https://github.com/airbnb/visx
  "reusable low-level visualization components … combines the power of d3 … with the benefits of react"; "largely unopinionated and is meant to be built upon"; "pick and choose the packages you need"; animation deliberately omitted: "each org or app will eventually want full control over their own implementation".
- **S55** ✓ nivo — About https://nivo.rocks/about/
  SVG, HTML and Canvas renderers; "Server side rendering API"; motion "powered by @react-spring"; theming docs.
- **S56** ✓ Tremor — Installation https://www.tremor.so/docs/getting-started/installation
  "Tremor Raw is designed for React v18.2.0+ and requires Tailwind CSS v4.0+" (this repo is Tailwind 3.4); copy-paste blocks model.
- **S57** ✓ PkgPulse — Recharts vs Chart.js vs Nivo vs visx (2026) https://www.pkgpulse.com/guides/recharts-vs-chartjs-vs-nivo-vs-visx-react-charting-2026
  Nivo "all SVG charts include ARIA labels and keyboard navigation"; Chart.js a11y "Limited" (canvas); Recharts "Partial"; visx "Manual"; Recharts for "standard dashboards" when "developer velocity matters more than pixel-perfect customization".
- **S58** ✓ LogRocket — Best React chart libraries 2026 https://blog.logrocket.com/best-react-chart-libraries-2026/
  Recharts "Convenient but not especially small", limited tree-shaking; visx "Smallest footprint" by importing primitives; SVG libs "have stronger SSR stories"; canvas libs need `ssr:false`; "No library eliminates the need for … text summaries, proper labeling, color contrast, and data table fallbacks".
- **S59** ✓ Bundlephobia API — recharts@2.15.1 https://bundlephobia.com/api/size?package=recharts@2.15.1 — 498 126 B min, **123 763 B gzip**, 8 deps.
- **S60** ✓ Bundlephobia API — d3-shape@3.2.0 https://bundlephobia.com/api/size?package=d3-shape@3.2.0 — 32 842 B min, **5 657 B gzip**.
- **S61** ✓ Bundlephobia API — d3-scale@4.0.2 https://bundlephobia.com/api/size?package=d3-scale@4.0.2 — 47 305 B min, **16 023 B gzip** (pulls d3-time-format).
- **S62** ✓ HN comments on React chart libs (hn.algolia API) https://hn.algolia.com/api/v1/search?query=recharts%20visx&tags=comment
  16544357: settled on Recharts, "best at handling stacked bar charts, scaling and legends"; 15811564: "Recharts has been absolutely fantastic … the built-in handling for time / date data isn't great"; 24768114: for a dashboard "with some charts and not very specific UI requirements" use a viz lib, for custom/high-volume "D3 is the best path".
- **S63** ✓ CSS-Tricks — How to scale SVG https://css-tricks.com/scale-svg/
  `viewBox` "defines the aspect ratio of the image [and] how all the lengths and coordinates … should be scaled"; default `preserveAspectRatio="xMidYMid meet"` ≈ `background-size: contain`; `none` to stretch; `aspect-ratio` replaces the padding hack.
- **S64** ✓ Dashboard Critic — Three rules of dashboard typography https://dashboardcritic.substack.com/p/fix-your-font-fails-three-rules-of
  "Fonts must have numerals that align (vertically and horizontally)": tabular ("Every numeric character takes up the same amount of horizontal space"), lining, and weight-multiplexed; avoid oldstyle numerals in numbers.
- **S65** ✓ dev.to (alanwest) — Tabular numbers in CSS https://dev.to/alanwest/tabular-numbers-in-css-font-variant-numeric-vs-monospace-hacks-25cn
  Prefer `font-variant-numeric: tabular-nums` over monospace ("you want the numbers in your existing font to behave"); support "above 96%"; "A font without `tnum` glyphs will silently do nothing" — Inter has it.
- **S66** ✓ NN/g — The role of animation and motion in UX https://www.nngroup.com/articles/animation-purpose-ux/
  "Motion in user interfaces can easily become annoying: it's hard to stop attending to it, and, if irrelevant to the task at hand, it can substantially degrade the user experience"; good motion is "unobtrusive, brief, and subtle" and gives feedback or explains a state change.

---

## PART B — Findings by question

### B1. Flow-metric charts: which are worth an ops dashboard, which stay on the review page

The Kanban family gives four charts; practitioners themselves say most of them are review
tools, not monitoring tools.

| Chart | What it is (drawing) | Verdict for SL Auto |
|---|---|---|
| **Aging WIP chart** | One column per workflow stage, each open item a dot at its age (S1, S2); horizontal percentile lines derived from *historical cycle time* (S1, S2), optionally green/yellow/red bands per stage (S2). | The only *leading* chart (theory B7). But the full form needs stage columns + percentile bands, and even the vendor warns its stage-level signals are "very often misinterpret[ed]" (S8). **Simplify** for the dashboard: (a) the « À traiter » list sorted by age with the SLE line implicit in the terracotta/“dépassée” state (elements B4), (b) one **aging-bands meter** (§B3 below), (c) on Suivi d'équipe only, a **dot strip per stage** with a single SLE line at 24 h ouvrées — this is the aging chart minus the traffic-light bands. |
| **Cycle time scatterplot** | x = completion date, y = cycle time per finished item (S3, S4); horizontal 50/85/95 % lines (S3, S4); percentiles because durations "do not follow a normal distribution" (S4); read clusters, gaps, "a progressively growing triangle shape" (S3). | Lagging; it is a planning/review chart (theory A17). **Review page only**, and only when a stage has ≥ ~30 finished items in the window — below that the dot strip (§B3) says the same thing in one axis. Never on a role dashboard. |
| **Cycle time histogram** | x = cycle-time bins, y = count, percentile lines "XX% of items finished in X days or less" (S7). | Same information as the scatter without the time dimension; the dot strip with median/P85 lines replaces it in a business UI (S24). Skip. |
| **Cumulative flow diagram** | Stacked areas of cumulative arrivals per stage; band thickness = WIP, horizontal gap ≈ cycle time, slope ≈ throughput (S5). | Practitioners' own first impression: "a badly constructed rainbow" (S5); cycle time and throughput read from it are approximate/averages and it must not be used to forecast (S5). What people actually read is *bands widening* = arrivals > departures (S5, S11). **Replace** with the two numbers that carry that signal: « Reçus » vs « Terminés » per week (arrival vs departure) as paired bars, and team WIP as a tile. No CFD anywhere. |
| **Throughput run chart** | Finished items per week as columns over time, with context annotations ("onboarding, technology challenges, changes in priorities") (S6). | Yes, on the review page (13-week bars, §B2) and as a sparkline beside the « Terminés (7 j) » tile (elements B1). |

Practitioner simplification, in one line: the daily view is *age against the SLE* (S1:
"If you can only measure and manage one thing, make it Work Item Age"); everything
historical is a weekly/monthly review artefact (S6, theory A17).

### B2. Trend visuals

- **Sparkline vs small line vs bars for 12–13 weeks.** A sparkline is a word-sized line with
  no axes (elements A4) and belongs *beside a number* — in a tile or a table cell (S23:
  sparklines show "how something developed in-between"). A small line chart is the same
  data with an axis, labels and a target — it belongs in its own card. For **counts of
  discrete events per week** (throughput, dossiers reçus, révisions), Datawrapper's rule
  "if you only have a few values of one category at the same time intervals" → columns
  (S13) applies up to ~13 weeks; for **rates and durations** (SLA %, délai médian) use a
  line (S13, elements B5). Rule of thumb: counts → bars; ratios/durations → lines.
- **Comparison-period "ghost" line.** Draw the previous period in grey, the current period in
  the series colour: "grayscale lines for previous years – dark-gray for the most recent year,
  toned down to light-gray for years longer ago" (S19); grey is "a great color to separate
  what's important … from what's not important" (S13). Do not distinguish by thickness alone
  (S19). For bars, the ghost is a hollow/hairline outline bar of the same week last period,
  behind the solid bar — same baseline, so lengths stay comparable (elements A7 logic).
- **Target line.** A 1 px darker line with an end label ("objectif 90 %") (elements A10, B5);
  a trend tile may compare to "a goal you've set" *or* to prior periods (S20) — never both
  as two big numbers (elements B1).
- **Annotations.** Use them for what the line cannot say: a process change, a holiday week,
  the switch to projection (S13; S6 "layer in qualitative context"). One short label at the
  point, never a legend of events.
- **Zero rule.** Bars always from zero; a truncated bar axis is "deceptive and misleading"
  (S14, elements A12). Lines *may* start above zero (S13, S14) but the 2015 study found the
  distortion "greater than it was for the bar charts" (S15), so: **default zero for lines
  too**, and when a lower bound is needed (SLA % living between 80 and 100) leave "the
  bottom third of the plot area … empty" (S16) and print the axis minimum. Internal
  dashboards carry less risk than public charts (S15) — that is a reason to be careful with
  the *default*, not a licence.
- **Dual axis: prohibited.** "arbitrary and can therefore (deliberately) mislead" (S17);
  readers were "very confusing[ed]" and slower (S17). The only defensible uses are different
  units for an expert audience (S18) — not ours. Replace with side-by-side panels or an
  indexed chart (S17, S18). Already a must-not in element-specs §22.
- **Small multiples** for per-person or per-compagnie trends: "same measures, scales, size,
  and shape" (S21, S22), ordered logically (S21), each panel trivially simple (S21); sort
  panels by the metric or by pipeline order, never alphabetically when the reader compares.
  Highlight one panel/series and grey the rest (elements A8). Cap ≈ 12 panels (one per
  gestionnaire/compagnie), then fall back to a sorted bar list.

### B3. Distribution visuals (cycle time, photo turnaround, age)

- **Not box plots.** They need quartile literacy, "always make distributions look 'bell
  shaped'", and their thick boxes read as quantities (S24); quartiles "are chart features,
  not insights" (S25).
- **Dot strip (with jitter) is the default** for n ≤ ~200: "Each dot is [one dossier]" is a
  one-sentence explanation (S24); outliers are "distant dots" (S25); add the median and the
  85th percentile as thin vertical lines (S4 percentiles, elements B6). Colour: dots ink 30 %,
  the reader's own/selected item full ink, lines 1 px ink with end labels ("méd. 9 h",
  "P85 21 h"). Strip 24–32 px tall; one strip per stage sharing the x-axis (this *is* the
  simplified aging chart of §B1 when the dots are open items and the line is the SLE).
- **Histogram only for n in the hundreds** (S24 "distribution heatmaps" / bins) — e.g. a
  yearly review of all dossiers; bins in business hours, percentile lines as in S7.
- **Aging bands: segmented meter, not a stacked column chart.** The AR-industry default is
  a stacked bar per bucket "1-30 days, 31-60 days, 61-90 days, over 90 days" (S26); for one
  team's queue that collapses to a single 100 % segmented bar with ordered bands (elements
  B3; ordering rule S33 "inherent ordering" → « dépassée · < 4 h · aujourd'hui · plus tard »
  from the baseline). Buckets are inherently ordered, so never sort them by size (S33). Use a
  stacked *column chart* (one column per week) only on the review page to show how the
  bands evolved.

### B4. Composition (compagnie, type de sinistre, urgence)

- **Evidence on pies/donuts.** People read pies by arc/area, not angle, and a normal donut
  "is no worse than the pie chart" (S29) — so donut ≈ pie, and both share the pie's limits:
  legible only near 0/25/50/75/100 % (S27, S28), "not the best choice if you want readers to
  compare the size of shares" (S28), "five max" slices (S28) / "fewer than about six or
  seven" (S30), and labelling every slice turns it into "an awkwardly arranged equivalent of
  a table" (S27). The one thing a pie does well is the *fraction-of-total* message ("a third
  of our revenue comes from one customer") (S30).
- **Rules for SL Auto.** The question on an ops dashboard is almost always *which
  compagnie / type sends most, and how much more* — a magnitude comparison → **sorted
  horizontal bar list** with counts at the tip (S27, S30, S33; the existing « Volume par
  étape » pattern). When the message is genuinely "share of the whole" (SLA respect share,
  urgency split), use **one 100 % stacked bar** with ≤ 4–5 segments, most important
  segment on the baseline (elements A6, B3), the rest "shades of one color" (S28) plus
  « Autres » — accepting that only the baseline segment is precisely comparable (S31). Pies
  and donuts stay banned (locked doctrine, elements A3, C5) — the evidence above shows we
  lose nothing except the "looks nice" factor (S38).
- **Mix over time** (compagnie share per month): a line per compagnie, not a row of
  pies — "Nothing shows change through time better than a line" (S27); ≤ 4 lines,
  highlighted vs grey (S13), else small multiples (§B2).

### B5. Comparison to target / ranking / heat tables

- **SLA / objectif → bullet strip**, never a gauge: layers "a tick-line representing your
  target, a solid bar showing your current value, and a shaded background bar" (S32);
  gauges are "cousins of a pie chart … the thing you use when you care about how nice
  something looks" (S38); anatomy fixed in elements B2 (Few's spec). A plain **progress
  bar** is acceptable only for a completion count with no target band (AT day: 5/8 missions
  done) — it is a bullet with no marker and no bands.
- **Ranking bar lists** (per compagnie, per type, per city): sort by value (S33), label the
  bar tip, one hue (elements §22 "no hue by rank"); per-person lists on non-admin screens
  are *not* ranked by name (elements B6) — show the person vs the team median strip instead.
- **Heatmap weekday × hour of intake.** Legible when built as a *table*: 7 columns × the
  working hours only ("choose the hours to display … working hours", S37), one sequential
  hue from white/surface to `chart-1` (S36, S34), **stepped** 4–5 classes so cells are
  distinguishable (S35), cell borders "distinguish cells with similar values" (S37), and
  the number printed in the cell when the cell is ≥ 28 px — if hidden, a tooltip must carry it
  (S35). Whole-cell colour must stay pastel (S23). It answers a staffing question, so it lives
  on the review page (Suivi d'équipe / Admin), not on a role dashboard.

### B6. Geography — is a map worth it for mission spread in Morocco?

- Map only "when geography is the story's central question" (S39): where are AT missions
  relative to agents' bases, is there a city with no coverage. "If you want to point out the
  numeric differences between regions, consider another chart type, a table or text
  instead" (S40).
- Absolute counts per city on a map "will often just answer the question 'Where do most
  people live?'" (S40, S42) — Casablanca–Rabat–Tanger–Marrakech will dominate every month.
  A **sorted city bar list** ("Casablanca 41 · Rabat 17 · …") answers *how many* better
  (S39, S40) and needs no geocoding.
- If a map is added for the coverage question: a **symbol (dot) map** of mission points
  (S41 — symbol maps are for "specific locations (e.g. cities)", and need lat/lon, which the
  AT location pipeline already produces), never a choropleth by region (S40: small colour
  differences are hard to perceive; regional data is not the question). Symbol area, not
  radius, encodes count. Keep it off the dashboard; it is an Admin/planning view.

### B7. Forecasts and projections

- The practitioner form is a Monte Carlo over daily/weekly throughput (10 000 trials; S9,
  S10), and the *deliverable to a manager* is a **percentile table**, not the histogram:
  "With 50% certainty 2024-06-10 / With 80% certainty 2024-07-03 / With 95% certainty
  2024-07-16" (S10; S9 uses 50/75/85/95). The 85th percentile is the commitment level (S4,
  S11).
- It requires a stable process (S11) and only makes sense for a **finite scope** ("100 work
  items", S9; burn-up = scope line vs done line with min/avg/max forecast lines, S12).
  Claims intake is an open-ended flow, so a burn-up is meaningless for the team; it is
  legitimate only for a bounded backlog (e.g. « 37 dossiers en retard — à quelle date sont-ils
  résorbés ? »).
- **Decision:** no forecast visual on any role dashboard. On the review page, at most one
  sentence-shaped projection per bounded backlog, labelled « projection » and drawn from
  throughput percentiles: « Retard résorbé avant le 12 oct. (85 %) · 2 oct. (50 %) ». If a
  chart is ever wanted, it is the throughput bar chart with the projected weeks in diagonal
  stripes (elements A10) — never a cone.

---

## PART C — Decision table: metric type → chart form → drawing rules

Vocabulary: `ink` family = labels/lines; `chart-1` (teal) = the single data hue; ghost =
previous period in ink 30 % / hairline; SLE = 24 h ouvrées. "Dashboard" = role dashboards
(one screen, theory C5); "Review" = Suivi d'équipe / Admin.

| Metric | Where | Form | Drawing rules (cite) |
|---|---|---|---|
| **Backlog aging** (queue by age vs SLE) | Dashboard | Segmented 100 % meter + count over SLE in the tile; « À traiter » list sorted by age | Bands in inherent order from the baseline: dépassée · < 4 h · aujourd'hui · plus tard (S33; elements B3); only the breached band coloured; counts in the legend; list rows show countdown, not age (elements B4). |
| Aging per stage | Review | Dot strip per stage, shared x = age (h ouvrées), one SLE line | Simplified aging chart: dots = open items (S1, S2), one vertical SLE line instead of traffic-light bands (S8 misread risk); clusters = too much WIP in that stage (S2); jitter when n > ~15 (S24). |
| **Throughput** (terminés / semaine) | Dashboard tile | Number + « sem. préc. » caption + sparkline | Sparkline 12–13 pts, width ≥ 3 × height, no axes, last point dotted (elements A4, B1); no target line inside a sparkline. |
| Throughput trend | Review | Column chart, 13 weeks, zero baseline, ghost outline bars for the same weeks last period, current week hatched | Columns because few discrete values per interval (S13); zero baseline mandatory (S14); ghost in hairline outline behind (S19 grey logic; common baseline elements A7); incomplete week striped + annotated (elements A10, A13); annotate process events (S6). |
| Arrivals vs departures (CFD replacement) | Review | Paired columns per week: reçus (ink 30 %) vs terminés (chart-1) | The "bands widening" signal (S5, S11) as two comparable lengths; no stacked areas (S5). |
| **Cycle time** (délai médian, par étape) | Dashboard tile | Median in business hours, caption « P85 21 h · n = 47 » | Percentiles, never means (S4); print n; suppress if n < 10 (elements B1). |
| Cycle-time distribution | Review | Dot strip per stage with median + P85 lines | S24, S25, elements B6; histogram only when n ≥ hundreds (S24, S7); scatterplot (x = date, y = duration, 50/85 lines) only when the question is *drift over time* and n ≥ 30 (S3, S4). |
| **SLA compliance** (% en délai) | Dashboard | Bullet strip: bar = actual, marker = target, 2–3 ink-tint bands | S32; anatomy elements B2 (Few A1): scale from 0, bar ≈ ⅓ height, darkest band = poor, no gauge (S38). |
| SLA trend | Review | Line, 13 weeks, target line, ghost line prior period, last value labelled | Line for a rate (S13); zero baseline by default, else bottom third empty + printed minimum (S15, S16); target = 1 px darker line, end label (elements A10); ghost grey (S19). |
| **Supplement / revision rate** (2ᵉ/3ᵉ accord share) | Dashboard tile | Number + delta vs previous period; raw counts when n < 10 | elements B1; ratio + comparison (theory B6). |
| Revision-rate trend | Review | Line with target; per-compagnie small multiples if asked | S13, S21, S22; ≤ 4 lines per panel. |
| **Per-person load** (WIP, oldest, over SLE) | Admin review | Table with auto-flagged cells (existing) + optional horizontal bar list of WIP sorted by value | S33 sort by value; one hue (elements §22); exception colour only on breached cells (theory C5). Non-admin: person vs team median strip, anonymous dots (elements B6). |
| **Per-compagnie mix** | Review | Sorted horizontal bar list with counts at tip; 100 % bar only for the "share" question | S27, S30, S33; ≤ 5 segments + Autres on a 100 % bar, judged segment on the baseline (elements A6, B3); never a donut (S28, S29). |
| Per-compagnie trend | Review | Small multiples (≤ 12 panels, shared scale) or one line chart ≤ 4 lines highlighted/grey | S21, S22, S13, elements A8. |
| **Type-de-sinistre mix** | Review | Same as compagnie mix | Same. |
| **Urgency mix** | Dashboard | Segmented meter (ordered bands) | Inherent order (S33) → never sorted by size; elements B3. |
| **Geographic spread** | Review/Admin | Sorted city bar list; symbol map only for the coverage question | S39, S40, S41, S42; symbol area ∝ count; never a choropleth by region. |
| **Photo turnaround** (import → validation) | Dashboard tile / Review strip | As cycle time: median tile; dot strip on review | S4, S24. |
| **Weekly/monthly trend** (any count) | Review | Columns ≤ 13 periods; line beyond that or for rates | S13; zero for bars (S14); incomplete period hatched (elements A10, A13); caption prints the real span. |
| **Intake by weekday × hour** | Review | Heat table, working hours only, stepped single-hue, values in cells | S36, S37, S35, S34, S23. |
| **Forecast** | Review only, bounded backlog | One sentence with 50 % / 85 % dates, labelled « projection » | S9, S10, S11; no histogram, no cone; burn-up only for a finite scope (S12). |

---

## PART D — Implementation recommendation for this repo

### D1. Options weighed

| Option | Gzip cost | SSR | A11y out of the box | Theming with CSS vars | Motion control |
|---|---|---|---|---|---|
| **Recharts 2.15 (installed, unused)** | 124 KB (S59), poor tree-shaking (S58) | `ResponsiveContainer` reads `window`, hydration mismatch → `ssr:false` or a fixed `initialDimension` (S44, S45, S43 "keep a height … so ResponsiveContainer can measure") | `accessibilityLayer` = arrow keys + `role="application"` (S46) but "The 'screen reader support' claim is false … no text alternative" (S47) | Yes via `var(--color-KEY)` in the shadcn wrapper (S43) | Entrance animation on by default; must set `isAnimationActive={false}` everywhere (motion-spec §8) and it ignores `prefers-reduced-motion` |
| Recharts 3 (shadcn now targets it, S43) | similar | same container issue | a11y layer on by default (S46) — same S47 gaps | yes | same |
| visx | ~5–20 KB per package (S54, S58) | fine for static SVG (S58) | "Manual" (S57) | you write the SVG, so yes | none built in (S54) — good |
| nivo | 40 KB core + per chart (S57) | has an SSR API (S55) | ARIA + keyboard on SVG charts (S57) | theme object, not CSS vars (S55) | react-spring baked in (S55) — must be disabled |
| Chart.js / react-chartjs-2 | ~65 KB (S57) | canvas → client-only (S58) | canvas "will not be accessible to screen readers" (S52) | no CSS vars (canvas) | animation config |
| uPlot | ~50 KB min (S53) | canvas, client-only | none | canvas | no animation (S53) — but time-series only, no stacks |
| Tremor | Recharts + Tailwind **v4** (S56) | as Recharts | as Recharts | Tailwind | as Recharts |
| **Hand-rolled SVG/HTML** | 0 KB (optionally d3-shape 5.7 KB, d3-scale 16 KB — S60, S61) | pure markup, renders on the server, no measuring | you own it: `<figure>` + `role="img"` + sr-only table (S48, S49, S51) | `hsl(var(--chart-1))`, `currentColor`, Tailwind classes | none unless you add it |

### D2. Recommendation

**Draw the dashboard primitives by hand (inline SVG + HTML), and keep Recharts only for
the one review chart that needs axes-with-interaction (a cycle-time scatterplot), loaded
with `next/dynamic({ ssr: false })` when it is built.** Reasons, in order:

1. **It is what the codebase already does.** Suivi d'équipe's bar list is HTML with a
   `calc()` width; its cycle time and compagnie split are tables. Nothing in the app renders
   a Recharts chart today, so 124 KB gzip (S59) is being carried for zero pixels. The five
   primitives the dashboards need (sparkline, small line/bar with ghost + target, stacked /
   100 % bar, dot strip, bullet) are each < 60 lines of JSX.
2. **SSR/hydration.** Hand-drawn SVG with a `viewBox` scales with CSS (S63) and needs no
   `ResizeObserver`, so it renders on the server and never hits the `ResponsiveContainer`
   `window` problem (S44, S45) nor the "keep a height so it can measure" caveat (S43).
3. **Accessibility we can actually deliver.** Every expert source lands on the same pattern
   because ARIA-in-SVG support is "highly inconsistent" (S51, S49, S50): a `<figure>` with a
   short `aria-label`, `role="img"` on the graphic so the SVG innards are ignored (S48), and
   a **visually-hidden data table** as the real alternative (S49, S58). Recharts' layer does
   not provide that (S47). With our own markup the table is a 10-line component reused by
   every primitive.
4. **Theming and motion follow the design system for free.** Colours are `hsl(var(--chart-1))`
   / `text-ink-3` classes, dark mode comes from the existing token swap, digits are already
   `tabular-nums` (globals.css; S64, S65 — Inter has `tnum`), and there is no entrance
   animation to switch off (motion-spec §8; S66 "irrelevant to the task at hand, it can
   substantially degrade the user experience").
5. **Bundle.** Zero added bytes. If a monotone curve or a nicer tick generator is ever wanted,
   add `d3-shape` (5.7 KB) / `d3-scale` (16 KB) as *direct* dependencies (S60, S61) — do not
   import them through `victory-vendor`, which is a Recharts implementation detail.
6. **When Recharts earns its weight**: the review-page scatterplot (hundreds of dots, hover
   tooltip, percentile `ReferenceLine`s, brushing) is where "a data viz library" beats
   hand-rolling (S62, S57). Keep `components/ui/chart.tsx` for that, behind `next/dynamic`,
   with `isAnimationActive={false}`, `accessibilityLayer`, and the same `<figure>` + sr-only
   table wrapper (S48 shows the wrapper works around any library).

Do **not** add nivo (react-spring + theme object fight the motion spec and token system),
Chart.js/uPlot (canvas: no CSS-variable theming, no server render, a11y from scratch — S52,
S53), or Tremor (Tailwind v4 only, S56; this repo is on 3.4).

### D3. Code sketch — primitives to add under `src/components/viz/`

Shared conventions: every primitive takes `label` (accessible name), draws in a `viewBox`,
uses `vector-effect="non-scaling-stroke"` so 1 px stays 1 px when the SVG scales (S63),
takes colours from tokens, prints nothing animated, and renders `VizTable` for screen
readers. Numbers are formatted by the caller (business hours, %, counts) so the table and the
label agree with the visible figure.

```tsx
// src/components/viz/scale.ts — the only "library" we need
export const linear = (d0: number, d1: number, r0: number, r1: number) =>
  (v: number) => (d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));

export const nice = (max: number) => {           // top of a zero-based axis
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  const m = max / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
};

export const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};
```

```tsx
// src/components/viz/viz-table.tsx — the screen-reader alternative (S49, S51, S58)
export function VizTable({ caption, head, rows }: {
  caption: string; head: string[]; rows: (string | number)[][];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={i}>{r.map((c, j) => j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>)}</tr>
      ))}</tbody>
    </table>
  );
}

// Wrapper every chart uses: figure + role="img" silences the SVG innards (S48)
export function Viz({ label, children, table }: {
  label: string; children: React.ReactNode; table: React.ReactNode;
}) {
  return (
    <figure className="m-0">
      <div role="img" aria-label={label}>{children}</div>
      {table}
    </figure>
  );
}
```

```tsx
// src/components/viz/sparkline.tsx — Tufte: word-sized, no axes, last point dotted (elements A4)
export function Sparkline({ values, label, band }: {
  values: number[]; label: string; band?: [number, number];
}) {
  const w = 96, h = 28, pad = 3;                       // width ≥ 3 × height → slopes ≈ 45°
  const max = Math.max(...values, band?.[1] ?? 0), min = 0;   // zero baseline unless band says otherwise
  const x = linear(0, values.length - 1, pad, w - pad);
  const y = linear(min, max || 1, h - pad, pad);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  return (
    <Viz label={label} table={<VizTable caption={label} head={['Période', 'Valeur']} rows={values.map((v, i) => [`S-${last - i}`, v])} />}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-24" aria-hidden>
        {band && <rect x={pad} y={y(band[1])} width={w - 2 * pad} height={y(band[0]) - y(band[1])} className="fill-ink/[.06]" />}
        <path d={d} fill="none" className="stroke-ink-2" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <circle cx={x(last)} cy={y(values[last])} r={2.5} className="fill-chart-1" />
      </svg>
    </Viz>
  );
}
```

```tsx
// src/components/viz/trend-chart.tsx — small columns (counts) or line (rates), 13 periods,
// ghost previous period, target line, hatched incomplete last period, last value labelled.
type Pt = { label: string; value: number; ghost?: number | null };
export function TrendChart({ points, kind, target, label, unit = '', incompleteLast = true }: {
  points: Pt[]; kind: 'bar' | 'line'; target?: number; label: string; unit?: string; incompleteLast?: boolean;
}) {
  const w = 320, h = 120, ml = 28, mr = 36, mt = 8, mb = 18;
  const top = nice(Math.max(...points.map((p) => Math.max(p.value, p.ghost ?? 0)), target ?? 0));
  const x = linear(0, points.length - 1, ml, w - mr);
  const y = linear(0, top, h - mb, mt);                      // bars AND lines from zero (S14, S15)
  const slot = (w - ml - mr) / Math.max(points.length - 1, 1);
  const bw = Math.min(16, slot * 0.6);                       // bars ≤ 24 px (element-specs §22)
  const last = points.length - 1;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const ghostPath = points.every((p) => p.ghost != null)
    ? points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.ghost as number)}`).join(' ') : null;
  return (
    <Viz label={label} table={<VizTable caption={label} head={['Période', 'Valeur', 'Période précédente']} rows={points.map((p) => [p.label, `${p.value}${unit}`, p.ghost == null ? '—' : `${p.ghost}${unit}`])} />}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ aspectRatio: `${w}/${h}` }} aria-hidden>
        <defs>
          <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2" height="4" className="fill-chart-1/50" />
          </pattern>
        </defs>
        {/* gridlines: hairline, zero line slightly stronger */}
        {[0.5, 1].map((f) => <line key={f} x1={ml} x2={w - mr} y1={y(top * f)} y2={y(top * f)} className="stroke-hairline" vectorEffect="non-scaling-stroke" />)}
        <line x1={ml} x2={w - mr} y1={y(0)} y2={y(0)} className="stroke-hairline-strong" vectorEffect="non-scaling-stroke" />
        <text x={ml - 4} y={y(top) + 4} textAnchor="end" className="fill-ink-3 text-[10px]">{top}{unit}</text>
        <text x={ml - 4} y={y(0) + 4} textAnchor="end" className="fill-ink-3 text-[10px]">0</text>

        {kind === 'bar' && points.map((p, i) => (
          <g key={p.label}>
            {p.ghost != null && (                            /* ghost = outline bar, same baseline (S19; elements A7) */
              <rect x={x(i) - bw / 2} y={y(p.ghost)} width={bw} height={y(0) - y(p.ghost)} fill="none" className="stroke-ink/30" vectorEffect="non-scaling-stroke" />
            )}
            <rect x={x(i) - bw / 2} y={y(p.value)} width={bw} height={y(0) - y(p.value)}
              fill={incompleteLast && i === last ? 'url(#hatch)' : undefined}
              className={incompleteLast && i === last ? undefined : 'fill-chart-1'} />
          </g>
        ))}
        {kind === 'line' && (
          <>
            {ghostPath && <path d={ghostPath} fill="none" className="stroke-ink/30" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
            <path d={incompleteLast ? points.slice(0, last).map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ') : path}
              fill="none" className="stroke-chart-1" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            {incompleteLast && last > 0 && (                 /* dashed segment into the incomplete period (elements B5) */
              <line x1={x(last - 1)} y1={y(points[last - 1].value)} x2={x(last)} y2={y(points[last].value)} className="stroke-chart-1" strokeWidth={2} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            )}
            <circle cx={x(last)} cy={y(points[last].value)} r={3} className="fill-chart-1" />
          </>
        )}
        {target != null && (                                 /* target: 1 px darker line + end label (elements A10) */
          <>
            <line x1={ml} x2={w - mr} y1={y(target)} y2={y(target)} className="stroke-ink-2" vectorEffect="non-scaling-stroke" strokeDasharray="2 2" />
            <text x={w - mr + 4} y={y(target) + 3} className="fill-ink-2 text-[10px]">obj. {target}{unit}</text>
          </>
        )}
        {/* last value labelled directly, no legend (S13; elements B5) */}
        <text x={x(last) + 6} y={y(points[last].value) - 6} className="fill-ink text-[11px] font-semibold tabular-nums">{points[last].value}{unit}</text>
        <text x={ml} y={h - 4} className="fill-ink-3 text-[10px]">{points[0].label}</text>
        <text x={w - mr} y={h - 4} textAnchor="end" className="fill-ink-3 text-[10px]">{points[last].label}{incompleteLast ? ' (en cours)' : ''}</text>
      </svg>
    </Viz>
  );
}
```

```tsx
// src/components/viz/stacked-bar.tsx — one segmented bar (100 % or absolute). HTML, not SVG.
// Order is a rule: the judged segment first (baseline); inherent-order buckets never re-sorted (S33; elements A6, B3).
type Seg = { key: string; label: string; value: number; tone?: 'judged' | 'muted' | 'faint' };
export function StackedBar({ segments, label, percent = true }: { segments: Seg[]; label: string; percent?: boolean }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const tone = { judged: 'bg-status-warning-fg', muted: 'bg-ink/20', faint: 'bg-ink/[.08]' };
  return (
    <Viz label={label} table={<VizTable caption={label} head={['Segment', 'Nombre', 'Part']} rows={segments.map((s) => [s.label, s.value, `${Math.round((s.value / total) * 100)} %`])} />}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-sm bg-surface-3" aria-hidden>
        {segments.map((s) => s.value > 0 && (
          <div key={s.key} className={tone[s.value > 0 && s.tone ? s.tone : 'muted']} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <p className="t-caption mt-1.5 tabular-nums" aria-hidden>
        {segments.map((s) => `${s.value} ${s.label}`).join(' · ')}{percent ? ` · ${total} au total` : ''}
      </p>
    </Viz>
  );
}
```

```tsx
// src/components/viz/dot-strip.tsx — distribution as dots + median/P85 lines (S24, S25; elements B6).
export function DotStrip({ values, label, sle, highlight, unit = 'h' }: {
  values: number[]; label: string; sle?: number; highlight?: number; unit?: string;
}) {
  const w = 320, h = 32, ml = 8, mr = 40;
  const sorted = [...values].sort((a, b) => a - b);
  const max = nice(Math.max(...values, sle ?? 0));
  const x = linear(0, max, ml, w - mr);
  const med = quantile(sorted, 0.5), p85 = quantile(sorted, 0.85);
  // deterministic jitter (S24): spread colliding dots vertically, no randomness → stable SSR markup
  const jitter = (i: number) => (i % 5) * 3 - 6;
  return (
    <Viz label={`${label} — médiane ${med?.toFixed(0)} ${unit}, P85 ${p85?.toFixed(0)} ${unit}, n = ${values.length}`}
      table={<VizTable caption={label} head={['Statistique', 'Valeur']} rows={[['Médiane', `${med?.toFixed(0)} ${unit}`], ['85e percentile', `${p85?.toFixed(0)} ${unit}`], ['Maximum', `${sorted[sorted.length - 1]} ${unit}`], ['Effectif', values.length]]} />}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ aspectRatio: `${w}/${h}` }} aria-hidden>
        <line x1={ml} x2={w - mr} y1={h / 2} y2={h / 2} className="stroke-hairline" vectorEffect="non-scaling-stroke" />
        {values.map((v, i) => (
          <circle key={i} cx={x(v)} cy={h / 2 + jitter(i)} r={3}
            className={v === highlight ? 'fill-ink' : 'fill-ink/30'} />
        ))}
        {med != null && <line x1={x(med)} x2={x(med)} y1={4} y2={h - 4} className="stroke-ink" vectorEffect="non-scaling-stroke" />}
        {p85 != null && <line x1={x(p85)} x2={x(p85)} y1={4} y2={h - 4} className="stroke-ink-3" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />}
        {sle != null && <line x1={x(sle)} x2={x(sle)} y1={0} y2={h} className="stroke-tertiary-deep" vectorEffect="non-scaling-stroke" />}
        <text x={w - mr + 4} y={h / 2 + 3} className="fill-ink-3 text-[10px] tabular-nums">méd. {med?.toFixed(0)} {unit}</text>
      </svg>
    </Viz>
  );
}
```

```tsx
// src/components/viz/bullet.tsx — Few's bullet graph (elements B2; S32). Scale from zero; one hue, three tints.
export function Bullet({ value, target, bands, max = 100, label, unit = '%', lowerIsBetter = false }: {
  value: number; target?: number; bands: [number, number]; max?: number; label: string; unit?: string; lowerIsBetter?: boolean;
}) {
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const tints = lowerIsBetter ? ['bg-ink/[.03]', 'bg-ink/[.07]', 'bg-ink/[.12]'] : ['bg-ink/[.12]', 'bg-ink/[.07]', 'bg-ink/[.03]'];
  const [b1, b2] = bands;                                   // poor < b1 ≤ ok < b2 ≤ good
  return (
    <Viz label={`${label} : ${value}${unit}${target != null ? `, objectif ${target}${unit}` : ''}`}
      table={<VizTable caption={label} head={['Mesure', 'Valeur']} rows={[['Réalisé', `${value}${unit}`], ['Objectif', target == null ? 'sans objectif' : `${target}${unit}`]]} />}>
      <div className="relative h-4 w-full" aria-hidden>
        <div className={`absolute inset-y-0 left-0 ${tints[0]}`} style={{ width: pct(b1) }} />
        <div className={`absolute inset-y-0 ${tints[1]}`} style={{ left: pct(b1), width: `calc(${pct(b2)} - ${pct(b1)})` }} />
        <div className={`absolute inset-y-0 ${tints[2]}`} style={{ left: pct(b2), right: 0 }} />
        {target != null && <div className="absolute inset-y-0 w-px bg-ink" style={{ left: pct(target) }} />}
        <div className="absolute left-0 top-[5px] h-[6px] bg-ink-solid" style={{ width: pct(value) }} />
      </div>
    </Viz>
  );
}
```

Tailwind notes: `fill-chart-1`, `stroke-hairline`, `fill-ink/30`, `stroke-tertiary-deep`
work as written — `tailwind.config.ts` declares `chart.1…5`, `ink`, `hairline`, `tertiary`
as colours with `<alpha-value>` (verified 2026-09-06), and Tailwind 3.4 derives `fill-*` /
`stroke-*` utilities from `theme.colors`. Text inside SVG inherits the
page font, so `tabular-nums` and Inter apply (S64, S65). Sizing: `viewBox` + `width:100%`
+ `aspect-ratio` (S63) — no measuring, no `ResizeObserver`, renders on the server.

### D4. Wiring into the existing code

- `computeWeeklyTrend()` in `monitoring/metrics.ts` already returns `WeekPoint[]`
  (`crees`, `deposes` per week) — feed `TrendChart kind="bar"` with `value = deposes`,
  `ghost = previous 13 weeks` for the throughput card, and a second paired-bar variant for
  reçus vs terminés (the CFD replacement).
- `CycleTimeCard` keeps its table (medians) and gains one `DotStrip` per row on Suivi
  d'équipe only, fed by the per-item durations `computeCycleTimes` already computes.
- `KpiCard` / headline tiles take `Sparkline` beside « Terminés (7 j) » only (theory C5).
- « Répartition par compagnie » stays a table; add a sorted `StackedBar`-free bar list only
  if the owner wants a picture — the existing « Volume par étape » markup is the template.
- Keep `components/ui/chart.tsx` untouched for the future scatterplot; when it is used,
  wrap it in `Viz` and load via `next/dynamic(() => import(...), { ssr: false })`.

---

## PART E — Anti-patterns (with the source that condemns each)

1. Gauges, donuts, pies, radial progress — angles/areas are not comparable (S27, S29 for
   donut = pie); gauges are decoration (S38, elements A3).
2. Bar or column axis not starting at zero (S14: "deceptive and misleading").
3. Line chart with a truncated axis and no empty bottom third / printed minimum (S15, S16).
4. Dual y-axes (S17, S18; element-specs §22).
5. A CFD on an ops screen (S5: "badly constructed rainbow"; averages, not counts).
6. Stage-level percentile bands (traffic lights) on the aging chart — misread even by
   practitioners (S8); one SLE line instead.
7. Box plots for a business audience (S24, S25).
8. Averages for durations — percentiles only (S4).
9. Labelling every pie slice / every point (S27; element-specs §22).
10. Ranking people by name with medals or sorted named bars on shared screens (elements B6).
11. Aging buckets or urgency bands sorted by size instead of inherent order (S33).
12. Choropleth of mission counts by region / a dot map that is a population map (S40, S42).
13. Monte Carlo histograms or forecast cones on a dashboard; forecasts for open-ended flow
    (S5 "Plans based on averages fail", S11 stability prerequisite, S12 finite scope).
14. Entrance animation, count-ups, bar-growing on first paint (motion-spec §8; S66).
15. Charts with no text alternative — arrow-key layers alone are not screen-reader support
    (S47, S49, S51).
16. `ResponsiveContainer` inside a server component or without a fixed height (S43, S44).
17. Heatmap with a continuous gradient and hidden values and no tooltip (S35), or 24-hour
    rows when the team works 9–18 (S37).
18. Distinguishing the current period from the ghost by thickness alone (S19) or by a
    second hue (S13: grey is the tool).
19. Sparklines with axes, gridlines or a target line (elements A4, B1).
20. Comparing the current partial week to a full previous week without hatching/annotation
    (elements A10, A13; S20 on keeping prior periods complete).

---

## PART F — Could not fetch (and what replaced each)

| Source | URL | Result | Replacement |
|---|---|---|---|
| Nave blog — aging WIP / scatterplot / CFD / throughput run chart | https://getnave.com/blog/aging-work-in-progress-chart/ , …/cycle-time-scatterplot/ , …/cumulative-flow-diagram-explained/ , …/throughput-run-chart/ | 404 ×4 | Nave product pages S2, S3; ProKanban S5, S6 |
| 55 Degrees — pace percentiles | https://www.55degrees.se/blog/post/pace-percentiles-signals | Fetched but teaser only | Used only for its misread warning (S8) |
| Scrum.org — Getting to 85 (part 1); Monte Carlo forecasting in Scrum | https://www.scrum.org/resources/blog/getting-85-agile-metrics-actionableagile-part-1 ; https://www.scrum.org/resources/blog/monte-carlo-forecasting-scrum | Empty body ×2 | S9, S10, S11 |
| Datawrapper — heatmaps blog; maps-or-charts | https://www.datawrapper.de/blog/heatmaps ; https://www.datawrapper.de/blog/maps-or-charts/ | 404 ×2 | S23, S35 (heat); S39, S40 (maps) |
| Storytelling with Data — Be gone, dual y-axis | https://www.storytellingwithdata.com/blog/2016/2/10/be-gone-dual-y-axis | 404 | S17, S18 |
| Data Revelations — Better than a jitter plot | https://www.datarevelations.com/betterthanjitterplot/ | 403 | S24, S25; elements A38 |
| FlowingData — Small multiples chart type | https://flowingdata.com/charttype/small-multiples/ | 403 | S21, S22 |
| Observable — Five ways to effectively use animation | https://observablehq.com/blog/effective-animation | 429 ×3 | S66 + motion-spec §8 |
| loke.dev — tabular-nums | https://loke.dev/blog/css-font-variant-numeric-tabular-nums | 410 | S64, S65 |
| visx docs site | https://visx.airbnb.tech/ | Empty body | GitHub README S54 |
| Few — Save the Pies (first attempt) | same as S27 | Binary; recovered with `pdftotext` (mingw) → S27 | — |
| Reddit (r/PowerBI, r/dataisugly JSON search) | https://www.reddit.com/r/PowerBI/search.json?… | Blocked at the fetch layer | HN via Algolia API (S38, S62); Fabric-community links seen in search only |
| Datawrapper — "what to consider when creating bar charts" | — | No such article found (search) | EU guide S33 |
