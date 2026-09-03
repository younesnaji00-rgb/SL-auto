# /consultation — is a table the right structure, and what is the ideal anatomy?

Research round 2026-09-03, per the §2 sourcing policy (practitioner blogs/essays first;
design systems only as secondary corroboration — they are already mined in
`docs/element-specs.md`). Every quote below comes from a page actually fetched this
session unless flagged **[training knowledge, unverified]**. Unfetchable sources are
listed honestly at the end.

---

## 0. What this page actually is (task analysis, from the code)

`src/app/(app)/consultation/client-page.tsx` (nested dev repo):

- **Read-only, cross-company reference lookup.** `useDossiers()` with *no* company
  restriction ("Fetch ALL dossiers — no company restriction"); nav subtitle:
  « Consulter tous les dossiers de sinistres (lecture seule) ».
- **Audience** (`src/lib/nav-groups.ts:58`): Admin, Responsable d'équipe, Gestionnaire,
  **and the three Directeur roles** — for whom this is essentially their *only* dossier
  surface (`role-descriptions.ts`: "Consultation des dossiers (lecture seule) et jours
  fériés"). Gestionnaires also have /dossiers; Directeurs do not.
- **Anatomy today:** search (réf/assuré/matricule, live from 1st char) + 3 selects
  (nature/statut/compagnie) + date range + applied chips; 8-column table
  (Réf. expert sticky `t-mono` bold · Assuré `font-medium` · Compagnie · Nature ·
  Type · Statut chip · Matricule `t-mono` · Date de requête); 44 px rows, hairlines,
  no zebra; 50-row cap + « Afficher plus (N restants) » + visible total.
- **The defect:** rows have **no interaction at all**. No `<a>`, no onClick, no
  chevron, no ⋯ menu. Hover tint exists (from the TableRow primitive) but leads
  nowhere. A lookup task on this page **cannot end** — you find the row, and the
  page has nothing more to give you than its 8 cells.
- **No sort** either: no default order is applied to `useDossiers()` results on this
  page and no column-header sort affordance exists — display order is whatever the
  hook emits.
- There is **no route-level role guard** on `/dossiers/[id]` (only `AuthGuard` in
  `(app)/layout.tsx`), so navigation there from consultation is technically open to
  every consultation role; Firestore rules + the Directeur read-only flags in
  `use-current-user.tsx` govern what they can do once there.

**Task classification.** This is a *known-item lookup / reference archive* page, not
a work queue: nothing here "needs action", nothing gets removed when handled, and
the entry point is usually an identifier the user already holds (a phone call quoting
a réf, an insured's name, a plate). The distinction matters for default sort, columns
and density — see §4.

---

## 1. Table vs cards vs list vs split view

### 1.1 When a table wins (fetched sources)

**UX Patterns for Developers — "Table vs List View vs Card Grid"**
https://uxpatterns.dev/pattern-guide/table-vs-list-vs-cards

> Table — best when "cross-item comparison is critical" and "sorting and filtering
> matter"; "excels when users need to inspect multiple fields across many rows in
> operational interfaces"; "strongest for side-by-side comparison with high
> information density", "weakest on mobile readability."

> List view — best when "users scan a single vertical stream" and "only a few
> attributes matter per item"; "primary job is linear scanning, not comparison."

> Card grid — best when "visual content is a primary part of the decision" and
> "browsing matters more than direct comparison"; "weak at cross-item comparison."

> Default recommendation: "Start with list view for small datasets where scanning
> matters, move to table when column comparison becomes essential, and choose card
> grid when visual elements drive decision-making."

**Eleken — "Table Design UX"** https://www.eleken.co/blog-posts/table-design-ux

> "Tables are at their best when the data is dense, structured, and meant to be
> used, not just seen." Cards "shine when you showcase rich, individual content,
> like a list of products, team members, or blog posts." Tables excel when "users
> are hunting for a specific record, making bulk edits, or trying to spot the
> lowest value in a column."

**Pencil & Paper — "Enterprise data tables"**
https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables

> "Tables are the most efficient way to organize complex information in a digestible
> manner" — for users who need to "scan and compare information in order to derive
> insights" or perform "action-driven" tasks.

### 1.2 Application to /consultation

Dossier rows are **homogeneous records with zero visual content** and **several
independently useful attributes** (three of which — réf, assuré, matricule — are
alternative lookup keys, plus compagnie/statut/date as verification fields). That is
the textbook table case and the textbook *anti*-card case ("visual content is a
primary part of the decision" — false here). A §4 list row (headline + supporting
line + trailing chip) would bury matricule and compagnie inside prose, destroying the
columnar scan that lets a user verify "is this the right SINISTRE?" by eye — the
uxpatterns.dev list criterion ("only a few attributes matter per item") fails: at
least 5–6 attributes matter per item on a lookup/verification page.

A **permanent split view (master list + always-open detail pane)** is the strongest
alternative and is worth rejecting explicitly rather than ignoring:

- It optimizes *serial inspection* of many records (email, triage queues). The
  consultation task is *point lookup*: filter to one or a handful, inspect one,
  leave. The pane would sit empty most of the time and would halve the table's
  width — with 8 columns at 8+ widths, the frozen-column horizontal scroll would
  kick in almost immediately, which is strictly worse for the verification scan.
- Practitioner corroboration for the lighter variant instead (drawer/preview on
  demand, not permanent pane): see §2.

**Verdict: the table stands.** The structure is not the problem; the dead end is.

---

## 2. How rows should open the record (the defect, and which pattern)

### 2.1 The options, per fetched practitioner sources

**Pencil & Paper (same URL as above)** on the three "see more of this record" patterns:

> Expandable rows: "having clickable rows expand inline is an intuitive way to show
> more details."
> Side panel: "The most scalable option for this situation is the sidebar. If you
> need a lot of space and potentially even a scroll or subtabs… this might be your
> best bet."
> Modal: "Having a modal/overlay show up is a little bit more disruptive, as users
> are taken away from the context of the table. However, this is an easier option in
> terms of development."

**mannhowie — "Data Table UX: 5 Rules of Thumb"** https://mannhowie.com/data-table-ux

> Rule 4: "Show more fields and controls of a single record by using a quick view
> (side-panel or modal)." (He warns off accordion/expandable rows as confusing.)

**SaaS workflow patterns gist (M. Paiva)**
https://gist.github.com/mpaiva-cc/d4ef3a652872cb5a91aa529db98d62dd

> List → details drawer: "Non-destructive, keeps user in context." "Best for
> workflows requiring frequent item inspection without full-page transitions.
> Examples include Airtable and Linear."

**Work-queue contrast — Tomas Christensen, "Creating a Design Pattern: Work Queue"**
https://surfeit.com/portfolio_page/design-patterns-2/ — in a true queue, "task
details slide in from the right, while the task list panel gets tucked away on the
left, but is still accessible", the counter decrements, and "the next task
automatically slides in." None of that machinery applies to an archive lookup —
which is precisely why consultation does **not** need a split view or auto-advance:
there is no "next item" in a lookup.

### 2.2 Application

Two-tier answer:

1. **Minimum viable fix (row → navigate to `/dossiers/[id]`).** The dossier detail
   page already exists, already renders read-only-ish for Directeur roles (their
   write flags are off in `use-current-user.tsx`), and element-specs §3 already
   rules "row = link, chevron or ⋯ menu at the row end" — the current page simply
   violates its own binding spec. Navigation is honest for a *lookup* task: the
   user came to find ONE dossier; sending them to the full record is the task's
   natural end. Persisted filters (`usePersistedFilters('consultation', …)`) mean
   the back-navigation restores their filtered list — the classic cost of
   navigation (losing your place) is already paid down.

2. **Better fit for the Directeur audience (read-only peek drawer).** The
   frequent-inspection case ("keeps user in context", P&P "most scalable option")
   is real for Directeurs skimming several dossiers in a sitting, and the
   `/dossiers/[id]` page is edit-shaped (InformationTab form, action buttons) —
   a heavy landing for a read-only role. A right-hand sheet showing a §10
   definition list (assuré, compagnie, nature/type, statut, matricule, dates,
   dernière observation) + a « Ouvrir le dossier » link satisfies both audiences.
   This is a structural addition and needs an owner ruling; option 1 does not.

### 2.3 Row-click affordance and accessibility (how, concretely)

**tempertemper — "Clickable table rows are a bad idea"**
https://www.tempertemper.net/blog/clickable-table-rows-are-a-bad-idea

> `role="button"` on a `<tr>`: "in two of the most popular screen readers it removes
> the table row from the accessibility tree altogether." A row onClick "doesn't
> magically turn into an accessible control, you won't be able to focus the row
> using a keyboard, let alone trigger the click event using the ENTER key." Text
> selection: users trying to "highlight text for copying… will probably trigger the
> action on that table row" — bad "for people with hand tremors". Recommendation:
> put "a button or link *inside* a table cell."

**Adrian Roselli — "Block Links, Cards, Clickable Regions, Rows, Etc."**
https://adrianroselli.com/2020/02/block-links-cards-clickable-regions-etc.html

> Wrapping a whole region in one link makes "the entire string… read when tabbing
> through controls" (one example "about 25 seconds to read before announcing it as
> a link"). The pseudo-element stretch "prevents selecting the text." His rule:
> "the link to each article should be generally limited to the article title" —
> for tables, the link lives in one cell.

**Reconciliation with the binding §3 "row = link" ruling** (and addendum ter A
"row = one unambiguous click (open)"): the ruling is about *behaviour* (one click
target per row, opening the record); the accessible *implementation* is:

- a real `<a href="/dossiers/{id}">` on the **Réf. expert cell** (the identifier —
  Roselli's "title"); keyboard/AT users get one crisp link per row announcing the réf;
- pointer users get the whole-row click as an *enhancement* (row `onClick` →
  `router.push`, guarded by `window.getSelection()` so text selection doesn't
  navigate — the tempertemper objection);
- visible affordance so the row *looks* openable at rest (addendum ter E / NN/g
  flat-UI: weak signifiers cost 22 % more time): the réf styled as a link on hover
  + a quiet chevron in a trailing cell (§3's own "chevron at the row end");
  `cursor-pointer` on the row.

This is exactly the pattern the app's other queues should share; consultation is
currently the only list page with zero row interaction (compare
`assignations-chiffrage`, dossiers list, etc.).

---

## 3. "Look up one record" vs "monitor a queue" — sort, columns, density

**Pencil & Paper (enterprise data tables):**

> "Default sorting shows the most recent entries at the top (most recently created
> or modified) or entries most needing action (lowest inventory, most urgent
> priority)."

i.e. *recency for reference/lookup contexts, urgency for queues*. Addendum ter A
already encodes the queue half ("default sort = action-needed order on queue
pages"); consultation is the other half.

**mannhowie:** "Decide what most users should first query when using your data
table. Make this your default sort order when navigating to the table." First
query on consultation = "the dossier I was just asked about", overwhelmingly a
recent one → **Date de requête, newest first**, arrow shown on that column
(addendum ter A: sorted column shows its arrow; sort affordance in the header).

**Work queue contrast (surfeit.com, §2.1 above):** queues carry counters, removal
on completion, auto-advance; lookups carry *verification fields*. Implication for
columns: a queue shows what's needed to act (status, assignee, due); a lookup shows
what's needed to *confirm identity* (all the alternative keys) plus a small amount
of state. Consultation's column set is actually close to right; the ordering is not
(§4 below).

**Density:** a queue is scanned top-to-bottom repeatedly (density pays off); a
lookup is filtered down to a handful of rows first (density buys little).
Smashing Magazine (Sokhan, 2023 — https://www.smashingmagazine.com/2023/06/universal-cognitive-friendly-ux-design-tables-grids/):

> "Typically, row density gravitates around 40px–56px with a minimum padding of
> 16px on both the right and left edges of each column." On toggles: "the best
> solution is to let the user configure it for themselves while leaving the default
> state that is most convenient for the general average user" (Gmail cited). On
> small result sets: "reducing visual noise will help to present a clear picture";
> the losing-your-place problem is a *large*-dataset problem.

The HN large-tables thread (fetched via https://hn.algolia.com/api/v1/items/38942439)
is the counterweight — enterprise users pull toward density and "everything in one
list": simion314 wants "all of my data at once"; taeric reports "users had an
aversion against paged/pre-filtered displays and rather would have everything in one
list where they can dynamically filter it"; simion314 notes paged/incremental
loading "prevents using browser search functionality." But the same thread (taeric)
calls show-everything "something that's both a common B2B requirement because users
keep asking for it, and something functionally ~useless." The app's ruling (cap +
« Afficher plus » + visible total, never page numbers) already threads this needle:
nothing is unreachable, the total is honest, and find-in-page works within the shown
set. **Keep 44 px default; do not add a density toggle here** — the design system's
`data-density=compact` (36 px) exists if a Directeur ever asks, but the evidence for
toggles is about power users scanning large sets repeatedly, which is not this
page's task. (A toggle is also a settings surface to maintain on a page whose whole
job is "type three characters, read one row.")

---

## 4. Columns: which earn a place, and in what order

**mannhowie:** "Use human readable text for the first column. Do not use ids meant
for record keeping." — Nuance, not violation: `refExpert` is record-keeping-shaped
but it is *the* shared vocabulary between the cabinet and the compagnies (it is
what callers quote), so it stays first; the human-readable disambiguator (Assuré)
sits beside it. This matches NN/g's "first column = human-readable identifier"
(secondary, already in §3) and Eleken:

> "Freezing the first column (often an identifying name or ID) helps users keep
> track of which row they're looking at while scrolling horizontally." Mobile:
> show "only the most essential columns."

**Left-of-centre fixation** (addendum ter B, NN/g eyetracking: "80 % of fixation
time is left-of-centre") + the search box accepting exactly three keys (réf,
assuré, matricule) argues the three lookup keys should be **adjacent on the left**,
so the eye verifies a hit without crossing the full row. Current order splits them:
Réf (1st), Assuré (2nd), … Matricule (7th, right edge — where per addendum ter B
"anything essential at the right edge needs extra weight").

Proposed order (8 → 7 columns):

| # | Column | Why |
|---|--------|-----|
| 1 | Réf. expert (frozen, `t-mono`, semibold, the row's link) | identifier; what callers quote |
| 2 | Assuré | human disambiguator; 2nd search key |
| 3 | Matricule (`t-mono`) | 3rd search key; verification field — belongs with its siblings |
| 4 | Compagnie | first verification/context field |
| 5 | Statut (chip) | the one state fact a consultation answers ("où en est-il ?") |
| 6 | Nature du dossier | secondary context |
| 7 | Date de requête (sorted ↓ by default) | recency anchor; right edge is fine for the sort column |
| — | **Type de dossier → drop or demote** | lowest information scent for a lookup; candidate for the preview drawer instead |

Dropping Type needs an owner ruling (it may carry meaning for Directeurs I can't
see from code). Emphasis budget check (addendum ter A: "the identifier is the
row's ONLY bold cell", "2 cells per row — identifier + status"): the current page
puts `font-medium` on **Assuré** as well — three emphasized cells. Drop Assuré to
regular ink; that is enforcement of an existing ruling, not a proposal.

**Matt Ström-Awn — "Design better data tables"** https://mattstromawn.com/writing/tables/
corroborates the typographic frame: "numerical data is right-aligned… textual data
is left-aligned… headers are aligned with their data"; center alignment makes tables
"ragged… much harder to scan." (Already the §3 contract; nothing to change. Dates
in dd/MM/yyyy are fixed-width with `tabular-nums`, left-align is acceptable;
right-aligning the last column against the row edge is a cosmetic call, not
research-mandated.)

---

## 5. What is already right (do not touch)

- Hairlines, no zebra, 44 px, sticky header, frozen identifier with edge shadow —
  all re-confirmed by this round's sources and by addendum ter A's A-List-Apart
  zebra studies.
- Cap + « Afficher plus (N restants) » + visible total — the honest middle between
  pagination (HN: breaks find-in-page, users hate it) and infinite scroll
  (mannhowie: "record relocation issues… false sense of completion").
- Filter toolbar: search-first with format-cue placeholder, ≤3 promoted filters,
  applied chips + clear-all, live-value union in the selects (a genuinely good
  archive-page touch — legacy statuses of old dossiers stay filterable).
- Filtered empty state naming the filters to clear.
- `EmptyCell` em-dashes, `t-mono` on refs/plates, status chips with labels.

---

## 6. Sources

### Fetched and cited (this session)
- https://uxpatterns.dev/pattern-guide/table-vs-list-vs-cards — table vs list vs cards criteria
- https://www.eleken.co/blog-posts/table-design-ux — tables vs cards; frozen identifier; in-context action
- https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables — sidebar/modal/expand; density 40/48/56; default sort recency-vs-urgency; column control
- https://mannhowie.com/data-table-ux — first column readable; default sort = most common query; quick view; pagination
- https://www.tempertemper.net/blog/clickable-table-rows-are-a-bad-idea — row-as-button accessibility failures; link-in-cell
- https://adrianroselli.com/2020/02/block-links-cards-clickable-regions-etc.html — block-link verbosity; link limited to the title cell
- https://www.smashingmagazine.com/2023/06/universal-cognitive-friendly-ux-design-tables-grids/ — density defaults + user-configurable density
- https://gist.github.com/mpaiva-cc/d4ef3a652872cb5a91aa529db98d62dd — list→drawer vs list→modal vs split patterns, when each
- https://surfeit.com/portfolio_page/design-patterns-2/ — work-queue pattern anatomy (contrast case)
- https://hn.algolia.com/api/v1/items/38942439 — HN practitioner thread on large tables (density, anti-pagination, find-in-page)
- https://mattstromawn.com/writing/tables/ — alignment/typography fundamentals

### Could NOT fetch (honest list)
- **Reddit** — blocked outright, including old.reddit.com ("Claude Code is unable to fetch from old.reddit.com"). No cache route attempted beyond that.
- **Medium-hosted essays (HTTP 403):** Lucas Urbas, "Master/Detail Pattern Revisited" (medium.com/@lucasurbas/…86c0ed7fc3e); Andrew Coyle, "Design Better Data Tables" (coyleandrew.medium.com — density trio condensed 40 / regular 48 / relaxed 56 is quoted via Pencil & Paper's fetched article instead); Unn Krigul "Designing smarter data tables" (uxdesign.cc).
- **webapphuddle.com** master-detail 6-variant comparison — 403.
- **johanronsse.be** accessible clickable rows — 403 (tempertemper + Roselli cover the ground).
- **uxmovement.substack.com** "A better UX design for large data" — page fetched but content is an embedded video; no extractable guidance.
- **news.ycombinator.com** direct — 429 rate-limited twice; retrieved the same thread via the Algolia API instead (cited above).
- **dreamerux.com** mirror of Coyle — 404.
- Information-seeking theory framing ("known-item lookup" vs "monitoring" as task classes) is **[training knowledge, unverified]** — the operational consequences (sort/columns/density) are each independently sourced above.
