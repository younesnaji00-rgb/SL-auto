# Typography, Spacing & Information Density — Missions terrain (/assignations-atg)

Research date: 2026-09-03. All "Findings" cite pages actually fetched this session (WebFetch; one via r.jina.ai proxy, marked). Training-knowledge claims are flagged inline as [TK].

## Findings

### F1. Tabular figures exist for exactly one job: vertical columns of numbers
- **Source:** Matthew Butterick, Practical Typography — https://practicaltypography.com/alternate-figures.html
- "Tabular figures are essential for one purpose: vertically aligned columns, like you find in grids of numbers." Proportional figures are better for running text ("more even spacing and a more consistent appearance"). Oldstyle figures belong in lowercase body text, never with caps — relevant because plates/refs are caps+digits, so lining figures are the only correct choice there.

### F2. Butterick's line-spacing window: 120–145% of point size
- **Source:** Practical Typography — https://practicaltypography.com/line-spacing.html
- "For most text, the optimal line spacing is between 120% and 145% of the point size." 110% is "too tight", 135% "looks fine", 170% "too loose". Applies to multi-line text (mobile cards, wrapped addresses); a single-line table row's rhythm is set by padding, not line-height.

### F3. Concrete density ladder: 40 / 48 / 56 px rows, and density as user control
- **Source:** Pencil & Paper, "UX Pattern Analysis: Enterprise Data Tables" — https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
- Condensed **40px**, Regular **48px**, Relaxed **56px**. "Letting users adjust the density of the table is another powerful way to give them control." Desktop tolerates relaxed; small screens want compact to maximize visible rows.
- Alignment: "Everything that's made up of letters should be left-aligned"; numbers right-aligned for comparison, **but qualitative numbers (dates, postal codes, phone numbers) can flex to left-alignment** — only quantitative amounts must be right-aligned. Headers "always align according to their column content".
- "It is highly recommended to use a monospace font for numerical values" (comparison job); avoid repeating category words in cells — put them in the header once.
- Sticky first column: "Having the leftmost column 'sticky' is just as important as the fixed header is for the regular vertical scroll."
- Vertical alignment in cells: center for rows up to ~3 lines, top beyond that; never bottom.

### F4. Density is a persisted user setting, not a guess
- **Source:** Setproduct, "Data table UI design reference guide for 2026" — https://www.setproduct.com/blog/data-table-ui-design
- "Ship density as a user setting and persist the choice. The 'right' row height is the one each user picked, not the one you guessed." Three modes: Compact (power users, max rows), Comfortable (balanced default), Spacious (touch-first). References MD3's 48dp touch target and WCAG 2.2's 24×24px minimum but refuses to prescribe pixel values.
- Truncation: "The safe default is a single line with an ellipsis, paired with a tooltip." Column widths: fix predictable columns (status, dates, actions), let text-heavy columns flex, with min-widths.

