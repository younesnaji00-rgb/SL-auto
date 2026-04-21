# REDESIGN: Editor (Area 14 / 16)

Scope: PDF annotation canvas at `/editor`. 1350-line surface with toolbar, canvas viewer, comparison panel, PDF.js integration, annotation model (line/text/stamp). **Strict constraint**: polish toolbar + tool-active state only. Do NOT touch canvas logic, PDF.js flow, or annotation data model.

## Files in scope

- [src/app/editor/page.tsx](../src/app/editor/page.tsx) *(1350 lines)*
- [src/app/editor/reference-panel.tsx](../src/app/editor/reference-panel.tsx) *(not read — side-by-side comparison panel)*

## Current state (audit)

### Annotation color palette (preserve)

[page.tsx:47-54](../src/app/editor/page.tsx#L47-L54) defines user-facing drawing colors:
```ts
const COLORS = [
  { name: 'Rouge', value: '#dc2626' },
  { name: 'Bleu', value: '#2563eb' },
  { name: 'Noir', value: '#000000' },
  { name: 'Vert', value: '#16a34a' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Violet', value: '#7c3aed' },
];
```
**These are annotation tool colors, not UI chrome.** Users need to draw with these colors on PDFs. **Preserve verbatim.** The French names (Rouge/Bleu/Noir/Vert/Orange/Violet) are correct.

### Canvas backdrop (preserve)

[page.tsx:1036](../src/app/editor/page.tsx#L1036): `bg-slate-200 dark:bg-slate-800` on the PDF viewer surface. Slate provides contrast against white PDF pages — switching to cream would merge into document color. **Preserve slate**.

### Hardcoded blue in selection indicators

Three violations for annotation selection highlight:
- [Line 1290](../src/app/editor/page.tsx#L1290) line annotation hover + selected: `isSelected ? 'bg-blue-500/10 ring-2 ring-blue-500' : 'hover:bg-blue-500/5'`.
- [Line 1325](../src/app/editor/page.tsx#L1325) stamp selected ring: `ring-2 ring-blue-500 ring-offset-1`.

These are UI chrome indicating selection state — must become teal (`--primary`).

### Toolbar structure

**Top row** ([page.tsx:~780-852](../src/app/editor/page.tsx)): file type filter + file switcher + `({pageCount} p.)` counter + Comparaison toggle + Save + Exporter PDF.

- File source indicator chip at [line 815](../src/app/editor/page.tsx#L815): `text-[9px] bg-muted px-1 rounded font-semibold` — tiny, functional.
- Comparaison toggle variant switches `default` ↔ `ghost` — inherits teal.
- Save/Exporter buttons use inline Loader2 spinner. Replace with Button loading prop.

**Tools row** ([page.tsx:855-1020](../src/app/editor/page.tsx#L855)):
- Tool group (Select / Text / Line / Stamp): `bg-muted/50 p-0.5 rounded-md` container with Buttons toggling `variant={tool === 'X' ? 'default' : 'ghost'}`. Clean active-state pattern. Inherits teal.
- Stamp popover: custom stamps from localStorage, with grid, add/delete.
- Color swatches (line 925-941): round buttons with `ring-2 ring-primary/30` on selected. Already teal-tokenized.
- Font size slider + font-size display.
- Line thickness slider.
- Delete / Clear All buttons: `text-destructive hover:bg-destructive/10` — good tokens.
- Zoom controls in `bg-muted/50 rounded-md` pill.
- Rotation controls in `bg-muted/50 rounded-md` pill.

### Stamp panel ([page.tsx:873-919](../src/app/editor/page.tsx#L873))

- Popover with 3-col grid of saved stamps.
- Label: `text-xs font-semibold text-muted-foreground uppercase tracking-wider` ✅ (standardize to `tracking-[0.08em]`).
- Active stamp: `border-primary ring-2 ring-primary/30` ✅.
- Delete X bubble: `bg-destructive text-white` at [line 889](../src/app/editor/page.tsx#L889) — use `text-destructive-foreground` instead of literal `text-white`.
- Empty state: plain italic "Aucun tampon importé" at [line 899](../src/app/editor/page.tsx#L899) — use EmptyState.
- Import stamp button: `variant="outline"` with `Plus` icon.
- `savedStamps` persisted via localStorage — preserve.

### Save/Export behavior

- [Line 844](../src/app/editor/page.tsx#L844): Save disabled if `!isChiffrageFile` with tooltip `"Lecture seule (fichier dossier)"` — smart read-only gate for dossier-sourced files (not in the chiffrage flow).
- [Line 848](../src/app/editor/page.tsx#L848): Export always available.
- Both use inline `{isSaving ? <Loader2 /> : <Save />}` pattern — Button loading.

### Delete bubble on annotations ([page.tsx:1338-1346](../src/app/editor/page.tsx#L1338-L1346))

- `bg-destructive text-white rounded-full w-5 h-5` — `text-white` should be `text-destructive-foreground`.
- Positioned `-top-3 -right-3`, visible on selection or hover.
- Good pattern, preserve.

### Numeric displays

Multiple `text-[10px] font-bold` usages for zoom/rotation/size readouts (lines 1002, 1015, 959-961, 980-982). Change to `text-[10px] font-semibold tabular-nums` for number consistency + Outfit-appropriate weight.

### PDF.js + canvas

[PDF.js loading pattern](../src/app/editor/page.tsx#L165-L173): promise-based import, worker registration at `/pdf.worker.min.mjs`. **Don't touch.**

[PageWrapper component](../src/app/editor/page.tsx#L1074-L1100): renders canvases + annotations. Mouse event plumbing to parent. **Don't touch.**

[Annotation rendering](../src/app/editor/page.tsx#L1256-L1348): absolutely positioned overlays on top of PDF pages. **Don't touch placement or hit-testing.**

## Concrete changes

### Selection indicators — tealize

- [Line 1290](../src/app/editor/page.tsx#L1290):
  - `isSelected ? 'bg-blue-500/10 ring-2 ring-blue-500' : 'hover:bg-blue-500/5'`
  - →
  - `isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-primary/5'`
- [Line 1325](../src/app/editor/page.tsx#L1325):
  - `ring-2 ring-blue-500 ring-offset-1`
  - →
  - `ring-2 ring-primary ring-offset-1`

### Delete bubbles — use semantic foreground

- [Line 889](../src/app/editor/page.tsx#L889) stamp delete: `bg-destructive text-white` → `bg-destructive text-destructive-foreground`.
- [Line 1340](../src/app/editor/page.tsx#L1340) annotation delete: same fix.

### Button loading prop

- [Line 844-847](../src/app/editor/page.tsx#L844-L847) Save button: `<Button loading={isSaving} ...>Enregistrer</Button>`.
- [Line 848-851](../src/app/editor/page.tsx#L848-L851) Export button: same.

### Stamp panel empty state

- [Line 899](../src/app/editor/page.tsx#L899): replace plain italic text with `<EmptyState compact icon={<Stamp />} title="Aucun tampon" description="Importez vos tampons pour les réutiliser." />`. The `compact` variant keeps it from blowing up the popover.

### Numeric display typography

- Zoom `{Math.round(zoom * 100)}%` at [line 1002](../src/app/editor/page.tsx#L1002): `text-[10px] font-bold` → `text-[10px] font-semibold tabular-nums`.
- Rotation `{rotation}°` at [line 1015](../src/app/editor/page.tsx#L1015): same.
- Font size readout at [line 959-961](../src/app/editor/page.tsx#L959-L961): already `font-mono` (good for numeric); keep mono but drop if too busy, lean keep.
- Line thickness readout at [line 980-982](../src/app/editor/page.tsx#L980-L982): same.

### Tool-active state pattern

Already correct. `variant={tool === 'X' ? 'default' : 'ghost'}` inherits teal automatically.

### Labels

- Stamp panel label at [line 875](../src/app/editor/page.tsx#L875): `tracking-wider` → `tracking-[0.08em]` for app-wide label consistency.

### Comparaison panel ([reference-panel.tsx](../src/app/editor/reference-panel.tsx))

Not read. Apply pattern-level polish:
- Close button hover inherits teal.
- File switcher inside panel same treatment as main toolbar.
- Empty state if no reference files.

### Accent typo checks (French)

Quick scan:
- "Enregistrer" ✅
- "Exporter PDF" ✅
- "Comparaison" ✅
- "Tampons" ✅
- "Sélectionner / Déplacer" ✅
- "Ajouter du texte" ✅
- "Tracer une ligne" ✅
- "Tampon" ✅
- "Ajouter un tampon" ✅
- "Supprimer" / "Tout effacer" ✅
- "Rotation -90°" / "+90°" ✅
- "Lecture seule (fichier dossier)" ✅
- "Aucun tampon importé" ✅
- COLOR names (Rouge/Bleu/Noir/Vert/Orange/Violet) ✅

No accent issues found in the sampled portions.

## Constraints / no-go

- Do **not** touch the `COLORS` palette — user-facing annotation colors.
- Do **not** touch the canvas background color (`bg-slate-200 dark:bg-slate-800`) — preserves PDF page contrast.
- Do **not** touch PDF.js loading, worker registration, or `pageCanvasRefs` rendering.
- Do **not** touch `PageWrapper`, mouse-event plumbing, drag state, line drawing state, or annotation hit testing.
- Do **not** touch the Firestore `getDoc`/`updateDoc` paths for chiffrage or dossier.
- Do **not** touch `uploadBytes` / `enqueueUpload` / `getDownloadURL` for Storage.
- Do **not** touch `STAMPS_STORAGE_KEY` localStorage contract or `loadStamps`/`saveStamps` helpers.
- Do **not** touch the Annotation data model (`type`, `page`, `x/y/width/height`, `thickness`, `fontSize`, `text`, `color`, `stampUrl`).
- Do **not** touch the `html2canvas` / `jspdf` / `pdf-lib` export pipeline (preserved per memory).
- Do **not** change the read-only gate (`!isChiffrageFile` disables save).
- Preserve French copy verbatim.

## Risk level

**Low.** Scoped exclusively to toolbar chrome + selection-indicator color fixes + Button loading swaps. No canvas or data contract touched. Biggest visual effect: annotation selection shifts from blue to teal, which is aesthetically aligned with the rest of the app.

## Dependencies

- **Requires foundation-tokens, shared-ui** — Button loading + EmptyState.
- **No blocks.**

## Exit criteria

- `npm run typecheck` passes.
- Annotation drawing (line/text/stamp) still works end-to-end.
- Save flow still writes annotations to Firestore and uploads modified file to Storage.
- Export PDF flow still produces downloadable file.
- Read-only gate on dossier-sourced files still disables Save.
- Selection indicator for annotations reads teal (not blue).
- Delete bubbles use destructive-foreground token (not `text-white`).
- Save + Export + comparison buttons use Button loading prop.
- Stamp panel empty state uses EmptyState primitive (compact variant).
- No regression in zoom/rotation/tool state.

## Open items to resolve during implementation

1. **Canvas background** — keep `slate-200` / `dark:slate-800`, or switch to warmer neutral (`stone-200` / `stone-800`) to align with cream palette? Lean keep slate (preserves PDF contrast). Review visually.
2. **Full toolbar density review** — `h-7` button heights feel compact; may benefit from `h-8` with Outfit. Defer to visual review.
3. **ReferencePanel polish** — read file during implementation, apply pattern-level changes.
4. **EmptyState compact variant** — does shared-ui include a compact variant? If not, add inline styling override.
