# Mobile pass — F. Content density & readability on the phone (2026-09-06)

Scope: brief §4-F. Per-element findings + SPEC for THIS app (Cream & Ink,
type roles `t-*`, glass system, density zoom, dashboard `ui.tsx` elements,
`Badge`/`StatusChip`/`FilterChip`/`IconChip`, `DossierKpiStrip`, skeletons).
Legend: ✓ fetched and read · ◦ known / snippet only, not read in full.
"Phone" below = the compact width class (< 600 CSS px) unless stated; the
1024 px `lg` line is family A's call, but every rule here is written so it
holds at 320–599 px and degrades gracefully at 600–1023.

## 0. Elements covered

1. Type scale on the phone (roles `t-display … t-mono`, figures)
2. Spacing scale: page margins, card/tile padding, gutters, sections
3. Touch targets and inter-target spacing (rows, buttons, icon buttons, chips, bottom bar)
4. Stat tiles, meters, segmented meters, compare strips, bar lists, charts
5. Status chips, badges, count pills
6. Icon-only vs labelled controls
7. Glass, blur, grain, dark mode
8. `--app-zoom` density zoom on phones/tablets
9. Landscape and large-font (font scaling / page zoom 130–200 %)
10. Skeletons and loaders
11. French label length (cross-cutting)

## 1. Type scale on the phone

Findings
- Apple HIG Typography ✓ https://developer.apple.com/design/human-interface-guidelines/typography — iOS Large (default) Dynamic Type: Large Title 34/41, Title 1 28/34, Title 2 22/28, Title 3 20/25, Headline 17/22 semibold, Body 17/22, Callout 16/21, Subhead 15/20, Footnote 13/18, Caption 1 12/16, Caption 2 11/13. "Minimum size: 11 pt | Default size: 17 pt." "In general, avoid light font weights." Tight leading only for ≤ 2 lines: "If you need to display three or more lines of text, avoid tight leading even in areas where height is limited."
- Material 3 type scale ✓ (token source) https://github.com/material-components/material-web/blob/main/tokens/versions/v0_192/_md-sys-typescale.scss — display-small 36/44, headline-large 32/40, headline-medium 28/36, headline-small 24/32, title-large 22/28, title-medium 16/24 medium, title-small 14/20 medium, body-large 16/24, body-medium 14/20, body-small 12/16, label-large 14/20, label-medium 12/16, label-small 11/16 (labels medium weight).
- Lighthouse legible font sizes ✓ https://developer.chrome.com/docs/lighthouse/seo/font-size — "Aim to have a font size of at least 12 px on at least 60% of the text on your page."
- Smashing, typography in mobile web design ✓ https://www.smashingmagazine.com/2018/06/reference-guide-typography-mobile-web-design/ — "the rule of thumb is that font size needs to be 16 pixels for mobile websites"; "no more than between 30 and 40 characters to a line"; 4.5:1 contrast, 3:1 for 18 pt / bold 14 pt; MIT glanceable-text study: bigger (4 mm vs 3 mm) and regular width read faster at a glance.
- Smashing, line length vs font size ✓ https://www.smashingmagazine.com/2014/09/balancing-line-length-font-size-responsive-web-design/ — 45–85 characters on the web; on small screens "retaining a comfortable font size as much as possible better preserves readability. The result will be a less-than-ideal measure but a more comfortable reading experience." (never shrink type to save measure).
- Butterick ✓ https://practicaltypography.com/line-length.html — "45–90 characters, including spaces"; ✓ https://practicaltypography.com/point-size.html — "For websites, I recommend body text of 15–25 pixels."
- NN/g legibility ✓ https://www.nngroup.com/articles/legibility-readability-comprehension/ — legibility needs "reasonably large default font size", "high contrast", "plain background instead of a busy or textured one"; for mobile "be even briefer and simplify even more."
- Josh Comeau, pixels & accessibility ✓ https://www.joshwcomeau.com/css/surprising-truth-about-pixels-and-accessibility/ — "Should this value scale up as the user increases their browser's default font size?" rem for type and media queries; px for paddings/borders so line length is not eaten.
- UXCam mobile UX ✓ https://uxcam.com/blog/mobile-ux/ — "tiny text: below 14pt is hard to read on small screens."
- GOV.UK tag ✓ https://design-system.service.gov.uk/components/tag/ — dropped uppercase because "uppercase text can be harder to read, particularly for longer tag text." (supports the locked sentence-case labels; the table-head small-caps ruling is out of scope here).

What this means for our roles. Today the app is a 14 px desktop tool with a 30 px display; `text-sm`/`text-xs`/`text-2xl` are rem, `text-[30px]`/`[15px]`/`[13px]`/`[11px]` are px — a mixed scale that reacts inconsistently to user font size. Apple's list-cell secondary size (Subhead 15) and M3 body-medium (14) bracket the phone body for an operational app; the reading-text 16–17 figures (Smashing, Apple Body) are for prose, which this app has almost none of. The captions/labels at 12 sit exactly on Apple Caption 1 / M3 label-medium / Lighthouse's floor. 11 is the platform floor on both sides (Caption 2, label-small) — a floor, not a size to design at.

