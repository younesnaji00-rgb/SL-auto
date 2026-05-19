# 016 — Photo lightbox: zoom in/out + explicit X close
Status: pending
Type: visual+behavioral
Cluster: E
Files: src/app/(app)/dossiers/[id]/photos-tab.tsx
Depends on: —
Verify: tsc --noEmit AND build AND dev server clean AND screenshots

## User intent
> the photo shown when i click on it should zoom to the point where it takes the whole screen, with the option to zoom in and out and i should also be able to get out of the lightbox with an x button

## Done criteria
- The lightbox at `photos-tab.tsx:540-599` integrates `react-zoom-pan-pinch` (`TransformWrapper` + `TransformComponent`) wrapping the `<img>`.
- Photo opens fit-to-screen by default (`initialScale=1`, `minScale=1`, `maxScale=8` — fits naturally per Q-9 A).
- Mouse-wheel zoom enabled; pinch zoom enabled on touch; double-click toggles 1× / 2×.
- A floating bottom-center toolbar with three buttons per Q-10 A: ZoomOut, Reset, ZoomIn (lucide icons), semi-transparent (`bg-black/40` or similar).
- A close X button at top-right of the dialog per Q-6 A. Lucide `X` icon, h-5 w-5, white, in a circular hit area, semi-transparent background.
- Keyboard: Esc still closes (Dialog default). Arrow ← / → still navigate to prev/next photo within the same category.
- When the user navigates to a different photo (← / →), zoom resets to 1×.
- The fullscreen behavior (`w-screen h-screen p-0 rounded-none border-0 bg-black/95`) is preserved.

## Decisions
- D1 Library: react-zoom-pan-pinch (already installed at 4.0.3).
  - {resolved-by-code: package.json deps line 65}
- D2 Initial state: fit-to-screen.
  - {question: Q-9 → A}
- D3 Zoom controls position: bottom-center floating toolbar.
  - {question: Q-10 → A}
- D4 Close X position: top-right.
  - {question: Q-6 → A}
- D5 Min/max scale: 1 / 8 (typical range for photo gallery).
  - {default-policy: P-BUTTON-VARIANT (pick sensible defaults)}
- D6 Reset zoom on photo navigation.
  - {default-policy: P-BUTTON-VARIANT (matches expected UX)}

### Edge-case probe
- a. EXISTING DATA: {n/a}.
- d. ENFORCEMENT LAYER: client UX, no server side.
- All other axes: {n/a}.

## Visual verification
Required viewports: 1920, 1280, 768, 375
Affected routes: /dossiers/[id] (photos tab)
Manual flow:
  1. Open a dossier with multiple photos in a category.
  2. Click any photo. Confirm fullscreen lightbox opens, photo fits screen.
  3. Use mouse wheel up to zoom in; confirm image scales smoothly.
  4. Click ZoomOut button; confirm scale decreases.
  5. Click Reset; confirm scale returns to 1× and image re-centers.
  6. Click ZoomIn; confirm scale increases.
  7. Press ← / → to navigate photos. Confirm zoom resets to 1× on each navigation.
  8. Click the X button at top-right. Confirm dialog closes.
  9. Re-open, press Esc. Confirm dialog also closes.
  10. Test on touch viewport (768/375 simulated). Confirm pinch zoom works.

## Notes
(populated at dispatch)
