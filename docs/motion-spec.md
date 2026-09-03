# Motion spec — researched animation contracts for the whole app

Written 2026-09-02. Status: **ADOPTED — owner ruling 2026-09-02 ("do them
all"): every §12 option's RECOMMENDED variant (A1 B1 C1 D2 E1 F1 G1 H1 I1)
plus the full §11 remediation list.** See the addendum at the end for what
was implemented and the three findings that deviated from the letter of the
list. Research method per the working rules: theory and
practitioner sources first (fetched this session by four research agents),
design systems as corroboration only, plus a full inventory of the motion
already in this repo. Nothing here re-proposes a rejected pattern (no pointer
tracking, no scale-on-hover of nav/stepper, no vertical nav motion, no shake,
no parallax).

Source honesty legend: ✓ = actually fetched this session (directly or via the
r.jina.ai mirror) · ◦ = search-snippet or training knowledge, flagged inline.
Key fetched sources: Willenskomer "UX in Motion Manifesto" ✓ · D'Silva
"Transitional Interfaces" ✓ · Val Head (A List Apart brand excerpt ✓, ALA
"Safer Web Animation" ✓, Smashing reduced-motion ✓, valhead.com timing ✓,
Disney-principles post ✓) · NN/g (animation-purpose ✓, animation-usability ✓,
animation-duration ✓, response-times ✓, timing-exposing-content ✓,
errors-forms ✓, microinteractions ✓, tooltip-guidelines ✓) · Rauno Freiberg
(rauno.me/craft/interaction-design ✓, interfaces.rauno.me ✓) · Emil Kowalski
(great-animations ✓, good-vs-great ✓, 7-practical-tips ✓, building-a-toast ✓,
building-a-drawer ✓, you-dont-need-animations ✓, easing-blueprint ✓, his
published STANDARDS/skill rulesets ✓ raw from GitHub) · Josh Comeau
css-transitions ✓ · Radix animation guide ✓ · WebKit "Responsive Design for
Motion" ✓ · web.dev (prefers-reduced-motion ✓, animations-overview ✓,
animations-guide ✓, view-transitions baseline ✓) · WCAG 2.3.3 ✓ + 2.2.2 ✓
Understanding docs · A11y Project vestibular ✓ · MDN will-change ✓ · Paul
Lewis FLIP ✓ · Tobias Ahlin box-shadow ✓ · Chrome animated-blur ✓ +
hardware-accelerated-animations ✓ · tailwindcss-animate README ✓ · Carbon
motion overview ✓ (mirror) + motion tokens from the Carbon repo JSON ✓ ·
Material tokens from the material-tokens repo JSON ✓ + M1 duration page ✓ ·
37signals Yellow Fade original ✓ · cssanimation.rocks principles ✓ · HN
threads on purposeful animation ✓ (mirror) · Skytskyi ultimate guide ✓
(mirror) · Saffer microinteractions via two fetched secondaries ✓ (book
itself ◦). Not fetchable (flagged wherever used): M2/M3 motion pages
(JS shells — M3 values recovered from the official token JSON instead),
Heer & Robertson 2007 (search only), Bill Chung skeleton research (search
only), NN/g drag-drop/scrolljacking/contextual-menus (search only), Linear
first-party motion philosophy (does not exist publicly — secondary only),
Radix tooltip defaults 700/300 (training knowledge).

A striking validation up front: the app's adopted curve
`cubic-bezier(0.2, 0, 0, 1)` **is byte-for-byte the Material 3 `standard`
easing token** (material-tokens JSON ✓), and the existing 100–200 ms controls
/ 200–300 ms panels bands sit inside NN/g's, Carbon-productive's and
Kowalski's ranges. The system is right; this spec tightens it, fills the
gaps, and assigns it surface by surface.

---

## 1. Philosophy — when motion is allowed to exist

Distilled from the theory pass; each rule is the test any new animation must
pass before it uses the tokens in §2.

1. **Motion must answer "what just happened / where did it go?"** Objects
   must not teleport (D'Silva ✓), every new object must account for its
   origin and every departing one for its destination (Willenskomer ✓,
   Kowalski "a great animation has a clear origin" ✓). If the static swap
   leaves no comprehension gap, the transition has no job — cut it.
2. **The frequency law.** "The more frequent the animation, the more subtle
   and shorter you'll want it to be" (NN/g ✓); "never animate keyboard
   initiated actions… repeated sometimes hundreds of times a day" (Kowalski
   ✓); macOS context menus and app switchers animate nothing (Rauno ✓).
   Frequency classes: **F0** 100+×/day → no animation (sort, filter, row
   selection, field focus, keyboard nav, palette). **F1** tens×/day → ≤150 ms,
   fade-first (menus, tooltips, tab switches, hovers). **F2** occasional →
   200–300 ms (dialogs, sheets, layout choreography, lightbox). **F3**
   rare/once → the only place a hero moment is permitted (document lands,
   step completes, rapport sent, login).
