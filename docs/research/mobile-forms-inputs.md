# Mobile pass — C. Forms & inputs (research + spec, 2026-09-06)

Scope: brief §4-C, element by element, phone-first (< `lg` today; the shell
family decides whether that stays 1024 px). Sources are numbered in §6 and
cited as [n]; ✓ = fetched and read, ◦ = known, not read. Reddit threads never
surfaced in four searches; the practitioner side is two HN threads (Algolia
mirror), UX Movement, CSS-Tricks, Adam Silver, Vitaly Friedman, Smashing.

## 0. What the code does today (measured)

- `Input` / `Textarea` / `SelectTrigger` are 40 px, 16 px text below `md` (iOS
  zoom rule already honoured) — but Informations overrides every control with
  `className="h-8"` (32 px).
- Informations (`information-tab.tsx`) is a click-to-edit `dl`: « Modifier »
  flips ~35 fields in 5 sections (Dossier 9 + experts · Assuré 7 · Véhicule 9 ·
  Intermédiaire 8 · Partie adverse 9) to inputs at once; Enregistrer / Annuler
  sit in the FIRST section header — 5 screens above the last field on a phone.
- Selects are Radix popovers (32 px items); option lists are admin-managed
  Firestore collections (counts vary at runtime); `expertRank` is a fixed 3.
- `DatePicker` = popover calendar (280 px, 40 px cells); time = native
  `type="time"`. No `inputmode` / `autocomplete` / `autocapitalize` /
  `enterkeyhint` anywhere except `type=email|tel` in the create dialog;
  `vehicule.km` is `type="number"`.
- Planification modal: 829 lines, `grid-cols-2` rows, 92 dvh bottom sheet below
  `lg`, two footer buttons. Capture: `capture="environment"` only on the plate
  scan; photos-tab l. 628 and mission page l. 844 lack it. Login: 400 px card,
  `nom` has `autoFocus` and no `autocomplete`.

## 1. Elements covered

1 Long record form · 2 Select on touch (+ segmented, multi-select) · 3 Date &
time · 4 Multi-field dialogs · 5 Save placement & dirty state · 6 Validation
timing & error summary · 7 Numeric / plate / phone (+ autofill, textarea) ·
8 Camera & file capture · 9 Read-only definition list · 10 Login.

## 2. Findings and specs

### 2.1 Long record form on a phone (Informations)

Findings. Multi-column forms made users "inadvertently skip or omit required
fields"; 2–3 fields per line only for "highly associated" data "so long as the
rest of the overall form layout only consisted of a single column" [4]. Top
labels: "vertical proximity and the consistent alignment… reduces eye movement
and processing time" [10]; "labels on mobile should always be placed above the
field (except when in landscape mode)" [5]; float labels: "the size of the
label has to be tiny… Long labels cannot be used" [28]. Chunking: one question
per page, except "an internal service for government users who need to repeat
and switch between tasks quickly" [1d]; it "work[s] well on mobile devices…
better at handling errors, branches, loops and saving progress", but "user
research can help you identify opportunities for merging questions" [1f]; HN:
theprop "One Thing per Page should probably be mandated by law for mobile
forms" vs wiradikusuma (expert user) "I keep going back and forth, and become
frustrated when data is lost" [35]. Sizes: Material text field 56 dp [17];
"at least about 15 px of padding to input elements and buttons for mobile"
[18]; targets "at least 48×48", "single-column forms are faster" [22]; below
16 px iOS zooms [20].

SPEC — Informations on a phone is never a 35-field edit. Read mode = §2.9.
Each section header keeps its own « Modifier », which opens a **section edit
sheet**: full-screen dialog (§2.4) titled by the section, 5–9 fields, single
column, `t-label` 12 px above, 4 px gap, control 48 px full-width, 16 px text,
16 px between rows, hint `t-caption` between label and control, 20 px padding.
Row-sharing ONLY for the single-entity pairs Nom | Prénom and Date | Heure RDV.
Field order = reading order (identity → contact → address). The whole-form
« Modifier » stays ≥ `lg`. Must not: `h-8` controls on a phone; a 4-column `dl`
collapsing to a 2-column edit grid; floating labels; Save in a header the
user scrolled past.

