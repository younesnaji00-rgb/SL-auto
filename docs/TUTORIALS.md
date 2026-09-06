# Per-page guided tutorials (driver.js)

Every page has its own coachmark tour explaining how the page works and how
each in-page step of the workflow functions. This doc is the contract for
writing/maintaining them.

## Architecture

- Engine: `src/lib/tutorial/tour.ts` (driver.js 1.8, popover class `sl-tour`
  styled at the end of `src/app/globals.css`).
- One `PageTutorial` per page in `src/lib/tutorial/pages/<page>.ts`,
  registered in `src/lib/tutorial/registry.ts` (already wired — fill the
  stub's `steps`, don't touch the registry).
- Entry point: `src/components/tutorial/tutorial-launcher.tsx` — a floating
  "?" button mounted globally in the (app) layout and on /login. It appears
  only when the current route's tutorial has ≥1 step and pulses until first
  opened (localStorage `<brand>.tour.<key>`). It **starts** bottom-right and
  is **draggable**: the drop point is stored as a fraction of the viewport
  (`<brand>.tour.launcherPos`) so the same corner survives a different
  screen. Arrow keys nudge it when it has focus.
- User preferences: `src/lib/tutorial/prefs.ts` — the off switch
  (`<brand>.tour.disabled`) and the launcher position, kept out of
  `tour.ts` so the sidebar can read them without pulling driver.js into its
  chunk. Both are per browser and per brand.
- Anchors: `data-tour="…"` attributes on the real UI. Prefix values with a
  short page code (e.g. `dos-`, `dash-`, `atg-`) to avoid collisions.

## Turning the tutorial off (and back on)

The welcome lightbox carries **« Ne plus afficher le tutoriel »**. It sets
`<brand>.tour.disabled`, which hides the lightbox, the discovery spotlight
AND the "?" button — so the only way back is the **« Réactiver le tutoriel
guidé »** row the sidebar's *Aide* menu grows while the flag is set (visible
only to a role the brand offers tutorials to). If you ever remove that row,
you strand every user who declined.

## Step conventions (follow the exemplar `pages/consultation.ts`)

1. **Intro step first** — no `anchor` (renders centered): what the page is
   for, who uses it, where it sits in the claim workflow.
2. **One step per functional zone**, ordered the way a user actually works
   (search → filters → list → actions → detail).
3. **Explain the workflow steps of the page**, not just the widgets: for a
   page hosting a multi-step process (e.g. a file's tabs: import documents →
   schedule → estimate → agreement → report), add a step per stage that says
   what the stage accomplishes and what to do in it.
4. Titles ≤ 5 words. Bodies 1–3 short sentences, plain language, concrete
   ("Cliquez sur…", "Tapez…"). No jargon the page itself doesn't use.
5. Texts are FRENCH source strings (they ARE the i18n keys). Add the English
   to your assigned `src/i18n/en/tutorial-*.ts` file — key must match the
   French EXACTLY (accents, punctuation, apostrophes).
6. Steps whose element only exists on desktop or mobile are fine — steps are
   auto-skipped when their anchor is absent. Use this instead of branching.
7. To highlight something inside a tab/menu, set `click: '<data-tour of the
   trigger>'` on the step (+ `dynamic: true` if the anchor doesn't exist
   until the click). The engine clicks, waits `delay` (default 350 ms), then
   highlights. Always leave the page on its default tab at tour end (add a
   final step that clicks back to the first tab, or anchor the last step
   outside the tabs).
8. Mobile: popovers are width-capped; keep bodies short. Don't anchor to
   elements inside horizontal scrollers if avoidable. The sidebar lives in an
   off-canvas sheet below `lg`, so every `nav-*` anchor is absent there —
   give a mobile-only counterpart step (see `shell-mobile-nav` in
   `pages/sidebar-intro.ts`) rather than branching.
9. **Collapsible sections**: a collapsed disclosure unmounts its content, so
   anchors inside one do not exist and the step is dropped. Set
   `expand: '<data-tour of the disclosure button>'` — the engine clicks it
   only when it reports `aria-expanded="false"`, so a section the user has
   already opened is never closed. Steps carrying `expand` survive the
   presence filter, like `click` ones. Every dossier-timeline step uses this
   (`expand: 'dosd-sec-<id>'`).
