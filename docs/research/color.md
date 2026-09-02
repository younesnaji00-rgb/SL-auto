# Color Theory for Product/UI Design — Deep Research Report
Date: 2026-09-02. Researcher: UX research subagent. 16 sources fetched (2 via r.jina.ai fallback, 1 secondary mirror). Target context: SL Auto / Appraisio locked identity — cream canvas, ink text ladder, muted dark teal `--primary`, terracotta reserved for temporal salience, soft-bg status chips (success/warning/danger/info/neutral). Palette is LOCKED; findings govern deployment only.

---

## Source log

| # | Source | URL | Fetched? |
|---|--------|-----|----------|
| S1 | Stephen Few, "Practical Rules for Using Color in Charts" (2008, Perceptual Edge) | https://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf | YES — direct fetch returned raw PDF binary; recovered in full via r.jina.ai |
| S2 | Refactoring UI (Wathan/Schoger), "Building Your Color Palette" (official free preview chapter) | https://refactoringui.com/previews/building-your-color-palette | YES |
| S3 | Stripe, "Designing accessible color systems" | https://stripe.com/blog/accessible-color-systems | YES |
| S4 | Erik Kennedy, "Color in UI Design: A (Practical) Framework" (Learn UI Design) | https://www.learnui.design/blog/color-in-ui-design-a-practical-framework.html | YES |
| S5 | Andrew Somers, "Why APCA as a New Contrast Method?" (APCA docs) | https://git.apcacontrast.com/documentation/WhyAPCA.html | YES |
| S6 | Michal Malewicz / HYPE4 Academy, "60-30-10 Colors in UI Design" | https://hype4.academy/articles/design/60-30-10-rule-in-ui | YES |
| S7 | Imperavi, "Designing semantic colors for your system" | https://imperavi.com/blog/designing-semantic-colors-for-your-system/ | YES |
| S8 | Flourish, "5 pitfalls to avoid when working with color in data visualization" | https://flourish.studio/blog/color-in-data-visualization/ | YES |
| S9 | Datawrapper (Lisa Charlotte Muth), "What to consider when visualizing data for colorblind readers" | https://www.datawrapper.de/blog/colorblindness-part2 | YES |
| S10 | David Nichols, "Coloring for Colorblindness" | https://davidmathlogic.com/colorblind/ | PARTIAL — JS-heavy page; jina fetch returned structure (Wong/Tol/IBM palettes, don't-rely-on-color-alone) but not the prevalence numbers |
| S11 | Nastengraph (Anastasia), "Dashboard Color Makeover: When Less Really Is More" | https://nastengraph.substack.com/p/dashboard-color-makeover-when-less | YES |
| S12 | storytelling with data, "colors and emotions in data visualization" | https://www.storytellingwithdata.com/blog/2021/6/8/colors-and-emotions-in-data-visualization | YES |
| S13 | Datawrapper (Muth), "How to pick more beautiful colors for your data visualizations" | https://www.datawrapper.de/blog/beautifulcolors/ | YES (after 301 follow) |
| S14 | Hacker News thread on Refactoring UI "Building your color palette" | https://news.ycombinator.com/item?id=18421755 | YES — direct 429; recovered via r.jina.ai |
| S15 | WP Tavern, "Lyft Open Sources ColorBox Algorithm for Building Accessible Color Systems" (secondary for Lyft) | https://wptavern.com/lyft-open-sources-colorbox-algorithm-for-building-accessible-color-systems | YES |
| S16 | howtoes.blog, "Refactoring UI — Complete Book Summary" (secondary for RUI chapters beyond the free preview) | https://howtoes.blog/2025/07/04/refactoring-ui-complete-book-summary-all-key-ideas/ | YES |

### Could NOT fetch (honest list)
- **Kevyn Arnott, "Re-approaching Color" (Lyft Design, Medium)** — https://design.lyft.com/re-approaching-color-9e604ba22c88 — Medium hard-blocks: direct fetch failed, r.jina.ai returned 422 twice, freedium DNS failed, web.archive.org blocked by tooling, prototypr mirror is link-only. Covered via S15 (WP Tavern report, which quotes Arnott and the accessibility guarantee) plus search-result snippets. Key claims below marked [Lyft-secondary].
- **CACM, "How Colors in Business Dashboards Affect Users' Decision-Making"** — https://cacm.acm.org/research/how-colors-in-business-dashboards-affect-users-decision-making — 403. Findings quoted from the search snippet only, marked [snippet]: eye-tracking shows color overuse/misuse causes cognitive overload → *longer decision time*, not necessarily worse decisions.
- **davidmathlogic prevalence numbers** — page fetched but interactive content didn't serialize; the widely cited figures (~8% of men, ~0.5% of women with some CVD; deuteranomaly most common) are TRAINING KNOWLEDGE, consistent with S9's framing.
- Stephen Few's dashboard-specific writing beyond S1 (e.g., *Information Dashboard Design*'s "color should be used sparingly on dashboards; muted earth tones as base") — TRAINING KNOWLEDGE, consistent with S1's rules 3/5/7.

