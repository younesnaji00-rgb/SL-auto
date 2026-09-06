# Mobile pass — family E: record / detail pages (2026-09-06)

Scope: `/dossiers/[id]` (8-step record with facets), `/assignations-atg/[dossierId]`
(mission detail), `/assignations-chiffrage/[id]` (chiffrage detail + accord
pipeline), and the shared pieces they use (record bar, context column, StepTabs,
document sockets, photo gallery, lightbox, historique). Reference phone = 390 × 844
CSS px (iPhone 14/15) and 360 × 800 (common Android); "chrome" figures below are
computed on 844. Brief §3 policy applied: per element, 2–3 systems + practitioners,
every ✓ source was fetched and read; ◦ = known but not fetched (page is JS-rendered,
403 or 429 today). Locked rulings (palette, type roles, glass, motion, small-caps
table heads, queue/dashboard addenda) are untouched; everything else about the
phone layout was open.

## 0. What is measured today (the phone truth of the record page)

- Chrome stack on `/dossiers/[id]`: shell top bar 56 + record bar 48 (`min-h-[48px]`,
  `sticky top-0`) + stepper strip 48 (`h-12`, `sticky`) + bottom nav 60 = **212 px
  (25 % of 844)** before any content; content-to-chrome ≈ 3:1.
- The stepper strip is an `overflow-x-auto` row of 8 medallions with hidden
  scrollbars; at 390 px the titles are clipped and the hover-reveal details
  (`REVEAL_OUTER`) never fire on touch. Scroll-spy (`IntersectionObserver`,
  `stickyTop + 24`) and `scrollIntoView` on click.
- Eight `paper` sections stacked; each opens on `StepTabs` (underline tabs,
  `overflow-x-auto`, icon + label + badge). Informations is a two-column form; Pièces
  = `grid-cols-1` sockets (`min-h-[120px]` each → ~25 slots ≈ 3 300 px tall); Photos =
  `grid-cols-2` on phone, 6 columns at `lg`.
- Primary action `hidden … md:inline-flex` → on a phone it lives ONLY inside the ⋯
  menu (`DropdownMenuItem … md:hidden`). Prev/next dossier `hidden sm:flex`. The rappel
  session banner (Sauvegarder / Annuler) is squeezed into the same 48 px row.
- Context column (`À faire`, Observations, Rappels, Historique) is `hidden … xl:block`:
  gone on phones and tablets, its "go to step/tab" actions unreachable. Historique
  opens in a full-screen Sheet (`w-full sm:max-w-xl`).
- Deep links: only the `#step-N` hash is parsed; `gotoStep()` = sessionStorage + window
  event; last viewed step restored on mount from localStorage; list → record order
  snapshot (`dossier-list-order`) but no scrollTop snapshot; the scroll container is
  `<main overflow-y-auto>` so Next's own back/forward scroll restoration does not
  apply (it restores `window` scroll only).
- Mission detail: `PageHeader` + 2×4 `dl` + Photos/Documents toggle cards + capture
  flow (`CameraCapture`: full-screen, 72 px shutter, `safe-area-bottom`), photo grid,
  hover-only delete (`[@media(hover:hover)]:opacity-0`), 60 vh preview dialog.
- Chiffrage detail: `max-w-7xl` page header with queue spine ‹ 3/12 ›, `glass-bar`
  "Mode traitement" strip, `AccordPipeline` grid with a `< lg` stacked fallback
  (`sm:grid-cols-2` sockets per family).
- Lightbox: `<img>` in `react-zoom-pan-pinch`; PDFs via `<iframe>` (broken on iOS —
  see E8); 85 dvh dialog.

## 1. Elements covered

E1 Record hub (phone landing screen) · E2 Step screen + step picker · E3 Record top
bar · E4 Bottom action bar (primary action) · E5 Facet tabs inside a step · E6 Document
sockets · E7 Photo gallery + capture · E8 Lightbox / PDF viewing · E9 History timeline
· E10 Mission detail (field agent) · E11 Chiffrage detail + accord pipeline · E12 Deep
links, back behaviour, scroll restoration.

## 2. Findings and specs

### E1 — Record hub: what the phone lands on (decisions 1 and 3)

Job: give the reader the big picture of a dossier that lives for weeks (status, what
blocks it, where each step stands) and one tap into any step. Three candidates were
weighed: (a) keep the long page + scrollable stepper strip, (b) accordion sections,
(c) hub (task list) + one step per screen.

Evidence:
- NN/g, Accordions on Mobile ✓: accordions "allow users to get the big picture before
  focusing on details" but "the content under an accordion can be really long"; users
  "will often try to use the Back button to go back to the view with the closed
  accordion, but instead they will be taken away from the current page"; fix =
  "treating accordions as if they were in-page (anchor) links" or "a persistent
  accordion header … that allows users to quickly close the accordion". Our steps are
  workspaces (40-field form, socket grids, uploads), i.e. exactly the "really long" case.
- NN/g, Accordions Are Not Always the Answer ✓: "Accordions should be avoided when your
  audience needs most or all of the content on the page"; on mobile "people often stop
  scrolling before reaching the end of an extremely long page" — the long page (a) is
  the worst of both.
