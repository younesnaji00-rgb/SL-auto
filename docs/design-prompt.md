# UI/UX working prompt — paste at the start of any Claude session

You are working on UI/UX with me. Everything below was learned from real iterations; treat it as settled. Follow it before your own defaults.

## 1. How to work with me

1. **Research every element before building it.** For each element you create or restyle (KPI tile, card, table, list, form, stepper, tabs, button, empty state, chart, dialog…): name the element and its job on the screen, read 2–3 published design systems' guidance for that element (see §6 for which), write a one-paragraph spec (anatomy, states, density, what it must not do) with sources, then build. Applying tokens page-wide without this is a "re-skin" and I will reject it. When you delegate to agents, put this rule in their prompt and require their sources in the report.
2. **Research the whole page, not just its parts:** layout, navigation (tabs vs. one page, what stays visible), spacing, colour roles, typography, sizing. If I ask "did you research X?", answer per dimension honestly — say which ones you did not — and research the gaps before proposing.
3. **"Find out the best way" means: options, not code.** Give me 2–4 options per question in plain language, each as a before → after scenario I can picture, recommended option first and marked. Then wait for my choice. No jargon, no vague summaries; if I say it's too technical, rewrite it for a non-designer.
4. **Keep the original layout.** Unless I ask for a new layout, restyle elements in place; never rearrange, merge, or replace a page's structure (e.g. never turn a card grid into rows). If a pass goes wrong, revert to how it was and redo it one element at a time.
5. **Never invent design.** Every choice cites a published system (NN/g, Material 3, Apple HIG, Carbon, Polaris, GOV.UK, Stephen Few, Refactoring UI, Kanban flow metrics…). No hand-picked hues, no made-up sizes.
6. **One page at a time**, on my go-ahead. Report what you changed, what sources you used, and what you could not verify (e.g. no authenticated screenshot). Never claim it's verified when it isn't.
7. **UI strings in French** (Moroccan context: phone format +212; no generic placeholder names — leave inputs empty or use a format cue). Multi-user, multi-resolution: responsive is non-negotiable.

## 2. Colour

- **60 / 30 / 10 + one warm third colour.** Canvas = warm cream, one shade deeper than paper; paper/cards near-white; surface ladder in 3 steps; ink is a navy-black ladder (`ink` values/titles, `ink-2` secondary, `ink-3` labels/captions ≥ 4.5:1, `ink-4` decorative only). Accent = deep teal; third colour = terracotta.
  Reference tokens (HSL): background `42 24% 94.5%`, card `45 30% 99.4%`, surfaces `40 20% 93.5% / 40 18% 90% / 40 16% 87%`, ink `215 38% 14% / 215 20% 32% / 215 15% 42% / 215 12% 66%`, primary `178 60% 24%`, accent tint `172 45% 86%`, tertiary `16 50% 44%`, hairline `40 16% 88%`.
- **Accent budget:** primary action, active nav item, links, focus ring. Headings are ink. Nothing else is teal.
- **Third colour placement:** one featured card, the "next event" date block, ordinal medallions, one chart series. Never on actions, never near status/destructive UI, never on the sidebar/header, never on a whole row of KPI tiles.
- **No coloured chrome:** sidebar and header stay on the cream ladder.
- **Status colours are reserved** (success/warning/danger/info as soft-bg + dark-fg pairs, ≥ 4.5:1) and ship with an icon or label, never colour alone.
- **One exception colour per dashboard** (Few): magnitude bars use the accent hue, never status green; amber/red appears only where there *is* an exception; a zero is plain ink, never green. One colour system per table — no heat-map behind a cell that also shows a coloured count.
- **Charts** (dataviz rules): categorical hues in fixed order (teal · terracotta · indigo · plum · olive), validated for colour-blindness in light and dark; one hue for magnitude; pie ≤ 6 segments + "Autres"; legend always present for ≥ 2 series; text in ink tokens, never series colour; never a dual axis.

## 3. Typography