---

## Q1 — Restraint theory: why fewer hues win in work tools

**Few (S1), verbatim rules:**
- Rule #3: "Use color only when needed to serve a particular communication goal."
- Rule #4: "Use different colors only when they correspond to differences of meaning in the data."
- Rule #5: "Use soft, natural colors to display most information and bright and/or dark colors to highlight information that requires greater attention."
- Rule #7: "Non-data components of tables and graphs should be displayed just visibly enough to perform their role, but no more so."
Few recommends three standing palettes: medium (easy-on-eyes workhorse), bright/dark (highlight only), light/pale (de-emphasized support/axes). Grey is the standard for axes/borders; white default background.

**Dashboard corollaries:** Nastengraph (S11): "In data visualization, color is not decoration — it's a tool." Her worked example: a pink average-line was "the most vibrant element on the entire dashboard, yet it's just showing the average — not an alert, not an insight" — a misalignment of visual weight and importance. Concrete method: convert to grayscale first, re-add color only where it answers "Does this color help my audience make a decision faster?" Flourish (S8): "avoid having more than 6-8 colors in one chart"; data.europa guidance surfaced in search: "If everything has a colour, nothing stands out." CACM [snippet]: color overuse increases decision time via cognitive overload (eye-tracking).

**One-hue-as-workhorse:** Erik Kennedy (S4): "The fundamental skill of coloring interface designs is being able to modify one base color into many different variations" — an entire interface (his example is literally teal) can be built from one hue by moving saturation/brightness only. Refactoring UI (S2): the real palette is mostly *shades*: 8–10 greys, 1–2 primaries at 5–10 shades, and accents that "should be used pretty sparingly throughout the UI." Note S2 also says complex UIs may need up to ~10 accent *families* — but each is role-bound, not decorative; HN practitioners (S14) pushed back that 54 colors hardly "narrows things down," reinforcing that the families exist as ladders, not as licenses to use many hues per screen.

**Proportion:** 60-30-10 (S6): 60% dominant (canvas), 30% secondary (surfaces/components), 10% accent — "One accent color, to give it life"; exceed the 10 and "the entire room would look messy, unorganised and chaotic." But the inverse failure exists too: S6's monochrome example where muted buttons "disappear" — restraint must not erase the action color.

**How many semantic colors before scanning degrades:** no single hard number in fetched sources for UI chrome; adjacent evidence: 6–8 max per chart (S8), 3–4 colors max for colorblind-safe palettes (S9), Few's implicit "several predefined palettes" (S1). Practitioner consensus: the 5-role semantic set (success/warning/danger/info/neutral) is the ceiling for statuses that must be *scanned*; beyond that, meanings collide with red/green/amber conventions. [Partly TRAINING synthesis.]

## Q2 — Semantic color systems

