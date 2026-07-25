# i18n sweep rules (white-label / multi-language)

These rules govern the conversion of hardcoded French UI strings to the
`t()` translation layer in `src/i18n`. Every sweep task MUST follow them.

## How the system works

- The FRENCH source string IS the translation key: `t('Enregistrer')`.
- `src/i18n/en/*.ts` files map French key → English value. A missing entry
  falls back to the French text (safe degradation) — but your goal is FULL
  coverage of the files you own.
- In React components: `import { useT } from '@/i18n';` then
  `const t = useT();` at the top level of the component function
  (respect the Rules of Hooks — never inside conditions/loops/callbacks).
- In non-React modules (PDF generators, email builders, plain helpers):
  `import { t } from '@/i18n';` and call `t('...')` at RENDER/CALL time
  (never at module top level — the locale isn't known yet).

## What to wrap

- JSX text content: `<Button>{t('Annuler')}</Button>`
- Display props: `title`, `label`, `placeholder`, `description`, `alt`,
  `aria-label`, `emptyMessage`, tooltips, `confirm...` texts
- Toast payloads: `toast({ title: t('Erreur'), description: t('...') })`
- Dialog titles/descriptions, empty states, loading labels, button text
- Locally-defined label maps that are ONLY used for display — wrap at the
  render site (`{t(labels[k])}`), NOT by translating the map values.
- Dynamic domain values shown to the user (status names, role names) —
  wrap AT THE DISPLAY SITE ONLY: `{t(dossier.statut)}`, `{t(user.role)}`.

## What must NEVER be wrapped or altered

- Strings written to Firestore or compared as values: statuses, roles,
  option ids, docType values, collection/field names.
  `setStatus('Validé')` and `role === 'Gestionnaire'` stay UNTOUCHED.
- Routes, hrefs, storage keys, query params, CSS classes, ids.
- date-fns format patterns (`'dd/MM/yyyy'`), regexes, console.* messages,
  code comments.
- Anything inside `src/lib/*-schema.ts` parsing logic.

## Interpolated sentences

`t()` takes no parameters. Split around the variable:
- `` `Dossier ${n} supprimé` `` → `` `${t('Dossier')} ${n} ${t('supprimé')}` ``
  is UGLY — prefer restructuring: `` `${t('Dossier supprimé :')} ${n}` ``.
- Keep the number of separate keys low; favor `Label : ${value}` shapes.
- If code already branches on plural, translate each branch.

## Dates and number locales

- `import { fr } from 'date-fns/locale'` + `locale: fr`
  → `import { dateFnsLocale } from '@/i18n'` + `locale: dateFnsLocale()`.
- `toLocaleDateString('fr-FR', ...)` → `toLocaleDateString(intlLocale(), ...)`
  (import `intlLocale` from `@/i18n`). Same for `toLocaleTimeString` /
  `toLocaleString` used for DISPLAY. (PDF/number formatting that uses
  `BRAND.numberLocale` stays as is.)
- If a `useMemo`/`useCallback` produces formatted dates, add the current
  locale to its deps: `const { locale } = useLocale();` and include `locale`.

## Currency

- Literal `DHS` / `MAD` / `DH` shown to users → `BRAND.currencyLabel`
  (import `{ BRAND } from '@/lib/brand'`). E.g. `Montant HT (MAD)` →
  `` `${t('Montant HT')} (${BRAND.currencyLabel})` ``.

## Dictionary discipline

- You own EXACTLY ONE file in `src/i18n/en/`. Never edit any other
  dictionary file, and never edit `src/i18n/en/index.ts` or `common.ts`.
- READ `src/i18n/en/common.ts` FIRST. If a string is already there, wrap it
  with `t()` but do NOT re-add it to your file.
- Keys must match the source string EXACTLY (accents, punctuation, spaces,
  apostrophes — `'` vs `’`, `...` vs `…`).
- Follow the glossary at the top of common.ts (dossier=file, devis=estimate,
  chiffrage=estimating, expertise=appraisal, compagnie=insurer,
  gestionnaire=manager, chiffreur=estimator, agent de terrain=field agent,
  rappel=reminder, carte grise=vehicle registration, constat=accident report).
  Write natural, professional North-American insurance English.

## Mechanics

- Use the Edit tool ONLY (never sed/PowerShell text munging — files are
  UTF-8 with accents and must stay that way).
- Do not reformat, re-indent, or "clean up" code you are not translating.
- Do not run `npm run build`. You may run `npx tsc --noEmit` ONCE at the
  very end and fix only errors in files you touched.
