# Mes rappels — queue research (2026-09-03)

Four parallel research rounds on the `/mes-rappels` page (per the §2 sourcing
policy: theory and practitioner sources first, design systems only as
corroboration). This file is the synthesis; each round's honest
could-not-fetch list is preserved at the end. Rules adopted into
`docs/element-specs.md` — Addendum 2026-09-03 (bis).

Rounds: (1) attention & colour theory, (2) typography/spacing/density,
(3) interaction patterns for task inboxes, (4) libraries & GitHub ecosystem.

---

## 1. What this page is (and why the table was failing it)

A rappel is a **message to be processed once**, not a record to be compared
against its neighbours. Every strong precedent for that job — email clients,
Linear Triage, GitHub notifications, Superhuman — is a *list + detail +
one-gesture verbs* model, never a wide table whose rows navigate away.

Fetched evidence:

- uxpatterns.dev (Table vs List vs Cards): "List view wins when users scan
  one item after another and only need a small number of important
  attributes… inboxes, activity feeds."
- Smart Interface Design Patterns (Cards vs Lists vs Tables vs Data Grids):
  tables are for side-by-side **comparison**; batch/multi-sort machinery
  "can be quite overwhelming for a simple list."
- NN/g "No More Pogo Sticking": hub-and-spoke bouncing between a list and
  detail pages is an interaction-cost failure; the fix is more scent in the
  row **and richer previews**, not a faster round trip.
- NN/g "The Anatomy of a List Entry": detail in a row must be "just right:
  too much will overload users…, too little will make them pogo stick."
- Pencil & Paper (enterprise tables): the "most scalable" row-detail pattern
  is the quick-view **sidebar**; a modal "is a little bit more disruptive, as
  users are taken away from the context." NN/g (Data Tables: Four Major User
  Tasks) independently rates the nonmodal side panel best for
  view-one-record work.
- Windows dev-blog master-detail guidance: split view is for "switch between
  items frequently but want to stay in the same context (e.g. email)."

The old page had the opposite anatomy: 8 columns, two of them multi-line
live-query columns (`SessionObservations`/`SessionModifications`, one
Firestore `onSnapshot` **each, per row**), row heights blowing up unevenly,
and row-click = navigate away (pogo-sticking by construction).

### Verdict (implemented)

**Table-anchored master-detail.** The Reçus queue keeps the app's table
idiom (consistency with `/dossiers`, `/assignations-chiffrage`, the shared
`Table` primitive, and the tour contract that expects `rap-recus-table` /
`rap-statut` / a clickable ref cell), but:

- the table slims to 6 columns with a fixed one-line row grid;
- **row click = select** (opens the detail panel; marks Nouveau → Lu — the
  honest place for "read", per round 3: read should fire on *viewing*, not
  on dossier navigation);
- the **ref cell keeps the session handshake** click-through to the dossier
  (existing behaviour, tour contract `rap-row-ref`);
- the detail panel (xl+: sticky side panel; below xl: sheet) absorbs the
  full observation, the dossier identity, the session timeline (the two
  removed columns), and the actions — « Ouvrir le dossier » becomes an
  explicit, labelled act (Smashing modal-vs-page decision tree: reading a
  rappel is a context-preserving sub-task; working the dossier is the flow
  that deserves a page).

This is the same two-tier peek/open structure the dossiers research round
identified (element-specs Addendum 2026-09-03 §D.1) — implemented here first
because the owner explicitly requested questioning this page's row-click
structure.

