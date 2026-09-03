# Colour theory for the /consultation page (Cream & Ink, palette LOCKED)

Research round 2026-09-03 for the UX pass on
`src/app/(app)/consultation/client-page.tsx` — a data-dense, READ-ONLY list
page (filter toolbar + 8-column table + footer count). Scope: deployment
theory only — hue harmony, distribution rules (60-30-10), chroma budgets,
warm/cool balance and depth, simultaneous contrast on a cream canvas,
contrast ladders, hue-count limits, semantic colour economy, accent
frequency/pop-out, surface tint vs shadow elevation. The palette itself is
locked and no ruling in `docs/element-specs.md` is re-litigated here.

All sources below were actually fetched on 2026-09-03 unless marked
**[secondhand]** or **[training knowledge]**. Reddit: blocked (both
reddit.com per prior sessions and old.reddit.com today — "Claude Code is
unable to fetch from old.reddit.com"). Unfetched list at the end.

---

## 1. Stephen Few — Practical Rules for Using Color in Charts (2008)

PDF fetched from the NBIS mirror (binary, not text-extractable by the tool);
the nine rules were then confirmed verbatim from a secondary transcription:
http://joyfulpublicspeaking.blogspot.com/2008/09/practical-rules-for-using-color-in.html
(original: http://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf)

The rules that bear on this page:

- **Rule 1:** "If you want different objects of the same color in a table or
  graph to look the same, make sure that the background (the color that
  surrounds them) is consistent." → status chips must always sit on the same
  surface (the card), never sometimes on canvas, or identical statuses will
  read as different.
- **Rule 3:** "Use color only when needed to serve a particular
  communication goal."
- **Rule 4:** "Use different colors only when they correspond to differences
  of meaning in the data." → no colour-coding of compagnie/nature columns;
  the words already differentiate them.
- **Rule 5:** "Use soft, natural colors to display most information, and
  bright colors and/or dark colors to highlight information that requires
  greater attention." → the soft-bg/dark-fg chip pair IS Few's soft tier;
  the danger Alert and solid fills are the bright/dark tier and must stay
  rare.
- **Rule 7:** "Non-data components of tables and graphs should be displayed
  just visibly enough to perform their role, but not more so, for excessive
  salience could cause them to distract attention from the data." → warm
  hairlines (`--hairline` hue 40, in the cream family) are exactly this:
  visible enough, chromatically part of the ground.
- Rule 8 (avoid red+green as the only differentiator) is already satisfied
  by chips carrying text labels.

## 2. Healey / Ware — preattentive colour, pop-out, hue-count limits

Fetched: https://www.csc2.ncsu.edu/faculty/healey/PP/index.html

- "A viewer can tell at a glance whether the target is present or absent"
  when the target has a **unique** hue; "a target made up of a combination
  of non-unique features (a conjunction target) normally cannot be detected
  preattentively." Pop-out lives or dies on uniqueness in the feature
  dimension — this is the theoretical engine behind the app's
  terracotta-means-time-only ruling: **one stray warm element anywhere in
  view destroys the preattentive search for "the next thing."**
- "Random variations in hue interfere with the identification of texture
  patterns, but not vice-versa" — hue is high in the salience hierarchy;
  colour noise is more damaging than shape noise. A table that adds hue
  variation per row (zebra tints, per-company colours) taxes every other
  reading task.
- Quantitative limit (search result for Healey 1996, "Choosing Effective
  Colours for Data Visualization",
  https://vis.cs.brown.edu/docs/pdf/Healey-1996-CEC.pdf — abstract-level,
  PDF not read in full): **only 5–7 colours can be found rapidly and with a
  low error rate**; selection must respect colour distance, linear
  separation, and colour *category*. The consultation page already carries
  five categorical hues (neutral, info-blue, warning-amber, success-green,
  danger-red) in its chip system + the teal accent → the page is AT the
  categorical budget. Any sixth data hue is over budget.

## 3. Erik Kennedy (Learn UI Design) — harmony theory is not the lever

Fetched: https://www.learnui.design/blog/color-in-ui-design-a-practical-framework.html

- "Using a 'split complementary palette' is about 0% predictive of me making
  nice-looking designs" — harmony-wheel schemes (analogous/complementary/
  split/triadic) are, per Kennedy, "useless" as a generator of good UI.
  "The **fundamental** skill of coloring interface designs is being able to
  **modify** one base color into **many different variations**."
- Variation mechanics (HSB): "darker color variations are made by lowering
  brightness and increasing saturation. Brighter color variations are made
  by increasing brightness and lowering saturation."

Fetched: https://www.learnui.design/blog/the-hsb-color-system-practicioners-primer.html

- Saturation is an attention knob: "If you have a color that's really
  overpowering everything in your UI, a quick go-to way of fixing it is to
  reduce the saturation."
- "Simultaneously: Increase saturation, Decrease brightness … the 'correct'
  way to generate darker variations of a color 95%+ of the time." (The
  status pairs already obey this: fg = same hue, high sat, low brightness.)

