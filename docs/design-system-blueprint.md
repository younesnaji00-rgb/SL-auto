# Blueprint — a portable design system for dense operational apps

Distilled on 2026-09-01 from a full day of iterations on the SL Auto dossier
page. Everything here is app-agnostic: swap the hue values and the domain
words and it applies to any record-centric product (claims, cases, orders,
tickets). Each rule cites the published system it comes from — nothing here
was invented, and nothing was kept that the owner rejected on screen.

Read it top to bottom once; afterwards use §9 (checklist) and §10 (prompts).

---

## 0. How decisions get made (process rules)

These cost the most to learn today. They come first.

1. **Research, don't invent.** Every visual rule must trace to a published
   system (NN/g, Material 3, Apple HIG, GOV.UK, Refactoring UI, Carbon, Linear,
   Stripe, game-UI conventions). If you can't cite it, don't ship it.
2. **"Find the best way" means REPORT, then build.** Present 2–4 options as
   plain before/after scenarios ("today you scroll past six finished steps;
   after, they fold to one line"), recommend one, and let the owner choose.
   Building unasked twice cost trust. Never describe options in jargon — the
   first pitch of the day was rejected as "too vague and technical".
3. **External critiques (another model, a colleague) lag the code.** Assess
   each point against the *current* screen, say which are already true, and
   present the rest as options. Half of a typical critique is already done.
4. **Verify the pixels reach the browser.** When a change "doesn't show",
   first curl the served stylesheet for the new class before touching
   anything. Twice today the change was live and only a hard reload was
   missing; once an opaque wrapper was hiding it.
5. **The owner's taste is data.** Record every rejection as a rule (see §8)
   and every liked detail as a token (the "light edge + shadow" became
   `--rim-*`). Never re-propose a rejected pattern.
6. **Motion is the last thing to invent.** Anything that scales, tracks the
   pointer or moves vertically in navigation got rejected ("shaky"). Horizontal
   slide, opacity, and track animation on one curve only.

---

## 1. Colour — 60 / 30 / 10 plus one warm accent

Source: NN/g colour proportions; Material 3 tonal surface ladder; Apple HIG
label tiers; Refactoring UI ("emphasise by de-emphasising").

| Role | Share | Token | Light | Dark |
|---|---|---|---|---|
| Canvas | 60 | `--background` | `42 24% 94.5%` (cream, one shade deeper than paper) | `218 14% 7%` |
| Paper / card | 60 | `--card` | `45 30% 99.4%` | `218 13% 10%` |
| Surface steps | 60 | `--surface-2/3/4` | `40 20% 93.5%` · `40 18% 90%` · `40 16% 87%` | `218 12% 13%` · `17%` · `21%` |
| Ink (text) | 30 | `--ink`, `--ink-2`, `--ink-3`, `--ink-4` | `215 38% 14%` · `215 20% 32%` · `215 15% 42%` · `215 12% 66%` | `40 15% 92%` · `218 10% 74%` · `60%` · `40%` |
| Accent | 10 | `--primary` | `178 60% 24%` (teal) | `172 50% 55%` |
| Accent tint | 10 | `--accent` / `--accent-foreground` | `172 45% 86%` / `178 55% 18%` | `178 35% 20%` / `172 50% 75%` |
| Warm third colour | sparse | `--tertiary`, `-deep`, `-bg` | `16 50% 44%` · `16 60% 36%` · `18 60% 92%` (terracotta) | `16 45% 40%` · `16 70% 70%` · `16 40% 16%` |
| Hairlines | — | `--hairline`, `--hairline-strong` | `40 16% 88%` · `40 12% 74%` | `218 10% 18%` · `218 9% 30%` |
| Status pairs | — | `--status-{success,warning,danger,info}-{bg,fg}` | soft bg + dark fg, ≥ 4.5:1 | inverted, ≥ 4.5:1 |

Rules
- **Accent budget**: the accent is for the primary action, the active nav
  item, links and the focus ring. Headings are ink. Nothing else is teal.
- **Ink ladder**: `ink` for values and titles, `ink-2` for secondary text,
  `ink-3` for labels/captions (≥ 4.5:1 on every surface), `ink-4` decorative
  only (disabled, placeholders, rails).
- **Third colour placement** (owner-delegated): featured card, the "next
  event" date block, ordinal medallions, one chart series. Never on actions,
  never near status/destructive UI, never on the sidebar or header bands.
- **No coloured surfaces for chrome.** Navy sidebars/headers were rejected
  outright; chrome stays on the cream ladder.
- Semantic colour is separate from the accent and never used decoratively.

---

## 2. Type — few sizes, hierarchy by weight and ink

Source: Carbon / Linear (few sizes), Refactoring UI (labels light, values
bold), Apple HIG label tiers.

| Role | Spec | Use |
|---|---|---|
| `t-display` | 28/600 display face | page title |
| `t-title` | 20/600 display face | step / card group title |
| `t-heading` | 15/600 | block title |
| `t-body` | 14/400 | default; **field values 14/600 ink** |
| `t-body-sm` | 13/400 | dense lists |
| `t-caption` | 12/400 ink-3 | meta, helper |
| `t-label` | **12/400 sentence case ink-3** | field labels, column heads — **never uppercase** |
| `t-mono` | 13 mono tabular | refs, plates, ids |

Rules: floor 11 px; tabular figures wherever digits align; one display face
(Outfit here) + one UI face (Inter). Labels are quiet, values are the star.

---

## 3. Surfaces and depth — glass edge, not glass fill

Source: Markazi glass system (adapted), Apple HIG Materials, owner rulings.

What the owner actually likes: **the light edge and the soft shadow around a
surface** — not translucency, not gradients, not ambient meshes.

- `.paper` / Card `tonal`: `hsl(card / 0.9)` fill, `blur(16px) saturate(1.4)`,
  1 px light border (`--glass-border` = white 72 %), inset top highlight
  (`--glass-highlight` = white 85 %), tinted soft shadow. **Never a Tailwind
  `shadow-*` on a glass card** — it wipes the inset highlight.
- Chrome: `.glass-bar` (bars content scrolls under: top bar, record bar,
  stepper strip, mobile bar; `card / 0.72`, blur 16), `.glass-strong` (menus,
  popovers, selects, dialogs, sheets; `card / 0.84`, blur 24, panel shadow),
  `.glass-sidebar` (`sidebar-bg / 0.78`).
- **Nested-solid rule**: glass never stacks on glass — a glass surface inside
  another flattens to solid `card`; inputs inside glass are solid.
- **No ambient gradient/mesh** on the canvas (rejected). **No gradients on
  buttons** (rejected). Grain is allowed at 3 % (5 % dark) via `body::after`.
- Fallbacks: `prefers-reduced-transparency`, no `backdrop-filter`, print, and
  below `lg` (cards 94 % solid, no blur) → solid surfaces.
- **Light contour on every control** (`shadow-rim` on light surfaces,
  `shadow-rim-filled` on fills): inner 1 px light ring + brighter top edge +
  faint outer hairline. Applies to every button variant except `link`, every
  icon button, stepper dots, active pills, rail medallions, date blocks.
  Declared as Tailwind `boxShadow` tokens so focus rings compose with them.
  ```
  --rim-in: hsl(0 0% 100% / .75)   --rim-top: hsl(0 0% 100% / .95)
  --rim-out: hsl(shadow / .08)     --rim-fill-in: .3   --rim-fill-top: .55
  rim:        inset 0 0 0 1px var(--rim-in), inset 0 1.5px 0 var(--rim-top),
              0 0 0 1px var(--rim-out), 0 1px 2px hsl(shadow / .06)
  rim-filled: inset 0 0 0 1px var(--rim-fill-in), inset 0 1.5px 0 var(--rim-fill-top),
              0 4px 12px -4px hsl(shadow / .3)
  ```
- **Radius nesting is derived**: inner = outer − padding, floor 6 px; step
  papers 12 px → tiles 10 px max; never the same radius nested.
- Structure comes from tone and spacing first, hairlines second, shadows only
  on overlays and glass edges (Refactoring UI: fewer borders).

---

## 4. Layout, spacing, density

- Card padding **24 px**; field rows **16 px** apart; section headers 48 px.
- Context column (right, ≥ xl, 280 px): flat blocks, `t-label` headers,
  hairline-separated rows, **hairline between blocks**, rows must never be
  wider than the column (bleed into its padding, clip x).
- **No repeated titles**: the step title / tab label already names the thing;
  content inside never repeats it.
- **Density zoom**: `html { zoom: var(--app-zoom) }` — 0.9 on 1080p monitors,
  1.1 on 1440p, 1.0 everywhere else, fixed tiers, keyed on the *physical*
  screen height (`screen.height × devicePixelRatio`), set before paint.
  CSS zoom does not scale viewport units (measured, Chrome 151), so **every
  vh/svh/dvh/vw value divides by `--app-zoom`** (core utilities re-declared,
  arbitrary values as `calc(…/var(--app-zoom))`). Print resets to 1.
- Responsive is non-negotiable: multi-user, multi-resolution; dialogs become
  bottom sheets below `lg`; inputs ≥ 16 px below `md`.

---

## 5. Navigation and workflow (record pages)

Source: GOV.UK task list & step-by-step, Carbon progress indicator, USWDS
in-page nav, Salesforce/Jira record header, Linear.

- **Record bar** (sticky, 48 px, glass-bar): identity (mono ref · name ·
  org · plate · status) + **one** primary action for the current step + ⋯
  menu. The step's own tabs never repeat that primary (e.g. no "send to
  pricing" inside step 1).
- **Stepper**: horizontal at every width, compact row spread across the full
  width (28 px dots + titles); details slide in *after* the title on hover,
  left→right, CSS-only. Nothing scales, nothing moves vertically. No vertical
  side rail (duplicates the medallions, inconsistent across widths).
- **Steps** are uniform paper cards with a left-gutter medallion
  (✓ / number / lock) joined by a 2 px rail and 32 px of canvas — separation
  by rail + whitespace, never thick rules or background swaps on the active
  step.
- **Step facets are underline tabs** with state badges ("3 champs manquants",
  "5/6") — never collapsibles; tabs only for content not needed
  simultaneously (NN/g).
- **Jumping to a step from outside the timeline** goes through one helper
  (`gotoStep(id, step, tab?)`: unfold, scroll, focus heading, switch tab),
  never ad-hoc `scrollIntoView`.
- **"À faire" block** at the top of the context column (GOV.UK task-list
  summary): missing required fields → tab, missing required documents → tab,
  the next actionable step → its action (open the planner / the pricing
  modal / the step). Rows the reader only *waits on* are toned to `ink-2`.
  Optional steps are never listed as to-dos. Empty state is green.
- **Focus mode**: any side-by-side task raises one page signal that collapses
  the sidebar, retracts the stepper and context column, and splits the width
  50/50 — never auto-opened; only the explicit "Compare" click.
- **Motion**: every layout change on `cubic-bezier(0.2,0,0,1)` 300 ms —
  outgoing fades 150 ms → tracks animate (grid rows/cols, max-width, 0fr/0px
  with `min-w-0 overflow-clip` wrappers) → incoming fades with 150 ms delay;
  exiting elements stay mounted; never snap.

---

## 6. Components (rules that survived the day)

- **Buttons**: `default` (accent fill) · `destructive` · `tonal` (accent
  tint, Material 3 filled tonal — the strongest control inside a section that
  isn't the page primary) · `outline` · `secondary` · `ghost` · `link`. All
  but `link` carry the rim. No gradients; hover = brightness 1.06, press
  0.94.
- **Emphasis follows the job** (GOV.UK "the primary is the next thing to
  do"): a section's CTA is `default` (solid) while its job is undone and
  `tonal` once done. Full size (40 px), bold, placed where the eye lands
  (right end of the toolbar). Never small/outline for a CTA. No decorative
  "AI" icons.
- **File pickers**: ONE plain button (no banner, no dashed panel, no copy)
  that is also a drop target; chips appear only while something is queued.
- **Document sockets** (game-inventory convention): filled = raised tile
  with the item; empty = **dashed** recessed socket (the only "drop here"
  cue); locked = near-white fill + faint *solid* hairline + lock — never solid
  grey (reads as disabled), never dashed (invites upload). Scale-in only on
  fill. Files of one socket are **pages** of one document (recto/verso):
  2-up strip, numbered pills, lightbox paging; only the AI adds pages;
  documents move/swap between sockets by drag (with a correction sent back
  to the classifier).
- **Lists of events** (visits): rows separated by hairlines only; the date
  block is the row's anchor (tinted + rim; the next event gets the third
  colour); labels quiet, values bold; every detail in the row, no dialog.
- **Lightbox**: window follows media orientation (portrait → tall, landscape
  → wide); eye icon is the only way in (clicking the image does nothing);
  wheel = **one notch ≈ +30 %** (gate multi-event wheels to one per 100 px
  deltaY; disable library smoothing that multiplies by deltaY); buttons
  −/%/+ with % = fit.
- **Compare pane**: a viewer, not a thumbnail — hugs the document's shape up
  to the row height, 2-axis scroll beyond, cursor-anchored Ctrl+wheel zoom.
- **Observations**: per-message collapsibles, newest open. **Photos**: groups
  expanded, "by date / by location" as underline tabs.

---

## 7. Tokens to copy (light theme; see the app's `globals.css` for dark)

```css
:root {
  --background: 42 24% 94.5%;  --card: 45 30% 99.4%;
  --surface-2: 40 20% 93.5%;   --surface-3: 40 18% 90%;  --surface-4: 40 16% 87%;
  --hairline: 40 16% 88%;      --hairline-strong: 40 12% 74%;
  --ink: 215 38% 14%;  --ink-2: 215 20% 32%;  --ink-3: 215 15% 42%;  --ink-4: 215 12% 66%;
  --primary: 178 60% 24%;      --accent: 172 45% 86%;    --accent-foreground: 178 55% 18%;
  --tertiary: 16 50% 44%;      --tertiary-deep: 16 60% 36%;  --tertiary-bg: 18 60% 92%;
  --shadow-color: 215 45% 20%;
  --glass-bg: hsl(var(--card) / .9);  --glass-bg-strong: hsl(var(--card) / .84);
  --glass-bg-bar: hsl(var(--card) / .72);
  --glass-border: hsl(0 0% 100% / .72);  --glass-highlight: hsl(0 0% 100% / .85);
  --rim-in: hsl(0 0% 100% / .75);  --rim-top: hsl(0 0% 100% / .95);  --rim-out: hsl(var(--shadow-color) / .08);
  --scrim: hsl(215 42% 17% / .35);  --app-zoom: 1;
}
```

---

## 8. Anti-patterns (rejected on screen today — do not re-propose)

| Rejected | Why / what replaced it |
|---|---|
| Navy sidebar, navy header bands, any navy surface | "couldn't have had a worse placement" → cream chrome, terracotta as the third colour, navy only as ink |
| Ambient gradient / mesh behind the page | "remove the gradient" → flat canvas, glass = edge + shadow |
| Gradients on buttons | → flat fill + light rim |
| Chrome-only glass with no mesh | invisible at rest → glass cards too |
| Dock fisheye / pointer-tracking scale on the stepper | "shaky" → horizontal slide only |
| Vertical stepper side panel | inconsistent across widths → horizontal bar everywhere |
| Thick dark separator lines between steps | → GOV.UK rail + whitespace |
| Background swap on the active step | → uniform paper cards, medallion states |
| Rounds × columns matrix / lists for document boards | "liked how it was in the beginning" → inventory sockets |
| Auto-opening the compare pane | → explicit click only |
| "Add a page" button on sockets | → only the AI adds pages |
| Upload banners, dashed drop panels, copy under pickers | → one plain button |
| Uppercase field labels | → 12 px sentence case |
| Repeated titles inside a step | → the step/tab label names it |
| Duplicated primary in a step's tab | → record bar only |
| Decorative AI (sparkles) icon on a CTA | → text only |
| Sidebar as the place for the "third colour" | → inside the page only |

---

## 9. Checklist for a new page (or a new app on this blueprint)

1. Tokens only — no hexes in components; both themes defined on `:root` and
   `.dark`; every colour has a job in §1.
2. One primary action on screen; section CTAs follow §6 emphasis.
3. Labels `t-label` sentence case; values bold ink; digits tabular.
4. Cards = paper/glass edge; chrome = glass-bar/strong; nothing else frosted;
   no `shadow-*` on glass; every control has the rim.
5. Structure by tone + spacing; hairlines between blocks; no boxes-in-boxes;
   radius derived from nesting.
6. 24 px card padding, 16 px row gaps, no repeated titles.
7. Any viewport-unit value divides by `--app-zoom`.
8. Layout changes choreographed on the standard curve; nothing snaps; nothing
   scales or moves vertically in navigation.
9. Deep actions go through the shared navigation helper; a to-do summary
   tells the reader what blocks the record.
10. Verified: `tsc`, CSS built, served stylesheet contains the new rules,
    hard reload; screenshots where authentication allows.

---

## 10. Prompt playbook — the day's asks, generalised for reuse

Copy, replace the bracketed words, and expect the process rules in §0.

- **Efficiency audit** — "How can we make the UI and navigation of the
  [page] more efficient? Audit what exists, list the friction, and give me
  options as plain before/after scenarios with effort; recommend, then wait."
- **Apply an external critique** — "Here is what [other reviewer] said
  about [page]. Assess each point against the current code (the screenshots
  may be older than the last commits), tell me what's already true, and offer
  the rest as options."
- **Hierarchy pass** — "Labels smaller, sentence case, muted; values darker
  and heavier; cards near-solid with the edge light and shadow; canvas one
  shade deeper; card padding 24 and row spacing 16; deepen the primary one
  step. Cite Refactoring UI / Material / Apple."
- **Glass** — "Apply the Markazi glass system to [app] minus the ambient
  mesh: cards and step papers as near-solid glass panes with the light edge
  and shadow; bars, sidebar, menus, dialogs frosted; nested-solid rule;
  reduced-transparency and print fallbacks. No gradients anywhere."
- **Light contour** — "Put the light contour on every button, icon button,
  step pill and medallion; declare it as shadow tokens so focus rings still
  compose. Remove any gradient from filled buttons."
- **CTA emphasis** — "The [action] buttons aren't obvious. Options: tonal;
  solid; solid-until-done-then-tonal. Move the CTA to where the eye lands
  (right end of the toolbar), full size, bold, no decorative icon."
- **To-do summary** — "Add an 'À faire' block at the top of the context
  column: missing required fields → tab, missing required documents → tab,
  next actionable step → its action; waiting rows toned down; optional steps
  never listed; a pure, tested module computes it; one navigation helper
  opens the right step and tab."
- **Stepper** — "Horizontal at every width; compact so every step fits;
  titles always visible; details slide in horizontally on hover; no scale, no
  vertical motion, no pointer tracking."
- **Separation** — "Find the best way to separate steps — research it (GOV.UK
  rail vs thick rule), report, then build the recommended one."
- **Density** — "Zoom the app to 90 % on 1080p and 110 % on 1440p, 100 % on
  everything else, fixed; measure how CSS zoom treats viewport units in the
  installed browser first and compensate every vh/vw."
- **Sockets** — "Documents as game-inventory sockets: filled / empty-dashed /
  locked-quiet; files are pages of one document; drag to move or swap; only
  the AI adds pages."
- **Viewer** — "Orientation-aware lightbox and compare pane; eye icon only;
  wheel zoom one notch ≈ 30 %, never a 600 % jump."
- **Cleanup** — "Remove [duplicated title / duplicated primary / icon]; the
  step title already names it."
- **Blueprint** — "Turn every iteration and prompt used today into a
  blueprint / design system reusable for any page or app."