### F5. Ström: tabular lining figures or monospace fallback; zebra striping is "really, really bad"
- **Source:** Matt Ström-Awn, "Design better data tables" — https://mattstromawn.com/writing/tables/
- "Tabular figures … are all identically-sized, so that columns of numbers line up properly." If the typeface lacks them, monospace is the sanctioned fallback (FiveThirtyEight's Decima Mono cited as a density-optimized numeric face).
- Right-align numbers because "we compare numbers by first looking at their ones digit"; left-align text; **never center-align** (ragged edges impede scanning).
- Gridlines: use sparingly — good alignment makes them redundant. Zebra striping: "really, really bad". Keep tables monochromatic; color misleads. Units once per column, not per cell. Long header labels waste space.

### F6. Rutter (A List Apart): tables are catalogues to be interrogated, not pictures
- **Source:** Richard Rutter, "Web Typography: Designing Tables to be Read, Not Looked At" — https://alistapart.com/article/web-typography-tables/
- "Tables are not pictures of data: they are catalogues of data to be perused, parsed, referenced and interrogated." CSS: `font-variant-numeric: lining-nums tabular-nums;`.
- Prefer padding and whitespace over rules and zebra stripes (he suggests reduced top padding); cites Tufte's data-ink ratio directly. Small screens: `overflow-x` scroll wrapper is legitimate; simple tables may linearize into lists via media queries — which validates the card/definition-list mobile pattern.
- "Tables can be beautiful but they are not works of art. Instead of painting and decorating them, design tables for your reader."

### F7. Darkhorse "Clear off the table": remove-to-improve
- **Source:** https://darkhorsevisualization.com/blog/clear-off-the-table (redirect target of the classic darkhorseanalytics URL)
- "Too often when we create a data table, we imprison our data behind a wall of grid lines." Remove gridlines, fills, excess bolding; "let the data itself form the structure that aids readability by making better use of alignment and whitespace." "Rather than dressing up our data we should be stripping it down."

### F8. Data-ink ratio — and the honest critique of it
- **Source:** InfoVis Wiki, "Data-Ink Ratio" — https://infovis-wiki.net/wiki/Data-Ink_Ratio
- Tufte 1983: data-ink is "the non-erasable core of a graphic"; erase non-data-ink "wherever possible", ratio toward 1.0 "without sacrificing necessary communication".
- **Critique:** Inbar et al. 2007 (n=87) found most users *preferred* the fuller design over the minimalist one, and stripping reference elements lost visual anchors. So de-emphasize secondary ink, but don't delete structure people navigate by — repeated company names and reference chrome have anchoring value.

### F9. Refactoring UI: hierarchy via color/weight, not size; borders last
- **Source:** "7 Practical Tips for Cheating at Design" (Wathan/Schoger) — https://medium.com/refactoring-ui/7-practical-tips-for-cheating-at-design-40c736799886 (fetched via r.jina.ai proxy)
- "Try using color or font weight to do the same job" as size: 2–3 text colors (dark primary, grey secondary, lighter grey tertiary), only 2 font weights. Too many borders "make your design feel busy and cluttered" — prefer whitespace, background shifts, or subtle shadows for separation.

### F10. Refactoring UI: labels are a last resort
- **Source:** https://refactoringui.com/previews/labels-are-a-last-resort
- label:value format "makes it difficult to present the data with any sort of hierarchy; every piece of data is given equal emphasis."
- Self-evident formats need no label: "email addresses, phone numbers, and prices are self-evident."
- Combine label into value where possible ("In stock: 12" → "12 left in stock").
- When labels ARE needed (scannable collections/dashboards): "make it smaller, reducing the contrast, using a lighter font weight, or some combination." Exception: on spec-sheet-like pages where users hunt for the label keyword, emphasize the label and lighten the value instead.

### F11. Tabular figures are not automatically better — context check
- **Source:** Pimp my Type, "Improving the Typography of the iOS clock" — https://pimpmytype.com/ios-clock/
- Tabular figures stop numbers from "jumping and bouncing around" in live displays and belong in "columns of numbers, such as tables, price lists and listings" — but in SF the tabular '1' produced awkward gaps; the author concludes for the clock: "I would prefer the original design." Lesson: check how Inter's tabular '1' renders in your date column rather than assuming tnum is free. [TK: Inter's tabular figures are well-drawn; still verify visually.]

### F12. Relative vs absolute time: absolute wins in operational lists; ~7-day relative window
- **Source:** Mikael Cedergren, "Relative vs absolute time" — https://mikaelcedergren.substack.com/p/relative-vs-absolute-time
- "For some, relative time that forces mental math is more than a nuisance. It's a barrier." Seven-day cutoff for relative; month names over numeric dates ("Two people see the same numbers, both feel confident, both cannot be right"). Crucially: "In detail-heavy contexts—logs, audit trails, security records—there's no gray area. Absolute wins." Relative works only very near now ("3h ago" needs no work).

