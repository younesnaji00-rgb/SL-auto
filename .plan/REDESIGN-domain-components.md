# REDESIGN: Domain Components (Area 13 / 16)

Scope: SL Auto-specific components consumed by dossier-detail and other surfaces. Timeline stepper, vehicle damage diagram, camera/voice capture, observations panel, global search.

## Files in scope

- **Dossier timeline**: [timeline.tsx](../src/components/dossier-timeline/timeline.tsx), [timeline-bar.tsx](../src/components/dossier-timeline/timeline-bar.tsx), [step-1-import.tsx](../src/components/dossier-timeline/step-1-import.tsx), [step-2-information.tsx](../src/components/dossier-timeline/step-2-information.tsx), [step-2-observations.tsx](../src/components/dossier-timeline/step-2-observations.tsx), [step-3-planification.tsx](../src/components/dossier-timeline/step-3-planification.tsx), [step-4-pieces.tsx](../src/components/dossier-timeline/step-4-pieces.tsx), [step-5-chiffrage.tsx](../src/components/dossier-timeline/step-5-chiffrage.tsx), [step-6-rapport.tsx](../src/components/dossier-timeline/step-6-rapport.tsx), [typed-documents-grid.tsx](../src/components/dossier-timeline/typed-documents-grid.tsx)
- [src/components/car-diagram.tsx](../src/components/car-diagram.tsx)
- [src/components/car-svg-top.tsx](../src/components/car-svg-top.tsx), [src/components/car-svg-bottom.tsx](../src/components/car-svg-bottom.tsx)
- [src/components/camera-capture.tsx](../src/components/camera-capture.tsx)
- [src/components/voice-recorder.tsx](../src/components/voice-recorder.tsx), [src/components/voice-player.tsx](../src/components/voice-player.tsx)
- [src/components/observations-tab.tsx](../src/components/observations-tab.tsx)
- [src/components/global-search.tsx](../src/components/global-search.tsx)

## Current state (audit)

### Dossier Timeline — structure

