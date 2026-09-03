# Chiffrage flow redesign — decision spec (2026-09-03)

Synthesis of the four research reports in `docs/research/chiffrage-{structure,workspace,
attention,libraries}.md` (≈65 sources fetched) + the code-anatomy audit. Every ruling
below cites its report. Binding for the implementation pass on `nav-upgrade`; items
marked **[owner]** need the owner's visual/product sign-off and are listed again in the
session report. Locked system rules (element-specs.md, DESIGN.md, motion-spec.md) apply
unchanged — nothing here overrides Cream & Ink, terracotta = time, one primary per page.

## A. Queue page `/assignations-chiffrage` (structure kept, spine added)

A1. **Table-first master view stays; row click keeps full-page navigation** (posture
    theory: the detail is a sovereign workspace — structure §3.2). Identifier cell keeps
    its real `<a>`; whole-row JS click is a convenience, never the only path
    (structure §3.5).
A2. **DeadlineBar demoted** (attention R1): the per-row percent meter goes. New Délai
    cell: completed → ✓ + « Chiffré le … » (unchanged); overdue → `Badge danger`
    « En retard 02j/14h »; ≤ 6 h business remaining → `Badge warning` « 3 h restantes »;
    otherwise plain `t-body-sm text-ink-2 tabular-nums` « 18 h restantes ». No graphic
    on healthy rows; countdown text is the load-bearing datum (attention R6).
    `DeadlineBar` itself is untouched (other consumers).
A3. **Urgency bands** (attention R2), only under the default deadline-asc sort:
    « En retard » / « Moins de 6 h » / « Aujourd'hui » / « À venir » / « Terminés »,
    rendered as full-width colSpan header rows — `t-label` band name + count pill,
    whitespace + hairline only (no tinted sections), empty bands hidden. Any other
    sort → flat list.
A4. **Column order** (attention R3): Dossier · Délai · Statut · Nom d'assuré ·
    Immatriculation · Chiffreur (non-chiffreur roles) · Nature · Obs. · Date.
    « Assigné par » is demoted to the peek panel/detail (fixation budget).
A5. **Calm load summary** (attention R5): quiet header line beside the count pill —
    « 3 en retard · 5 aujourd'hui » (danger-fg figure only when > 0, plain ink-3
    otherwise). No per-row shouting beyond A2's thresholds.
A6. **Search input** first in the filter row (réf · assuré · plaque · chiffreur),
    filtering from the 2nd character (tables.md A-search; element-specs §2).
A7. **Keyboard spine** via `hooks/use-hotkeys.ts` (so keys appear in the `?` sheet):
    ↑/↓ and j/k move row focus (roving tabIndex), Entrée opens, Espace peeks,
    Échap closes the peek. No dead zones between rows (interfaces rules).
A8. **Peek panel** (structure §3.2, openstatus pattern): right `Sheet` ≈ 480 px,
    read-mostly, rendered instantly from already-loaded row data — identity, statut,
    chiffreur, assigné par, délai, latest observation + count, files count; footer
    « Ouvrir le chiffrage » (default). ↑/↓ retargets while open. Peek never mints a
    workspace tab.
A9. **« Traiter la file » (Mode traitement)** — page-level `default` button (the page
    has no other primary): stores the current filtered order (D1), navigates to the
    first non-completed item with the mode flag. **[owner]** for the enforced-order /
    skip-with-reason variant (org policy — not built this pass).
A10. **Row reorder motion**: `@formkit/auto-animate` on the tbody (adopt-now list),
    disabled under reduced motion; band/filter swaps must not mass-animate.

## B. Detail page `/assignations-chiffrage/[id]` (pipeline replaces card strips)

B1. **Accord pipeline grid** (workspace candidate A): one section per family; columns
    = versions (`Source · 1er accord · 2ème · 3ème · Proposition …`), shared sticky
    column headers, families as aligned row bands (NN/g comparison-table structure;
    ≤ 5-item comparison). Columns appear up to the family's highest filled ordinal
    + ONE ghost slot for the next legal stage (« + 2ème accord ») — later stages don't
    render. Reuses `SlotCard`; below ~lg falls back to a per-family stacked list.
    **[owner]** — this replaces the FamilyRow strips on THIS page only (dossier
    timeline untouched).