10. **Resume markers are title-based.** `tour.ts` stores the interrupted
   step's TITLE (`<brand>.tour.<key>.at`) as well as its index, and prefers
   the title on resume — the index refers to the FILTERED list, which changes
   with page state. Renaming a step title is therefore harmless; it only
   costs one stale resume.

## data-tour placement rules

- Put the attribute on the STABLE container (the Card, the SelectTrigger,
  the Button), never on elements that unmount while typing/filtering.
- Radix `SelectTrigger` / `TabsTrigger` / `Button` forward unknown props to
  the DOM — `data-tour` works directly on them.
- Never rename or remove an existing `data-tour` value — tours reference
  them by string.

## Verification

- `npm run typecheck` must pass.
- `npm run check:tours` must pass. `scripts/check-tour-anchors.mjs` parses
  the real syntax tree and fails when a tour references an anchor no component
  can render — following ternaries, local consts, small render helpers and
  `dataTour` props. This is the guard against the failure mode that made the
  tutorial drift out of date in the first place: a redesigned page drops a
  `data-tour`, the engine silently filters the step out, and the tour quietly
  teaches less every release. Anchors built from a template
  (`\`nav-\${item.href}\``) are declared in that script's `DYNAMIC` table —
  add the values the app can emit when you introduce one, or the check fails
  with "template anchor prefix with no DYNAMIC entry".
  `--list` prints every anchor the app renders, which file owns it, and the
  ones no tour uses yet.
- Every French string in your steps must have an EN entry in a dictionary file
  (or already exist in another — grep before adding). Copy the French key
  verbatim; typographic apostrophes and « » must match exactly.
- `npm run build` for BOTH brands (`NEXT_PUBLIC_BRAND=demo npm run build`).
- If you touch the launcher's POSITIONING, run `npm run check:launcher-drag`
  against a demo-brand dev server (`NEXT_PUBLIC_BRAND=demo npx next dev -p 9011`;
  the demo brand offers tutorials to every role, so the button renders on
  /login without signing in). It drives a real Chrome over the DevTools
  Protocol and sweeps the density zooms.

  **Why a browser test:** the app sets CSS `zoom` on <html> (0.9 on 1080p, 1.1
  on 1440p). Pointer coordinates and `getBoundingClientRect()` are in VISUAL
  viewport pixels; an inline `left`/`top` is in the ZOOMED document space and
  renders at `value * zoom`. Writing one into the other displaced the button
  by (zoom − 1) × its distance from the origin — it teleported the moment it
  was grabbed. **At zoom 1 it looked perfect**, which is what a default
  headless window reports, so any check that does not sweep the zoom values
  will pass a broken build. Convert with `appZoom()` /  `place()` in
  tutorial-launcher.tsx, and note that the button's on-screen radius is
  `BTN * zoom`, not `BTN`.

  Two traps when running dev servers for this: never run two `next dev`
  instances from the same checkout (they share `.next` and overwrite each
  other's client bundle, so the wrong BRAND is served), and killing the task
  wrapper does not always kill `next dev` — free the port explicitly.

## Who sees the tutorials (brand gating)

- `BRAND.showTutorials` turns the whole feature on/off per brand.
- `BRAND.tutorialRoles` (array or `null`) restricts it to given roles. The
  firm brand (`slaoui`) ships `['Admin']`: only administrators get the "?"
  launcher and the post-login prompt; the login page shows nothing (role
  unknown). The demo brand ships `null` (everyone). Helper:
  `tutorialsEnabledFor(role)` in `src/lib/tutorial/access.ts`.
- Language follows the brand: the firm brand is locked to French, so only the
  French (source-key) texts ever render there.
- Journey-only affordances (self-addressed rappels, HTML mission import, the
  gallery "Importer des photos" button on a mission, the user's own position
  standing in for the agent's GPS) are gated by `useTutorialMode()`
  (`src/lib/tutorial/use-tutorial-mode.ts`): always on for the demo brand,
  otherwise only for an allowed role WHILE a tour is running (or a chained
  hand-off is pending). Outside a tour the firm's app is unchanged.
- Step bodies may quote `{addr1}` / `{addr2}`: `tour.ts` substitutes
  market-specific example addresses (`BRAND.market`) at render time.
- NOTE for the firm brand: the hands-on lab creates a REAL dossier in the
  production Firestore (mission import, planifications, chiffrage…) — it is
  not sandboxed. Admins should delete the tutorial dossier afterwards.
