# REDESIGN: Modals (Area 12 / 16)

Scope: shared modal components consumed across dossier/assignation/utilisateurs flows. Note: per-page modals inside `dossiers/[id]/modal-*.tsx` were captured in the dossier-detail plan at the pattern level — this area covers only the shared/cross-cutting modals in `src/components/modals/`.

## Files in scope

- [src/components/modals/chiffreur-dialog.tsx](../src/components/modals/chiffreur-dialog.tsx)
- [src/components/modals/dossier-edit-modal.tsx](../src/components/modals/dossier-edit-modal.tsx)
- [src/components/modals/options-manager-modal.tsx](../src/components/modals/options-manager-modal.tsx)

## Current state (audit)

### chiffreur-dialog.tsx (211 lines)

Combo Select + Dialog: picks a chiffreur from the dropdown OR opens a dialog to manage chiffreur list.

- **Wrong-locale phone placeholder**: [line 154](../src/components/modals/chiffreur-dialog.tsx#L154) `placeholder="+33 6 00 00 00 00"` — **French phone format** in a **Moroccan** app. Should be `"+212 6 00 00 00 00"` or `"0600 000 000"`.
- **Generic name placeholder**: [line 137](../src/components/modals/chiffreur-dialog.tsx#L137) `placeholder="Jean Dupont"` — generic French placeholder. Not as flagrant as "John Doe" but still generic. Could localize to Moroccan realistic name (e.g., `"Ex: Karim Lahlou"`).
- **Generic email**: [line 146](../src/components/modals/chiffreur-dialog.tsx#L146) `"jean@example.com"` — fine (example domain is conventional).
- **Hardcoded amber workload badge** at [lines 104](../src/components/modals/chiffreur-dialog.tsx#L104): `bg-amber-100 text-amber-800 ... dark:bg-amber-900/40 dark:text-amber-300`. Retune warm or consolidate with badge variants.
- **`confirm()`** on delete at [line 75](../src/components/modals/chiffreur-dialog.tsx#L75) — `confirm("Supprimer ce chiffreur ?")` — must become AlertDialog.
- **Inline Save spinner** at [lines 167-170](../src/components/modals/chiffreur-dialog.tsx#L167-L170) — Button loading prop.
- **Uppercase header label** `"Gestion de la liste"` at [line 173](../src/components/modals/chiffreur-dialog.tsx#L173) `text-xs font-bold uppercase text-muted-foreground` — consistent with rest of app's uppercase label pattern.
- **Strike-through inactive names** at [line 176](../src/components/modals/chiffreur-dialog.tsx#L176) — nice detail, preserve.
- **List management inline inside Dialog** — the "Gestion de la liste" section has per-row edit/delete inside the same dialog. Good pattern.
- **Select placeholder** depends on `loading`: `"Chargement…"` vs `"Choisir un chiffreur"` — clean.

### options-manager-modal.tsx (212 lines)

Admin-only dropdown-option CRUD. Manages dynamic lists (natures, statuts, compagnies, types_documents, etc.).

- **Admin gate** at [line 40](../src/components/modals/options-manager-modal.tsx#L40) — preserve.
- **Hardcoded blue trigger button**: [line 113](../src/components/modals/options-manager-modal.tsx#L113) `text-blue-600 dark:text-blue-400` on the Settings icon button.
- **Hardcoded green Check icon**: [line 153](../src/components/modals/options-manager-modal.tsx#L153) `text-green-600` on the save-edit button during row edit.
- **Hardcoded blue Settings icon**: [line 168](../src/components/modals/options-manager-modal.tsx#L168) `text-blue-600 dark:text-blue-400` on the edit button in each row.
- **`confirm()` for delete** at [line 94](../src/components/modals/options-manager-modal.tsx#L94) — `confirm('Supprimer "${label}" ? Cette action est irréversible.')` — must become AlertDialog.
- **Empty/loading states**:
  - Loading centered Loader2 at [line 138](../src/components/modals/options-manager-modal.tsx#L138).
  - Empty plain italic text at [line 140](../src/components/modals/options-manager-modal.tsx#L140) `"Aucune option."`.
- **Reconcile-canonical-statuts feature** at [lines 75-91, 194-205](../src/components/modals/options-manager-modal.tsx#L75-L91) — preserve exactly. Button conditional on `collectionName === 'options_statuts'`.
- **Microcopy**: `"Les modifications sont appliquées instantanément partout dans l'application."` at [line 193](../src/components/modals/options-manager-modal.tsx#L193) — good inline helper.
- **Keyboard UX**: Enter submits Add; Enter inside edit saves edit. Preserve.
- **Group-hover reveal** on row actions (`opacity-0 group-hover:opacity-100`) at [line 168](../src/components/modals/options-manager-modal.tsx#L168) — good, preserve.

### dossier-edit-modal.tsx (120+ lines read)

Heavy form modal for editing dossier metadata (expertRank, compagnie, typeDossier, nature, assure details, vehicule details, dates, intermediaire, police, garage).

- Read-only first half; inferred back half:
  - More form fields (likely grid layout).
  - Save button with inline spinner → Button loading prop.
  - Cancel/close buttons.
- Uses `useOptions` for all dropdown sources — correct, preserve.
- `getDoc` on open + `updateDoc` on save — preserve.
- `parseDate` helper (handles Timestamp vs Date vs string) — preserve.
- RadioGroup for `repairerType: 'Agréé' | 'Non Agréé'` — preserve.
- Default value for `expertRank: '1er expert'` — preserve.
- **Dialog size**: inferred `sm:max-w-*` — verify fits content with Outfit.

### Cross-cutting issues across all modals

1. **Dialog backdrop** — default `bg-black/80`. Will be retuned to warm-tinted `bg-[hsl(var(--foreground)/0.55)] backdrop-blur-sm` in shared-ui.
2. **Inline Loader2 on save buttons** — replace with Button loading prop.
3. **`confirm()` for destructive actions** — wrap in AlertDialog. Can be nested inside existing Dialog via `AlertDialog` (Radix allows this).
4. **Hardcoded action-icon colors** — inherit or use semantic tokens.
5. **Empty/loading states** — use shared-ui primitives.

## Concrete changes

### chiffreur-dialog.tsx

- **Phone placeholder**: [line 154](../src/components/modals/chiffreur-dialog.tsx#L154) `"+33 6 00 00 00 00"` → `"0600 000 000"` (Moroccan format) or `"+212 6XX XX XX XX"`. Confirm with user.
- **Name placeholder**: [line 137](../src/components/modals/chiffreur-dialog.tsx#L137) `"Jean Dupont"` → `"Ex: Karim Lahlou"` or leave blank with `required` asterisk. Lean localize.
- **Workload badge**: retune [line 104](../src/components/modals/chiffreur-dialog.tsx#L104) from `bg-amber-100 text-amber-800` → use the retuned `warning` status chip from shared-ui (or keep Tailwind `amber-*` post-foundation-tokens-review if it still reads warm).
- **Delete AlertDialog**: wrap the Trash IconButton at [line 189](../src/components/modals/chiffreur-dialog.tsx#L189) with AlertDialog. Copy: `"Supprimer ce chiffreur ?"` / `"Cette action est irréversible."` / confirm destructive `"Supprimer"` / cancel `"Annuler"`.
- **Button loading**: `<Button loading={saving}>{editTarget ? "Mettre à jour" : "Ajouter"}</Button>`.
- **Select item chiffreur name + count**: the per-row flex layout is clean, keep.
- **Gestion de la liste** section: keep uppercase label but switch to the standardized `text-xs font-semibold uppercase tracking-[0.08em]` from foundation-tokens.
- **Visual**: review Dialog width — `max-w-lg` may feel wide; could tighten to `max-w-md` if fields don't overflow.

### options-manager-modal.tsx

- **Trigger button**: [line 113](../src/components/modals/options-manager-modal.tsx#L113) drop `text-blue-600 dark:text-blue-400`. Use `text-muted-foreground hover:text-foreground` (follows ghost variant).
- **Check save button**: [line 153](../src/components/modals/options-manager-modal.tsx#L153) drop `text-green-600`. Use `text-primary` (teal) since it's confirming an edit — primary-action tint is correct.
- **Edit Settings icon**: [line 168](../src/components/modals/options-manager-modal.tsx#L168) drop `text-blue-600 dark:text-blue-400`. Use inherit or `text-muted-foreground group-hover:text-foreground`.
- **Delete AlertDialog**: wrap the Trash button at [line 173-182](../src/components/modals/options-manager-modal.tsx#L173-L182) with AlertDialog. Include the label in the title: `"Supprimer « {label} » ?"` with `"Cette action est irréversible."` subtitle.
- **Loading state**: replace [line 138](../src/components/modals/options-manager-modal.tsx#L138) centered Loader2 with `<InlineLoader label="Chargement des options" />` or skeleton rows.
- **Empty state**: replace [line 140](../src/components/modals/options-manager-modal.tsx#L140) plain text with `<EmptyState icon={<Settings />} title="Aucune option" description="Ajoutez votre première option avec le champ ci-dessus." />`.
- **Add button loading**: [line 131-133](../src/components/modals/options-manager-modal.tsx#L131-L133) use Button loading prop (already has Loader2 pattern).
- **Reconcile canonical button**: keep. Retune spinner via Button loading prop.
- **Microcopy** "Les modifications sont appliquées instantanément...": preserve verbatim, good inline helper.
- **Preserve all hook contracts** (`useOptions`, `reconcileCanonicalStatuts`).

### dossier-edit-modal.tsx

(Full form body not read; apply pattern-level plan.)

- **Save button loading prop** in footer (inferred).
- **Cancel button**: outline variant, `"Annuler"`.
- **Form field review**: every `Label + Input` / `Select` / `RadioGroup` inherits warm palette.
- **DatePicker fields** (dateRequete, vehicule.mec, dateSinistre): inherit calendar palette.
- **Field grid**: verify with Outfit font that labels don't wrap unexpectedly.
- **No `confirm()` expected** (edit modal, not delete).
- **No hardcoded colors expected** (heavy form, mostly neutral).
- **Preserve all Firestore paths and payload shapes** (`assure.{nom,telephone,whatsapp,telephone2}`, `vehicule.{marque,modele,immatriculation,registrationW,mec}`, flat `intermediaireNom/Email`, `referenceCompagnie`, `policeNumber`, `repairerType`, `garageName`).

### Cross-cutting (handled by shared-ui foundation-tokens + shared-ui plans)

- Dialog backdrop tinted warm → auto via shared-ui.
- Dialog radius `rounded-lg` consistency → already via Dialog primitive.
- Focus rings on form controls → already via globals.css.
- Button hover/active feedback → already via shared-ui update.

## Constraints / no-go

- Do **not** change the `useChiffreurs` / `useChiffreurWorkload` / `useOptions` hook contracts.
- Do **not** change `reconcileCanonicalStatuts` import or usage.
- Do **not** change the admin gate in options-manager.
- Do **not** change the Firestore `getDoc` / `updateDoc` paths in dossier-edit-modal.
- Do **not** change the `parseDate` helper or its Timestamp/Date/string fallbacks.
- Do **not** change the `collectionName === 'options_statuts'` conditional for the canonical-sync button.
- Do **not** change the `active` Switch field semantics on chiffreur form.
- Do **not** change the inline-edit Enter/Escape keyboard shortcuts in options-manager.
- Do **not** change the `group-hover:opacity-100` reveal pattern for row actions in options-manager.
- Preserve French copy verbatim except:
  - Placeholder `"Jean Dupont"` → Moroccan-realistic (user approval).
  - Phone `"+33..."` → `"+212..."` or Moroccan format (user approval — obvious fix).

## Risk level

**Medium.** Destructive-action dialog swaps (`confirm()` → AlertDialog) × 2 change critical user interactions. Placeholder localization (Jean Dupont → Karim, +33 → +212) is behavioral but tiny. Form modal (`dossier-edit-modal`) is heavy; visual-only changes, no logic touched.

## Dependencies

- **Requires foundation-tokens, shared-ui** — Dialog + AlertDialog primitives + Button loading + EmptyState + InlineLoader + retuned backdrop.
- **Coordinates with dossier-detail plan** — the `modal-planification.tsx`, `modal-chiffrage.tsx`, etc. per-page modals are already covered under that area. Don't double-plan.
- **No blocks.**

## Exit criteria

- `npm run typecheck` passes.
- No `confirm()` calls remaining in any modal.
- No `text-blue-*` or `text-green-*` hardcoded on action icons.
- Phone placeholder localized to Morocco (if user approves).
- Name placeholder localized from Jean Dupont (if user approves).
- Workload amber badge retuned consistently with other status badges.
- All save/delete buttons use Button loading prop.
- Empty/loading states in options-manager use EmptyState/InlineLoader.
- Dialog backdrop warm-tinted (auto via shared-ui).
- Chiffreur list inactive strike-through preserved.
- Reconcile canonical statuts still works (click → toast).

## Open items to resolve during implementation

1. **Localize "Jean Dupont"** — which Moroccan name? Match utilisateurs decision ("Ahmed Benali" or similar).
2. **Localize phone placeholder** — `"0600 000 000"` (local-format) or `"+212 6XX XX XX XX"` (international)? Lean local since Moroccan users likely input local.
3. **Workload badge warm retune** — amber-50 bg + amber-800 text, or swap to `warning` Alert-style color via CSS var? Lean Tailwind shade retune (minimal churn).
4. **Dialog `max-w-lg` vs `max-w-md` on chiffreur-dialog** — review after Outfit loads.
5. **AlertDialog nesting inside Dialog** — Radix supports; verify no focus-trap conflict during implementation.
