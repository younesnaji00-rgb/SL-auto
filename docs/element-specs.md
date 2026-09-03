# Element specs — researched contracts for every element class

Written 2026-09-01 for the app-wide element-by-element pass. Each entry is the
paragraph the working prompt (§1 rule 1) requires BEFORE building: the element's
job, 2–3 published sources read for it, the derived spec (anatomy · states ·
density · must-not), and how it maps to this repo's tokens/primitives. Page
passes cite these entries by number and add page-specific research only for
elements that are not here.

Sources fetched 2026-09-01 (marked ✓) or cited from the published text without a
live fetch today (marked ◦ — the site is JS-rendered and would not serve text):
NN/g data tables ✓ · NN/g Tabs Used Right ✓ · NN/g web-form design ✓ · NN/g
empty states ✓ · NN/g sticky headers ✓ · NN/g cards component ✓ · NN/g
indicators/validations/notifications ✓ · NN/g skeleton screens ✓ · NN/g date
input ✓ · NN/g password masking ✓ · NN/g dashboards (preattentive) ✓ · GOV.UK
button ✓ · GOV.UK text input ✓ · GOV.UK task list ✓ · GOV.UK summary list ✓ ·
GOV.UK create accounts ✓ · Carbon tile ✓ · Carbon data table ✓ · Carbon tag ✓ ·
Carbon notification ✓ · Carbon progress indicator ✓ · Carbon spacing scale ✓ ·
Polaris data table ✓ · Polaris empty state ✓ · Polaris filters ✓ · Polaris page
✓ · Material 3 cards ✓ · Material 3 dialogs ✓ · Material 3 lists ✓ · Apple HIG
segmented controls ✓ · Apple HIG sidebars ✓ · Apple HIG toolbars ✓ · Apple HIG
materials ✓ · Apple HIG typography ✓ · dataviz skill (stat tile / hero figure /
marks) ✓ · Material 3 buttons ◦ · Material 3 chips ◦ · Stephen Few, *Rules for
using color* ◦ (PDF not text-extractable today; rules as recorded in the
blueprint §1) · Refactoring UI ◦ (book).

Tokens and primitives referenced: `globals.css` (`.t-*` type roles, `.glass`/
`.paper`, `--rim-*`), `tailwind.config.ts` (`shadow-rim`, `shadow-rim-filled`,
`ink-*`, `surface-*`, `status-*-bg/fg`, `tertiary-*`), `components/ui/*`.

---

## 1. Page header
**Job:** say where the reader is and offer the one thing to do next.
**Sources:** Polaris Page ✓ ("organized around a primary activity… provide it as a primary button in the page header"; titles "describe the page in as few words as possible", list pages use the plural object, never truncated; "always provide breadcrumbs when a page has a parent"); GOV.UK button ✓ ("avoid using multiple default buttons on a single page"); Atlassian page header ✓ (title + optional breadcrumbs, buttons, search, filters).
**Spec:** `<PageHeader>` only: title `t-display` 28/600 Outfit (compact `t-title` on record pages), optional count pill, `meta` chips, ONE filled button at the right end of `actions` (others `outline`/`ghost`/⋯ menu), then `tabs` row, then `filters` row. Verb+noun labels ("Créer un dossier"), sentence case. No page-specific action in the top bar. Must not: two filled buttons; icon-only primary; title repeated in the body.

## 2. Filter toolbar
**Job:** narrow a list without hiding what is applied.
**Sources:** Polaris filters ✓ (search field "clearly labeled", ≤ 2–3 promoted filters, applied filters as chips grouped by category, clear-all; avoid "Enter text here"); NN/g filter categories ✓ (order by importance, general → specific; values in a predictable order); Carbon data table ✓ (toolbar holds ≤ 5 global actions, search below the title; overflow beyond that).
**Spec:** one row directly above the list: search input first (`Input` with a leading icon, placeholder = format cue only, e.g. "Réf., assuré, plaque…"), then ≤ 3 selects/date range, then applied-filter chips (`Badge neutral` with ×) + "Effacer" link at the end; sort lives in the column header, not the toolbar. Wraps on narrow widths; inputs ≥ 16 px below `md`. Must not: filters inside the table header; a filled button in the toolbar (the page primary is in the header); uppercase labels.

## 3. Data table
**Job:** compare many homogeneous records by attribute.
**Sources:** Polaris data table ✓ ("numerical data right aligned, textual left, headers must align with their related data, don't center align"; consistent decimals; totals row displays only; fix the first column when many columns); Carbon data table ✓ (five row sizes; header row matches the row size; only the sorted column shows its icon; overflow menu persistent per row; skeleton instead of spinner); NN/g data tables ✓ ("freeze header rows and header columns if the table is larger than the screen"; first column = human-readable identifier; hover highlight; batch actions via checkboxes above the table; only 1–2 inline row actions).
**Spec:** `components/ui/table.tsx` as is: 44 px rows (36 compact), 16 px cell padding, sticky `bg-card` header with `t-label` heads, hairline rows, hover `surface-2`, no zebra, no vertical rules. Text left, numbers right with `tabular-nums` and the header aligned the same way; refs/plates `t-mono`; the first column is the human identifier and is frozen (`sticky left-0 bg-card` + hairline) when the table can overflow; row = link, chevron or ⋯ menu at the row end (Supprimer last, red). Status as a status-pair chip (§11), never colour on the whole row. Loading = a row-shaped skeleton (§15). Must not: centred numeric columns; heat-map fills; icons-only headers; a third colour system in cells.

