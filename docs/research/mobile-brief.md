# Mobile pass — shared brief (2026-09-06)

Owner ask (verbatim gist): « the mobile version totally sucks — deep research on
how to convert EACH element of our app into a compatible phone version, radically
change the mobile layout, make it very easy to navigate, apply the phone UI/UX
rules that exist out there. »

This brief is the common ground for every research and implementation agent
of the pass. Read it before anything else.

## 0. What the app is

SL Auto Expertise — Moroccan auto-insurance loss-adjustment back office
(French only, phone format +212). Next.js 15 app router, React 19, Tailwind 3,
shadcn/Radix primitives, Firestore live snapshots. Same code ships as a PWA
and as an Android app (Capacitor, foreground GPS service for field agents).

Roles and where they live:

| Role | Device reality | Main pages |
|---|---|---|
| Agent de Terrain (field agent) | PHONE, one-handed, outdoors, camera | /dashboard (terrain), /assignations-atg (+ /[dossierId]) |
| Gestionnaire (case handler) | desk, but checks the phone constantly | /dashboard, /dossiers (+ /[id] record page), /mes-rappels, /consultation |
| Chiffreur (estimator) | desk + phone for the queue | /dashboard, /assignations-chiffrage (+ /[id]), /devis-editor |
| Admin / Responsable d'équipe | desk + phone for supervision | everything, incl. /monitoring, /utilisateurs, /compagnies, /tampons, /jours-feries |
| Directeurs | phone/tablet, read-only | /consultation, /jours-feries |

## 1. Current mobile state (measured 2026-09-06, worktree `sl-auto-clean`, branch `mobile-pass`)

Shell (already phone-aware): 56 px glass top bar (logo, « ‹ parent » crumb,
« + » create, bell, avatar), workspace-tab strip (open records), a 60 px
bottom bar with the 3 top-ranked destinations + Profil (`mobileRank` in
`src/lib/nav-groups.ts`), tutorial « ? » FAB at bottom-20 right-4, dialogs
become bottom sheets below `lg`, side sheets become full-screen below `lg`.
Breakpoint for "mobile" is `lg` = 1024 px everywhere (`useIsMobile`,
`max-lg:` classes), so tablets get the phone chrome.

