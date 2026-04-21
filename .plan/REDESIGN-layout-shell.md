# REDESIGN: Layout Shell (Area 3 / 16)

Scope: the app-wide chrome — sidebar, header, user nav, notifications, breadcrumb, offline indicator, and the `(app)/layout.tsx` container. This is the frame every route renders inside.

## Files in scope

- [src/app/(app)/layout.tsx](../src/app/(app)/layout.tsx)
- [src/components/layout/header.tsx](../src/components/layout/header.tsx)
- [src/components/layout/sidebar.tsx](../src/components/layout/sidebar.tsx)
- [src/components/layout/user-nav.tsx](../src/components/layout/user-nav.tsx) *(currently dead code — not imported anywhere)*
- [src/components/layout/notifications.tsx](../src/components/layout/notifications.tsx) *(currently dead code — not imported anywhere)*
- [src/components/breadcrumb.tsx](../src/components/breadcrumb.tsx)
- [src/components/offline-indicator.tsx](../src/components/offline-indicator.tsx)

## Current state (audit)

### [(app)/layout.tsx](../src/app/(app)/layout.tsx)
- Auth gate via `AuthGuard` component — redirects to `/login` if unauthenticated. Preserves correctly.
- Loading state at [layout.tsx:27-35](../src/app/(app)/layout.tsx#L27-L35): ad-hoc `Loader2` + "Chargement..." label. Should use the new `PageLoader` primitive planned in shared-ui.
- `FULL_WIDTH_ROUTES = ['/devis-editor']` — container strategy is `p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto` for non-full-width.
- `main bg-background/50` — semi-transparent over a root bg. This was fine on the blue palette but on warm cream it may read as slightly desaturated. Keep for now; evaluate visually after foundation-tokens.
- Uses `h-svh` — already on dynamic viewport units. Keep.

### [header.tsx](../src/components/layout/header.tsx)
- Sticky 56px (`h-14`) bar with `bg-background/95 backdrop-blur-md` + `shadow-sm`.
- Contents: mobile-only sidebar trigger, breadcrumb. No search, no notifications, no user avatar. Very sparse.
- The v3 mockup has the global search (⌘K) positioned in the page content area, not the header — so the header intentionally stays minimal. Confirmed OK.
- Missing from header: notification bell trigger. Per v3 the bell sits top-right of main area. Decision: add the Notifications dropdown to the header right side.

### [sidebar.tsx](../src/components/layout/sidebar.tsx)
Full-width analysis:
- Uses Radix `Sidebar` provider with `collapsible="icon"`, `shadow-xl z-50`.
- **Nav structure is a flat list** at [sidebar.tsx:67-76](../src/components/layout/sidebar.tsx#L67-L76). No section labels. v3 mockup has `ESPACE` and `ANALYSE` grouped labels — current sidebar has none.
- Role filtering at [sidebar.tsx:79-82](../src/components/layout/sidebar.tsx#L79-L82) — preserve logic, just regroup visually.
- "Compagnies" nav item is a collapsible tree at [sidebar.tsx:109-186](../src/components/layout/sidebar.tsx#L109-L186):
  - Lists all compagnies with logo/color dot + name.
  - Delete handler at [sidebar.tsx:138](../src/components/layout/sidebar.tsx#L138) uses `confirm()` — browser-native, ugly, violates the "no window.alert" rule. Must become `AlertDialog`.
  - "Ajouter" inline input is functional but plain; polish the style.
- SidebarHeader at [sidebar.tsx:98](../src/components/layout/sidebar.tsx#L98): logo + trigger. Uses `bg-background` — clean.
- SidebarContent `bg-background/50` — tinted behind content. Fine.
- SidebarFooter:
  - Theme toggle button (moon/sun) — icon-only in collapsed mode, label in expanded.
  - User display block uses `bg-primary/5` tint → will shift to teal-tinted cream after foundation-tokens. Good.
  - Role label styled `text-[10px] text-muted-foreground truncate uppercase font-black` — **font-black is aggressive**. Should be `font-semibold tracking-[0.08em]` for a more elegant uppercase label.
  - Settings + Logout buttons as icon-only row.
- Active state via `isActive` prop on `SidebarMenuButton` — inherits `--sidebar-accent` + `--sidebar-accent-foreground` (will become mint-teal after foundation-tokens).

### [user-nav.tsx](../src/components/layout/user-nav.tsx) — **DEAD CODE**
- Exported but not imported in header or layout. Grep confirms only the file references itself.
- Redundant with sidebar footer's user block and signout button.
- Uses `PlaceHolderImages` stock image for avatar — violates "no stock diverse team photos" rule.
- **Decision: delete this file.** The sidebar footer already handles the user display; no shell component needs UserNav.

### [notifications.tsx](../src/components/layout/notifications.tsx) — **DEAD CODE with placeholder violations**
- Exported but not imported anywhere.
- Hardcoded placeholder content at [notifications.tsx:38-42, 50-54](../src/components/layout/notifications.tsx#L38-L42):
  - "A new user, 'John Doe', has just signed up" — violates the "no John Doe" rule.
  - "CPU usage is currently at 92%" — nonsense for an insurance-expertise app.
- `animate-ping` unread dot is nice — keep that pattern.
- **Decision: redesign and wire into the header.** Keep the shape, replace placeholder text with real Firestore-backed notifications (or at least French-realistic examples until data layer is wired).

### [breadcrumb.tsx](../src/components/breadcrumb.tsx)
- Reads `usePathname()`, splits on `/`, builds a breadcrumb with `ChevronRight` separators.
- Label generation: `segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')` — naive. Produces ugly labels for dynamic routes:
  - `/dossiers/abc123` → `Dossiers > Abc123` (raw Firestore ID shown).
  - `/assignations-atg/xyz456` → `Assignations atg > Xyz456`.
- Needs either a label map for known routes or skip dynamic segments that look like IDs.
- "SL-auto" root label at [breadcrumb.tsx:16](../src/components/breadcrumb.tsx#L16) — could use the logo instead, or drop if the sidebar already shows branding. Decision: keep "SL-auto" text but typeset it per the new font.

### [offline-indicator.tsx](../src/components/offline-indicator.tsx)
- Two states: offline (amber banner) + online-with-pending-uploads (blue banner).
- Uses hardcoded `bg-amber-50 dark:bg-amber-950` and `bg-blue-50 dark:bg-blue-950` — bypasses the token system.
- Amber offline color is acceptable (warning semantic), but `bg-blue-50` will clash with the warm palette. Must retune to either teal or muted info color.
- French copy correct (`Mode hors ligne`, `Synchronisation en cours`).

## Concrete changes

### [(app)/layout.tsx](../src/app/(app)/layout.tsx)
- Replace the `AuthGuard` loading block (ad-hoc `Loader2` + "Chargement...") with `<PageLoader label="Chargement..." />` from shared-ui once that primitive exists.
- No other changes — the `FULL_WIDTH_ROUTES` pattern and `max-w-[1600px]` container are correct.

### [header.tsx](../src/components/layout/header.tsx)
- Add the Notifications dropdown on the right side of the header.
- Keep mobile SidebarTrigger + Breadcrumb on the left.
- Structure: `<header class="... flex items-center justify-between">` with left group (trigger + breadcrumb) and right group (notifications).
- Consider adding a subtle bottom border via `border-b` token (already present) that feels warm — no token change needed.

### [sidebar.tsx](../src/components/layout/sidebar.tsx)
- **Group nav items into labelled sections** per v3:
  - `ESPACE` group: Tableau de bord, Gestion des dossiers, Consultation, Compagnies.
  - `ANALYSE` group: (future — Statistiques isn't built yet per the scan; leave slot ready).
  - `ASSIGNATIONS` group: Assignations Chiffrage, Assignations Agent de Terrain.
  - `ADMIN` group: Utilisateurs (Admin only).
  - `DIVERS` group: Signaler un bug.
  - Use `SidebarGroupLabel` (Radix sidebar primitive) with `tracking-[0.08em] text-xs uppercase text-muted-foreground` for the label styling.
  - Preserve existing role-filtering logic — just apply it per-group.
- **Compagnie delete**: Replace [sidebar.tsx:138](../src/components/layout/sidebar.tsx#L138) `confirm()` with `AlertDialog` (from shared-ui) wrapping the X button. Title in French: "Supprimer {c.nom} ?". Cancel + destructive confirm.
- **Add compagnie inline input**: Style it to match the new Input primitive — currently a raw `<input>` with ad-hoc Tailwind. Use the `Input` component at size `sm` with `placeholder="Nom de la compagnie..."`.
- **Role label in footer**: change `text-[10px] ... uppercase font-black` to `text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground`. More refined, still readable.
- **User block background**: `bg-primary/5` will become teal-tinted after foundation-tokens. Keep.
- **Collapsed state**: currently the user block collapses to show initials only at [sidebar.tsx:223](../src/components/layout/sidebar.tsx#L223). Fine, keep.
- No structural changes to `SidebarProvider` or the Radix primitives.

### [user-nav.tsx](../src/components/layout/user-nav.tsx)
- **Delete the file.** Confirmed unused. The sidebar footer already owns user display + signout.
- Before deleting, grep one more time for `UserNav` to confirm. If a forgotten import surfaces, convert it into a redirect to the sidebar user section or a minimal icon-only dropdown.

### [notifications.tsx](../src/components/layout/notifications.tsx)
- **Delete the placeholder "John Doe" and "CPU 92%" entries.** These are the exact anti-patterns the redesign skill flags.
- Restructure as a data-driven list that accepts notifications via prop or Firestore hook (defer data wiring to a later area — for now, accept an empty state when no notifications exist).
- Render empty state using the new `EmptyState` primitive: icon `Bell`, title "Aucune notification", description "Vous serez notifié des changements importants ici."
- Keep the `animate-ping` unread badge, but only show when there's at least one unread notification.
- Import and render this component in [header.tsx](../src/components/layout/header.tsx) on the right side.

### [breadcrumb.tsx](../src/components/breadcrumb.tsx)
- Add a label map for known routes — resolves French labels matching the sidebar:
  ```
  const ROUTE_LABELS: Record<string, string> = {
    dashboard: 'Tableau de bord',
    dossiers: 'Gestion des dossiers',
    consultation: 'Consultation',
    'assignations-chiffrage': 'Assignations Chiffrage',
    'assignations-atg': 'Assignations Agent de Terrain',
    utilisateurs: 'Utilisateurs',
    compagnies: 'Compagnies',
    'signaler-bug': 'Signaler un bug',
    chiffrage: 'Chiffrage',
    'devis-editor': 'Éditeur de devis',
    editor: 'Éditeur PDF',
    viewer: 'Aperçu',
  };
  ```
- Detect dynamic Firestore-id-like segments (e.g. `[A-Za-z0-9]{16,}`) and either:
  - hide them entirely, or
  - render as "Détails" if last in the chain.
  - Preferred: hide + let the page-level heading do the context work.
- Replace root "SL-auto" with a chevron-home pattern: show "Tableau de bord" as root if user is there, otherwise "Tableau de bord > ...".
- Styling: no change beyond font inheritance.

### [offline-indicator.tsx](../src/components/offline-indicator.tsx)
- Retune hardcoded color palette:
  - Offline (amber): replace `bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200` with warmer muted amber or the new `--warning` if introduced. Acceptable fallback: keep amber but shift to `bg-amber-100/60` to feel softer on cream.
  - Syncing (blue): **replace blue entirely with teal** to align with palette. Use `bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.2)]`.
- No structural changes; copy stays.

## Constraints / no-go

- Do **not** change the `AuthGuard` logic — Firebase auth gating is load-bearing.
- Do **not** change `useCompagnies` consumption in sidebar — memory rule: compagnies must stay unrestricted for every role.
- Do **not** change the `SidebarProvider` / `SidebarInset` composition in `(app)/layout.tsx` — Radix collapse state depends on it.
- Do **not** remove `h-svh` (dynamic viewport height) — iOS Safari fix.
- Do **not** alter the `FULL_WIDTH_ROUTES` list without coordinating with devis-editor plan.
- Do **not** touch the `useOfflineSync` hook consumer contract — offline-indicator reads `isOnline` + `pendingCount`.
- Preserve the keyboard behavior on the inline Add-Compagnie input (Enter to submit, Escape to cancel).

## Risk level

**Medium.** Sidebar sectioning is a visual restructure that touches the nav users see every second. One mis-grouped nav item confuses power users. Compagnie `confirm()` → AlertDialog swap is a keystroke change that could surprise muscle memory (two clicks now instead of one). Header adding Notifications is net-new UI.

Low for: offline-indicator retune, breadcrumb label map, user-nav deletion.

## Dependencies

- **Requires foundation-tokens + shared-ui first.** Depends on `AlertDialog`, `EmptyState`, `PageLoader`, retuned palette, and the cleaned-up Badge/Button primitives.
- **Blocks:** every page area depends on layout-shell for consistent chrome, but most don't block on it visually — they can be redesigned in parallel as long as layout-shell lands before the implementation loop starts Phase 3 surfaces.

## Exit criteria

- `npm run typecheck` passes.
- All routes still load under auth guard.
- Sidebar renders grouped nav labels (ESPACE / ASSIGNATIONS / ADMIN / DIVERS) with correct role filtering.
- Compagnie delete uses AlertDialog, not `confirm()`.
- No blue or amber hardcoded Tailwind colors in offline-indicator.
- Notifications dropdown visible in header, with empty-state fallback.
- Breadcrumb never displays raw Firestore IDs.
- `user-nav.tsx` file deleted, no dead imports.
- Collapsed sidebar still shows user initials + icon-only trigger buttons.

## Open items to resolve during implementation

1. Grouping exact label names — `ESPACE` vs `PRINCIPAL` vs `NAVIGATION` for the top group. Lean `ESPACE` per v3.
2. Whether to surface `/consultation` in `ESPACE` or a separate `LECTURE` group. Lean `ESPACE`.
3. Notification data source: Firestore subcollection under `users/{uid}/notifications`? Defer to a separate data-layer ticket; shell just renders whatever it receives.
4. Whether to delete `user-nav.tsx` outright or leave as dormant export in case future layouts need it. Lean delete (don't keep dead code).
