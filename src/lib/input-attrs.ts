/**
 * Input attribute presets — the phone keyboard, autofill and autocorrect
 * contract for every field in the app.
 *
 * Source: docs/research/mobile-forms-inputs.md §2.7 (the attribute table),
 * consolidated in mobile-synthesis §5 and element-specs addendum 2026-09-06
 * bis « Forms (C) ». The rules these encode, with the source that gives them:
 *
 *  • `inputmode="numeric"` / `"decimal"` instead of `type="number"` — GOV.UK
 *    text input: "Do not use `<input type="number">`" (spinners, scroll-wheel
 *    mutation, silent truncation of a leading zero). `pattern="[0-9]*"` is
 *    what actually flips iOS < 12.2 to the digit pad.
 *  • `type="tel"` AND `inputmode="tel"` — MDN: "Use `<input type="tel">`
 *    instead of `inputmode="tel"` when requiring a telephone number"; the two
 *    together give the pad on every engine plus `autocomplete="tel"`.
 *  • `autocorrect="off" autocapitalize="off" spellcheck="false"` wherever
 *    autocorrect would corrupt data — Baymard mobile checkout ("'str' being
 *    auto-corrected to 'ate'"): plates, CIN, police / permis / série numbers.
 *  • `autocapitalize="words"` and NO `autocomplete` on third-party identity
 *    fields — these are the ASSURÉ's / the adverse party's name, never the
 *    gestionnaire's, so browser autofill must not offer their own contact.
 *  • `enterkeyhint` — MDN: next / done / go / search / send. Every field in a
 *    form gets `next`; the LAST one gets `done` (spread `INPUT_LAST` over it).
 *
 * Usage — spread, then override only what the field needs:
 *
 *     <Input {...INPUT_TEL} placeholder={BRAND.phonePlaceholder} … />
 *     <Input {...INPUT_NUMERIC} value={km} … />
 *     <Input {...INPUT_EMAIL} {...INPUT_LAST} … />
 *
 * Every preset is a plain frozen object, safe to spread into `Input`,
 * `Textarea` or a bare `<input>`. They carry NO `className`: sizing is the
 * control's job (48 px on phones via `max-md:h-12` in `input.tsx`).
 */

import type { InputHTMLAttributes } from 'react';

type Attrs = Readonly<
  Pick<
    InputHTMLAttributes<HTMLInputElement>,
    | 'type'
    | 'inputMode'
    | 'pattern'
    | 'autoComplete'
    | 'autoCapitalize'
    | 'autoCorrect'
    | 'spellCheck'
    | 'enterKeyHint'
  >
>;

const freeze = <T extends Attrs>(a: T): T => Object.freeze(a);

/**
 * Téléphone / WhatsApp / Téléphone 2. Moroccan format (+212) — the cue lives
 * in the placeholder (`BRAND.phonePlaceholder`), never a French one. Any
 * spacing is accepted on input; normalisation happens on save.
 */
export const INPUT_TEL = freeze({
  type: 'tel',
  inputMode: 'tel',
  autoComplete: 'tel',
  autoCapitalize: 'off',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'next',
} as const);

/** Email — lowercase keyboard, no capitalisation, no autocorrect. */
export const INPUT_EMAIL = freeze({
  type: 'email',
  inputMode: 'email',
  autoComplete: 'email',
  autoCapitalize: 'none',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'next',
} as const);

/**
 * Whole numbers (kilométrage, puissance fiscale, TVA, quantités). NEVER
 * `type="number"`: GOV.UK forbids it and it breaks `maxlength`, pasting and
 * the scroll wheel. The value stays a string.
 */
export const INPUT_NUMERIC = freeze({
  type: 'text',
  inputMode: 'numeric',
  pattern: '[0-9]*',
  autoComplete: 'off',
  autoCapitalize: 'off',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'next',
} as const);

/** Amounts (montant HT / TTC, franchise, vétusté) — decimal pad. */
export const INPUT_DECIMAL = freeze({
  type: 'text',
  inputMode: 'decimal',
  autoComplete: 'off',
  autoCapitalize: 'off',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'next',
} as const);

/**
 * Immatriculation / matricule. Upper-case keyboard, no autocorrect: a plate
 * is compared through `plate-match.ts`, so a "helpful" correction is a lost
 * match. Render it in `t-mono` at the call site.
 */
export const INPUT_PLATE = freeze({
  type: 'text',
  inputMode: 'text',
  autoComplete: 'off',
  autoCapitalize: 'characters',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'next',
} as const);

/**
 * Identifiers in a proportional font: CIN, n° de police, n° de permis,
 * numéro de série, référence compagnie, réf dossier.
 */
export const INPUT_ID = freeze({
  type: 'text',
  inputMode: 'text',
  autoComplete: 'off',
  autoCapitalize: 'characters',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'next',
} as const);

/**
 * Nom / prénom / raison sociale of a THIRD PARTY (assuré, partie adverse,
 * intermédiaire, expert). `autocapitalize="words"`, and deliberately NO
 * `autocomplete`: offering the signed-in gestionnaire's own name here is the
 * classic autofill data-corruption bug (research §2.7).
 */
export const INPUT_NAME = freeze({
  type: 'text',
  inputMode: 'text',
  autoComplete: 'off',
  autoCapitalize: 'words',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'next',
} as const);

/** Adresse (a third party's, so no `autocomplete="street-address"` either). */
export const INPUT_ADDRESS = freeze({
  type: 'text',
  inputMode: 'text',
  autoComplete: 'off',
  autoCapitalize: 'sentences',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'next',
} as const);

/**
 * Free text that is prose (observation, message, description) — keep the
 * system's capitalisation and spellcheck, they help here.
 */
export const INPUT_TEXT = freeze({
  type: 'text',
  inputMode: 'text',
  autoComplete: 'off',
  autoCapitalize: 'sentences',
  enterKeyHint: 'next',
} as const);

/** A list search field (the > 12-option select sheet, list search rows). */
export const INPUT_SEARCH = freeze({
  type: 'search',
  inputMode: 'search',
  autoComplete: 'off',
  autoCapitalize: 'none',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'search',
} as const);

/**
 * Spread AFTER a preset on the LAST field of a form so the keyboard's action
 * key reads « OK » instead of « Suivant » (MDN enterkeyhint).
 */
export const INPUT_LAST = freeze({ enterKeyHint: 'done' } as const);

/** Sign-in identifier (the ONE place autofill is wanted — web.dev). */
export const INPUT_USERNAME = freeze({
  type: 'text',
  autoComplete: 'username',
  autoCapitalize: 'words',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'next',
} as const);

/** Sign-in password. Never pre-populated (Apple HIG). */
export const INPUT_PASSWORD = freeze({
  type: 'password',
  autoComplete: 'current-password',
  autoCapitalize: 'off',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'go',
} as const);

/** New password (first-run setup / password change). */
export const INPUT_NEW_PASSWORD = freeze({
  type: 'password',
  autoComplete: 'new-password',
  autoCapitalize: 'off',
  autoCorrect: 'off',
  spellCheck: false,
  enterKeyHint: 'next',
} as const);