### 2.2 Select on touch (and segmented control, multi-select)

Findings. GOV.UK: select "only… as a last resort"; users "unable to close the
select", "attempts to type into the select", "pinch zoom difficulties on
smaller devices" [1e]. LukeW: "dropdowns should be the UI of last resort" —
steppers, segmented, radio, switches [11]. NN/g: avoid dropdowns "for data
that is highly familiar" [7]. CSS-Tricks: "Users on mobile and tablets get the
native select, which generally offers a better user experience than a custom
select, including performance benefits" via `@media (hover: hover)` [21]. HN:
nasso_dev "I really like it when an input element opens the Android UI because
I know how it works and that it is reliable"; mlhpdx, a custom select "'only
kinda' works on iOS" [34]. 36.6 % rebuild `<select>` for appearance, 31.6 % for
functionality [25]. Apple: "very large set of items, consider using a list or
table"; "predictable and logically ordered values" [13]; a switch "only in a
list row", for choosing from a list "use a different component" [15]. Material:
segmented "2 to 5 options… more than 5, use chips" [16c].

SPEC — one `PhoneSelect`, tier chosen at render time from `options.length`:
(a) 2–5 → segmented control, 44 px, equal widths, ≤ 2 words (`expertRank`; the
status / type lists while ≤ 5 — a 6th admin option flips the tier); (b) 6–12 →
bottom-sheet list: title = label, 48 px rows, radio dot left, selected
`bg-accent`, status dot kept for statuts, closes on tap; (c) > 12 (compagnies,
agents) → same sheet + 48 px search field pinned at the top, no autofocus (a
keyboard on open hides half the list), `inputmode=search enterkeyhint=search`,
3 recent at the top. Multi-select → same sheet with checkboxes and a footer
« Valider (n) », chips under the trigger. Trigger keeps field anatomy (48 px,
chevron, value or "Choisir"). Native `<select>` = documented fallback for the
Capacitor build (Q1); never a Radix popover on touch. Must not: popover from a
trigger under the keyboard; 32 px items; typing into the trigger; switches for
choices.

### 2.3 Date and time entry

Findings. NN/g: calendars "for events close to the present time — within less
than a year"; on mobile "Scrolling in a small space is slow and unproductive;
it's better to allow users to type the date directly"; mark today, spell the
month [8]. GOV.UK: date input for "a date they'll already know, or can look up
without using a calendar", `inputmode="numeric"`, errors ordered missing →
impossible → range [1b]. Baymard: on mobile "avoid splitting single input
entities" — a 3-field number "required 11 separate actions" [6]. Material:
modal picker for dates "close to the current date by no more than a year";
"Modal Input combines a text field with a modal date picker" [16a]; time = Dial
vs Input [16b]. Apple: compact picker "when space is constrained";
"quarter-hour intervals" [13]. Smashing: three dropdowns = "a journey through
tapping and scrolling" [23]. UX Movement best date UI ◦ [33].

SPEC — two controls by horizon. **Near dates** (Date RDV, relance, échéance;
±1 year): 48 px field → bottom-sheet calendar, 7 × 44 px cells (current
`Calendar` widened to 320–360 px), month spelled, today ringed, chips
« Aujourd'hui · Demain · Lundi prochain », a « Saisir » link to typed mode.
**Known / far dates** (Date sinistre, Date requête, Mise en circulation,
permis): ONE typed field `inputmode=numeric`, JJ/MM/AAAA mask (auto-slashes,
never three fields), placeholder = format cue, trailing 44 px calendar icon
opening the same sheet. **Time**: native `<input type="time" step="900">`,
16 px text; Heure shares the row with Date RDV. Must not: popover calendar on
a phone; day / month / year dropdowns; a calendar for a 2019 registration date.

### 2.4 Multi-field dialogs (planification, create dossier)

