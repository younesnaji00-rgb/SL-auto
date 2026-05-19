# 004 — Replace universal "Éditer web" with per-slot "Éditer" buttons
Status: pending
Type: visual+behavioral
Cluster: C
Files:
  - src/app/(app)/assignations-chiffrage/[id]/page.tsx
  - src/components/dossier-timeline/family-row.tsx
  - src/components/dossier-timeline/slot-card.tsx
Depends on: —
Verify: tsc --noEmit AND build AND manual: open a pending chiffrage, confirm per-slot Éditer buttons; clicking one navigates to /devis-editor?chiffrageId=…&docType=…&accordSlot=…

## User intent
> instead of there being a universal "editer web" button in assignation chiffrage, and to reduce confusion, add a editer button on every card slot thats pending chiffrage in assignation chiffrage

## Done criteria
- Remove the `topAction={<Button…Éditer web…>}` prop from both FamilyRow
  renders on `assignations-chiffrage/[id]/page.tsx` (lines 448-458 and
  479-489 per the explore report).
- Thread a new optional `onEditSlot?: (slot: string) => void` prop from
  `FamilyRow` → `SlotCard`.
- In `SlotCard`, when the slot is an accord/proposition slot AND
  `docs.length === 0` (or all docs are `pendingUpload`), render an
  "Éditer" button BELOW the existing "En attente de chiffrage" text
  (per Q-2 → B, recommendation).
- Clicking the button calls `onEditSlot(slot)` which the chiffrage page
  resolves to `router.push(`/devis-editor?chiffrageId=${id}&docType=
  ${parentLabel}&accordSlot=${encodeURIComponent(slotLabel)}`)`.
- The `parentLabel` is the family parent (e.g., "Devis Garage" /
  "Facture Garage" / "Devis Garage 2") — derive from the slot's
  parsed family or pass it down from FamilyRow.
- Button styling: `<Button size="sm" variant="outline">` with
  `PencilLine` icon (same icon as the removed universal button).

## Decisions
- D1 Visibility rule: pending = `docs.length === 0` OR `docs.every(d =>
  d.pendingUpload === true)`.
  - {resolved-by-code: slot-card.tsx:124 cardinalPimpleDisabled uses
    same definition}
- D2 Slot types that get the button: only accord/proposition slots (where
  `parseAccordDocType(slot)` returns a parsed result).
  - {resolved-by-code: slot-card.tsx:109,216}
- D3 Button placement: below the "En attente de chiffrage" text.
  - {question: Q-2 → recommendation B}
- D4 URL params: `chiffrageId`, `docType` (parent), `accordSlot` (slot
  label).
  - {default-policy: P-EDITER-PARAM}

### Edge-case probe
- a. EXISTING DATA: filled slots get no button — existing edit affordance
  via DocumentsFilterPanel preserved.
- d. ENFORCEMENT LAYER: button is just a navigation trigger; permission
  enforcement on /devis-editor is unchanged.
- f. CARDINALITY: per-slot, not per-family.
- i. PERMISSION BOUNDARIES: chiffreur+admin already see this surface.
  Button visibility uses existing canEdit prop in SlotCard.
- All other axes: {n/a}.

## Visual verification
Required viewports: 1920, 1280, 768
Affected routes: /assignations-chiffrage/[id]
Manual flow:
  1. Open a chiffrage with at least one pending accord slot.
  2. Confirm the universal "Éditer web" button at the top of each
     FamilyRow is GONE.
  3. Confirm each pending slot card shows "En attente de chiffrage" AND
     an "Éditer" button below it.
  4. Click Éditer on a pending slot — confirm navigation to
     /devis-editor with the correct query params.
  5. Filled slots (already saved by chiffreur) show NO Éditer button.

## Notes
(populated at dispatch)
