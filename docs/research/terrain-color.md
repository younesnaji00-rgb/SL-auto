# Color theory, schemes and palettes — research report for "Missions terrain" (/assignations-atg)

Research date: 2026-09-03. All "Findings" entries below were actually fetched (directly or via the r.jina.ai reader proxy, noted). Training-knowledge judgements are flagged inline.

## Findings

### Q1 — Colour economy in data-dense UIs

**F1. Few: colour only when it serves a communication goal; soft colours for most, bright/dark strictly for emphasis.**
Source: Stephen Few, *Practical Rules for Using Color in Charts* (Perceptual Edge, 2008) — fetched via r.jina.ai from http://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf
The nine rules, verbatim highlights: Rule 3 "Use color only when needed to serve a particular communication goal." Rule 4 "Use different colors only when they correspond to differences of meaning in the data." Rule 5 "Use soft, natural colors to display most information and bright and/or dark colors to highlight information that requires greater attention." Rule 7: non-data components "displayed just visibly enough to perform their role, but no more so." Rule 8: avoid red+green combinations in the same display (colour-blindness). Rule 1–2: colour perception depends on the surrounding background — the same chip colour reads differently on different grounds, and objects need a background that contrasts sufficiently.

**F2. Few: working memory holds 3–7 chunks; keep distinct coloured categories ≤7, ideally ≤5. Hue is preattentive for categories but never quantitative.**
Source: Stephen Few, *Tapping the Power of Visual Perception* — fetched via r.jina.ai from https://www.perceptualedge.com/articles/ie/visual_perception.pdf
The brain holds "three to seven chunks" at a time; limit distinct colour-coded components to no more than seven, ideally five or fewer. Colour is processed preattentively (instant pop-out), which is exactly why it must be rationed: every coloured element competes for the same preattentive channel.

**F3. Stone: 2–3 hues max; grey is the foundation; only VALUE (luminance) difference determines legibility.**
Source: Maureen Stone, *Choosing Colors for Data Visualization* — fetched via r.jina.ai from https://www.perceptualedge.com/articles/b-eye/choosing_colors.pdf
Recommends "a palette of two or three colors" varied by value/chroma rather than many hues; contextual elements grayscale; high-chroma colour reserved for highlighting against neutral grounds. Key quote: "The single factor that determines legibility is the difference in value between the symbol and its background" — hue and chroma contrast do NOT buy readability, only luminance contrast does. Also: design first in black and white; if it fails in grayscale, revise.

**F4. Desbarats (Few school): red must exist on operational dashboards, but only for genuinely actionable problems.**
Source: Nick Desbarats, *"I don't want red on my dashboards. It looks too negative."* — https://www.goodreads.com/author_blog_posts/25222497-i-don-t-want-red-on-my-dashboards-it-looks-too-negative
"No red" policies produce dashboards that get abandoned because users can't manually scan every number. But naive flagging (worse-than-last-period, single thresholds) creates noise; red should mark specific, actionable problems only — otherwise it becomes visual alarm fatigue.

### Q2 — 60-30-10 rule and its critiques

**F5. Proponent articles present 60-30-10 with no limits and no data-dense case.**
Sources: https://hype4.academy/articles/design/60-30-10-rule-in-ui and https://blog.logrocket.com/ux-design/60-30-10-rule/ (both fetched)
Hype4 (Michal Malewicz): 60% primary hue, 30% secondary, 10% vibrant accent as the CTA focal point; keep "the majority of a good user interface simple... with contrasting typography and a single, vibrant accent color"; in dark mode avoid oversaturated accents. LogRocket: covers application only; **"The article contains no limitations section"** — the sole caveat is "a guideline, not a hard rule." Honest finding: I could not locate a substantive written critique of 60-30-10 for app UIs (a YouTube video "Why the 60-30-10 Rule is RUINING Your UI Designs" exists but is unfetchable; searches for Reddit/HN threads returned nothing citable). Judgement (training knowledge, flagged): the rule originates in interior decoration and works for marketing pages with one CTA; in a semantic-status UI the "10%" is not one accent but a *budgeted set of status signals*, so the rule collapses into Few's rule 5 (muted mass + rare bright emphasis) — which IS well-sourced (F1, F3). Treat 60-30-10 as inapplicable rather than violated.

### Q3 — Warm-neutral (cream) canvases

**F6. Lower background luminance (off-white/sepia) reduces measured visual fatigue vs pure white; legibility itself is a luminance-contrast problem.**
Source: Design for Ducks, *Color's effect on readability and vision fatigue* — https://designforducks.com/colors-effect-on-readability-and-vision-fatigue/ (fetched; cites Sethi & Ziat 2023, Xie et al. 2021)
"Many issues often attributed to 'excessive contrast' are actually related to 'excessive luminance'"; recommendation: "Instead of using pure white, you can consider using off-white, light yellow, and creme as the background color." Brightness level matters more than the specific tint. Search corroboration (not independently fetched): a ScienceDirect accommodative-response study and low-vision practice (Perkins) both favour off-white/sepia grounds for long reading.