SPEC — phone type scale (compact width, applied via a `max-width: 37.5rem` block on the `.t-*` classes; rem-based so browser font-size scaling works; unitless line heights):
`t-display` 24/700 Outfit, lh 1.2, tracking −0.02em (M3 headline-small 24, Apple Title 2 22 — 30 is a desktop size; a page title sitting in the 56 px bar is 17/600 Inter, Apple Headline) · `t-title` 20/600 Outfit (unchanged; Apple Title 3, M3 title-large 22) · `t-heading` 16/600 Inter (Apple Callout 16, M3 title-medium 16) · `t-body` 15/400, lh 1.45; field values 15/600 (Apple Subhead; M3 body-medium is the floor; Butterick's 15 lower bound) · `t-body-sm` 14/400 (only the second line of a row; M3 body-medium) · `t-caption` 12/400 ink-3, lh 1.4 · `t-label` 12/400 ink-3 sentence case · `t-mono` 14 mono tabular (plates/refs read at arm's length outdoors — Terrain). Floor: 12 px for any word; 11 px only for digit-only count pills. Never light weights; never uppercase for words; ≤ 2 lines at lh 1.2–1.3, ≥ 3 lines at lh ≥ 1.4 (Apple). Line length: let the measure fall to 30–40 ch rather than shrinking type (Smashing 2014/2018). Tile figures (see §4): hero 48, headline 36, detail 24 — unchanged and in Inter 600 proportional. Set `-webkit-text-size-adjust: 100%` on `html` (see §9). Must not: introduce a 13 px primary row line, a 28 px figure tier, or a phone-only `text-[…]` stack outside the roles.

## 2. Spacing scale, page margins, card padding

Findings
- Material (M1 metrics & keylines, still the numeric source M3 inherits) ✓ https://m1.material.io/layout/metrics-keylines.html — "All components align to an 8dp square baseline grid"; type/icons 4 dp; "Screen edge left and right margins: 16dp" (mobile), 24 dp on tablet; list items 48/56/72/88 dp; "Space between content areas: 8dp".
- Material window size classes ✓ https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes — Compact width < 600 dp "99.96% of phones in portrait"; Medium 600–839 "93.73% of tablets in portrait"; Compact height < 480 dp "99.78% of phones in landscape".
- Apple HIG Layout ✓ https://developer.apple.com/design/human-interface-guidelines/layout — respect safe areas and layout margins; iPhone points table (390×844 … 440×956 for current models); iPhone portrait = compact width, regular height; landscape = compact height.
- Apple HIG Accessibility ✓ https://developer.apple.com/design/human-interface-guidelines/accessibility — "add about 12 points of padding around elements that include a bezel. For elements without a bezel, about 24 points of padding works well."
- Cloudscape content density ✓ https://cloudscape.design/foundation/visual-foundation/content-density/ — "Comfortable is the standard density level of the system, active by default"; compact "may hinder readability, overwhelm, and prolong content consumption"; compact reduces spacing "in 4px increments"; "Ensure users can toggle between modes application-wide."
- Matthew Ström, UI density ✓ https://mattstromawn.com/writing/ui-density/ — density is "the value a user gets from the interface divided by the time and space the interface occupies"; four densities (visual, information, design, temporal) — cramming rows is only one lever; load time is another.
- HN, "What UI density means" ✓ https://news.ycombinator.com/item?id=40428386 — pants2: "Every 'mobile friendly' menu site is able to show maybe 5 items on the page at once"; marcosdumay: "'mobile friendly' seems to just mean it will waste some space your phone screen can't afford"; somat: the split is "professional or consumer audience". Our users are professionals: whitespace must buy legibility, not air.
- Repo prior (docs/research/terrain-typography-spacing.md F3/F4/F14 — Pencil & Paper / Setproduct / Dahl ◦): 40/48/56 density ladder as a persisted user setting; 8-multiples between structures, 4-multiples inside.

