# Dossiers Page — Color Semantics, Warm Canvas, Table Typography, Rhythm & Polish
## Deep-research addendum (deltas beyond color.md / typography.md / hierarchy.md)

Date: 2026-09-03. Researcher: UX research subagent (Fable 5).
Scope: usage rules ONLY, within the locked system (cream surface ladder, ink ladder, one muted teal `--primary`, terracotta = time markers only, glass = edge rims, hairlines, Outfit display-only, 12/400 sentence-case labels).
Ground truth checked in-repo: `src/lib/status-colors.ts` (15 canonical statuses → **5 tone families**: neutral/info/warning/success/danger; tinted pill = soft bg + deep fg + fg/30 hairline; 11px/500 pill) and `src/app/globals.css` (status pairs stated ≥4.5:1 in both themes).

This report does NOT repeat: 60-30-10, Few's rules 1–8, the ink-ladder hierarchy levers, tabular-nums basics, 8pt grid, proximity inequality — all covered in the three prior docs.

---

## Source log (every source, honest status)

| # | Source | URL | Status |
|---|--------|-----|--------|
| D1 | UX Movement, "Why You're Designing Table Status Badges Wrong" (Substack) | https://uxmovement.substack.com/p/why-youre-designing-table-status | PARTIAL-FETCHED — intro only, rest paywalled |
| D2 | UX Movement, "The Right Way to Design Table Status Badges" (Medium) | https://uxmovement.medium.com/the-right-way-to-design-table-status-badges-31f65a927dab | PARTIAL-FETCHED via r.jina.ai — problem framing + hierarchy/shape-contrast rules recovered; full solution section truncated |
| D3 | Lisa Charlotte Muth (Datawrapper), "A detailed guide to colors in data vis style guides" | https://www.datawrapper.de/blog/colors-for-data-vis-style-guides | FETCHED |
| D4 | Datawrapper, "Emphasize what you want readers to see with color" | https://www.datawrapper.de/blog/emphasize-with-color-in-data-visualizations | FETCHED |
| D5 | Muth, "When to use quantitative and when to use qualitative color scales" | https://www.datawrapper.de/blog/quantitative-vs-qualitative-color-scales/ | FETCHED (after 301) |
| D6 | Muth, "Which color scale to use when visualizing data" | https://www.datawrapper.de/blog/which-color-scale-to-use-in-data-vis/ | FETCHED |
| D7 | Maureen Stone, "Choosing Colors for Data Visualization" (b-eye-network, hosted at Perceptual Edge) | https://www.perceptualedge.com/articles/b-eye/choosing_colors.pdf | FETCHED via r.jina.ai |
| D8 | Setproduct, "Badge UI design: Notification, count, and status patterns" | https://www.setproduct.com/blog/badge-ui-design | FETCHED (upgrades color.md's snippet-only claim to fetched) |
| D9 | Smart Interface Design Patterns (Vitaly Friedman), "Badges vs. Pills vs. Chips vs. Tags" | https://smart-interface-design-patterns.com/articles/badges-chips-tags-pills/ | FETCHED |
| D10 | Setproduct, "Data table UI design reference guide" | https://www.setproduct.com/blog/data-table-ui-design | FETCHED |
| D11 | Josh W. Comeau, "Designing Beautiful Shadows in CSS" | https://www.joshwcomeau.com/css/designing-shadows/ | FETCHED |
| D12 | David Hall (UX Collective), "Design detail: Crafting better shadows for interaction" | https://uxdesign.cc/design-detail-crafting-better-shadows-for-interaction-b94796a29664 | FETCHED via r.jina.ai |
| D13 | Refactoring UI community skill summary (ZLStas/skills, faithful chapter digest) | https://raw.githubusercontent.com/ZLStas/skills/main/skills/refactoring-ui/SKILL.md | FETCHED — secondary summary, not the book itself |
| D14 | Mark Boulton, "Whitespace" (A List Apart, classic) | https://alistapart.com/article/whitespace/ | FETCHED |
| D15 | Emil Kowalski, "Great Animations" | https://emilkowal.ski/ui/great-animations | FETCHED |
| D16 | Emil Kowalski (animations.dev), "The Easing Blueprint" | https://animations.dev/learn/animation-theory/the-easing-blueprint | FETCHED |
| D17 | Rauno Freiberg, "Invisible Details of Interaction Design" | https://rauno.me/craft/interaction-design | FETCHED |
| D18 | UX Movement, "Absolute vs. Relative Timestamps: When to Use Which" | https://uxmovement.com/content/absolute-vs-relative-timestamps-when-to-use-which/ | FETCHED |
| D19 | Technically Product, "Relative versus absolute timestamps" | https://www.technicallyproduct.co.uk/usability/relative-versus-absolute-timestamps/ | FETCHED |
| D20 | Tom Smykowski, "Stop using relative date and time!" (Medium) | https://tomaszs2.medium.com/stop-using-relative-date-and-time-87c52ba816d3 | FETCHED via r.jina.ai |
| D21 | AWS Cloudscape, "Timestamps" pattern | https://cloudscape.design/patterns/general/timestamps/ | FETCHED — design-system doc, used as SECONDARY corroboration only per source policy |
| D22 | Adriana Forero (Medium), "Why the Same Color Can Look Completely Different" (Albers/simultaneous contrast) | https://medium.com/@adrianama.forero/why-the-same-color-can-look-completely-different-and-why-designers-need-to-know-this-933fd964353f | FETCHED via r.jina.ai |
| D23 | Search corpus: status-dot vs badge (Mobbin glossary, Vercel Geist, Eleken, Cieden, astrouxds) | (multiple) | SEARCH-SNIPPET only |
| D24 | Search corpus: cream vs white grounds (Figma color pages, madegooddesigns, Else_ux Bootcamp) | (multiple) | SEARCH-SNIPPET only |
| D25 | Search corpus: hover duration conventions (design.dev CSS transitions, Appy Pie 200ms rule, Roberto Moreno Celta) | (multiple) | SEARCH-SNIPPET only |
| D26 | Search corpus: truncation/wrapping (SAP Fiori wrapping pages, Carbon GitHub issues) | (multiple) | SEARCH-SNIPPET only — no formal study located |
| D27 | Iseki et al., "Perception of Luxury and Product Quality in Package Design: White Space, Typeface, Visual Texture," *Journal of Sensory Studies* 2025 | https://onlinelibrary.wiley.com/doi/10.1111/joss.70026 | SEARCH-SNIPPET only (paywalled; existence + topic verified, findings not read) |
| D28 | Linear docs — status *categories* (backlog/unstarted/started/completed/canceled) | https://linear.app/docs/configuring-workflows | SEARCH-SNIPPET (product doc; category model confirmed by snippet) |
| D29 | Cream-ground contrast arithmetic (luminance of #f5f1e8 ≈ 0.882 → ratios ~11% lower than on #fff) | — | COMPUTED by researcher (WCAG formula), not sourced |
| D30 | Wong/Tol/IBM colorblind-safe categorical sets; deuteranomaly most common | see color.md S9/S10 | PRIOR DOC + TRAINING (not re-fetched) |

FAILED / not obtained: full text of D1/D2 solution sections (paywall); Wiley luxury-whitespace paper full text; jacobshannon.com Refactoring UI hierarchy page (404); no peer-reviewed truncation-vs-wrap study found (D26 is practitioner consensus only); no substantive teardown of a specific warm-paper product located by search (trend pieces only — the strongest "products doing warm paper well" evidence remains TRAINING: Anthropic claude.ai, Stripe Press, Notion's warm grays, Amie).

---

## Q1 — Status color semantics in dense UIs

### 1.1 How many hues can users track
- Few's practical ceiling of ~7 distinguishable hues (prior doc, hierarchy.md A1) is the OUTER bound for *discrimination*, not for *tracking meaning*. For meaning-bearing status color, fetched sources converge much lower: Stone (D7): "the best results are achieved by limiting hue to a palette of two or three colors, and using hue and chroma variations within these hues to create distinguishably different colors." Muth (D5): "Your readers will give up with four, five, six different shades, especially if they're not ordered and/or directly labeled"; "It's doable to distinguish between two, three shades of the same color."
- astro/status-system pattern corpus (D23, snippet): "Having more than five or six indicators can overwhelm users."
- UX Movement (D1/D2): with too many colors "the status column looks like a pixelated rainbow and sacrifices efficiency for aesthetics"; "When the badges are too colorful, they all compete for attention... it's hard to recognize which data requires immediate action."

### 1.2 Should a 7+/15-status workflow collapse to fewer color families? YES — and the app already does
- `status-colors.ts` maps the 15 canonical labels onto **5 families** (neutral/info/warning/success/danger) with the label text disambiguating within a family. This is exactly the pattern the evidence supports:
  - Linear (D28): dozens of possible custom statuses, but a FIXED set of ~5–6 *categories* (backlog/unstarted/started/completed/canceled) that carry the color/shape identity; names vary, families don't.
  - UX Movement (D2): "Your status badges need a visual hierarchy so users can differentiate which statuses they need to act on over ones they don't" — hierarchy across FAMILIES (actionable vs passive), not one hue per status.
  - Muth (D5) warning against per-stage shades: "expect some readers to 'rationalize' your colors" — if `Proposition` vs `2ème proposition` got different tints, users would invent a meaning for the difference. **Within a family, keep the styling IDENTICAL and let text carry the stage.**
- Consolidation direction (astro pattern, D23 snippet): "When multiple statuses are consolidated, use the highest-attention color to represent the group" — i.e., if a family ever merges an urgent and a calm state, the family inherits the urgent color. (For SL Auto: nothing in the current mapping violates this.)

### 1.3 Muted fills + strong text vs saturated fills
- Setproduct (D8, now FETCHED): "Solid Badges are more visible than shaded (where the opacity is reduced to 15–20%). Use them in priority cases, while shaded Badges may be applied for other cases" — solid = interrupting/urgent; soft tint + deep fg = ambient state label. A dossier status is an ambient label 95% of the time → tinted is correct as the default; the SOLID variant (already implemented as `getStatusHeaderStyles`) is the escalation form and must stay rare.
- Muth (D4): "the more saturated and darker (on a bright background) the colors, the more attention they'll get" and "People look first at the highest-contrast, most saturated color in your chart. Then at the slightly less saturated colors. Then at the grays." Chip *backgrounds* must therefore stay pale (low chroma × high lightness) so the ~90–94% lightness tints never outrank the teal primary action; the chip's *fg* text is where the family hue concentrates.
- Stone (D7): "The single factor that determines legibility is the difference in value between the symbol... and its background. Differences in hue and chroma do not contribute at all." → chip legibility = deep fg on pale bg of the SAME hue (which the tokens already do); never mid-lightness fg for style reasons.
- Refactoring UI (D13, prior S16): "Don't use grey text on colored backgrounds" — the neutral chip (`bg-surface-3 text-ink-2`) is exempt because surface-3 is a neutral, not a colored bg.

### 1.4 Dot vs chip vs tinted-row encodings
- Consensus across D8/D9/D23: **dot** = binary/presence or space-starved secondary contexts ("conveys a discrete, binary state... avoid if complex or layered statuses are needed" — Mobbin, D23 snippet; "Use a dot-only badge when the fact that something changed matters more than the count" — D8). **Badge/pill with text** = the row-level status in a table ("Pill badges with text are usually integrated inside the data-tables and depicts each row's recent status" — D8 corpus). **Tinted row** = not endorsed by any fetched source for status; it collides with hover/selected states (P&P's zebra objection, hierarchy.md A9, applies with more force to semantic tints) and puts large low-chroma areas on the page, which Muth's small-vs-big-area rule (D3: "Over big areas... it's easier to tell colors apart than over small areas"; orgs use *desaturated* versions for large fills) would force to near-invisibility anyway. Verdict: chip for the status column, dot reserved for compact secondary surfaces (e.g., dropdown lists, kanban card corners), no row tinting ever.
- Friedman (D9): "Badges are static" and "Don't design non-interactive components to appear like buttons" — the status chip must not look clickable: no shadow, no hover state on the chip itself, hairline not a full border weight.
- Never color-alone (D2 + prior doc S9): "Color coding isn't enough... You also need to add shape and symbolic contrast" — in this system the *text label itself* is the second channel (always present), which satisfies the requirement without adding icons; a leading dot inside the chip is an optional third channel that survives grayscale.

### 1.5 Colorblind discipline for the 5-family set
- The 5 families (gray/blue/amber/green/red) are the classic risk set for deuteranomaly on green↔amber↔red. Mitigations already in-system: lightness separation (D6: "Give your hues different lightnesses so that they'd work in greyscale, too" — check: warning-bg 90% vs success-bg 92% vs danger-bg 94% lightness are nearly identical; the FG lightnesses differ more) and the always-present text label (D30). The binding rule is Muth's (prior S9): the label does the disambiguation, color is redundant reinforcement — so chips must never shrink to color-only at any breakpoint.

---

## Q2 — Warm neutral canvases

### 2.1 What warm paper buys (and doesn't)
- Search corpus (D24): pure #FFFFFF "is the brightest pixel a display can produce, so it can feel harsh on large backgrounds; cream lowers that glare"; warm off-white "feels warmer, less clinical and more connected to natural paper." These remain practitioner claims (prior color.md flagged the same: "widely believed, weakly measured"). Nothing found this pass upgrades the evidence grade — but nothing contradicts it either.
- The trend corpus (D24/D25 searches) adds a positioning claim: warm neutrals read as "designed by humans for humans" vs the clinical 2010s SaaS look. Treat as branding rationale, not perception science.
- Genuinely load-bearing benefit (already in color.md): the cream canvas gives near-white cards (surface-1 at 99.4% lightness) somewhere to sit — surface hierarchy without borders. That's a Refactoring UI mechanism (D13: separate elements with "different background colors" instead of borders), and it is the page's main structural device.

### 2.2 Does WCAG contrast intuition change on cream? Slightly — and measurably
- COMPUTED (D29): relative luminance of #f5f1e8 ≈ 0.882 vs 1.0 for white. Any foreground's contrast ratio on this cream is the on-white ratio × (0.882+0.05)/(1+0.05) ≈ **0.89**. So a color that measures exactly 4.5:1 on white measures ≈ 4.0:1 on the cream canvas — a silent AA failure. Rule of thumb: to guarantee 4.5:1 on the cream canvas, require ≈ **5.1:1 on white**. On surface-1 (99.4% lightness card) the penalty is negligible (<2%).
- Consequence: contrast checks for anything sitting on the CANVAS (toolbar labels, filter chip text, pagination, empty-state text) must be run against the canvas token, not against white. Chips inside the table sit on surface-1 and are effectively on-white. APCA note from prior doc (S5) still applies on top: small 11px/500 chip text needs the deep-fg end of each pair, no exceptions.

### 2.3 Simultaneous contrast: how the cream ground shifts chip colors
- Albers via D22: "Every perception of color is an illusion... In our perception, they alter [each other]." Practical test rule (D22): "test it against different backgrounds — the same orange might feel energetic on white but aggressive on red"; colors must be judged **in situ**, not in the token file.
- Direction of the shift on a warm ground (color theory, TRAINING-grade but uncontested): a warm cream surround pushes perceived hue of neighbors toward its complement (cool/blue) and makes warm chips (amber/danger) read slightly LESS warm and less saturated than on white, while cool chips (info-blue, teal) read slightly MORE saturated/cooler. Two consequences: (a) the amber warning family tolerates its relatively high chroma (90% sat bg) better on cream than it would on white — don't "fix" it by eye against a white artboard; (b) any future chip-color tuning must happen on screenshots of the real page (canvas + card stack), per D22 and Stone's stability argument (D7: neutral surrounds "provide perceptual stability for color perception" — the cream is mildly non-neutral, so in-context checking is the compensation).
- Stone (D7) prefers white + grays as the most stable ground — the locked cream deliberately trades a little perceptual stability for warmth. The system's compensations (near-white surface-1 under all data, hue-matched deep fg text, in-context verification) are exactly the right ones; keep data on cards, never directly on canvas.

### 2.4 Products doing warm paper well
- No fetchable teardown found (D24 returned trend listicles). TRAINING (flagged): claude.ai (warm oat canvas, near-white cards, single accent), Stripe Press (paper editorial), Notion (warm gray ladder), Amie (cream + saturated accents). Common structure across them: warm canvas + whiter content surface + ink text + ONE accent — i.e., the locked system is the pattern, not an outlier.

---

## Q3 — Dense-table typography (beyond the basics)

### 3.1 Cell size
- Nothing fetched this pass contradicts the prior 13–14px consensus (typography.md S16 + corroboration). Setproduct (D10) explicitly declines a number: "design it by eye against your own type scale rather than inventing a precise pixel value," and gives reference paddings of 16px horizontal / 8px vertical / 12px column gaps. Keep 14px values / 12px supporting text; do not go below 12px anywhere in the table (11px only in the chip, which is 500-weight and short).
- No viewing-distance study located for desktop tables (honest gap). The operative rule stays Kennedy's interaction-heavy 14–20px band (prior S16).

### 3.2 Monospace identifiers — why the mono column earns its place
- Search corpus (D23-mono): monospace "is much easier to scan and compare because... all characters are the same size"; "Alignment of the letters makes it easier to compare different sequences visually"; "Readers scanning a monospaced column of command strings are looking for exact character patterns, not comfortable prose reading." An identifier (dossier ref, plate, VIN) is read character-by-character and compared for exact pattern — the mono treatment is functionally justified, not aesthetic.
- Same corpus, the boundary rule: "If you're using a monospace font purely to stop digits from jittering, you almost certainly want font-variant-numeric: tabular-nums instead" (dev.to, D23-mono snippet). So: mono for OPAQUE identifiers only (the ref column); Inter+tabular-nums for amounts and dates. The prior doc's 0/O–1/I disambiguation rationale remains TRAINING-flagged.

### 3.3 Truncation vs wrap
- No formal study exists that I could find (honest). Practitioner consensus is unusually uniform (D10 + D26): single-line ellipsis truncation is "the safe default," full value via tooltip on hover AND keyboard focus; "Reserve full wrapping for one designated 'description' column, never for the whole table, because multi-line rows destroy the vertical rhythm that makes scanning fast"; and the diagnostic: "If people need the full text on every row, that column is too narrow or belongs in a detail view instead." SAP (D26 snippet) adds the counterweight — wrap when the information is critical and interaction cost matters.
- For /dossiers: every column truncates to one line; if a column (e.g., assuré name, garage) is truncated on most rows at common widths, that is a column-width bug, not a tooltip use case.

### 3.4 Date columns: dd/MM/yyyy vs "il y a 3 j"
- Where relative helps: recency judgment without arithmetic. UX Movement (D18): relative for high-activity feeds where "immediacy" is the question. Cloudscape (D21, secondary): "Since relative dates are easier to read, we recommend using them in most situations" — note this is a console design system optimizing for "how long ago did this event happen."
- Where relative hurts — the work-context evidence is the stronger set here:
  - Technically Product (D19): "it can require a little bit of mental processing to work out when eight months ago actually was" and leaves "a somewhat vague answer"; recommends "relative timestamps for anything happening yesterday, today, or tomorrow; and absolutes for anything outside that narrow, easily understandable window."
  - Smykowski (D20): relative dates break chronological comparison — "If you want to place events in a chronological order... you have to do the manual work of calculating the absolute time" — and break cross-referencing with external records.
  - UX Movement (D18): reference/lookup content (documents, tasks, events — i.e., dossiers) "all need absolute timestamps. These content will hold utility in the future when users need to reference them."
- A claims back-office is a REFERENCE context: dates get compared across rows, quoted to insurers, matched against paper. Verdict: **absolute dd/MM/yyyy stays the primary display in table cells** (also: tabular-nums columns of identical-width dates scan vertically; "il y a 3 j" strings have ragged widths and kill column alignment). Relative time is legitimate only as a SECONDARY channel: (a) tooltip on hover ("Tooltip timestamps: display relative time primarily with absolute details revealed on hover" inverted — here absolute primary, relative in tooltip, the Facebook/Dlvr.it reciprocal pattern per D19), or (b) the existing amber/terracotta recency markers, which already encode "recent/overdue" preattentively without destroying the date column. Mixed patterns are explicitly endorsed (D19: "The best approach, then, may be to mix both").
- Year handling: UX Movement (D18) allows omitting the year "until after the current year passes" — with dd/MM/yyyy locked, an acceptable French-locale compromise is keeping full dates in cells (uniform width beats saved characters in a tabular-nums column). [Judgment call, not sourced.]

---

## Q4 — Spacing & rhythm for toolbar and table chrome

### 4.1 Macro/micro & active/passive whitespace
- Boulton (D14) supplies the canonical vocabulary: macro = "the space between major elements in a composition"; micro = "the space between smaller elements: between list items, between a caption and an image, or between words and letters"; and the branding law: "Less whitespace = cheap; more whitespace = luxury." Also ACTIVE whitespace — space deliberately placed to guide attention ("looking room") vs PASSIVE space from margins/line-height.
- Applied to a dense queue page, "luxury via whitespace" cannot mean sparse rows (density is the product value — Ström, prior S18/S19). It means: generous, deliberate MACRO gaps (page title → toolbar → filter chips → table; consistent page gutters) around a deliberately dense table. The premium read comes from the macro/micro CONTRAST: tight, even micro-rhythm inside the table; calm air around it. The Wiley study (D27, snippet-only) corroborates white space ↔ perceived luxury/quality in packaging but was not readable — directional only.

### 4.2 Toolbar spacing math
- The proximity inequality (prior docs: within-group gap < between-group gap; outer ≥ inner) applied on the 4/8 scale gives a concrete toolbar grammar:
  - Within a control cluster (search + saved views; the date segmented control + range picker): **8px** gaps.
  - Between clusters: **16–24px** — visibly ≥2× the within gap so the gap itself is syntax (the "2×" ratio remains convention/TRAINING; the fetched inequality only demands "greater").
  - Between toolbar and filter-chip row, and chip row and table: one step LARGER than any intra-toolbar gap, so the three bands read as layer-cake stripes (hierarchy.md A2).
  - Reset/clear lives with the cluster it clears, not floating — Gestalt proximity (A5) and Setproduct's filter rule (D10): active filters as "removable chips above the table, paired with a visible result count and a clear 'clear all' control." The result-count + clear-all pairing is a fetched, concrete pattern: a filtered table must never look identical to an unfiltered one ("that is exactly how people misread data," D10).

### 4.3 Vertical rhythm in rows: padding vs line-height
- The two contributions are separable and should be tuned in this order: line-height first, padding second. Rutter (prior S13): table line lengths are short → line-height can drop far below body copy (he demos 1.0); with 14px text at lh ~1.3 (≈18px) in a 44px row, vertical padding is what's left (~13px top+bottom → squish-inset asymmetry per Curtis, prior S9, is legitimate: slightly less top than bottom padding reads as centered).
- Perceived density is set by the PADDING share, not the text size: shrinking text to gain density is the wrong lever (legibility cost); shaving padding 44→40px is the sanctioned one (P&P condensed=40). Setproduct (D10): ship density as a USER setting and "persist the choice. The 'right' row height is the one each user picked, not the one you guessed" — a density toggle (40/44/52) is the evidence-backed way to serve both the all-day gestionnaire and occasional roles. WCAG 2.2 floor: interactive targets ≥24×24 CSS px (D10) — row actions survive even at 40px.
- One-line rule integrity: the truncation rule (Q3.3) is what PROTECTS the rhythm — "multi-line rows destroy the vertical rhythm that makes scanning fast" (D10). Rhythm is a scanning-speed feature, not an aesthetic one.

---

## Q5 — "Expensive" polish without decoration

### 5.1 Shadow layering theory (key + ambient)
- Two-source physical model (D12): "A shadow cast by ambient light is more diffuse, softer and has less vertical offset than that cast by directional light as it comes from all angles"; the key/directional shadow "has more offset... more defined and darker"; "When we combine these two shadows, we get a more refined and pleasing effect"; and "the higher the elevation of an element, the fainter the ambient shadow." Refactoring UI's ladder (D13) is the same idea tokenized: sm `0 1px 3px /0.10 + 0 1px 2px /0.06` (cards) → md `0 4px 6px /0.10 + 0 2px 4px /0.06` (dropdowns) → lg for modals.
- Comeau (D11) adds the three consistency laws that make shadows read as one scene: (1) one light source — "every shadow on the page should share the same ratio" of x:y offset (vertical ≈ 2× horizontal); (2) elevation scaling — offset ↑, blur ↑, opacity ↓ together ("press your hand against your desk and slowly lift..."); (3) color-matched shadows — never gray/black on a tinted ground: on a colored background use a shadow of the background's HUE, darker and desaturated, or shadows wash the page out. **On the cream canvas this means shadow color should carry the canvas's warm hue (e.g., an hsl around the canvas hue at low lightness), not 0deg 0% black** — black shadows on cream go muddy-gray and cheapen exactly the surface the system depends on.
- The glass = edge-rim rule (light inner ring + soft drop) is the two-shadow model already: the inner ring is the "key light catching the edge," the soft drop is the ambient. Polish = keeping the ratio identical on every rimmed surface.

### 5.2 Border + shadow interplay
- Refactoring UI (D13 + search corroboration): "Use fewer borders... Instead try adding a box shadow, using contrasting background colors, or adding more space between elements." Hairline + soft shadow together is legitimate on a LIFTED surface (the hairline crisps the edge where the blur would smear it — the fetched two-shadow rationale, with the tight shadow playing the hairline's role); but border AND shadow AND background-shift on one element is double-encoding — pick two.
- "Raised elements use shadows; inset elements darken" (D13) — wells (search field, segmented control track) should darken one surface step, never get an outer shadow.

### 5.3 Radius consistency
- No new fetched source gives a radius law beyond the system's own tokens; the operative rules from the corpus: radius is an identity constant (same token per component class everywhere), and nested radii should shrink toward the inside (outer card > inner tile > chip) — the nested-radii concentricity rule is TRAINING/practitioner lore (popularized by iOS/Figma community), flagged as such. The chip's `rounded-full` is a separate class (pill), which D9's "don't make static elements look like buttons" actually supports: the pill silhouette + no shadow + hairline is what distinguishes it from the radius-token buttons.

### 5.4 Contrast discipline = the premium look
- The faithful RUI digest (D13) confirms the mechanism: hierarchy via weight+color before size; "emphasize by de-emphasizing"; labels de-emphasized. Zamora-type "premium" listicles (D25 corpus) reduce to the same three: restraint, consistency, contrast discipline. The chip section of Q1 IS the polish move for this page: the instant the chip backgrounds drop chroma, the teal button and terracotta markers regain pop-out (Muth D4: gray/muted field is what MAKES the accent work — "Against gray elements, colored ones will stick out").

### 5.5 Micro-interaction restraint (hover/press in tables)
- Durations: "Your animations should also usually be shorter than 300ms" (Emil, D15); hover conventions cluster at **150–200ms** (D25 corpus: "Hover effects commonly use a duration of 150-200ms"); press feedback ~150ms with a subtle scale ("A scale of 0.97 on the :active pseudo-class with a 150ms transition should do the job," D16).
- Easing: `ease` for hover color/background shifts ("I use this one mostly for hover effects that transition color, background-color, opacity," D16); `ease-out` for user-initiated enters (dropdown, drawer) — "the acceleration at the beginning gives the user a feeling of responsiveness" (D16); `ease-in-out` for on-screen moves; never `ease-in` ("that slow start can make interfaces feel sluggish," D16).
- Frequency law (Rauno, D17): "When interactions occur hundreds of times daily, animation becomes cognitive burden rather than delight" — he REMOVED motion from a bookmarking app's core action. Emil (D15): no animation on keyboard-driven repeats. A queue row is hovered hundreds of times per shift → row hover must be a near-instant background shift, not an elevation animation. Setproduct (D10) says it for tables directly: "a subtle background shift on the row under the cursor... keep it light, because a loud hover on a dense table flickers as the cursor moves."
- Hover ELEVATION (lift + shadow) on table rows: no fetched source endorses it; the flicker warning (D10) and frequency law (D17) argue against. Elevation-on-hover belongs to card grids (infrequent hover), not to 25-row tables.
- What motion IS worth spending on here (D15/D17): one-shot state transitions — a newly created row settling in, the bulk-action bar entering (ease-out, <300ms), chip → solid-band promotion on the detail page. Interruptible, transform/opacity only, `prefers-reduced-motion` honored (D15).

---

## Q6 — Applied usage rules for /dossiers (all within locked tokens)

**Chip anatomy (confirm + tighten):**
1. Keep the 5-family collapse; NEVER add per-stage tints within a family (D5 "rationalize" warning). Stage lives in the text only.
2. Chip = soft same-hue bg + deep same-hue fg + fg/30 hairline, 11px/500, pill, tabular-nums — already correct per D7/D8/D13. Chip carries no shadow, no hover, no cursor-pointer (D9).
3. Reserve the solid variant for the ONE place a status must interrupt (detail-page header band, overdue escalations). If the table ever needs an urgent status to shout, use the solid form of that family, not a new color (D8, D23 consolidation rule).
4. Optional grayscale-proof upgrade: an inline leading dot in the chip (same fg color) — adds a redundant channel at zero palette cost (D2 shape-contrast requirement); text remains the primary disambiguator (D30).
5. Audit the three warm-family bg lightnesses (success 92% / warning 90% / danger 94%) toward more separation if a grayscale screenshot shows them merging (D6: "different lightnesses so that they'd work in greyscale").

**Date columns:**
6. Absolute dd/MM/yyyy, right-or-left aligned consistently, tabular-nums, stays primary (D18/D19/D20 — reference context). Relative time only as tooltip on hover (reciprocal pattern, D19) and via the existing terracotta/amber recency markers. No "il y a 3 j" as cell text — ragged widths break column scanning.
7. Recency salience stays terracotta-only (single-dimension pop-out, prior hierarchy doc) — the date column must never gain a second warm treatment.

**Toolbar & filters:**
8. Spacing grammar: 8px within a control cluster, 16–24px between clusters, larger step before/after the toolbar band; reset sits inside the cluster it resets (D10, A5).
9. Filtered state must be unmistakable: removable filter chips + visible result count + clear-all, always co-located (D10 verbatim pattern).
10. Search field and segmented-control track are INSET surfaces: darken one surface step, no outer shadow ("raised elements use shadows; inset elements darken," D13).

**Table chrome & rhythm:**
11. One-line rows everywhere; ellipsis + tooltip on hover AND focus; a column truncating on most rows = width bug (D10/D26).
12. Mono for the identifier column only; Inter tabular-nums for every other numeric/date column (D23-mono boundary rule).
13. Row height: keep 44px default; offer a persisted density toggle 40/44/52 for power users (D10 "the right row height is the one each user picked"). Tune line-height (~1.3) before touching padding.
14. Row hover = one-surface-step background shift, ~150ms, `ease` easing, nothing else — no lift, no shadow, no scale (D10/D15/D16/D17). Row actions revealed on hover per prior A9.

**Shadows & contrast on cream:**
15. All card shadows follow one light source: same x:y ratio (y ≈ 2×x) page-wide; elevation steps scale offset+blur up and opacity down together (D11/D12/D13 ladder).
16. Warm the shadow color: shadow hue ≈ canvas hue, low lightness, modest saturation — not pure black — to avoid the washed-gray cast on cream (D11).
17. Contrast QA rule: anything sitting directly on the canvas needs ≈5.1:1-on-white to actually hit 4.5:1 in place (COMPUTED D29); verify chips on surface-1 as-is. Any future chip tuning happens on real-page screenshots, never isolated swatches (D22, D7).
18. Macro whitespace is the luxury budget: keep the table dense, spend generous consistent gaps between the page's three bands (title/toolbar/table) and page gutters (D14 macro/micro + "less whitespace = cheap; more whitespace = luxury").

---

## Honest-gaps summary
- No controlled study found for: truncation vs wrap (practitioner consensus only), cream-vs-white eye strain (practitioner + optometry commonplaces), viewing-distance-optimal cell size for desktop tables, the 2× proximity ratio (inequality only is sourced).
- Paywalled/unread: UX Movement badge-article solution sections (D1/D2 partial), Wiley luxury-whitespace study (D27).
- TRAINING-flagged in this report: warm-ground simultaneous-contrast direction (§2.3), warm-paper product exemplars (§2.4), nested-radii concentricity (§5.3), 0/O mono rationale (§3.2, carried from prior doc), 2× cluster-gap ratio (§4.2).
