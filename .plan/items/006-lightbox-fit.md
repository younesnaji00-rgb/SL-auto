# 006 — Fix Maximize2 (fit-to-screen) button in photo lightbox
Status: pending
Type: behavioral
Cluster: D
Files: src/app/(app)/dossiers/[id]/photos-tab.tsx
Depends on: —
Verify: tsc --noEmit AND build AND manual: open a photo, zoom in via wheel/button, click Maximize2 — image fits screen and re-centers

## User intent
> the fit to screen button doesn't work when i click on an individual photo and get redirected to the lightbox window

## Done criteria
- The Maximize2 button in the lightbox toolbar now reliably:
  - Resets the zoom scale to 1× (initialScale).
  - Re-centers the image in the viewport.
  - Re-fits the image to the visible viewport (object-contain at
    scale=1 is the "fit" state).
- Implementation uses `centerView(1, 200, 'easeOut')` from the
  TransformWrapper render-prop callbacks (P-LIGHTBOX-FIT).
- If `centerView` is not exposed as a render-prop in 4.0.3, fall back to
  `resetTransform(200, 'easeOut')` plus an explicit setTransform call to
  re-center.
- Mouse-wheel, pinch, and double-click zoom continue to work unchanged.
- Navigating to next/prev photo (← / →) still resets via the existing
  `key={previewPhoto.id}` remount mechanism.

## Decisions
- D1 Approach: `centerView(1, 200, 'easeOut')` preferred.
  - {default-policy: P-LIGHTBOX-FIT}
- D2 Animation: 200ms ease-out — feels responsive, matches typical UI.
  - {default-policy: P-LIGHTBOX-FIT}
- D3 Keep Maximize2 icon + "Réinitialiser le zoom" aria-label.
  - {resolved-by-code: photos-tab.tsx existing aria-label}

### Edge-case probe
- d. ENFORCEMENT LAYER: client UX only.
- e. UNDO/REVERSAL: the button IS the reset.
- All other axes: {n/a}.

## Notes
- Likely root cause from the explore report: `resetTransform()` on its
  own preserves any panned offset built up via panning. `centerView()`
  explicitly recenters.
