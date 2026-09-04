# Typography & spacing for data-dense table pages — research report (Consultation page)

Date: 2026-09-03. Scope: table typography theory, tabular vs proportional figures,
mono for identifiers, sizes for scan-reading, line-height in cells, letter-spacing
for small labels, French conventions (OQLF), spacing scales, whitespace/density
research, alignment, truncation, column widths — applied cell-by-cell to
`src/app/(app)/consultation/client-page.tsx` + `src/components/ui/table.tsx`.

All quotes below are from pages actually fetched this session unless flagged
**[training knowledge]** or **[secondhand via search results]**.

---

## 1. Sources fetched (with what they said)

### 1.1 Matthew Butterick — Practical Typography

**Alternate figures** — https://practicaltypography.com/alternate-figures.html
> "Tabular figures are set on a fixed width. That way, each figure occupies the
> same horizontal space on the page (somewhat like a monospaced font)."
> Proportional figures "tend to have more even spacing and a more consistent
> appearance" — prefer them in text; but "tabular figures are essential for one
> purpose: vertically aligned columns, like you find in grids of numbers."

**Point size** — https://practicaltypography.com/point-size.html
> "On the web, the optimal size is 15–25 pixels." (body text — i.e. *reading*
> text; he also notes visual size varies by font, so judge by eye.)

**Letterspacing** — https://practicaltypography.com/letterspacing.html
> "Use 5–12% extra space with caps, but not with lowercase." CSS: `0.05em` to
> `0.12em`. Letterspacing is for all caps, small caps, and "lowercase text
> smaller than 9 points (to maintain letter distinction)". 9 pt ≈ 12 px CSS.

**Line spacing** — https://practicaltypography.com/line-spacing.html
> "For most text, the optimal line spacing is between 120% and 145% of the
> point size."

### 1.2 Richard Rutter — "Web Typography: Designing Tables to be Read, Not Looked At" (A List Apart)
https://alistapart.com/article/web-typography-tables/
> "Tables are not pictures of data: they are catalogues of data to be perused,
> parsed, referenced and interrogated."
- Alignment: "Align table text as you would anywhere else; that is, aligned
  left." · "Right-align numbers to help your reader make easier comparisons of
  magnitude when scanning down columns." · "Match the alignment of headings to
  the alignment of the data."
- Figures: "It is far easier to compare numbers if the ones, tens and hundreds
  are all lined up vertically; that is, all the digits should occupy exactly the
  same width." → `font-variant-numeric: lining-nums tabular-nums`.
- Column widths: "Table columns should be sized according to the data they
  contain. Columns of small numbers should be narrow, and columns of paragraphs
  should be relatively wide." · Don't stretch tables full width — stretching
  "will be harder to read as the data will be unnecessarily separated." ·
  "Browsers have been laying out tables automatically according to complex
  algorithms since long before CSS came along – just let them do their thing."
- Rules/fills: "Avoid any border or frame surrounding the table." · Rules: "Use
  them judiciously and preferably not at all"; vertical rules "only when the
  space between columns is so narrow that mistakes will occur in reading." ·
  Zebra stripes "are usually a distraction. They serve to distort the meaning of
  the data by highlighting every other row to the detriment of neighbouring rows."
- His example cell CSS is tight print-style (`padding: 0.125em 0.5em 0.25em;
  line-height: 1`) — note his asymmetric squish inset (top < bottom) and 0.5em
  horizontal (≈ 7 px at 14 px). App design systems run roomier; the principle
  that survives is *vertical padding ≪ horizontal padding* and lh ~1 in cells.

### 1.3 Oliver Schöndorfer — Pimp my Type

**Font size** — https://pimpmytype.com/font-size/
- Body (long-form): default 16 px. Functional text (captions, labels, nav):
  **12–14 px**, and at small sizes "use slightly stronger weight (medium) and
  increase letter-spacing to improve readability."
- "A font is only as good as it's being set."

