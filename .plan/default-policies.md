# Default policies — soft-stall fallbacks (Round 9)

## P-COPY
Mirror tone + length of closest existing French string. Cite source file:line.

## P-SPACING
Use next-larger Tailwind class already present on the surface.

## P-EMPTY
Neutral one-liner, no CTA. Mirror `observations-tab.tsx` pattern.

## P-ERROR
Destructive-toned `<Toast>` matching `photos-tab.tsx` upload errors.

## P-LOADING
Existing `<Skeleton>` or `<Loader2>` spinner of the parent surface.

## P-BUTTON-VARIANT
Match sibling button variant + size on the same surface.

## P-LINK-WRAP
When wrapping text in a `<Link>`, keep the link element minimal — wrap only
the clickable label (e.g. just the username span), not the whole
"by [name]" phrase. Use `text-foreground hover:text-primary hover:underline
underline-offset-2` styling for low-key click affordance.

## P-EDITER-PARAM
For the per-slot Éditer button (item 004): URL = `/devis-editor?chiffrageId=
${id}&docType=${familyParent}&accordSlot=${slotLabel}`. Pass `accordSlot`
explicitly so the editor opens scoped to that slot (matches the existing
DocumentsFilterPanel pattern at assignations-chiffrage/[id]/page.tsx:189-205).

## P-LIGHTBOX-FIT
For the fit-to-screen fix (item 006): prefer `centerView(1, 200, 'easeOut')`
from a TransformWrapper ref. If that doesn't work in 4.0.3, fall back to
`resetTransform(200, 'easeOut')` followed by `centerView(1, 0)`.

## P-LEGACY-NAME-EMAIL
For historique entries that have `user` (email) but no `userNom`, render
"Utilisateur inconnu" (round 8 P-LOG-NAME-FALLBACK) as a Link to
`/utilisateurs?email=${entry.user}`. The page handles the no-match case
per Q-1.
