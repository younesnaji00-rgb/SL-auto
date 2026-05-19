# Plan review — ANSWERED 2026-05-11

(All answers received. Plan locked. See `tasks.md` for execution status.)

- Q-1 working-hours model: **A** (full-day skip; weekend/holiday entirely paused)
- Q-2 holiday list: **B + extension** — admin-editable Firestore collection + a settings page to import/manually add dates (new item 025)
- Q-3 detect "AI no time": **A** (separate `<field>TimeKnown: boolean`)
- Q-4 manual date/time edit: **A + B** — gestionnaire can edit full date+time when value is null AND can edit just the time when `timeKnown === false`
- Q-5 TimelineBar empty stamps: **A** (render nothing)
- Q-6 new roles: **A** + "make it work" — add `Directeur` and `Directeur technique` to UI; refactor `canRoleWrite` to be name-driven so any new role added via the gear icon picks up sensible defaults. New `canDelete` helper checks role name.
- Q-7 preset+custom both: **C** (reject submission until one is cleared — XOR)
- Q-8 valider granularity: **B** (per-observation, not per-dossier)
- Q-9 chiffreur "stuck": **B** (observation carries the `accordSlot` tag)
- Q-10 AT "stuck": **A** (current planification phase)
- Q-11 lightbox wrap: **B** (hide/disable arrow at boundary; no wrap)
- Q-12 réforme toggle who: **A** (Agent de Terrain only)
- Q-13 required 7 slots: **A** (Devis Garage, Facture Garage, PV-Constat / Récépissé de police, Carte grise, Attestation d'assurance, Kilométrage, Numéro de chassis)