Fetched: https://www.learnui.design/blog/7-rules-for-creating-gorgeous-ui-part-1.html

- **"Black and white first … Add color last, and even then, only with
  purpose."** "Having too many colors in too many places is a really easy
  way to screw up clean/simple." The prescription for most apps: "a single
  accent color or multiple shades from one or two hues."
- "Shadows are invaluable cues in telling the human brain what user
  interface elements we're looking at" — light-from-the-sky elevation.

Note: the often-cited "Never use grey text on colored backgrounds" essay
404s at its old URL; the same-hue-dark-text rule is retained via
Refactoring UI **[secondhand]** and is already in element-specs addendum C
("on tinted backgrounds the text is a dark ink of the SAME hue, never
grey").

## 4. Refactoring UI — palette shape and grey ladders

Fetched: https://www.refactoringui.com/previews/building-your-color-palette

- Three buckets: greys ("Text, backgrounds, panels, form controls — almost
  everything in an interface is grey."), 1–2 primaries ("primary actions,
  emphasizing navigation elements"), accents for semantics.
- "You'll need more greys than you think … three or four shades might sound
  like plenty but it won't be long before you wish you had something a
  little darker than shade #2 but a little lighter than shade #3." 8–10
  grey steps recommended. → The ink ladder (ink→ink-4) plus the surface
  ladder (card, surface-2/3/4, hairline×2) together give ~10 neutral steps;
  the system is Refactoring-UI-shaped. Hierarchy work on this page should
  spend THESE steps, not hue.
- "True black tends to look pretty unnatural."

## 5. Ian Storm Taylor — tinted neutrals ("never use black")

Fetched: https://ianstormtaylor.com/design-tip-never-use-black/

- "It's very hard to find something that is pure black. Roads aren't black.
  Your office chair isn't black."
- "When you put pure black next to a set of meticulously picked colors, the
  black overpowers everything else."
- "Whenever you're working with grays, add a bit of color to them and they
  will feel less dull." Saturation scales with darkness: light greys 2–3%
  sat, darkest 20%+.
- The Cream & Ink neutrals conform precisely: ink 215/38%/14% (cool-tinted
  dark), ink-4 215/12% (near-neutral light), cream 42/24% (warm-tinted
  light). This is the theory licence for the whole two-temperature neutral
  system.

## 6. Josef Albers — simultaneous contrast (via essays; book not directly readable)

Search round (aardvark.ucsd.edu/color/albers_examples.html and others,
summaries only — **[secondhand]** for the book itself):

- Albers, Interaction of Color (1963), introduction: "In visual perception
  a color is almost never seen as it really is — as it physically is."
- Simultaneous contrast: adjacent colours push each other apart in hue,
  value and saturation; a ground induces its complement into figures on it.

Fetched (practitioner application):
https://design.tutsplus.com/articles/simultaneous-contrast-make-your-colors-work-smarter--cms-108963

- "The perception of a color is altered by the colors surrounding it."
- Value-key technique: "limiting the values will let the brain increase the
  contrast on its own" — use the substrate colour as the brightest value
  instead of pure white and a dark grey instead of black; the brain
  amplifies the difference. (This is the cream-canvas strategy stated as
  theory: the compressed value range still reads as full-contrast.)
- "The more space you can provide around the area where you want to boost
  contrast, the better" — isolation multiplies perceived contrast; a chip
  surrounded by whitespace pops more than a bigger chip.
- "Vibrating boundaries will disrupt readability" — saturated
  complementaries touching at an edge; the muted teal (60% sat but 24%
  lightness) against cream cannot vibrate, which is part of why the accent
  works.

Search corroboration ("simultaneous contrast UI" round): "Grays and
off-whites are most vulnerable to induced tints … a strip of grey on a
brightly coloured field appears to be tinted ever so slightly in the
contrasting colour"; "most automated tools can't account for this because
they check isolated color values, not the full visual context."

**Application to cream:** a warm cream ground induces a slight COOL (bluish)
cast into any neutral placed on it. The ink family is *already* blue-slate
(hue 215), so the induced tint reinforces the designed tint instead of
fighting it — greys never look "dirty" here. Conversely, the warm hairlines
(hue 40) read as part of the ground, receding per Few rule 7. The one
danger: the warning tint (`--status-warning-bg` 42/90%/90%) is the SAME hue
as the canvas (42/24%/94.5) at higher chroma — on the card it separates; laid
directly on the cream canvas it would half-merge with the ground and its
"soft yellow" identity would be partly absorbed. Status chips must stay on
card surfaces.

## 7. Itten — treated critically

Search round (Cooper Hewitt https://www.cooperhewitt.org/2018/05/25/a-not-so-modern-color-tool/,
huevaluechroma.com/002.php summaries, ResearchGate "How Itten's color
diagram fails…" — **[secondhand]**, huevaluechroma unreachable today, broken
TLS cert):

- Itten's RYB wheel "does not show how paint colors mix, and disagrees with
  optical theory and experimental evidence"; "Itten's stated views are
  outdated, yet many schools … base their instruction on Itten's methods
  with the consequence that false concepts are taught."
- What survives of Itten for UI: (a) the *warm–cool axis* as a perceptual
  organizing contrast (his "contrast of temperature") and (b) *contrast of
  extension* — his idea that harmony depends on the AMOUNT of each colour,
  small areas of strong colour balancing large areas of weak colour — which
  is the ancestor of 60-30-10. What does NOT survive: complementary-wheel
  harmony as a palette generator (see Kennedy above), and his RYB
  complement pairs (teal↔terracotta is roughly an opponent pair in modern
  hue terms anyway: H178 vs H16 ≈ 162° apart — near-complementary, which is
  why the pairing reads balanced, but that's a description, not the reason
  it works; the reason is role separation + extension).

## 8. 60-30-10 — status of the rule

Search round + fetched: https://hype4.academy/articles/design/60-30-10-rule-in-ui

- Origin: interior-design heuristic (dominant / secondary / accent), ported
  to UI. Hype4: 60% dominant base, 30% support, "10% is a vibrant green
  that stands out from all the other hues… This approach makes the accent
  color instantly visible which makes it easier and faster for the user to
  take action."
- Its caveat for neutral-dominant UIs: monochromatic palettes where "all
  colors are similar, only varying with the lightness level" risk making
  action elements disappear.
- Its core recommendation, matching the app: "the majority of a good user
  interface is simple. Either white, or dark grey for dark mode, with
  contrasting typography and a single, vibrant accent color."
- Practical reading for a functional list page: in dense read-only screens
  the real ratio is closer to **90 / 9 / 1** — neutrals ~90%, soft semantic
  tints ~9%, saturated accent ≤1%. 60-30-10 describes marketing surfaces;
  on data pages the "30" is the INK ladder (a value band, not a hue), and
  the "10" collapses to focus rings, one link, one conditional button.
  globals.css already documents this correctly ("60 cream / 30 ink /
  10 teal — nothing else").

## 9. Warm/cool balance and colour-depth

Fetched: https://mitchalbala.com/lies-my-art-teacher-told-me-warm-colors-advance-cool-colors-recede/

- "We've all heard that 'warm colors advance and cool colors recede.'
  That's certainly true — *but not always.* It's a simplistic guideline
  that doesn't take into account other additional factors."
- Value/luminance and saturation dominate temperature as depth cues;
  application (opacity/edge quality) can override temperature entirely.

Search corroboration (chromostereopsis round, incl.
https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12025320/ summaries): the
red-nearer/blue-farther effect is real but individually variable ("not all
individuals experience chromostereopsis"), and "luminance is a stronger
depth cue than color"; "muted colors will appear to recede; pure colors
will appear to advance."

**Application:** on the cream canvas, layering must be carried by VALUE
(near-white card lifts off the slightly darker cream — correct) and by
shadow, not by temperature games. The saturation-depth corollary matters
more: *muted recedes, saturated advances* — which is why the soft chip
backgrounds sit IN the page while their high-sat dark foregrounds project
forward just enough to be scannable, and why the muted teal never needs
brightening to lead: on an all-muted page even a muted saturated hue is
the most saturated thing in view.

## 10. Elevation on cream: tinted shadows

Fetched: https://www.joshwcomeau.com/css/designing-shadows/

- "When we layer black over our background color, it doesn't just make it
  darker; it also desaturates it quite a bit" → grey/black shadows on cream
  would wash the canvas out.
- "By matching the hue and lowering the saturation/lightness, we can create
  an authentic shadow that doesn't have that 'washed out' grey quality."
- Consistency: "every shadow on the page should share the same ratio"
  (single light source); higher elevation = larger blur/offset, LOWER
  opacity.
- The app's tokens conform: `--shadow-color: 215 45% 20%` (saturated
  slate-navy, not black) and the glass shadows are teal-tinted
  (`hsl(178 35% 18% / .1)`). Comeau would tint toward the CANVAS hue
  (warm); the app tints toward ink/accent (cool). Both avoid the grey-wash;
  the cool-tinted choice additionally deepens the warm-canvas/cool-shadow
  complement, which is a defensible aesthetic stance — flag as observation,
  not a problem. (Palette locked; no change proposed.)

## 11. Accessible contrast ladders

Fetched (search summary + article): https://stripe.com/blog/accessible-color-systems

- Stripe: "the perceptual lightness for each color follows the same curve,
  meaning each color has the same contrast value at a given level";
  hand-picking + checker tools = "too dependent on trial and error";
  naive tint generation yields "dull or muted colors … difficult to
  distinguish"; WCAG "intentionally only focuses on the contrast between a
  foreground and a background color — not how vibrant they appear."

Fetched: https://news.ycombinator.com/item?id=21028361 (ColorBox by Lyft, HN)
plus search round on https://design.lyft.com/re-approaching-color-9e604ba22c88

- Lyft: lightness-consistent ramps so "every color 0–50 is accessible
  (4.5:1) on black, and every color 60–100 is accessible (4.5:1) on white."
- HN practitioners (tbabb, kccqzy): HSL ramps are not perceptually uniform;
  CIELAB-like spaces keep luminance honest. Rule of thumb extracted: **a
  ladder is trustworthy when every step change is a contrast change, and
  the same step means the same contrast in every hue.**
- Application: the ink ladder's documented guarantees ("ink-3 ≥ 4.5:1 on
  surface-1…3", "ink-4 disabled/decorative only") are exactly the
  ladder-contract these systems formalize. On this page that contract
  decides WHERE each token may appear: ink-3 is the floor for meaningful
  text (labels, captions); ink-4 may never carry data — only the neutral
  status dot uses it, beside its label, which is legal because the dot is
  redundant with text (never colour alone, §11).

## 12. Cream canvases and value compression (why the page can feel "gray")

Search round (Evergreen/UXPin/Webheads summaries — low-authority,
corroborative only): cream "is gentler on the eyes than pure white";
"a neutral colour like light grey or soft beige doesn't create visual
vibration, providing a quiet canvas … that doesn't compete with the
letterforms"; pure black-on-white "forces your eyes to work harder."

The structural risk (Tuts+ value-key + owner's earlier "one beige-gray
sheet" complaint): compressing the value range between canvas (94.5%) and
card (99.4%) means the ~5-point value step must be protected — anything
that blurs it (missing shadow, hairline-only cards, low-contrast headers)
makes the whole page collapse into one sheet. Elevation on this page is a
COLOUR job in the value dimension, not the hue dimension.

---

# Assessment of /consultation as it stands

Colour inventory of the rendered page: cream canvas → near-white glass card
→ warm hairlines → ink text at 3 levels (ink / ink-3 labels + caption /
ink-4 unused) → ONE chroma column (status chips, soft-bg/dark-fg) + status
dots in the dropdown → teal only as: link variant («Tout réinitialiser»,
conditional), tonal empty-state button (conditional), focus rings. Danger
pair only on fetch error. Terracotta: zero. Outline «Afficher plus»:
neutral.

**Verdict: the page does not overuse its hues — and it does not
meaningfully underuse them either.** By Few rules 3/4/5/7, Kennedy's
add-colour-last, and the Healey budget, a read-only archive table SHOULD be
a neutral field with exactly one semantic colour system and near-zero
accent at rest. The page is theory-clean; the remaining aesthetic lift is
in the VALUE/ELEVATION dimension (protecting the card lift, the sticky
column's layer shadow, full-ink data vs ink-3 labels) and in keeping the
five-hue categorical budget from ever being exceeded. Its "grayness" at
rest is the price of making the chips and the one conditional teal land —
Few's rule 5 and addendum C ("the grey table is what makes the one
terracotta marker land") both say to pay it.

Specific findings:

1. **Zero terracotta is CORRECT here, and valuable app-wide.** Date de
   requête is a past date; the time ruling says past = neutral. This page
   being warm-free is part of what keeps terracotta preattentive on the
   queue pages (Healey: uniqueness across the field of view the user
   scans in a session, not just one screen).
2. **The chip column is the page's only pop-out channel, and repetition
   defuses it correctly.** 25–50 soft chips do not "pop" individually —
   they form a scannable categorical column (Few soft tier). Pop-out is
   reserved for the RARE dark-fg/danger values against the mostly-soft
   column. This is the right economy; do not add a second coloured column.
3. **Five categorical hues = at the Healey budget.** Teal + 4 status hues.
   Any proposal to colour-code compagnie or nature (or per-type icons in
   colour) breaks Rule 4 AND the budget.
4. **Warning-tint vs canvas hue collision** (both hue ~42): benign today
   because chips only render inside the card. Becomes a real bug if chips
   are ever placed on raw canvas (e.g., in a toolbar summary).
5. **Accent frequency at rest ≈ 0 is legal for a read-only page.** There is
   no primary action to advertise; the teal identity is carried by the nav
   (active item) just outside the page region. When filters are active,
   exactly one teal link appears — a correct, meaningful accent event
   (colour marks the one state-changing affordance).
6. **Simultaneous contrast works FOR the system**: cool-tinted inks on a
   warm ground are pushed cooler (cleaner), warm hairlines are absorbed
   into the ground (quieter). No compensation needed.
7. **Hover ladder nuance** (observation only, tokens locked): the surface
   ladder darkens by dropping saturation (20%→18%→16%), while
   Kennedy/addendum C would darken by RAISING it. At 90%+ lightness and
   <20% sat the difference is below noticeability; not worth a ruling.

---

# Unfetched / honesty list

- **Reddit**: blocked outright (old.reddit.com refused by the fetch tool;
  www.reddit.com known-blocked). No Reddit sourcing in this report.
- **Few's PDF full text**: the binary fetched but could not be
  text-extracted locally (no poppler); the nine rules were verified
  verbatim against a secondary transcription (joyfulpublicspeaking
  blogspot) — rule WORDING is confirmed, surrounding commentary is
  secondhand.
- **huevaluechroma.com (Briggs, The Dimensions of Colour)**: unreachable
  (server presents a wrong TLS certificate). Warm/cool boundary detail is
  from search summaries only.
- **Healey 1996 paper full text**: 5–7-colour figure and the three-effects
  framing from the abstract/search layer, not a full read.
- **Interaction of Color (Albers)**: book not online; quotes are the
  standard introduction lines via essays (aardvark.ucsd.edu examples page,
  Oberlin, Medium essays) — marked secondhand.
- **Lyft "Re-approaching Color" full essay**: Medium fetch not attempted
  (paywall pattern); claims from the WP-Tavern/HN/search layer.
- **Butterick**: Practical Typography has no substantive colour chapter
  relevant here; not used. **[training knowledge]**
- **Colin Ware (Information Visualization, ch. Color)**: not directly
  fetchable; his categorical-colour guidance is represented via Healey's
  pages (Ware is Healey's co-tradition) and the dataviz skill's palette
  rules. **[partially training knowledge]**
- M3 surface-tint docs deliberately NOT leaned on (owner policy); the
  surface-ladder corroboration in globals.css comments stands on its own.