**Line length & line height** — https://pimpmytype.com/line-length-line-height/
> "For reading text on desktop devices, the ideal line has a length of 60 to 80
> characters with a line height of around 1.5 to 1.6."
> "Longer lines need more line height, shorter lines need less."
- Headings ~1.1; **"UI components: values of 1.2–1.3, sometimes 1.0 for
  buttons"**. Overarching: "Make it as compact as possible but as loose as
  necessary."

### 1.4 Learn UI Design — font size guidelines
https://www.learnui.design/blog/mobile-desktop-website-font-size-guidelines.html
> "For interaction-heavy designs, your main font size will be 14-20px" (vs
> 18–24 px for text-heavy pages). "Secondary text – like lesser labels,
> captions, etc. – use a size a couple notches smaller – such as 13px or 14px."
> "Even the most interaction-heavy pages can typically look just fine with
> about 4 font sizes total." Inputs ≥ 16 px below md (iOS zoom).
- Text-heavy pages "optimize the experience of reading"; interaction-heavy
  pages "optimize the display of information" — a queue table is squarely the
  second: 14 px cells are theory-correct, and prose elsewhere (observations)
  correctly steps up to 15–16 px per addendum ter D.

### 1.5 OQLF — Vitrine linguistique (French/Québec conventions)

**Contexts requiring espace insécable** —
https://vitrinelinguistique.oqlf.gouv.qc.ca/24566/la-typographie/espacement/contextes-exigeant-une-espace-insecable
- « dans une date, entre le jour écrit en chiffres et le nom du mois, et entre
  le nom du mois et l'année »
- « avant les symboles d'unités monétaires » · « avant le symbole de
  pourcentage » · « avant et après le symbole de l'heure »
- « les grands nombres, entre chaque tranche de trois chiffres à partir de la
  droite » (thousands groups are insécables)
- Per the BDL search-result summaries (pages enumerated by the Vitrine): the
  colon (deux-points) is preceded by a non-breaking space; guillemets « » take
  a space after the opening and before the closing chevron, non-breaking so
  they are never stranded at a line edge. **[the deux-points page itself was
  summarised via search results; the insécable-contexts page above was fetched]**

**Sommes d'argent** —
https://vitrinelinguistique.oqlf.gouv.qc.ca/21584/la-typographie/nombres/ecriture-des-sommes-dargent
> « lorsqu'on exprime l'unité monétaire sous forme de symbole, celui-ci se place
> toujours après le nombre, précédé d'un espacement. » Decimal comma: « 25,50 $ ».
> Currency codes follow the amount (« 1000 $ CA »); in tight tables k$/M$
> prefixes are allowed.
→ For this app: **"12 500,00 MAD"** — groups of three from the right separated
by insécable (narrow no-break U+202F where the font supports it, else U+00A0),
comma decimals, ` MAD` after. `Intl.NumberFormat('fr-MA', {style:'currency',
currency:'MAD'})` emits exactly this shape (U+202F groups). **[the fr-MA Intl
output shape is training knowledge — verify once in the runtime]**

### 1.6 Pencil & Paper — enterprise data tables
https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
- Density presets: "Condensed: 40px, Regular: 48px, Relaxed: 56px."
- "Numerical values are much easier to compare and contrast when they're
  right-aligned." Headers match column alignment.
- "Use a monospace font for numerical values… avoids such problems as $1,111.11
  looking visually smaller than $999.99." (Their framing; tabular lining
  figures in the UI sans achieve the same column alignment without switching
  face — Rutter/Butterick. Mono stays reserved for opaque identifiers.)
- Zebra: layering hover/selected/disabled over stripes yields "five semantic
  grey levels that disrupt continuity" — thin 1 px light-grey row lines instead.
- Frozen leftmost column while horizontally scrolling = the norm.

### 1.7 Darkhorse Analytics — "Clear off the table"
https://darkhorsevisualization.com/blog/clear-off-the-table
> "Remove to improve" — rather than "dressing up our data we should be
> stripping it down"; kill fills and gridlines and "let the data itself form
> the structure that aids readability by making better use of alignment and
> whitespace." (Refers onward to Few, *Show Me the Numbers* ch. 8.)