## 4. List rows (records, events, history)
**Job:** scan heterogeneous items where one line per item is enough and a table would over-structure it.
**Sources:** Material 3 lists ✓ (container + label text required; supporting text, leading avatar/icon, trailing text/icon; "limit dividers to uncontained lists, only when stronger separation is necessary"); NN/g cards ✓ ("for homogeneous content use a standard vertical list" — cards are for heterogeneous browsing); GOV.UK summary list ✓ (key/value rows, borders connect a row to its action).
**Spec:** rows of 44–56 px (one-line 44, two-line 56) separated by hairlines only, 16 px horizontal padding, leading anchor (date block / avatar / icon 36–40 px, `bg-surface-3` + `shadow-rim`; the *next* event's date block is terracotta `bg-tertiary text-tertiary-foreground shadow-rim-filled`), headline `t-body` 600 ink, supporting `t-caption`, trailing value/chip/⋯ at the row end, whole row clickable when it opens something. Everything the reader needs is IN the row (no dialog to read details). Must not: card-per-item; boxes inside rows; date in the third colour on more than one row; dividers *and* gaps.

## 5. Content card
**Job:** group a few related pieces of one topic (a form section, a summary, a chart).
**Sources:** Material 3 cards ✓ (container is the only required element; elevated/filled/outlined are stylistic; "filter or sorting options placed outside the card collection"; "under 600dp consider swapping cards for lists"); NN/g cards ✓ (a card = "a container for a few short, related pieces of information"; whole card clickable when it links); Carbon tile ✓ ("do not add a drop shadow to tiles to reveal secondary information"; do not mix tile variants in a group; ≥ 2:1 aspect).
**Spec:** `<Card>` default (glass edge: `.glass`, no Tailwind `shadow-*`), padding 24 (`p-6`), title `t-heading` 15/600 or `t-title` 20/600 for a step/group, 16 px between blocks inside, sections 32 apart on the canvas. Inside another glass surface it flattens to solid card automatically. Radius 12 outer → inner elements 10 max. Must not: nested tonal cards; 20 px padding; a card around a single table (the table sits on the canvas or in the card *without* a second frame); repeated title inside.

## 6. KPI / stat tile
**Job:** one number the reader acts on, with its label and (optionally) its change and its exception.
**Sources:** dataviz stat-tile contract ✓ (label sentence case no colon · value in the UI sans semibold, proportional digits · optional signed delta vs a named period · optional sparkline; hero ≥ 48 px, exactly one per view; "never a display or serif face"); Carbon tile ✓ (padding from the spacing tokens, content-driven height, no decorative shadow); NN/g dashboards ✓ ("at-a-glance, single-screen"; length/position over area; colour for categories only); Few (blueprint §1: bright colour only to highlight an exception; a zero is plain ink).
**Spec:** tile padding 16, `t-label` on top, value 36 px (headline row) or 24 px (detail tiles) in Inter 600 proportional, optional caption `t-caption` printing the real range ("· 1–7 sept."), optional meter on a `surface-3` track filled with `chart-1`; amber/danger pair only when there IS an exception; whole tile clickable when it opens a drawer/list. Grids end on a full row (2/3/5 columns by breakpoint). Must not: Outfit on the number; a whole row in terracotta; green "good" bars; 20 px padding; "· période".

## 7. Tabs & segmented control
**Job:** tabs switch parallel views of ONE thing; a segmented control picks one of 2–5 exclusive options that change the data (period, view).
**Sources:** NN/g Tabs Used Right ✓ ("when users don't need to simultaneously see information under different tabs"; short labels; no ALL CAPS; single row; "at least two selection indicators"; panel visually connected; tab list above the panel); Apple HIG segmented controls ✓ (closely related, mutually exclusive choices; not for navigation or actions; all-text or all-icon; equal widths; selected state distinct).
**Spec:** tabs = `components/ui/tabs.tsx` underline tabs: 40 px, `t-body-sm`/500, active = ink text + 2 px `primary` underline (two indicators: colour + underline), inactive `ink-3`, hairline under the list, selected tab in `?vue=` via `history.replaceState`; shared summary numbers ABOVE the tabs so nothing must be compared across tabs. Segmented = equal-width segments in a `surface-2` track, selected = `bg-card shadow-rim text-ink`, 36 px, labels ≤ 2 words. Must not: pill/boxed tabs; tabs as page navigation; KPIs inside the first tab only; mixing text and icon segments.

## 8. Buttons & emphasis
**Job:** make the next thing to do obvious and everything else quiet.
**Sources:** GOV.UK button ✓ ("use a default button for the main call to action on a page"; "avoid multiple default buttons"; warning buttons only for irreversible destruction; "disabled buttons have poor contrast… avoid them"; verb labels in sentence case); Material 3 buttons ◦ (emphasis ladder filled › filled tonal › outlined › text; one high-emphasis button per screen; 40 dp height); Apple HIG toolbars ✓ ("prefer simple, recognizable symbols… except for actions like edit that aren't well-represented by symbols"; trailing edge = important items).
**Spec:** `Button` variants only: `default` (page primary, one per screen) · `tonal` (strongest control inside a section that is not the page primary; also a section CTA once its job is done) · `outline` · `secondary` · `ghost` (icon buttons, row actions) · `destructive` (only irreversible) · `link`. All carry the rim; hover brightness 1.06, press 0.94; 40 px default, 36 `sm` only inside dense rows/toolbars; leading icon 16 px; labels verb + noun, sentence case, no sparkle/AI icons. CTA placement: right end of the toolbar/header (where the eye lands). Disabled only when research says so; prefer enabled + inline validation. Must not: two filled buttons in view; outline/small for a CTA; gradients; coloured text buttons other than `link`.

## 9. Forms & fields
**Job:** collect data with the fewest errors.
**Sources:** GOV.UK text input ✓ ("all text inputs must have labels… visible", label above, hint between label and input "a single short sentence, without full stops", placeholders "vanish when the user starts typing", size fixed-width inputs to known lengths); NN/g web-form design ✓ (single column; labels above; avoid placeholder text; field width matches the input; mark optional fields; inline errors "outline the field AND red text AND heavier font"; one clearly labelled submit, no reset).
**Spec:** `Label` (`t-label` 12/400 sentence case ink-3) above each field, 4 px to the control, rows 16 apart, single column (short related fields may share a row: code postal / ville); `Input` 40 px flat (hairline `input` border, solid `bg-card`, no rim), 16 px text below `md`; hint `t-caption` between label and field; placeholder only as a FORMAT cue ("+212 6 12 34 56 78", "JJ/MM/AAAA") — never a sample name; optional fields marked "(facultatif)"; errors inline under the field with icon + `status-danger-fg` text + `aria-invalid` border; submit = one `default` button at the form's end (left-aligned in a GOV.UK single-column form, right end in a dialog footer). Read-only view of the same data = §10. Must not: uppercase labels; placeholder-as-label; French phone formats; two-column dense forms; a card per field.

## 10. Definition / summary list (read-only record)
**Job:** show key facts of one record for reading and checking.
**Sources:** GOV.UK summary list ✓ ("a list of key facts… key, value, optional actions"; not for tabular data; missing values get the action in the value column; borders connect rows to their actions); Refactoring UI ◦ (labels secondary, values primary — "labels are the last thing to emphasise").
**Spec:** `<dl>` rows: `t-label` key over (or beside, ≥ md, in a 2–3-column grid `gap-x-6 gap-y-4`) a value `t-body` 600 ink; empty = "—" in ink-3 (never a fake value); rows 16 apart; an optional "Modifier" `link` at the row end; groups titled by a `t-heading` with a hairline header when there are several. Must not: label and value the same weight; boxes per pair; uppercase keys; beige bands.

## 11. Status chips & badges
**Job:** name a state so it can be scanned; never colour alone.
**Sources:** Carbon tag ✓ (read-only tags for categorising; "use colours to help distinguish between categories… do not use the same colour for every tag" when they are categories; sizes sm/md/lg); Carbon notification ✓ (status colour always with its status icon); dataviz ✓ ("status colours are reserved… ship with an icon + label, never colour alone"); Few (colour only where there is an exception).
**Spec:** `Badge` status pairs (`success/warning/danger/info/neutral`): 11 px/500 pill, soft bg + dark fg (≥ 4.5:1 both themes), text label always, optional 12 px leading icon; the same state always maps to the same pair app-wide (one helper per domain, e.g. `statusChip(status)`); neutral for informational categories; count pills = `bg-surface-3 text-ink-2 tabular-nums`. Must not: hand-picked `emerald-/amber-/red-` classes; colour on the whole row; terracotta on a status; a dot without a label.

## 12. Empty state
**Job:** say what would be here, why it isn't, and what to do.
**Sources:** NN/g empty states ✓ (state + reason + "direct pathways to getting started"; never misleading "no records" while loading); Polaris empty state ✓ (heading leads with a verb, one primary action, conversational one-line description; illustration decorative only).
**Spec:** `EmptyState`: icon 20 px in a 40 px `surface-2` disc, title `t-heading` (verb-led when there is an action: "Créer le premier tampon"), one line `t-caption` giving the reason ("Aucun dossier pour cette période"), ONE action (`tonal` inside a card, `default` only if it is the page primary and the header has none). No-results (filtered) variant says which filter to clear. Must not: dashed panel for a plain empty list (dashed is the drop-here cue — use `dashed={false}` inside cards; the standalone dashed frame is reserved for drop targets); a paragraph of copy; two buttons; a spinner-looking placeholder.

## 13. Dialog & sheet
**Job:** a short, focused decision or edit that must finish before continuing.
**Sources:** Material 3 dialogs ✓ ("the confirmation button is always closest to the edge", dismissive to its left, max two actions, headline "brief, clear… avoid apologies, alarm, or ambiguity", "full-screen dialogs are for compact breakpoints only"); NN/g indicators/validations ✓ (modal only for action-required, consequence-bearing events); Apple HIG materials ✓ (thicker material for legibility; don't stack materials).
**Spec:** `Dialog` = `.glass-strong` panel, scrim `--scrim` + blur; ≤ 560 px wide (`max-w-lg`) for forms, `max-w-md` for confirmations; bottom sheet below `lg` (blueprint); header = title `t-title` + optional one-line `t-caption`; body padding 24; footer right-aligned: [Annuler `outline`] [Confirmer `default`|`destructive`] — never more than two; a destructive dialog names the object ("Supprimer le tampon « X » ?") and its consequence. Nested surfaces inside are solid (`nested-solid` rule). Inputs inside are solid card. Must not: "Êtes-vous sûr ?" alone; three buttons; a dialog to *read* details that fit in a row (§4); toast for errors.

## 14. Notifications: toast · inline alert · callout
**Job:** feedback proportionate to urgency.
**Sources:** Carbon notification ✓ (toast = short, time-based, auto-dismiss ~5 s with a close button; inline persists "until the user dismisses them or takes action"; callout loads with the page and cannot be dismissed; every status has its icon: info/success/warning/error); NN/g indicators/validations/notifications ✓ ("a toast… would be a bad way to implement an error message"; validation next to the field, with instruction, icon + colour).
**Spec:** toast (`Toaster`) only for passive confirmations ("Tampon enregistré"), status pair + icon, 5 s, close button, bottom-right (`glass-strong`); inline `Alert` (status pair, icon, title + one line, optional action) at the top of the block it concerns for errors and blocking states, `role="alert"`; callout = `info` pair, no close, for standing guidance. Must not: errors in toasts; stacked toasts for one action; colour without icon.

## 15. Loading skeleton
**Job:** hold the page's shape while data arrives.
**Sources:** NN/g skeleton screens ✓ (mirror the final layout so users "build a mental model"; keep animation subtle; skeletons for 2–10 s loads); Carbon data table ✓ ("use skeleton states instead of spinners").
**Spec:** `loading.tsx` on `<PageSkeleton>`: header line (title width + action pill), then the primary block in ITS shape — table = header row + 6 rows at 44 px; tiles = the same grid; cards = the same columns; list = 6 rows at 56 px. Bars `bg-surface-3` rounded 6, pulse only (`animate-pulse`, respects reduced motion). Must not: a centred spinner; a skeleton whose layout differs from the page.

## 16. Stepper · progress · task list
**Job:** show where a linear process stands and what blocks it.
**Sources:** Carbon progress indicator ✓ (status indicator + label of "one or two words" + helper text for optional/error; states complete/current/not started/error/disabled; numbering "makes the progression more obvious"); GOV.UK task list ✓ (whole row is the link; status tag per task — Completed plain, Incomplete tagged, Cannot start yet; short headings per group).
**Spec:** horizontal bar everywhere (blueprint §5): 28 px medallions (✓ done / number / lock) + 1–2-word titles spread across the width, active = `primary` fill + `shadow-rim-filled`, done = ink-3 outline ✓, blocked = dashed + lock with a tooltip reason; details slide in horizontally on hover. Task list = rows (label link + status chip §11), 44 px, hairlines. Must not: vertical side stepper; scale/vertical motion; background swap on the active step; "Processing"-style vague labels.

## 17. Calendar / date grid (jours fériés, planning)
**Job:** pick or read dates near the present at a glance.
**Sources:** NN/g date input ✓ ("calendar pickers for events close to the present time — within less than a year"; show "today"; "spell out the name of the month"; disable impossible dates; typed input always allowed); Material 3 date pickers ◦ (month header with ‹ › navigation, weekday labels, 40–48 dp day cells, today outlined, selected filled, disabled muted, range highlighted).
**Spec:** month header `t-heading` ("septembre 2026", month spelled), ‹ › ghost icon buttons at the right end; weekday row `t-label`; 7-column grid of 40 px cells, `t-body-sm` tabular; today = 1 px `primary` ring; selected/holiday = `bg-accent text-accent-foreground` (one accent use), weekends `ink-3`, other-month days `ink-4`; below the grid the list of that month's entries as §4 rows (date block anchor). A typed date `Input` (JJ/MM/AAAA cue) accompanies any picker. Must not: terracotta for holidays (status/selection is not the third colour's job); a picker for far-past dates; colour-only markers.

## 18. Editor toolbars (devis editor, annotation editor)
**Job:** the current view's frequent commands, grouped, without crowding.
**Sources:** Apple HIG toolbars ✓ ("provide actions that support the main tasks people perform"; ≤ 3 logical groups; leading = navigation/title, centre = common controls, trailing = important items/search/More; prefer symbols "except for actions like edit"; overflow as space narrows); NN/g sticky headers ✓ (keep sticky bars small, high contrast, minimal animation).
**Spec:** one `.glass-bar` sticky row 48 px: leading = back/identity (`t-mono` ref · name), centre = tool groups separated by a 24 px hairline `Separator` (≤ 3 groups), trailing = the ONE primary (`default`, e.g. "Enregistrer") + ⋯ overflow; icon buttons `ghost` 36 px with tooltips and `<Kbd>` hints; below `lg` the centre collapses into the ⋯ menu. Side panels are flat `surface-2` wells (not glass on glass). Line-item tables follow §3 (numbers right, `CellNumberInput` solid). Must not: a second sticky bar of the same height; negative-margin hacks (use `FLUSH_ROUTE_PATTERNS`); three filled buttons; icons without labels for edit-type actions.

## 19. App chrome: sidebar · top bar · mobile bar
**Job:** navigation only; never competes with the page.
**Sources:** Apple HIG sidebars ✓ (top-level areas, ≤ 2 levels, group labels "succinct, descriptive", let people hide it, selection tint); Apple HIG materials ✓ (bars and sidebars are the functional material layer; "don't use Liquid Glass in the content layer"; thicker material for legibility; honour reduce-transparency); NN/g sticky headers ✓ (small, high-contrast, no animation); Material 3 navigation bar ◦ (3–5 labelled destinations on phones).
**Spec:** sidebar `.glass-sidebar` on the cream ladder (`sidebar-*` tokens), rows at their original 36 px (no published desktop-rail height to cite), group labels `t-label` sentence case, active row = `sidebar-active` tint + 2 px `primary` bar + icon in `primary`, collapse toggle; top bar `.glass-bar` 56 px with search (⌘K), + Nouveau (the only filled button in the chrome), bell, avatar; mobile bar 60 px with 3 + Profil destinations, active = `primary` icon on an `accent` pill. Must not: navy/terracotta anywhere in the chrome; page actions in the top bar; uppercase group labels.

## 20. Login
**Job:** one task, no distraction, fewest errors.
**Sources:** GOV.UK create accounts ✓ ("make sure the screen is solely about that task. Do not add any distracting content or links"; clear difference between sign-in and create); NN/g password masking ✓ (offer a show-password toggle); NN/g web-form design ✓ (single column, labels above, inline errors with instruction, one submit).
**Spec:** one centred `.glass` card ≤ 400 px on the cream canvas, logo + product name, `t-title` "Connexion", fields identifiant/mot de passe with labels above, an eye toggle (`ghost` icon button, `aria-pressed`) on the password, an inline `Alert danger` above the button on failure (instructional: "Identifiant ou mot de passe incorrect"), one `default` full-width "Se connecter" (40 px), remember/forgot as `link`s only if they exist. Must not: placeholder-only fields; marketing copy; two panels; a spinner replacing the button (use `loading`).

## 21. Document sockets & pickers (owner rulings, blueprint §6)
**Job:** show which documents exist, which are expected, which cannot be added yet.
**Sources:** game-inventory convention (owner ruling); Carbon tile ✓ (do not mix variants in a group; no decorative shadow); NN/g empty states ✓ (say why and what to do).
**Spec:** grid `sm:2 xl:3 2xl:4`, tiles radius 10: filled = raised tile with thumbnail/pages strip + `t-body-sm` 600 name + `t-caption` meta + hover-revealed actions; empty = DASHED `hairline-strong` recessed socket that is a button + drop target ("Déposer …"); locked = `bg-card/60` + faint SOLID hairline + lock icon + reason. Picker = ONE plain button that is also a drop target; ring on drag-over; no banner, no dashed panel, no copy. Must not: chips on received slots; a list/table instead of sockets; grey solid empty state (reads disabled).

## 22. Charts
**Job:** magnitude, identity, change over time — one axis, one question each.
**Sources:** dataviz skill ✓ (form first, colour last; validated categorical order teal · terracotta · indigo · plum · olive; bars ≤ 24 px, 4 px data-end radius, 2 px lines, ≥ 8 px markers; legend for ≥ 2 series, selective direct labels; text in ink tokens; one axis; pie ≤ 6 + "Autres"); NN/g dashboards ✓ (length/position over area; avoid pie/donut for magnitude); Few (one exception colour).
**Spec:** `components/ui/chart.tsx` with `chart-1…5` in fixed order by entity; single-series bars in `chart-1`; gridlines `hairline` solid; axis text `t-caption`; tooltip = `glass-strong`; captions print the real range. Must not: dual axis; status green as a series; hue by rank; labels on every point.

## 23. Sticky bars & captions
**Sources:** NN/g sticky headers ✓ ("content-to-chrome ratio maximized"; opaque enough to read; no animation).
**Spec:** at most ONE sticky bar under the top bar per page (record bar OR stepper strip OR editor toolbar), ≤ 48 px, `.glass-bar` + hairline; every period-bound figure prints its range in its own caption so nothing else needs to stick.

---

### How a page pass uses this file
1. List the page's elements (from the inventory) and map each to an entry above; for anything missing, fetch 2–3 sources the same way and add the paragraph to the report.
2. Keep the page's ORIGINAL layout (restore it from `3d5629a` if the blueprint pass changed the structure) and restyle each element in place to its spec.
3. Report per element: name → job → sources → spec → what changed → not verified.

---

# Addendum 2026-09-02 — "too gray" rework (owner-chosen direction)

Owner feedback on the finished pass: the app reads as one beige-gray sheet with
two teal buttons; tabs and other quiet controls are invisible to a new user;
spacing/typography/colour hierarchy need work. Researched (NN/g "Visual
hierarchy" ✓: hierarchy comes from contrast in value/saturation, ≤ 2 primary +
2 secondary colours, "if everything is contrasted, nothing stands out"; NN/g
"Flat design" ✓: text-only controls get skipped by new users — backgrounds,
borders and shadows restore clickability; Stripe DESIGN.md ✓: one CTA colour +
colour carried by non-button anchors — tinted pills, icon dots, one featured
surface) and chosen by the owner on 2026-09-02. These rulings SUPERSEDE the
entries above where they conflict.

1. **Colour identity stays the muted dark teal — do not brighten it.** The
   fix for the grayness is a SECOND voice: **terracotta, "anchors only"** —
   (a) date blocks: every date block is now the warm anchor, `bg-tertiary-bg
   text-tertiary-deep shadow-rim` (tint), and the *next/upcoming* one is solid
   `bg-tertiary text-tertiary-foreground shadow-rim-filled`; (b) ONE small
   `<IconChip>` (`components/ui/icon-chip.tsx`, 28 px tinted square + 16 px
   icon + rim) beside a section/card title — at most one or two per screen,
   on the sections that anchor the page; (c) at most one featured tile per
   page; (d) the warm chart series. Still never on actions, status, chrome, or
   a whole tile row. (Supersedes §4's "date in the third colour on at most one
   row" — the tint may repeat; the SOLID block stays unique.)
2. **Tabs = raised tab on a visible track** (supersedes the underline idiom in
   §7 for tab strips): the list is a recessed `surface-2` track (hairline,
   4 px padding, rounded-lg), the active tab a raised `bg-card` card with
   `shadow-rim` + a 2 px accent bar under the label, inactive tabs quiet ink-2
   with a `surface-3` hover. `components/ui/tabs.tsx` and the workspace strip
   already do this — replace any LOCAL underline tab (MissionTabs, PaneTab,
   local `role=tablist` rows…) with the primitive or the same classes.
   Segmented controls already look like this and stay as they are.
3. **Type: heavier anchors, darker values.** `t-display` is now **30/700**
   (page titles). Section/card titles stay `t-heading`/`t-title` but must be
   FULL ink (never ink-2) and are the only semibold line of their block;
   values 14/600 ink; labels stay 12/400 ink-3. Squint test: title → section
   titles → values, in that order.
4. **Forms: chunked groups + content-sized fields** (GOV.UK text input ✓
   "size inputs to known lengths"; NN/g forms ✓ "field width matches the
   input"): a date field is date-wide (`max-w-[12rem]`), a plate/ref field
   plate-wide (`max-w-[14rem]`), a phone field phone-wide; only genuinely
   long values (adresse, désignation, email) stay wide. Related fields group
   tight (rows 12–16 apart inside a group), groups 24–32 apart, sections
   40 px apart (`space-y-10` between page sections where the page has
   distinct sections). The "wall of equal full-width inputs" is banned.
5. Everything else in §1–§23 still applies (one primary, status pairs with
   labels, no uppercase, no gradients, glass rules, numbers never in Outfit).

## Addendum update 2026-09-02 (later) — terracotta owns ONE meaning: TIME

Owner ruling after seeing the anchors pass: no coloured blocks, no decorative
chips — the second colour must live in subtle, teal-sized touches with a job.
Chosen meaning: **terracotta = temporal salience (aujourd'hui · prochain ·
à venir)**. Sources: Few (every colour owns one consistent meaning), M3
tertiary role ("heightened attention to an element"), NN/g visual hierarchy
(a repeated, predictable accent trains the eye).

- `Badge variant="time"` (`bg-tertiary-bg text-tertiary-deep`) for the word
  markers: « Aujourd'hui » (chiffrage queue Date cell, rappels reçus,
  ATG today-group count), « Prochain » (mission page), and any future
  today/next marker.
- Date/time BLOCKS: warm tint for upcoming, SOLID terracotta for THE single
  next one per list, **neutral for the past** (history, past holidays) and
  for anything late (lateness belongs to the danger pair).
- `IconChip` is **neutral by default** now — section chips no longer carry
  terracotta (that was decoration). The `tertiary` tone survives only for a
  chip that itself marks something temporal.
- The dashboard's featured headline card keeps its terracotta (approved
  before this ruling; it is the page's period summary, which is arguably
  temporal — flag to the owner rather than change silently).
- Everything else stands: never on actions, status, chrome, or large areas.

---

# Addendum 2026-09-02 (ter) — theory pass: tables, hierarchy, colour, type, CRUD

Five parallel research rounds per the §2 sourcing policy (practitioner blogs,
books, HN; NOT the usual design systems). Full per-source reports with quotes
live in the session scratchpad (`research/{tables,hierarchy,color,typography,
intuitive-crud}.md`); ~100 sources fetched across the five. Rules below extend
§1–§23 — nothing here contradicts a locked ruling. Sources marked here are the
load-bearing ones; each report lists what could NOT be fetched (Reddit was
blocked outright; Few's table chapter, Lyft's colour essay and Learn UI's
hierarchy material reached us only secondhand — flagged in the reports).

## A. Tables (extends §3)
- **Hairlines + no zebra is empirically right** — two A List Apart studies
  (244+ participants) found zebra gives no accuracy gain; stripes also eat the
  grey ladder needed for hover/selected (Pencil & Paper). Keep as is.
- **Default sort = action-needed order** on queue pages (Pencil & Paper:
  "entries most needing action" at top), not creation date. The sorted column
  shows its arrow; sort affordance lives in the column header (uxdesign.cc).
- **Queues never paginate with page numbers** (uxdesign.cc "a table pattern…
  is successful if there is no need to paginate"): show all rows for ≤ ~100;
  a view that can overflow gets a cap + « Afficher plus » (explicit action)
  + a visible total — never bare page controls, never infinite scroll.
- **Frozen identifier column whenever the table can overflow sideways**, with
  a soft shadow on the frozen edge "so it reads as a layer, not a seam"
  (Pencil & Paper). The identifier is the row's ONLY bold cell.
- **Emphasis budget: 2 cells per row** (identifier + status); everything else
  one step down the ink ladder (Darkhorse "Clear off the table", Few via).
- **Truncate predictable strings with ellipsis + `title`;** wrap only
  decision-critical content. Units/currency named once in the header, not per
  cell (Smashing, UX Movement).
- **Search filters live from the 2nd character**; toolbar holds the 2–3
  workflow filters, the rest behind « Plus de filtres » (P&P filtering).
- Row = one unambiguous click (open); hover-revealed controls are never the
  only path; bulk selection only where a real batch operation exists.

## B. Hierarchy (extends the 2026-09-02 addendum)
- **Three levels of dominance per view, no more** (Smashing/Bradley); verify
  with the squint test — #1 page title/primary, #2 featured surface, #3 data.
- **Text lever order: ink value first, weight second, size last** (Refactoring
  UI). Never de-emphasise with <400 weights — lighten the ink instead.
- **80 % of fixation time is left-of-centre** (NN/g eyetracking): identifying
  data on the table's left edge; anything essential at the right edge needs
  extra weight. Front-load the information-bearing word in French labels.
- **Icons paired with text are dimmed** (Hobday) or they outshout the label.
- **Proximity beats similarity** (NN/g Gestalt): outer padding ≥ inner
  padding always (Hobday); groups are made by gaps, not boxes.
- **Severity ≠ prominence**: destructive actions get quiet styling + spatial
  quarantine (bottom of page/menu), never a big red button.

## C. Colour deployment (extends §11; palette untouched)
- **Few's rules verbatim** (Practical Rules for Using Color, fetched): colour
  only for a communication goal; soft colours carry the page, bright/dark =
  alarms only; one hue varying intensity for any quantitative scale (never
  multi-hue a delay/aging meter).
- **Terracotta's power is its exclusivity** (pop-out needs uniqueness in the
  feature dimension — Healey/Ware): enforce the time-only rule harder than
  the colour itself; one stray warm element kills the preattentive search.
- **Soft-bg chip = passive state; solid fill = blocking urgency only.**
- **Tint states**: hover = brightness ↓ + saturation ↑ one step, pressed two
  (Learn UI); never lighten toward grey; on tinted backgrounds the text is a
  dark ink of the SAME hue, never grey (Refactoring UI).
- **A dead-feeling neutral table is fixed with weight/spacing, never a new
  hue** — the grey table is what makes the one terracotta marker land.

## D. Type & spacing (extends the type roles)
- 4–5 sizes max app-wide (Learn UI); hierarchy within a size via weight+ink.
- **600 is the emphasis weight at 12–14 px; 700 only ≥ 20 px** (Inter's
  counters fill at small sizes — training-knowledge flag in the report).
- **Reading prose (observations, comments) steps up to 15–16 px** (Butterick:
  body text 15–25 px) — 13–14 px is for chrome and rows, not paragraphs.
- Line-height by context: prose 1.5 · UI strings 1.2–1.3 · table cells
  1.3–1.4 · buttons/display ~1–1.1 (Rutter, Pimp my Type).
- `tabular-nums` on every live/columnar figure; proportional figures for
  numbers inside sentences; mono ONLY for opaque identifiers (refs, plates).
- **fr number/currency format**: comma decimals, narrow-nbsp thousands,
  symbol AFTER with nbsp ("12 500,00 MAD"); nbsp before « : » and inside
  « … » so values never wrap mid-figure (OQLF).
- Squish insets are systemic (cell/button vertical padding ≈ ½ horizontal).

## E. CRUD & intuitiveness (utilisateurs / tampons / jours fériés)
- **Actionable elements look actionable at rest** (NN/g flat-UI study: weak
  signifiers cost 22 % more time); in dense tables, row actions are visible,
  not hover-only.
- **Destructive friction ladder** (SaaSUI): reversible → undo, restorable →
  light confirm, consequential → named-object confirm (our §13), catastrophic
  → type-to-confirm. *Applied 2026-09-02* (owner: "implement everything"):
  holiday deletes now remove immediately and offer « Annuler » in the toast
  (the doc is re-created with the same label/order) — Raskin: "never use a
  warning when you mean undo." User deletes keep the §13 named-object dialog;
  the last Admin is a disabled control with the reason in its tooltip.
- **Role descriptions in plain French at the point of assignment** (SaaSUI:
  an admin who never read docs picks right first time); never allow removing
  the last Admin or your own access silently.
- **Feedback budget** (NN/g): < 0.1 s show the result itself; > 1 s spinner;
  > 10 s percent-done. Inline status near the changed element beats a corner
  toast; errors never auto-dismiss.
- Smart defaults: pre-seed the standard holiday set as deletable suggestions
  (already done via « Importer le calendrier marocain »).
- First-use empty state = onboarding: outcome + how + ONE verb-led CTA.

---

# Addendum 2026-09-03 — dossiers list page: structure, attention, tools

Four parallel deep-research rounds on the `/dossiers` table page (per the §2
sourcing policy; ~120 sources logged). Full reports:
`docs/research/dossiers-structure-navigation.md`, `dossiers-ecosystem-sweep.md`,
`dossiers-attention-efficiency.md`, `dossiers-color-type-polish.md`. Each
report ends with an honest could-not-fetch list (Reddit was blocked in all
rounds). Rules below extend §2–§3 and addendum ter A/B.

## A. Structural verdict (implemented where safe)
- **The wide table stays the backbone** — no fetched source argues against a
  table for metadata-dense all-day triage; the 14-column row IS the
  information scent. All credible pressure is on the shell around it:
  best-in-class products (Linear, Zendesk, Superhuman, Twenty, Attio,
  Airtable, Notion, VS Code) converge on **two-tier detail access** =
  ephemeral peek + committed open. The peek tier is an OWNER DECISION
  (see §D); the committed tier (preview tabs) already exists.
- **Column order = five logical chunks on the scan path** (NN/g eyetracking:
  hierarchical sampled scan; serial-position): identité (réf, assuré) → état
  (statut, observation, date de création) → parties (compagnie, réf
  compagnie) → classification (nature, type) → véhicule (matricules) → dates
  du sinistre → provenance (créé par). Action signals live in the left third,
  lookup values pan right. *Implemented.*
- **Emphasis budget enforced**: 2 emphasised cells per row — réf (mono 600)
  + statut chip; the assuré name dropped its `font-medium` (the old row spent
  4 tokens on a 3-token budget). *Implemented.*
- **No table↔kanban↔card view switcher** — saved views already deliver the
  multi-view value (Notion: views must be purpose-built). Kanban/card/
  dashboard-first all rejected for triage (full argument in the structure
  report).

## B. Tools added (implemented 2026-09-03)
- **Keyboard spine** via the app-wide hotkey registry (shows in the « ? »
  sheet, group « Liste des dossiers »): ↑/↓ and j/k move a visible row focus
  (same one-surface-step tint as hover — nothing louder on dense rows),
  Entrée opens the focused row (or toggles it in Rappeler mode), x toggles in
  Rappeler mode, Échap drops the focus. Enter/x/Échap register only while a
  row is focused so native button/dialog keys are never hijacked.
- **« Colonnes » picker** in the toolbar (persisted with the filters;
  default = all visible). The identifier column is never hideable. Count
  pill `visible/total` when trimmed; « Tout afficher » to reset. Header AND
  body render from the same `visibleColumns` order.
- **« Précédent / suivant » in the record bar** — the list page snapshots its
  filtered order (sessionStorage) on open; the detail page's record bar walks
  it with ↑/↓ chevrons + position tooltip « 3/42 de la liste ». Hidden when
  the dossier wasn't opened from the list. (Airtable record bar; Map UI
  Patterns "reduce the need to toggle back and forth".)
