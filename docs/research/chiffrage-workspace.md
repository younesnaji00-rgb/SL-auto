# Chiffrage workspace — détail dossier ATG + éditeur d'accord — Research Report

Date: 2026-09-03. Researcher: UX-research subagent (Fable 5). THEORY ONLY — no code changed.
Scope: (a) the assignations-chiffrage detail page (family rows of devis/accord/proposition
slot-cards, observations thread, documents panel) and (b) the split-screen accord editor
(source PDF + line-item table with désignation/quantité/PU/vétusté/TVA).
Builds on docs/research/typography.md [T-S#], intuitive-crud.md [C-#], and
dossiers-attention-efficiency.md [D-S#]; their findings are cross-referenced, not re-fetched.
Source tags: FETCHED / SEARCH-SNIPPET / TRAINING / FAILED. 18 sources fetched.

---

## 1. Executive recommendations

1. **[strong evidence] Source scan LEFT, editing table RIGHT, resizable divider.** Every
   mature transcription-verification tool converges on this: CAT translation grids put "a
   cell on the left that contains the source segment" with the translation "in the cell on
   the right" (memoQ, S13); diff viewers put old-left/new-new-right; D365 Invoice Capture puts
   "the original document" pane left of "the invoice pane" and lets users "resize the whole
   pane by dragging the resize line" (S1). LTR reading order = reference before product.
   Keep the split vertical (side-by-side) on desktop; it needs width ("160+ characters", S5)
   — stack panes only under ~1100px.
2. **[strong evidence] The version chain is a ≤5-item comparison → fixed pipeline columns,
   not a free horizontal card strip.** NN/g: "options as columns, attributes as rows … When
   more than 5 items need to be compared, add other mechanisms" (S12). A family is at most
   Source + 1er/2ème/3ème accord + proposition = 5 slots, so a fixed column grid (aligned
   across all garage rows) is feasible and beats a scrollable strip, whose overflow is
   systematically missed ("people often immediately scroll past… and miss all of the
   content", S2; peek/cut-off is mandatory if scrolling stays, S3).
3. **[strong evidence] In-cell editing with spreadsheet keyboard semantics in the editor
   table.** Chiffreurs are heads-down repeat users; "in-cell edit mode can be more
   convenient for advanced users, fast users, or users who prefer keyboard navigation"
   (S4). Tab/Shift+Tab across cells, Enter confirms and moves down, Escape reverts (S4);
   a memoQ-style row-confirm (Ctrl+Entrée → line marked verified, jump to next line) turns
   the table into a progress tracker (S13).
4. **[strong evidence] Totals must recalculate immediately and stay visible.** Baymard: "the
   cart summary and order total must also update immediately, as there will otherwise be
   potentially conflicting information in the interface" (S11); keep an itemized sticky
   summary (Total HT / TVA / TTC) in view while editing (S11 + checkout research snippets).
5. **[strong evidence] Numeric entry: `type="text"` + `inputmode="decimal"`, accept both
   `,` and `.`, format on blur to fr locale.** `input type=number` "in locales that use
   commas for decimal points, some browsers accept inputs like 1,5 … while others reject"
   (S10); Baymard: "89% of users entered numerical inputs in several different ways" →
   parse liberally, autoformat after (S9). Blur-format to `12 500,00 MAD` per typography.md
   [T fr-MA formats]; tabular-nums right-aligned in all amount columns [T-S12/S13].
6. **[converging opinion] The editor is a sovereign-posture screen: full-bleed, muted
   chrome, keyboard-first.** Cooper: sovereign apps "monopolize the user's attention for
   long periods", should "take as much screen real estate as possible", with a "narrow and
   conservative" palette, designed for "perpetual intermediates" (S7/S8). No card-chrome or
   marketing color inside the editor; pixels go to the scan and the grid.
7. **[converging opinion] Éditer lives on the card of the latest actionable version — one
   primary button per family.** Norman's mapping ("control sits next to the thing it
   changes" [C-2]) + Fitts ("minimize the distance between user focus areas and related
   action buttons" [D-S2]) put the action on the slot; Hick [D-S1] says don't render five
   equal Éditer buttons — emphasize the one next step, demote the rest to hover/menu.
8. **[converging opinion] Above the fold: the family pipeline, not metadata.** "The 100
   pixels just above the fold were viewed 102% more than the 100 pixels just below" (S14).
   The actionable object (document chain + its next action) belongs first; the observations
   thread collapses to a one-line summary + count (accordions are fine only "when people
   need only a few key pieces of content", S15 — but never hide the *newest* observation,
   which is frequently needed → progressive-disclosure criterion [D-S11]).
9. **[judgement] Make "which version is current" unmistakable with status color + a single
   accent ring, not position alone.** memoQ encodes per-row state with color + tick ("Translator
   confirmed: Green, with a single tick mark", S13); combine chip text (`Actuel`, `Envoyé`,
   `Remplacé`) with de-emphasis of superseded versions (lighter value color, Refactoring UI
   hierarchy [T-S6]) so the answer survives color-blindness and screenshots.
10. **[judgement] Give the page exit velocity: after Enregistrer/Envoyer, offer the next
    dossier.** Gmail's auto-advance rationale (process the queue "one by one" without
    returning to the list, SEARCH S18) + Superhuman's triage speed culture [D-S9]: a
    post-save banner `Accord généré — Dossier suivant →` measurably shortens the loop.

---

## 2. Per-angle findings

### Angle 1 — Side-by-side transcription / verification UX

**S1. Microsoft Learn — D365 Finance "Invoice capture solution workspace" — FETCHED**
URL: https://learn.microsoft.com/en-us/dynamics365/finance/accounts-payable/invoice-capture-workspace
(vendor docs, used as a pattern description of a shipping AP-verification UI, not marketing)
- "The side-by-side viewer provides an intuitive interface for viewing raw documents and
  invoice forms side by side."
- Synchronized highlighting: "an eyeball symbol appears on the left side of the fields.
  Select the eyeball symbol to automatically position and highlight the corresponding
  field value on the original document." — field→region navigation "in a single tap".
- Zoom/pan ergonomics: "Controls in the upper-right corner let users adjust the page view
  by changing pages, zooming in or out, fitting the document to the page, or rotating the
  document."
- Resizable split: "Users can resize the whole pane by dragging the resize line between
  the original document pane and the invoice pane."
- Errors surfaced in a "Message card … expandable/collapsible section" inside the form
  pane, not in a toast (matches GitLab inline-feedback finding [C-22]).
- Mapping mode colors: "Light yellow indicates that the key-value pair has already been
  mapped … Light blue indicates that the key-value pair hasn't yet been mapped."
- Anti-pattern to avoid: "A maximum of five invoice lines are shown per page" with arrow
  paging — paginating line items inside an editor breaks totals-scanning; our devis lines
  should scroll, not page. [judgement on that last clause]
- Status ladder (Captured → In review → Verified → Transferred) with explicit "Start
  review / Complete review" transitions = a named review mode, versions labeled ("current
  version will be Original Version" → "Modified version").

**S13. memoQ docs — "The Grid" (translation editor) — FETCHED**
URL: https://docs.memoq.com/current/en/Workspace/the-grid.html
- "In each row, there is a cell on the left that contains the source segment"; you "type
  or edit the translation in the cell on the right."
- Row confirm: "To confirm your translation, press Ctrl+Enter… The status of the segment
  will become Confirmed. memoQ will move to the next segment."
- "memoQ uses color coding to indicate the status of each segment" — "Not started: Gray…
  Edited: Pink… Translator confirmed: Green, with a single tick mark."
- CAT rationale (SEARCH-SNIPPET, translationgeek.de): a layout that makes "it easy for you
  to see both the source segment and the target segment at all times… way easier than
  jumping around a document with your eyes."

**S16. Design for Context — "Split Focus: designing applications for multiple monitor
setups" — FETCHED** — knowledge workers expect "side-by-side comparisons and multi-tasking";
frustration when "applications do not scale well to a larger size, wasting screen real
estate." → let the editor use full width; don't cap the container at a content-page max-width.

**S6. Nick Babich / UX Planet — "Best Practices for Split Screen Design" — FETCHED via
r.jina.ai (direct 403)** — mostly about marketing split-screens, but transferable: "users
will make a visual connection between paired items"; "When it comes to smaller screens, the
panels can be stacked"; "Complex split screens make the UI look cluttered."

- Handedness/eye travel — TRAINING (flagged): transcription-typing research (Salthouse
  1986) shows copy typists keep eyes mostly on the source while typing; minimizing the
  saccade distance between source region and the active cell argues for keeping the active
  line's source region vertically near the active row (auto-scroll the PDF when possible)
  and for source-adjacent placement rather than opposite screen corners. Not verified
  against a fetched source.
- Form-eye-travel corroboration (SEARCH-SNIPPET, designlab.com/koombea): side-placed labels
  make the eye "track back and forth almost in a Z pattern, which slows the user down" —
  the cost of horizontal eye travel is real; the split earns it only because the source is
  a *reference*, not a label.

### Angle 2 — Version lineage / comparison layouts

**S5. DevUtils — "Side-by-Side vs Unified Diff" — FETCHED**
URL: https://utili.dev/blog/side-by-side-vs-unified-diff
- "Your eye moves horizontally between the two columns rather than linearly."
- "For changes where most lines are modified rather than added or removed… side-by-side is
  dramatically easier to read." (An accord = mostly *modified* lines of the devis → the
  side-by-side family wins for comparing devis↔accord.)
- Cost: side-by-side needs "160+ characters of terminal or browser width"; "when a large
  block is added or deleted… one column goes blank for many rows — wasted space."
- "Word-level diff works well in unified format" — per-cell change highlighting can
  substitute for a second full column when width is scarce.

**S12. NN/g — "Comparison Tables" — FETCHED**
URL: https://www.nngroup.com/articles/comparison-tables/
- "Comparison tables support compensatory decision making… When more than 5 items need to
  be compared, add other mechanisms such as filters."
- "Stick to the standard table layout: options as columns, attributes as rows, with row
  labels on the left and column labels above."
- "Clearly indicate rows so users can easily tell which attribute a cell refers to… Row
  borders, row shading, or extra spacing."
- Applied: version = column, garage-family = row band; shared column headers (`Source`,
  `1er accord`, `2ème accord`, `3ème accord`, `Proposition`) make lineage self-labeling.

**S8. NN/g — "Wizards: Definition and Design Recommendations" — FETCHED**
- "Display a list or a diagram of the steps involved and highlighting the current step."
- "Avoid wizards for repetitive tasks or expert users" — the *pipeline metaphor* (progress
  columns) is right for showing where a document is; a forced step-by-step flow is wrong
  for the chiffreur's editing itself.
- Stepper corroboration (SEARCH-SNIPPET, edana.ch/eleken): milestones "reassure users about
  their current advancement"; error steps flagged with an icon guide review "without
  ambiguity."
- Version-history tools (SEARCH-SNIPPET, UXPin/Zeplin): timelines are the norm for *audit*
  ("document changes between versions intentionally using commit messages") but none of the
  fetched material supports timelines for *choosing among versions* — columns compare,
  timelines narrate. [judgement]

### Angle 3 — Editable grids / line-item tables

**S4. Simple Table — "Editable React Data Grids: In-Cell vs Form-Based Editing" — FETCHED**
URL: https://www.simple-table.com/blog/editable-react-data-grids-in-cell-vs-form-editing
- "Click a cell, type a new value, press Enter—done." Best for "updating inventory,
  pricing, or quantities across many rows" by users "familiar with Excel/Sheets" who
  "expect this workflow."
- Keyboard: "Tab and Shift+Tab navigate between editable cells"; "Enter or clicking
  outside saves"; "Escape cancels editing and reverts to the original value."
- Trade-off: in-cell is "Hard to show detailed error messages in cells"; forms give "All
  errors shown together." → keep per-cell errors terse (red ring + short hint), aggregate
  blockers in a message strip above the totals (mirrors D365 Message card, S1).
- Telerik/MUI corroboration (SEARCH-SNIPPET): "in-cell edit mode can be more convenient for
  advanced users, fast users, or users who prefer keyboard navigation."

**S9. Baymard — "8 Recommendations for Creating Effective Input Fields" — FETCHED**
- "89% of users entered numerical inputs in several different ways, even when formatting
  examples showed the required input format."
- "Allow users to input their data in any formatting they want" — restrict-then-error is
  the anti-pattern; masks "autoformat users' input as they type" and "reduce hesitation
  and validation errors."

**S10. Stefan Bauer / n8d.at — "Why input type=number is Broken for Decimals" — FETCHED**
- "In locales that use commas for decimal points, some browsers accept inputs like 1,5 and
  convert them, while others reject these inputs or behave unpredictably."
- "The scroll wheel increments a focused number input by default in most browsers" —
  silent-value-change hazard in a money grid.
- Fix: `type="text"` with `pattern="^\d+([.,]\d+)?$"` and "adding the 'inputmode' attribute
  … set to numeric or decimal" for the right mobile keyboard.

**S11. Baymard — "Use Buttons or Buttons Plus an Open Text Field for Updating Cart
Quantity" — FETCHED**
- "Any changes should apply automatically as soon as the value is changed."
- "The cart summary and order total must also update immediately, as there will otherwise
  be potentially conflicting information in the interface."
- Debounce detail: "implementing a slight delay (e.g., 200–300ms) before autoupdating
  gives users time to type double-digit quantities."
- Checkout corroboration (SEARCH-SNIPPET, baymard.com/learn/checkout): keep a "sticky,
  real-time 'order summary'… Itemizing clearly — 'Items — €40, Shipping — €2, Taxes — €0,
  Total — €42' — reduces anxiety." → sticky `Total HT / Vétusté / TVA / Total TTC` block.
- Row ops & alignment: right-align numerics, tabular figures, 40–48px rows, top totals
  vs footer — carried from typography.md [T-S12, T-S13] and tables.md; not re-fetched.
- Vétusté %: constrained numeric with visible computed effect (amount deducted) beats a
  bare % cell — feedback principle "every action has a 'reaction'" (S17). [judgement on
  the concrete treatment]

### Angle 4 — Progressive disclosure on the record page

**S14. NN/g — "The Fold Manifesto" — FETCHED**
- "What appears at the top of the page vs. what's hidden will always influence the user
  experience — regardless of screen size."
- "Users do scroll, but only if what's above the fold is promising enough."
- "The 100 pixels just above the fold were viewed 102% more than the 100 pixels just
  below the fold"; "84% is the average difference in how users treat info above vs. below
  the fold."

**S15. NN/g — "Accordions for Complex Content" — FETCHED**
- "Accordions are more suitable when people need only a few key pieces of content on a
  single page."
- "It is easier to scroll down the page than to decide which heading to click on."
- "Accordions increase interaction cost. Readers treat clicks like currency."
- "Hiding content behind navigation diminishes people's awareness of it."
- Applied: the observations thread can stay collapsed *only if* its collapsed state shows
  the latest entry + count (the frequently-needed part stays visible — progressive
  disclosure criterion: "disclose everything that users frequently need up front" [D-S11]).
  The bottom documents panel is a legitimate secondary layer (rarely the task's object).
- CRM convention (SEARCH-SNIPPET, HubSpot/Salesforce docs): record pages put highlights on
  top, "a timeline of activities" in the middle/side tab, "newest activities first" — the
  thread-as-side-panel is the industry default when horizontal space allows.

### Angle 5 — Card rows vs other groupings

**S2. NN/g — "Carousel Usability" — FETCHED**
- "Ensure that users interested in a carousel realize that there is more than just the
  currently displayed image/content."
- "People often immediately scroll past these large images and miss all of the content."
- "Include 5 or fewer frames within the carousel, as it's unlikely users will engage with
  more than that."
- Cut-off affordance: bleed/cut off the next item to signal overflow.

**S3. Smashing Magazine — "Usability Guidelines For Better Carousels UX" — FETCHED**
- "Always indicate a slice of the upcoming slide."
- "Always include prev/next buttons to your carousels"; dots are "incredibly small…
  slow and requires a lot of precision."
- "On desktop, group prev/next buttons and display them above the carousel."
- Grids beat carousels for discoverability; carousels earn their place only when order
  encodes meaning. In our case order DOES encode meaning (lineage) — but with ≤5 slots
  there is no overflow to manage, so the fixed grid keeps the meaning *and* discoverability.

### Angle 6 — Completion & handoff

**S7. About Face (Cooper), "Postures for the Desktop" via flylib — FETCHED**
- "Programs that are best used full-screen, monopolizing the user's attention for long
  periods of time, are sovereign posture applications."
- "Users of sovereign applications are perpetual intermediates."
- "Every frequently used aspect of the program should be controllable in several ways."
**S8b. Tidwell — "Sovereign Posture" (MIT pattern) — FETCHED**
- "The user will be irritated by small inefficiencies and too much hand-holding."
- "Allow the artifact to take up all the space it needs to get the job done efficiently."
**S18. Gmail auto-advance — SEARCH-SNIPPET only** (makeuseof/thewindowsclub): auto-advance
  "displays the next conversation… after you delete, archive, or mute"; users "don't have
  to return back to your inbox and start the whole process… all over again."
**Crossref [D-S9] Superhuman**: sub-100ms interactions + keyboard triage; the cost of
  returning to a queue between items is the main throughput leak on assembly-line work.
- Primary-action placement: end-of-task actions belong at the point where the task ends —
  the totals/summary block — not only in a distant header (Fitts [D-S2]; feedback proximity
  "as close to where the action took place as possible", S17). Header keeps a duplicate for
  findability (Cooper's "controllable in several ways", S7).

**S17. Pencil & Paper — "Interaction Patterns UX Guide" — FETCHED**
- "Every action has a 'reaction'… if a 'reaction' in the UI doesn't happen, users assume
  the system is broken, or worse that they are 'bad' at using it."
- Confirmations "located as close to where the action took place as possible."

---

## 3. Layout candidates

### Detail page (family / accord arrangement + Éditer)

**Candidat A — « Grille pipeline » (recommended)**
One section per source (Devis Garage 1, Devis Garage 2, Facture…). Fixed 5-column grid with
shared sticky headers: `Source · 1er accord · 2ème accord · 3ème accord · Proposition`.
Empty stages render as ghost slots (`+ Créer 2ème accord`) only for the next legal stage;
later stages stay blank. The latest live version gets the accent ring + chip `Actuel`;
superseded ones get muted values + chip `Remplacé`; sent ones `Envoyé`. A thin connector
line between filled slots draws the derivation arrow.
- Éditer: primary button on the *rightmost editable* slot only; other slots expose
  `Consulter` (and Éditer via kebab) — one obvious next action per family (Hick, S12 ≤5).
- Pros: lineage is literally the x-axis; garages align vertically for cross-garage
  comparison (NN/g comparison-table structure, S12); zero hidden overflow (S2/S3).
- Cons: 5 columns need width — on <1100px collapse each family to Candidat B's stepper;
  empty columns cost space when most families stop at 1er accord (mitigate: ghost slots
  are visually near-empty).

**Candidat B — « Stepper vertical + panneau aperçu »**
Each family is a compact horizontal stepper (dots+labels: Source → 1er → … → Proposition,
current step highlighted per S8), one line per family; clicking a step opens a right-side
preview panel (PDF thumbnail, montants, actions Éditer/Consulter/Envoyer).
- Pros: very dense (10+ families scannable); mobile-friendly; the "where is this document
  in its life" question is answered by the stepper shape alone.
- Cons: amounts/dates not visible without a click (accordion cost, S15); comparison across
  versions requires the panel; two-pane page competes with the observations panel.

**Candidat C — Strips conservés, corrigés (minimal change)**
Keep horizontal card strips but: cut off the next card at the container edge ("always
indicate a slice of the upcoming slide", S3), add grouped prev/next arrows above the strip
(S3), align all strips to the same column rhythm, and add the `Actuel`/`Remplacé` chips.
- Pros: cheapest; no relayout of the page.
- Cons: keeps the core defect — overflow versions can be missed on narrow screens (S2);
  lineage direction still implicit.

Page order (all candidates): header (réf, assuré, statut, actions) → families → collapsed
observations summary (dernière observation + `3 observations ▸`) → documents panel. If
width ≥1440px, observations as right rail instead (CRM convention, Angle 4). The
`Réforme` / `Envoyer par mail` header buttons stay, but `Envoyer par mail` should also
appear contextually on a `Proposition`/final slot once one exists (mapping, [C-2]).

### Editor (split + table)

**Candidat A — « Vérification classique » (recommended)**
Vertical split, source PDF left (~45%), table right (~55%), draggable divider with
persisted ratio (S1), min-width guards; below ~1100px stack source above table. Full-bleed
sovereign layout — no page max-width, no decorative chrome (S7/S8/S16). PDF pane: zoom,
fit-width, rotate, page nav in its own corner toolbar (S1). Table: in-cell editing,
Tab/Enter/Escape (S4), optional Ctrl+Entrée = `Ligne vérifiée` tick + jump (S13), sticky
footer `Total HT · Vétusté · TVA · Total TTC` recalculated live (S11), message strip for
blocking errors, `Enregistrer` primary at the footer's right end.
- Pros: matches every verified analog (CAT, diff, AP tools); scales to 100 lines
  (scroll, never paginate — anti-pattern noted in S1).
- Cons: 45% is tight for A4 scans → fit-width zoom default + divider drag must be smooth.

**Candidat B — « Mode segment » (CAT-style, ambitious)**
Same split, but the active table row is enlarged and the PDF auto-scrolls/highlights the
corresponding line region (needs OCR bounding boxes from the existing Gemini scan);
Ctrl+Entrée confirms and advances like memoQ (S13). Row status colors (gris → modifié →
vérifié) make review progress visible and give a natural "done when all green" signal.
- Pros: minimal eye travel (TRAINING, Salthouse); per-line verification is auditable.
- Cons: highest effort; depends on reliable line-level coordinates; degrade gracefully to
  Candidat A when coordinates are missing.

**Candidat C — « Table pleine largeur + source épinglable »**
Table takes the full width; the source is a floating, pinnable thumbnail that expands on
hover/press (loupe) or into a temporary overlay.
- Pros: maximum grid width for many columns; good on small screens.
- Cons: violates the "see both at all times" principle that CAT tools consider core
  (S13 rationale); constant open/close is exactly Tidwell's "small inefficiencies" (S8b).
  Only worth it as a *mode* for the re-edit case (2ème/3ème accord where the chiffreur
  already knows the document).

Editor completion: after `Enregistrer` → inline confirmation at the button ("as close to
where the action took place", S17), then a non-modal banner:
`Accord PDF généré · Retour au dossier · Dossier suivant →` (auto-advance rationale, S18).

## 4. Micro-interactions shortlist (impact / effort)

1. **Totaux vivants** — recalc HT/TVA/TTC on every cell commit, 200–300ms debounce on typed
   quantities (S11). Impact: high. Effort: low.
2. **Format fr on blur** — parse `,`/`.`, render `12 500,00` tabular-nums right-aligned
   (S9/S10, [T-S13]). Impact: high. Effort: low.
3. **Clavier tableur** — Tab/Shift+Tab across cells, Entrée = valide + descend, Échap =
   annule la cellule (S4). Impact: high. Effort: medium.
4. **Ligne vérifiée** — Ctrl+Entrée marks the row (coche verte) and jumps to the next
   unverified row; progress `12/18 lignes vérifiées` near totals (S13). Impact: medium-high.
   Effort: low-medium.
5. **Surlignage synchronisé champ↔scan** — click a row → highlight/scroll the PDF region
   (eyeball pattern, S1); needs bounding boxes. Impact: high. Effort: high (ship later;
   interim: per-row page-number hint if the scan is multi-page).
6. **Diviseur mémorisé** — draggable split, ratio persisted per user (S1, S16).
   Impact: medium. Effort: low.
7. **Aperçu vétusté** — editing `Vétusté %` shows the deducted amount inline on the row
   (S17 reaction principle). Impact: medium. Effort: low.
8. **Chips d'état de version** — `Actuel` / `Remplacé` / `Envoyé` + accent ring on the
   current slot; color + text, never color alone [D-S8]. Impact: medium. Effort: low.
9. **Dossier suivant** — post-save banner offering the next queue item (S18, [D-S9]).
   Impact: medium. Effort: low.
10. **Molette neutralisée** — no scroll-wheel increments on amount fields (hazard, S10).
    Impact: low (error prevention). Effort: trivial.

## 5. Honest source accounting

Fetched (18): S1 learn.microsoft.com invoice-capture-workspace; S2 nngroup.com
designing-effective-carousels; S3 smashingmagazine.com 2022/04 carousel UX; S4
simple-table.com in-cell vs form; S5 utili.dev side-by-side-vs-unified-diff; S6 uxplanet
split-screen (via r.jina.ai — direct 403); S7 flylib.com About Face 2.0 "Postures for the
Desktop"; S8b mit.edu/~jtidwell sovereign_posture; S8 nngroup.com wizards; S9 baymard.com
learn/input-fields; S10 n8d.at input-type-number; S11 baymard.com blog
auto-update-users-quantity-changes; S12 nngroup.com comparison-tables; S13
docs.memoq.com the-grid; S14 nngroup.com page-fold-manifesto; S15 nngroup.com
accordions-complex-content; S16 designforcontext.com split-focus; S17 pencilandpaper.io
microinteractions (thin on live-recalc specifics — gap noted in fetch).

Could not fetch / secondhand:
- news.ycombinator.com item 5662214 (Draftable Word-diff thread) — HTTP 429. Only the
  hn.algolia.com story listing was fetched (titles/points, no comment text).
- Reddit: not attempted this session (no thread surfaced organically in searches); no
  Reddit-sourced claims are made.
- Gmail auto-advance (S18), CAT-tool rationale beyond memoQ docs, HubSpot/Salesforce
  record-page conventions, Telerik/MUI keyboard semantics, edana/eleken stepper details,
  Evil Martians payment-form piece, OCR-verification patent (Tab-to-next-low-confidence
  character) — SEARCH-SNIPPET only, used for corroboration, never as sole support.
- TRAINING (flagged inline): Salthouse transcription-typing eye behavior; "timelines
  narrate, columns compare" is my [judgement] synthesis, not a fetched claim.
- Baymard full checkout guide and Pencil & Paper enterprise-data-tables were not
  re-fetched; table-typography and inline-editing claims ride on docs/research/
  typography.md and intuitive-crud.md citations ([T-#], [C-#], [D-#]).
