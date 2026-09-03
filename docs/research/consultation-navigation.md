# Navigation, search & findability — research for the Consultation page

Researched 2026-09-03 for `src/app/(app)/consultation/client-page.tsx` (read-only
"consult all claims files" page). 18 sources fetched live (URLs cited per
section); failures and paywalls listed honestly at the end. Training-knowledge
claims are flagged `[TK]`.

The page's two jobs, per the brief:
- **Lookup** — a manager finds ONE dossier by réf. expert / assuré / matricule
  among thousands.
- **Skim** — a manager browses one compagnie's recent files.

Current state audited before research: search input filters from the **1st**
character across `refExpert` / `assure` / `matricule` (naive `.includes`), three
selects + date range, applied chips + « Tout réinitialiser », `usePersistedFilters`
(localStorage **and** a `?f=` base64 URL mirror — the brief said "NOT URL", but
`use-persisted-filters.ts` lines 60–88 replaceState a shareable `?f=` param),
50-cap + « Afficher plus » + total, **rows not clickable**, **no sort UI**, **no
match highlighting**, **no recent searches / recently viewed**.

---

## 1. Search-as-you-type for record lookup

**Baymard — Autocomplete design** (https://baymard.com/blog/autocomplete-design, fetched):
- Suggestion count: "the number of autocomplete suggestions displayed to desktop
  users **shouldn't exceed** 10, while a target of 4–8 will work for most mobile
  users."
- Keyboard: "the *up* and *down* arrows should navigate the autocomplete
  suggestion while the *return* key should submit the currently focused
  suggestion" and sites should "**copy the suggestion** to the search field when
  it received keyboard focus."
- Highlighting: "**emphasize the predictive portion** to help users 'fill in the
  blanks', underscoring what's different in each suggestion." (i.e. highlight the
  DIFFERENCE, not the already-typed part, in suggestion lists.)
- Hover affordance: "**invoking the 'hand' cursor** on mouse hover of the
  autocomplete suggestions makes it 100% obvious to the user that these are
  links."

**Pencil & Paper — Search UX** (https://www.pencilandpaper.io/articles/search-ux, fetched):
- Threshold: "quickly (usually after 3 characters have been entered), we begin to
  see early matches arise in a dropdown below the search input." (Adobe Live
  Search and GitLab use 2; the app's binding element-specs addendum ter A already
  rules "**Search filters live from the 2nd character**" — consistent with the
  practitioner range of 2–3.)
- Scope labelling: "Include what is being searched in the placeholder text.
  Ex. search entire website vs. search items in table below."
- On search as a crutch: search is "as much a permanent solution to your nav
  problems as duct tape is to a leaky firehose" — filters and navigation must
  carry their share.

**Verdict for this page:** the table IS the results list, so a suggestion
dropdown is unnecessary — live row filtering (already in place) is the stronger
form of search-as-you-type. What's missing from the research checklist: a
2-char threshold (binding spec), match highlighting in rows (§2), forgiving
matching (§3), and Enter/keyboard behavior (§7).

## 2. Match highlighting

