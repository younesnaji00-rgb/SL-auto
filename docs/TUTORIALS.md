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
  "?" button (bottom-right) mounted globally in the (app) layout and on
  /login. It appears only when the current route's tutorial has ≥1 step and
  pulses until first opened (localStorage `<brand>.tour.<key>`).
- Anchors: `data-tour="…"` attributes on the real UI. Prefix values with a
  short page code (e.g. `dos-`, `dash-`, `atg-`) to avoid collisions.

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
   elements inside horizontal scrollers if avoidable.

## data-tour placement rules

- Put the attribute on the STABLE container (the Card, the SelectTrigger,
  the Button), never on elements that unmount while typing/filtering.
- Radix `SelectTrigger` / `TabsTrigger` / `Button` forward unknown props to
  the DOM — `data-tour` works directly on them.
- Never rename or remove an existing `data-tour` value — tours reference
  them by string.

## Verification

- `npx tsc --noEmit` must pass.
- Every step's `anchor`/`click` value must exist in the page's JSX (grep it).
- Every French string in your steps must have an EN entry in your dictionary
  file (or already exist in another dictionary — grep before adding).

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
