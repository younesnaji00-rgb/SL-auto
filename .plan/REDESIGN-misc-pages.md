# REDESIGN: Misc Pages (Area 16 / 16)

Scope: two loose ends — read-only document viewer and the bug-reporting chat page. Both already clean, minimal polish.

## Files in scope

- [src/app/viewer/page.tsx](../src/app/viewer/page.tsx) *(552 lines — read-only PDF/image viewer)*
- [src/app/(app)/signaler-bug/page.tsx](../src/app/(app)/signaler-bug/page.tsx) *(573 lines — bug-report chat with admin inbox)*

## Current state (audit)

### Viewer (`/viewer`)

Read-only version of the editor. PDF.js + image rendering, toolbar (back, filter, file switcher, comparison, zoom, rotation), status bar, "Lecture seule" indicator.

- **"Lecture seule" amber badge** at [line 363](../src/app/viewer/page.tsx#L363): `text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/30`. Semantic amber for "read-only" warning — correct meaning, but hardcoded shades. Retune via warm-amber family.
- **Status bar amber** at [line 439](../src/app/viewer/page.tsx#L439): `text-amber-500` — same story.
- **Canvas background** at [line 381](../src/app/viewer/page.tsx#L381): `bg-slate-200 dark:bg-slate-800` — preserve (same rationale as editor: PDF contrast).
- **Page overlay** at [line 424](../src/app/viewer/page.tsx#L424): `text-slate-400 font-mono pointer-events-none` "Page N / N" — hardcoded slate. Fine on slate bg, but could use `text-muted-foreground/60 tabular-nums`.
- **Loading state** at [line 272-276](../src/app/viewer/page.tsx#L272-L276): centered Loader2 + "Chargement du document..." on `bg-slate-100`. Use `<PageLoader />`.
- **Inline loading in canvas area** at [line 383-387](../src/app/viewer/page.tsx#L383-L387): centered Loader2. Use InlineLoader.
- **Toolbar h-7 buttons**: inherits teal, clean.
- **Compact file type indicator chip** at [line 313](../src/app/viewer/page.tsx#L313): `text-[9px] bg-muted px-1 rounded font-semibold` — fine.
- **Zoom readout** at [line 346](../src/app/viewer/page.tsx#L346): `text-[10px] font-mono` — good.
- **ReadOnlyAnnotation component** at [lines 499-551](../src/app/viewer/page.tsx#L499): renders annotations without interactivity. No palette issues.
- **`typeof allFiles`** referencing `.map((f: any) => ({ ...f, source: 'chiffrage' as const }))` at [line 116](../src/app/viewer/page.tsx#L116) — shape parallels the editor.
- **Accent typo** at [line 60](../src/app/viewer/page.tsx#L60): `'Photos - Apres'` — should be `'Photos - Après'`. (Editor has this correct at its equivalent location.)

### Signaler Bug (`/signaler-bug`)

Dual-mode:
1. **Non-admin user** sees their own chat thread with support (`ChatThread conversationUid={firebaseUser.uid}`).
2. **Admin** sees inbox list + selected conversation (WhatsApp-style layout).

Data shape:
- `bugReports/{uid}` conversation doc + nested `messages` subcollection.
- Messages: text + optional file attachment + optional voice message.
- Storage paths: `bugReports/{uid}/fichiers/*` + `bugReports/{uid}/vocales/*`.
- Voice via `VoiceRecorder` + `VoicePlayer` (domain-components).

**Already well-designed**:
- Teal avatar fallback on own messages at [line 436](../src/app/(app)/signaler-bug/page.tsx#L436): `bg-primary/10 text-primary`.
- Primary message bubble: `bg-primary text-primary-foreground rounded-tr-none` (own) vs `bg-accent/50 rounded-tl-none` (other).
- Unread count badge: `bg-primary` ✅.
- Avatar badge role: `variant="outline"` ✅.
- Initial loading: centered Loader2 in flex container at [line 87-91](../src/app/(app)/signaler-bug/page.tsx#L87-L91) — use PageLoader.
- Admin inbox loading at [line 156-159](../src/app/(app)/signaler-bug/page.tsx#L156-L159) — InlineLoader.
- Admin inbox empty at [line 161-164](../src/app/(app)/signaler-bug/page.tsx#L161-L164): Inbox icon + "Aucun rapport de bug" — use EmptyState.
- ChatThread empty at [line 424-429](../src/app/(app)/signaler-bug/page.tsx#L424-L429): Bug icon + "Aucun message pour le moment" + subtitle — use EmptyState.
- No-conversation-selected at [line 237-240](../src/app/(app)/signaler-bug/page.tsx#L237-L240): Bug icon + "Sélectionnez une conversation" — use EmptyState.

**No hardcoded blue/red/green anywhere** ✅.

**French copy clean** — accents correct across: "Signaler un bug", "Décrivez le problème rencontré", "Aucun rapport de bug", "Sélectionnez une conversation", "Aucun message pour le moment", "Décrivez le problème ci-dessous", "Message vocal prêt", "Joindre un fichier", "Envoyer", "Annuler".

**Send button** at [lines 514-516](../src/app/(app)/signaler-bug/page.tsx#L514-L516) and [lines 552-565](../src/app/(app)/signaler-bug/page.tsx#L552-L565): inline Loader2 — Button loading prop.

**File attachment download button** at [lines 469-480](../src/app/(app)/signaler-bug/page.tsx#L469-L480): `border-primary/20 hover:bg-primary/5` + `text-primary` file icon — teal-themed ✅.

**Enter-to-send** at [line 527-531](../src/app/(app)/signaler-bug/page.tsx#L527-L531): Enter sends, Shift+Enter newline. Preserve.

**Admin unread clear** at [line 133-136](../src/app/(app)/signaler-bug/page.tsx#L133-L136): marks conversation read on select. Preserve.

**Voice upload** to Storage `.webm` format at [line 327](../src/app/(app)/signaler-bug/page.tsx#L327). Preserve.

## Concrete changes

### viewer/page.tsx

- **Amber badge + status bar**: retune `text-amber-600/400`, `bg-amber-50/950`, `text-amber-500` to warm-amber shades (same retune philosophy as dashboard status-colors).
- **Accent typo** at [line 60](../src/app/viewer/page.tsx#L60): `'Apres'` → `'Après'`.
- **Loading states**: replace centered Loader2 patterns with PageLoader / InlineLoader.
- **Page overlay** at [line 424](../src/app/viewer/page.tsx#L424): `text-slate-400` → `text-muted-foreground/60 tabular-nums` (still muted on slate bg).
- **Canvas bg**: keep `bg-slate-200 dark:bg-slate-800` — preserves PDF contrast.
- **ReferencePanel**: inherits polish from editor.

### signaler-bug/page.tsx

- **Empty states**: swap three ad-hoc empty blocks for `<EmptyState>`:
  - "Aucun rapport de bug" (admin inbox).
  - "Aucun message pour le moment" (chat thread).
  - "Sélectionnez une conversation" (unselected chat).
- **Loading states**: InlineLoader in admin inbox + chat thread; PageLoader for profile gate.
- **Send button**: Button loading prop (two instances).
- **File attachment max width**: `max-w-[120px]` → consider bumping to `max-w-[180px]` for readability. Defer, low priority.
- **Badge `{c.unreadByAdmin}` at [line 192-194](../src/app/(app)/signaler-bug/page.tsx#L192-L194)**: explicitly `className="... bg-primary"` with default Badge — could drop explicit bg and use `default` variant, inherits teal. Defer.
- **No palette changes needed** — page is already token-driven.

## Constraints / no-go

- Do **not** touch PDF.js loading, worker registration, canvas rendering in viewer.
- Do **not** touch the ReferencePanel integration.
- Do **not** change the read-only contract (no edit handlers in viewer).
- Do **not** touch the `bugReports/{uid}` collection path or subcollection `messages`.
- Do **not** change Storage upload paths (`bugReports/{uid}/fichiers/*`, `bugReports/{uid}/vocales/*`).
- Do **not** change the admin vs. user mode branching (`isAdmin` gate).
- Do **not** change `unreadByAdmin` `increment(1)` / clear-on-open logic.
- Do **not** change Enter-to-send / Shift+Enter newline behavior.
- Do **not** touch VoiceRecorder / VoicePlayer contracts.
- Preserve French copy verbatim except the single `Apres` → `Après` fix in viewer.

## Risk level

**Low.** Viewer is read-only — no data paths touched. Signaler-bug is already well-designed. Both surfaces get minor polish only.

## Dependencies

- **Requires foundation-tokens, shared-ui, domain-components** (voice).
- **No blocks.**

## Exit criteria

- `npm run typecheck` passes.
- Viewer: amber read-only badges retuned to warm-amber.
- Viewer: `Apres` → `Après` fixed.
- Viewer: loading states use primitives.
- Signaler-bug: empty states use EmptyState.
- Signaler-bug: loading states use primitives.
- Signaler-bug: Send buttons use Button loading prop.
- No regressions in chat thread (own/other alignment, voice playback, file download, Enter-to-send, unread count).
- No regressions in viewer (file switching, comparison panel, zoom, rotation).

## Open items to resolve during implementation

1. **Amber shade calibration** — match the warm palette's amber without losing "warning" semantic.
2. **File attachment truncation width** — `max-w-[120px]` → `max-w-[180px]`? Defer to visual review.
3. **Admin inbox sort** — currently by `lastMessageAt desc`. Preserve.
