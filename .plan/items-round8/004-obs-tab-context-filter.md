# 004 — ObservationsTab gains `contextPhase` and `contextAccord` filter props
Status: pending
Type: behavioral
Cluster: A
Files: src/components/observations-tab.tsx
Depends on: 001
Verify: tsc --noEmit AND build AND grep confirms filter logic

## User intent
> make the observations stay only where they were written

## Done criteria
- `<ObservationsTab>` accepts (in addition to props from items 002/003):
  - `contextPhase?: 'Avant'|'En cours'|'Après'` — filter mode for AT-source obs.
  - `contextAccord?: '1er accord'|'2ème accord ou +'` — filter mode for chiffreur-source obs.
- Filter rules (applied IN ADDITION to the existing cross-role visibility from round 7):
  - If `contextPhase` set:
    - Include obs where `phaseATG === contextPhase`.
    - Include obs from `source='dossiers'` (gestionnaire catch-all, per Q-1 A).
    - Include legacy AT obs (source='assignations-atg', phaseATG missing) — per Q-4 A.
    - Exclude obs with `phaseATG` set to a different phase.
    - Exclude obs with `accordSlot` set (those belong to chiffrage panels).
  - If `contextAccord` set:
    - Include obs where `accordSlot === contextAccord`.
    - Include obs from `source='dossiers'` (gestionnaire catch-all).
    - Include legacy chiffreur obs (source='assignations-chiffrage', accordSlot missing) WHEN `contextAccord === '1er accord'` (per Q-4 A + P-LEGACY-OBS-VISIBILITY).
    - Exclude obs with `accordSlot` set to a different slot.
    - Exclude obs with `phaseATG` set.
  - If neither prop set: behave exactly like today (no context filtering).

## Decisions
- D1 Apply on top of cross-role filter (round 7 items 017/018).
  - {resolved-by-code: src/components/observations-tab.tsx:140-163}
- D2 Gestionnaire catch-all behavior: dossiers-source obs show everywhere.
  - {question: Q-1 → A}
- D3 Legacy fallback: AT legacy in all 3 Plan panels; chiffreur legacy in step 6.
  - {question: Q-4 → A}

### Edge-case probe
- All decisions resolved by Q-1 and Q-4. No new questions.

## Coordination
- Items 005, 006, 007 wire these props in.

## Notes
(populated at dispatch)