Rejected: cards (browsing pattern, wastes vertical space at 20+ items);
full email-client 3-pane rebuild (the shadcn mail shell was mined for its
anatomy, not adopted — nav pane and resizable splitters are volume features
this queue doesn't have).

---

## 2. Salience & colour (round 1)

Loudest → quietest ranking adopted for the queue:

1. **Unread (Nouveau) row state** — the page's contract is "what's new for
   me?".
2. **Today marks** (terracotta « Aujourd'hui » chip — scarce by ruling).
3. **Dossier ref** (row identity, first column, F-pattern scan rail — NN/g:
   users run "a vertical scan along the left side").
4. **Status chips** — confirmation, not primary encoding; consistent column
   = a second scan rail.
5. Observation + sender (mid-ladder ink).
6. Actions (quiet: identical on every row ⇒ uniform loudness = no signal).
7. Dates and meta (lightest).

Unread encoding — **teal left bar + full-ink/weight ladder + the Nouveau
chip; no background tint, no dot**:

- CareerBuilder tables case study (UX Collective, fetched): tested exactly
  this. The dot "blended into the table completely"; the vertical bar was
  "simple and effective and demonstrated clearly that that row is unread".
- Bar = region stimulus on the left scan rail, visible peripherally;
  luminance+shape survives colour-blindness (UXmatters: "rely on words and
  shapes", 8–12 % of men CVD). It is teal (attention accent), never
  terracotta (time only) — and it matches the sidebar's active-row bar
  idiom.
- Background tint rejected: the background channel is already spent on
  hover/selected (Pencil & Paper: five semantic levels "break visual
  continuity"), and a tinted row reads as *selected* (flagged as
  convention/training knowledge).
- Refactoring UI (community notes): "change the secondary stuff to make the
  primary stand out" — read rows drop the ink ladder rather than unread
  rows gaining pigment. Never de-emphasise with <400 weight; lighten
  colour instead.
- Colin Ware via fetched secondaries — preattentive attributes "become less
  distinct as variety increases" (the hawk among pigeons): one loud channel
  per row, so only the **Nouveau** chip is the info pair; Lu is neutral,
  Traité success (both quiet). UX Movement (intro fetched): "when the
  badges are too colorful, they all compete for attention."
- Alert-fatigue literature (search summaries; JMIR/PMC: 49–96 % of clinical
  alerts overridden): habituation kills over-used signals — terracotta's
  scarcity is a budget, and **no motion in the queue** (motion is the
  strongest preattentive channel; an all-day page must never pulse).
- NN/g visual hierarchy: ≤3 contrast levels, ≤3 sizes per view.

## 3. Typography, density, timestamps (round 2)

- **Uniform row height is the single biggest fix** — uneven rows destroy
  the lawn-mower scan rhythm (NN/g) and break proximity grouping (NN/g
  Gestalt: whitespace is the grouping signal). Hence the one-line clamp on
  every cell; the primitive's 44 px grid holds again.
- The two multi-line session columns: "if you caught yourself thinking of
  using multi-line wrapping in a grid… first analyze whether there is a
  more practical way" (Smashing 2023). Shneiderman's mantra maps directly:
  queue = overview; session activity = details-on-demand → moved to the
  panel. This also removes 2 × N per-row `onSnapshot` listeners (real perf
  cost) in favour of one pair for the selected rappel.
- Truncation with intent (McGrane "truncation is not a content strategy"):
  the observation clamps to one line **with the full text one click away in
  the panel** and a `title` tooltip; identifier/status/date never truncate.
- Two weights only (500/600 emphasis vs 400), emphasis budget 2 cells
  (ref + chip) per addendum ter A; read rows drop ink, not weight-below-400.
- **Timestamps**: round 2's generic recommendation (hybrid relative) is
  overridden by the standing owner ruling (addendum 2026-09-03 §C, colour
  & type Q6.6-7): **absolute `dd/MM/yyyy HH:mm` in cells, relative age in
  the tooltip**. Round 2's mandatory mitigation (full detail on hover —
  Close CRM puts a tooltip on every timestamp) is kept, inverted.
- Alignment: text left, headers with their columns; datetime is a
  "qualitative number" (Ström, UI Prep, Smashing all carve dates out of the
  right-align rule) — left-aligned.
- No zebra (Ström: "zebra striping is bad. Really, really bad" — hairlines
  + hover do the tracking at 6 columns).

## 4. Queue tools (round 3) — what earned its place

Adopted:

- **« À traiter (n) / Traités » segmented control** (value picker → segmented
  + SlidingThumb, per the tabs-vs-segments ruling; task-state filters, not
  a wall of chips — the GitHub notifications model). Default = À traiter.
- **Traité leaves the queue immediately** and lives in the Traités segment —
  unanimous across Linear ("after actioning an issue, it leaves the triage
  inbox"), GitHub ("Done… removes the notification from your inbox", kept
  in a Done view), Things 3 (Logbook), Octobox (exists solely to add that
  state). Never struck-through in place.
- **Marquer traité without opening the dossier** + **undo in the toast**
  (GTD two-minute rule; CRUD ruling "never use a warning when you mean
  undo").
- **FIFO: oldest first within À traiter** (work queues are fairness/SLA
  queues, unlike email reading feeds — workmate.com, support-queue
  literature; addendum ter A "action-needed order" sanctions the change
  from `createdAt DESC`). Traités: newest first. No sort UI — the fixed
  order is the sort.
- **Keyboard spine**, same group model as the dossiers list: ↑/↓ and j/k
  move the selection, Entrée opens the dossier, t marque traité, Échap
  ferme — registered via `useHotkeys` (visible in the « ? » sheet), the
  action keys enabled only while a rappel is selected so native
  button/dialog keys are never hijacked. NN/g accelerators: target the
  frequent path, keep it "readily available, yet easy to ignore"; hints
  live in the panel's empty state.
- Quietly celebratory inbox-zero empty state (one line — levity is right
  when emptiness is an achievement; no theatrics).

Rejected as over-engineering at 5–50 items (each argued in round 3):
free-text search (Ctrl+F beats a control at this size), column sorting,
snooze/defer (undermines the sender's Envoyés accountability loop),
auto-advance (Gmail defaults it off; selection moving to the next row after
removal gives 90 % of it), pagination, group-by-sender, priority flags,
extra count badges (PLOS One n=1009: badges hijack clicks; Braze: everpresent
badges become "wallpaper").

Deferred to owner: date-section headers (Aujourd'hui / Cette semaine / Plus
ancien) — sound theory but competes with FIFO ordering at this volume; an
aging/danger signal for stale rappels (lateness = danger pair, never
terracotta — addendum ter C).

## 5. Ecosystem (round 4)

- **shadcn mail example** (`shadcn-ui/ui` @ tag `shadcn-ui@0.9.4`, MIT,
  fetched): mined for the list+detail anatomy and the disabled-until-selected
  detail toolbar; its 8 px dot unread encoding is *weaker* than our bar+bold
  (their own lack of unread weight is a known gap) — not adopted.
- **Mail-0/Zero** (MIT, fetched): unread = bold + edge bar, selected =
  tinted + `bg-primary` left edge — corroborates the row encoding; its
  scoped-hotkeys architecture matches our existing registry model.
- **TanStack Table: not adopted** — 14.1 kB gz engine whose payoffs
  (virtualized scale, column management, server pagination) don't exist at
  ≤50 live Firestore rows; hand-rolled `useMemo` filter/sort is simpler and
  avoids the live-data row-model sync footgun. Revisit only if the queue
  grows hundreds of rows (same verdict as dossiers §D.4 scope note).
- **react bits / 21st.dev: skip for this app** — marketing-animation
  catalogs (react bits is MIT + Commons Clause; 21st.dev has per-author
  licences), nothing for work-queue UI that isn't cleaner in MIT sources;
  their flashy motion would violate the motion spec outright.
- **Kept as reference rulebooks**: `raunofreiberg/interfaces` and
  `vercel-labs/web-interface-guidelines` (fetched) — directly applied here:
  URL as state (`?vue=`, `?rappel=`), optimistic updates + undo,
  `tabular-nums` in tables, ≤200 ms interactions, no dead zones between
  list items, locale-aware shortcuts (arrows work on AZERTY where j/k are
  QWERTY-biased — we ship both, matching the dossiers group).
- bazza/ui DataTableFilter (MIT, French locale) noted for the day this or
  the dossiers page needs Linear-grade filtering — not needed at this size.

## 6. Honest could-not-fetch (aggregated)

- Reddit blocked Anthropic's crawler in every round (explicit 400) — zero
  Reddit-sourced claims despite the sourcing mandate.
- Stephen Few and Colin Ware cited via fetched secondaries, not the books;
  Refactoring UI via community notes/gists, not the book.
- UX Movement status-badge article: intro only (paywall).
- Gmail bold-unread rationale: convention, no primary source found.
- Superhuman/Linear auto-advance-to-next behaviour: training knowledge;
  their docs confirm items leaving the queue, not the selection jump.
- Atlassian alert-fatigue page returned a nav shell; JMIR/PMC figures from
  search summaries.
- "Tinted row reads as selected": convention, not a fetched source.
- Shneiderman 1996 PDF located, not parsed; mantra corroborated by
  multiple secondaries.
- react-hotkeys-hook ~3 kB size figure unverified (bundlephobia 429) —
  moot, we use the in-house registry.