- Imperavi (S7): "Defining colors based on their purpose rather than their appearance helps designers and developers work faster." Their tint scale per semantic role — "ghost, dimmed, minimal, subtle, medium, strong, intense" — with the honest note: "often one to three steps are sufficient." Backgrounds and borders pair by intensity level ("a minimal background pairs naturally with a minimal border").
- Soft-bg vs solid: Setproduct badge guidance (search corroboration): "Color matches priority: solid for urgent, shaded (15–20% opacity) for passive labels." I.e., solid fills = interrupting/urgent; soft-bg + dark-fg = ambient state labels. [Setproduct page itself not fetched; snippet only.]
- Consistency: Flourish pitfall #4 (S8): "use identical hues for the same variables in all of your charts" — same rule applies to status meaning app-wide. Few Rule #1 (S1): same color reads as same *only on a consistent background* — so chip backgrounds must be standardized, not improvised per page.
- Never color-alone: Datawrapper (S9): pair color with "symbols, shapes, or patterns as secondary encodings"; "Color keys are a problem to decipher for colorblind people — so try to get rid of them altogether" (label directly). David Nichols (S10, partial): core principle is "not relying on color alone." Few Rule #8 (S1): "avoid using a combination of red and green in the same display" as the *only* differentiator.
- Category vs state vs exception (Few, S1): different hues only for *differences of meaning* (Rule #4 → category); sequential quantity = one hue, varied intensity (Rule #6 → never rainbow a quantitative scale); bright/dark reserved for *exceptions needing attention* (Rule #5). Time is not a semantic Few assigns a hue to — which supports reserving a single dedicated hue (terracotta) for temporal salience and nothing else.

## Q3 — Temperature, emotion, canvas color

- swd (S12): warm colors (reds/oranges) = energy/intensity/urgency; cool (blues, by extension teals) = calm/stability/trust. Berlin-temperature experiment: identical data felt "hot" in red, "cool" in blue. Machin quoted: "dark and saturated colors are thus perceived as more dramatic… bright and flat colors achieve the opposite effect." "Light backgrounds generally signal trust and accessibility." Muth: "we show deaths in black, not red — it feels more respectful" (emotional register of hue choices is real and audience-tested).
- Datawrapper (S13): blues "pleasing, calming, and professional across various saturation and brightness levels"; the classic professional pairing is warm (orange/red/terracotta) *with* a cool anchor — exactly the teal+terracotta structure. "Highly saturated, light colors will NOT be appropriate [to communicate] Serious or Trust, or Calm."
- Pure white/pure black: Supercharge Design + Medium practitioners (search corroboration, page not fully fetched): pure #FFF produces glare in prolonged use; off-white with an undertone reads "warmer… more modern and professional"; editorial/book sites deliberately sit slightly off #FFFFFF for long-form reading comfort. Evidence quality: practitioner claims + optometry commonplaces, not controlled studies — honest status: widely believed, weakly measured. The strongest defensible claims for a cream canvas: (a) lower glare at high ambient brightness, (b) warm/premium/print-like connotation, (c) it gives white cards somewhere to sit (surface hierarchy for free).
- APCA note (S5, related): polarity matters — perception differs light-on-dark vs dark-on-light; near-black on near-white remains the readability gold standard for body text; the cream tint costs almost nothing if the ink ladder stays dark.

## Q4 — Applied mechanics

- Tint math (Kennedy, S4): darker variant = brightness DOWN + saturation UP (hue may drift toward red/green/blue luminosity minima); lighter variant = brightness UP + saturation DOWN (hue may drift toward yellow/cyan/magenta maxima). Derived from how shadows behave in nature. This is the hover/pressed formula: hover = one step darker+more saturated; pressed = two steps.
- Refactoring UI (S2/S16): define the ladder up front — 900/700/500/300/100 then fill; "Don't get clever using CSS preprocessor functions like 'lighten' or 'darken' to create shades on the fly"; "You can't rely purely on math to craft the perfect color palette." On tinted/colored backgrounds: never grey text — "hand-pick a color matching the background's hue, then adjust saturation and lightness" (S16). HN (S14): HSL math "only very loosely related to… human color perception" — eyeball every generated shade or use a perceptual space.
- Stripe (S3): different hues have different intrinsic lightness ("yellow appears lighter than blue"); naive tint generation "results in dull or muted colors"; their audit found "none of the default text colors we were using for small text (except black) met the contrast threshold." Level-distance rule: "Any two colors are guaranteed to have sufficient contrast for small text if they are at least five levels apart, and at least four levels apart for icons and large text." [Lyft-secondary, S15]: same idea — "every color 0–50 is accessible (4.5:1) on black and every color 60–100 is accessible (4.5:1) on white"; the point of an algorithmic ladder is to "remove all the dependencies we previously had with color selection" (Arnott).
- APCA thresholds (S5): Lc 90 preferred body text; Lc 75 min body; Lc 60 min content text (24px/16px-bold); Lc 45 headlines; Lc 30 absolute floor for non-critical; Lc 15 = invisibility threshold. WCAG2 "far overstates contrast for dark colors"; ignores font weight. Practical: chip text on soft tints should be checked perceptually (dark ink of the chip's own hue, heavier weight at small sizes), not just ratio-passed.
- Keeping a neutral table alive WITHOUT hues (S16/S2, Few S1 R7): weight (bolder primary cells), size restraint + softer greys for secondary text instead of tiny text, spacing over borders, background-tint alternation, shadows for lift; Few: chrome "just visibly enough to perform their role, but no more so." Nastengraph (S11): the eye then goes instantly to the one colored thing — that's the payoff of a grey table: color regains its signaling power.

## Q5 — Common mistakes practitioners call out (admin/dashboard context)

1. Vibrancy misallocated to unimportant elements (S11 pink-average-line).
2. Everything loud: default palettes "too bright and saturated — they are all 'loud'" (data.europa via search; S8 pitfall #2 — full-intensity color over large areas causes strain).
3. Meaning drift: same status different colors on different screens (S8 #4; Few R1).
4. Red+green as the only channel (Few R8; S9).
5. Grey text on colored/tinted backgrounds (S16).
6. Runtime lighten()/darken() shades (S2) and trusting HSL math (S14).
7. Trusting WCAG2 ratios blindly, esp. dark colors and light-weight fonts (S5); orange-on-white "passes" but vibrates (search corroboration of APCA critique).
8. Rainbow-coding quantitative sequences instead of one-hue intensity ramps (Few R6).
9. Decorating with color instead of encoding ("color is not decoration — it's a tool," S11): each colored element in an admin screen should be answerable to "what does this hue mean?"
10. Over-restraint: muting the one action color until CTAs disappear (S6).