- **Filtered ≠ unfiltered is printed**: footer count reads « 12 sur 480
  dossiers » whenever a filter narrows the list.

## C. Toolbar & cells (implemented)
- **Spacing grammar**: 8 px inside a cluster (search+vues; presets+plage;
  colonnes+réinitialiser), 24 px between clusters — gaps are the syntax,
  no boxes.
- **« Réinitialiser » appears only while a filter is applied** (Hick: no
  standing control without a standing job) and resets FILTERS ONLY — column
  layout, sort and page size are workspace setup, not filters. (Supersedes
  the "always visible so users learn it" comment from iter-20.)
- **Dates: absolute dd/MM/yyyy in cells, relative age in the tooltip**
  (« il y a 12 jours ») — claims work is a reference context (cross-row
  comparison + insurer correspondence); ragged relative strings also break
  tabular-nums scanning. An age/urgency COLUMN is an owner decision (§D).
- Removing a date filter chip also clears the stale preset thumb.

## D. Owner decisions pending (researched options, NOT implemented)
1. **Peek panel** (side panel on row click/Espace, ↑/↓ retargets, Entrée =
   full open) — THE structural finding; decide click semantics first.
2. **Age/urgency signal** (« 12 j » since creation or since last status
   change, terracotta past a threshold — lawful: time meaning) — needs a
   denormalized `statutChangedAt` for days-in-status.
3. **Armed default view « À traiter »** (my dossiers, action-needed order)
   instead of all-newest-first; default-sort change is addendum ter A's
   "action-needed order" rule applied to this page.
4. **TanStack Table v8 migration** (column resize/order, faceted counts,
   fuzzy search) with openstatusHQ/data-table-filters as playbook — scope,
   not risk.
5. **Density toggle** (40/44/52 px, persisted per user).
6. **Status chip de-saturation** (hue only for action-needed states) — chips
   are learned behaviour, don't change silently.
7. **KPI strip above the table** (Tremor-style, recolored to tokens).
8. **Warm shadow token** — `--shadow-color` is a cool navy (215 45% 20%) on a
   warm cream canvas; polish research says shadows should share the canvas
   hue (e.g. ~35 30% 18%). App-wide token, pixel-verified glass — owner's
   eyes required.
9. **Grayscale check of status-family lightnesses** (90/92/94 % bg may merge
   in grayscale).
