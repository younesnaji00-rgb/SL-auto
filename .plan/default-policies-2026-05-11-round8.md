# Default policies — soft-stall fallbacks (Round 8)

## P-COPY
Mirror the tone and length of the closest existing French string on the
same surface. Log the source file:line in the DD entry.

## P-SPACING
Use the next-larger Tailwind class already present on the surface.

## P-EMPTY
Neutral one-line message, no CTA. Mirror `observations-tab.tsx:205-209`
or the equivalent on the parent surface.

## P-ERROR
Destructive-toned `<Toast>` matching photos-tab and observations-tab
patterns.

## P-LOADING
Existing `<Skeleton>` or `<Loader2>` spinner on the parent surface.

## P-BUTTON-VARIANT
Match sibling-button variant + size on the same surface.

## P-LEGACY-OBS-VISIBILITY
For Q-4 fallback during execution: if user picks A, legacy AT obs
(no phaseATG) appear in all 3 Plan steps; legacy chiffreur obs (no
accordSlot) appear in step 6 (Accord).

## P-LOG-NAME-FALLBACK
For Q-7 fallback: when `userNom` is missing on a log entry, display
the truncated email (everything before `@`). Wrap in a small helper
`displayUserName(entry)` so the rule is consistent everywhere.

## P-OBS-SECTION-DOSSIERS-CATCHALL
Observations written from `section='dossiers'` (gestionnaire from the
dossier view) are not tied to a single step. Per Q-1 default A, they
appear in every step's panel as a catch-all.

## P-CHIFFREUR-COMPOSE-DEFAULT
If the chiffreur compose-form `accordSlot` select is empty when they
hit Envoyer, default the field to `1er accord` and proceed (avoid hard
blocks). Toast to confirm. (Backup if Q-2 answer A creates UX drag.)

## P-FORMVALIDATION-INLINE
For new compose-form validation rules, show inline `text-[11px]
text-destructive` messages below the form (matches the existing both-
filled error on `observations-tab.tsx:198`).
