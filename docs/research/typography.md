# Typography & Spacing for Dense Application UI — Research Report

Date: 2026-09-02. Researcher: UX research subagent (Fable 5).
Target context: Inter body + Outfit display (titles only, never numbers); t-display 30/700; labels 12/400 sentence case; values 14/600; tables 44px rows; card padding 24, tile 16.
Method: WebFetch (direct + r.jina.ai fallback) + WebSearch. 20 sources fetched successfully; failures listed at the end.

---

## PART A — Per-source log

### S1. Butterick's Practical Typography — Summary of key rules
- URL: https://practicaltypography.com/summary-of-key-rules.html — FETCHED ✔
- Quotes:
  - "Point size should be 10–12 points in printed documents, 15–25 pixels on the web." (Note: Butterick writes for *reading text*, not data UI.)
  - "Line spacing should be 120–145% of the point size."
  - "The average line length should be 45–90 characters (including spaces)."
  - "All caps are fine for less than one line of text."
  - "Use 5–12% extra letterspacing with all caps and small caps."
  - "Use... 4–10 points of space between paragraphs."

### S2. Butterick — Letterspacing
- URL: https://practicaltypography.com/letterspacing.html — FETCHED ✔
- Quotes:
  - "Lowercase letters don't ordinarily need letterspacing."
  - "You always add 5–12% extra letterspacing to text in all caps or small caps."
- Rationale: lowercase is designed to fit; caps set together look too tight.

### S3. Spencer Mortensen — The typographic scale
- URL: https://spencermortensen.com/articles/typographic-scale/ — FETCHED ✔
- The classical scale (Bringhurst) is a geometric scale: formula f_i = f0 · r^(i/n), classic values r = 2 (ratio doubles per interval), n = 5 notes per interval, f0 = pica (12pt) / 1em on web.
- Historic scale is itself imperfect/hand-tuned: "The 11 pt size doesn't belong in the scale"; "The 30 pt font size is midway between two notes, 28 pt and 32 pt"; 42pt is missing though mathematically required.
- Implication: even the canonical scale tolerates hand-tuned deviations (30px display is literally the classic "semitone off" size — centuries of use anyway).

### S4. Fonts.com Fontology (now MyFonts) — Proportional vs Tabular Figures
- URL: https://www.myfonts.com/pages/fontscom-learning-fontology-level-3-numbers-proportional-vs-tabular-figures — FETCHED ✔ (original fonts.com URL 301'd here)
- Proportional figures: "when numerals are going to be read in text", e.g. "address information in a corporate identity, or quantities and measurements".
- Tabular figures: "when numerals will be read in columns" like a "financial report or other columns of statistics".
- "It is adviseable to avoid using tabular figures when proportional figures are what's called for" — kerning tabular figures manually is tedious; kerning proportional into tabular is nearly impossible. "Choose your figure styles carefully and with purpose."

### S5. IxDF — The Power of White Space
- URL: https://ixdf.org/literature/article/the-power-of-white-space — FETCHED ✔ (redirect from interaction-design.org)
- Micro white space: "the small space between design elements. You can find it between lines and paragraphs."
- Macro white space: "the large space between major layout elements, and the space surrounding the design layout."
- "Marginal white space surrounding paragraphs affects the user's reading speed and comprehension."
- Google homepage example: "Because there's no clutter, there's less work for your eyes and mind."
- No concrete ratios given.

### S6. Refactoring UI (Wathan/Schoger) — 7 Practical Tips for Cheating at Design
- URL: https://medium.com/refactoring-ui/7-practical-tips-for-cheating-at-design-40c736799886 — direct 403; FETCHED ✔ via r.jina.ai
- Weight system: "A normal font weight (400 or 500 depending on the font) for most text"; "A heavier font weight (600 or 700) for text you want to emphasize".
- "Stay away from font weights under 400 for UI work; they can work for large headings but are too hard to read at smaller sizes."
- Hierarchy without size: "try using color or font weight to do the same job."
- Color hierarchy: "A dark (but not black) color for primary content", "A grey for secondary content", "A lighter grey for ancillary content".
- De-emphasize with lighter *color*, not lighter *weight*.