### 1.8 Anthony Hobday — Safe visual design rules
https://anthonyhobday.com/sideprojects/saferules/
- "Measurements should be mathematically related" (e.g. multiples of 8).
- "Make outer padding the same or more than inner padding."
- "Lower letter spacing and line height with larger text. Raise them with
  smaller text."
- "Make horizontal padding twice the vertical padding in buttons" (the squish
  inset, generalised in addendum ter D).

### 1.9 Whitespace research — the honest version
- The endlessly-cited "Lin (2004): whitespace increases comprehension by 20%"
  is **debunked**: Carl Myhill contacted Prof. Lin, who replied "The said
  publication of mine has nothing to do with whitespace, not to mention the
  so-called increase of comprehension by 20%."
  (https://www.linkedin.com/pulse/lin-2004-did-discover-margins-white-space-increase-20-carl-myhill —
  via search result summary.)
- The real study is **Chaparro et al. 2004** (fetched summary:
  https://researchinuserexperience.wordpress.com/2005/02/13/reading-online-text-with-a-poor-layout-is-performance-worse/):
  "participants read the text with optimal white space slower, but comprehended
  more"; and "poor use of white space does not impact reading performance
  [much], … higher satisfaction and preference of the better layout should not
  be discounted." → Whitespace buys comfort/satisfaction and some comprehension,
  and *costs speed*. For a scan-read queue, moderate density is defensible;
  don't chase airy layouts for their own sake, and don't fear 44 px rows.

### 1.10 Density roundups **[secondhand via search results]**
- Setproduct data-table guide: standard 48–56 px (comfortable), compact
  40–44 px, dense 32–36 px for expert bulk review; comfortable viewport shows
  ~12–15 rows. Density toggles are "near-mandatory past a certain product
  maturity" when audiences mix casual + power users.
- SAP Fiori wrapping/truncation (search summary): "Never wrap or truncate any
  numeric, boolean, monetary values and short-text columns"; wrapping is the
  general default for responsive text, but in tables "wrapping text so users
  can see every character will make your table harder to scan"; safe default =
  one line + ellipsis + full value on hover/focus; reserve wrapping for one
  designated description column.
- Stéphanie Walter's resource hub (fetched:
  https://stephaniewalter.design/blog/essential-resources-design-complex-data-tables/):
  themes = alignment, density, truncation, column freeze/resize/reorder; "do
  your user research" before table decisions.

---

## 2. Theory distilled into rules for THIS design system

1. **Sizes.** 14 px cells on an interaction-heavy page is exactly the
   theory-correct choice (Learn UI 14–20; Butterick's 15–25 px is about *reading*
   prose, which addendum ter D already routes to 15–16 px). 12 px heads/captions
   = "a couple notches smaller" secondary text. Total sizes on the page: 12
   (label/caption), 13 (mono), 14 (cells) — within the 4–5-size budget.
2. **Figures.** Tabular lining figures in columns (already global on cells);
   proportional in sentences; *live* figures that re-render (caption counts)
   stay tabular so they don't jitter — addendum ter D's own carve-out.
3. **Mono.** Only for opaque identifiers (réf, matricule). Numbers that carry
   magnitude stay in Inter + `tabular-nums`. Mono runs visually large/wide, so
   13 px mono inside 14 px cells is optically correct (Butterick: judge by eye).
4. **Line-height.** Single-line nowrap cells centered in a fixed 44 px row make
   cell line-height nearly moot; 1.4 on 14 px is inside both Butterick's
   120–145% and the ter-D "cells 1.3–1.4" band. Heads at lh 1.4/12 px fine.
5. **Letter-spacing.** None on sentence-case 12 px heads (Butterick: extra
   tracking is for caps; 12 px = 9 pt is his lowercase floor, not below it).
   The one candidate is the 11 px chip text (≈ 8.25 pt, *below* the floor):
   Butterick + Schöndorfer both say small functional text takes medium weight
   (already 500) + a whisper of tracking.
6. **Alignment.** Text left; magnitudes right with matching heads. This page
   has **no magnitude column**: réf/matricule are identifiers (left), dates are
   fixed-width `dd/MM/yyyy` labels, not magnitudes → left-align is correct and
   consistent with Rutter ("align table text as you would anywhere else").
   Decimal alignment only matters where decimals vary (montants pages;
   two-decimal MAD + tabular figures makes right-align sufficient — Rutter's
   `text-align: "." center` has no browser support anyway **[training
   knowledge]**).
7. **Column widths.** Size to content, let the browser lay out; cap the two
   free-text columns (names, companies) with ellipsis + `title` so one long
   value can't inflate its column and push the rest into overflow (Rutter +
   SAP: truncate long text, never identifiers/numbers — our identifiers are
   short and safe).
