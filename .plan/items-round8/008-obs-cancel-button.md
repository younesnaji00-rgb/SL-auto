# 008 — Cancel / clear affordance on observation preset Select
Status: pending
Type: visual+behavioral
Cluster: B
Files: src/components/observations-tab.tsx
Depends on: —
Verify: tsc --noEmit AND build AND dev server clean AND screenshots

## User intent
> add a cancel button for when the user accidentally chooses on a observation drop down menu but instead they wanted to add a custom one

## Done criteria
- When `selectedPreset` is non-empty, an inline X icon button appears INSIDE the SelectTrigger (right edge, before the chevron) — or as a small X badge over the trigger — that clears `selectedPreset` on click.
- Clicking the X stops event propagation (does not re-open the Select).
- After clearing: `selectedPreset === ''`, the placeholder text returns, and the textarea becomes enabled (since `presetFilled` is false → textarea no longer disabled).
- Keyboard accessible (tabindex / role=button), French aria-label "Effacer la sélection".

## Decisions
- D1 Affordance: inline X icon inside the SelectTrigger right side.
  - {question: Q-8 → A}
- D2 Icon: lucide `X` at h-3.5 w-3.5.
  - {default-policy: P-BUTTON-VARIANT}
- D3 Aria-label: "Effacer la sélection".
  - {default-policy: P-COPY}

### Edge-case probe
- e. UNDO: the X IS the undo affordance (no separate undo needed).
- All other axes: {n/a}.

## Visual verification
Required viewports: 1920, 1280, 768, 375
Affected routes: any view rendering ObservationsTab (use /dossiers/[id])
Manual flow:
  1. Open dossier → expand observations panel.
  2. Pick a preset from the dropdown. Confirm X icon appears inside trigger.
  3. Click X. Confirm preset is cleared, placeholder returns, textarea re-enables.
  4. Type into textarea. Confirm submit becomes available again.

## Notes
(populated at dispatch)