- Two faces: one display face for titles (Outfit), one UI face for everything else (Inter). Floor 11 px.
- Scale: page title 28/600 display · card/step title 20/600 display · block title 15/600 · body 14/400 · dense lists 13 · caption 12/400 ink-3 · **labels 12/400 sentence case ink-3 — never uppercase** · mono 13 tabular for refs/plates/ids.
- **Labels quiet, values the star:** field values 14/600 ink (Refactoring UI).
- **Figures:** headline stat tiles 36 px, detail/step tiles 24 px, one hero ≥ 48 px per view at most; always the UI sans, semibold, proportional digits — never the display face on a number; tabular digits only in columns.
- No repeated titles: the step/tab label already names the content.

## 4. Spacing, sizing, density

- Card padding 24; **tile padding 16** (dense KPI/stat grids); nothing at 20. Field rows 16 apart; gutters 16; sections 32; section headers 48. Spacing comes from the parent `gap`, never per-element margins.
- Tile grids end on a full row (10 tiles → 5 × 2 from 1280 px, never 4 + 4 + 2).
- Context column (right, ≥ xl, 280 px): flat blocks, label headers, hairline-separated rows, a hairline between blocks, nothing wider than the column.
- Tables: 44 px rows (36 compact), 16 px cell padding, numbers right-aligned with tabular digits and **headers aligned with their data (never centred)**, text left, first column frozen when wider than the screen, sticky header, hover tint, no zebra.
- **Density zoom:** `html { zoom }` = 0.9 on 1080p, 1.1 on 1440p, 1.0 elsewhere, keyed on physical screen height, fixed tiers; CSS zoom does not scale viewport units, so every vh/svh/vw divides by the zoom; print resets to 1.
- Dialogs become bottom sheets below `lg`; inputs ≥ 16 px below `md`.

## 5. Surfaces, depth, components

