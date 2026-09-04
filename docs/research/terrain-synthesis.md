# Missions terrain (/assignations-atg) — research synthesis & redesign proposal

Date: 2026-09-03. Six parallel research rounds per the §2 sourcing policy
(practitioner blogs, theory articles, books, product documentation; the big
design systems only as corroboration; every claim in the six reports cites a
URL that was actually fetched, with honest could-not-fetch lists). Full
reports:

- `terrain-attention-hierarchy.md` — 15 findings / 14 sources (NN/g eyetracking corpus, Few, Refactoring UI, ED-triage literature, mere-urgency effect)
- `terrain-color.md` — 16 findings / 18 sources (Few ×2, Stone, APCA/Myndex, Verou, Evil Martians, Muth ×2, alarm-fatigue clinical data, sunlight/field UX)
- `terrain-typography-spacing.md` — 14 findings / 13 sources (Butterick, Rutter, Ström, Darkhorse, data-ink + its critique, PatternFly, Pencil & Paper)
- `terrain-table-alternatives.md` — 18 sources; the structural question (NN/g, Pencil & Paper, GitLab Pajamas, uxpatterns.dev, ServiceM8/Salesforce/ServiceTitan/Jobber dispatch docs)
- `terrain-navigation-tools.md` — 16 sources; dispatch-product tooling scan + feature prioritization (Salesforce console, ServiceM8, Superhuman/Retool palettes, NN/g targets, Snapsheet, Morocco WhatsApp data)
- `terrain-ecosystem-sweep.md` — libraries & design-rule repos with verified licenses and Tailwind-v3 compatibility

Nothing below re-proposes a rejected idea; everything conforms to the locked
Cream & Ink rulings (element-specs §1–§23 + addendums). Items marked
**OWNER DECISION** follow the "find the best way = present options" ruling —
no structural code before a choice.

---

## 1. Verdict on the current page