SPEC — phone spacing: page margin 16 (M1/M3 compact; Apple margins); never 12 (text touches the 12 px paper radius, the rim reads as a border) and never 24 on a 390 px screen (loses 5 % of width per side). Gutter between 2-up tiles 12 (4-grid escape; keeps a 320 px screen's tile ≥ 138 px). Card padding 16 on phones (down from 24; Carbon/M3 tile padding, already the tile rule), tile padding 16 unchanged, list rows 12 vertical / 16 horizontal. Section gap 24 (from 32), block-title-to-content 8, between fields 12 (from 16). Density: phone default = comfortable (48 px rows, §3); a persisted "compact" = 44 px rows and 8/12 paddings — never 36/40 on a touch device (Cloudscape default-to-comfortable; WCAG/Apple targets §3). Spacing from parent `gap`, never per-element margins (blueprint §4). Must not: 20 px anything; density that changes type size; `xl` context-column rules leaking onto phones.

## 3. Touch targets and inter-target spacing

Findings
- WCAG 2.5.8 Target Size (Minimum, AA) ✓ https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html — "at least 24 by 24 CSS pixels" or the 24 px-circle spacing exception; inline exception for links in text; "It is still possible to have very small, and difficult to activate, targets and meet the requirements … provided that the targets don't have any adjacent targets that are too close."
- WCAG 2.5.5 Target Size (Enhanced, AAA) ✓ https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html — "at least 44 by 44 CSS pixels"; "A finger is larger than a mouse pointer, and generally obstructs the user's view of the precise location".
- Apple HIG Accessibility ✓ (URL in §2) — iOS "Default control size: 44x44 pt … Minimum control size: 28x28 pt"; 12 pt padding around bezelled controls, 24 pt around bezel-less ones.
- Android accessibility help ✓ https://support.google.com/accessibility/android/answer/7101858 — "at least 48x48dp, separated by 8dp of space or more"; ≈ 9 mm.
- web.dev tap targets ✓ https://web.dev/articles/accessible-tap-targets — "around 48 device independent pixels"; "spaced about 8 pixels apart, horizontally and vertically"; "The 48x48 pixel area corresponds to around 9mm, which is about the size of a person's finger pad area."
- Hoober, Design for Fingers pt 1 ✓ https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php — "75% of users touch the screen only with one thumb", "fewer than 50% of users hold their phone with one hand"; targets ≈ 7 mm at centre, "corner target sizes must be about 12 millimeters"; sizes "contain only 95% of all observed taps"; nobody taps the exact centre. Pt 2 ✓ https://www.uxmatters.com/mt/archives/2017/05/design-for-fingers-touch-and-people-part-2.php — Apple's 44 is "too small" for edges; "Actual sizes can be 30% smaller or larger than expected" (density mismatch); "accuracy is poor at the edges of the screen".
- Addy Osmani ✓ https://addyosmani.com/blog/touch-friendly-design/ — "People touch the center of the screen - center key actions if possible"; keep "room around touch targets so users can tap and see state changes"; "avoid the Thumb Zone" as a dogma — grips shift.
- Apple HIG Designing for iOS ✓ https://developer.apple.com/design/human-interface-guidelines/designing-for-ios — "easier and more comfortable for people to reach a control when it's located in the middle or bottom area of the display".
- SIDP badges/chips/tags/pills ✓ https://smart-interface-design-patterns.com/articles/badges-chips-tags-pills/ — badges "Always static components"; chips/pills = "visual style conventions for interactive tags"; "Use 48×48px as a minimum touch target size on mobile … at least 8px spacing".
- Current code: `Button` default h-10 (40), `sm` h-9 (36), `icon` 40×40; `WorkRow` min-h 44 / tall 56; bottom-bar items min-h 56 with a 32×56 pill; `FilterChip` remove × = 12 px icon + 2 px padding = 16 px target inside a 20 px badge; `IconChip` 28 (decorative, fine).

SPEC — phone targets: list/worklist rows min-height 48 (M1 list item; web.dev 48), "tall" rows 64; the whole row is the target (already). Buttons: primary/sticky action 48 tall, full-width or ≥ 120 wide; secondary 44 tall (Apple default); `sm` never below 40 visible with a 44 hit box (`before:` pseudo hit area — Apple's "minimum 28" is for bezelled system controls, not ours). Icon buttons 44×44 visible, 48 hit; corner icon buttons (top-bar bell/avatar, bottom-right FAB) 48 visible — Hoober's 12 mm corner rule. Bottom-bar items: full slot width (≥ 78 px at 4 items on 320) × 56, 8 px between slots (family A owns the bar itself). Interactive chips (filters, segments): 32 px tall visible, 44 px hit via padding-block, ≥ 8 px gap, ≥ 12 px around the group; the `FilterChip` × becomes a 24×24 minimum target (WCAG 2.5.8) with the chip label as the other target. Static status chips: no target rule (not interactive — GOV.UK/SIDP). Inter-target spacing: 8 px minimum between same-kind targets, 12 px around bezelled controls (Apple). Hover-revealed row actions are replaced by an action sheet (family D); nothing on a phone may require a hover state. Must not: 36 px anything tappable; two icon buttons 4 px apart; a 16 px × inside a chip.

## 4. Stat tiles, meters, compare strips, bar lists, charts

Findings
- NN/g mobile tables ✓ https://www.nngroup.com/articles/mobile-tables/ — "Items need to be legible without requiring the user to zoom in"; complex tables fit ~2 columns on a phone; freeze the first column and headers when a real table must survive.
- Storytelling with Data, mobile ✓ https://www.storytellingwithdata.com/blog/2019/8/20/you-can-take-it-with-you — "be ruthless editors of our visuals"; keep interaction minimal and finger-sized; "Reserve screen space for data rather than filters or legends"; avoid small precise marks (scatter); vertical scroll for sequences, one screen per question.
- Visual Cinnamon, mobile vs desktop dataviz ✓ https://www.visualcinnamon.com/2019/04/mobile-vs-desktop-dataviz/ — nine strategies: scale down with "non-linear down scaling" for fonts, "Fit to the available width" (scale x only), "Stack vertically", "Use different charts"; "There is not one set way".
- Datawrapper mobile-first ✓ https://www.datawrapper.de/blog/datawrapper-becomes-mobile-first-charting-tool/ — on mobile "Line charts switch from direct labeling to legend-based labeling"; responsive height ✓ https://www.datawrapper.de/blog/responsive-height-control — a chart is either fixed-height or aspect-ratio; "You decide" per chart.
- Pencil & Paper dashboards ✓ https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards — ask "whether all the information is relevant for your users' 'on-the-go' scenarios"; "Maybe only display that top section, the most important or global data, and fit it in a vertical layout"; fine to say a chart "is better experienced on a larger screen".
- AWS Quick mobile layout ✓ https://aws.amazon.com/blogs/machine-learning/introducing-mobile-layout-for-amazon-quick-dashboards/ — "Visuals stack in a single column. Each visual fills the full viewport width"; "A minimum height of 272 pixels means that chart elements (legends, axis labels, sort buttons) remain visible."
- datawirefra.me layout patterns ✓ https://www.datawirefra.me/blog/dashboard-layout-patterns — "A single column of full-width cards, each containing one KPI or one chart"; "Mobile users can't compare side-by-side, so you stack vertically and prioritize ruthlessly. Only the 4–6 most important items make the cut."
- growth-onomics mobile KPI dashboards ✓ https://growth-onomics.com/how-to-design-mobile-kpi-dashboards/ — "Stick to a single-column layout"; 3–6 KPIs; bars 5–7 max, sparklines ≤ 7 points, ≤ 5 series; 48 px targets; breakpoints 320/375/414.
- Setproduct dashboard UI ✓ https://www.setproduct.com/blog/dashboard-ui-design — "Lead with the top KPIs, then the primary chart, then any table or list"; "Keep the first viewport to three or four KPIs at most."
- Few (bullet graph, dashboard pitfalls) ◦ and the dataviz stat-tile contract (repo element-specs §6) — one exception colour, no circular charts, value in the UI sans.
- Current code: `StatTile` 48/36/24, p-4; `DossierKpiStrip` `grid-cols-2 gap-4 xl:grid-cols-4`, value 24; `Meter` 10 px strip + inline legend; `CompareStrip` `grid-cols-[minmax(0,10rem)_1fr]`; `BarList` `labelWidth w-40`; `recharts` is only referenced by `components/ui/chart.tsx` — no page currently draws a recharts chart.

Resolution of "single column" vs 2-up: every mobile-dashboard source says single column for charts and for cards that contain a chart; for bare count tiles the constraint is legibility, and a 2-up at 320 px gives 138 px tiles — enough for a 6-digit 36 px Inter figure (~120 px) and a ≤ 16-character 12 px label. The brief's measured problem is the opposite one (tiles "push the list below the fold"), so the fix is fewer, tighter tiles, not one per row.

SPEC — phone tiles and meters: headline count tiles 2-up (gutter 12, padding 16, value 36/600 Inter proportional, label `t-label` ≤ 16 characters incl. spaces, caption one line, truncation forbidden — wrap the caption instead); the KPI strip shows at most 4 tiles (2 rows ≈ 190 px) above a list — the rest go behind « Voir tout » / the filter sheet; the one hero (≥ 48) is 1-up full width; detail tiles (24) 2-up; any tile carrying a meter, delta and caption together is 1-up. 28 px is rejected: it would be a third figure tier (blueprint §2 two-tier rule). Meter: strip 12 px tall (from 10) on a `surface-3` track, legend below in `t-caption` with counts (never inside segments), judged segment first; ≤ 4 segments on a phone. CompareStrip: stacks — label row (label left, value right, 15/600), band full width 20 px tall, verdict line; the label column is never fixed at 10 rem. BarList: label on its own 14 px line above a full-width bar, count at the tip, ≤ 7 rows then « Voir tout » (growth-onomics 5–7). Charts: none on phones by default (no page has one today — keep it so); if one is ever added it is a horizontal bar list or a ≤ 7-point sparkline inside a tile, fixed height 160–200 px (no axes/legends, so AWS's 272 does not apply), width-fitted, entrance not animated, tap = tooltip that stays until dismissed. Must not: donut/pie, line charts with direct labels, any 4-up row, values in Outfit, side-by-side comparisons that need panning.

## 5. Status chips, badges, count pills

Findings
- Apple Caption 2 = 11 pt is the platform floor; M3 label-small 11/medium (✓ §1). Lighthouse 12 px on ≥ 60 % of text ✓.
- Carbon tag sizes ✓ https://github.com/carbon-design-system/carbon/blob/main/packages/styles/scss/components/tag/_tag.scss — heights sm 18, md 24, lg 32 (`convert.to-rem`), `min-inline-size: 32px`, type `label-01` (12 px); ◦ usage page: lg for touch.
- GOV.UK tag ✓ (§1 URL) — moved off uppercase bold; lighter background + darker text so tags are not mistaken for buttons; "Do not use tags to create links, buttons or other interactive elements"; "Do not use colour alone".
- Apple HIG Accessibility ✓ — "Convey information with more than color alone"; contrast 4.5:1 up to 17 pt, 3:1 at 18 pt or bold.
- SIDP ✓ — badges static, chips interactive, distinct styles for each.
- WCAG 1.4.12 Text Spacing ✓ https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html — truncated text passes only if "a mechanism is provided to reveal the truncated text"; a `title` tooltip is not reachable on touch.
- Current code: `Badge` 11 px/500 `px-2 py-0.5 leading-4` ≈ 20 px tall; `StatusChip` truncates with `title`; bottom-bar count pill 16 px tall, 11 px digits.

SPEC — phone chips: `StatusChip`/`Badge` word variants 12/500 (Carbon label-01; Apple Caption 1), `leading-4`, padding 2 × 8 → 22–24 px tall (Carbon md), pill radius, status pair colours unchanged (≥ 4.5:1 — dark fg on soft bg reads outdoors; `dangerSolid` stays the single solid step). The label is the state: max 2 words / ~18 characters on a phone; a chip that would truncate is shown full-width on its own line in the card instead — never `…` with a hover `title`. Count pills (bottom bar, Block header) stay 11 px digits, 16 px tall, tabular, ≥ 2 px ring so they separate from the icon. Interactive chips are visibly different (rim + 32 px height, §3); static chips never get a rim or an × so nobody taps them (GOV.UK). Never colour alone: the tone map keeps the text, and the terrain urgency ramp keeps its band label. Must not: 10 px anything; uppercase words; icons without a word inside a chip; a chip row that scrolls sideways without a fade edge.

## 6. Icon-only vs labelled controls

Findings
- NN/g icon usability ✓ https://www.nngroup.com/articles/icon-usability/ — "a text label must be present alongside an icon to clarify its meaning in that particular context"; "Icon labels should be visible at all times, without any interaction from the user"; "Obscure icon = wasted feature"; only home/print/search are near-universal.
- Apple HIG Designing for iOS ✓ — "limiting the number of onscreen controls while making secondary details and actions discoverable with minimal interaction."
- Apple HIG Accessibility ✓ — shapes/icons in addition to colour; Dynamic Type must not truncate.
- Current chrome: hover tooltips (dead on touch, brief §1), hover-revealed row clusters, ⌘K palette, icon-only `size="icon"` buttons throughout toolbars.

SPEC — phone icon policy: icon-only is allowed for exactly six glyphs — back ‹, close ×, search, overflow ⋯, notifications bell, add + (top-bar create) — each with `aria-label`, 44–48 px (§3). Everything else carries a visible word: bottom-bar items (already), toolbar actions (word + optional 16 px icon, or word alone), row actions inside the action sheet (word always), filter triggers (« Filtres · 3 »), density/columns controls (moved into the sheet with words). A tooltip is never the label on a phone; `title` attributes stay for desktop only. Destructive actions are words in the danger pair, never a lone bin icon. Must not: an icon-only cluster of ≥ 2 unlabeled buttons; icon buttons that change meaning by state without a label change.

## 7. Glass, blur, grain, dark mode

Findings
- Apple HIG Materials ✓ https://developer.apple.com/design/human-interface-guidelines/materials — "Thicker materials, which are more opaque, can provide better contrast for text"; Liquid Glass for "Tab bars, sidebars, navigation elements", not the content layer; "Use Liquid Glass effects sparingly"; appearance changes under "reduce transparency or increase contrast".
- Apple HIG Dark Mode ✓ https://developer.apple.com/design/human-interface-guidelines/dark-mode — custom colours "aim for 7:1, especially in small text"; test "with Increase Contrast and Reduce Transparency turned on (both separately and together)"; base vs elevated backgrounds; "Avoid offering an app-specific appearance setting."
- Material dark theme ✓ https://m2.material.io/design/color/dark-theme.html — #121212 surfaces, 15.8:1 body text at top elevation, desaturated accents, text at 87/60/38 %, avoid large bright blocks.
- web.dev paint complexity ✓ https://web.dev/articles/simplify-paint-complexity-and-reduce-paint-areas — "Anything that involves a blur (like a shadow, for example) is going to take longer to paint"; "The 10ms you have per frame is normally not long enough to get paint work done, especially on mobile devices."
- HN, frosted glass thread ✓ https://news.ycombinator.com/item?id=42302907 — zipy124: "The scrolling lag also makes it unsuable on Firefox mobile, my s24 ultra chugs hard on the top part of the website"; spiffyk: wants "some sort of media query for devices that are not that powerful (or their owners simply do not wish to burn through their batteries)"; madeofpalk: "Chrome doesn't supported nested/stacked blurred backgrounds".
- Josh Comeau, backdrop-filter ✓ https://www.joshwcomeau.com/css/backdrop-filter/ — "The backdrop-filter algorithm only considers the pixels that are directly behind the element"; sticky-bar quirks in Firefox.
- MDN prefers-reduced-transparency ✓ https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency — "Limited availability"; not supported by Safari/Chrome Android → the iOS Reduce Transparency setting does NOT reach our CSS.
- MDN prefers-reduced-motion ✓ https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion — iOS Settings › Accessibility › Motion, Android 9+ "Remove animations"; supported everywhere.
- NN/g legibility ✓ — "plain background instead of a busy or textured one".
- Current CSS: below `lg` cards are solid 94 % (good), `.glass-bar` blur 12, `.glass-strong` overlays keep blur 24, the sheet scrim adds `backdrop-blur-[6px]` (two stacked blurs over the full viewport while a sheet is open — exactly the case Chrome handles worst), `body::after` is a full-viewport `position: fixed` grain layer on every device.

SPEC — phone glass: blur survives on the two bars only (top 56 / bottom 60, `blur(12px) saturate(1.2)`, 72 % card fill) — Apple's "navigation, not content" rule, and the only place the see-through means anything; sheets/dialogs/menus below `lg` are solid `popover` (no blur) with a plain 40 % scrim and no `backdrop-blur` on the scrim; the `.glass-sidebar` drawer is solid. Grain (`body::after`) off below `lg`: invisible at 3 % on a 6-inch screen at arm's length, costs a full-screen compositing layer, and NN/g's plain-background rule. Since `prefers-reduced-transparency` never fires on iOS/Android, the phone rules above ARE the reduced-transparency fallback; keep `prefers-reduced-motion` handling as is (already global). Dark mode on phones: keep the owner's light-by-default ruling, but when dark is chosen, 12 px `t-caption`/`t-label` use `ink-2` (≈ 9:1 on card) instead of `ink-3` (≈ 5.7:1) — Apple's 7:1 for small text; status pairs unchanged (already ≥ 4.5:1); no bright solid blocks except the single `dangerSolid` step; overlays use the elevated (`popover`) surface so depth reads without blur. Must not: blur on cards, sheets or scrims on a phone; `.glass-strong` inside a `.glass-bar`; grain on OLED dark (banding); 60 % ink for words under 14 px.

## 8. `--app-zoom` density zoom on phones and tablets

Findings
- The script keys on `Math.round(screen.height × devicePixelRatio)` ≈ 1080 → 0.9, ≈ 1440 → 1.1, re-run on `resize`.
- CSSWG issue #5204 ✓ https://github.com/w3c/csswg-drafts/issues/5204 (foolip, 2020-06-12): "On Chrome, `screen.width` and `screen.height` flip when rotating the phone"; "On Safari, `screen.width` and `screen.height` stay the same". Still open ("Needs Edits").
- MDN Screen.height ✓ https://developer.mozilla.org/en-US/docs/Web/API/Screen/height — CSS pixels of the whole screen.
- MDN zoom ✓ https://developer.mozilla.org/en-US/docs/Web/CSS/zoom — "scales the targeted element, which can affect the page layout" (unlike `transform: scale`); Baseline 2024.
- Android window size classes ✓ — landscape phones are compact height; FHD+ phones are 1080 × 2400 physical, QHD+ 1440 × 3200.

Yes, a phone can match. Any Android phone with a 1080-pixel short side (the majority: 1080 × 2400/2340/2412) rotated to landscape reports `screen.height × dpr = 1080` in Chrome and in the Capacitor WebView → the app shrinks to 0.9 in landscape and snaps back to 1.0 in portrait, on every rotation, with a full relayout. Every 1440-wide flagship (Galaxy S Ultra, Pixel Pro at native resolution) gets 1.1 in landscape. 1920 × 1080 Android tablets and Chromebook tablets get 0.9 in landscape permanently. iOS never matches (portrait-fixed values, 1170–1320 short sides). Also on Android, the soft keyboard opening fires `resize` → the function re-runs (harmless today, but that is the moment a wrong tier would flip mid-typing).

SPEC — density-zoom guard: the tier applies only when ALL hold: `matchMedia('(hover: hover) and (pointer: fine)')` (a mouse-class device), physical dimensions ≈ 1920 × 1080 or ≈ 2560 × 1440 checked on BOTH axes using `min(screen.width, screen.height) × dpr` as the short side regardless of orientation. Otherwise `--app-zoom: 1`. Touch devices therefore never zoom; a 27-inch monitor plugged into a phone (DeX) still falls in the mouse branch. Keep the `/var(--app-zoom)` viewport-unit rule (inert at 1). Must not: add a phone tier "to fit more"; use `zoom` for density on touch (it scales targets below 44 px).

## 9. Landscape and large font (font scaling / page zoom 130–200 %)

Findings
- WCAG 1.3.4 Orientation ✓ https://www.w3.org/WAI/WCAG22/Understanding/orientation.html — "Content does not restrict its view and operation to a single display orientation"; wheelchair-mounted devices.
- ScientiaMobile MOVR ✓ https://scientiamobile.com/smartphone-vs-tablet-orientation-whos-using-what/ — 6–6.5″ phones "91% portrait usage"; landscape use rises ~34 % on 7–8″ tablets.
- Android window size classes ✓ — compact height < 480 dp = "99.78% of phones in landscape"; a 390 × 844 phone in landscape is 844 wide = MEDIUM width class: width-only breakpoints would hand it the tablet layout.
- WCAG 1.4.4 Resize Text ✓ https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html — 200 % "without loss of content or functionality"; full-page zoom counts; no clipping at any step.
- WCAG 1.4.10 Reflow ✓ https://www.w3.org/WAI/WCAG22/Understanding/reflow.html — no 2-D scrolling at "320 CSS pixels" width; exceptions "data tables, images, maps, diagrams … interfaces requiring persistent toolbars".
- Apple HIG Accessibility ✓ — "Support text enlargement by at least 200%"; Typography ✓ — "keep primary elements toward the top of a view even when the font size is very large".
- Android 14 non-linear font scaling ✓ https://developer.android.com/about/versions/14/features — "font scaling up to 200%"; "large text doesn't scale at the same rate as smaller text"; "Don't use sp units for padding or define view heights assuming implicit padding" — in the Capacitor WebView, text grows but paddings don't.
- Chrome Android help ✓ https://support.google.com/chrome/answer/96810?co=GENIE.Platform%3DAndroid — the accessibility control is now a "Default zoom" slider ("text, image, and video sizes") plus "Force enable zoom". PayPal engineering on text resizing per browser ◦ (WebView text inflation after computed values; margins/paddings untouched).
- Roselli, don't disable zoom ✓ https://adrianroselli.com/2015/10/dont-disable-zoom.html — never `maximum-scale=1` (ours is 5: fine); "most user agents now allow users to always zoom".
- MDN text-size-adjust ✓ https://developer.mozilla.org/en-US/docs/Web/CSS/text-size-adjust — inflation is applied by mobile browsers to text that "uses 100% of the screen's width"; set `-webkit-text-size-adjust` explicitly; "Limited availability".
- CSS-Tricks 16 px inputs ✓ https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/ — "as soon as the font-size is 15px or less, the viewport will zoom into that input" (the app applies 16 px below `md` only; the phone line is `lg`).
- Josh Comeau ✓ — media queries in rem so a large default font gets the phone layout on a laptop.

SPEC — landscape: never lock orientation (1.3.4); phone landscape is detected by HEIGHT — every phone rule in this file is gated `(max-width: 37.5rem), (max-height: 30rem)` — so an 844 × 390 landscape phone keeps phone type/targets/2-up tiles rather than inheriting a tablet layout; in compact height the vertical rhythm compresses (card padding 12, section gap 16, top bar scrolls away — family A), type does not change. Large font: the layout must survive 320 CSS px with no horizontal scroll (1.4.10) — that is 200 % zoom on a 640 px tablet and ~120 % on a 390 px phone — so: 2-up tiles hold to 320 (label budget §4) and never go 1-up by JS; all row/tile/chip heights are `min-height`, never `height`; captions wrap, nothing clips (`overflow: hidden` only with `text-overflow` AND a reveal); bars use `min-height` + safe-area padding; real `<table>`s are the only allowed 2-D scroll (reflow exception) and must keep the frozen first column (NN/g). Set `html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }` so orientation changes never inflate text on their own. Inputs 16 px below `lg` (not `md`). Test matrix: iOS « aA » 150 % and 200 %, Android « Default zoom » 150 %, Android system font 200 % in the Capacitor build, 320 × 568 viewport. Must not: px media queries for the phone/tablet line (rem — Comeau); fixed-height rows; `user-scalable=no`.

## 10. Skeletons and loaders

Findings
- NN/g skeleton screens ✓ https://www.nngroup.com/articles/skeleton-screens/ — none under 1 s; skeletons "better when the full screen is loading", spinners for "a single module"; boxes "mimic the structure of the final page"; frame-only skeletons make users think the page is broken; > 10 s → progress bar.
- web.dev content-visibility ✓ https://web.dev/articles/content-visibility — `content-visibility: auto` skips off-screen rendering ("232ms to 30ms"); needs `contain-intrinsic-size` (or `auto`) to avoid scrollbar jumps.
- Ström ✓ — temporal density: "the amount of things a user can do in a given amount of time" — loading time is density too.
- Current: `Skeleton` = pulsing `surface-3`, `motion-reduce:animate-none`; `SkeletonRow` h-11 (44), `SkeletonCard` p-6, `SkeletonChart` h-48; StatTile skeleton h-9 w-16.

SPEC — phone skeletons mirror the phone spec exactly: row skeleton 48 tall (64 for tall rows), 2 text bars (15 px and 12 px tall), tile skeleton = label bar 12 × 80 + value bar 36 × 64 in a 2-up grid, card skeleton p-4, chip skeleton 24 × 72 pill; opacity-only pulse, off under reduced motion (already); show nothing under 300 ms (motion-spec; NN/g's 1 s ceiling), never a spinner for a whole page, a determinate bar for uploads > 10 s. Long record pages (8 step papers) get `content-visibility: auto; contain-intrinsic-size: auto 480px` on each paper below the first so the phone paints the first screen only. Skeleton frames are solid paper, never glass (already). Must not: frame-only skeletons; skeleton heights that differ from the loaded row (layout shift); shimmer gradients wider than the tile.

## 11. French label length (cross-cutting)

Findings
- W3C, text size in translation ✓ https://www.w3.org/International/articles/article-text-size/ — English → European languages: up to 10 chars "200–300%", 11–20 "180–200%", 21–30 "160–180%", 31–50 "140–160%", over 70 "130%"; French "consultations" for "views" = 2.6×; "the smaller the English text, the more likely it is to be squeezed into a small space".
- LocaleProof ✓ https://localeproof.com/blog/text-expansion-by-language/ — French "+15–20%" on average; "Reserve 35–50% for short labels. Navigation, tabs, buttons"; "Let containers grow. Auto-layout with hugging beats fixed widths for buttons and chips."
- Mozilla FR style guide ✓ https://github.com/mozfr/besogne/wiki/Guide-stylistique-pour-la-traduction — accented capitals always ("y compris la préposition À"); espace insécable before « : ; ! ? » — a French label carries extra glyph width AND a non-breaking space that cannot wrap.
- NN/g ✓ — for mobile "be even briefer".

SPEC — label budgets on the phone (the app is French-only, so the budget is the French string itself, not an English one plus 30 %): tile label ≤ 16 characters (2 words), bottom-bar word ≤ 10, chip ≤ 18 / 2 words, button word ≤ 14, row primary line ≤ 34 characters at 15 px on 320 (≈ 30–40 ch measure). Prefer « En retard » inside a block already titled Dossiers over « Dossiers en retard » (no repeated titles — blueprint §4). Never abbreviate with a full stop mid-word in a chip; never drop the accent on a capital; keep the insécable before « : ». Containers hug content with `min-width`, never `width`.

## Contradictions and how I resolved them

1. 24 (WCAG AA) vs 44 (Apple, WCAG AAA) vs 48 + 8 (Material, web.dev): 48 for rows and primaries, 44 for secondary/inline controls, 24 only for the × inside a chip. Hoober's 12 mm corners → 48 for corner icon buttons.
2. Body 16–17 (Apple Body, Smashing rule of thumb) vs 14 (M3 body-medium, our desktop): 15 — Apple's own list secondary size, Butterick's lower bound, and it keeps the "below 14 is hard" line unbroken; prose is not this app's job.
3. "Single column on mobile" (datawirefra.me, growth-onomics, AWS) vs our 2-up KPI strip: single column is for chart cards; 2-up count tiles are legible to 320 px and are the cure for the brief's "list below the fold" complaint. Anything with a meter or a chart is 1-up.
4. Apple "avoid an app-specific appearance setting" vs the owner's light-by-default / no-system-vote ruling: the owner ruling stands (locked); the phone dark rules only tighten contrast.
5. MDN "text-size-adjust: none" for responsive sites vs 100 %: 100 % — same effect on inflation, without the risk of a WebView ignoring user zoom.
6. Density: HN "mobile friendly wastes space" vs Cloudscape "always default to comfortable": comfortable = 48 rows on touch is not padding, it is the finger; the repo's 40 px compact tier stays desktop-only.
7. Apple 11 pt floor vs Lighthouse 12: 12 for words, 11 for digit pills.
8. Osmani/Hoober "avoid the thumb-zone dogma" vs Apple/UXCam "middle or bottom is easier": both — primaries in the lower half, but nothing depends on a particular grip.
9. Pencil & Paper "encourage landscape for charts" vs no charts on phones: moot; landscape is supported but not invested in beyond compact-height rhythm.

## Do-not list

- No phone type below 12 px for words, 11 px for digits; no light weights; no uppercase words.
- No `height:` on rows, tiles, chips, bars — `min-height` only (font scaling).
- No blur on cards, sheets, scrims or the drawer on a phone; no grain below `lg`; no glass on glass.
- No hover-only affordance (tooltips, row clusters) as the only path to an action.
- No icon-only control outside the six glyphs.
- No `…` truncation with a `title` as the reveal; no clipped captions.
- No 4-up tiles, no donut/pie, no line chart, no 28 px figure tier, no Outfit digits.
- No width-only breakpoint for phone rules (add the ≤ 30 rem height query); no px media queries.
- No `--app-zoom` tier on a touch device; no new tiers.
- No 20 px paddings, no 12 px page margins, no per-element margins.
- No frame-only skeletons; no whole-page spinner.

## Open questions for the owner

1. 15 px body on phones makes the app read slightly "bigger" than the desktop density; accept, or hold 14 (M3 floor) and rely on user zoom? (My call: 15.)
2. Grain off below `lg` — a visible departure from « like Markazi » on phones; confirm.
3. Dark-mode captions in `ink-2` on phones only — or app-wide?
4. Keep the hero 48 tile on phones (1-up) or demote it to 36 so the stat row is uniform?
5. Density guard: mouse-class + both dimensions — or the simpler rule "no density zoom under 1024 px wide"?
6. Phone "compact" density (44 px rows) as a Profil option, or phones get comfortable only?
7. Label budgets imply renaming a few tiles/segments (e.g. « Planifications à venir » → « À venir » inside its block); do you want that copy pass now or with family B?
