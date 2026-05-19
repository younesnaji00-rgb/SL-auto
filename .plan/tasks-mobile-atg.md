# Mobile redesign — Assignations Agent de Terrain (autonomous loop tracker)

## Work request

Transform the Assignations Agent de Terrain feature (list, detail, par-zone admin view) into a phone-optimized UI/UX when `useIsMobile()` is true, leaving the desktop layout byte-for-byte unchanged. Primary user is the field-agent (ATG); Admin/Gestionnaire are secondary. Full design at `C:\Users\pc\.claude\plans\how-shall-we-transform-splendid-cocoa.md`.

## Global context
- Outer repo: `c:/Users/pc/Downloads/SL-auto-main/` on `auto-2026-04-30`
- Inner repo: `c:/Users/pc/Downloads/SL-auto-main/SL-auto-main/` on `auto-2026-04-24`
- Verify: `cd SL-auto-main && npm run typecheck && npm run build` (typecheck only is fine for tiny edits)
- Dev: `cd SL-auto-main && npm run dev` (port 9002)
- Commit protocol: inner first, then outer pointer bump. **Never push.**
- Stack: Next.js 15 + React 19 + Tailwind + shadcn/ui + Firebase. App router under `src/app/(app)/`.

## Locked assumptions
- Mobile breakpoint: `useIsMobile()` from `src/hooks/use-mobile.tsx` (768px).
- Gating: each page component does an early-return mobile branch at the top of its JSX. Desktop JSX returns unchanged below.
- Palette: warm cream + teal accent (locked per `project_redesign_direction` memory).
- No new dependencies. Sheet, Dialog, Accordion, DropdownMenu already in `src/components/ui/`.
- Reused unchanged: `DeadlineBar` (inline in list page), `CameraCapture`, `ObservationsTab`, `TypedDocumentsGrid`, `getStatusBadgeStyles`, `useCurrentUser`, `usePersistedFilters`, `useAgentTerrainWorkload`, `useHolidays`, `businessHoursBetween`.
- ATG sees only their own assignments (already enforced in the existing data path). View toggle (Par zone / Liste) is hidden for ATG on both desktop and mobile.

## Completed