Pages: ~30 000 lines of page code with almost NO responsive rules —
`sm:`/`md:`/`lg:` counts per file are 0–6 on files of 500–1 900 lines. The
one exception is `/assignations-atg` (field-agent queue), rebuilt phone-first
on 2026-09-03: sticky 48 px header, « Filtres » sheet with a count badge,
mission-type segments sticky under the header, 56 px mission cards grouped
by urgency band (En retard → Aujourd'hui → À venir), map lens, geofenced
arrival banner in the thumb zone.

Everything else on a phone today:
- List pages (`/dossiers` 14 columns, `/consultation` 9, `/assignations-chiffrage`
  9, `/mes-rappels` 6+5, `/monitoring` 2 wide tables, `/utilisateurs`,
  `/compagnies/[slug]`, `/tampons`, `/jours-feries`): a desktop `<Table>` inside
  an `overflow-x-auto` card with a frozen first column — sideways panning of a
  1 200 px table on a 390 px screen. Filter toolbars (search + 3–6 selects +
  date range + presets + density + columns + saved views) wrap into 4–6 rows
  above the table. KPI tiles wrap 2×2 (fine) but push the list below the fold.
- Record page `/dossiers/[id]` (the heart of the app): sticky 48 px record bar
  (identity, status, primary action, overflow), a horizontal stepper strip,
  then 8 paper "step" cards in a vertical rail, each with underline facet tabs
  (Informations | Pièces, Planification | Photos | Observations…). The
  Informations form is a two-column desktop form; the Pièces facet is a
  document-slot grid; Photos is a 12-`lg:` gallery; the 280 px context column
  is `xl` only (simply gone on phones, its actions unreachable). Modals:
  planification (829 lines, multi-field), chiffrage, réclamation, e-mail.
- Mes rappels: master-detail (table + detail pane at `xl`, Sheet below).
- Dashboards (rebuilt 2026-09-06): stat tiles + worklists; terrain dashboard is
  phone-first, others stack.
- `/devis-editor`: split-pane editor + PDF canvas, `react-resizable-panels`.
- Mission detail `/assignations-atg/[dossierId]`: photo capture flows, 2×4 dl
  grids.
- Chrome details: tooltips are hover-only (dead on touch); row quick-actions
  are hover-revealed clusters; `Select` is the Radix popover select; date
  picker is a popover calendar; ⌘K palette is keyboard-taught; workspace-tab
  strip has drag/middle-click affordances; toasts bottom-right.

## 2. What is LOCKED (do not re-litigate)

- Palette « Cream & Ink » (warm cream base, teal primary, terracotta = one
  meaning only), type roles (`t-display/t-title/t-body/t-caption/t-label`),
  glass system, light rim on controls — `DESIGN.md`, `docs/design-system-blueprint.md`.
- Motion spec `docs/motion-spec.md` (3 curves, frequency classes, no
  count-ups, no staggered entrances, exits faster than enters).
- Table column heads in small caps (addendum 2026-09-04) — wherever a real
  `<table>` survives.
- Queue rulings (triage bands, 2-bold-cells emphasis budget, lightness
  urgency ramps, triage strip) — element-specs addendum 2026-09-03 ter.
- Dashboard rulings (addendum 2026-09-06).
- French copy, sentence case labels, no generic placeholder names, +212 phone
  format.

Everything about the PHONE LAYOUT itself is open — including the current
"never a hamburger, never a « Plus » tab" line in DESIGN.md §Mobile, the
1024 px single breakpoint, and any page-level structure. The owner asked for a
radical change; earlier mobile decisions are inputs, not constraints.

## 3. Research policy (binding — feedback memories)

1. Per ELEMENT, never per page: name the element class and its job, read how
   2–3 published systems build it, then how practitioners argue about it
   (blogs, talks, case studies, Reddit/HN threads, Baymard/NN/g articles,
   LukeW, Steven Hoober's thumb research, Smashing, Growth.design, Mobbin
   pattern write-ups, Brad Frost, Adrian Roselli…). Design systems alone
   (GOV.UK/Stripe/Material) are NOT enough — the owner rejected passes that
   only cited those.
2. Fetch and READ the sources; quote the exact rule with the URL. Mark each
   source ✓ (fetched and read) or ◦ (known but not fetched). Never invent a
   guideline.
3. Every element ends in a one-paragraph SPEC: anatomy, states, sizes in px,
   what it must not do, and the sources. Write what the phone version of THIS
   app's element should be, not generic advice.
4. Take your time. Depth over breadth; a report of 150–300 lines with 15–30
   real sources is the expected size.
5. Output: one Markdown file `docs/research/mobile-<topic>.md` with (a) the
   element list you covered, (b) per-element findings + spec, (c) a
   « Contradictions and how I resolved them » section, (d) a « Do-not list »,
   (e) open questions for the owner.

## 4. Elements of this app, by family (assign yourself the family in your prompt)

A. Shell & navigation: bottom bar (3+1 vs 5 vs « Plus » vs drawer), top bar
   (height, what belongs, back vs up, title placement, scroll-away), page
   header (title + primary action + overflow on a phone), workspace-tab strip
   on a phone, breadcrumb, global search / palette on touch, FAB vs bottom
   action bar vs in-header primary, thumb zone, safe areas, keyboard-avoidance,
   Android back button / swipe-back, PWA + Capacitor specifics, tablet vs phone
   breakpoints (what happens at 640 / 768 / 1024).
B. Lists & tables: table → card list / row list conversion, which columns
   survive, sorting on mobile, filters (sheet, chips, count badge), search,
   selection & bulk actions, pagination vs infinite scroll vs « Voir plus »,
   pull-to-refresh, swipe actions, row height, master-detail, sticky group
   headers, empty and loading states, the frozen-column horizontal table as a
   legitimate fallback (when?).
C. Forms & inputs: single column, label position, 16 px inputs, native vs
   custom select/date/time on touch, multi-select, segmented controls,
   steppers/multi-step forms, sticky submit bar, inline validation timing,
   textarea growth, camera/file capture, autofill, numeric keypads, error
   summaries, read-only definition lists (`dl`) on a phone.
D. Overlays & feedback: bottom sheets (modal vs non-modal, detents, drag
   handle, dismissal), full-screen dialogs, action sheets / context menus
   replacing hover clusters and dropdowns, tooltips on touch, toasts/snackbars
   placement above a bottom bar, confirmations vs undo, loading skeletons,
   scrims, nested sheets, focus & scroll locking.
E. Record / detail pages: long multi-section records on a phone (stepper vs
   segmented tabs vs anchor nav vs accordion), sticky identity bar, primary
   action placement, context/summary panel → sheet or top summary, document
   slot grids, photo galleries and capture, PDF/document viewing, history
   timelines, in-record facets (StepTabs), deep links and scroll restoration.
F. Content density & readability on the phone: type scale (min sizes, line
   length, headings), spacing scale, 44/48 px targets and spacing between
   targets, stat tiles / KPI tiles / meters / charts on a phone, status chips
   and badges, icon-only buttons and labels, dark mode, glass/blur cost on
   mobile GPUs, reduced motion, landscape, large-text accessibility
   (Dynamic Type / font scaling), one-handed reach, French label lengths.

## 5. Files worth opening (worktree `C:\Users\pc\Downloads\sl-auto-clean`)

`DESIGN.md`, `docs/design-system-blueprint.md`, `docs/element-specs.md`
(addenda at the end), `docs/motion-spec.md`, `docs/research/terrain-synthesis.md`
(the one accepted phone-first page), `src/app/(app)/layout.tsx`,
`src/components/layout/{header,mobile-nav,page-header,workspace-tabs}.tsx`,
`src/components/ui/{dialog,sheet,table,tabs,select,popover}.tsx`,
`src/app/(app)/dossiers/client-page.tsx`, `src/app/(app)/dossiers/[id]/page.tsx`,
`src/components/dossier-timeline/*`, `src/app/(app)/assignations-atg/page.tsx`.