Findings. Locked §13 cites Material "full-screen dialogs are for compact
breakpoints only". UX Movement: "Most users don't expect to find the submit
button in the action bar… place your submit button in a fixed footer";
commenter: the keyboard "will be covering it" [30]. Adam Silver: sticky bars
"constantly take up space", "break when you zoom in", "obscure content" —
shorten the page [27]. Apple: "Get information from the system whenever
possible" [14]. Growth.design: "Start by asking users simple questions",
"Personalize future questions by using previous answers" [36].

SPEC — ≤ 3 controls and no textarea → bottom sheet (existing `Dialog` below
`lg`, drag handle, footer inside). Otherwise → **full-screen dialog**: 56 px
top bar [× Annuler · `t-title`], scrolling single-column body (20 px), 64 px
footer with ONE full-width 48 px primary + `env(safe-area-inset-bottom)`.
Planification order: Type de RDV (segmented) → Agent (search sheet) → Date |
Heure → Adresse (+ « Ma position » 44 px trailing) → Zone → Observation (preset
chips, then textarea); type-dependent fields hidden until relevant. Create
dossier: Compagnie (search sheet) → Rôle (segmented) → Nom → Téléphone → Email.
`enterkeyhint="next"` on every field, `"done"` on the last; the footer rides
above the keyboard on Android (`interactive-widget=resizes-content` added to
the `viewport` export) and is reached via Done on iOS. No wizard: 5–8 fields,
repeat experts ([1d], [35]). Must not: two columns; `sm:max-w-[550px]` sheets
scrolled under the keyboard; Save only in the top bar; three buttons.

### 2.5 Where Save lives; dirty state

Findings. Adam Silver: primary aligned with the fields' left edge, cancel
"below the primary button", "Back buttons: put at the top" [26]. UX Movement:
bottom, full-width; "Sticky buttons on web apps cause tapping issues because of
the browser bar popping up" [31]. Smashing: "keep the submit button visible",
"Protect user data with local persistence" [22]. GOV.UK: "labelled 'Continue',
not 'Next'" [1d].

SPEC — No sticky save bar on scrolling PAGES: edits happen in sheets / full-
screen dialogs whose footer is their own chrome (§2.4). Inside them the primary
is full-width 48 px in the footer; Annuler is the top-left × (two footer
buttons at 390 px = two 170 px targets). Verb + noun labels. Dirty state: the
crash-draft buffer works per section; swipe-down / Android back / × on a dirty
sheet asks « Abandonner les modifications ? » [Continuer la saisie]
[Abandonner]; scrim tap does not dismiss a dirty sheet. Button never disabled;
`loading` while saving. Must not: fixed bars on pages; Enregistrer at the top
of a 5-screen form; silent loss on back.

### 2.6 Validation timing, error anatomy, summary

Findings. NN/g: "Avoid showing an error until the user has finished with the
field and moved to the next field"; a summary "shouldn't be the only
indication" [9]. Baymard: "Why are you telling me my email address is wrong, I
haven't had a chance to fill it all out yet!"; errors "live update on a
keystroke level, disappearing the moment users enter a valid input"; on blur,
or "after reaching correct character length" [3]. UX Movement: keystroke
validation "forces users to switch from completion to revision mode" —
validate after submit [32]. Vitaly: "Show errors for empty fields only on
submit"; reward early, punish late [29]. GOV.UK: "Always show an error summary
when there is a validation error, even if there's only one"; "move keyboard
focus to the error summary"; same wording inline [1c]. Smashing: "Keep buttons
enabled. Validate on submission. Display errors afterward." [24]. Apple says
the opposite (button "available only after people enter the data") [14] — §3.