- NN/g, Mobile Subnavigation ✓: "fewer than 6 subcategories use accordions; 6-15 use
  section menus"; goal = "Minimum interaction cost". 8 steps × 2–3 facets = 20
  destinations → section-menu territory, not accordion.
- GOV.UK Task list ✓: "Only use the task list if there's evidence that users do not want
  to, or cannot, complete all the tasks in one sitting"; "The whole row is linked,
  allowing users to select anywhere within it"; statuses "use colour and a short
  descriptor"; "Users should be able to complete tasks in whatever order they like" —
  `dossier-steps.ts` already models done / in_progress / todo / blocked on GOV.UK
  semantics.
- GOV.UK Step by step ✓ + design notes 2017 ✓: the pattern is an accordion of numbered
  steps whose tasks are LINKS to other pages (content navigation, not workspaces);
  remembering open sections "was confusing for our users … they lost the context of
  seeing all the headings when sections were left open" → do not restore per-step fold
  state on a phone.
- UCLA "Retiring the tabs component" ✓: "Tabs often work well on desktops but can become
  cramped or difficult to use on small screens". BUX/OSU ✓ (8 mobile participants):
  users "struggled to see the content change beneath all 8 menu items", "More rage
  clicks appeared in the higher tab-menu, in mobile views", and "Splitting content into
  focused pages … can improve clarity". An 8-item strip driving a page below is
  precisely the failing set-up.
