# REDESIGN: Utilisateurs (Area 11 / 16)

Scope: admin-only user management. Add-user form + user list + user detail edit.

## Files in scope

- [src/app/(app)/utilisateurs/page.tsx](../src/app/(app)/utilisateurs/page.tsx) *(wrapper)*
- [src/app/(app)/utilisateurs/client-page.tsx](../src/app/(app)/utilisateurs/client-page.tsx) *(form + table, 440 lines)*
- [src/app/(app)/utilisateurs/[uid]/page.tsx](../src/app/(app)/utilisateurs/[uid]/page.tsx) *(detail edit, ~120+ lines read)*

## Current state (audit)

### Wrapper page.tsx
- Standard pattern: h1 `Utilisateurs` + subtitle + client-page.
- No issues.

### client-page.tsx — add-user form (left col)

**Critical: "John Doe" placeholder!**
[client-page.tsx:253](../src/app/(app)/utilisateurs/client-page.tsx#L253):
```tsx
<Input placeholder="John Doe" {...field} />
```
**Direct violation** of the "no John Doe" rule from the redesign skill. Must become a Moroccan-realistic example: `"Ex: Ahmed Benali"` or `"Ex: Fatima El Alami"`.

**Form structure** (react-hook-form + zod):
- `userFormSchema` validates: nom (required), password (min 6), confirmPassword (match), role (required), compagnies (min 1).
- FormField + FormMessage pattern uses shared-ui Form primitive (good).
- Submit uses `secondary-auth` Firebase app instance to create users without signing out admin ([lines 126-137](../src/app/(app)/utilisateurs/client-page.tsx#L126-L137)). **Preserve verbatim.**
- Dual-collection sync on Agent de Terrain → `options_agents`, Chiffreur → `chiffreurs` ([lines 153-179](../src/app/(app)/utilisateurs/client-page.tsx#L153-L179)). Preserve.
- Submit button inline spinner `Loader2 ... Création...` — use Button loading prop.
- Card chrome: `border-0 shadow-sm rounded-xl` + `bg-heading-bg rounded-t-xl` header — consistent chip vestige.

### client-page.tsx — user list table (right col)

**Password display**: admins can see user passwords via eye-toggle ([lines 388-399](../src/app/(app)/utilisateurs/client-page.tsx#L388-L399), state at [line 97](../src/app/(app)/utilisateurs/client-page.tsx#L97)). This is by design (memory/scan noted "stored so admin can see it" comment at [line 144](../src/app/(app)/utilisateurs/client-page.tsx#L144)). **Redesign doesn't change this.** Flag the security posture but don't touch.

**Statut badge** ([line 414](../src/app/(app)/utilisateurs/client-page.tsx#L414)):
```tsx
<Badge variant={user.statut === 'Actif' ? 'expertise' : 'destructive'}>
```
**Bug: reuses the `expertise` domain variant as a pseudo-success pill** for "Actif" status. The `expertise` variant is semantically for dossier statuses starting with "Expertise ", not a generic success indicator. Should use a proper `success` badge variant (to be added in shared-ui) or `outline` + inline tailwind for Actif.

**Role badge** ([line 402](../src/app/(app)/utilisateurs/client-page.tsx#L402)):
`<Badge variant="outline">{user.role}</Badge>` — plain, no role-specific tint. Acceptable; could be bumped to role-tinted chips but low priority.

**Pencil icon action button** ([line 420](../src/app/(app)/utilisateurs/client-page.tsx#L420)):
`<Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />` — **hardcoded blue**, same pattern as dossier-list action icons. Remove.

**Delete confirm** ([line 199](../src/app/(app)/utilisateurs/client-page.tsx#L199)):
`confirm('Voulez-vous vraiment supprimer cet utilisateur ?')` — must become AlertDialog.

**Filter chip X bubble** ([line 359](../src/app/(app)/utilisateurs/client-page.tsx#L359)):
Same floating red X pattern as dossier-list. Consolidate with shared "active filters" strip.

**Loading/empty states**:
- [line 379](../src/app/(app)/utilisateurs/client-page.tsx#L379): `"Chargement..."` plain text → SkeletonRow × N.
- [line 381](../src/app/(app)/utilisateurs/client-page.tsx#L381): `"Aucun utilisateur trouvé."` plain text → EmptyState.

**Compagnies cell** ([lines 404-411](../src/app/(app)/utilisateurs/client-page.tsx#L404-L411)):
Shows "Toutes" label if `compagnies` array is empty, otherwise `secondary` badges per compagnie. Clean pattern, preserve. **Note**: "Toutes" wrap appears because empty `compagnies: []` means "all"; but this is separate from the sidebar compagnie dropdown rule — this is the user's scope-filter on DATA, not a dropdown.

**Email generation**: line 67-77 — same pattern as login. Preserve.

### [uid]/page.tsx — user detail edit

Based on first 120 lines:
- Imports `AlertDialog` family ✅ — this page is better-built than client-page for destructive actions.
- Imports `getStatusBadgeStyles` ✅ from status-colors.
- Uses `useDoc(userRef)` realtime.
- State for form edit + password visibility + delete dialog + save/delete loading.
- Fetches: assigned dossiers (by `assignedTo` or `createdBy`) + activity history.
- Role icons imported: `ShieldAlert`, `Ban`, `UserCheck` — likely per-role visual.
- Body below line 120 likely: breadcrumb/back, form fields, role-specific section, related dossiers table, activity history timeline, save + delete buttons.

**Not fully read — applies the same pattern-level changes:**
- Button loading prop for save + delete.
- Empty states for related dossiers + activity history.
- Skeleton for `userLoading` / `dossiersLoading` / `historyLoading`.
- Hardcoded color removal (likely present for role icons or status indicators).
- Preserve all Firestore queries and collectionGroup reads.

## Concrete changes

### client-page.tsx

**1. Kill "John Doe"**
- [Line 253](../src/app/(app)/utilisateurs/client-page.tsx#L253): `placeholder="John Doe"` → `placeholder="Ex: Ahmed Benali"` (or another Moroccan-realistic name). Align with login setup placeholder at [login/page.tsx:201](../src/app/login/page.tsx#L201) which already uses this exact example.

**2. Replace `confirm()` delete with AlertDialog**
- Wrap delete trash IconButton in AlertDialog (similar to dossier-list plan).
- Title: `"Supprimer cet utilisateur ?"`, description with consequences (Firebase Auth account + Firestore doc + role-specific collection entries all removed).
- Confirm button: destructive variant with copy `"Supprimer"`.
- Preserve the `handleDelete` side-effect cascade exactly (user doc + `options_agents` cleanup if Agent de Terrain + `chiffreurs` cleanup if Chiffreur).

**3. Fix statut badge**
- Add a `success` variant to Badge in shared-ui (already planned).
- Replace [line 414](../src/app/(app)/utilisateurs/client-page.tsx#L414) with:
  ```tsx
  <Badge variant={user.statut === 'Actif' ? 'success' : 'destructive'}>
    {user.statut || 'Actif'}
  </Badge>
  ```
- Keep the Actif/Inactif semantic; drop the `expertise` variant abuse.

**4. Remove hardcoded blue on Pencil action**
- [Line 420](../src/app/(app)/utilisateurs/client-page.tsx#L420): drop `text-blue-600 dark:text-blue-400`. Let ghost variant inherit, or apply `text-muted-foreground group-hover:text-foreground`.

**5. Filter chip UX**
- Same "active filters" strip pattern as dossier-list. Shared component.

**6. Loading + empty states**
- Table loading row → SkeletonRow × 5.
- Empty row → EmptyState (`icon={<UserIcon />}`, `title="Aucun utilisateur trouvé"`, description context-aware based on whether search/filter is active).

**7. Button loading on Ajouter**
- [Line 322-324](../src/app/(app)/utilisateurs/client-page.tsx#L322-L324): replace inline text swap with Button loading prop.

**8. Card chrome decision**
- Both cards use `bg-heading-bg rounded-t-xl` chip. Consistent with rest of app. Decision deferred to foundation-tokens visual review — likely drop chip on utilisateurs since the two-card side-by-side layout makes the chips compete.

**9. Typography**
- Card titles: standard. Form labels: standard. Table header: already plain, good.
- Password mono font: `text-sm font-mono` — fine; add `tabular-nums` if needed.

### [uid]/page.tsx

- Button loading on save/delete.
- Empty state for related dossiers (if user has no assigned/created dossiers yet).
- Empty state for activity history (if new user).
- Skeletons for the 3 async data sources (userData, assignedDossiers, activityHistory).
- Remove any hardcoded blue on action icons.
- Role-specific icon (ShieldAlert/Ban/UserCheck) colors: retune to warm palette.
- `getStatusBadgeStyles` use is already correct.
- Preserve all Firestore query patterns (including `collectionGroup`).
- Preserve `useDoc`/`useCollection`/`updateDoc`/`deleteDoc` contracts.

### Shared (both files)

- `tabular-nums` on date columns (createdAt, lastLogin).
- Compagnie secondary badges: verify they inherit warm palette after foundation-tokens.
- MultiSelect primitive: verify teal active state post-tokens.

## Constraints / no-go

- Do **not** change the `secondary-auth` Firebase app pattern for user creation — admin-session-preserving mechanic is load-bearing.
- Do **not** change the role→collection sync logic (Agent de Terrain → `options_agents`, Chiffreur → `chiffreurs`).
- Do **not** change `generateEmail` function — shared with login setup.
- Do **not** change the password visibility toggle pattern — admin-facing by design.
- Do **not** touch `useOptions` / `useCollection` / `useDoc` hook contracts.
- Do **not** change the zod schema shape or validation messages — French copy preserved.
- Do **not** change the `secondary-auth` app name literal — if another part of the codebase references it (unlikely but possible), renaming breaks the link.
- Preserve French copy verbatim (error messages, placeholders, labels).

## Risk level

**High** for the add-user flow: Firebase Auth secondary-app creation is fragile and any refactor could break admin sessions. But redesign scope is styling only — no logic changes planned.

**Medium** for the list: delete flow involves multi-collection cleanup; AlertDialog swap must preserve the cascade order.

**Low** for the "John Doe" placeholder swap and hardcoded-color cleanup.

## Dependencies

- **Requires foundation-tokens, shared-ui** — primitives, including the new `success` Badge variant.
- **Requires dashboard** — status-colors.ts retune for user detail page status badges.
- **No blocks.**

## Exit criteria

- `npm run typecheck` passes.
- `"John Doe"` placeholder replaced with Moroccan-realistic example.
- Delete flow routes through AlertDialog; multi-collection cleanup cascade unchanged.
- Statut badge uses `success` variant, not `expertise`.
- No `text-blue-*` classes remain in utilisateurs files.
- Loading/empty states use shared-ui primitives.
- Button loading prop on Ajouter + save/delete in detail.
- `secondary-auth` admin-preserving user creation still works end-to-end.
- Agent de Terrain → `options_agents` sync still works on create + delete.
- Chiffreur → `chiffreurs` sync still works on create + delete.

## Open items to resolve during implementation

1. **Placeholder name** — "Ex: Ahmed Benali" (matches login setup) or a different Moroccan-realistic example. Lean match login.
2. **Role-specific badge tints** — add per-role color chips? Low priority, defer.
3. **Compagnie cell "Toutes" label** — "Toutes" is correct French for "all"; keep as plain text or bump to `<Badge variant="outline">Toutes</Badge>`? Lean keep as plain muted text (it's not a filter chip).
4. **Security review flag** — plaintext password storage + admin-visible passwords is by design. Not a redesign concern, but if the user wants to revisit during this cycle, a separate security-review ticket applies.
5. **Card chip vestige** on both side-by-side cards — drop entirely for this page? Lean yes (visual clarity with dual-card layout).