**F7. Hobday: near-white over pure white; saturate neutrals with ONE temperature; containers within ~7% brightness of a light background; borders must contrast with both sides.**
Source: Anthony Hobday, *Visual design rules you can safely follow every time* — https://anthonyhobday.com/sideprojects/saferules/ (fetched)
"Pure black often has uncomfortably high contrast... pure white is too bright." "If you use colour in your interface, add a little bit of that colour to your neutrals." "If you use both warm and cool colours to saturate neutrals, the colour palette will not feel coherent." Container vs background brightness difference: keep within "7% for light interfaces." "Container borders should contrast with both the container and the background." Also: palette colours should have distinct brightness values so they don't compete.

**F8. Schoger: never grey/opacity text on tinted surfaces — hand-pick a same-hue colour; keep saturation up in light shades.**
Source: notes from Steve Schoger's Refactoring UI CSS Day talk — https://gist.github.com/ynotdraw/9351627d7509cc35813eeac4245cab3b (fetched)
On coloured backgrounds, don't lower opacity or use grey ("washed out") — "hand-pick a color based on the background color" matching its hue. "Pure greys can make a UI look dull and unnatural" — saturate them toward the UI's temperature. When lightening in HSL, raise saturation to avoid washout. Soft coloured background + dark same-hue text is the recommended badge recipe; coloured badges help users "take info in at a quick glance."

### Q4 — Countdown/urgency ramps, red overuse, colour-blind safety