- [x] Mobile gate scaffold on list page — `785a87a` (typecheck clean, 21 insertions / 0 modifications, desktop byte-identical)
- [x] Greeting strip on list page mobile branch — `01b556b` (typecheck clean, 14 insertions, desktop byte-identical)
- [x] Segmented mission control on list page mobile branch — `7883356` (typecheck clean, 33 insertions, desktop byte-identical)
- [x] Flat card stack body on list page mobile branch — `b5ff50a` (typecheck clean, 74 insertions / 3 placeholder-removal deletions, desktop byte-identical)
- [x] Group accordions wrapping mobile card stack — `cb89963` (typecheck clean, 69 ins / 48 del — restructure of mobile card stack into Collapsibles, desktop byte-identical)
- [x] Detail page mobile gate scaffold — `f20c9c0` (typecheck clean, 29 insertions, desktop byte-identical). Primary identifier: `dossier?.refExpert || dossierId`. Subtitle: pre-computed `assureNom` (`${dossier.assure?.nom || ''} ${dossier.assure?.prenom || ''}`.trim()).
- [x] Identity row on detail page mobile branch — `8effcd3` (typecheck clean, 14 insertions, desktop byte-identical)
- [x] Sticky mission segmented control on detail page mobile branch — `cbb37b1` (typecheck clean, 20 insertions, desktop byte-identical)
- [x] RDV header cards on detail page mobile branch — `d2954e3` (typecheck clean, 47 ins / 3 del — placeholder replaced with iterating planification cards + empty state, desktop byte-identical)
- [x] Photos accordion section on detail page mobile branch — `98a5ed1` (typecheck clean, 38 insertions, desktop byte-identical). Imported Collapsible* — desktop uses a plain button, so the import was new.
- [x] Sticky bottom 'Prendre une photo' CTA on detail page mobile branch — `adb5ed4` (typecheck clean, 17 ins / 1 del — wrapper `<div>` got `pb-24`, CTA inserted, desktop byte-identical)
- [x] Read-only observation block in detail page mobile RDV cards — `4d78ba2` (typecheck clean, 15 ins / 3 del — stub `<p>` swapped for full observation + MAJ meta + Preuves stub, desktop byte-identical)
- [x] Observation edit affordance in detail page mobile RDV cards — `f8d7839` (typecheck clean, 72 ins / 10 del — Pencil + edit-mode Select + Enregistrer/Annuler wired, desktop byte-identical)
- [x] Preuve thumbnails + upload in detail page mobile RDV cards — `661e4ec` (typecheck clean, 46 ins / 1 del — stub `<p>` replaced with Paperclip+Ajouter button + thumb grid + empty state, desktop byte-identical). Delete still deferred.
- [x] Documents accordion + Observations panel on detail page mobile branch — `7f13612` (typecheck clean, 22 insertions, desktop byte-identical). Documents wraps `TypedDocumentsGrid` in a Collapsible; ObservationsTab is dropped in as `variant="collapsible"` (self-managed header).
- [x] Kebab menu with Proposition réforme toggle on detail page mobile app bar — `780652d` (typecheck clean, 38 ins / 1 del — kebab DropdownMenu with single item, label flips between "Proposition réforme" / "Annuler la proposition réforme", desktop byte-identical)
- [x] Filter trigger + bottom Sheet shell on list page mobile — `fb1819d` (typecheck clean, 22 ins / 1 del — Sheet+SlidersHorizontal+Button imports added, `isFilterSheetOpen` state, active-filter dot indicator, "Contrôles à venir" placeholder body, desktop byte-identical)
- [x] Filter controls wired into list-page mobile Sheet body — `417f847` (typecheck clean, 46 ins / 2 del — three stacked groups: Compagnie, Agent (gated on canSeeNameFilter), Période via DateRangeFilter; desktop byte-identical)
- [x] View-mode toggle (Par zone / Liste) on list page mobile — `8d96c2e` (typecheck clean, 30 insertions, desktop byte-identical). Visible only for non-ATG users. Wires to existing `viewMode` / `setViewMode`.
- [x] Par-zone accordion body on list page mobile — `1be23d6` (typecheck clean, 86 ins / 4 del — stub replaced with per-zone Collapsible + agent rows; tap agent → switches to Liste with filter applied; reuses `openZoneSections`; desktop byte-identical)
- [x] Réforme proposée amber banner on detail page mobile — `10b1a98` (typecheck clean, 31 insertions, desktop byte-identical). Shows when `dossier.propositionReforme` is true, between segmented control and RDV cards. Inline `Annuler` link (ATG+canEdit) duplicates the kebab toggle-off path.
- [x] Réinitialiser / Appliquer footer on list page filter Sheet — `e1b1de7` (typecheck clean, 15 insertions, desktop byte-identical). Reset resets four filters; Apply closes the Sheet.
- [x] Bump outer repo submodule pointer to mobile-atg HEAD — `5bf092b` (outer repo `auto-2026-04-30`, exactly one path changed: `SL-auto-main` pointer moved from `3d8a4ba` → `e1b1de7`, 22 inner-repo commits consolidated; no push).

## Current

(empty — final consolidation done)

## Follow-ups

- Mobile branch still computes desktop-only Firestore subscriptions/heavy memoization before the early return. A future iteration may short-circuit data fetches on mobile to save bandwidth — but only if mobile data needs diverge from desktop (they probably won't, since the same `filteredPlanifications` feeds the card stack).
- `useIsMobile` initializes to `false` so SSR/first paint briefly shows desktop on mobile viewports. Acceptable for now; revisit if it causes layout flash complaints.
- Detail page: loading skeleton `if (dossierLoading || plansLoading)` runs before the mobile gate. A future iteration may want a mobile-shaped skeleton there too.
- Outer repo pointer-bump done (`5bf092b`). Future inner-commit batches will need their own bump.
- Remaining polish (not in the work request, only nice-to-haves from the design doc): active filter chip strip on main list screen, preuve delete affordance in preview modal, zone search input in par-zone view, photos accordion open-by-default on mobile.
