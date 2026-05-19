# 003 — Reposition observation cancel X to stop overlapping Select chevron
Status: pending
Type: visual
Cluster: B
Files: src/components/observations-tab.tsx
Depends on: —
Verify: tsc --noEmit AND build AND visual: pick a preset, confirm X icon sits to the left of the chevron, both fully visible and clickable independently

## User intent
> the cancel observation button overlaps with the dropdown menu button

## Done criteria
- The X icon inside the SelectTrigger no longer overlaps the chevron at
  any viewport.
- The X is positioned with enough right offset to clear the chevron's
  ~28-32px hit area (Radix Select chevron lives at the rightmost edge
  of the trigger).
- The SelectTrigger's right-padding is increased so the SelectValue text
  doesn't run under either icon.
- Clicking X clears the preset (existing behavior, unchanged).
- Clicking anywhere else on the trigger still opens the Select dropdown.
- X has `pointer-events-auto` and stops propagation correctly so the
  Select doesn't open when X is clicked.

## Decisions
- D1 New X position: `right-10` (40px from right edge) — leaves room
  for the chevron at right-3 + some breathing room.
  - {default-policy: P-SPACING (next-larger Tailwind class)}
- D2 SelectTrigger right-padding: `pr-14` (was `pr-9`), gives the
  SelectValue text room.
  - {default-policy: P-SPACING}

### Edge-case probe
- All axes: {n/a}.

## Visual verification
Required viewports: 1920, 1280, 768
Affected routes: any page showing ObservationsTab — use /dossiers/[id]
Manual flow:
  1. Open dossier → expand any observation panel.
  2. Pick a preset.
  3. Confirm X icon and chevron are clearly visible with no overlap.
  4. Click X — preset clears, chevron remains.
  5. Click trigger (anywhere except X) — dropdown opens.

## Notes
(populated at dispatch)
