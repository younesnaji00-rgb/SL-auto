# 005 — Surface chiffreur "Enregistré X" entries in historique timeline
Status: pending
Type: visual
Cluster: C
Files: src/app/(app)/dossiers/[id]/historique-tab.tsx
Depends on: —
Verify: tsc --noEmit AND build AND manual: after a chiffreur saves a devis/facture, the gestionnaire sees the entry in the historique timeline with the exact doc type

## User intent
> whatever the chiffreur edit it shall show in the gestionnaire, show exactly what type of document did the chiffreur edit

## Done criteria
- In `historique-tab.tsx` around line 375, the filter expression that
  currently includes only `e.type === 'statut' || e.type ===
  'sinistre_douteux'` is extended to ALSO include `e.type === 'document'`.
- The action text from the chiffreur's `logHistorique` call (e.g.,
  `"Enregistré Devis Garage"` or `"Enregistré Facture Garage 2"`) is the
  primary text shown for these entries — already the case in the existing
  rendering (line 391: `<p className="font-semibold">{entry.action}</p>`).
- The detail line shows row count (e.g., "5 ligne(s) enregistrée(s)")
  via `entry.details` — already rendered conditionally at line 395-399.
- Document-type entries are visually grouped/sorted alongside status
  entries by date (existing sort by `date desc` preserved).
- No new fields added to the underlying log doc — only the filter changes.

## Decisions
- D1 Filter scope: add `'document'` to the type whitelist.
  - {resolved-by-code: historique-tab.tsx:375}
- D2 No new badge/icon to differentiate `'document'` from `'statut'` in
  this round — the action text ("Enregistré X" vs status names) already
  reads differently.
  - {default-policy: P-COPY (minimal surface)}

### Edge-case probe
- a. EXISTING DATA: existing 'document' entries become visible too.
  Some date back to before round-8 userNom — they'll show as
  "Utilisateur inconnu" via existing P-LOG-NAME-FALLBACK + clickable
  Link via item 002.
- d. ENFORCEMENT LAYER: display-only.
- All other axes: {n/a}.

## Notes
(populated at dispatch)
