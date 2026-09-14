# Mobile redesign 2026-09-14 — implementation brief

Source of truth: the Claude Design handoff (unzipped at
`C:/Users/pc/AppData/Local/Temp/claude/c--Users-pc-Downloads-SL-auto-main/56471f1e-5d10-4a3a-b480-cc26570ec44e/scratchpad/design/`):

- `Phone.dc.html` — the prototype. Lines 14–630 are the screens (HTML with
  `{{ }}` bindings), lines 632–1040 the JS that computes every binding
  (styles, data, sheets). Read BOTH halves for your screen; the JS half holds
  the exact chip tones, sizes and behaviours.
- `SL-auto Mobile Redesign.dc.html` — the decision notes per turn (turn 2:
  dossiers consolidated; turn 3: cards everywhere, search/filters in the bar;
  turn 4: devis = the PDF file, rappel replay Avant | Après | Modifications).
- `github.md` — screen → repo file map.

Design tokens used by the prototype map 1:1 onto the app's tokens:

| prototype | app |
|---|---|
| `C.bg hsl(42 24% 94.5%)` | `bg-background` |
| `C.card hsl(45 30% 99.4%)` | `bg-card` |
| `C.s2 / s3 / s4` | `bg-surface-2 / -3 / -4` |
| `C.hair / hairS` | `border-hairline / border-hairline-strong` |
| `C.ink / ink2 / ink3 / ink4` | `text-ink / -2 / -3 / -4` |
| `C.pri / priFg` | `bg-primary text-primary-foreground` |
| `C.acc / accFg` | `bg-accent text-accent-foreground` |
| `C.ter / terFg / terD / terBg` | `bg-tertiary / text-tertiary-foreground / text-tertiary-deep / bg-tertiary-bg` |
| `okBg/okFg warnBg/warnFg dgBg/dgFg infoBg/infoFg` | `status-{success,warning,danger,info}-{bg,fg}` |
| `RIM` | `shadow-rim` · `RIMF` | `shadow-rim-filled` |
| `chip()` 20 px pill 11/500 | `<Badge variant="neutral|info|warning|success|danger|time">` |
| card `border:1px hair; radius 12; shadow 0 1px 2px` | `<RecordCard>` / `RECORD_CARD_CLASS` |
| `pill()` 32 px scope pill | `<ScopePills>` |
| `seg()` 30 px segment | `<Segmented size="xs">` |
| time block 52×44 / 48×40 | `<DateBlock>` |

## Shell contract (already built — do not edit these files)

`src/components/layout/phone-top-bar.tsx`, `mobile-nav.tsx`, `page-chrome.tsx`,
`root-more-sheet.tsx`, `src/lib/nav-groups.ts` (MOBILE_AREAS), and the
primitives `src/components/ui/{record-card,scope-pills,date-block}.tsx`,
`segmented.tsx` (xs size).

A phone page publishes its bar through `usePhoneChrome({...})` from
`@/components/layout/page-chrome` (memoise the object; functions by identity):

```ts
usePhoneChrome(useMemo(() => isPhone ? {
  count: 42,                                   // own segment / title pill
  title: 'Missions',                           // root title override (single-destination areas)
  subtitle: 'Bonjour Rachid · mar. 16 sept. · 12 missions',
  search: { value, onChange, placeholder: 'Réf., assuré, plaque…', sortLabel: 'Récents', onSort },
  filters: { count: 2, onOpen: () => setFilterSheetOpen(true) },
  primaryAction: { label: 'Scanner la plaque', icon: <ScanLine />, onClick },   // 36 px filled button in the bar
  secondaryActions: [{ key, label, icon, onSelect }],                           // « ⋯ » rows
  // record screens only:
  upHref: '/dossiers', upLabel: 'Dossiers',
  titleChip: { label: dossier.statut, tone: 'warning' },
} : null, [deps]));
```

The bar paints the area segment toggle (Dossiers | Rappels | Consultation,
Tableau de bord | Suivi d'équipe) and the Admin chips itself — pages must NOT
render their own scope tabs / PageHeader title on phones. `PageHeader` already
paints nothing below md. The SearchRow / bell / avatar / « Plus » sheet are
gone from the phone shell: the page's search lives in the bar (`search`).

The bottom bar: `<BottomActionBar primary secondary>` (unchanged) replaces the
5-area nav on record screens. Record title = `useRegisterPageTitle(...)` (the
dossier RecordBar already does it).

## Rules

- Phone only: gate with `useIsPhone()` (from `@/hooks/use-viewport-class`) or
  `max-md:` classes. Desktop and tablet renderings must be byte-identical in
  behaviour. Never `sm:` for "phone".
- Keep edits LOCAL to the phone code paths of each file: another session is
  fixing desktop logic in several of the same files on branch `debrand` and
  the two will be merged; do not reformat, reorder imports or move unrelated
  code. Add new phone UI in NEW files next to the page when it is more than
  ~60 lines (`phone-*.tsx`), and wire them from the page.
- French only, no placeholder names (format cues only: « Réf., assuré,
  plaque… »), Moroccan phone format. No English, no demo/white-label wording.
- Tokens only (no hexes). Type floor 11 px (digits) / 12 px (words). Touch
  targets ≥ 40 px (44 for form controls). Never truncate a status label to
  « … » on phones.
- Cards: `RecordCard` (`id` mono 12 ink-3 stacked ABOVE `title` 15/600 which
  wraps; `meta` 12 ink-3 with chips; `trailing` column end-aligned). Lists are
  `RecordCardList` (gap 8) inside the page's 16 px padding.
- Sheets: `BottomSheet`, `ActionSheet`, `FilterSheet`, `SortSheet`,
  `FullScreenDialog` from `@/components/ui/*` — never a centred dialog on a
  phone.
- Animations: `ease-standard` 200–300 ms, transform/opacity only,
  `motion-reduce:*`.
- Verification: `npx tsc --noEmit -p tsconfig.json` from
  `C:/Users/pc/Downloads/sl-auto-mobile` must pass (no ESLint config on this
  branch — check hook order against early returns by hand). No dev server /
  screenshots are possible here.
- Do not `git commit`, `git checkout` or `git stash` — the integrating session
  commits.