8. **Whitespace/density.** 44 px rows ≈ Pencil & Paper "condensed 40 / regular
   48" midpoint; 12–15 rows per screen = the comfortable norm; the existing
   36 px compact mode matches "dense 32–36". Nothing to change structurally.
9. **French.** Insécable before « : », inside « … », between digit groups,
   between number and symbol/unit; symbol/code after the amount; comma
   decimals. In JSX these must be literal ` `/`&nbsp;` — a normal space
   before a colon at a line edge is a wrapping bug waiting to happen (the
   empty-state description and chip labels DO wrap).

---

## 3. Cell-by-cell audit of the Consultation page

| Element | Current | Verdict vs theory |
|---|---|---|
| Column heads | `t-label` 12/400 ink-3, sentence case, lh 1.4, `h-11 px-3`, nowrap, left | ✔ Correct (labels secondary — Refactoring UI via ter B; heads match data alignment — Rutter). No tracking needed (sentence case, ≥ 9 pt). |
| Réf. expert (sticky) | `t-mono font-semibold` 13 px, `min-w-[9rem]`, sticky + edge shadow | ✔ The row's one bold cell (ter A emphasis budget); mono is right for an opaque ref; 13 px optically matches 14 px Inter. Note: Windows fallback Consolas has no true 600 — the browser synthesises bold; acceptable, flagged. |
| Assuré | 14/500 (`font-medium`) full ink, nowrap, unbounded width | ✘ Two issues: (a) third emphasised cell — ter A budget is "2 cells per row (identifier + status)… everything else one step down"; (b) no width cap: one long name widens the column for all rows (Rutter: size to content ≠ let outliers rule; SAP: one line + ellipsis + full value on hover). |
| Compagnie / Nature / Type | 14/400 full ink, nowrap, unbounded | ✔ ink (addendum: values full ink) · ✘ Compagnie unbounded (company names are long: « AXA Assurance Maroc », « Wafa Assurance… ») — same truncation cap as Assuré. Nature/Type are short closed vocabularies — leave unbounded. |
| Statut | `StatusChip` 11/500 pill, label always | ✔ Chip is the second emphasised cell. 11 px is below Butterick's 9 pt lowercase floor → merits `letter-spacing: 0.01em` (his 5–12% rule is for caps; for small lowercase he prescribes "maintaining letter distinction" — a small positive tracking, echoed by Schöndorfer's functional-text advice). |
| Matricule | `t-mono` 13/400 | ✔ Identifier → mono, not bold (only 2 emphasised cells). Plates are stored unnormalized; mono + tabular keeps mixed formats scannable. |
| Date de requête | 14/400, `dd/MM/yyyy`, tabular, left | ✔ Fixed-width date = label, not magnitude → left, header matches. `dd/MM/yyyy` digits never wrap (no spaces). |
| Empty cell | « — » `text-ink-4` | ⚠ Spec conflict: element-specs §10 says ink-3, `table.tsx` ships ink-4 citing §10. Quieter (ink-4) is more consistent with "a non-value should not compete" but the written spec says ink-3 — needs one ruling, then align code+spec. |
| Rows | 44 px, hairlines, hover surface-2, no zebra | ✔ Matches Rutter (no zebra, minimal rules), P&P (1 px light lines; 40/48 band), Chaparro (density is fine; comfort ≠ performance). |
| Cell padding | `px-3` (12 px) / fixed `h-11` | ✔ Horizontal ≥ 2× effective vertical inset (Hobday squish). ⚠ element-specs §3 *text* says "16 px cell padding" while table.tsx ships 12 px — doc/code drift, pick one number in the spec. |
| Caption | `t-caption tabular-nums`, counts semibold ink, 12 px below table | ✔ tabular on the live count is ter D's live-figure carve-out (count re-renders as you type — proportional would jitter). ✘ « Total : » uses a breakable space before the colon; number and « dossiers » can separate at a wrap. |
| « Afficher plus (N restants) » | outline sm button | ✔ pattern per ter A. ✘ `(N restants)` breakable between figure and word. |
| Empty-state copy | « Aucun résultat pour la recherche « X », … » | ✘ Guillemets use ordinary spaces → a wrap can strand « or » at a line edge (this copy DOES wrap since it lists several filters). OQLF: insécable after « and before ». Also nested guillemets when the search term is quoted inside the sentence — acceptable here since the outer ones are the only pair per fragment. |
| FilterChip labels | `Nature : X`, `Du : 01/09/2026` | ✘ Breakable space before « : » (OQLF: insécable). Chips are nowrap so it's latent, but the string is built in the page and reused — fix at the source. |
| Toolbar spacing | groups 12 px inside, sections 32 px | ✔ 4/8 system (Hobday "mathematically related"); outer ≥ inner respected. |