**A List Apart — Enhance Usability by Highlighting Search Terms**
(https://alistapart.com/article/searchhighlight/, fetched):
- "Most web users don't read pages carefully — they scan text for what they're
  looking for." Highlighting the matched term "reduces cognitive load by
  immediately showing visitors where relevant content appears."

**NN/g — Site Search Suggestions**
(https://www.nngroup.com/articles/site-search-suggestions/, fetched):
- "It's important to use different visual styles to show which characters fall
  into each category" — via "bolding, italics, color, or indenting."
- "Prioritize scannability and ease of processing."

**Meilisearch — typeahead** (via search result,
https://www.meilisearch.com/blog/typeahead-search): highlighting the matching
part "makes it clear why each suggestion appeared… helps users scan results
faster." Algolia calls highlighting "a cornerstone of search UX"
(https://www.algolia.com/blog/engineering/inside-the-algolia-engine-part-5-highlighting-a-cornerstone-to-search-ux, snippet only).

**Verdict:** wrap the matched substring in the Réf. / Assuré / Matricule cells in
a `<mark>`-style emphasis (ink-weight or soft tint per the colour rules — NOT
teal spread). This is exactly the "why is this row here?" answer that makes a
multi-field search feel intuitive, and it costs one small render helper.

## 3. Forgiving matching (the plate problem)

Baymard's no-results research (§8) shows users blame themselves or assume the
record doesn't exist. On THIS page the highest-risk field is `matricule`:
plates are stored **unnormalized** and the project's own rule (memory:
`project_at_plate_scan`) is "always compare via plate-match.ts" — but
`client-page.tsx` line 105 does `d.matricule?.toLowerCase().includes(s)`. A
manager typing `12345-A-6` will miss a dossier stored as `12345 أ 6` or
`12345 A 6`. Same class of issue: accented names (`Aït` vs `Ait`) and the
`assure` object vs string duality. This is a findability bug, not a styling
choice — fix by normalizing both sides (reuse `normalizePlate` + a
diacritic-stripping fold for names).

## 4. Faceted filtering — layout, batch vs instant, badges

**NN/g — User Intent Affects Filter Design**
(https://www.nngroup.com/articles/applying-filters/, fetched):
- Two modes: exploratory users "make one selection, and the system updates the
  results. After looking through the updated results, they get an idea for
  another filter" (→ instant); goal-driven users "already have multiple criteria
  in mind" (→ batch tolerable).
- Instant is right "if you expect the queries to be instantaneous (and the new
  results to be shown less than one second after each filter has been
  specified)". Batch is mainly a defence against slow round-trips, which is why
  it's the mobile e-commerce default.
- Anti-pattern: fragmenting the experience by "scrolling page position
  unexpectedly or refreshing too frequently."

**Baymard — Applied filters overview**
(https://baymard.com/blog/how-to-design-applied-filters, fetched):
- "28% of sites don't display applied filters overviews at all" vs 72% that do —
  omitting them causes: no confirmation filters are active, difficulty removing
  them, and "lost context for the product list."
- Best practice: chips with an "x" each + "Clear All"; "only showing filter
  *count* without actual filter names" is called out as a mistake; on mobile,
  horizontally scrolling chip rows need truncation/fade cues.

**Pencil & Paper — Enterprise filtering**
(https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering, fetched):
- Placement: sidebar "is more scalable in terms of real estate" but implies
  page-wide scope; a horizontal bar suits a handful of workflow filters; "offering
  advanced filters to your users for a 10-item list might add unnecessary
  complexity."
- Count badges: "Indicate which filters have a selection nested inside (small
  numerical marker, bold text, background-color)."
- Redundant state: keep state in the menus AND indicators AND an applied-filters
  summary.
- Zero-results prevention: "Display result counts at the input level to prevent
  empty states" (facet counts / disabled conflicting options).
- Saved queries: "Allow users to save frequently-used filter combinations."

**SaaSUI — Filtering & sorting patterns**
(https://www.saasui.design/blog/saas-filtering-sorting-ux-patterns, fetched):
- "Active filters should be shown as removable chips or a clear summary, so users
  always know why the list looks the way it looks." "Every applied filter needs
  an individual remove, and the whole set needs a single 'Clear all.'"
- Inline chips/tabs only for "2-3 most common cuts. Beyond five or six, they
  crowd the header"; dropdown filter bar is "the workhorse for B2B tables."
- "The default sort is a design decision, not an accident of insertion order."
- Empty state: "Tell the user their filters matched nothing, show which filters
  are active, and offer to relax or clear them — never leave a blank panel that
  looks broken."
- "Treat search and structured filters as complementary layers of the same
  narrowing system, not as either/or."
- URL: "Encoding filters and sort in the URL lets users share a precise view with
  a teammate and bookmark a recurring query."

**Verdict:** the page's toolbar (search first, 3 selects + date range, chips,
clear-all) already matches Baymard/Polaris/P&P and the binding §2 spec. Because
filtering here is client-side over an in-memory array (<1 s always), **instant
application is correct on every device** — the batch/Apply recommendation in the
literature is a latency defence this page doesn't need. Two real gaps: dropdown
option **result counts** (P&P zero-prevention) and a **count badge** if any
filter ever moves behind « Plus de filtres ».

## 5. Saved views / pinned filters

**Cloudscape — Saved filter sets**
(https://cloudscape.design/patterns/general/filter-patterns/saved-filter-sets/, fetched):
- Offer when "users frequently apply the same filters"; create via "Save as new
  filter set" with a required name; an "unsaved" label appears when a saved set
  is modified; deletion always behind a confirm.
- Basis design system (via search, https://design.basis.com/patterns/saved-views):
  saved views are for "complex Data Tables that have large numbers of
  configuration options… should not be used for simple tables with minimal
  configuration options, as this adds unnecessary complexity."

**SaaSUI** (fetched, above): "Saved views… let users codify the queries they run
repeatedly and switch between them in one click, often sharing them across a
team."

**Verdict:** this page has FOUR configuration axes (search, 3 selects, dates) —
below the complexity bar Basis sets. The existing localStorage persistence
already gives every user their one implicit "saved view" (their last one), and
`?f=` gives shareable views. Full named-saved-views machinery would be premature;
a lighter option if skimming-by-company proves frequent is 2–3 **preset chips**
(e.g. « Cette semaine », « Mes compagnies récentes ») — but that needs owner
judgment on actual usage, not theory.

## 6. Command palette (⌘K) — help or vanity here?

**Maggie Appleton — Command K Bars** (https://maggieappleton.com/command-bar, fetched):
- Benefits: hide infrequent features, fuzzy search ("typing 'make' surfaces
  creation-related actions"), "now function as **universal search**."
- Who: "primarily power users and frequent performers of tasks. The pattern
  assumes familiarity and rewards speed over discoverability for newcomers."

**HN — Command K Bars thread** (https://news.ycombinator.com/item?id=46602383, fetched):
- "I'm concerned… about people putting features _only_ in a command palette, and
  rendering features completely undiscoverable."
- "Command bars are a power user feature", and "a _lot_ of users are shockingly
  bad at typing."
- Consensus: palettes complement, never replace, visible navigation.

**HN — Command palettes: how typing commands became the norm again**
(https://news.ycombinator.com/item?id=29373536, fetched):
- Sweet spot: "commands you use often enough to remember exist, but nowhere near
  often enough to warrant memorizing a keyboard shortcut."
- Against: knowledge lock-in, no composability; "Power users are just
  disappearing. Modern UIs made it impossible to be a power user."

**Philip C. Davis — Command palette interfaces**
(https://philipcdavis.com/writing/command-palette-interfaces, fetched):
"especially helpful in professional tools… add lots of functionality without a
bloated interface" — note his essay is advocacy and does not engage the novice
problem at all.

**Verdict:** for a single read-only page whose search box is already the first
element and already searches the three lookup keys, a ⌘K palette adds a second,
hidden way to do the same thing — the definition of developer vanity, and it
fights "a baby can use it". The palette case would only reopen as an APP-WIDE
navigation layer ("jump to dossier from any page"), and even then the GitHub
deprecation saga (palette killed for low adoption,
https://news.ycombinator.com/item?id=44594135, snippet) says: most users never
find it. Recommendation: skip; spend the effort on `/`-to-focus + row keyboard
nav, which serve the same power users without a new surface.

## 7. Keyboard navigation (/, arrows, Enter)

**Superhuman — built for speed** (https://blog.superhuman.com/superhuman-is-built-for-speed/, fetched):
- "100ms is the threshold 'where interactions feel instantaneous'" (Paul
  Buchheit); keyboard shortcuts "are faster than a mouse in almost all cases";
  Superhuman teaches them "by showing keyboard shortcut hints right in the user
  interface."

**Quentin Golsteyn — Keyboard shortcuts on the web**
(https://golsteyn.com/writing/designing-keyboard-shortcuts/, fetched):
- "We should avoid keyboard shortcuts that override browser or OS defaults";
  discoverability via a "?" help screen, shortcuts shown in menus/tooltips, and
  "incremental discovery"; "aim for solutions that allow for discovery through
  mouse-based inputs" — the mouse path always exists, shortcuts accelerate it.

**Eric Lewis / Sasha Maximova (via search snippets — Medium 403 on direct
fetch):** "The keys J and K often navigate up and down… a shortcut borrowed from
Vim. The / key (forward slash) may focus the user's text cursor in the site
search"; Gmail and Jira as canonical implementations; "letter shortcuts don't
work when you're writing" → Esc leaves the field.

**Verdict:** the intuitive-for-everyone layer is mouse/touch; the keyboard layer
is additive. For this page: `/` focuses search (established convention:
Gmail/GitHub/YouTube `[TK]` + snippets above), Esc clears/blurs, ↑/↓ (or j/k)
move a visible row focus, Enter opens the focused row — and when the filtered
result is exactly one row, Enter in the search field opens it directly (the
fastest possible lookup loop). Hints: a subtle `/` kbd glyph in the search
field and shortcuts listed in tooltips per Golsteyn/Superhuman.

## 8. Zero results & recovery

**Baymard — 5 proven strategies for "No Results" pages**
(https://baymard.com/blog/no-results-page, fetched):
- "Nearly 50% of ecommerce sites fail" at recovery; generic "search tips" don't
  work — "users often skip them… generic advice gives them no concrete path
  forward" (via search summary of same article).
- Working strategies: keep the query visible and editable; "suggest one or more
  categories related to the user's search query"; suggest alternative queries;
  offer contact/help paths; history-based suggestions ("links to products they
  have recently browsed" — Build.com example, via search summary).

**Verdict:** the page's filtered empty state already names the offending filters
and offers « Effacer les filtres » — ahead of most. Upgrades that map from the
research: (a) when search + filters are BOTH active and search alone has
matches, say so ("« 4520 » existe dans d'autres compagnies — effacer le filtre
compagnie ?") — the record-lookup equivalent of Baymard's category links; NN/g
scoped search demands exactly this: "results pages must offer easy ways to
expand searches beyond the current scope"
(https://www.nngroup.com/articles/scoped-search/, fetched: "when a user doesn't
realize that his search is limited to a section, the consequences are
devastating" — a persisted compagnie filter from last week IS an invisible
scope). (b) Keep the typed query in the field (already true).

## 9. Persisted filters as invisible scope (localStorage risk)

NN/g scoped search (fetched, above): "Sites that select a scope by default are
the worst offenders, because users have not made that choice." A filter
restored silently from localStorage a week later is a default scope the user no
longer remembers choosing. The page already mitigates with always-visible chips
(Baymard's #1 defence). The zero-result copy naming the stale filter (already
done) plus the §8(a) cross-scope hint close the loop. No change to the
persistence mechanism itself is needed — but the chips row must never be
collapsed/hidden on mobile (Baymard: truncate with a fade cue, never hide).

## 10. Deep-linking filters to URL

**LogRocket — Query strings are underrated**
(https://blog.logrocket.com/query-strings-underrated-using-url-apps-state-container/,
via search summary): "Users can share a link or bookmark it and return to the
same app state, and query strings survive reloads without reaching for
localStorage or a server." nuqs (https://nuqs.dev) is the type-safe pattern:
"like useState, but stored in the URL query string." SaaSUI (fetched): "Encoding
filters and sort in the URL lets users share a precise view with a teammate."

**Finding:** `use-persisted-filters.ts` ALREADY mirrors to `?f=<base64>` with
localStorage fallback and URL-wins-on-mount — the brief's "NOT URL" is outdated.
Remaining delta vs best practice: the param is opaque base64 (fine for sharing,
useless for hand-editing — acceptable trade); and `visibleCount` (« Afficher
plus » depth) is NOT in the URL or history state, which matters for §11.

## 11. Pagination vs load-more vs virtual scroll; back-button restoration

**Smashing Magazine — Infinite scrolling, pagination or "Load more"**
(https://www.smashingmagazine.com/2016/03/pagination-infinite-scrolling-load-more-buttons/,
fetched; reporting Baymard's testing):
- "Load more + lazy-loading" won: users "browsed substantially more products…
  while spending meaningful time examining individual items — unlike infinite
  scroll's superficial scanning."
- Infinite scroll flaw: "the user will see the footer for a second or two until
  the next set of results is loaded and suddenly inserted, pushing the footer
  out of view."
- "Over 90% of tested e-commerce sites with 'Load more' buttons failed to
  preserve scroll position when users returned from product pages." Fix: "use
  `history.pushState()` to update URLs without page reloads."
- Thresholds: 50–100 items before the button for category lists; 15–30 on
  mobile.

**Baymard — Return users to the same place**
(https://baymard.com/blog/return-same-place, fetched):
- "87% of sites properly return users to the same scroll position"; breaking it
  is a "direct cause of site abandonments"; testers: "When I backtracked I got
  kicked way back up in the scroll… now I'm just scrolling fast to get back
  down to where I was."

**Verdict:** the 50-cap + « Afficher plus » + visible total is exactly Baymard's
winning pattern and the binding queue ruling — keep. The missing half is the
**return trip**: the moment rows become clickable (§12), the page must restore
(a) filters — already done via `?f=`/localStorage — AND (b) `visibleCount` AND
(c) scroll position, on browser-back or an in-app retour. Next.js App Router
restores scroll for `<Link>` back-nav only if the DOM can re-render the same
height, so `visibleCount` must survive (sessionStorage keyed by the page, or
history.state). Virtual scroll: unnecessary below ~thousands of rendered rows
and it breaks find-in-page and scroll restoration `[TK]`; the cap already
bounds render cost.

## 12. Rows must open the record; back-navigation for list→detail→list

NN/g breadcrumbs (https://www.nngroup.com/articles/breadcrumbs/, fetched): "For
sites with flat hierarchies with only 1 or 2 levels of categories, a breadcrumb
isn't needed as a wayfinding device"; breadcrumbs "are not intended to show the
history of pages traversed… they show the hierarchical structure."

The app's own binding table spec (§3/element-specs): "row = link, chevron or ⋯
menu at the row end"; addendum ter A: "Row = one unambiguous click (open)."

**Verdict:** a consultation page whose rows open nothing is a findability
dead-end — the user finds the dossier and then can't consult it. The row should
open the dossier detail (read-only respecting role), via a real `<Link>` (so
middle-click/ctrl-click and back-button semantics work), with the list→detail→
list loop closed by §11's state restoration. Breadcrumb not needed (flat, one
level); the browser back + the app sidebar suffice per NN/g.

## 13. Recent searches / recently viewed records

Baymard no-results & history research (via search summaries): Amazon "keeps
track of the user's browsing history and shows recently viewed items so that
they can get back to them easily"; Build.com offers "links to products they have
recently browsed" as recovery. NN/g enriched suggestions caveat
(https://www.nngroup.com/articles/enriched-site-search-suggestions/, snippet):
enriched suggestion types incl. recent searches "should be clearly labeled",
but "users rarely interact with enriched site suggestions, even with prominent
placement" — and plain suggested queries were "selected by users in only 23% of
the instances where they were offered" (NN/g site-search-suggestions, fetched).

**Verdict:** for a record-lookup tool the strongest variant is **recently
OPENED dossiers** (task resumption: "the file I checked yesterday"), not recent
query strings — queries are cheap to retype (a réf is 4–8 chars), whereas
re-finding a record repeats the whole funnel. Keep it humble per NN/g's low
interaction rates: a small, clearly-labelled « Consultés récemment » row (3–5
refs as neutral chips) shown only when search is empty, stored client-side.
Recent search STRINGS: skip.

## 14. Mobile

- NN/g applying-filters (fetched): batch on mobile is about page-load latency —
  inapplicable to this client-side page; instant stays.
- Baymard applied-filters (fetched): mobile chip rows → "truncate rightmost
  filters visually or add fade effects to signal more filters are available."
- Smashing/Baymard (fetched): 15–30 initial items on mobile.
- Baymard autocomplete (fetched): "ensure suitable spacing between tappable
  elements… appropriately large font size"; element-specs §2 already mandates
  ≥16 px inputs below `md` (also suppresses iOS zoom `[TK]`).
- The four selects + date range wrap into a tall stack on phones: the SaaSUI
  and P&P placement guidance (filter bar for a handful; richer pattern beyond)
  supports collapsing the three selects + dates behind ONE « Filtres » button
  with a count badge (P&P: "small numerical marker") opening the existing Sheet
  primitive, search staying always visible. Applied chips remain visible under
  the button so state is never hidden (Baymard).
- Table on narrow screens: sticky first column already specced; horizontal
  scroll inside the card per the design rules.

## 15. What could NOT be fetched (honest list)

- **Reddit**: `old.reddit.com` fetch refused by the tool ("Claude Code is unable
  to fetch from old.reddit.com"); www.reddit.com not attempted further. No
  Reddit-sourced evidence in this report.
- **Medium 403s**: uxdesign.cc "Best UX practices for search inputs" (Dawson
  Beggs) and sashika.medium.com "J, K, or how to choose keyboard shortcuts" —
  quotes for j/k / `/` conventions come from search-result snippets, flagged
  above.
- **Baymard premium**: full research articles behind the paywall; all Baymard
  quotes are from their public blog posts (fetched OK: autocomplete-design,
  how-to-design-applied-filters, no-results-page, return-same-place).
- **First Round Review** "Superhuman is built for speed" (the Vohra original):
  not fetched; the fetched blog.superhuman.com 100ms article covers the same
  claims.
- **Creative Bloq** recently-viewed article: fetch returned only nav chrome, no
  article body — recently-viewed evidence rests on Baymard-adjacent search
  summaries + Amazon precedent `[TK]`.
- NN/g enriched-suggestions and the j/k articles: snippet-level only.
- Linear engineering essay on keyboard-first UX: searched, no fetchable
  first-party essay found; Superhuman + Golsteyn stand in.