- Zendesk Support mobile ✓ (ticket = "Conversations" | "Details" tabs; "Tap the property
  you want to change. A dialog appears") and Salesforce compact layouts ✓ ("up to 10
  fields, including the Name field"; "put the object's Name field first") show the
  industry phone record = highlights + a short list of destinations, never the desktop
  page shrunk. HubSpot ✓ moved its desktop left sidebar into an "About tab" on iOS.
- Hoober ✓: "People prefer to view and touch the center of the screen"; "secondary
  actions along the top and bottom edges".

SPEC — hub screen at `/dossiers/[id]` below `lg`: (1) record top bar (E3); (2) a flat
identity block, 16 px side padding: status chip + `t-caption` "modifié il y a 2 h";
compagnie · plaque as one `t-body-sm` line; (3) « À faire » block first (GOV.UK
task-list summary, same `getDossierTodos` rows): each row ≥ 48 px, label + detail,
chevron, whole row tappable, count pill in the pill-title; empty = green "Rien à faire";
(4) « Étapes » task list: 8 rows × 56 px, hairline separated, left 28 px medallion
(✓ / n / lock, current tokens), `t-body` long label, right = status chip (§11) + `>`;
blocked rows are not links and print the reason in `t-caption` under the label (no
tooltip); tapping opens the step screen (E2); (5) collapsed summaries of the context
column, in this order: Observations (3 latest, « Voir » → step 4 / observations),
Rappels (open ones for me), Historique (4 latest, « Tout voir » → E9); each a flat
block with the pill title (owner ruling 2026-09-02) — not a sheet, not an accordion
(LukeW ✓: "hiding critical parts of an application behind these kinds of menus could
negatively impact usage"). No stepper strip, no scroll-spy, no per-step fold state on
the phone. Must not: render the 8 paper sections; auto-jump to the last viewed step;
put the primary action only in ⋯.

### E2 — Step screen + step picker (decision 1, continued)

Evidence: Material mobile stepper (MUI ✓): text variant "The current step and total
number of steps are displayed as text"; "Use dots when the number of steps is small";
"vertical stepper … designed for narrow screen sizes". Apple HIG Toolbars ✓: "keep the
title under 15 characters"; "Use the standard Back and Close buttons … don't use a text
label that says Back or Close". NN/g in-page links ✓: "On mobile screens, in-page links
should always appear at the top of content". Android predictive back ✓: "Only the
system can dismiss the app window itself" — in-app back must be deterministic (E12).

SPEC — one step per screen, same route with `?etape=4&onglet=photos` pushed to history
(E12): top-bar title = « 2 · Visite avant » (position + short label, ≤ 15 chars), back
chevron returns to the hub; tapping the title opens a bottom sheet « Étapes » listing
the 8 rows exactly as the hub list (56 px rows, chips) so a step can be switched
without going through the hub (Zendesk "swipe left or tap the Details tab" =
same-level switching). Under the top bar: facet tabs (E5). Bottom: action bar (E4)
whose primary is `primaryActionForStep` when this step is the next step, otherwise the
facet's own primary (Ajouter une pièce / Prendre des photos / Nouvelle observation).
A 48 px footer row « ‹ Étape 2/8 › » (Material text mobile stepper) sits at the END of
the step content (not sticky) for sequential readers. Step status + `StepStamp` (done
by / on) print under the tabs as one `t-caption` line. Must not: scroll-spy; slide
transitions between steps (motion spec: fade only); the desktop « Comparer » focus
mode.

### E3 — Record top bar on a phone (decision 2)

Evidence: NN/g Sticky Headers ✓: "ensure that all tap targets are a minimum of 1cm × 1
cm", "all text is approximately 16pt", "the sticky header must be an opaque color,
different from the background", motion "roughly 300–400ms"; NN/g content-to-chrome ✓:
"maximize the content-to-chrome ratio", hidden chrome means "out of sight is out of
mind". Material top app bar ✓ (anatomy: container, leading button, trailing elements,
headline, subtitle; small bar = `actionBarSize`). Apple Toolbars ✓: "Only specify one
primary action, and put it on the trailing side of the toolbar"; "aim for a maximum of
three" groups; "Provide a useful title". Salesforce ✓: Name first, ≤ 10 highlight
fields. Smashing 2012 ✓: sticky nav "22% faster", "should not compete with the content
for attention". HN threads (◦, 429 today) and Adam Silver (◦, 403): sticky bars feel
"claustrophobic" → keep it to ONE bar.

SPEC — the shell top bar and the record bar MERGE on record routes below `lg`: one
56 px `.glass-bar` (opaque enough, hairline bottom): leading 44 × 44 back chevron (to
the list / parent), a two-line title block (line 1: `t-mono` ref 13 px + status chip
20 px tall; line 2: assuré name `t-body` 15 px medium, truncated), trailing ⋯ 44 × 44
(overflow: Précédent / Suivant dossier, Nouvelle planification, Envoyer au chiffrage,
E-mail, Historique, Supprimer). Bell / avatar / « + » of the shell are NOT shown on
record routes (hierarchical screen — HIG: back + title + one trailing group). Nothing
else is sticky at the top except the step screen's tabs (E5). The rappel-session state
moves to the bottom bar (E4). Must not: two stacked sticky bars; a colour-only status
chip; a primary button hidden at `< md`.

### E4 — Bottom action bar (the ONE primary action)

Evidence: Baymard sticky product summary (◦, via search digest: keeps "the 'Buy' button
within hand's reach" on long pages) corroborated by GrowthRock A/B ✓ (mobile
drawer-style sticky ATC: "5.2% increase in orders … 98% statistical significance",
clicks "+11.8%"; the "scroll to CTA" variant "showed no statistically significant
difference") and laioutr buy-bar ✓: "At least 44 by 44 CSS pixels as a tap target",
"Position fixed, outside the document flow" with "padding the height of the bar so the
last content is not permanently hidden", "Animate via transform: translateY and
opacity", do-nots "Disabled buttons without explanation". UX Movement ✓: "A bottom
button is … bigger and easier to reach"; commenter: "full-width buttons are better for
one-handed use". designary ✓: "invisible tap zone of approximately 40px at the bottom of
the browser's screen that triggers the toolbar" → "40px of padding to be safe" or run
standalone. Smashing 2023 ✓: "we can't have more than five items in the sticky bar";
virtual keyboards "take up to 60% of the screen" → hide the bar while an input has
focus. Hoober ✓: bottom edge is fine for actions; corners need ~12 mm targets.

SPEC — a 56 px + `env(safe-area-inset-bottom)` `.glass-bar` fixed at the bottom of
every record screen (hub and step), replacing the global bottom nav on record routes
(record = pushed hierarchical screen; cross-family question Q1): ONE full-width
`default` button 48 px tall, label ≤ 24 characters (« Planifier la visite avant »,
« Envoyer au chiffrage », « Déposer le rapport », « Prendre des photos »), icon +
text, `shadow-rim-filled`; while a rappel session is active the bar turns amber:
« Sauvegarder (3) » full-width + a 44 px ghost « Annuler » on the left; read-only roles
get no bar (content gets the height back). The bar hides (translateY 100 %, 150 ms)
while a text input has focus and returns on blur; scrolling never hides it (the
"reappears on scroll-up" pattern is for nav, not the primary). Content wrapper gets
`padding-bottom: 56px + safe-area`. Must not: two primaries; a disabled primary
without a caption saying why (blocked reason from `dossier-steps`); a FAB (the French
verb phrase is the affordance); stacking above the global bottom nav (112 px of bottom
chrome).

### E5 — Facet tabs inside a step on 390 px (decision 4)

Evidence: Apple segmented controls ✓: "no more than about five segments on iPhone", "keep
segment size consistent", "Use nouns or noun phrases"; segmented controls are for
"closely related choices affecting the current state or view", not navigation.
Material tabs (Android docs ✓): fixed tabs "display all tabs on one screen, with each
tab at a fixed width … They don't scroll to reveal more tabs"; scrollable tabs "some
tabs will remain off-screen"; container "48dp (inline text) or 72dp (non-inline text
and icon)"; badges supported. MUI ✓: "Fixed tabs should be used with a limited number of
tabs, and when a consistent placement will aid muscle memory"; "variant="fullWidth" …
for smaller views". NN/g Tabs, Used Right ✓: labels "1-2 words", "Do Not Use ALL CAPS",
overflowing tabs become a "carousel" and "the hidden tabs become less discoverable";
BUX ✓: "Limit Tab menu items to 5", "they need to see content change when they click".
The Hangline ✓: accordions have "no horizontal overflow to worry about"; NN/g video ✓:
tabs for "a few long sections", accordions for "many short ones" — our facets are 2–3
LONG sections → tabs, fixed.

SPEC — Material secondary tabs, fixed full-width, sticky under the top bar inside the
step screen: 48 px tall, n ≤ 3 equal cells (130 px each at 390), label `t-label`
13 px sentence case + the existing state badge (« 3/5 », « 2 champs manquants ») on a
second 11 px line when present, icon dropped below `sm` (the badge carries the
meaning); 2 px accent underline; content swaps with the 200 ms fade already in
`StepTabs`; the selected facet stays in sessionStorage (unchanged) and is mirrored in
`?onglet=`. Tabs never scroll horizontally; if a step ever needs > 3 facets, the 4th
becomes a section at the end of the 3rd, not a scrollable tab. Keep the tab list
`aria-label` and each panel `aria-labelledby` (material-web ✓). Must not: icon-only
tabs; scroll buttons; a bar taller than 48 px; the "flying seat" morph on touch (no
hover) — underline only.

Sticky chrome on a step screen: 56 + 48 + 56 = 160 px of 844 (19 %), content 684 px —
versus 212 px today with no reachable primary. The hub has 112 px (13 %).

### E6 — Document sockets on a phone (decision 5, part 1)

Evidence: Apple Collections ✓: "collections are ideal for showing image-based content";
"Consider using a table instead of a collection for text"; "Use adequate padding around
images". MDC image list ✓: standard list "constrained to 1:1 aspect ratio by default",
gutter configurable. Owner ruling (element-specs §21): sockets, never a list/table;
empty = dashed recessed socket that is a button; locked = faint solid + lock + reason.
NN/g accordions ✓ ("get the big picture") for the section grouping.

SPEC — `grid-cols-2` from 360 px (tile ≈ 166–173 px wide at 12 px gutter, 16 px page
padding), `min-h-[120px]` kept; filled tile = thumbnail band 72 px + `t-body-sm` 600
name (2-line clamp, 13 px) + `t-caption` meta; empty socket = dashed, label 2-line
clamp, whole tile is the tap target (≥ 120 × 166 px ≫ 44); locked tile prints the
reason as its second line (no tooltip). Tile actions (Aperçu / Télécharger /
Remplacer / Supprimer) are NOT hover-revealed: tap opens the lightbox (E8) whose header
carries them. Sections (Assuré / Adverse / Rapport…) keep their pill titles, ordered
required-first; a `t-caption` « 4/6 reçues » sits right of each title. The picker
("Déposer …") on touch is a plain 44 px `outline` button that opens the native file
sheet (`accept` unchanged; NO `capture` attribute here — documents come from files or
scans; photos are E7). Must not: a list instead of sockets (ruling); one column
(3 300 px of scroll); drag-and-drop copy on touch; 4-column tiles below `xl`.

### E7 — Photo gallery + capture (decision 5, part 2)

Evidence: Apple Collections ✓ (standard grid; "Make it easy to choose an item"); MDC
image list ✓ (1:1); UX Planet / Smashing search digest (◦): "1 of 10" counters, swipe
"may reduce friction", current thumbnail highlighted; uxpatterns.dev gallery ✓: "Touch
targets need more room on mobile than on desktop, especially for scrubbers,
thumbnails, and upload affordances"; LeewayHertz camera study ✓: controls "in the lower
portion of the screen, making them easy to find", "Use a gradient background or a
single-pixel shadow behind the icons in the interface to keep them visible on all kind
of camera view backgrounds"; WhatsApp's in-camera gallery strip is "quite inconvenient
and frustrating". Oracle Alta "Capture" pattern ◦ (403), Mobbin "taking photos" flows ◦
(403). Field context: brief §0 (one-handed, outdoors).

SPEC — grid `grid-cols-3` at ≥ 360 (thumb ≈ 110–114 px square, 8 px gap), `aspect-square`,
`object-cover`, 10 px radius, no hover overlay; the file-name caption is dropped on
phone, the count « 12/40 » lives in the group header; location groups keep the
collapsible header (44 px row, chevron right). Capture: the primary of the Photos facet
/ mission page is « Prendre des photos » in the bottom bar (E4); « Importer » is a 44 px
`ghost` in the section header (opens `<input type=file accept=image/* multiple>`, no
`capture` attribute so the OS sheet offers gallery + camera). In-app `CameraCapture`
stays full-screen: shutter 72 px bottom-centre (current), flip 44 px bottom-left, done
44 px bottom-right with a count badge, captured thumbnails as a 56 px strip above the
shutter row (max 6 visible, scrollable, dismissable — never covering the viewfinder
centre), icons with a 1 px shadow, `safe-area-bottom` kept; the shutter hard-stops at
`maxCaptures` and the strip says « 38/40 ». Delete = from the lightbox only, with the
existing confirmation. Must not: 2 columns on a 390 px phone (170 px thumbs waste the
row) or 4+ (< 80 px thumbs); hover-only delete (`[@media(hover:hover)]`); a 60 vh
preview dialog — previews are E8.

### E8 — Lightbox and PDF viewing on a phone

Evidence: Apple developer forum ✓: "Mobile safari started rendering embedded PDFs as
images … only the first page of the PDF is displayed"; workaround "provide a
download-link that will show the PDF as full page", but in a home-screen web app that
"puts the user in a navigation dead-end, as he will not be able to navigate back".
react-pdf discussion ✓: iOS 15+ "strange crashing / page reloading issues when scrolling
quickly between many documents or zooming in after scrolling"; mitigations "Limit the
number of documents rendered simultaneously", "virtualization to display only 3-4
pages at a time". pdf.js FAQ ✓: "Our recommendation is to create and render only
visible pages"; a letter page is "816⨉1056px at 96DPI … multiply each dimension by
window.devicePixelRatio". Chrome Android (news digest ◦): native inline PDF viewer on
by default in 2025, opens "in the same tab". Apple Image views ✓: "Take care when
overlaying text on images".

SPEC — images: full-screen (100 dvh) lightbox below `lg`, black ground, top row 44 px
(close ✕ left, « 3 / 12 » centre, ⋯ right = Télécharger / Remplacer / Supprimer),
pinch + double-tap zoom (existing `react-zoom-pan-pinch`), horizontal swipe = prev/next
within the same slot family (existing `pageList`), the zoom toolbar hidden on touch
(pinch is the control). PDFs on phones: never an `<iframe>`; render pages with pdf.js
(already shipped: `public/pdf.worker.min.mjs`) into a vertical scroller at a
device-pixel-ratio-capped scale (max 2), only the visible page ± 1 mounted, page counter
in the top row; « Ouvrir » opens the file URL in a new tab for the native viewer
(Android) — on iOS standalone that is the dead-end the forum warns about, so the in-app
renderer is the default and « Ouvrir » secondary. Android back / swipe-back closes the
lightbox (history entry, E12). Must not: iframe PDFs; a dialog-sized lightbox (85 dvh)
on a phone; hover zoom buttons; more than 3 PDF pages rendered at once.

### E9 — History timeline (decision 6)

Evidence: HubSpot record redesign ✓: "gave each activity an easily scannable collapsed
state, so that reps could survey across many data points at once"; "removing activity
icons, we cleared out many differing components, controls, and uses of color"; laptops
"could only see an average of 1-3 activities on our timeline at once".
uxpatterns.dev timeline ✓: "Define a mobile strategy such as stacked cards, progressive
disclosure, or alternate summaries before implementation"; "Do not rely on color
alone". Element-specs §4 (list rows) + addendum ter (2-bold-cells budget).

SPEC — `/dossiers/[id]?vue=historique` is a full screen (not a Sheet) reached from the
hub's « Tout voir » and the ⋯ menu: « Dates clés » as a one-column `dl` (label
`t-label`, value tabular 14 px, 40 px rows) at the top, then the log grouped by day
with sticky 32 px day headers (« Mar. 3 sept. 2026 »), rows 56 px: time `t-mono` 12 px
in a 44 px left column, action text `t-body-sm` 2-line clamp, author `t-caption`; tap
expands the row (details / diff) in place, one at a time; no avatars, no per-row icons,
no colour except the sinistre-douteux callout (existing danger card, kept). Load 50,
« Voir plus ». Must not: a Sheet; a `md:grid-cols-2` dates grid; relative-only dates
(operational lists print absolute dates — terrain ruling).

### E10 — Mission detail for the field agent (decision 7)

Evidence: terrain synthesis (accepted page) + Hoober ✓ (centre first, edges for actions,
corner targets ~12 mm) + ServiceNow mobile ✓ ("it's not possible to cram in as much
data as would be presented in the normal interface"; forms use the mobile-view field
list) + Salesforce highlights ✓ (≤ 10 fields, name first) + E7 capture sources.

SPEC — top bar (E3 variant): back to « Missions », title = ref + assuré, ⋯ (Itinéraire,
Appeler, Observations, Documents). Body order: (1) arrival/geofence banner when
present (queue rule, thumb zone); (2) facts `dl` two columns × 2 rows (RDV + deadline
chip, Zone; Adresse as a tap-to-navigate link, Téléphone as `tel:`), 44 px rows; (3)
the PHOTO section as the page body: category segmented control (Avant / En cours /
Après, ≤ 3 segments, equal width, 40 px) preselected from the mission type, « 12/40 »
counter, 3-column grid (E7), empty state with the camera glyph; (4) « Documents » as a
collapsed 48 px disclosure row (count badge) — uploads are rare for the AT; (5)
« Observations » collapsed row with « Ajouter » inside. Bottom bar (E4): « Prendre des
photos » full-width; when the cap is reached the button reads « Photos complètes
(40/40) », disabled, with that caption. Must not: `PageHeader` with subtitle prose; the
Photos/Documents toggle cards (two 56 px cards for a binary switch); hover delete;
`p-6` card padding (16 px on phone).

### E11 — Chiffrage detail + accord pipeline on a phone (decision 8)

Evidence: the desktop pipeline is NN/g comparison-table logic and needs width; the
existing `< lg` fallback already stacks per family. Zendesk ✓ (two tabs, properties
edited in dialogs, submit near the composer), Salesforce ✓ (highlights + actions),
HubSpot ✓ (density, collapsed rows). Chiffrage spec B1–B3 (one primary per family,
version chips) is locked.

SPEC — top bar: back to the queue, title ref + assuré, status chip on line 2, ⋯
(Réforme, Observations, Mode traitement on/off). Below: a 40 px `t-caption` row
« Correcteur · Reçu le … ». Then one flat block per family (Devis, Facture…): pill title
+ « 1er accord · Actuel » chip; versions as 56 px rows in lineage order Source → 1er →
2ème → … (the x-axis becomes the y-axis), each row = stage label `t-body-sm` 600, file
name `t-caption`, state chip (Actuel / Remplacé / Envoyé) right, whole row → lightbox
(E8); the next legal stage is the last row as a dashed ghost row « Éditer le 2ème
accord » (the family's single `tonal` action, B3) — on phones shown only if Q3 says
devis editing is legitimate there; otherwise it prints « Édition sur ordinateur » in
`t-caption`. Bottom bar: [‹ 44 px] [« Envoyer par mail » full-width, enabled only when
a mailable accord exists, caption why otherwise] [› 44 px] — the queue spine moves from
the header to the bar (actions at the bottom edge, Hoober). « Mode traitement » becomes
a 32 px caption row under the top bar (« 3/12 — file terminée » states), not a glass
bar. Must not: the desktop grid (`overflow-x` panning of a 5-column pipeline); a
duplicated primary in the header; a Sheet for the document filter panel — filters
become chips above the families.

### E12 — Deep links, back behaviour, scroll restoration (decision 9)

Evidence: Next.js Link docs ✓: the default "is to maintain scroll position, similar to
how browsers handle back and forwards navigation … if the Page is not visible in the
viewport, Next.js will scroll to the top of the first Page element"; "Next.js skips
sticky and fixed positioned elements when finding the scroll target" → use
`scroll-padding-top` to "Match the height of your sticky header". dev.to (intercepting
routes) ✓: "the DOM and data added dynamically by JavaScript are (by default) not
restored on the next page load"; on iOS "a forward action re-opens the modal". NN/g
accordions ✓ (Back must undo in-page state, not leave the page). GOV.UK design notes ✓:
"The URL also changes when an accordion section is opened so users can still link to
an open accordion section". Android predictive back ✓: the system animates back; in-app
handlers must be deterministic. NN/g in-page links ✓: "Back should take users to the
previous page in the browser history" for command-like jumps (back-to-top).

SPEC — URL grammar: `/dossiers/[id]` (hub) · `?etape=4` · `?etape=4&onglet=photos` ·
`?vue=historique` · `#doc=<id>` for an open lightbox item. Every hub → step → lightbox
transition is `router.push(url, { scroll: false })` (one history entry each) so
browser back, Android system back and iOS swipe-back unwind one level at a time and
never leave the record by surprise; `?onglet=` changes use `replace`. Legacy `#step-N`
links map to `?etape=N`. E-mail deep links land directly on the step screen with the
hub in history behind it (`router.replace` hub, then `push` step on first mount). The
desktop `gotoStep()` helper remains the single entry point and on phones resolves to
these pushes. List ↔ record: `/dossiers` (and the queues) snapshot `main.scrollTop` +
the opened id in sessionStorage on navigation; on `popstate` return, restore scrollTop
after the first data paint and give the returned-from row a 1.5 s tonal highlight; the
existing `dossier-list-order` snapshot keeps Précédent / Suivant in the ⋯ menu. On the
phone the record never restores "last viewed step" from localStorage (GOV.UK finding);
the desktop timeline keeps it. `scroll-padding-top` on `<main>` = 56 px (hub) / 104 px
(step with tabs) so hash / `scrollIntoView` targets clear the sticky bars. Must not:
state-only navigation without a history entry; `window.scrollTo` (the scroll container
is `<main>`); auto-scroll on tab switch; closing the record on the first Android back
press from a lightbox.

## 3. Contradictions and how I resolved them

1. **NN/g "on mobile, use accordions" vs. BUX/UCLA/Zendesk/Salesforce "split into
   focused screens".** NN/g's accordion advice targets reading content; its own caveat
   ("content under an accordion can be really long", Back-button disorientation) is
   exactly our case (forms, socket grids, uploads). Resolved: hub (task list = the
   "big picture" an accordion would give) + one step per screen; accordions survive only
   for short optional blocks (mission Documents/Observations, location groups).
2. **Sticky bars: Smashing 2012 (+22 % speed) vs. HN/Adam Silver ("claustrophobic",
   ◦) vs. NN/g ratio.** Resolved by budget: exactly one top bar (56) and one bottom
   action bar (56); facet tabs (48) only on step screens; no stepper strip. 13 % chrome
   on the hub, 19 % on a step — down from 25 % with no primary reachable.
3. **Element-specs §23 "one sticky bar under the top bar" vs. tabs + bottom bar.**
   Amended for phones: the bottom action bar is a different class (primary action, not
   navigation) and the record bar IS the top bar; the count of sticky bars under the
   top bar stays one (the tabs).
4. **Bottom primary vs. the browser's 40 px invisible toolbar zone (designary; UX
   Movement "avoid sticky in web apps").** The roles that live on the phone run the
   app standalone (PWA / Capacitor) and the shell already ships a 60 px bottom nav;
   in-browser use gets `env(safe-area-inset-bottom)` + the 56 px bar so the button
   centre sits ≥ 28 px above the edge. Accepted.
5. **Owner ruling "sockets, never a list" vs. Apple "table for text".** Sockets kept, at
   two columns; only the pipeline VERSIONS on the chiffrage page become rows because
   their identity is the stage label, not a document type.
6. **Apple "≤ 5 segments" / Material fixed tabs vs. NN/g "on mobile use accordions
   instead of tabs".** With ≤ 3 long facets, fixed full-width tabs satisfy both the
   visibility rule (all labels visible, no carousel) and the "few long sections" rule.
7. **Current "restore last viewed step" vs. GOV.UK's tested finding.** Phone lands on
   the hub; desktop unchanged.
8. **NN/g "Progress Indicators" ✓ is about wait/loading feedback, not steppers** — it is
   not used as stepper evidence; that rests on MUI/Material mobile stepper + GOV.UK task
   list + BUX.

## 4. Do-not list (phone, record family)

- No 8-item horizontal stepper strip, no scroll-spy, no `scrollIntoView` wayfinding.
- No primary action hidden in ⋯; no two primaries; no FAB for a verb-phrase action.
- No stacked sticky bars (shell top bar + record bar); no sticky bar > 56 px.
- No accordion around a form or a socket grid; no restored fold/step state on mount.
- No hover-revealed actions (tile actions, photo delete, stepper details, tooltips).
- No `<iframe>` PDFs; no 85 dvh dialog lightbox; no zoom toolbar on touch.
- No two-column forms or `md:grid-cols-2` definition lists on a phone.
- No 1-column socket grid (3 300 px) and no 2-column photo grid on a 390 px phone.
- No Sheet for historique or the documents filter; blocked reasons print inline.
- No state-only navigation: every screen-level change pushes history.
- No Focus/Comparer mode, no workspace-tab drag affordances, no prev/next in the bar.
- No colour-only status; no relative-only dates in the history.

## 5. Open questions for the owner

Q1 (cross-family A): on record routes, does the bottom action bar REPLACE the global
bottom nav (recommended: record = pushed screen, back chevron returns) or sit above it
(112 px of bottom chrome)?
Q2: step screens as query state on the same route (recommended: listeners stay
mounted, workspace-tab strip unchanged) or as nested routes `/dossiers/[id]/etape/[n]`
(cleaner URLs for e-mails, but a second page component)?
Q3: is editing a devis on a phone ever legitimate for a chiffreur? If not, the pipeline's
« Éditer » ghost prints « Édition sur ordinateur » on phones.
Q4: may a gestionnaire capture photos from the record's Photos facet on a phone
(camera-first like the AT) or import only?
Q5: keep the « ‹ Étape 2/8 › » footer inside step screens (sequential reading) or rely
on the hub + title sheet only?
Q6: tablets 768–1023: hub + step screens (phone model) or the desktop timeline at one
column? (Families A/F own the breakpoint; E works with either.)
Q7: sockets at two columns (recommended) or one column with row-like tiles — the
inventory ruling is kept either way.

## 6. Sources

✓ NN/g — Accordions on Mobile — https://www.nngroup.com/articles/mobile-accordions/
✓ NN/g — Tabs, Used Right — https://www.nngroup.com/articles/tabs-used-right/
✓ NN/g — Accordions Are Not Always the Answer — https://www.nngroup.com/articles/accordions-complex-content/
✓ NN/g — In-Page Links — https://www.nngroup.com/articles/in-page-links/
✓ NN/g — Mobile Subnavigation — https://www.nngroup.com/articles/mobile-subnavigation/
✓ NN/g — Sticky Headers: 5 Ways — https://www.nngroup.com/articles/sticky-headers/
✓ NN/g — Content-to-Chrome Ratio — https://www.nngroup.com/articles/content-chrome-ratio/
✓ NN/g — Tabs vs Accordions (video page) — https://www.nngroup.com/videos/tabs-vs-accordions/
✓ NN/g — Progress Indicators (loading feedback; not stepper evidence) — https://www.nngroup.com/articles/progress-indicators/
✓ GOV.UK — Task list — https://design-system.service.gov.uk/components/task-list/
✓ GOV.UK — Step by step navigation — https://design-system.service.gov.uk/patterns/step-by-step-navigation/
✓ GOV.UK Design notes 2017 — https://designnotes.blog.gov.uk/2017/06/29/designing-new-navigation-elements-for-gov-uk/
✓ Material Components Android — Tabs — https://github.com/material-components/material-components-android/blob/master/docs/components/Tabs.md
✓ Material Components Android — Top app bar — https://github.com/material-components/material-components-android/blob/master/docs/components/TopAppBar.md
✓ material-web — Tabs (a11y) — https://github.com/material-components/material-web/blob/main/docs/components/tabs.md
✓ MDC Web — Image list — https://github.com/material-components/material-components-web/blob/master/packages/mdc-image-list/README.md
✓ MUI — Stepper (mobile stepper variants) — https://mui.com/material-ui/react-stepper/
✓ MUI — Tabs (fixed / scrollable / fullWidth) — https://mui.com/material-ui/react-tabs/
◦ Material 3 — Tabs guidelines / M2 Steppers (JS-rendered; not readable today) — https://m3.material.io/components/tabs/guidelines · https://m2.material.io/components/steppers
✓ Apple HIG — Segmented controls — https://developer.apple.com/design/human-interface-guidelines/segmented-controls
✓ Apple HIG — Toolbars (navigation bar rules) — https://developer.apple.com/design/human-interface-guidelines/toolbars
✓ Apple HIG — Collections — https://developer.apple.com/design/human-interface-guidelines/collections
✓ Apple HIG — Image views — https://developer.apple.com/design/human-interface-guidelines/image-views
✓ Smashing 2012 — Sticky menus are quicker to navigate — https://www.smashingmagazine.com/2012/09/sticky-menus-are-quicker-to-navigate/
✓ Smashing 2023 — Designing sticky menus: UX guidelines — https://www.smashingmagazine.com/2023/05/sticky-menus-ux-guidelines/
✓ Baymard — Accordion & tab pitfalls (forms) — https://baymard.com/blog/accordion-and-tab-design
◦ Baymard — sticky product summary / vertical collapsed sections (search digest; Medium cliff-notes 403) — https://medium.com/design-bootcamp/baymard-cliff-notes-product-page-layout-13f36ebbb01d
✓ GrowthRock — Sticky add-to-cart A/B results — https://growthrock.co/sticky-add-to-cart-button-example/
✓ laioutr — Buy-bar pattern on mobile PDPs — https://www.laioutr.com/en/blog/sticky-add-to-cart-mobile-pdp-2026
✓ UX Movement — Optimal placement for mobile CTAs — https://uxmovement.com/mobile/optimal-placement-for-mobile-call-to-action-buttons/
✓ designary — Sticky buttons and the browser toolbar zone — https://blog.designary.com/p/sticky-buttons-navigation-elements-in-mobile-web
✓ BUX (Ohio State) — Accordions vs tabs: what we learned — https://bux.osu.edu/blog/accordions-vs-tabs/
✓ UCLA Health Sciences — Retiring the tabs component — https://webplatform.healthsciences.ucla.edu/blog/retiring-the-tabs-component
✓ The Hangline — Accordion vs tabs — https://www.thehangline.com/accordion-vs-tabs-which-ui-pattern-is-better-for-organizing-content/
✓ HubSpot product blog — Rethinking record design — https://product.hubspot.com/blog/rethinking-hubspots-record-design-with-usability-in-mind
✓ Zendesk — Working with tickets in the Support mobile app — https://support.zendesk.com/hc/en-us/articles/4408825697434-Working-with-tickets-in-the-Support-mobile-app
✓ ServiceNow community — Lists and forms in the mobile app — https://www.servicenow.com/community/mobile-apps-and-platform-blog/lists-and-forms-in-the-ios-and-android-mobile-application/ba-p/2277175
✓ Salesforce Trailhead — Custom record pages — https://trailhead.salesforce.com/content/learn/modules/lightning_app_builder/lightning_app_builder_recordpage
✓ Salesforce Trailhead — Compact layouts (mobile highlights) — https://trailhead.salesforce.com/content/learn/modules/salesforce1_mobile_app/salesforce1_mobile_app_compact_layouts
✓ Steven Hoober — Design for fingers, touch and people (UXmatters) — https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php
✓ LukeW — Obvious always wins — https://www.lukew.com/ff/entry.asp?1945
✓ Next.js — Link (scroll behaviour, scroll-padding-top) — https://nextjs.org/docs/app/api-reference/components/link
✓ dev.to (derarion) — Browser back resets infinite scroll; URL-addressable detail — https://dev.to/derarion/solving-browser-back-resets-infinite-scroll-with-a-nextjs-url-addressable-modal-1doa
✓ Android — Predictive back design — https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back
✓ Apple developer forums — Embedded PDFs in mobile Safari — https://developer.apple.com/forums/thread/649982
✓ react-pdf discussion #1323 — iOS Safari PDF crashes — https://github.com/wojtekmaj/react-pdf/discussions/1323
✓ pdf.js FAQ — render only visible pages — https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions
✓ uxpatterns.dev — Image gallery — https://uxpatterns.dev/patterns/media/image-gallery
✓ uxpatterns.dev — Timeline — https://uxpatterns.dev/patterns/data-display/timeline
✓ LeewayHertz — Camera UX in apps — https://www.leewayhertz.com/design-apps-with-a-great-camera-user-experience/
◦ Oracle Alta Mobile — Capture pattern (403) — https://www.oracle.com/webfolder/ux/mobile/pattern/capture.html
◦ Mobbin — Accordion glossary / Taking-photos flows (403) — https://mobbin.com/glossary/accordion
◦ HN — Sticky headers threads (429 today) — https://news.ycombinator.com/item?id=21718117 · https://news.ycombinator.com/item?id=42599102
◦ Adam Silver — The problem with sticky menus (403) — https://medium.com/@adamsilverhq/the-problem-with-sticky-menus-and-what-to-do-instead-a287311d0a7b
◦ Chrome for Android native PDF viewer (news digest via search) — https://www.androidauthority.com/open-pdf-files-chrome-android-3505618/