---

## 4. Recommendations (see final message for the numbered, tagged list)

Summary of derived fixes: truncation caps on the two free-text columns
(`max-w-[16rem]`/`[14rem]` + block truncate + `title`), drop `font-medium` from
Assuré, insécables (« : », « … », figure–noun), +0.01em tracking on 11 px Badge
text, resolve the ink-3/ink-4 EmptyCell spec conflict, fix the §3 "16 px"
doc/code drift, and (owner-gated) column order for Statut, density toggle
exposure, and 12 px Badge text.

---

## 5. Fetch log (honesty section)

Fetched successfully: practicaltypography.com ×4 (alternate-figures,
point-size, letterspacing, line-spacing) · alistapart.com Rutter tables ·
pimpmytype.com ×2 (font-size, line-length-line-height) · learnui.design font
sizes · OQLF ×2 (contextes-espace-insécable, sommes-d'argent) ·
pencilandpaper.io enterprise tables · darkhorsevisualization.com clear-off-
the-table · anthonyhobday.com saferules · researchinuserexperience.wordpress.com
(Chaparro 2004) · stephaniewalter.design tables hub. Plus 6 WebSearch result
sets (OQLF pages, money format, density roundup, truncation roundup, Lin-2004
debunk, spacing systems).

Could NOT fetch (attempted): uxdesign.cc/Andrew Coyle "Design Better Data
Tables" (403 — Medium blocks the fetcher; cited only via P&P/search echoes) ·
uxmovement.com right-align article (404) · nngroup.com/articles/whitespace/
(404 — guessed URL; NN/g whitespace claims here rest on the Chaparro study
fetched directly) · pimpmytype.com/letter-spacing/ and /line-height/ (404 —
wrong guesses; the real line-height content came from /line-length-line-height/)
· Reddit (www and old.reddit both blocked by the fetcher — no fallback worked)
· OQLF espacement overview page (404 on the deep URL; rules recovered from the
fetched insécable-contexts page + search summaries of the deux-points page).

Not attempted / training-knowledge flags: Tim Brown (flexible typesetting) and
iA blog — not fetched, nothing above rests on them · Refactoring UI — book,
secondhand (already flagged in element-specs) · Few *Show Me the Numbers* ch. 8
— book, pointed to by Darkhorse · browser non-support of `text-align: "." "`
decimal alignment — training knowledge · `Intl.NumberFormat('fr-MA')` exact
output — training knowledge, verify at runtime · Consolas faux-bold at 600 —
training knowledge.