### S7. Refactoring UI — Labels are a last resort (book preview)
- URL: https://refactoringui.com/previews/labels-are-a-last-resort — FETCHED ✔
- "You might not need a label at all" when "you can tell what a piece of data is just by looking at the format."
- "Combine labels and values into a single unit" — "12 left in stock" not "In stock: 12".
- "The data itself is what matters, the label is just there for clarity." De-emphasize labels: smaller, lower contrast, lighter weight (or combination).
- Labels ARE needed "when you're displaying multiple pieces of similar data and they need to be easily scannable, like on a dashboard" — but treat as supporting content.
- KEY NUANCE: on "information-dense pages, like the technical specifications of a product," when users hunt BY LABEL, "it might make sense to emphasize the label instead of the data." (Directly relevant to dossier detail tabs where a gestionnaire scans for a specific field.)

### S8. Elliot Dahl — Intro to the 8-Point Grid System
- URL: https://medium.com/built-to-adapt/intro-to-the-8-point-grid-system-d2573cde8632 — direct blocked; FETCHED ✔ via r.jina.ai (freecodecamp mirror 404'd)
- "The majority of popular screen sizes are divisible by 8 which makes for an easy fit."
- 8 "offers a good amount of options without overloading you with variables like a 6 point system, or limiting you like a 10 point system."
- "Scaling 5px by 1.5x will result in a half pixel offset" — odd values blur on 1.5x DPI screens.
- "Use increments of 8 to size and space out the elements on a page."
- Benefits: designer "efficiency, less decisions... quality rhythm"; team communication; "no blurry half-pixel offsets".

### S9. Nathan Curtis — Space in Design Systems (EightShapes)
- URL: https://medium.com/eightshapes-llc/space-in-design-systems-188bcbae0d62 — FETCHED ✔ via r.jina.ai
- Six spatial concepts: Inset ("indents content on all four sides like the matte of the framed photo"), Squish Inset (vertical −50%, "common in buttons and table cells"), Stretch Inset, Stack (vertical rhythm — "overwhelming majority" of layouts), Inline, Grid.
- Scale: geometric 2, 4, 8, 16, 32, 64 — argues against linear scales: "either result is unpredictably used, offering too many choices."
- "Name space options simply, using a scale like t-shirt sizes."
- Squish inset legitimizes table cells with less vertical than horizontal padding.

