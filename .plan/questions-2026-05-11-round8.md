# Plan review — answer every question, then remove [BLOCKING] and re-invoke /loop

[BLOCKING] Remove this line when finished answering.

## Notes for the reviewer
- Plan summary: 16 items across 5 clusters. 5 visual+behavioral, 8 behavioral, 3 visual.
- Time budget: as long as it takes.
- 2ème accord ou + step (step 11) display is **out of scope** for this round
  per your "lets fix it tomorrow". Chiffreur observations will still be
  tagged so the future fix has the data ready.
- You can leave freeform notes anywhere — I'll read the whole file.

---

## Q-1 — Where should gestionnaire-written observations appear?

When you (or any Gestionnaire) write an observation from the dossier view
(currently from inside one of the step-scoped Observations panels), it
isn't tied to a specific planification phase or accord. Options:

- **A.** Show gestionnaire obs in **all** step panels (a catch-all — they're
  general, not scoped). Today's behavior is closest to this.
- **B.** Show gestionnaire obs **only in step 1 (Création de mission)** —
  treat them as project-level commentary.
- **C.** Show gestionnaire obs in their own **new "Observations générales"
  panel** at the top of the dossier view, separate from step-scoped ones.

Recommendation: **A**. Gestionnaire obs are usually general; scoping them
forces an extra decision at write time.

Answer:

---

## Q-2 — How does the chiffreur tag which accord their observation is about?

The chiffreur writes observations from the chiffrage detail page, which
doesn't know which accord is "current". Options:

- **A.** Add a Select to the compose form: "À propos de quel accord ?" →
  `1er accord` / `2ème accord ou +`. Required before send.
- **B.** Auto-tag as `1er accord` always (since step 11 is deferred, this
  matches today's primary chiffreur work).
- **C.** Compute the "stuck" accord automatically (latest cardinal slot
  without a saved doc). May guess wrong if multiple are open.

Recommendation: **A**. Cleanest data model; the user is the source of
truth.

Answer:

---

## Q-3 — How does the AT tag which phase their observation is about?

The AT writes observations from the assignations-atg detail page, which
tracks `currentCategory` (Avant / En cours / Après) via the active
mission tab. Options:

- **A.** Auto-use `currentCategory` (active mission tab). AT picks the
  tab first, then writes — implicit but obvious.
- **B.** Add a Select to the compose form: "Phase" → Avant / En cours /
  Après. Required before send.

Recommendation: **A**. Active tab is already the AT's context.

Answer:

---

## Q-4 — Legacy observations (no `phaseATG` / `accordSlot` tag)

Pre-existing observations don't carry the new context tags. Where do they
appear in the dossier-view step panels?

- **A.** Show legacy AT obs in all three Plan panels (avant + en cours +
  après); legacy chiffreur obs in step 6 (Accord). Catch-all per role.
- **B.** Hide legacy obs from step panels entirely; only visible if you
  open them from their original view (assignations-atg / chiffrage).
- **C.** Show them in step 1 (Création de mission) as a generic dump.

Recommendation: **A**. Preserves visibility of past observations without
forcing a backfill.

Answer:

---

## Q-5 — "Valider le traitement" button visibility

Today the button only renders for `role === 'Gestionnaire'`. You said you
don't see it — possibly because you're testing as Admin. Expand to:

- **A.** **Gestionnaire only** (current — strict).
- **B.** **Gestionnaire + Admin + Directeur / Directeur des opérations /
  Directeur technique** (admin family can validate anywhere).
- **C.** Anyone with write access to the dossier (`canWrite('dossiers')`).

Recommendation: **B**. Admins/directeurs commonly need to override.

Answer:

---

## Q-6 — Lightbox X close button position

Standard position is top-right. The current dialog title sits on the
left with the photo counter; the close X would go where?

- **A.** Top-right corner (standard, fixed position over the photo).
- **B.** In the header row, far right (next to the photo counter).
- **C.** Top-left, replacing or beside the back arrow style.

Recommendation: **A**.

Answer:

---

## Q-7 — Fallback when a log doesn't have the user's name

Old logs only persisted email. After we start writing `userNom`, old
entries still have no name. When rendering, show:

- **A.** **Email** if name is missing (visible, but not what you asked for).
- **B.** **"Utilisateur inconnu"** (consistent — hides the email but
  loses some info).
- **C.** **Truncated email** (everything before the `@`).

Recommendation: **C** — readable, doesn't show full email, doesn't fully
hide the actor.

Answer:

---

## Q-8 — Cancel button on the observation preset Select

You want a cancel/clear affordance when a user accidentally picks a preset
but wanted to type custom. Options:

- **A.** Inline **X icon inside the Select trigger** (clears the selected
  preset, returns to placeholder).
- **B.** Separate **"Annuler" text button** next to the Select (more
  obvious, takes a bit more space).
- **C.** Both — X in trigger AND a small "Effacer" link below when a
  preset is selected.

Recommendation: **A**. Compact and standard pattern.

Answer:

---

## Q-9 — Lightbox initial zoom

When the user clicks a photo, the lightbox opens. Initial state:

- **A.** **Fit-to-screen** (current — photo at 100% of available height,
  user zooms in if needed).
- **B.** **Full natural size** — photo opens at 100% native resolution,
  user can pan and zoom out to fit.

Recommendation: **A**.

Answer:

---

## Q-10 — Lightbox zoom controls position

Where do the zoom in / zoom out / reset buttons appear?

- **A.** **Bottom-center floating toolbar** (small, semi-transparent).
- **B.** **Top-right corner** next to the X close.
- **C.** **No buttons** — relies on scroll-wheel + pinch + double-click
  for zoom (touch + pointer).

Recommendation: **A** for discoverability; touch+wheel also work.

Answer:

---

## Freeform notes (anything else)
