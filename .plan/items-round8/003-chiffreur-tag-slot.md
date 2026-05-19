# 003 — Tag chiffreur observations with `accordSlot` at write time
Status: pending
Type: behavioral
Cluster: A
Files: src/components/observations-tab.tsx, src/app/(app)/assignations-chiffrage/[id]/page.tsx
Depends on: 001
Verify: tsc --noEmit AND build AND manual: chiffreur writes obs from chiffrage detail → Firestore shows accordSlot per their selection

## User intent
> same thing for chiffrage depending wether they were on accord or 2eme accord ou +

## Done criteria
- `<ObservationsTab>` accepts an optional `contextAccord?: '1er accord' | '2ème accord ou +'` prop.
- When `contextAccord` is omitted AND `section === 'assignations-chiffrage'`, the compose form renders an inline Select labelled "À propos de quel accord ?" with options "1er accord" / "2ème accord ou +" (per Q-2 A).
- The chosen value is passed to `addObservation(..., accordSlot=chosen)`.
- Compose submission is blocked until the chiffreur picks an accord (per Q-2 A: required field), with an inline `text-[11px] text-destructive` message (mirrors the both-filled XOR error pattern in observations-tab).
- `handleSendMail` and other addObservation calls in `assignations-chiffrage/[id]/page.tsx` that originate from the chiffreur side ALSO carry the chosen accord context — pass through the same selected value.

## Decisions
- D1 Mechanism: explicit Select in the compose form, required for chiffrage section only.
  - {question: Q-2 → A}
- D2 Field values: '1er accord' | '2ème accord ou +' (literal strings, French).
  - {resolved-by-code: matches existing timeline step labels in src/components/dossier-timeline/timeline.tsx:252,254}
- D3 Fallback when user tries to submit without selecting: hard-block (red message). Per Q-2 A.

### Edge-case probe
- a. EXISTING DATA: legacy chiffreur obs without accordSlot → item 004 falls back to step 6 (per Q-4 A + P-LEGACY-OBS-VISIBILITY).
- d. ENFORCEMENT LAYER: client-side compose validation only.
- f. CARDINALITY: 1 obs → 1 accord tag.
- g. DERIVED: explicit user selection (not derived).
- i. PERMISSION BOUNDARIES: unchanged.
- n. ROLLOUT: new writes from chiffrage tagged immediately.

## Coordination
- Items 004, 006 read this tag.

## Notes
(populated at dispatch)