B2. **Version state chips** (workspace R9): `Actuel` (info) on the highest filled
    version, `Remplacé` (neutral) on superseded accords, `Envoyé` (success) when the
    dossier statut says so. Chip + de-emphasis, never color alone.
B3. **Éditer placement** (workspace R7): ONE primary per family — on the rightmost
    editable slot (the ghost next-stage slot, or the current version's re-edit);
    other filled slots get quiet `Consulter` (lightbox). Fixes the audit bug where
    Éditer only existed on locked empty slots and the source had no editor entry.
B4. **Page order** (workspace R8, fold research): header → pipeline (the actionable
    object) → documents panel → observations. Observations stay collapsible; the
    collapsed bar shows the unseen count (existing). **[owner]** for the reorder.
B5. **« Précédent / Suivant »** ghost buttons + « n / N » position in the header area,
    iterating the stored queue order (D1); hidden when no stored order.
B6. **Mode traitement strip**: when the mode is active — slim `.glass-bar` line under
    the header: « Mode traitement · 3 / 17 » + « Passer » (skip → next) + « Quitter ».
    When the chiffrage completes while in mode: banner « Chiffrage terminé — Dossier
    suivant → » (auto-advance is offered, not forced; « Rester » = just dismiss).
B7. Stale « Éditer web » comments cleaned up.

## C. Devis editor `/devis-editor` (sovereign posture)

C1. **Resizable split** (workspace candidate A): `react-resizable-panels` around the
    comparison layout — source left, table right, draggable + keyboard-resizable
    handle, ratio persisted (localStorage), min sizes ≥ 320 px; below ~1100 px stacked.
C2. **PDF pane gets real controls**: PDFs render via `pdfjs-dist` canvas (same engine
    as `/viewer` and `pdf-thumbnail`) inside the zoom/rotate/page-nav chrome that
    images already have — the bare `<iframe>` goes. (react-zoom-pan-pinch is installed
    and unused; use it or the existing ZoomableImage mechanics.)
C3. **Spreadsheet keyboard semantics** (workspace R3): Entrée commits and moves down
    the same column; Tab/Shift-Tab natural; Échap reverts the cell. Wheel must never
    change a focused amount (verify CellNumberInput). Ctrl+S moves into the
    `use-hotkeys` registry (visible in `?`).
C4. **« Ajouter une ligne »** button under the table (audit: no row-add path exists).
C5. **Totals stay visible and live** — the existing footer strip becomes sticky within
    the table card; recalc is already immediate.
C6. **Post-save exit velocity** (workspace R10): after a successful save, inline
    banner near the toolbar: « Accord enregistré · Retour au dossier · Dossier
    suivant → » (D1 order; « Dossier suivant » only when a stored order exists).
C7. **Tab strip stays mounted**: `/devis-editor` joins the chiffrage section match in
    `workspace-tabs.tsx`; the active tab derives from the `chiffrageId` query param.
C8. **Dead code removed**: `src/components/chiffreurs/pdf-editor.tsx` (zero importers).
C9. Deferred (flagged, not built): field↔scan synchronized highlighting (needs OCR
    boxes), Ctrl+Entrée « ligne vérifiée » ticks, enforced-order Guided mode,
    TanStack Table migration (marginal vs the hand-rolled table at this size),
    presence/collision indicators (needs presence plumbing).

## D. Shared plumbing

D1. `src/lib/queue-session.ts` — ordered-queue iterator in sessionStorage: the queue
    page stores the filtered/sorted id list; detail + editor read
    `{ index, total, prevId, nextId }` and the Mode traitement flag/skips.
D2. New deps (libraries report §2): `@formkit/auto-animate`, `react-resizable-panels`.
    Rejected: vaul (unmaintained), kbar (cmdk installed), framer-motion (not needed),
    React Bits (Commons Clause + flash), Handsontable ($), glide-data-grid (canvas),
    react-virtual (< 300 rows).
