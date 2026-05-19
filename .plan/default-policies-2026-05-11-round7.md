# Default policies — soft-stall fallbacks

Applied when a subagent hits an unanticipated decision mid-execution.
Each application logs a `DD-NNN-X` entry in `tasks.md ## Deferred decisions`.

## P-COPY
Rule: For unspecified user-facing French copy, mirror the tone and length
of the closest existing string on the same surface.
Why: Keeps voice consistent without re-asking the user.
How to apply: Cite the source `file:line` in the DD entry.

## P-SPACING
Rule: For unspecified Tailwind spacing, use the next-larger class already
present on that surface.
Why: Preserves rhythm without invention.

## P-EMPTY
Rule: For unspecified empty states, render a neutral one-line message and
no CTA. Mirror the `observations-tab.tsx:205-209` pattern.

## P-ERROR
Rule: For unspecified error paths, surface the underlying message in a
destructive `<Toast>` (mirror `photos-tab.tsx` upload error handling).

## P-LOADING
Rule: Use existing `<Skeleton>` (historique-tab.tsx style) or `<Loader2>`
spinner (observations-tab.tsx style) of the parent surface.

## P-BUTTON-VARIANT
Rule: Match sibling-button variant + size on the same surface.

## P-MULTISELECT
Rule: Reuse `@/components/ui/multi-select` exactly as
`utilisateurs/client-page.tsx` uses it for `compagnies`.

## P-OWNER-OR-ADMIN
Rule: For delete buttons with existing ownership checks (e.g. ATG can only
delete own photos), keep the check and AND with the new `canDelete` gate:
`canDelete || (isOwner && existingRoleCheck)`.

## P-RETRO
Rule: No data migrations for SLA recompute. Existing `hors délai` flags
recompute on next read.

## P-SCANPROMPT
Rule: Keep scan-document Gemini prompt in English (existing schema).

## P-INLINE
Rule: Inline edit affordances use `<Popover>` from shadcn.

## P-NATIVE
Rule: Time input is native `<input type="time">`.

## P-PAIRED-ROWS
Rule: Item 009 reorder uses explicit pair `<div grid grid-cols-2>` rows.

## P-AUTHOR-EMAIL
Rule: Author stamp on workflow entries shows email (mirror `timeline.tsx:44`).

## P-DIR-PARITY
Rule: Newly added `Directeur` / `Directeur technique` roles inherit
permissions equivalent to `Directeur des opérations` for canWrite, and
join the canDelete set.

## P-COMPOSE-HEADER
Rule: Valider button placement is per-observation (an icon-button in the
top-right of each observation card). See item 014.

## P-IRREVERSIBLE
Rule: "Traitement validé" is forward-only — no un-validate button.

## P-OPTIONAL-PROOF
Rule: Proof file upload after validation is optional.

## P-UPLOAD-DEFAULTS
Rule: Accept `image/*` + `application/pdf`; soft-limit 20MB.

## P-SHARED-PROOFS
Rule: Proof subcollection `traitement_proofs` is shared across ATG and
chiffreur views; both write and read.

## P-GEST-SEES-ALL
Rule: Gestionnaire always sees every observation regardless of source.

## P-LEGACY-OBS-VISIBLE
Rule: Pre-existing observations without an `accordSlot`/phase tag remain
visible (no over-hiding of legacy data).

## P-LIGHTBOX-META
Rule: Lightbox header shows file name + uploader + uploadedAt.

## P-LIGHTBOX-NOANIM
Rule: No animation on photo swap.

## P-PARTIAL-ACCEPT
Rule: Photo cap accepts up to the cap, toasts the rest.

## P-COUNT-ALWAYS
Rule: Photo count badge always shows "{n}/30" for all viewers.

## P-REFORME-ALL
Rule: Proposition réforme lifts cap on all three photo sections.

## P-DOSSIER-FLAG
Rule: Proposition-réforme stored as `propositionReforme: boolean` on the
dossier doc.

## P-MULTI-AUTRE
Rule: "Autre" slot accepts multiple uploads.

## P-STEP4-ONLY
Rule: 7-required-doc gate applies only on step 4 Assigner-au-chiffrage.

## P-SITES-OPTIONAL
Rule: Sites field is optional on user form.

## P-EMPTY-SITES-ALL
Rule: Empty sites array means "no restriction".

## P-SITES-DATA-ONLY
Rule: Sites field stored but no filtering wired up in this batch.