### S10. Anthony Hobday — Visual design rules you can safely follow
- URL: https://anthonyhobday.com/sideprojects/saferules/ — FETCHED ✔
- "Make outer padding the same or more than inner padding" (container's outer margin ≥ its internal gaps — contained elements relate more to each other than to the outside).
- "Spacing should go between points of high contrast" — measure from text edge, not bounding box.
- "Measurements should be mathematically related."
- "Lower letter spacing and line height with larger text. Raise them with smaller text."
- "Keep body text at 16px or above" (reading text — see tension note in Part B, Q1).
- "Use a line length around 70 characters" (60–80).
- "Make horizontal padding twice the vertical padding in buttons."
- "Use two typefaces at most."
- "Everything should be aligned with something else."
- "Optical alignment is often better than mathematical alignment."

### S11. UX Movement — All-caps hard for users to read
- URL: https://uxmovement.com/content/all-caps-hard-for-users-to-read/ — FETCHED ✔
- "Text in all caps reduces the shape contrast for each word." "The shape of any word in all caps... is a rectangle."
- Mixed case: "multiple adjacent edges at the top and bottom, giving the words high shape contrast"; "high shape contrast makes words easier for users to recognize."
- "All caps are fine in contexts that don't involve much reading, such as logos, headings, acronyms, and abbreviations."
- "The caps lock key is a key that designers should rarely use."
- (Caveat from training knowledge, flagged: bouma/word-shape theory is contested in reading science — Kevin Larson's "The Science of Word Recognition" argues letter-wise recognition; but the empirical slowdown of sustained all-caps reading is not disputed, and the practical rule stands.)

### S12. Pencil & Paper — UX pattern analysis: enterprise data tables
- URL: https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables — FETCHED ✔
- Row heights: "Condensed: 40px, Regular: 48px, Relaxed: 56px"; let users "adjust the density of the table."
- "Right-align numeric columns"; general rule "all numbers should always be right-aligned" (qualitative numerals — dates, postal codes, phone — may left-align).
- "Use a monospace font for numerical values" to avoid "$1,111.11" reading smaller than "$999.99" (tabular figures achieve the same — see S13/S15).
- "Left-align text columns"; "Match heading alignment to column"; center alignment "prevents quick scanning."
- Multi-line cells: vertical-center up to ~3 lines ("spreads out the white space"); top-align beyond 3–4 lines, else content is "hidden away" and scrolling gets "jerky."

### S13. A List Apart — Richard Rutter, Web Typography: Designing Tables to be Read, Not Looked At
- URL: https://alistapart.com/article/web-typography-tables/ — FETCHED ✔
- Tabular lining numerals: "all the digits should occupy exactly the same width"; CSS `font-variant-numeric: lining-nums tabular-nums;`
- Decimal alignment for mixed-precision numbers "enable[s] your reader to more readily compare magnitudes."
- "Right-align numbers to help your reader make easier comparisons of magnitude when scanning down columns."
- Cell padding with "smaller amount of padding to the top"; demonstrates `line-height: 1;` in tables — "line lengths are often very short in tables."
- "Avoid zebra striping, tints and fills, and any other backgrounds"; "avoid any border or frame surrounding the table"; use spacing/alignment instead.
- "Left-align text" and match headers to their column's alignment.

### S14. Caro Appleby — Tabular Numbers are a thing!
- URL: https://www.caro.fyi/articles/tabular-nums/ — FETCHED ✔
- "All the number characters have the same width... like in a monospace font."
- Use for tables, "displaying dates and times one on top of the other all aligned", "displaying a timer with changing numbers, so the width of the displayed time remains fixed."
- `font-variant-numeric: tabular-nums` (needs `tnum` OpenType table; Tailwind class `tabular-nums`). Verify a font actually has tnum (Wakamaifondue).
- Avoids "the mental and bandwidth overhead of adding another font into sites" just for aligned numbers.

### S15. DEV/practitioner consensus via search (dev.to Alan West; loke.dev; theosoti.com; kombai)
- URLs: https://dev.to/alanwest/tabular-numbers-in-css-font-variant-numeric-vs-monospace-hacks-25cn ; https://loke.dev/blog/css-font-variant-numeric-tabular-nums — SEARCH RESULT SUMMARIES (not individually fetched; quotes are from search snippets)
- "Tables/Grids: Always tabular-nums. Timers/Stopwatches: Always tabular-nums." Live-updating numbers without tnum cause "the jitter."
- "Monospace is necessary for code but overkill for numeric data; tabular numerals in a proportional font give aligned columns with better readability than monospace."
- "For body copy, proportional digits usually look better."
- System-wide consistency: "if tabular-nums is chosen for a data-heavy dashboard, all numerical elements should follow the same rule."

### S16. Erik Kennedy (Learn UI Design) — Font size guidelines for responsive websites & apps
- URL: https://learnui.design/blog/mobile-desktop-website-font-size-guidelines.html — FETCHED ✔
- Desktop interaction-heavy designs: "your main font size will be 14–20px". Text-heavy: "18–24px".
- Secondary text: "a size a couple notches smaller – such as 13px or 14px".
- "About 4 font sizes total" even in complex layouts: header, body, secondary, optional tertiary.
- Mobile hard rule: "Use a text input font size of at least 16px" (iOS auto-zoom).
- Interaction-heavy pages "optimize for information display efficiency with more compact sizing" vs reading pages.

### S17. Oliver Schöndorfer (Pimp my Type) — Line length & line height
- URL: https://pimpmytype.com/line-length-line-height/ — FETCHED ✔
- Body: 60–80 characters, line-height 1.5–1.6 (desktop), 1.3–1.45 (mobile). "If using a single value across devices, 1.5 is a reasonable compromise."
- Headings: line-height ≈ 1.1, "compact".
- UI components: 1.2–1.3 "for notifications and info text"; buttons may use line-height 1.
- Core principle: "Longer lines need more line height, shorter lines need less."

### S18. Matthew Ström(-Awn) — UI Density
- URL: https://mattstromawn.com/writing/ui-density/ — FETCHED ✔
- Four densities: visual, information (Tufte: "Every bit of ink on a graphic requires reason... that the ink presents new information"), design (gestalt ratio of necessary vs total design decisions), temporal (response time is density).
- "UI density is the value a user gets from the interface divided by the time and space the interface occupies."
- Density is not pixel-cramming: cut non-informative ink (rules, boxes, redundant labels) before cutting whitespace.
- NOTE: Ström's separate "typographic scale" essay could NOT be located (404 at guessed URLs; not on his writing index). His writing index fetched: https://mattstromawn.com/writing/ ✔.

### S19. Hacker News thread — "What UI density means and how to design for it" (discussion of S18)
- URL: https://news.ycombinator.com/item?id=40428386 — FETCHED ✔
- magicalhippo: "Our 'oldschool' Windows B2B application is quite UI dense... we've got information that can be viewed at a glance that other web-based systems use 6+ pages to contain."
- somat: "The professional tool is expected to be used for many hours... ideal design is whatever reduces the cycle load. The consumer tool... gently guides the user through an unfamiliar task."
- karaterobot: "Simple UIs are not a fad... The goal is as simple as possible, but no simpler."
- dgreensp: "Why have UIs gotten so sparse? It's like the entire web design world decided more whitespace is better."
- krsdcbl (accessibility counterweight): sparse/adaptable UIs help "people with minor motoric or visual impairments."
- Takeaway for a pro tool used all day (gestionnaires): density that reduces cycle load beats consumer-style sparseness — but through information density, not clutter.

### S20. OQLF (Banque de dépannage linguistique) — Écriture des sommes d'argent
- URL: https://vitrinelinguistique.oqlf.gouv.qc.ca/21584/la-typographie/nombres/ecriture-des-sommes-dargent — FETCHED ✔
- Symbol AFTER the number, space before it: "500 $" (never "$500").
- Decimal comma: "25,50 $".
- Compact financial notation: "12 k$", "12 M$", "12 G$"; "85 millions $" admitted for readability.

### S21. OQLF — Espacement avant et après les signes de ponctuation et les symboles
- URL: https://vitrinelinguistique.oqlf.gouv.qc.ca/22039/la-typographie/espacement/espacement-avant-et-apres-les-signes-de-ponctuation-et-les-symboles — FETCHED ✔
- Espace insécable BEFORE: colon (:), %, $, units (kg, °C), &, §.
- NO space before ; ? ! in Quebec usage: "The Office québécois de la langue française opts for the absence of space before the semicolon, exclamation point and question mark. This practice, which is widespread in usage, tends to become a convention." (Pragmatic: software handles fine spaces badly.)
- France usage differs: traditional French typography puts an espace fine before ; ? ! (flagged: France side is training knowledge + article's implication, not quoted from an Imprimerie nationale source).

### S22. Typewolf / TypePairs / Typematch — Outfit & Inter pairing (search results)
- URLs: https://www.typewolf.com/outfit ; https://www.typewolf.com/inter ; https://typepairs.com/pairs/outfit-inter — SEARCH SUMMARIES (Typewolf pages not individually fetched)
- Outfit: geometric sans by Rodrigo Fuenzalida, nine weights, no italics, Google Fonts; "clean, tightly-spaced geometric sans... popular for modern SaaS."
- Inter: designed by Rasmus Andersson "for use as a UI font on screens," nine weights + italics + variable.
- Pairing verdict: "harmonious, low-contrast match, with Outfit used for headings and Inter for body text, combining Outfit's geometric warmth with Inter's mechanical precision."
- FLAG (training knowledge): Outfit's figures are not designed for data work and the family has no guarantee of tabular figures (`tnum`); Inter ships full `tnum`/`case`/`ss0x` features. Verify with Wakamaifondue before ever letting Outfit near a number. The "Outfit never for numbers" rule in the target context is correct and should be kept.

### Search-only corroboration (not fetched, snippet-level)
- Major Second (1.125) scales "good for dense information UIs like dashboards" (medium/typography articles via search).
- "For table cells, font-size: 13px with line-height: 1.4 typically produces the best density-to-readability ratio... dashboard typography rarely exceeds 14px" (fontalternatives.com snippet).
- Dmitry Fadeyev via Smashing (quoted by Caktus Group snippet): whitespace between paragraphs and margins "increases comprehension by almost 20%" — SECONDHAND, original Smashing article not fetched; treat as directional, not precise.

---

## PART B — Synthesis by research question

### Q1. UI type scales
- A dense app needs ~4–5 sizes (Kennedy: "about 4 font sizes total"; Hobday: "measurements should be mathematically related"). The target 12 / 14 / 16(optional) / 20 / 30 is a hand-tuned near-Major-Second stack — appropriate; dashboards cluster at 13–14px body (S16, search corroboration).
- TENSION to acknowledge: Butterick (15–25px) and Hobday (16px+) mandate larger body — but both are writing about *reading text*. Kennedy explicitly splits interaction-heavy (14–20) from text-heavy (18–24). Rule: 14 for data UI chrome/values, but any multi-sentence prose (observations, comments, rapport text) should step up to 15–16.
- Modular-scale purism is not sacred: the 400-year-old classic scale itself contains a "wrong" 30pt note (Mortensen). Hand-tuning is the historical norm. 30px display is literally canon-by-usage.
- Weight and color are the primary in-level differentiators; size changes signal level changes (Refactoring UI). 600 for emphasis at 14px, 700 reserved for display sizes: Refactoring UI blesses "600 or 700"; choosing 600 at small sizes is a legibility refinement (FLAG: the 600-at-14px specific is practitioner convention + training knowledge — Inter's 700 fills counters at small sizes; no fetched source states it verbatim).
- Letter-spacing: never track lowercase (Butterick); inverse law — tighten large, loosen small (Hobday). So Outfit 30/700 can take ~−1% tracking; 12px labels ±0 to +1%. Caps (if ever) +5–12%.

### Q2. Numbers
- Tabular lining figures (`font-variant-numeric: tabular-nums`, Inter has tnum) for: table columns, timers/counters, any live-updating figure, vertically stacked dates/times (S13, S14, S15). Right-align numeric columns; align header with column (S12, S13). Decimal-align mixed precision (S13).
- Proportional figures for numbers inside sentences and standalone stat headlines where nothing aligns vertically (S4, S15) — with the caveat that a KPI row that refreshes should be tabular to avoid jitter (S15).
- Monospace: practitioners split — P&P says mono for numeric columns; dev.to argues tabular-nums in the UI font beats mono for numbers, mono for code-like tokens. Resolution: Inter+tnum for amounts; a mono (or Inter tnum + slight tracking) for opaque identifiers — dossier refs, plates, VINs, policy numbers — where character-by-character reading and lookalike disambiguation (0/O, 1/I) matter. FLAG: the 0/O rationale is training knowledge.
- Currency fr-CA (CAD): "1 234,56 $" — symbol after, non-breaking space before it, comma decimal, space (fine/insécable) thousands (S20, S21). Compact: "12 k$ / 12 M$" for dashboards (S20). MAD: same French-locale pattern "12 500,00 MAD" (or DH) with the code after a non-breaking space — FLAG: MAD-specific convention is training knowledge (Morocco follows French number formatting; fetched sources cover fr-CA only).

### Q3. Line-height & density
- Reading text 1.5 (1.45–1.6); UI strings/notifications 1.2–1.3; buttons 1.0; headings/display ~1.1 (S17). Tables: very short line lengths permit tight leading — Rutter demonstrates 1.0; 13–14px cells at ~1.3–1.4 are the practical dashboard consensus (S13 + search corroboration). Longer line = more leading, always (S17, S10).
- Multi-line row problem: vertically center cell content up to ~3 lines; top-align above that (S12). Better: prevent it — truncate + tooltip/expand, keep the 44px row. 44px sits between P&P's Condensed 40 and Regular 48 — legitimate; consider a density toggle for power users (S12, S19).

### Q4. Spacing systems
- 8pt grid for sizing and spacing; even numbers survive 1.5× DPI scaling (S8). Geometric, not linear, spacing menu: 2/4/8/16/24/32/64-ish — too many options = unpredictable use (S9). 4pt half-steps for icon/typography micro-fits (established practice; Dahl article as fetched didn't cover half-points — FLAG).
- Proximity math: fetched sources give the *inequality*, not a ratio — outer/between-group space ≥ inner/within-group space (S10 "make outer padding the same or more than inner padding"; IxDF micro vs macro). The popular "2× between vs within" ratio is convention — FLAG: training knowledge; no fetched source states 2×.
- Named spatial concepts beat raw numbers: inset, squish inset (table cells/buttons: vertical = ½ horizontal), stack, inline (S9). Hobday independently lands on the same button ratio: horizontal padding = 2× vertical.
- Card 24 / tile 16: consistent with the geometric menu and with "outer ≥ inner" as long as gaps *inside* a card ≤ 24 and gaps *between* cards ≥ the card's internal grouping gaps.
- Page rhythm: stack spacing between page sections should come from the upper end of the scale (32–64) so macro whitespace visibly outranks micro (S5, S9).
- Breaking the grid: measure space "between points of high contrast" — from glyph edge, not bounding box; "optical alignment is often better than mathematical alignment" (S10). Line-height boxes will collide with the spacing system; fix in CSS, don't abandon the system (S9).

### Q5. Label/value pairs
- Default: value dominates. De-emphasize label with smaller size + lower contrast + (optionally) lighter weight; emphasize value with weight and darker ink, not with a size explosion (S6, S7). Target 12/400 grey label over 14/600 ink value = double differentiation on size and weight plus color — matches the guidance exactly.
- Drop or merge labels where format self-identifies ("12 left in stock" pattern; a phone number or plate needs no label) (S7).
- COUNTER-RULE, evidence-backed: on spec-sheet-like dense detail views where the user scans BY LABEL to find a field (dossier detail tabs), Refactoring UI explicitly allows inverting — emphasize the label. Keep value-dominant as default but don't fight scannability on long field lists; alignment and grouping do the real work there.
- Sentence case, not all-caps, for labels: all-caps words are uniform rectangles with low shape contrast (S11); caps acceptable under one line (S1) and then require +5–12% tracking (S2). Sentence-case 12/400 labels are the right call; if a design ever uses caps micro-labels, they must be tracked and kept to 1–3 words.
- French specifics: espace insécable before : % $ and units in ALL French; Quebec drops the space before ; ! ? while France keeps a fine space (S21). fr-CA money "1 234,56 $" (S20). Use `&nbsp;`/` ` so values never wrap between number and unit. For the Moroccan product in fr-FR convention vs the Canadian demo in fr-CA, the two differ ONLY on ; ! ? spacing — colon, %, $, units behave the same.

---

## PART C — Could-not-fetch / honesty log
- https://matthewstrom.com/writing/typographic-scale/ and https://mattstromawn.com/writing/typographic-scale/ — 301 then 404. The hypothesized Ström "typographic scale" essay does not exist under that name; his writing index (fetched) shows no type-scale essay. His scale thinking appears in "Functions and the future of design systems" (modular scale as a discrete function; not deep-fetched) and "UI density" (fetched, S18).
- https://www.smashingmagazine.com/2018/05/guide-whitespace-web-design/ — 404 (guessed URL). Whitespace covered via IxDF (S5) + secondhand Fadeyev ~20% comprehension figure (flagged).
- https://www.freecodecamp.org/news/the-8-point-grid-system-in-sketch-e9f80d3f36b0/ — 404; recovered via Medium original through r.jina.ai (S8).
- https://pimpmytype.com/tabular-numbers/ — 404 (guessed URL); tabular figures covered by S4/S13/S14/S15 instead.
- https://vitrinelinguistique.oqlf.gouv.qc.ca/21583/... (espacement, first guess) — 404; correct page 22039 fetched (S21).
- Medium direct fetches (Refactoring UI tips, Elliot Dahl) — 403/404 direct; both recovered via r.jina.ai.
- Reddit: site:reddit.com search returned no usable threads (search engine returned non-reddit results). UI-typography-mistakes community input substituted with the HN density thread (S19), which was fetched with usernames and quotes.
- Typewolf Outfit/Inter pages, dev.to/loke.dev tabular-nums pieces, fontalternatives 13px/1.4 claim: search-snippet level only, not full-fetched (marked SEARCH SUMMARIES above).

## Training-knowledge flags (claims not backed by a fetched source)
1. 600-beats-700 at 14px in Inter (counter fill) — practitioner convention; fetched source only says "600 or 700 for emphasis".
2. The "2× between-group vs within-group" spacing ratio — fetched sources establish only ≥, not 2×.
3. Outfit lacking reliable tabular figures — verify with Wakamaifondue; the never-numbers rule is safe regardless.
4. France's espace fine before ; ! ? — implied by OQLF's contrast but not fetched from a France-side authority (Imprimerie nationale).
5. MAD formatting following French locale conventions — extrapolated from fr-CA sources.
6. Monospace for IDs justified by 0/O 1/I disambiguation — practitioner lore.
7. Word-shape (bouma) theory as the *mechanism* for all-caps slowness is contested in reading science (Larson); the practical all-caps rule holds either way.
8. 4pt half-steps for icons/type — established practice but the fetched Dahl article didn't cover it.