**F9. Alarm fatigue is real, measured, and driven by false-positive rate, not signal strength.**
Source: APSF, *Alarm Fatigue and Patient Safety* — fetched via r.jina.ai from https://www.apsf.org/article/alarm-fatigue-and-patient-safety/
Cardiac surgery averaged "1.2 alarms per minute"; the cry-wolf effect makes clinicians "mistrust and possibly ignore subsequent alarms," and it worsens under high workload (exactly a dispatcher's morning). Remedies that worked: short delays before minor-threshold alarms (−74% false alarms), suppression/tuning (77% suppressed while accuracy rose to 84%), per-context threshold personalization. Transfer: the *thresholds* (50%/80%) matter more than the chip colours — if most rows go amber/red daily, the ramp is already dead.

**F10. Colour-blind safety: avoid red↔green at similar lightness; make it work in black & white; redundant encoding (labels, icons, position) is the primary fix.**
Source: Lisa Charlotte Muth, Datawrapper, *How your colorblind and colorweak readers see your colors* (part 2 guidance) — https://www.datawrapper.de/blog/colorblindness-part2/ (fetched)
"Blue is the safest hue." Avoid green vs red/orange at similar lightness. "Get it right in black & white": lightness differences carry meaning even when hue fails. Redundant channels: direct labels, symbols/icons, position, pattern, line style. (Our chips already carry text labels — that satisfies the primary requirement; lightness separation between ramp steps is the remaining check.)

**F11. Under stress, colour-to-meaning mappings must be rigid and red exclusive to critical.**
Source: Corvus Intel, *Ruggedized UX for military operators* — https://corvusintell.com/blog/field-apps/ruggedized-ux-military-operators/ (fetched)
"Establish rigid color-to-meaning mappings (red = alert/threat/critical failure only). Avoid using red for decorative UI, navigation, or category labels." High-saturation variants read better in bright conditions. Target "WCAG AAA (7:1 contrast) for primary status indicators and critical text" in field apps.

### Q5 — Sunlight/outdoor readability on phones

**F12. In glare, only large luminance differences survive; yellow/green/cyan hold luminance on LCDs, blue dies; kill soft edges.**
Source: Callum Coe, *Industrial UX: Sunlight Susceptible Screens* — fetched via r.jina.ai from https://medium.com/@callumjcoe/industrial-ux-sunlight-susceptible-screens-2e52b1d9706b
"It is physiologically more effective to use a bright object on a dark background, than a dark object on a bright background" (for emissive screens fighting reflections). "Yellow, green, and cyan have highest luminance on most LCDs... Avoid blues," especially blue on black. Concrete steps: raise luminance contrast of critical elements, anchor with white/black extremes, "embrace edges" (no shadows/fades/gradients — hard boundaries survive glare), make critical elements bigger, test outdoors, and consider a user-selectable extreme-sun mode. Corvus (F11) adds the hardware reality: 400–600-nit consumer phones are "essentially unreadable" at 80,000 lux, so software must over-deliver contrast.

**F13. APCA: contrast is polarity- and size-dependent; small text needs Lc≈75–90; WCAG 2 ratios mispredict readability.**
Source: Myndex, *Why APCA* — https://raw.githubusercontent.com/Myndex/SAPC-APCA/master/documentation/WhyAPCA.md (fetched)
WCAG 2 "far overstates contrast for dark colors"; it ignores spatial frequency (font size/weight) and polarity. APCA targets: Lc 90 preferred for body text, Lc 75 minimum for body text, Lc 60 for 24px/16px-bold, Lc 45 headlines, Lc 30 minimum non-text, Lc 15 invisibility threshold. Judgement (flagged): for a sunlight-used app, treat APCA Lc 75+ (not WCAG 4.5:1) as the floor for chip/cell text, since WCAG can pass functionally weak pairs.

### Q6 — Practical ladder/triad building

**F14. Kennedy: one base colour → many variations; darker = lower lightness + higher saturation; lighter = higher lightness + lower saturation, with hue shifts toward luminosity peaks.**
Source: Erik Kennedy, *Color in UI Design: A (Practical) Framework* — https://medium.com/@erikdkennedy/color-in-ui-design-a-practical-framework-e18cacd97f9e (fetched)
"Darker color variations are made by lowering brightness and increasing saturation"; lighter ones by the reverse; darker shifts hue toward red/green/blue minima, lighter toward cyan/magenta/yellow maxima. A whole UI can run on one base colour plus variations — corroborates the locked "one accent, never spread" stance.

**F15. Muth: when lightening/darkening, rotate hue toward the brighter neighbour; check colours against the ACTUAL background; add lightness variety before adding hues.**
Source: Lisa Charlotte Muth, Datawrapper, *How to pick more beautiful colors* — https://www.datawrapper.de/blog/beautifulcolors (fetched)
Avoid dead-on primary hues (shift 5–10°); pick categorical colours from a gradient so lightness varies automatically; fix palette problems by adjusting saturation/lightness "before adding new hues." Colours must be tuned on the real background, not on white.

**F16. HSL is perceptually broken for ladder-building; LCH/OKLCH lightness is trustworthy.**
Sources: Lea Verou, *LCH colors in CSS* — https://lea.verou.me/blog/2020/04/lch-colors-in-css-what-why-and-how/ ; Evil Martians, *OKLCH in CSS* — https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl (both fetched)
Verou: HSL yellow and blue at L=50% "are most certainly not equally light"; "In LCH, the same numerical change in coordinates produces the same perceptual color difference." Evil Martians: in HSL, changing hue (e.g. deriving an error red from an accent) silently changes perceived lightness and can break contrast; in OKLCH the axes are independent, so "define a formula, choose a few colors, and an entire design system palette is automatically generated," with predictable a11y. Caveat: mind sRGB gamut clipping when manipulating chroma.

## Could not fetch
- `https://nbisweden.github.io/Rcourse/files/rules_for_using_color.pdf` — returned raw PDF bytes; local PDF render unavailable (no poppler). Worked around via r.jina.ai on the Perceptual Edge original (F1).
- `https://www.apsf.org/...` and `https://medium.com/@callumjcoe/...` direct — HTTP 403; both succeeded through r.jina.ai (F9, F12).
- YouTube "Why the 60-30-10 Rule is RUINING Your UI Designs" — video, unfetchable; no written equivalent found.
- No citable Reddit/HN thread on 60-30-10 critique surfaced in three searches — reported honestly; the critique in F5 rests on the proponents' own silence plus flagged training-knowledge reasoning.
- Itten/Albers primary texts not fetched; the Albers point used below (colour is perceived relative to its surround) is training knowledge, flagged — but Few's Rules 1–2 (fetched) state the same operationally.
- Nick Desbarats' original on practicalreporting.com — used the Goodreads syndication instead (fetched, F4).

## Implications for Missions terrain

1. **Hue budget audit (F2, F3).** Count what a scanning dispatcher must track per screen: teal (accent/links), terracotta (time), danger red, warning amber, success green, info blue, neutral grey. That is 7 — at Few's ceiling, above his ideal 5. Do not add ANY new hue for this page; if a new state appears (e.g. "en pause"), encode it in neutral + icon, not a new colour. Within one table row, allow at most **two** chromatic elements at once (countdown chip + one status badge); everything else stays on the ink ladder.

2. **60-30-10: ignore it (F5, F1).** The operative rule for this page is Few's Rule 5, which the palette already embodies: cream+ink mass (~95%), muted teal structure, and bright/dark colour ONLY at exception points (En retard, next RDV). Any "spread the accent to hit 10%" impulse is anti-pattern here — resist adding teal fills to tabs/toolbars for "balance."

3. **Cream canvas is defensible — tune it, don't defend it (F6).** Lower-luminance ground genuinely reduces long-session fatigue for back-office staff. Two obligations follow: (a) per Hobday (F7), collapsed group headers / toolbar surfaces should sit within ~7% brightness of the cream canvas, differentiated by border, not by big value jumps; (b) all ink-ladder greys and badge tints must be **warm-saturated** (toward the cream's yellow-orange), never blue-grey — a cool grey on cream reads as a rendering mistake. Exception: the info-blue badge is fine as a semantic colour; it's the *neutrals* that must not go cool.