**What the research validates (keep):**
- The three date buckets (Aujourd'hui / En retard / À venir) — layer-cake
  scanning research says group headers are what operators scan first, and
  ServiceM8 ships the same smart-list model (TODAY / ACTION REQUIRED).
- First column = frozen human-readable identifier in mono; hairlines,
  no zebra; hover highlight; 44 px rows (between P&P's 40/48; on the 4 px grid).
- Absolute dates with month names (Cedergren: operational lists are the
  "absolute wins, no gray area" case) — do NOT go relative.
- The mobile card queue, the plate-scan primary, the per-group Itinéraire,
  the deadline chip carrying a text label (redundant encoding satisfied).
- The palette's restraint: the page sits at Few's 7-hue working-memory
  ceiling — the research argues to FREEZE the hue count, not add.

**What the research convicts (the failure modes, each named in a report):**
1. **12 equal-weight columns = the F-pattern failure state.** NN/g: the
   F-pattern appears when nothing differentiates content; 80 % of gaze time
   stays on the left half, so columns 8–12 (Téléphone, Créé le, Créé par,
   Assigné par) sit in an attention dead zone. "Every column same weight"
   is a named anti-pattern with a researched remedy: emphasize 2–3 decision
   columns, demote the rest.
2. **Row-click-to-full-page as the ONLY drill-in = pogo-sticking.** NN/g's
   remedy is (a) put the differentiating facts IN the row (deadline risk is
   there; photo progress is not) and (b) a non-modal side panel for
   single-record viewing — Pencil & Paper ranks the sidebar panel "the most
   scalable option"; GitLab's drawer rule and the master-detail literature
   agree ("switch between items frequently … stay in the same context" =
   dispatcher triage exactly).
3. **The queue surface doesn't match the industry.** Four fetched
   field-service products (ServiceM8, Salesforce, ServiceTitan, Jobber) all
   ship map + schedule + card-like job list with quick actions; none uses a
   wide attribute table as the primary dispatch surface. ServiceM8's job card
   shows exactly four facts.
4. **Audit metadata in a triage queue.** No fetched source shows
   Créé le / Créé par / Assigné par in a queue row; they belong in the
   drill-in.
5. **Group order.** Triage literature is unambiguous: highest acuity first —
   En retard currently sits BELOW Aujourd'hui. The mere-urgency effect
   (JCR 2018) says whatever sits on top gets worked.
6. **Deadline chip placement.** The decision value (Date RDV + chip) sits
   mid-table; research wants it left-of-centre, beside the identifier.
7. **Chip ramp escalates by hue only.** Stone: only luminance difference is
   legible; the ramp must be a lightness staircase that survives grayscale,
   with solid fill reserved for the single top step.

---

## 2. OWNER DECISION — the structure (pick one path)

### Option A — Triage list + side peek panel  ← recommended
One surface per tab, rows rebuilt as **two-line triage entries**:

- **~7 slots instead of 12 columns** by stacking related pairs:
  1. Dossier ref (mono, semibold — frozen, the row's only bold cell)
  2. Assuré ⏎ Immatriculation (name ink-1 medium / plate mono ink-2)
  3. RDV + deadline chip (semibold tabular figure; chip immediately after —
     position 3, in the attended zone)
  4. Photos progress chip (e.g. « Photos 2/4 » for the current stage — the
     differentiating fact that today requires a click)
  5. Compagnie (ink-2)
  6. Agent (dispatcher view only)
  7. Zone ⏎ Adresse (subdued second line, truncated + title)
- Téléphone stops being a column → an in-row action cluster (Appeler ·
  WhatsApp · Itinéraire), hover-revealed on desktop, always-visible ≥48 px
  targets on mobile cards.
- Créé le / Créé par / Assigné par move into the drill-in (visible-by-default
  OFF via column visibility, or panel-only — see D4).
- **Row click opens a right-side peek panel** (shadcn Sheet, no new dep):
  mission summary, photo grid per stage, docs, audit block, actions
  (Réassigner, Appeler/WhatsApp, Itinéraire), and « Ouvrir le dossier » to
  the full page. Below ~1200 px and on mobile, click keeps navigating to the
  full page (current behaviour).
- Evidence: NN/g non-modal panels + pogo-sticking; P&P sidebar ranking;
  GitLab drawer rule; ServiceM8 4-fact card; GOV.UK task-list status tags.
- Effort: medium (column restructure + one Sheet composition reusing
  detail-page pieces; no data-model change).

### Option B — A + map lens (phase 2, additive)
Persisted toggle list ⇄ map plotting the same filtered missions, pins
coloured by deadline state, click = same peek panel. Four-for-four industry
convention; the most screenshot-able addition for selling. Cost: leaflet
1.9.4 (BSD) + react-leaflet **pinned 4.2.1** (Hippocratic-2.1 licence —
needs owner sign-off, or a ~60-line vanilla wrapper) + a geocoding answer
for Moroccan addresses (the real risk). Effort: high → phase 2.

### Options C (agent-lane Gantt) and D (kanban by stage) — declined
C is capacity-balancing furniture for large fleets (Salesforce-class), wrong
at ~5 agents and photo-stage granularity; uxpatterns.dev warns calendar/
timeline off action-taking tasks. D duplicates the tab axis; stage changes
are photo-driven, not drag-driven; boards lose due-date sweeps.

### Sub-decisions inside Option A
- **D1 — group order. A1 (recommended):** En retard → Aujourd'hui → À venir
  (triage order; usually small/empty so a good day still opens on
  Aujourd'hui). **A2:** keep Aujourd'hui first + a persistent danger pill
  « 3 en retard » at the top that expands/jumps to the group. Never below
  À venir.
- **D2 — date ink inside Aujourd'hui. A (recommended):** HH:mm only (big,
  semibold, tabular) since the group header already says the day; full
  « d MMM HH:mm » in the other groups. **B:** full date everywhere (uniform
  scan column; Inbar 2007 found users like retained reference structure).
- **D3 — density toggle:** Compact ≈ 38–40 px / Normal 44 px, persisted
  per user (both practitioner guides that address density insist it be a
  remembered user setting). Skip a 56 px "spacious."
- **D4 — audit columns:** panel-only (recommended — matches every fetched
  queue convention) vs hidden-by-default columns behind a « Colonnes »
  visibility menu (TanStack gives it free).
- **D5 — triage strip above the tabs:** 3–4 click-to-filter counts —
  « En retard 3 · Aujourd'hui 5 · Prochaine 14:30 · Sans agent 2 » —
  modeled on Salesforce's jeopardy KPI bar; Pencil & Paper: operational
  dashboards exist to alert, and vanity metrics are the anti-pattern.
  Highest sellability-per-hour on the page (counts already computed).

---

## 3. Ready-to-implement polish (no structural change; conforms to locked rulings)

1. **Deadline-chip ramp → lightness staircase** (Stone/Muth "works in
   black & white"): En attente = quiet outline/ghost neutral chip; running
   amber tint past 50 %; deeper danger tint past 80 %; **« En retard » = the
   only solid fill** (dark red bg, white text ≥ APCA Lc 75). Optional clock
   glyph on the top two steps.
2. **Calm the chips inside the En retard group** (alarm-fatigue evidence:
   position already encodes lateness; the group header's red count carries
   the alarm — avoids the "wall of red" cry-wolf effect).
3. **Re-derive the five badge tint triads ON cream in OKLCH** (Few rule 1;
   Verou/Evil Martians: HSL lightness lies): shared measured bg lightness,
   dark same-hue text (never grey/opacity — Schoger), border contrasting
   with both sides (Hobday). Amber-on-cream is the case to verify first.
4. **Terracotta vs danger-red separation by lightness + form** (hue
   neighbours, CVD-fragile): time chips = mid-light warm tints + clock/time
   string; danger = pale-tint-dark-text or very dark solid; grayscale
   screenshot test.
5. **Emphasis budget** already partly honoured — finish it: dim lucide icons
   paired with text (~ink-3, Hobday), Compagnie/Zone to ink-2, audit cells
   ink-3, semibold only on ref + RDV figure.
6. **Mobile sunlight bump:** chip text/borders one step darker on mobile
   tokens; the solid next-RDV block verified Lc ≥ 75 with a hard edge; never
   let muted teal be the sole carrier of an action on mobile (weight +
   underline + placement too). Optional later: a « plein soleil »
   high-contrast toggle.
7. **Truncation mechanics:** Adresse = the one flex column, min-width
   ~160 px, ellipsis + title on hover AND focus; Assuré sized for ~24 chars;
   headers never truncate.
8. **Mobile card label pruning** (Refactoring UI "labels are a last
   resort"): drop the labels for plate (mono format self-evident) and phone;
   fold others into values; keep labels only for Zone/Adresse ambiguity;
   label grey two ladder steps below the value.
9. **Two-second acceptance test** after any change: shown for 2 s, the
   answer to "what needs attention first?" must be the En retard count (if
   any), else the terracotta next-RDV block.

## 4. Feature/tooling roadmap (from the dispatch-market scan)

**Table-stakes** (all four fetched competitors ship them): triage strip
(D5, S) · in-row Appeler/WhatsApp/Itinéraire (S–M; wa.me deep link — 75 %
of Moroccans on WhatsApp, 95 % daily) · popover Réassigner without leaving
the queue (M) · teaching empty states (S; NN/g verbatim pattern) · photo
checklist progress chip (M; ServiceM8's photo-items-auto-open-camera is the
shipping blueprint, Snapsheet's headline sell).

**Differentiators:** « En route » button → status flip + prefilled WhatsApp
ETA to the insured (S now as deep link; API later) · Ctrl+K palette (cmdk,
M — Superhuman: the palette IS the teaching mechanism; skip a vim layer,
arrow-keys + Enter suffice) · bulk actions with undo toast (M) · map lens
(Option B) · GPS « Arrivé sur place » check-in on the existing AT location
pipeline (M).

**Skip, with reasons in the report:** route-optimization solver, Gantt,
full vim layer, signature capture here, true offline (roadmap slice: cache
today's queue read-only), first-run tour overlays (evidence favours
teaching empty states).

## 5. Verified shopping list (licences checked in `terrain-ecosystem-sweep.md`)

| Piece | Licence | Note | Effort |
|---|---|---|---|
| @tanstack/react-table **v8** | MIT | headless; one table per group, shared columnVisibility/sorting state; client-side models fit the 200-doc snapshot | 1–2 d |
| cmdk 1.1.1 (via shadcn Command) | MIT | Ctrl+K palette over the in-memory snapshot | 0.5–1 d |
| shadcn Sheet peek panel | already installed | do before any split view | 0.5 d |
| sadmann7/shadcn-table cherry-picks | MIT (verified) | faceted filter with counts; floating bulk-action bar | 0.5–1 d each |
| leaflet 1.9.4 + react-leaflet 4.2.1 | BSD-2 / Hippocratic-2.1 | pin 4.2.1 (v5 = React 19); licence needs owner OK | ~1 d + geocoding |
| react-resizable-panels 4.x | MIT | only if a persistent split view is wanted later | 0.5 d |
| react-bits CountUp / list-enter | MIT + Commons Clause | usage fine; check each file's Tailwind syntax; no decorative candy | hours |

Disqualified (verified): Tremor (Tailwind v4-only) · FullCalendar
timeline (premium) · planby (all-rights-reserved) · 21st.dev as a pipeline
(2 free copies/day; per-author licences) · Origin UI as a dependency
(maintenance-mode; MIT quarry only, `apps/origin/` directory only).

## 6. Open questions for the owner

1. Structure: Option A now? B as phase 2? (§2)
2. D1 group order: En retard first, or Aujourd'hui first + overdue pill?
3. D2 date ink in Aujourd'hui: HH:mm only, or full dates everywhere?
4. D3 density toggle: yes/no?
5. D4 audit metadata: panel-only, or hidden columns behind « Colonnes »?
6. D5 triage strip: yes/no?
7. react-leaflet's Hippocratic-2.1 licence acceptable, or vanilla wrapper?
8. WhatsApp quick actions + « En route » ETA message: green light?
9. §3 polish items are ruling-compliant and non-structural — implement
   without further ceremony, or review first?