SPEC — Validate on submit; required-empty errors only on submit. Format fields
(téléphone, email, immatriculation, dates) validate on blur once the value has
plausible length. After a failed submit, erroring fields re-validate per
keystroke and clear when they pass. Error under the field: 16 px icon +
`status-danger-fg` 13 px text, danger border, `aria-invalid`, label unchanged.
Summary: ≥ 1 error → callout at the top of the sheet body ("2 champs à
corriger" + links), focus moved there, tap → field, scroll offset by the top
bar. Primary always enabled. Must not: keystroke validation on a fresh field;
green ticks everywhere (reserve for the plate match); error toasts; disabling
Enregistrer.

### 2.7 Numeric, plate, phone, identifier inputs (keypads, autofill, textarea)

Findings. GOV.UK: `inputmode="numeric"` / `decimal`, "Do not use `<input
type="number">`" [1a]. MDN: "Use `<input type="tel">` instead of
`inputmode="tel"` when requiring a telephone number" [19a]; enterkeyhint
next / done / go / search / send [19b]. Baymard: `autocorrect="off"
autocapitalize="off"` where autocorrect corrupts data ("'str' being
auto-corrected to 'ate'") [5]. Apple: "show the appropriate keyboard type",
"Use a number formatter" [12]. Smashing: input masks; "accept multiple input
variations" [22]. web.dev: a `<label>` "provides a bigger target" [18b].

SPEC — attribute table, every breakpoint: Téléphone / WhatsApp `type=tel
autocomplete=tel inputmode=tel`, cue "+212 6 12 34 56 78", any spacing
accepted, normalised on save; Email `type=email autocomplete=email
autocapitalize=none autocorrect=off`; Kilométrage / Puissance
`inputmode=numeric pattern="[0-9]*"` (never `type=number`); Immatriculation /
Matricule `autocapitalize=characters autocorrect=off spellcheck=false`, mono
16 px, plate-match.ts comparison, plate-scan trailing icon on AT flows; CIN /
N° police / N° permis / Numéro de série same, proportional font; Nom / Prénom
`autocapitalize=words`, NO `autocomplete` (third-party names — autofill would
offer the gestionnaire's own); Adresse `autocomplete=off`, textarea 2 → 6 rows
(`field-sizing: content` + JS fallback); `enterkeyhint=next`, last `done`.
Must not: `type=number`; French phone cues; indicatif + numéro split; autofill
on third-party identity fields.

### 2.8 Camera and file capture

Findings. MDN: with `capture` "The device's media capture device(s) such as
camera or microphone will be used instead of requesting a file input"; without
it "Standard file picker dialog"; `environment` = rear camera [19c]. Apple:
"let people provide data by dragging and dropping it or by pasting it" [14].
Smashing: "Leverage device features (camera, biometrics, location)" [22].
terrain-synthesis (accepted) already makes AT flows camera-first.

SPEC — two explicit affordances, never one ambiguous input: « Prendre une
photo » (`accept="image/*" capture="environment"`, 48 px, primary in AT photo
steps, thumb zone) and « Importer » (`accept="image/*" multiple`, no `capture`
→ OS chooser offers gallery + files). Pièces: « Scanner » (camera, sequential
loop) and « Importer un fichier » (`image/*,application/pdf`). Split the two
`capture`-less inputs (photos-tab 628, mission page 844). After capture: 96 px
thumbnail row, 44 px remove target, upload state inline. Must not: `capture`
on the generic document import (kills the gallery on Android); a 32 px
paperclip as the only entry.

### 2.9 Read-only definition list on a phone

Findings. GOV.UK summary list (locked §10); Apple lists "can adjust in height"
[13]; NN/g spell the month [8]; Adam Silver labels outside the box [28];
terrain-synthesis: drop labels only where the format is self-evident.

SPEC — Below `lg` the 4-column `dl` becomes ONE column: key `t-label` 12 px
ink-3 over value 16 px 600 ink, 12 px between pairs, 20 px section padding,
48 px hairline header with icon + « Modifier » (44 px) at the right. Action
values render as actions: phone → `tel:` + 44 px call icon; adresse → maps;
email → `mailto:`; plate mono. Empty = "—" ink-3; whole-empty section = the
existing one-line stand-in. Values wrap, never truncate. Not collapsible by
default (Q4). Must not: 2-column `dl` at 390 px (pairs misread across columns
— the multi-column failure of [4]); equal-weight label and value; boxed pairs.

### 2.10 Login on a phone

Findings. web.dev: `autocomplete="username"` / `"current-password"`, "add a
Show password toggle", button text "says what it does", "labels above your
inputs" [18]. GOV.UK: "the screen is solely about that task" (§20). Apple:
"Never prepopulate a password field" [14]. NN/g password masking ◦ (§20).

SPEC — Below `lg` the card drops its border and becomes the page: 24 px side
padding, logo top-left, `t-title` "Connexion", 48 px fields, 16 px text; `nom`
`autocomplete="username" autocapitalize="words" autocorrect="off"
enterkeyhint="next"`; password `autocomplete="current-password"
enterkeyhint="go"`, 44 px eye toggle; inline `Alert danger` above the button;
one full-width 48 px « Se connecter » with `loading`; demo-role `link`s below.
No `autoFocus` on touch (iOS ignores it, Android opens the keyboard over the
logo). Safe-area bottom padding. Must not: two panels; placeholder-only
fields; a second password field.

## 3. Contradictions and how I resolved them

1. Sticky bottom submit ([30], [22]) vs Adam Silver "sticky is a symptom" [27]
   and UX Movement's own web caveat [31] → no sticky bars on pages; a footer
   only as the chrome of a sheet / full-screen dialog, forms shortened to one
   section per sheet so the footer is one flick away.
2. Apple "button available only after people enter the data", "Dynamically
   validate" [14] vs GOV.UK / Smashing / UX Movement / Vitaly → web guidance
   wins: web + PWA users with no system validation; disabled buttons = dead ends.
3. Baymard on-blur [3] vs UX Movement / Silver on-submit [32] → submit as base;
   on-blur only for fixed-format fields once long enough (Baymard's own
   carve-out); keystroke re-validation only after a failed submit.
4. GOV.UK one-thing-per-page vs expert users ([1d] exception, [35]) → one
   SECTION per screen, not one field.
5. Native `<select>` ([34], [21]) vs custom lists ([1e], [11], [13]) →
   segmented ≤ 5, sheet 6–12, sheet + search > 12; native = documented
   fallback, never the Radix popover.
6. GOV.UK 3-field date [1b] vs Baymard "never split an entity on mobile" [6]
   vs NN/g "let them type" [8] → one masked typed field for known dates; sheet
   calendar for near dates.
7. Material floating labels [17] vs Adam Silver [28] → labels above (locked).
8. `inputmode=tel` vs `type=tel` [19a] → both, plus `autocomplete=tel`.

## 4. Do-not list

- No `h-8` / 32 px controls or list rows on a phone; 48 px controls, 44 px
  minimum for secondary targets.
- No Radix popover Select / Calendar on touch; no dropdowns for 2–5 options.
- No `type="number"`; no autofill hints on other people's identity fields.
- No two-column form rows except Nom | Prénom and Date | Heure.
- No keystroke validation on a fresh field; no disabled primary; no error toasts.
- No sticky save bar on a scrolling page; no Save only in a top action bar.
- No silent dismissal of a dirty sheet (scrim tap, swipe, back).
- No `capture` on the generic document import; no single ambiguous file input.
- No `autoFocus` on touch; no placeholder-as-label; no float labels.
- No 35-field whole-form edit mode below `lg`.

## 5. Open questions for the owner

1. If the bottom-sheet select misbehaves in the Capacitor WebView, is the
   OS-native `<select>` (unstyled wheel / sheet) acceptable there?
2. Section edit sheets replace the whole-form « Modifier » on phones: should
   the AI pre-fill review (teal flash per field) stay page-level or become a
   "vérifier" pass inside the first section sheet?
3. Planification full-screen: keep Date | Heure on one row, or stack them?
4. Read-only `dl` sections: always expanded (my spec) or collapsible with
   Dossier open by default?
5. Time entry: native `type="time"` with 15-min steps, or a chip row of usual
   slots (09:00 … 17:00) above a free field?
6. Date sinistre is typed in my spec (weeks to months old): do gestionnaires
   copy it from a paper mission (typing natural) or would they rather pick?

## 6. Sources

1. GOV.UK Design System ✓ — (a) text input https://design-system.service.gov.uk/components/text-input/ · (b) date input …/components/date-input/ · (c) error summary …/components/error-summary/ · (d) question pages …/patterns/question-pages/ · (e) select …/components/select/ · (f) design notes "One thing per page" https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/
3. Baymard ✓ inline validation https://baymard.com/blog/inline-form-validation
4. Baymard ✓ avoid multi-column forms https://baymard.com/blog/avoid-multi-column-forms
5. Baymard ✓ mobile checkout https://baymard.com/blog/mobile-checkout
6. Baymard ✓ single input entities https://baymard.com/blog/mobile-form-usability-single-input-fields
7. NN/g ✓ drop-down menus https://www.nngroup.com/articles/drop-down-menus/
8. NN/g ✓ date input https://www.nngroup.com/articles/date-input/
9. NN/g ✓ errors in forms https://www.nngroup.com/articles/errors-forms-design-guidelines/
10. LukeW ✓ label alignment https://www.lukew.com/ff/entry.asp?1502
11. LukeW ✓ dropdowns last resort https://www.lukew.com/ff/entry.asp?1950
12. Apple HIG ✓ text fields https://developer.apple.com/design/human-interface-guidelines/text-fields
13. Apple HIG ✓ pickers …/human-interface-guidelines/pickers
14. Apple HIG ✓ entering data …/human-interface-guidelines/entering-data
15. Apple HIG ✓ toggles …/human-interface-guidelines/toggles (all four read via the JSON data endpoints)
16. Material 3 ✓ via developer.android.com/develop/ui/compose/components/ — (a) datepickers · (b) time-pickers · (c) segmented-button (m3.material.io guideline pages render empty — ◦)
17. Material ✓ TextField.md https://github.com/material-components/material-components-android/blob/master/docs/components/TextField.md
18. web.dev ✓ (a) sign-in form best practices https://web.dev/articles/sign-in-form-best-practices · (b) https://web.dev/learn/forms/form-fields
19. MDN ✓ (a) inputmode https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode · (b) enterkeyhint …/Global_attributes/enterkeyhint · (c) capture …/Attributes/capture
20. CSS-Tricks ✓ 16 px iOS zoom https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/
21. CSS-Tricks ✓ native vs custom select https://css-tricks.com/striking-a-balance-between-native-and-custom-select-elements/
22. Smashing ✓ mobile form design 2018 https://www.smashingmagazine.com/2018/08/best-practices-for-mobile-form-design/
23. Smashing ✓ date/time picker 2017 https://www.smashingmagazine.com/2017/07/designing-perfect-date-time-picker/
24. Smashing ✓ disabled buttons 2021 https://www.smashingmagazine.com/2021/08/frustrating-design-patterns-disabled-buttons/
25. Smashing ✓ standardizing select 2020 https://www.smashingmagazine.com/2020/11/standardizing-select-native-html-form-controls/
26. Adam Silver ✓ where to put buttons https://adamsilver.io/blog/where-to-put-buttons-on-forms/
27. Adam Silver ✓ sticky menus https://adamsilver.io/blog/the-problem-with-sticky-menus-and-what-to-do-instead/
28. Adam Silver ✓ Material text fields critique https://adamsilver.io/blog/material-design-text-fields-are-badly-designed/ · ◦ "Inline validation is problematic" (Medium, 403)
29. Vitaly Friedman ✓ inline validation UX https://smart-interface-design-patterns.com/articles/inline-validation-ux/
30. UX Movement ✓ action-bar buttons https://uxmovement.com/mobile/why-users-miss-form-buttons-placed-in-the-action-bar/
31. UX Movement ✓ mobile CTA placement https://uxmovement.com/mobile/optimal-placement-for-mobile-call-to-action-buttons/
32. UX Movement ✓ instant inline validation https://uxmovement.com/forms/why-users-make-more-errors-with-instant-inline-validation/
33. UX Movement ◦ single vs multi-page forms · best mobile date UI (paywalled)
34. HN ✓ "The select element can now be customized with CSS" https://hn.algolia.com/api/v1/items/43532830
35. HN ✓ "Better Form Design: One Thing per Page" https://hn.algolia.com/api/v1/items/14393017
36. Growth.design ✓ Grammarly onboarding survey https://growth.design/case-studies/grammarly-onboarding-survey · Beehiiv subscription (weak fit)
37. Steven Hoober ◦ thumb research (family A / F). Reddit: nothing surfaced.