**Step discrepancy** ([timeline.tsx:187-195](../src/components/dossier-timeline/timeline.tsx#L187-L195)):
```ts
export const DOSSIER_TIMELINE_STEPS: TimelineStep[] = [
  { id: 1, label: 'Document import' },
  { id: 2, label: 'Observations' },
  { id: 3, label: 'Information' },
  { id: 4, label: 'Planification' },
  { id: 5, label: 'Pièces jointes' },
  { id: 6, label: 'Chiffrage' },
  { id: 7, label: 'Rapport' },
];
```
**7 steps defined**, but [dossier-detail page.tsx:207-214](../src/app/(app)/dossiers/[id]/page.tsx#L207-L214) only maps sections for ids 1-6 (Step1Import, Step2Information, Step3Planification, Step4Pieces, Step5Chiffrage, Step6Rapport). Step 2 in timeline labels "Observations" but `Step2Information` is rendered for key 2. **Bug or intentional?** Observations panel lives outside the timeline (collapsible at top of page.tsx). Either:
- Timeline has a dead "Observations" step that renders nothing, misaligning the section index vs label.
- Or it's supposed to render `Step2Observations` at index 2, shifting all downstream steps.

Flag for user review. **Redesign doesn't fix logic; flag and move on.**

**[timeline.tsx](../src/components/dossier-timeline/timeline.tsx)** pattern-level observations:
- `TimelineSection` component wraps each step with collapsible button (chevron rotates 90deg when collapsed).
- Per-step collapse state persisted via `useCollapsedSteps(dossierId, stepIds)` hook.
- Scroll-listener active-step detection via `findScrollContainer` helper (walks DOM for nearest scrollable ancestor). Necessary because `(app)/layout.tsx` main has `overflow-y-auto`, not window.
- Step heading: `inline-flex h-6 w-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold` (stepId bubble) + `text-lg font-bold` label + chevron.
- `min-h-[60vh]` on expanded sections — forces scroll distance so the active-step detector has room to switch.

**[timeline-bar.tsx](../src/components/dossier-timeline/timeline-bar.tsx)** — the sticky step bar:
- `sticky top-[49px] z-30 bg-background/95 backdrop-blur border-b`. Magic `49px` = action bar height in page.tsx.
- Step bubbles: active = teal (`bg-primary text-primary-foreground`), past = `bg-primary/20 text-primary border-primary/50`, future = `bg-muted text-muted-foreground border-muted-foreground/30`.
- Already token-driven — inherits teal after foundation-tokens.
- Connectors: `flex-1 h-px bg-border min-w-4`.
- `font-bold` labels → change to `font-semibold` with Outfit.
- No Rapport rendering issue because the bar renders all 7 steps but scrollIntoView to id=7 won't find `#step-7` if page.tsx doesn't render section 7.

### Car Diagram ([car-diagram.tsx](../src/components/car-diagram.tsx))

- Interactive SVG with 9 body zones (AV / AVG / AVD / LATG / LATD / AR / ARG / ARD / Toit).
- Already token-driven: `fill-muted stroke-muted-foreground` on base shape, `fill-primary/30 stroke-primary` on selected zones, `fill-secondary stroke-muted-foreground` on secondary shapes.
- Inherits warm palette after foundation-tokens with zero changes.
- `[car-svg-top.tsx](../src/components/car-svg-top.tsx)` / `[car-svg-bottom.tsx](../src/components/car-svg-bottom.tsx)` — standalone SVG renders. Not deep-read; likely token-driven too.
- **Low-risk area.**

### Global Search ([global-search.tsx](../src/components/global-search.tsx))

- ⌘K keyboard shortcut registered on mount ✅.
- Uses `CommandDialog` from shadcn.
- AI suggestion via `getAiSuggestion` (Genkit-backed, per `@genkit-ai/google-genai` dep).
- **English copy violations**:
  - [Line 72](../src/components/global-search.tsx#L72): `<span>Search...</span>` — should be `Rechercher...`.
  - [Line 80](../src/components/global-search.tsx#L80): `placeholder="What do you need?"` — should be French, e.g., `"Que cherchez-vous ?"`.
  - [Line 43](../src/components/global-search.tsx#L43): `"Error: Could not fetch suggestion."` — should be `"Erreur : suggestion indisponible."`.
- ⌘K kbd indicator: clean chip style, keep.
- **This is the global search that should wire into the header per layout-shell plan.** Currently unclear if header actually renders it — check during implementation.

### Observations Panel ([observations-tab.tsx](../src/components/observations-tab.tsx))

**Two independent color maps of hardcoded Tailwind palette**:

`TYPE_BADGE_STYLES` at [lines 32-37](../src/components/observations-tab.tsx#L32-L37):
- Planification: `bg-blue-100 text-blue-800`
- Décision de statut: `bg-orange-100 text-orange-800`
- Expert: `bg-green-100 text-green-800`
- Général: `bg-secondary text-secondary-foreground`

`ROLE_BADGE_STYLES` at [lines 39-45](../src/components/observations-tab.tsx#L39-L45):
- Admin: `bg-purple-100 text-purple-800`
- Responsable d'équipe: `bg-indigo-100 text-indigo-800`
- Gestionnaire: `bg-sky-100 text-sky-800`
- Agent de Terrain: `bg-emerald-100 text-emerald-800`
- Chiffreur: `bg-amber-100 text-amber-800`

Both need warm-palette retune. `ROLE_BADGE_STYLES` is particularly important — it drives the role chip visible in the observation feed, reinforcing the user role hierarchy.

- `variant?: 'tab' | 'collapsible'` — controls layout (used by dossier-detail's collapsible at the top of the page).
- `section: 'dossiers' | 'assignations-atg' | 'assignations-chiffrage'` — collection namespace for observations.
- `canWrite(section)` permission gate.
- Uses `Textarea`, `Button`, `Card`, `Badge`, `Collapsible` primitives.

### Camera Capture ([camera-capture.tsx](../src/components/camera-capture.tsx))

Not read. Likely uses `navigator.mediaDevices.getUserMedia`, preview canvas, capture button, UI for switching front/back camera. Flag: photo upload pipeline + offline-sync integration via `uploadFileWithOfflineSupport`.

### Voice Recorder/Player ([voice-recorder.tsx](../src/components/voice-recorder.tsx), [voice-player.tsx](../src/components/voice-player.tsx))

Not read. Likely `MediaRecorder` API + waveform or progress UI + play/pause controls. Preserve behavior.

### typed-documents-grid.tsx

Not read. Likely composes typed document tiles with icons/labels. Pattern-level polish.

### Step 1-6 components

Not individually read. They consume:
- dossier data + `dossierRef`
- `readOnly` flag
- Callbacks for planification edit
- Firestore writes + storage uploads
- Embedded forms, tables, file grids depending on step

Pattern-level changes apply (same as dossier-detail plan).

## Concrete changes

### Timeline ([timeline.tsx](../src/components/dossier-timeline/timeline.tsx), [timeline-bar.tsx](../src/components/dossier-timeline/timeline-bar.tsx))

**Structural (user-decision blocker)**:
- **7-step vs 6-section mismatch**: flag to user. Either:
  - Fix by adding `2: <Step2Observations />` to page.tsx sections map and shifting Information→3, etc. (behavioral change with effects on `useLastStep` localStorage keys, per-step collapse keys, scroll anchors).
  - Or trim `DOSSIER_TIMELINE_STEPS` to 6 items without "Observations" (since observations already lives outside timeline).
  - **Don't auto-fix during redesign**. Flag prominently in the plan master.

**Visual**:
- `text-lg font-bold` section label → `text-xl font-semibold tracking-tight`.
- Step bubble: preserve teal palette; `text-[11px] font-bold` → `text-xs font-semibold`.
- Connector `h-px bg-border` → consider `h-0.5 bg-muted` for slight weight, or leave as-is.
- Timeline-bar labels: `font-bold text-primary` on active → `font-semibold text-primary`.
- `bg-background/95 backdrop-blur` on sticky bar — verify after palette lands.

### Car Diagram

- Already token-driven. **No changes required** beyond visual verification after foundation-tokens lands.
- Optional: add ARIA-live region or tooltip on zone hover ("Zone avant-droit sélectionnée") for a11y polish. Defer.

### Global Search

- [Line 72](../src/components/global-search.tsx#L72): `"Search..."` → `"Rechercher..."`.
- [Line 80](../src/components/global-search.tsx#L80): `"What do you need?"` → `"Que cherchez-vous ?"`.
- [Line 43](../src/components/global-search.tsx#L43): `"Error: Could not fetch suggestion."` → `"Erreur : suggestion indisponible."`.
- Verify kbd chip `⌘K` reads well on warm palette.
- **Confirm integration**: ensure global-search is rendered in the header per layout-shell plan, or in a page context.

### Observations Panel

**Retune `TYPE_BADGE_STYLES`** to warm palette:
- Planification: `bg-sky-50 text-sky-800` (shift blue warmer).
- Décision de statut: `bg-amber-50 text-amber-800`.
- Expert: `bg-emerald-50 text-emerald-800`.
- Général: keep `bg-secondary text-secondary-foreground` (token-driven).

**Retune `ROLE_BADGE_STYLES`** — match the retuned status-colors family philosophy:
- Admin: `bg-violet-50 text-violet-700` (subdued).
- Responsable d'équipe: `bg-sky-50 text-sky-800`.
- Gestionnaire: `bg-cyan-50 text-cyan-800`.
- Agent de Terrain: `bg-emerald-50 text-emerald-800`.
- Chiffreur: `bg-amber-50 text-amber-800`.
Plus dark-mode variants.

- Empty observations feed: `<EmptyState icon={<MessageSquare />} title="Aucune observation" description="Ajoutez une observation pour démarrer la discussion." />`.
- Textarea `aria-invalid` hook.
- Send button loading prop.
- Collapsible variant inherits chevron rotation.
- Preserve Firestore `addDoc` + subcollection path + `addObservation` side effect.
- Preserve `canWrite(section)` gate.

### Camera Capture

(Not read — pattern-level plan.)
- Button states (start/stop capture, switch camera, retake) use default/outline variants → teal.
- Preview canvas: no hardcoded colors likely.
- Camera permission error: show via Alert destructive variant with French copy.
- Preserve `getUserMedia` flow, camera-switch logic, capture → upload pipeline.

### Voice Recorder/Player

(Not read — pattern-level plan.)
- Record button: prominent primary, possibly pulse/glow during recording. Verify warm-tinted animation.
- Timer display: `tabular-nums font-mono`.
- Waveform (if any): use teal + muted tokens.
- Player controls: ghost icon buttons.
- Preserve `MediaRecorder` flow.

### Step 1-6 components

Pattern-level:
- Apply form/list/file pattern changes from dossier-detail plan (A/B/C/D patterns).
- Replace any `confirm()` with AlertDialog.
- Remove hardcoded blue/green/red.
- Swap inline spinners for Button loading.
- Empty/loading states → shared-ui primitives.

### typed-documents-grid

(Not read — pattern-level plan.)
- Typed doc tile: inherit palette, verify per-type icon/label.
- Click handlers preserved.
- Grid responsive breakpoints verified.

## Constraints / no-go

- Do **not** change `DOSSIER_TIMELINE_STEPS` array without resolving the step-2 mismatch with the user first.
- Do **not** touch the `useCollapsedSteps` hook contract (localStorage keys depend on dossierId + stepId).
- Do **not** change the `findScrollContainer` logic or the `ACTIVE_THRESHOLD = 120` magic number without verifying against the current action-bar + timeline-bar heights.
- Do **not** alter the Firestore path for observations (`{section}/{dossierId}/observations`).
- Do **not** change `addObservation` / `addDoc` / `orderBy` patterns.
- Do **not** break the ⌘K keyboard shortcut registration in global-search.
- Do **not** touch `getAiSuggestion` contract.
- Do **not** change the car-diagram zone IDs (AV / AVG / AVD / LATG / LATD / AR / ARG / ARD / Toit) — tied to Firestore persisted state.
- Do **not** change camera/voice MediaRecorder / getUserMedia flows.
- Preserve French copy verbatim except the global-search English strings (localize).

## Risk level

**Medium** overall:
- Timeline step mismatch needs user input before touching (structural).
- Observations type/role palette retune is pure visual — low risk.
- Car diagram is drop-in.
- Global search English → French is mechanical.
- Camera/voice components preserve load-bearing media flows; polish only.

## Dependencies

- **Requires foundation-tokens, shared-ui** — primitives, including retuned palette and EmptyState.
- **Requires dossier-detail plan** — step components apply that plan's pattern changes.
- **Coordinates with layout-shell** — global-search integration in header.

## Exit criteria

- `npm run typecheck` passes.
- Timeline visual polish applied; step mismatch flagged in master plan.
- Car diagram renders warm + teal after foundation-tokens.
- Global search shows French throughout, ⌘K still works.
- Observations panel: type + role badges retuned to warm palette, no hardcoded `bg-blue-100/orange-100/green-100/purple-100/indigo-100/sky-100/emerald-100/amber-100`.
- Camera/voice/step components preserve their data contracts.

## Open items to resolve during implementation

1. **Timeline step-2 mismatch** — add Observations as section 2 shifting everything, or remove from steps array? **User decision required before touching.**
2. **Global search header placement** — ensure layout-shell plan includes it, or page-level placement.
3. **typed-documents-grid audit** — read during implementation.
4. **step-1 through step-6 audit** — read during implementation (likely mostly inherit from pattern rules).
5. **Camera permission error UX** — Alert in overlay or toast? Lean Alert inline + toast on retry.
6. **Voice recorder pulse animation during recording** — warm-tinted `bg-destructive/10 animate-pulse` or steady? Lean subtle pulse.