### F13. Truncation mechanics: ≥4 visible characters, tooltip always, never truncate headers
- **Source:** PatternFly Truncate design guidelines — https://www.patternfly.org/components/truncate/design-guidelines/
- Truncate only when "at least 4 non-truncated characters" remain visible; "Truncated items should always include a tooltip on hover, showcasing the full string sequence." End-truncation is default; middle-truncation when both ends matter (URLs, long identifiers). "Avoid truncating navigation items or table headings."

### F14. 8pt grid on the web: 4pt escape hatch, pixels over em-math
- **Source:** Elliot Dahl, "8-Point Grid: Typography On The Web" — https://www.freecodecamp.org/news/8-point-grid-typography-on-the-web-be5dc97db6bc/
- Strict 8px line-height steps are "too far apart for some text sizes" — allow 4px increments for type while keeping component spacing on 8s. Use pixel thinking, not "1.4285714286em" ("most folks can't do that kind of math in their head"). Apply the hard grid to structured components (tables, cards); reserve modular-scale freedom for long-form content.

## Could not fetch
- **Medium originals blocked (403):** matthewstrom.com Medium mirror, tomaszs2.medium.com "Stop using relative date and time" (argument recovered only via search snippets — treated as secondary), coyleandrew.medium.com "Design Better Data Tables" (not fetched at all).
- **uxbooth.com/articles/designing-user-friendly-data-tables/** — redirect loop (>10 redirects).
- **Erik Kennedy / learnui.design** — no specific data-table article surfaced in search; nothing cited from him.
- **book.webtypography.net "Numerals and tables" PDF** — not fetched (Rutter's ALA article covers the same author's guidance).
- **Refactoring UI (book)** — full text not fetchable; the two fetched excerpts (F9 preview via proxy, F10 official preview page) are the citable parts.
- **iA / Oliver Reichenstein** — not fetched this session; excluded from findings.

## Implications for Missions terrain

1. **Keep 44px rows as the default — but they're a "Regular-minus", so earn them.** 44px sits between Pencil & Paper's Condensed 40 and Regular 48 (F3) and clears WCAG 2.2's 24px target floor (F4). 44 = 4-multiple, legitimate under Dahl's 4px escape hatch (F14). Rows at 44px *earn* their height only if the freed space does hierarchy work: no gridline walls, whitespace as the row separator (F6, F7). If a hairline row rule is kept, make it the lightest ink in the ladder — separation should come primarily from padding (F9).
2. **Add a density toggle (Compact ≈ 36–40px / Regular 44px), persisted per user.** Both practitioner guides that address density say the same thing: ship it as a remembered user setting, don't guess (F3, F4). Dispatchers triaging 30 missions in "En retard" are exactly Setproduct's "power users, maximum rows" persona. Option A: two modes only (compact/regular) to protect the locked system; Option B: three modes 40/48/56 verbatim from F3. Recommend A — 56px "Spacious" buys nothing on a desktop dispatch screen.
3. **Cell type: keep ~14px/1 line desktop; only multiline content needs the 120–145% rule.** Single-line rows: vertical centering, rhythm from padding (F2 scope note, F3 center-align ≤3 lines). Mobile card values that can wrap (address): line-height ~1.35–1.4 (F2).
4. **Dossier ref + Immatriculation: monospace confirmed, caps + lining figures.** Monospace is the practitioner-sanctioned tool for identifier columns (F3, F5). Never oldstyle figures next to caps (F1). Both columns should be fixed-width (F4) — mono makes width predictable; size them to the longest legal format so they never truncate.
5. **Date RDV: `font-variant-numeric: tabular-nums lining-nums` on Inter (F6), semibold as the row's second anchor — correct per F9 (weight, not size, carries hierarchy).** Verify Inter's tabular '1' spacing visually before shipping (F11). Alignment: dates are qualitative numbers — left-align is permitted and preferred here since nobody sums them (F3); keep one consistent choice across all three groups.
6. **Kill the redundant date ink inside groups.** The groups already say Aujourd'hui / En retard / À venir. Inside "Aujourd'hui", "3 sept. 2026 14:30" repeats what the group header established — Tufte-school redundant ink (F7, F8). Option A (recommended): in Aujourd'hui show **HH:mm only** (large, semibold, tabular) with the deadline chip; full "d MMM HH:mm" in En retard and À venir. Option B: keep full dates everywhere for uniform scan columns — defensible via the Inbar critique (F8: users like reference structure). This is a real choice; A saves the most attention, B is safer if rows get re-sorted across groups.
7. **Absolute over relative dates — your current format is right.** A dispatch list is Cedergren's "detail-heavy context … absolute wins" (F12). "d MMM" with month name (not numeric) is exactly his anti-ambiguity advice. Do NOT convert Créé le to "il y a 3 j"; if any relative flavor is wanted, the group headers (Aujourd'hui/En retard) already provide it — that's the hybrid.
8. **Adresse: single-line ellipsis + tooltip (hover AND focus), min-width, flex column.** The consensus default (F4, F13). Guarantee ≥4 visible characters — practically, min-width ~160px (F13). Adresse is the designated flex column; every other column fixed (F4). No two-line clamp on desktop (multi-line rows destroy scan rhythm — F3's ≤3-line center rule is for unavoidable wrapping, not a target). On mobile cards, let address wrap fully — cards have no rhythm to protect.
9. **Assuré names: prefer no truncation.** Names are shorter and identity-critical; give the column width for ~24 chars and let the rare monster name ellipsize with tooltip. Never truncate the column headers themselves (F13).
10. **Créé le / Créé par / Assigné par: de-emphasize with ink, not size.** These are audit metadata, tertiary in a dispatch scan. Apply F9/F10: same 13–14px, grey step-3 of the ink ladder, regular weight, tabular-nums on Créé le. Option: collapse "Créé par (role)" and "Assigné par" into one "Par" column showing assigner primary + creator as tooltip/secondary line — F3's "avoid duplication" and F5's header-space economy support it; keep separate if audits require both at a glance.
11. **Compagnie repeats: dim, don't delete.** Pure Tufte says repeated values are redundant ink (F7), but Inbar 2007 (F8) warns stripped anchors hurt real users — and rows get sorted/scanned independently. Keep the name in every row at secondary grey; do not blank repeats.
12. **Téléphone: tabular-nums, grouped Moroccan format, no label on mobile.** Phone numbers are self-evident (F10) — the format is the label. As a teal link it's already differentiated; tabular figures stop digit jitter and keep the column steady (F1, F5). Left-align (qualitative number, F3).
13. **No zebra striping, no full grid.** Ström calls zebra "really, really bad" (F5); Rutter and Darkhorse both replace rules with alignment + whitespace (F6, F7). If group tables currently zebra, remove it; the cream canvas + row padding is the separator.
14. **Mobile definition list: current 12px-quiet-label-over-semibold-value is textbook (F10) — now prune the labels.** Drop labels entirely for: phone (self-evident), plate (mono + format is the label), assuré name (card title). Combine label into value where it reads naturally: "RDV aujourd'hui 14:30", "Assignée par Karim". Keep quiet labels only where the value is ambiguous alone (Zone vs Adresse, Compagnie vs Agent). Ratio per F9/F10: label = smaller AND lighter-contrast AND regular weight (all three de-emphasis levers), value semibold ink-1 — which matches the locked system; just ensure the label grey is 2 ladder steps below the value, not 1.
15. **Spacing rhythm: keep 8-multiples between structures, 4-multiples inside them.** Group-to-group gap 32px, group header to table 16px, card padding 24 (already locked) — all on-grid (F14). Cell horizontal padding 12 or 16px; 12 in compact mode. Don't chase a strict baseline grid inside the table — Dahl concedes it's impractical on the web; padding-driven rhythm is the working substitute (F14, F6).
