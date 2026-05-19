# 015 — Remove "Création dossier" entry from dashboard status panel
Status: pending
Type: visual
Cluster: D
Files: src/app/(app)/dashboard/page.tsx
Depends on: —
Verify: tsc --noEmit AND build AND dev server clean AND screenshots

## User intent
> remove the creation dossier status from the dashboard

## Done criteria
- The status-panel sidebar (lines ~536-611 of dashboard/page.tsx) no longer includes a row labelled "Création dossier".
- The pie chart at lines ~613-686 also excludes "Création dossier" (those dossiers either bucket to a different label or are skipped from the visualization).
- The filter dropdown at line 418 — keep or remove the "creation" option? Remove per the user's "remove the creation dossier status from the dashboard" intent.
- The action filter logic at line 167 stays (no harm) but the dropdown entry at line 418 is removed.
- Dossiers whose `statut` is "Création dossier" still exist in the underlying data — we are NOT changing the status machine or any dossier doc.

## Decisions
- D1 Filter `statut === 'Création dossier'` out of the dashboard's display computations only.
  - {resolved-by-code: dashboard/page.tsx:259-285 statusBarData}
- D2 Don't touch the canonical status list in dossiers-data.ts (still in the status machine).
  - {memory: status-machine.ts deriveStatus → 'Création dossier' is the initial status}
- D3 No edge needed — just filter at the dashboard view level.
  - {default-policy: P-BUTTON-VARIANT (minimal surface)}

### Edge-case probe
- a. EXISTING DATA: untouched.
- d. ENFORCEMENT LAYER: display-only filter.
- All other axes: {n/a}.

## Visual verification
Required viewports: 1920, 1280, 768
Affected routes: /dashboard
Manual flow:
  1. Open /dashboard.
  2. Confirm "Création dossier" no longer appears in the status sidebar.
  3. Confirm it's not in the pie chart legend.
  4. Confirm it's not in the "Action" filter dropdown.
  5. Other status counts (Planification, Chiffrage, Accord, etc.) unchanged.

## Notes
(populated at dispatch)
