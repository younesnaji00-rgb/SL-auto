# REDESIGN: Compagnies (Area 10 / 16)

Scope: compagnie index (grid of compagnie cards) + per-compagnie detail view (stats + dossiers table). Visually ambitious surface with lots of chrome-level issues.

## Files in scope

- [src/app/(app)/compagnies/page.tsx](../src/app/(app)/compagnies/page.tsx) *(thin wrapper)*
- [src/app/(app)/compagnies/client-page.tsx](../src/app/(app)/compagnies/client-page.tsx) *(grid + detail, 313 lines)*
- [src/app/(app)/compagnies/[slug]/page.tsx](../src/app/(app)/compagnies/[slug]/page.tsx) *(not read — assumed thin redirect or slug-based alias)*

## Current state (audit)

Page has two modes driven by `?selected={compagnieId}` URL param:
1. **Grid view** ([client-page.tsx:113-173](../src/app/(app)/compagnies/client-page.tsx#L113-L173)) — 3-col responsive grid of compagnie cards.
2. **Detail view** ([client-page.tsx:176-311](../src/app/(app)/compagnies/client-page.tsx#L176-L311)) — header with logo/name + 4-card stats row + dossiers table.

### Grid view

- `Card` with `border-l-4` using `c.couleur` inline style. Nice brand identity touch.
- Logo upload via imperative `document.createElement('input')` at [client-page.tsx:138-146](../src/app/(app)/compagnies/client-page.tsx#L138-L146). Functional, ugly, preserve behavior.
- Group hover: `group-hover:translate-x-1` on ChevronRight + `group-hover:text-primary` on title + `group-hover:opacity-10` on ghost Building2 icon. Good micro-interaction.
- Footer chip: `text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full` at [line 164](../src/app/(app)/compagnies/client-page.tsx#L164). Over-emphasized — every compagnie card has the same uppercase-tracking-widest chip for the same reason.

### Detail view — header

- `h1 text-3xl font-black tracking-tight` at [line 205](../src/app/(app)/compagnies/client-page.tsx#L205). **`font-black` is extreme** — Outfit's Black weight is aggressive; `font-semibold` reads more intentional.
- Logo frame: `h-12 w-12 rounded-xl bg-muted ... cursor-pointer border hover:border-primary/30` — clean.
- Subtitle: `Tableau de bord opérationnel` — good French.
- Top-right buttons: **"Tous les dossiers"** (outline) and **"Nouveau Dossier"** (default with `shadow-lg shadow-primary/20`). Both navigate to `/dossiers`. **UX issue**: "Nouveau Dossier" button should open the create dialog (pre-filled with the compagnie), not just route to the list.

### Detail view — stats row ([client-page.tsx:222-240](../src/app/(app)/compagnies/client-page.tsx#L222-L240))

Hardcoded palette:
- Nouveaux: `color: 'text-blue-600', bg: 'bg-blue-500/5'`
- En cours: `color: 'text-amber-600', bg: 'bg-amber-500/5'`
- Terminés: `color: 'text-green-600', bg: 'bg-green-500/5'`

- `CardTitle text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60` — over-styled label. `opacity-60` is a layering mistake when the text is already `text-muted-foreground`.
- `text-4xl font-black` on the big number — Outfit Black at 4xl is shouting.

### Detail view — dossiers table ([client-page.tsx:242-310](../src/app/(app)/compagnies/client-page.tsx#L242-L310))

- Card with `bg-heading-bg border-b py-4` header chip — inherited.
- Table headers: `font-bold text-xs` (reasonable).
- Row cells show lots of styling inconsistency:
  - refExpert: `font-mono font-black text-primary text-xs` — `font-black` again.
  - Assuré: `font-bold text-xs uppercase text-foreground/80` — uppercase assuré names reads YELLING.
  - Matricule: `text-[10px] font-black font-mono tracking-tighter bg-muted/50 px-2 py-0.5 rounded w-fit inline-block mt-3 ml-4` — `mt-3 ml-4` arbitrary inline offsets, busy layout.
  - Statut badge: `<Badge variant="outline" className="text-[9px] font-bold py-0 h-5 border-primary/20">` — **bug: doesn't use `getStatusBadgeStyles`**. Every status renders with identical primary-tinted outline, no semantic color. All statuses look the same.
  - Date: `text-[10px] font-bold text-muted-foreground` with `dd MMM yyyy` fr locale.
  - Action: Ghost IconButton with `hover:bg-primary/10 hover:text-primary` — clean.

### Loading states

- Page-level loader ([lines 104-111](../src/app/(app)/compagnies/client-page.tsx#L104-L111)): `Loader2` + "Chargement des partenaires..." centered. Should use `PageLoader`.
- Table loader ([lines 265-271](../src/app/(app)/compagnies/client-page.tsx#L265-L271)): `Loader2` + uppercase "CALCUL DES DONNÉES..." — over-styled, should use SkeletonRow × N.

### Empty state ([lines 272-278](../src/app/(app)/compagnies/client-page.tsx#L272-L278))

`Inbox` icon + "Aucun dossier actif pour {nom}." — hand-rolled. Use EmptyState.

### Memory-rule intersection

- `useCompagnies()` at [line 43](../src/app/(app)/compagnies/client-page.tsx#L43) fetches all compagnies unrestricted. ✅
- `useDossiers(selectedCompagnie?.nom ? [selectedCompagnie.nom] : undefined)` at [line 67](../src/app/(app)/compagnies/client-page.tsx#L67) — data-scope to the selected compagnie's name. **Data filtering by context is fine** (this is the compagnie-detail page, of course it shows that compagnie's dossiers). No rule violation.

## Concrete changes

### Grid view

- Preserve `border-l-4` with `c.couleur` inline — it's the brand color thread.
- Footer chip `"Gérer les Sinistres"` at [line 164](../src/app/(app)/compagnies/client-page.tsx#L164): tone down — remove `font-bold uppercase tracking-widest` OR keep uppercase but drop bold. Lean: `text-xs font-medium text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full` — still a chip, less shouting.
- Logo upload imperative dialog: leave as-is (functional). Later refactor to a shared `<LogoUploader />` component.
- Group hover animations: preserve.
- Grid spacing `gap-6` + `md:grid-cols-2 lg:grid-cols-3` — fine.

### Detail view — header

- `h1 text-3xl font-black` → `text-4xl font-semibold tracking-tight`. Outfit Semibold at 4xl reads confident without being brutal.
- Subtitle: `text-muted-foreground font-medium` → `text-muted-foreground` (drop `font-medium`).
- Logo frame: preserve.
- **"Nouveau Dossier" button fix**: replace the `Link href="/dossiers"` with a button that opens the `CreateDossierDialog` pre-filling compagnie to `selectedCompagnie.nom`. Passes a `seed` prop or uses controlled state. This is the correct flow.
- `shadow-lg shadow-primary/20` on the new button — keep, feels right.

### Detail view — stats row

- **Reset hardcoded palette** to semantic tokens via `status-colors.ts` families:
  - Total: neutral (`text-foreground` + `bg-muted/30`).
  - Nouveaux: violet family (`text-violet-700` + `bg-violet-50`) — matches the "new/creation" mapping in status-colors.
  - En cours: amber family.
  - Terminés: emerald family (matches the "validated" mapping).
  - All using the retuned status-colors shades so they read warm.
- Label: `text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60` → `text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground`. Drop `font-black`, drop `opacity-60` (redundant layering), standardize tracking.
- Big number: `text-4xl font-black` → `text-4xl font-semibold tabular-nums`. Add `tabular-nums` since these are counts.

### Detail view — dossiers table

- **Fix statut badge**: replace the plain `<Badge variant="outline" ... border-primary/20>` with:
  ```tsx
  <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut))}>
    {d.statut || 'Nouveau'}
  </Badge>
  ```
  Imports: `getStatusBadgeStyles`, `STATUS_BADGE_CLASS` from `@/lib/status-colors`.
- refExpert: `font-mono font-black text-primary text-xs` → `font-mono font-semibold text-primary text-sm`. Bump size since ref is identifying info.
- Assuré: `font-bold text-xs uppercase text-foreground/80` → `font-medium text-sm`. Drop uppercase (names aren't labels; uppercase reads as yelling).
- Matricule: `text-[10px] font-black font-mono tracking-tighter bg-muted/50 px-2 py-0.5 rounded w-fit inline-block mt-3 ml-4` → `font-mono text-xs bg-muted/50 px-2 py-0.5 rounded inline-block`. Drop `font-black`, drop `tracking-tighter`, drop arbitrary `mt-3 ml-4` offsets, drop `w-fit` (not needed on inline-block).
- Date: `text-[10px] font-bold` → `text-xs text-muted-foreground tabular-nums`.
- Header cells `font-bold text-xs` → `font-semibold text-xs uppercase tracking-[0.08em] text-muted-foreground` for label-grade consistency.
- Table row hover: `hover:bg-muted/50 transition-colors` — fine.
- Action button `hover:bg-primary/10 hover:text-primary` — fine, inherits teal.

### Loading states

- Full-page loader → `<PageLoader label="Chargement des partenaires..." />`.
- Table loader → remove the "CALCUL DES DONNÉES..." uppercase row; use `SkeletonRow` × 5 inside `TableBody`.

### Empty state

- Replace [lines 272-278](../src/app/(app)/compagnies/client-page.tsx#L272-L278) with:
  ```tsx
  <TableRow>
    <TableCell colSpan={6} className="p-0">
      <EmptyState
        icon={<Inbox />}
        title={`Aucun dossier pour ${selectedCompagnie.nom}`}
        description="Aucun dossier n'est actuellement associé à cette compagnie sur la période sélectionnée."
      />
    </TableCell>
  </TableRow>
  ```

### Grid loader fallback

- If `loadingCompagnies` true, use `SkeletonCard` × 6 in the grid shape rather than the centered full-page loader. Preserves layout stability.

## Constraints / no-go

- Do **not** touch the `useCompagnies` / `useDossiers` hook consumer contracts.
- Do **not** change the logo upload Storage path format (`compagnies/${id}/logo/${ts}_${name}`).
- Do **not** remove the `border-l-4 ... c.couleur` brand color thread — it's compagnie identity.
- Do **not** change the `stats` computation logic — status groupings are intentional, even if loose (e.g., "En cours" matches `.toLowerCase().includes('cours') || ...('programmée')`).
- Do **not** change the URL param pattern (`?selected={id}`) — sidebar compagnie sub-items depend on it.
- Do **not** remove the per-date filter (`dateFrom`/`dateTo`) or the `usePersistedFilters('compagnies', ...)` key.
- Preserve French copy verbatim.

## Risk level

**Medium.** Visual changes are significant but contained to one surface. Stat-card palette retune and table-cell styling cleanup are reviewable. The statut badge fix is a semantic correctness gain (users will now see semantic colors that match everywhere else).

## Dependencies

- **Requires foundation-tokens, shared-ui** — primitives.
- **Requires dashboard** — status-colors.ts retune (for the statut badge fix).
- **Optional: create-dossier-dialog already exists** — import and consume in the "Nouveau Dossier" button.

## Exit criteria

- `npm run typecheck` passes.
- Grid view: compagnie cards render with brand-color left border; footer chip tone is not shouting.
- Detail view: name heading reads confident but not brutal; stats use semantic token colors; statut badges show correct per-status colors (no longer uniform primary).
- Table cells: no `font-black`, no arbitrary `mt-3 ml-4`, consistent typography scale.
- Empty/loading states use EmptyState / SkeletonRow / PageLoader.
- "Nouveau Dossier" button opens CreateDossierDialog pre-filled with selected compagnie.

## Open items to resolve during implementation

1. **"Nouveau Dossier" button behavior** — open CreateDossierDialog with pre-filled compagnie, or keep navigating to `/dossiers`? Lean open dialog.
2. **Uppercase usage audit** — where else do labels benefit from uppercase chip treatment? Stats labels yes, table headers yes, refExpert/assuré no.
3. **Brand-color thread in detail view** — currently only grid has the `border-l-4 c.couleur`. Add a subtle accent to detail view header (e.g. a 4px colored bar next to the compagnie name)? Lean yes, small touch.
4. **[slug]/page.tsx** — investigate during implementation; if thin redirect, leave alone.