3. **Feedback ≤100 ms, and motion never gates input.** The state change
   commits immediately; animation decorates it (NN/g 0.1 s ✓, Nielsen
   response-times ✓, Rauno interruptibility ✓, HN "blocking input is the
   cardinal sin" ✓). Transitions, not keyframes, wherever a thing can be
   re-triggered rapidly, so motion retargets instead of restarting
   (Kowalski ✓).
4. **Fade-first register.** "Sliding animations attract attention faster
   than fade-ins" (NN/g ✓) — fades are the lowest-attention-cost channel.
   Calm/professional maps to "smaller movements… opacity… rather than
   positional changes" (Val Head brand mapping ✓). Default to opacity; add
   ≤8 px of travel only when direction carries meaning; larger travel is
   reserved for nothing.
5. **One thing moves at a time; one hero moment per view.** Simultaneous
   animations cancel each other (NN/g ✓, Skytskyi subordination ✓, Disney
   staging inverted for tools ✓). Carbon: productive motion by default,
   expressive rationed to "occasional, important moments" ✓.
6. **Enter ≠ exit.** Entrances slightly longer, decelerating; exits faster
   (≈⅔–¾ of enter), accelerating — the user has already moved on (NN/g ✓,
   M1 225/195 ✓, M3 tokens ✓). Carbon nuance ✓: things that will RETURN
   (side panels, drawers) exit on the standard curve, not the exit curve —
   easing encodes gone-vs-recallable.
7. **No bounce, no overshoot, no squash.** Those are "energetic/playful"
   brand adjectives (Val Head ✓); Carbon bans "bounce, stretch, or sudden
   stops" ✓. Never enter from `scale(0)`; 0.95–0.97 → 1 is the floor-to-one
   band (Kowalski ✓, Rauno proportionality ✓). **Never `ease-in`** except as
   the accelerate-exit curve paired with a fade (Kowalski ✓).
8. **Loops are liabilities.** Auto-starting motion >5 s alongside content is
   a WCAG 2.2.2 Level-A issue ✓; pulsing/attention loops are an all-day
   attention tax (NN/g novelty decay ✓, Rauno ✓). One-shot only; skeletons
   are the sole sanctioned loop and stay subtle.
9. **Data being read for work does not perform.** "If this was a functional
   graph, in a banking app for example, no animation would be better"
   (Kowalski ✓). No count-up tickers, no bar-grow on load, no animated
   sorts. Animation in data is only for *state transitions the user caused*
   (filter/period change), the one case research supports (Heer & Robertson
   ◦ search-only).

## 2. Tokens

**Curves** (one family; forbid per-feature curves — Val Head choreography ✓):
- `ease-standard: cubic-bezier(0.2, 0, 0, 1)` — existing; on-screen movement,
  layout choreography, expansion, and exits of recallable panels (§1.6).
- `ease-enter: cubic-bezier(0, 0, 0, 1)` — NEW; decelerate-only, for anything
  entering (M3 standard-decelerate ✓; Carbon entrance is the same shape ✓;
  "ease-out to bring things in" — Val Head ✓, NN/g ✓, Kowalski ✓).
- `ease-exit: cubic-bezier(0.3, 0, 1, 1)` — NEW; accelerate-only, permanent
  departures only, always paired with an opacity fade (M3
  standard-accelerate ✓, Carbon exit ✓).

**Durations** (existing ladder confirmed; exits added):
| Class | Enter | Exit | Examples |
|---|---|---|---|
| State feedback | 100 | 100 | press, toggle, checkbox, focus ring, hover tint |
| Micro | 150 | 100 (menus may be instant) | menus, popovers, selects, tooltips, hover-reveals, badge in |
| Panel | 200 | 150 | dialogs, tab seat/panel, collapse of a small section, toast shift |
| Choreography | 300 | 200 | layout tracks, sheets, lightbox, focus mode — existing contract kept (150 out → tracks → 150 in delayed; Material's fade-through weights it 90 out/210 in ✓ — see option D) |

Hard rules: ceiling **300 ms** for anything a user triggers repeatedly
(Kowalski ✓; NN/g "at 500 ms animations start to feel like a real drag" ✓);
desktop runs ~30–40 % faster than mobile guidance (M1 desktop 150–200 ms ✓)
so never import mobile numbers; stagger only 20–50 ms/item, ≤6 items, first
appearance only, never on refresh/sort (Skytskyi 20–25 ✓, Kowalski 30–80 ✓,
§1.9).

## 3. Reduced motion & reduced transparency

Substitute, don't delete (WebKit ✓ "only remove the animations you know to be
vestibular triggers", Val Head ×3 ✓, web.dev ✓). WCAG 2.3.3 ✓ formally
excludes opacity/colour/blur changes from "motion animation" — fades are the
safe channel. Up to 35 % of adults 40+ have some vestibular dysfunction
(A11y Project ✓) — with dozens of daily users this is not an edge case.

- KEEP under `prefers-reduced-motion: reduce`: opacity fades at the same
  durations, colour/background/border transitions, user-driven direct
  manipulation (drag, pinch-zoom — WebKit exemption ✓).
- REPLACE with a plain fade: every `slide-in-from-*`, zoom/scale entrance,
  FLIP reorder, accordion/track height animation (snap open), smooth scrolls
  (instant), skeleton pulse (static block).
- Prefer `motion-safe:` to ADD motion over `motion-reduce:` to subtract it —
  new animation then defaults off for reduce users with nothing to forget.
  Where a keyframe can't be gated, `animation-duration: 0.01ms` beats `none`
  so `animationend`-dependent logic (incl. Radix unmount suspension) still
  fires (A11y Project ✓).
- `prefers-reduced-transparency` is not production-dependable (Chromium-only
  ◦) — the existing globals fallback stays a progressive enhancement.
- WCAG 2.2.2 ✓: any loop >5 s alongside content must stop or be pausable —
  skeletons and inline spinners on slow loads are the exposure; cap or rest
  them (§7 skeletons).

## 4. Performance rulebook (this stack: glass 16 px blur + CSS zoom)

1. Compositor-only: transform/opacity, full stop (web.dev ✓ ×2). The two
   `transition-all` in the repo are bugs (§11).
2. **Blur is a static material.** Never transition `backdrop-filter`/
   `filter` on glass — a per-frame convolution whose cost scales with
   area × radius (Chrome animated-blur ✓), a known Chromium dropout bug
   class (◦ login-walled tracker), AND a WebKit-listed vestibular trigger ✓.
   Fade the glass panel's opacity; the blur just is.
3. Nothing animates BEHIND a backdrop-filter region (forces re-blur every
   frame); ≤2–3 stacked blurred layers (◦ practitioner consensus, search).
4. CSS zoom multiplies raster cost (~1.1² ≈ +21 % pixels at 1.1 — ◦ flagged
   inference, verify in DevTools); fractional zoom invites subpixel shimmer
   on slow small translations of text — one more reason fades beat travel.
   `zoom` itself is never animatable.
5. Sanctioned workarounds: shadow transitions = pre-drawn `::after` shadow
   crossfaded by opacity (Ahlin ✓); height 0→auto = `grid-template-rows`
   0fr↔1fr + inner `overflow-hidden` (already the house technique) —
   accepting it is main-thread layout, so small sections only, ≤250 ms;
   reorder = FLIP inside the 100 ms perception window (Paul Lewis ✓).
6. `will-change`: default DON'T (MDN ✓ "can cause the page to slow down",
   creates stacking contexts — a z-index hazard among glass layers); JS
   just-in-time only for observed jank, removed on end.
7. Libraries: **CSS + tailwindcss-animate on Radix `data-state` stays the
   engine** (Radix suspends unmount during CSS animations ✓ — the one thing
   that used to force a JS lib); plain transitions for anything rapidly
   toggled; **WAAPI** (`element.animate`) for the few imperative needs
   (FLIP); **no Framer Motion** (springs/gestures are what this app should
   not have; motion.dev's own "do you still need it" ✓); **View Transitions
   API** = optional sugar behind `document.startViewTransition` only
   (Baseline newly-available Oct 2025 ✓ — enterprise fleets lag; never the
   mechanism).
8. Verify at zoom 0.9 and 1.1 with CPU throttle; Performance panel + paint
   flashing, per the local-render workflow.

## 5. Controls (buttons, inputs, toggles)

- Press: keep `motion-safe:active:scale-[0.98]` + brightness 0.94 —
  Kowalski's tip #1 is scale(0.97)/:active/~150 ms ✓; Rauno: small buttons
  scale less, never below ~0.9 ✓. Existing values are inside the band; no
  change.
- Hover: colour/brightness with plain `ease`, ≤150 ms (Kowalski easing tree
  ✓); hover states gated `@media (hover: hover)` where they leak onto touch
  (Rauno ✓). No transform on hover — matches the standing rejection.
- Loading: label swaps to spinner IN PLACE with width preserved (no layout
  shift), button disabled — the point is double-submit prevention (◦ Primer
  pattern, search). Existing Loader2 pattern is fine; add the reduce guard
  it lacks (§11).
- Success morph (spinner→check→label): permitted ONLY for F3 actions
  (envoyer le rapport, envoi chiffrage) — Kowalski lists exactly this class
  as "what remains worth animating" ✓; revert after ~1.5–2 s (◦). Never on
  routine saves — those use the inline « Enregistré » line (§10).
- Focus ring: instant or ≤100 ms; `:focus-visible` only; never pulse, never
  animate position.
- Validation: on blur, never while first typing; once in error, re-validate
  per keystroke so the error CLEARS instantly ("reward early, punish late",
  Konjević ◦ + NN/g on-blur ✓). Error text fades in 150 ms adjacent to the
  field — "don't animate text" (NN/g ✓) means the message never moves or
  shakes; **no shake anywhere, including login** (owner "anything shaky" +
  NN/g). Icon may pulse ONCE.

## 6. Overlays (menus, tooltips, dialogs, sheets, toasts)

- **Menus/popovers/selects**: keep the shadcn recipe (fade + zoom-95 +
  slide-2) but make it origin-aware — `transform-origin:
  var(--radix-*-transform-origin)` so panels grow FROM their trigger
  (Kowalski tip #5 ✓; Willenskomer cloning ✓). Enter 150 ms `ease-enter`;
  exit ≤100 ms fade or instant. Context menus (if any): instant both ways
  (Rauno ✓). Add the missing `motion-reduce` guards (§11).
- **Tooltips**: warm-up pattern via the Radix provider — first tooltip
  ~300 ms delay, subsequent instant within a ~300 ms skip window with
  transitions disabled (NN/g 0.3–0.5 s hover intent ✓; master.dev 200/300/0
  ✓; Radix `delayDuration`/`skipDelayDuration` ◦ training). Appear = fade +
  2 px shift 125–150 ms; instant on keyboard focus; disappear instant.
- **Dialogs**: enter 200 ms fade + zoom-95 (existing), **exit 150 ms
  fade-only** — exits faster, the user has decided (NN/g ✓, M3 ✓). Overlay
  200 in / 150 out. `calm` variant unchanged (Kowalski: slower + `ease` for
  refined viewers ✓). Focus moves instantly, never rides the panel.
- **Sheets**: enter 300 slide (existing) on `ease-enter`, exit 200 on
  `ease-standard` — NOT `ease-exit`: a side panel is recallable (Carbon ✓).
  Replace the stray `ease-in-out`.
- **Toasts**: an ambient element — enter from the edge 300–400 ms with
  plain `ease` is Sonner's deliberate exception ✓ (Kowalski building-a-toast:
  400 ms `ease`, stack scale 1−i·0.05, velocity dismiss >0.11 px/ms). See
  option E for keep-Radix vs adopt-Sonner.

## 7. Content switches (tabs, collapsibles, skeletons, routes)

- **Tab triggers**: the tab-slope morph + `tab-slope-in` (200 ms) is the
  house shared-element pattern — keep. Kowalski cites Vercel's animated
  active tab as exemplary ✓; ours is already that idiom.
- **TabsContent / step facets**: today panels snap while triggers morph.
  Proposed: incoming panel only, `motion-safe` fade (+3 px rise max) 150 ms
  `ease-enter`; NO exit animation, no directional slide (direction only
  carries meaning in ordered sequences — wizards, not peer tabs; Motion.dev
  directional variant ◦). Keyboard-driven switches (Alt-shortcuts) stay
  instant (F0 rule). See option A.
- **Collapsible**: currently snaps while Accordion animates 200 ms — same
  gesture, two behaviours. Align: same 0fr/1fr or Radix-var technique,
  200 ms `ease-standard`, chevron rotates in the same duration so panel +
  chevron read as one gesture (shadcn convention ◦). Cap 250 ms regardless
  of content height.
- **Skeletons**: pulse, not shimmer — Bill Chung's research (◦ search) says
  shimmer *feels* faster but pulse is the calm/motion-safe option; the calm
  brief wins. Slow the cycle to ~2 s; rest it (static) after ~4–5 s for
  WCAG 2.2.2 ✓. Don't mount the skeleton before ~200 ms of waiting; once
  shown hold ≥300–500 ms (anti-flash, ◦ multiple implementation posts).
  **Skeleton → content: crossfade 150–200 ms** instead of pop-in; layouts
  already mirror (spec §15 of element-specs) so zero shift.
- **Routes**: none, or ≤150 ms opacity on the content pane only —
  navigation is F0/F1 (Kowalski Raycast ✓, Rauno ✓, HN ✓). The dashboard's
  existing 300 ms `animate-fade-in` is the app's only page entrance — see
  option F.

## 8. Data surfaces (tables, lists, charts, numbers)

- Row hover: colour-only, ≤100 ms or instant (existing `transition-colors`
  fine). Sort/filter/paginate: **instant, never animated** (F0; Kowalski
  functional-data rule ✓; Heer & Robertson's ~1 s effective transitions ◦
  are 3× the UI budget — wrong tool here).
- Row insert/delete: animate ONLY the single row the user just created or
  deleted (height-collapse + fade 200 ms); never bulk/refresh changes
  (Rauno lists list-add/delete under "avoid" ✓ — user-caused single rows
  are the causality exception, §1.1).
- Hover-revealed row actions: NN/g's discoverability objection ✓ stands, so
  reveal requires (a) an always-visible ⋯ affordance, (b) `:focus-within`
  parity, (c) fade-in ≤100 ms, NO exit fade, reserved space (no reflow).
- **Value-change flash (the teal fade)**: 37signals' Yellow Fade ✓ — a low-
  alpha accent tint on a just-changed element decaying over ~2 s, built
  precisely for "spotting a colleague's change". Fits: replay «modifié»
  emphasis, AI pre-fill landing values into the form, live status changes
  in lists another user caused. Tint = teal `--accent` at low alpha, never
  terracotta (time) or status colours. See option B.
- KPI numbers: **no count-up** (delays the value, re-runs per visit; fails
  Kowalski's precision rule ✓ — honest note: no source names count-up as an
  anti-pattern, the case is convergent principles). A changed KPI may take
  the teal fade instead.
- **Charts**: entrance animation off (`isAnimationActive={false}`) —
  first-paint bar-growing transmits nothing (§1.9). If the owner prefers
  keeping it: one tuned 300 ms ease-out, dashboard AND monitoring
  identical, disabled under reduced motion (recharts ignores the media
  query by itself). Animating period/filter *transitions* of the same chart
  is the researched-good case but recharts does that automatically when
  data updates in place. See option C.

## 9. Direct manipulation (drag & drop, sockets, lightbox)

- Drag pickup: origin slot dims; the dragged proxy may lift (slight shadow;
  scale ≤1.02 — proportionality, Rauno ✓). HTML5 DnD limits the proxy; the
  dim + target highlight carry the message.
- Drag-over: socket/chip highlight transitions IN ≤150 ms (today the
  page-level ring appears instantly — add `transition-[box-shadow,color]`);
  highlight before release — "the drag should never feel like a guess"
  (◦ NN/g drag-drop, search).
- Drop settle: ~100 ms snap (the one hard number the sources give ◦), then
  the existing `animate-scale-in` "item lands" moment — which stays THE
  hero moment of the documents board (F3, §1.5). Cancel/Esc returns the
  item visually to origin (continuity ◦).
- Lightbox: existing contract confirmed by research (calm enter, preloaded
  ratio, 200 ms resize easing, gesture zoom immediate) — pinch/wheel zoom
  is realtime interaction and must track input with zero added easing lag
  (Willenskomer realtime ✓, Rauno ✓, WebKit reduce-motion exemption ✓).

## 10. Status & save feedback

- Inline save line near the affected content, not a toast (◦ GitLab
  Pajamas, search): « Enregistrement… » → « Enregistré » → fades out after
  a few seconds; errors persist, never auto-fade. Fits the rappel amber
  Sauvegarder buffer: the flush button's state IS the indicator.
- Dirty dot (workspace tabs — exists): appears/disappears with ≤150 ms
  fade; **never pulses** (ambient state, not an alert).
- Badges: fade + scale 0.9→1, 150 ms, once; a count change inside an
  existing badge just swaps (or takes one teal fade if it must be noticed).
- Stepper: step completion (medallion → ✓/fill) is the dossier page's
  legitimate hero moment — a 200 ms `ease-enter` fill/colour crossfade on
  the medallion when a step's status flips, one-shot, motion-safe. No other
  stepper motion changes (hover slide contract stands).

## 11. Remediation list (consistency fixes, no taste decision required)

From the code inventory (nested repo, branch nav-upgrade):
1. Remove `transition-all`: `dossiers/[id]/chiffrage-tab.tsx:283` (use
   Ahlin ::after-opacity for the shadow), `components/voice-player.tsx:71`
   (progress = transform scaleX, not width).
2. Add `motion-reduce:animate-none` to: Dialog/Sheet/AlertDialog overlays;
   popover.tsx, dropdown-menu.tsx, select.tsx, menubar.tsx contents;
   button.tsx loading spinner + the ~53 unguarded `animate-spin`s (or guard
   once in a shared spinner); `modal-planification-history.tsx:167`.
3. Guard smooth scrolls: `monitoring/page.tsx:257`,
   `signaler-bug/page.tsx:319`, `session-replay-dialog.tsx:410,420` (copy
   the guarded pattern from `documents-tab.tsx:681`).
4. Guard transforms: photos-tab hover `scale-105` → `motion-safe:` (and see
   option G), camera shutter `active:scale-90` → `motion-safe:`.
5. Normalize easings to the three tokens: sidebar `ease-out`(511) /
   `ease-linear`(292,430) → `ease-standard`; sheet `ease-in-out` →
   `ease-enter`/`ease-standard` per §6; tailwind keyframes' `ease-out` →
   token curves; `.tab-slope` custom-prop transitions get an explicit
   `ease-standard`.
6. Exit asymmetry: dialog exit 150 (today 200 both ways); menu family exit
   ≤100.
7. Chart parity: monitoring's untuned recharts defaults ≠ dashboard's
   600 ms — resolve per option C either way.
8. Delete dead keyframes (`fade-in-up`, `slide-in`, `slide-in-down`,
   `row-fade`) or put them to use per §7; delete the unused carousel
   component's presence from any future motion accounting.
9. Workspace tabs: accent bar gets the same `transition-opacity` its
   ui/tabs twin has (workspace-tabs.tsx:178 vs tabs.tsx:63).
10. `usePresence(showCompare, 300)` vs the pane's 200+150: align the
    unmount delay to the real total (350) or drive both from one constant.
11. Smart-inbox drag ring: add the 150 ms transition (§9).
12. Tooltip provider: set the warm-up numbers app-wide (§6).

## 12. Open options — owner decision required (recommended first)

- **A. Tab-panel switch (step facets, monitoring/rappels tabs).**
  A1 (recommended): incoming-only fade + 3 px rise, 150 ms, motion-safe;
  keyboard switches instant. A2: fade only, no rise. A3: keep the snap
  (strict F0 reading — defensible via Rauno).
- **B. Teal value-change fade.** B1 (recommended): adopt for AI pre-fill
  landings + replay «modifié» + other-user live changes, ~2 s decay. B2:
  replay only. B3: skip.
- **C. Charts.** C1 (recommended): entrance animation OFF everywhere;
  data-update transitions keep recharts' in-place morph. C2: one tuned
  300 ms entrance, identical on dashboard + monitoring, reduced-motion
  disabled. (Either kills the current inconsistency.)
- **D. Layout-choreography fade split.** D1: keep 150 out/150 in. D2
  (recommended, subtle): re-weight to ~100 out/200 in (Material
  fade-through 90/210 ✓) — outgoing gets out of the way faster, incoming
  gets the attention. Same 300 ms total, same curve.
- **E. Toasts.** E1 (recommended): keep Radix toast, apply §6 exit/enter
  values + guards. E2: migrate to Sonner (best-researched motion,
  stacking, swipe physics — but a dependency + restyle; 52 call sites use
  the same API shape so migration is mechanical but wide).
- **F. Page entrances.** F1 (recommended): remove the dashboard's 300 ms
  `animate-fade-in` (routes are F1; skeleton crossfade in §7 covers
  arrival). F2: keep it on the dashboard only as the app's single "landing"
  moment. Never add it elsewhere.
- **G. Photo-grid hover zoom (Ken Burns scale-105, 300 ms).** G1
  (recommended): reduce to scale-[1.02] 150 ms motion-safe — media-preview
  affordance kept, drama removed (proportionality, Rauno ✓). G2: remove the
  zoom, keep the overlay fade. G3: keep as is (it's the one place scale-on-
  hover was never explicitly ruled on — flagging rather than silently
  keeping).
- **H. Workspace-tab lifecycle.** H1 (recommended): animate close (width
  collapse + fade 150 ms) and drag-reorder (FLIP via WAAPI, 200 ms), open
  stays instant-seat + existing `tab-slope-in`. H2: reorder only. H3: leave
  all instant (F0 reading).
- **I. Success morph** (spinner→✓) on F3 sends (rapport, envoi chiffrage).
  I1 (recommended): adopt, revert after ~1.5 s. I2: skip, inline
  « Envoyé » line only.

Every option's implementation stays inside §2 tokens and §3–§4 policies.

---

## Addendum 2026-09-02 — implementation record (owner: "do them all")

All recommended options + §11 implemented the same day. Verified: tsc clean,
eslint 0 errors (all warnings pre-existing), Tailwind compile clean, and the
fade-only dialog exit render-verified frozen at 50% (box centre == viewport
centre — the transform-replacement gotcha is avoided by the
`slide-out-to-*-1/2` pair re-supplying centring inside the exit keyframe).

What landed, by group:
- **Tokens**: `ease-enter (0,0,0,1)`, `ease-exit (0.3,0,1,1)`, `ease-soft`
  (named CSS `ease`, toast entrances only — arbitrary `ease-[ease]` does NOT
  compile, Tailwind flags it ambiguous); `animate-value-flash` (2s teal
  fade); `collapsible-down/up`; dead keyframes (`fade-in-up`, `fade-in`,
  `slide-in`, `slide-in-down`, `row-fade`) deleted; accordion/scale-in moved
  onto token curves.
- **Primitives**: dialog/alert-dialog/sheet overlays 200 in / 150 out +
  guards; dialog + alert-dialog exits 150ms fade-only; sheet 300 enter
  (`ease-enter`) / 200 exit (`ease-standard` — recallable); popover/
  dropdown/select/menubar origin-aware (`--radix-*-content-transform-origin`)
  150 in / 100 fade-only out + guards; tooltip fade + 2px shift 150ms, NO
  exit animation, provider warm-up 300/300 app-wide (the shell provider was
  `delayDuration={0}` — every tooltip opened with no hover intent; fixed);
  toast 300 `ease-soft` in / 200 `ease-exit` out; TabsContent + StepTabs
  panels = incoming-only 150ms fade + 3px rise (A1); Collapsible animated
  like Accordion (200ms); sidebar easings normalized to `ease-standard`;
  global reduced-motion rule rests every `.animate-spin` (one rule instead
  of ~59 call-site guards); `.tab-slope` transitions on the standard curve.
- **Pages**: charts entrance OFF everywhere (C1; dashboard Pie/Bar tuning
  props removed, monitoring Bar/Lines `isAnimationActive={false}`);
  dashboard page fade removed (F1); photo hover zoom softened to 1.02/150ms
  motion-safe (G1); camera shutter guarded; voice-player progress → scaleX;
  chiffrage-tab `transition-all` → `transition-shadow` + skeleton →
  `<Skeleton>`; smooth scrolls guarded via new `lib/motion.ts`
  (`scrollBehavior()`); planification-history reveal 150ms + guard;
  choreography re-weighted to 100 out / 200 in delay-100 (D2: dossier
  context panel, timeline bar, step-2 compare pane; 300ms tracks
  unchanged); workspace tabs: FLIP sibling slide (WAAPI, offsetLeft-based →
  zoom/scroll-safe) + width-collapse close for BACKGROUND tabs only (H1 —
  closing the ACTIVE tab navigates and stays instant per §1.3) + accent bar
  transition; AI pre-fill flashes every written field via
  `hooks/use-prefill-flash.ts` + `FieldRow` (B1); success morph ✓ « Envoyé »
  held 1.2s on ModalChiffrage and EnvoyerEmailDialog (I1).

Findings that deviate from the letter of §11/§12 (flagged, not silent):
1. **B1 replay half not applicable**: the replay dialog has no
   "jump to change" control — only the step bar, which is frequent
   navigation and must not flash (frequency law); the persistent
   ajouté/modifié/supprimé tints already mark changes. Flash implemented
   for the AI pre-fill only.
2. **§11.11 drag ring already transitions**: SmartInbox's drag-over ring is
   box-shadow on a Button whose base class already transitions box-shadow
   at 150ms — the inventory's "instant" flag was wrong; no change made.
3. **§11.10 usePresence(300) is correct as-is**: the pane must stay mounted
   for the full 300ms TRACK collapse (unmounting earlier snaps the 0fr
   animation); the 200+150 fade total was never the constraint. Left at 300.

NOT verified locally (needs the owner's eyes in the running app): tooltip
warm-up feel, toast enter/exit, tab-panel fade, workspace-tab FLIP/close,
prefill flash timing, success-morph hold, D2 weighting.

---

## Addendum 2026-09-02 (bis) — owner feedback round: the symbiote morph + gaps

Owner rulings from live testing, all implemented the same day:

1. **Active-highlight MORPH ("symbiote") is the law for selection travel.**
   (a) Sidebar: the active row's surface (tint + rim + 2px teal bar) is now
   ONE absolutely-positioned indicator that slides 200ms/standard from the
   old row to the new (`components/layout/sidebar.tsx ActiveRowIndicator`;
   rows keep only text/icon active treatment — ui/sidebar.tsx; the
   `nav-active-in` keyframe is retired). Measured via offsetTop chain
   (zoom/scroll-safe), re-measured by ResizeObserver on collapse. (b) Every
   `.tab-slope` strip (ui/tabs, StepTabs, workspace tabs — monitoring and
   rappels inherit): `hooks/use-tab-morph.ts` flies a GHOST wearing the full
   seated-teal paint (`.tab-slope-ghost .tab-slope-active`) from the old tab
   to the new over 200ms (WAAPI, MutationObserver-detected, reduced-motion
   exempt) while the per-tab 120ms fills crossfade beneath it.
2. **Edit-mode flip (« Modifier ») = one coordinated fade-through** —
   researched (Material choreography "transformation of the group…" ✓ via
   mirror, NN/g animation-purpose ✓ + duration ✓, Atlassian inline-edit
   Forge doc ✓ = geometric parity first, PatternFly ✓; Coyle 404): the
   whole `FieldRow` dl remounts and fades in as ONE group — 200ms
   decelerate into edit, 150ms back to read, NO stagger, no movement,
   borders emerge with the fade, instant under reduced motion.
3. **Dossier step fold/unfold animates** — grid-rows 0fr↔1fr 200ms standard
   + presence-kept children + chevron/margin on the same clock
   (timeline.tsx; inside the paper card so overflow-hidden clips nothing).
4. **TimelineBar hover shows the FULL name**: hovering/focusing a step now
   QUIETS the other steps' titles (they fold horizontally on the same
   200ms), freeing row width; the stamp's 200px cap is gone. Space-stealing
   is state-driven (CSS alone can't quiet siblings).
5. **Rappeler mode**: the dead per-COLUMN tick boxes (leftover of the
   retired Excel export — `handleExport` had no button) are REMOVED with
   their state/handlers; the selection toolbar enters with the 200ms
   fade + rise, and the row/header checkboxes fade+zoom in.
6. **Mes rappels**: built from ui/tabs + tables — the morph, panel fade and
   table hover rules apply by inheritance; no page-local motion added
   (frequency law).
7. **Chiffrage**: compare pane image gets 90° rotation (RotateCw in the
   zoom pill, animated on the existing 150ms transform transition, reset
   per image); the devis editor identity card is now a Collapsible
   (« Informations », 200ms, open by default); the line-item table is
   capped at ~20 compact rows (`max-h-[47rem]`) with its own vertical
   scrollbar under the sticky header; the assignations-chiffrage LIST row
   is fully clickable (row = link, inner link/button stopPropagation).

Verified this round: tsc clean, eslint 0 errors (new files warning-free),
dev server compiles and serves. NOT visually verified (owner's eyes):
sidebar morph feel (esp. collapsed mode + Récents rows), ghost flight over
the tab feet, step fold, space-stealing hover, edit-mode fade, rotation
with zoom+pan combined, the 20-row cap height at zoom 0.9/1.1.

## Addendum 2026-09-02 (ter) — carrier v2, step-bar morph, PACING ruling

Owner live-test rulings, implemented same day:

1. **Tab morph carrier v2.** The v1 ghost wore the full seated shape and its
   foot arcs aliased mid-flight; the clicked tab also seated itself at
   t=0. Now: the incoming tab goes ON HOLD (`.tab-morph-hold` — seat paint
   hidden, accent-bar span hidden) while a CLEAN carrier pill
   (`.tab-slope-ghost`: hover-strength accent fill + primary outline, 10px
   top radius, no foot gradients → nothing to alias) flies 300ms; on
   landing the hold lifts and the carrier fades out 100ms over the tab's
   own seat. NOTE: another session's "undecies" ruling meanwhile made the
   active tab a light « voile teal » (accent/0.45) — the carrier matches
   that world (accent fill, not primary).
2. **Step-bar morph.** The TimelineBar active pill's surface (accent veil +
   rim) is now ONE sliding indicator (300ms, offset-chain measured, RO
   follows the title unfold); buttons keep text/medallion treatment only.
3. **PACING (owner: "way too fast to the point they go unnoticed").**
   State-change animations move to the UPPER band of the researched
   ranges: selection travel (sidebar/tab/step morphs) 300ms; disclosures
   (accordion, collapsible, step fold, chevrons) 250ms (`duration-250`
   token added); mode flips 300 in / 200 out **with a 4px rise** (fade
   alone is invisible on hairline-on-cream content — the real cause of
   "borders don't animate" / "no animation on the tick boxes"); Rappeler
   toolbar 300ms + 8px rise, checkboxes 300ms fade + zoom from 75%; tab
   panels 200ms + 4px rise. Overlays, menus, tooltips and hover feedback
   keep the spec values (usability-critical speed).

## Addendum 2026-09-02 (quater) — carrier v3, segmented thumbs, layout stability

Owner live-test rulings, rounds 3–5, implemented same day:

1. **Carrier v3 — labels stay visible, compositor-only flight, connected
   base.** (Round 3: "the morph shouldn't remove the text"; round 4: "the
   fps is low, and the lines don't look connected on the bottom border".)
   The carrier now flies UNDER the tabs: `.tab-slope` has `z-index: 1`,
   the strips are `isolate`, the ghost sits at z 0 — every label keeps its
   own ink for the whole flight. The flight is compositor-only: the ghost
   is PLACED at the destination rect and a WAAPI `transform:
   translate+scale` carries it from the source (transform-origin 0 0,
   will-change: transform) — nothing re-laid-out per frame. Its rim is a
   real `border: 1px primary/0.6` with `border-bottom: 0` (10px top
   radius), so in flight the pill's base merges into the strip's
   separation line instead of showing a floating shadow seam.
2. **Segmented filters join the morph family.** New shared
   `ui/sliding-thumb.tsx` (`SlidingThumb`): one absolutely-positioned
   selection surface as the FIRST child of a `relative isolate` group,
   tracking the `[data-seg-active="true"]` descendant (offset-chain
   measured, RO re-measure, ready-gate, reduced-motion snap; 300ms
   standard — same law as sidebar/tab/step). Applied to the dossiers
   date-preset group (accent thumb) and the suivi d'équipe
   Jour/Semaine/Mois group (primary thumb). Buttons become ghosts over the
   thumb (active label z 1, own selected bg suppressed).
3. **Layout stability is part of motion.** (Owner: filter clicks displaced
   the whole page rightward.) Cause: the page scrollbar appearing/vanishing
   with result height. Fix: `scrollbar-gutter: stable` — but on the REAL
   scroller: the html-level rule shipped first and did nothing, because the
   shell is `h-svh overflow-hidden` and the page scrolls inside `<main>` in
   `app/(app)/layout.tsx`; the centered `max-w-[1600px]` column shifted by
   half a scrollbar. The gutter now lives on that `<main>`
   (`[scrollbar-gutter:stable]`), verified in headed classic-scrollbar
   Chrome at zoom 1/0.9 (7.5px shift → 0). Rule: any state change that can
   toggle a scroller's overflow must not move unrelated content — and the
   gutter must sit on the element that actually scrolls.
4. **Suivi d'équipe defaults to ALL TIME** (« Tout » preset; dateFrom/To
   null) — not a motion rule, recorded here because the segmented group
   gained the extra « Tout » segment the thumb travels to.
5. **Step-bar space-stealing folds RIGHT ONLY** (owner 2026-09-02): hovering
   a step no longer contracts every sibling — only the steps to the RIGHT of
   the hovered one fold to their medallions; the left side never moves (the
   reveal grows rightward, nothing the eye already passed shifts). The
   hovered step itself also grows rightward only: while a step is inspected
   the connectors LEFT of it are frozen at their measured width
   (`flex: 0 0 auto` + inline px, released on leave), so its left edge
   can't drift — only the right-hand flex-1 connectors absorb the reveal.
   Exception: the LAST step (8ᵉ, Honoraires) has no right side, so it alone
   keeps the old behaviour and grows leftward, folding its left siblings.
   Refinements 2026-09-03 (owner: hover-off jolt; « 2ᵉ accord » pushed
   left on hover transfer): (a) the un-freeze waits 250ms past the
   fold-back and ANIMATES each styled connector to its natural width
   (200ms standard) instead of snapping; (b) leaving a step keeps the
   inspection alive for a 100ms grace so a transfer to a neighbour never
   passes through the unfrozen null state; (c) a LEFT button whose
   details span is still open at freeze time is a hand-over mid-collapse:
   the connector right of it GROWS by the same Δ (span width + its
   ml-1.5) as a CSS width transition on the SAME 200ms standard clock,
   started in the same frame — the style engine keeps the pair's sum
   constant on every painted frame in every browser (a rAF compensator
   depended on when the engine samples in-flight transitions; a RO ran a
   frame late and dipped ~67px; flex-grow-999 routing leaked the right
   side's folded width into the left gap and shoved the hovered step
   ~300px right); (d) the active-step veil is a per-frame FOLLOWER
   (owner: "the bg colour doesn't follow the pill"): a rAF loop measures
   the active button's offset-chain box and writes the indicator style
   imperatively only when it changed — event-driven re-measures missed
   position shifts from connector freezes/settles and stranded the veil.
   Verified: zero drift on every step in painted AND mid-frame sampling
   for clean entry, hover transfer, and a 15-sweep chaos run; the veil
   ends pixel-aligned on the active step. (e) The connectors have NO
   min-width floor (owner 2026-09-03: "remove any hard limit"): the
   right-hand lines may contract to zero so the reveal takes ALL its
   room from the right side — re-verified in a 900px-narrow harness
   (zero left drift, right medallions pack fully).
   A long
   doer name in the hover stamp stacks over two rows (prénom / nom,
   `StepStamp stackLongName`, threshold 14 chars) instead of stretching the
   row; steps 6/11 now surface `lastStatusChange.byNom` so real names render
   instead of the « Utilisateur inconnu » fallback. The « Tout déplier /
   replier » button is REMOVED from the sticky bar — per-step chevrons are
   the only fold control.
6. **Foot-arc contour centred on the foot radius** (owner 2026-09-02: "the
   bottom edges of the border don't fit — not a continuous line"): the feet
   gradients drew the dark arc at radius foot−1..foot−0.5, ~1px INSIDE the
   notch, so it floated disconnected from the side border above and the
   separation line below. The stroke is now centred at radius = --tab-foot
   exactly (foot−0.5..foot+0.5, rim band shifted outward with it), landing
   tangent on both. Verified in a 6× side-by-side render.
7. **Every raw `.tab-slope` strip gets the morph** (owner: « vue dessus /
   dessous » didn't animate): new `useTabSlopeMorphRef()` callback-ref
   variant (object-ref effects never fire for conditionally-mounted strips)
   attached to the rapport diagram TabsPrimitive.List, the photos-tab
   grouping tablist (extracted as `PartitionTabs` — it renders per
   category), and both devis-editor reference-pane tablists; all four
   containers gained `relative isolate`.
8. **« Volume par étape » card rebuilt** (research ruling, not motion):
   vertical recharts bars → HTML horizontal bar list in pipeline order,
   full stage names left, counts printed at the bar tip (no axis/tooltip),
   faint shared-scale track, busiest stage in deeper teal, rows click
   through to the réalisé drawer. Charts stay `isAnimationActive={false}`
   and bar widths do NOT transition on filter change (F0).