4. **Badge triads must be re-derived ON cream, not on white (F15, F3, F8, F1).** Few's Rule 1: a tint that worked on white shifts on cream, and the warning-amber background is the danger case — amber tint vs warm cream is a hue-neighbour with a small value gap. Recipe per badge: background = cream's lightness minus a small fixed OKLCH ΔL (e.g. 0.04–0.06) at low-but-nonzero chroma in the badge hue; border = same hue, chroma up, lightness down enough to contrast with both cream and the tint (Hobday F7); text = dark same-hue colour hand-picked per Schoger (F8) — never grey, never opacity — hitting **APCA Lc ≥ 75** against its own tint background (F13). Verify the whole set in OKLCH so all five badge backgrounds share one measured lightness and all badge texts share another (F16) — this is what makes the row scan calm.

5. **Countdown ramp: escalate by VALUE and fill, not just hue (F3, F10, F12).** Stone: only luminance difference is legible; Muth: it must work in black & white. Make the four chip states a monotonic lightness/weight staircase: neutral = ink outline chip; warning = amber tint (light bg, dark text); danger = deeper tint, darker text, stronger border; En retard = the ONLY solid fill (dark red bg, white text, Lc≥75). Solid fill as the reserved top step is Few's "bright/dark = emphasis" made structural — and in grayscale the four steps still order correctly. Chips already carry text labels (satisfies redundant encoding, F10); optionally add a small clock/alert glyph on the top two steps for at-a-glance parsing at arm's length.

6. **Protect red's meaning with threshold hygiene, not colour tweaks (F9, F4, F11).** If a typical morning shows >~20% of visible rows in red, dispatchers will tune it out (cry-wolf; the APSF false-alarm data is unambiguous). Options, in order of preference: (a) since the En retard *group* already isolates late rows positionally, rows inside it don't each need a screaming chip — position is the redundant channel; consider calming per-row chips inside that group to the danger tint and letting the red group header + count badge carry the alarm; (b) keep the 50%/80% thresholds under review like APSF's "alarm personalization" — they are the real UX surface. Never let red appear for anything non-actionable (a past mission awaiting paperwork is not "late" — F11's rigid mapping).

7. **Terracotta vs danger-red separation (F10, F2).** Terracotta (time) and danger red are hue neighbours; under protanopia or glare they compress toward the same percept. Enforce separation on the two channels that survive: **lightness** (terracotta chips stay mid-light warm tints / one solid mid-value block; danger stays either pale-tint-with-dark-text or very dark solid — never a mid-value terracotta-adjacent solid red) and **form** (time chips always show a clock glyph + time string; status chips show status words). Run the grayscale screenshot test (F3, F10): if the terracotta RDV block and an En retard chip look like siblings in grayscale, adjust lightness, not hue.

8. **Mobile/outdoor variant needs a contrast bump, not a redesign (F12, F13, F11).** On the card list: (a) body/critical text one ink step darker than desktop, targeting APCA Lc 90 for primary cell text and ≥Lc 75 for chip text — WCAG 4.5:1 is not a sufficient floor outdoors; (b) the solid terracotta "next RDV" block is the right instinct (bright-on-dark solid survives glare better than tints) — verify its white text at Lc≥75 and give it a hard edge, no shadow/gradient (F12 "embrace edges"); (c) muted teal is the weakest glare performer on the page (low-luminance blue-green, F12 "avoid blues") — never let teal be the only carrier of actionable info on mobile; links/actions there need weight/underline/placement too; (d) low-chroma tint chips wash out first in sun — on mobile, raise chip border chroma and text darkness one step vs desktop tokens. Optional (real choice): a user-toggleable "plein soleil" high-contrast mode (near-black text, solid chips, no tints) per F12/F11 — worth a ticket, not a blocker.

9. **Tooling rule (F16, F14).** Do ladder math in OKLCH (Tailwind v4 tokens or a build-time generator): hold hue, step L on a fixed scale, compensate C per Kennedy/Schoger (chroma up as lightness departs mid-range), then gamut-check. Hand-tuned HSL is how the current amber-on-cream class of bug happens.
