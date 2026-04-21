# REDESIGN: Devis Editor (Area 15 / 16)

Scope: the structured quote/invoice editor at `/devis-editor`. Full-width route (per `FULL_WIDTH_ROUTES` in `(app)/layout.tsx`). Includes the thin page wrapper, the main 833-line editor, a PDF viewer for extracted quotes, and a reforme (scrap) decision dialog.

## Files in scope

- [src/app/(app)/devis-editor/page.tsx](../src/app/(app)/devis-editor/page.tsx) *(thin 36-line wrapper)*
- [src/components/chiffreurs/devis-editor.tsx](../src/components/chiffreurs/devis-editor.tsx) *(833 lines — main editor)*
- [src/components/chiffreurs/pdf-editor.tsx](../src/components/chiffreurs/pdf-editor.tsx) *(494 lines — PDF viewer integration)*
- [src/components/chiffreurs/reforme-dialog.tsx](../src/components/chiffreurs/reforme-dialog.tsx) *(196 lines — scrap decision)*

## Current state (audit)

### Page wrapper — page.tsx

- Simple Suspense-wrapped component that parses `chiffrageId` and `docType` from URL query, then renders `<DevisEditor>`.
- **Accent typo** at [page.tsx:18](../src/app/(app)/devis-editor/page.tsx#L18): `"Parametres manquants : chiffrageId est requis."` → should be `"Paramètres manquants : chiffrageId est requis."`.
- Fallback loader uses `<Loader2 />` centered — acceptable, could use `PageLoader`.

### Main editor — devis-editor.tsx

**Field labels with missing accents** ([lines 38-53](../src/components/chiffreurs/devis-editor.tsx#L38-L53)):
- `'Modele'` → `'Modèle'`
- `'Kilometrage'` → `'Kilométrage'`
- `'N° de chassis'` → `'N° de châssis'`
- `'Telephone'` → `'Téléphone'`
- `'ICE'`, `'Client'`, `'Adresse'`, `'Expert'`, `'Assurances'`, `'Marque'`, `'Matricule'` — correct.

**"Counter variant" (contre-chiffrage) styling — hardcoded red**:
- [Line 547](../src/components/chiffreurs/devis-editor.tsx#L547): `className={cn(isCounter && 'text-red-600')}` on row cells.
- [Line 550](../src/components/chiffreurs/devis-editor.tsx#L550): `<span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" aria-hidden />` counter indicator dot.
- [Line 557](../src/components/chiffreurs/devis-editor.tsx#L557): `className="text-red-600/70 hover:text-red-600"` on delete button.
- [Line 621](../src/components/chiffreurs/devis-editor.tsx#L621): `className={col.kind === 'counter' ? 'text-red-600 font-semibold' : undefined}` on extra column header.
- [Line 654](../src/components/chiffreurs/devis-editor.tsx#L654): `className={cn('flex gap-6 pt-1 border-t mt-1', isCounter && 'text-red-600')}` on totals row.

The semantic red for "counter" (opposition / contradictory quote) is correct in principle but bypasses the token system. Should become `text-destructive` + `bg-destructive` consistently, or introduce a semantic `--counter` token if the shade needs to differ from destructive.

**Data model** (preserve verbatim):
- Realtime Firestore `onSnapshot` on chiffrage doc + nested dossier doc.
- `structuredEditables` map keyed by docType (Devis | Facture).
- `devisVariant: 'counter'` files trigger counter styling.
- `DevisHeader` + `DevisRow[]` + `DevisExtraColumn[]` + `DevisVersion[]` snapshots.
- `extractAndPersistChiffrageDevis` — AI-backed PDF extraction.
- `renderDevisPdf` — PDF output.
- `dossierPrefill` helper fills header from linked dossier (vehicule + assure + refExpert).
- Version history with preview URL + label.
- Comparison panel (imports `ReferencePanel` from editor).

**Toolbar / action buttons** (inferred from imports):
- Save, Export PDF, Extract (Sparkles icon suggests AI), Copy, Columns (add extra col), Plus (add row), Trash2 (delete), History (versions), Refresh, X (close).
- Likely inline Loader2 on Save, Extract, Export.

**Layout**: full-width route means no `max-w-[1600px]` cap. Uses its own max-width containers likely.

### PDF editor — pdf-editor.tsx

Not read (494 lines). Likely:
- PDF.js rendering of the uploaded devis PDF.
- Side-by-side or overlay with the structured editor.
- No hardcoded red/blue/green/yellow based on Grep. Clean palette.
- May use canvas + annotation like the main editor but simpler.

### Reforme dialog — reforme-dialog.tsx

Not read (196 lines). Likely:
- Dialog for recording a reforme (vehicle deemed totaled/scrap) decision.
- Form fields for estimates, residual value, etc.
- Probably has hardcoded warnings / status indicators.

## Concrete changes

### [page.tsx](../src/app/(app)/devis-editor/page.tsx)

- **Accent fix**: [line 18](../src/app/(app)/devis-editor/page.tsx#L18) `"Parametres manquants"` → `"Paramètres manquants"`.
- Replace `<Loader2 />` fallback with `<PageLoader />` for consistency.

### [devis-editor.tsx](../src/components/chiffreurs/devis-editor.tsx)

**Field label accent fixes**:
- [Line 41](../src/components/chiffreurs/devis-editor.tsx#L41): `'Modele'` → `'Modèle'`.
- [Line 42](../src/components/chiffreurs/devis-editor.tsx#L42): `'Kilometrage'` → `'Kilométrage'`.
- [Line 43](../src/components/chiffreurs/devis-editor.tsx#L43): `'N° de chassis'` → `'N° de châssis'`.
- [Line 51](../src/components/chiffreurs/devis-editor.tsx#L51): `'Telephone'` → `'Téléphone'`.

**Counter variant color retune** — five instances:
- Option A (lightweight): replace all `text-red-600` / `bg-red-600` with `text-destructive` / `bg-destructive`. Preserves semantic meaning (red = counter/opposition), inherits token retune.
- Option B (dedicated token): add `--counter-fg` / `--counter-bg` CSS vars if the user wants counter to read distinct from destructive (e.g., a warmer rust vs. neutral red).
- **Lean Option A** — simpler, consistent with the rest of app's semantic color usage. User approval before changing.

**Toolbar buttons**: apply Button loading prop on Save, Extract, Export (inferred).

**Empty / loading states**:
- Initial `loading` flag blocks render — wrap in `<PageLoader />` or similar.
- Empty row state, empty version history state, empty counter section — `<EmptyState>` where appropriate.

**Versions list**:
- When rendered as a list (likely dropdown or side panel), use tokenized chips for version labels.
- Ensure no hardcoded colors leak through.

**Comparison panel**:
- Imports `ReferencePanel` from `/editor`. Its polish plan is in the editor area.

**Extract (AI) button**:
- Uses `Sparkles` icon — teal-inherit.
- Loading state during extraction (`extracting` flag) → Button loading prop.

**Totals row and extra columns**:
- Use `tabular-nums` for the numeric totals (sumHT, sumTTC, sumTVA).
- `formatFr` / `parseFr` helpers handle French decimal (`,` instead of `.`) — preserve.

**`showVetuste` conditional** ([line 62](../src/components/chiffreurs/devis-editor.tsx#L62)):
- `docType === 'Devis'` shows vetuste (depreciation) column; Facture doesn't.
- Preserve logic.

### [pdf-editor.tsx](../src/components/chiffreurs/pdf-editor.tsx)

Apply pattern-level polish:
- Any inline spinners → Button loading.
- Any hardcoded status colors → semantic tokens.
- Empty states for missing PDFs.
- Viewer chrome inherits warm palette.
- Canvas background — keep slate (same rationale as editor: preserve PDF contrast).

### [reforme-dialog.tsx](../src/components/chiffreurs/reforme-dialog.tsx)

Pattern-level polish:
- Dialog chrome inherits new backdrop.
- Form fields + Save button → Button loading.
- Any destructive warning ("Vehicle deemed totaled — irreversible") → `Alert variant="destructive"`.
- French copy preserved + accent audit during implementation.

## Constraints / no-go

- Do **not** touch the `DevisHeader` / `DevisRow` / `DevisExtraColumn` / `DevisVersion` / `StructuredDevis` schemas.
- Do **not** change `extractAndPersistChiffrageDevis` AI extraction flow.
- Do **not** change `renderDevisPdf` output pipeline.
- Do **not** touch `parseFr` / `formatFr` (French decimal handling) — preserve exactly.
- Do **not** alter `rowTotalHT` / `sumHT` / `sumTTC` / `sumTVA` arithmetic.
- Do **not** change the Firestore paths (`chiffrages/{id}`, nested `structuredEditables.{docType}`, `editableExtractionAttempted`).
- Do **not** change the realtime `onSnapshot` + dossier-doc linked subscription pattern.
- Do **not** rename `devisVariant: 'counter'` or `EditableDocType` enum.
- Do **not** touch `dossierPrefill` field mapping logic.
- Do **not** touch Storage upload path for version snapshots.
- Do **not** alter the FULL_WIDTH_ROUTES integration — `/devis-editor` must stay full-width.
- Preserve French copy verbatim except the flagged accent-missing items (user approval for batch fix).

## Risk level

**Medium.** Table-heavy editor with realtime Firestore sync, AI extraction, and PDF generation. Redesign scope is styling only — low regression risk — but any accidental touch on data paths destroys quote records. Counter-variant color change is visible to chiffreurs daily.

## Dependencies

- **Requires foundation-tokens, shared-ui** — Button loading, PageLoader, EmptyState, retuned destructive token.
- **Coordinates with editor area** — shares `ReferencePanel`. That panel's polish is covered in editor plan.
- **No blocks.**

## Exit criteria

- `npm run typecheck` passes.
- Devis still saves, loads, extracts, exports PDF, creates versions.
- Counter variant still reads as red (via destructive token) on rows, dot, delete button, column header, totals.
- No hardcoded `text-red-600` / `bg-red-600` remains in devis-editor.tsx.
- Accent typos in field labels + "Paramètres" fixed (if user approves batch).
- Save/Extract/Export buttons use Button loading prop.
- Comparison panel chrome consistent with editor.
- No regressions in row add/remove, extra-column add/remove, version snapshot/restore.

## Open items to resolve during implementation

1. **Counter color approach** — Option A (reuse destructive) or Option B (new `--counter-*` token)? Lean A, but user may want counter to be a distinct rust/burgundy for visual separation from validation destructive. Ask.
2. **Accent fixes batch** — user approval needed for all missing accents in devis-editor labels + wrapper page.
3. **pdf-editor.tsx deep read** — during implementation.
4. **reforme-dialog.tsx deep read** — during implementation.
5. **Versions list UX** — if rendered as dropdown, consider Sheet slide-out for better scrollability on dense history.