- **Glass = edge, not fill.** Cards/dialogs/bars are near-opaque paper with backdrop blur, a light rim (1 px inner highlight top + faint outer shadow) and a soft panel shadow. **No ambient gradient or mesh** behind the page, no gradients on buttons, no coloured background swap for the active item. Nested cards go solid. Honour reduce-transparency.
- **The light rim goes on everything raised:** every button, icon button, step pill, date block, socket, tile.
- **Buttons:** filled (accent) · destructive · tonal (accent tint — the strongest control inside a section that isn't the page primary) · outline · secondary · ghost · link. Hover = brightness 1.06, press 0.94. A section's CTA is filled while its job is undone and tonal once done; full size (40 px), placed where the eye lands (right end of the toolbar). No decorative "AI"/sparkle icons on CTAs.
- **File pickers:** one plain button that is also a drop target; no banners, no dashed panels, no copy.
- **Document sockets:** filled = raised tile; empty = dashed recessed socket (the only "drop here" cue); locked = near-white + faint solid hairline + lock (never grey, never dashed). Files of one socket are pages of one document.
- **Lists of events:** hairline rows; the date block is the anchor (tinted + rim; the next event gets the third colour); labels quiet, values bold; all details in the row, no dialog.
- **Tabs:** underline tabs (active = ink + 2 px accent underline). Tabs are right for parallel views with 1–2-word labels; never make the reader switch tabs to compare — put shared summary numbers above the tabs. Put the selected tab in the URL.
- **Dashboards:** filters → headline row (≤ 5–7 numbers: throughput, SLA %, WIP, exceptions) → detail tiles → exceptions list ("À traiter") above trends → cycle time → weekly trend. Every period-bound caption prints the real range ("· 1–7 sept."), never "· période". Tiles open a drawer; drawer rows deep-link to the record step.
- **Record pages:** horizontal stepper bar everywhere (no vertical side stepper, no fisheye), GOV.UK-style rail + whitespace between steps, uniform paper cards, an "À faire" box in the right column listing missing fields/pieces/next action with deep links; `#step-N` anchors.
- **Empty states:** icon + one line + the action; no dashed panel.

## 6. Which sources for which element

- Dashboards, KPI tiles: Stephen Few (summary + exception on one screen; colour rules), NN/g dashboards, Carbon tiles/data-viz, Kanban flow metrics (WIP, cycle time, throughput, ageing), the dataviz stat-tile contract.
- Tables: Polaris data table, Carbon data table, NN/g data tables.
- Tabs/navigation: NN/g "Tabs, Used Right", NN/g sticky headers, Apple HIG segmented control.
- Buttons/emphasis: Material 3 (filled/tonal), GOV.UK ("the primary is the next thing to do").
- Steppers/task lists: GOV.UK task list, Carbon progress indicator.
- Type/spacing: Material 3 type scale, Carbon spacing scale, Refactoring UI, Apple HIG label tiers.
- Surfaces/glass: Apple HIG Materials, Material 3 tonal surfaces.
- Forms/labels: NN/g form design, GOV.UK forms.
- Charts: the dataviz method (form first, colour last, validate the palette).

## 7. Anti-patterns I have already rejected — do not re-propose

Navy sidebars/headers or any navy surface · ambient gradient/mesh · gradients on buttons · chrome-only glass · fisheye/pointer-tracking steppers · vertical side stepper · thick dark separators · background swap on the active step · rows/matrices replacing card grids · auto-opening panes · upload banners/dashed drop panels · uppercase labels · repeated titles · duplicated primary actions · sparkle icons on CTAs · third colour on the sidebar · a whole KPI row in the third colour · green on every "good" bar · green zero on an exception tile · heat-maps behind cells with coloured counts · centred numeric columns · one type size for title, headline and detail figures · 20 px tile padding · "· période" captions · headline KPIs hidden inside the first tab · generic placeholder names · French phone formats.

## 8. Report format

For each element: name → job → sources (2–3) → spec → what you built → what is not verified. Plain language, short. If I ask a question rather than requesting a change, answer it and stop — don't build until I choose.

## 9. Addendum 2026-09-02 — theory-pass rulings (element-specs "addendum ter")

Five research rounds (practitioner/theory sources; full reports in `docs/research/`) added these binding deployment rules — they extend, not replace, the above:

- **Tabs correction:** the underline idiom in §5 is superseded — every tab strip is a raised tab on a recessed `surface-2` track with the tab-slope anatomy and seat morph (`components/ui/tabs.tsx`); local tablist copies are banned.
- **Tables:** hairlines + no zebra is empirically validated (A List Apart ×2). Default sort on a queue = most-action-needed (deadline ascending under an SLA), never newest-first. Sort lives in the column header. Queues never paginate: ≤ ~100 rows show everything; overflow = cap + « Afficher plus (n restants) » + honest total. Frozen identifier column (soft edge shadow, not a border seam) whenever the table pans; the identifier is the row's only bold cell (emphasis budget: identifier + status, 2 cells max). Truncate predictable strings with `title`; live search from the 2nd character.
- **Colour:** colour only with a communication goal (Few); terracotta's power is exclusivity — one stray warm element kills the pop-out. Soft-bg chip = passive state; solid = blocking urgency only. Hover tints = brightness ↓ + saturation ↑, never lighten toward grey; text on a tint is dark ink of the same hue.
- **Hierarchy:** three levels of dominance per view; de-emphasise instead of amplifying; text levers in order ink-value → weight → size; 80 % of fixation is left-of-centre (identifiers left); destructive actions get quiet styling + spatial quarantine.
- **Type/spacing:** 600 is the emphasis weight at 12–14 px (700 only ≥ 20 px); reading prose steps up to 15–16 px; outer padding ≥ inner padding; fr numbers = comma decimals, nbsp thousands, symbol after ("12 500,00 MAD").
- **CRUD/intuitiveness:** actionable elements look actionable at rest (no hover-only row actions); destructive friction ladder — undo-toast for the trivially re-creatable (jours fériés), named-object confirm for consequential (users), disabled-with-reason for the impossible (last Admin); role capabilities described in plain French at the point of assignment; feedback ≥ batch-length shows percent-done, not a spinner.
