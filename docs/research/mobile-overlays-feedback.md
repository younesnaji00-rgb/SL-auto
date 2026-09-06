# Mobile pass — D. Overlays & feedback (research + spec, 2026-09-06)

Scope: brief `mobile-brief.md` §4-D. Per element: what published systems say, what
practitioners argue, then a SPEC for THIS app's phone version. ✓ = fetched and read,
◦ = known but not fetched. Measured state comes from `src/components/ui/{dialog,sheet,
alert-dialog,dropdown-menu,popover,tooltip,toast,toaster,command}.tsx`,
`chiffrage/queue-peek-sheet.tsx`, `assignations-atg/mission-quick-actions.tsx`,
`layout/{notifications,user-menu}.tsx`, `motion-spec.md` §4–6, `element-specs.md` §13–15.

## 0. Elements covered

| # | Element | Today (phone, < `lg` = 1024) |
|---|---|---|
| 1 | Bottom sheet (Dialog below `lg`, `Sheet side="bottom"`) | Dialog → bottom sheet, `max-h 92dvh`, no handle, X top-right, `p-6`, header text-centred, footer `flex-col-reverse`; ATG filters sheet = `h-70vh` |
| 2 | Full-screen dialog (Sheet left/right below `lg`) | full-screen slide-in, X top-right only, title inside content, no header bar, no Save slot |
| 3 | Row actions / menus (`MissionRowActions`, 12 `DropdownMenu`, `ReassignPopover`) | `opacity-0 group-hover:opacity-100` → literally invisible on touch; menus are 32 px rows (`py-1.5 text-sm`) |
| 4 | Tooltip (15 files) + 231 `title=` attributes | Radix hover/focus only; nothing fires on touch |
| 5 | Toast (`Toaster`, `TOAST_LIMIT = 1`, 5 s) | viewport `fixed top-0` below `sm`, bottom-right ≥ `sm`; swipe-right dismiss; X always visible |
| 6 | Confirmation (`AlertDialog`, 12 files) | always centred `max-w-lg`; all titles name the object (« Supprimer ce fichier ? », « Supprimer le tampon « X » ? ») — good |
| 7 | Nested overlays | planification dialog (829 lines) holds 4 `SelectContent` + calendar popovers inside a 92 dvh sheet |
| 8 | Loading / optimistic | `PageSkeleton` on pages; peek sheet renders from held data; reassign has toast-undo |
| 9 | ⌘K palette (`mission-command-palette`, `global-search`) | Dialog `top-[12%]` → on phone becomes a bottom sheet whose input sits over the keyboard; only trigger is the shortcut |
| 10 | Notification bell | `DropdownMenu` `w-[22rem]` (352 px) on a 390 px screen, 44 px rows |
| — | Scrim | `--scrim` ink/0.35 + `backdrop-blur-[6px]` on every overlay, full viewport |

## 1. Bottom sheet

**Systems.** Material 3 ✓ (https://m3.material.io/components/bottom-sheets/guidelines):
modal sheets "appear in front of app content, disabling all other app functionality… remaining
on screen until confirmed, dismissed, or a required action has been taken"; "the initial vertical
position of modal bottom sheets… is capped at 50% of the screen height", taller content is
"pulled across the full screen and scrolled internally"; dismiss by "tapping a menu item or
action… tapping the scrim… swiping the sheet down"; "display a close affordance in a full-screen
modal bottom sheet"; "selecting the drag handle should toggle through preset heights or close
the sheet, while selecting the scrim should always close". Android impl ✓
(https://github.com/material-components/material-components-android/blob/master/docs/components/BottomSheet.md):
drag handle "default min width and height of 48dp to conform to the minimum touch target",
"supports tapping to cycle through expanded and collapsed states", max width 640 dp on tablets,
half-expanded ratio 0.5. Apple HIG Sheets ✓
(https://developer.apple.com/design/human-interface-guidelines/sheets): "large is the height of
a fully expanded sheet and medium is about half"; "Include a grabber in a resizable sheet";
"Support swiping to dismiss a sheet. People expect to swipe vertically"; "If people have unsaved
changes… when they begin swiping to dismiss it, use an action sheet to let them confirm";
"Display only one sheet at a time"; "the Cancel button belongs on the leading edge of the top
toolbar… the Done button belongs on the trailing edge". Sarunw ✓ (UISheetPresentationController):
"scroll up will increase the detent instead of scrolling the sheet's content" by default. eBay
Playbook ✓ (https://playbook.ebay.com/design-system/components/bottom-sheet): "defaults up to
50% of the screen height", minimum "30%", close button "32px", "Content should open directly to
a full modal overlay for long-form content", "For web, use a Dialog instead".

**Practitioners.** NN/g bottom sheet ✓ (https://www.nngroup.com/articles/bottom-sheet/): the
grab handle "is easy to ignore. Moreover, some users are not aware of this functionality"; a
vertical swipe "may close the bottom sheet, may open up the notification drawer, or may display
the phone's control panel"; provide "a visible Close (or X) button"; "Don't use a bottom sheet
when users will likely spend significant time reviewing the information". NN/g accidental
overlay dismissal ✓ (https://www.nngroup.com/articles/accidental-overlay-dismissal/): "Stay away
from overlays on top of overlays", "Consider including one of these [close] buttons instead of
assuming that users will use gestures", "Support… the phone's Back button or gesture to act as
undo". Emil Kowalski, Building a drawer ✓ (https://emilkowal.ski/ui/building-a-drawer-component):
"I prefer using a drawer instead of a modal on mobile for a more native feel"; damped over-drag;
flick-to-close by velocity; drag only "unless scrolled to the top" plus a 100 ms lock after
reaching it; iOS-like curve, "Duration of 500ms is also supposed to mimic iOS's Sheet". **vaul
README ✓ (https://github.com/emilkowalski/vaul): "This repo is unmaintained."** — do not adopt.
Smashing thumb zone ✓ (https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/):
Etsy's "'x' is at the edge of the thumb zone, forcing the user to stretch", fix = "adding a close
button at the bottom of the card". Hoober ✓ (UXmatters 2013): 49 % one-handed, 36 % cradled,
"The way in which users hold their phone is not a static state". designfornative ✓: full-screen
"when the content is too large to fit in a regular bottom sheet". digia ✓: "If your flow requires
two modals back-to-back, you've got a design problem".

**SPEC — `BottomSheet` (the phone form of `Dialog` and of `Sheet side="bottom"`).** Anatomy top
to bottom: (1) handle zone 24 px tall, pill 32 × 4 px `bg-surface-4` centred, whole zone is a
48 × 48 tap target that toggles default ↔ tall (M3 "toggle through preset heights", Android
48 dp) — no drag-to-resize (no maintained lib; Radix has none; a home-made gesture is a family-F
perf risk); (2) header row 48 px: `t-title` 17 px left, 44 × 44 ghost « × » right (NN/g: never
handle-only); (3) body `overflow-y-auto overscroll-contain px-4`; (4) footer sticky, `pt-3
pb-[max(16px,env(safe-area-inset-bottom))]`, primary `default` 48 px full-width, optional ghost
« Annuler » ABOVE it (stack, primary at the bottom = thumb zone; Apple alerts "at the top in a
stack" applies to alerts, see §6). Heights: `default` = content height capped at
`60dvh/var(--app-zoom)`; `tall` = `92dvh` (the current cap) for lists/pickers; nothing between —
two detents like Apple medium/large, M3 50 %. Swipe-to-dismiss: implement ONLY on the handle
zone + header (touchstart/touchmove/touchend, translateY follows the finger, close if Δy > 96 px
or velocity > 0.11 px/ms (Sonner's threshold ✓), else spring back 200 ms `ease-standard`); the
body never drags (NN/g swipe ambiguity + Emil's scroll-top rule). Dismiss also by scrim tap and
by Android back (Capacitor `backButton` → close the top overlay before navigating — NN/g). Corner
radius 16 px top, `glass-strong`. Scrim below `lg`: colour only, **no `backdrop-blur`** (motion-spec
§4: blur cost = area × radius; a phone scrim is 100 % of the viewport) — the 0.35 ink scrim
separates on its own; owner question Q1. Enter 300 ms slide `ease-enter`, exit 200 ms
`ease-standard` (unchanged). Header text stays left-aligned (drop `text-center`). Must not:
scroll the page behind (Radix `react-remove-scroll` stays on; add `overscroll-contain` on the body
region — MDN ✓ "prevent background scrolling while a dialog or overlay is open"); stack a sheet on
a sheet; hold a task longer than ~1 minute (NN/g) — that is §2's job.

## 2. Full-screen dialog (multi-field forms)

**Systems.** M3 dialogs ✓ (https://m3.material.io/components/dialogs/guidelines): "Full-screen
dialogs are for compact breakpoints only, like mobile devices"; header = close « × », headline,
"Action button… (e.g., 'Create,' 'Send')"; "The close 'X' icon button should be the only navigation
option in the app bar"; on close with unsaved changes "a basic dialog should appear to confirm that
they want to discard"; "Full-screen dialogs are the only dialogs over which other dialogs can
appear". Android Dialog.md ✓: full-screen "containing actions that require a series of tasks to
complete. One example is creating a calendar entry with the event title, date, location, and
time" — i.e. exactly our planification. Apple Modality ✓
(https://developer.apple.com/design/human-interface-guidelines/modality): "Consider using a
full-screen modal style for in-depth content or a complex task"; "Always give people an obvious
way to dismiss"; "help people avoid data loss by getting confirmation before closing"; "Let people
dismiss a modal view before presenting another one". Apple Sheets ✓: Cancel leading, Done
trailing, "Avoid showing all three buttons — Cancel, Done, and Back — together".

**Practitioners.** Radix #2323 ✓ (https://github.com/radix-ui/primitives/issues/2323): iOS
keyboard hides an auto-focused dialog — fixed-bottom UI is unreliable under the keyboard. Radix
#3078 ✓: Safari address-bar animation makes a fixed dialog "jump" when the page beneath can
scroll → lock the page (Airbnb does). web.dev dialog ✓ (https://web.dev/articles/building/a-dialog-component):
mega dialog = `<header><article><footer>`, "On small viewports… bottom margin to 0", article
`overflow-y:auto; overscroll-behavior:contain`, focus the cancel not the confirm. Roselli ✓
(https://adrianroselli.com/2025/06/where-to-put-focus-when-opening-a-modal-dialog.html): longer
forms — "maybe don't put focus on a field", put it on the heading; TalkBack/VoiceOver iOS don't
announce the dialog role anyway. NN/g modal ✓: modals may "fragment a complex workflow into
simpler steps, though multi-step modals risk users forgetting their original task".

**SPEC — `FullScreenDialog` (phone form of `Sheet side="left|right"` AND of any `Dialog` whose
body has > 3 fields or any Select/Calendar: planification 829 l., chiffrage 271 l., réclamation
230 l., e-mail, devis options).** Header 56 px sticky at top (matches the shell bar height): « × »
44 × 44 at the LEFT edge (M3; Apple's Cancel = leading edge — both agree dismiss-left), `t-title`
17 px truncated, primary as a TEXT button at the right (« Enregistrer », « Envoyer ») 44 px tall.
The primary lives in the header, not a bottom bar, because on iOS the keyboard covers or
displaces fixed-bottom bars (Radix #2323/#3078, the Safari `visualViewport` reset bug reported in
the field) and every one of these forms opens the keyboard; the top-right is the stretch zone but
these are once-per-form taps. Body = `overflow-y-auto overscroll-contain px-4 pb-24`, single
column (family C owns the fields). Dirty state → « × » opens an `AlertDialog` « Abandonner les
modifications ? » [Continuer la saisie ghost] [Abandonner destructive] (M3 + Apple). Focus on open
→ the heading, never the first field (Roselli). Android back = same as « × ». Enter 300 ms slide
from the right (a page-like push, it reads as navigation), exit 200 ms. Must not: show a bottom
sheet with an inner scroll region for a form (today's 92 dvh Dialog + popovers inside = the
double-scroll trap); open a second full-screen dialog from inside; put « Enregistrer » only at
the bottom of a long form.

## 3. Row actions and menus on touch

**Systems.** Apple Context menus ✓: "Always make context menu items available in the main
interface, too"; "Aim for a small number of menu items"; destructive "at the end of the menu";
"Hide unavailable menu items, don't dim them". Apple Action sheets ✓: "Use an action sheet — not
a menu — to provide choices related to an action"; "Avoid displaying more than four buttons…
including the Cancel button" (watchOS figure; iOS says avoid scrolling); "Place the Cancel button
at the bottom"; destructive "at the top… where they tend to be most noticeable". M3 ✓: modal
sheets are the "mobile-only alternative to menus or dialogs"; Android ✓ "an alternative to inline
menus and simple dialogs on mobile devices". **Practitioners.** NN/g contextual menus ✓
(https://www.nngroup.com/articles/contextual-menus/): long-press/3D-touch "are not discoverable
and have still not become standard"; "actions available through the gesture should also be
present in the visible UI"; "fewer than 10–12 items". Mission-quick-actions header comment: the
hover cluster is "never the ONLY path — the peek panel repeats them" — true on desktop, but on a
phone the cluster is `opacity-0` with no hover, so the peek IS the only path, one tap deeper.

**SPEC — `ActionSheet` + visible « ⋯ ».** Below `lg` every row/card that has a hover cluster or a
row `DropdownMenu` shows a permanent 44 × 44 ghost « ⋯ » (`MoreHorizontal`, ink-3) at the trailing
edge; the row's tap zone excludes it. « ⋯ » opens a `BottomSheet default` whose body is a list:
rows 52 px, `px-4`, icon 20 px ink-2 + 15 px label, hairline dividers, tel:/wa.me/maps rows are
`<a>`; destructive row LAST, separated, `text-status-danger-fg` (Apple context-menu order; Apple's
action-sheet "top" ruling is for the single-destructive confirm case, see §6); ≤ 6 rows, no
scrolling (Apple); no « Annuler » row — the handle/scrim/back close it (Apple's Cancel row exists
because iOS has no scrim tap; we have one). Long-press: NOT implemented in this pass — it would
fight the browser's native context menu/selection on a `<tr>` and NN/g/Apple require the visible
path anyway; may be added later as an accelerator only. `DropdownMenu` (user menu, record-bar
overflow, table column menus) → below `lg` render through the same `ActionSheet`; item 52 px;
`DropdownMenuSub` flattened (no cascading on touch). `ReassignPopover` (agent list) → `BottomSheet
tall` with a search field at the top and 52 px rows, current agent marked, undo toast unchanged.
Selection/bulk actions: a bottom action bar, family B. Must not: keep `group-hover` as a carrier
on touch (`@media (hover:hover)` gate the cluster, show « ⋯ » under `(hover:none)`); 32 px menu
rows on touch; dim unavailable rows — hide them.

## 4. Tooltips on touch

**Systems.** M3 tooltips ✓: "Plain tooltips… best used for labelling UI elements with no text,
like icon-only buttons", on mobile "tap and hold", "Don't hide critical information within
tooltips as it's easy to miss". NN/g ✓ (https://www.nngroup.com/articles/tooltip-guidelines/):
"they can be used only on devices with a mouse or keyboard. They are not normally available on
touchscreens"; "Users shouldn't need to find a tooltip in order to complete their task"; use
"popup tips" (tap-triggered, ? / i icons) on touch. **Practitioners.** Heydon Pickering,
Inclusive Components ✓ (https://inclusive-components.design/tooltips-toggletips/): "Most of the
time, tooltips shouldn't be needed if you provide clear textual labeling and familiar
iconography"; the `title` attribute "hides content from mobile, tablet, keyboard, and assistive
technology users"; toggletips = click-only "i" buttons with a live region; "Never embed close
buttons, confirmations, or links within tooltips".

**SPEC.** Policy: a tooltip is never the only carrier of meaning. Below `lg` / `(hover:none)`,
`TooltipProvider` disables Radix tooltips entirely (no long-press: it collides with iOS text
selection and the browser context menu). Every icon-only control keeps its `aria-label`; the
visible label lives (a) in the `ActionSheet` row for row actions, (b) as an 11 px `t-label`
caption under the icon for toolbar clusters (devis editor, record-bar), or (c) is unnecessary
because the control is a standard icon (×, ⋯, ←, search). Explanatory "?" content (KPI
definitions, field hints) becomes a `Toggletip`: a 24 px « i » ghost button → `Popover` 280 px
max, 13 px text, dismiss on outside tap, `role="status"` live region (Heydon). The 231 `title=`
attributes are harmless but not a substitute: audit them so each has an `aria-label` or visible
text. Must not: `title`-only icons; a tooltip that holds an action or a link; hover-warm-up logic
on touch.

## 5. Toast / snackbar on a phone

**Systems.** M3 snackbar ✓ (https://m3.material.io/components/snackbar/guidelines): "Snackbars
should be placed at the bottom of a UI, in front of the main content"; "Snackbars should appear
above FABs"; "Avoid placing snackbars in front of navigation components"; "without actions can
auto-dismiss after 4–10 seconds"; "with actions should remain on the screen until the user takes
an action… or dismisses it"; "Only one snackbar may be displayed at a time"; "A snackbar can
contain a single action"; "display an 'Undo' action"; "up to two lines of text" on compact.
Android Snackbar.md ✓: `setAnchorView` "to place a Snackbar above navigational elements"; "Showing
a new snackbar will dismiss any previous ones first"; "can also be swiped off"; 8 dp margin.
Apple Feedback ✓: "display status information in a passive way so that people can view it when
they need it"; alerts "lose their impact if you use them too often". **Practitioners.** Sonner
docs ✓ (https://sonner.emilkowal.ski/toaster): defaults `bottom-right`, `duration 4000`,
`visibleToasts 3`, `offset 32px`, `mobileOffset 16px`, swipe "based on position". Emil, Building a
toast ✓: "transform 400ms ease", pause on hover and when `document.hidden`, dismiss if "swipe
amount is greater than the threshold or velocity is higher than 0.11". NN/g indicators ✓: a toast
"would be a bad way to implement an error message" — a mobile user "spent 5 minutes waiting…
because she hadn't notice the little error message… that quickly faded away after 5 seconds".
Mia Salazar, dev.to ✓ (https://dev.to/miasalazar/replacing-toasts-with-accessible-user-feedback-patterns-1p8l):
"users often cannot tab into it before it vanishes" — undo needs a longer life; prefer inline
status where the action happened. Raskin ✓: Gmail "immediately gives you an option to undo".

**SPEC.** Below `sm` the viewport moves from `top-0` to the bottom: `left-4 right-4`,
`bottom: calc(60px + env(safe-area-inset-bottom) + 12px)` — above the 60 px bottom bar, never
over it (M3); when a `BottomSheet`/`FullScreenDialog` is open the toast renders above the
overlay's footer (z above the sheet, same offset rule against the footer height). One at a time
(keep `TOAST_LIMIT = 1`; a new toast replaces the old). Durations: passive 5 s (unchanged); WITH
an action (« Annuler ») 8 s and pause while touched; destructive/error variants never as toasts
(inline `Alert`, §14). Swipe direction on phone = `down` (Radix `swipeDirection`), not right.
Content: icon + one line, two max; action = one text button 44 px tall at the right. Tutorial
« ? » FAB (`bottom-20 right-4` = 80 px) collides with a toast at ~72 px: the FAB gets `translate-y`
−(toast height + 8) while a toast is mounted, or moves to the top bar on phones (family A) — Q3.
Enter/exit unchanged (300 `ease-soft` / 200 `ease-exit`). Must not: top-of-screen toasts on a
phone (thumb can't reach the action; under the notch); stacked toasts; errors in toasts; a toast
that outlives its undo window without saying so.

## 6. Confirmation vs undo

**Systems.** Apple Alerts ✓: "Use alerts sparingly"; "Avoid displaying alerts for common,
undoable actions, even when they're destructive"; "place the button people are most likely to
choose on the trailing side in a row of buttons or at the top in a stack"; "Cancel buttons are
typically on the leading side of a row or at the bottom of a stack"; "Avoid using OK as the
default button title"; "If there's a destructive action, include a Cancel button". M3 dialogs ✓:
"The confirmation button is always closest to the edge"; max two actions. **Practitioners.** NN/g
confirmation ✓ (https://www.nngroup.com/articles/confirmation-dialog/): "Do not use confirmation
dialogs for routine actions. Like in Aesop's fable, if you cry wolf too many times, people will
stop paying attention"; "use buttons labeled Delete file and Keep file"; "do go to great lengths
to provide undo". Raskin, A List Apart ✓ (https://alistapart.com/article/neveruseawarning/):
"Never use a warning when you mean undo"; "The more in-your-face the warning is, the faster we'll
want to get away from it". HN thread ✓ (https://news.ycombinator.com/item?id=35985969):
"Confirm goes on the right, cancel goes on the left"; against shuffling button positions to defeat
autopilot — "auto pilot clicks have no effect, not change meaning". Smashing obscure techniques ✓
(https://www.smashingmagazine.com/2021/03/solutions-mobile-design-boost-user-experience/): binary
confirmation options "one on the left side and the other on the right" are a reach problem as
screens grow. NN/g accidental dismissal ✓: lost work when the whole stack closes.

**SPEC.** Undo (toast, §5) for everything reversible: reassign (done), marquer lu, status changes,
archive/restore, planification cancel, checkbox facets — the write happens immediately, the toast
carries « Annuler » for 8 s. `AlertDialog` only for irreversible destruction (delete
dossier/document/fichier/mission/réclamation/tampon/user) and discard-unsaved (§2). Phone form:
stays centred (Apple/M3 — an alert is the one overlay that should NOT feel like a sheet), width
`calc(100% − 32px)`, `max-w-[360px]`, `p-5`, title 17 px, body 15 px; buttons STACKED, full width,
48 px each: primary (`destructive`) on TOP, « Annuler » ghost below (Apple: likely choice top of
a stack, Cancel bottom); labels name the outcome (« Supprimer le fichier » / « Conserver »), never
« OK » / « Oui ». Scrim tap and swipe do NOT dismiss a destructive alert (NN/g accidental
dismissal); « Annuler » and Android back do. Initial focus on « Annuler » (web.dev, Roselli
"least destructive"). Must not: "Êtes-vous sûr ?" (already 0 in the repo — keep it so); a third
button; a confirm for an action that has undo.

## 7. Nested overlays (sheet → select → calendar)

Apple Sheets ✓: "If something people do within a sheet results in another sheet appearing, close
the first sheet before displaying the new one"; Modality ✓: "you never want to display more than
one alert at the same time" and an alert may sit above a modal. M3 ✓: only full-screen dialogs
may host another dialog; menus/pickers are non-modal layers. NN/g ✓ ×2: "users will have to keep
track of where they currently are in the rapidly multiplying stack of overlays". web.dev/MDN ✓:
`overscroll-behavior: contain` on every scroll region so an inner list at its end does not scroll
the sheet or the page. react-remove-scroll README ✓: `allowPinchZoom` off by default, `inert`
mode "React portals not friendly" — leave Radix defaults.

**SPEC — depth budget.** Level 0 page → level 1 ONE of {BottomSheet, FullScreenDialog, ActionSheet,
AlertDialog} → level 2 only a non-modal picker (Radix `Select`/`Popover` calendar/`Toggletip`,
portalled, closes on outside tap) or ONE `AlertDialog` (discard/delete) — and only above a
`FullScreenDialog`, never above a `BottomSheet`. Never level 3. Inside a `BottomSheet default`
(≤ 60 dvh) a popover calendar (~300 px) does not fit: any field that needs a picker promotes the
whole task to `FullScreenDialog` (§2) — this is the concrete rule that moves planification,
chiffrage, réclamation, e-mail. Family C decides native `<select>`/`<input type="date">` on
coarse pointers; if it rules native, level 2 disappears on phones entirely (preferred). An action
chosen in an `ActionSheet` that needs a form closes the sheet, then opens the `FullScreenDialog`
(Apple: close first, then present). Android back / scrim tap close only the top level; the level-1
overlay keeps its state. Must not: `Sheet` opened from inside a `Sheet` (today: peek sheet →
observations dialog is a level-1→level-2 modal pair — replace with an in-sheet expand);
`Select` dropdown taller than the remaining sheet height.

## 8. Loading, skeletons, optimistic feedback

NN/g skeleton ✓ (https://www.nngroup.com/articles/skeleton-screens/): "< 1 second… skeleton
screens or spinners aren't necessary"; spinners/skeletons "2–10 seconds"; progress bars "> 10
seconds"; "Avoid frame-only displays". Viget ✓ (https://www.viget.com/articles/a-bone-to-pick-with-skeleton-screens):
n = 136, perceived wait skeleton 2.82 s vs spinner 2.41 s vs blank 2.29 s; skeletons "may work
better in familiar interfaces… most effective during very short waits". Bill Chung ◦ (paywalled):
slow left→right shimmer beats pulse. Simon Hearne ✓ (https://simonhearne.com/2021/optimistic-ui-patterns/):
"Aim for under 100ms to deliver a UI response"; Twitter fav "added to a queue to be retried later.
Only if the API call fails multiple times is the action 'undone'". Emil toast ✓: promise toasts
(loading → success/error). motion-spec §5: button label swaps to spinner in place.

**SPEC.** Overlays open with data already in hand whenever possible (queue-peek does; the
notifications sheet holds `useRappels`). When a sheet must fetch: the sheet opens immediately with
its header and a body skeleton in the shape of the final content (list = 3 rows 52 px, form = 4
field bars 44 px) `bg-surface-3` `animate-pulse`, shown only after a 300 ms delay (Viget/NN/g:
sub-second loads get nothing). Optimistic writes for toggles, marquer lu, reassign, status chips:
UI first, Firestore after, rollback + destructive inline `Alert` on failure (not a toast — NN/g).
Submit buttons: in-place spinner, disabled, min-width preserved; F3 actions keep the
spinner→check morph. Never a full-screen spinner over a sheet. Skeletons respect reduced motion.

## 9. ⌘K palette on touch

M3/Apple have no palette; Apple Modality ✓ "keep modal tasks simple, short". NN/g ✓ (tooltip
article) — keyboard-taught affordances are invisible on touch. Practitioner consensus in search
(uxpatterns.dev ✓ https://uxpatterns.dev/patterns/advanced/command-palette: "Ensure touch targets
remain comfortable on mobile"; Mobbin ◦, blog posts ◦): a visible trigger, no shortcut hint, and
the input must stay visible above the keyboard.

**SPEC.** Keep the palette's DATA (actions + today's missions + records) but not its chrome. Below
`lg`: no ⌘K hint chip anywhere; the palette is reached through the top-bar search icon (family A
owns the icon; this family owns what opens). It opens as a `FullScreenDialog` with the search
`<input>` pinned in the 56 px header (16 px font — no iOS zoom), « × » left, results list filling
the body, `dvh`-sized so the keyboard shrinks the list not the input; input at the TOP, not the
bottom (a bottom-pinned input hits the iOS `visualViewport` reset bug — Radix #2323 class).
Groups become section headers; rows 52 px with a trailing chevron; "actions" rows are the same
`ActionSheet` rows. Recent searches shown before typing. Must not: a bottom-sheet palette whose
input sits under the keyboard (today's outcome); keyboard hints `⌘K`, `↵`, `↑↓` in the footer.

## 10. Notification bell on a phone

Apple Feedback ✓: status "near the items it describes… without having to take action or leave
their current context"; NN/g ✓ (indicators): passive notifications = badge "or a small nonmodal
popover in a corner". M3 ✓: on compact, a menu with rich rows is a modal bottom sheet. The current
352 px dropdown on a 390 px screen is a desktop menu mis-sized to a phone.

**SPEC.** Below `lg` the bell opens a `BottomSheet tall` (92 dvh): header « Rappels · 3 non lus »
+ « Tout marquer comme lu » as a 44 px text button; body list rows 56 px (unread dot 8 px +
semibold label + caption + relative time, unchanged semantics); tap = close sheet, then
`router.push` (Apple: close first); footer « Voir tous les rappels » 48 px full-width ghost.
Badge stays on the bell. Optimistic mark-read with undo toast. Empty state reuses `EmptyState`.
Must not: a dropdown wider than 320 px on a phone; navigating to /mes-rappels on bell tap
without the sheet (loses the "peek then decide" step the gestionnaire uses on the phone).

## 11. Contradictions and how I resolved them

- **Destructive button position.** Apple action sheets: destructive at the TOP; Apple context
  menus and M3: destructive LAST. Resolved by intent: an `ActionSheet` is a menu of options
  (destructive last, separated); an `AlertDialog` is a decision about one destructive act
  (primary on top of the stack, Cancel below — Apple alerts).
- **Primary action bottom (thumb) vs top (header).** Thumb-zone research (Hoober, Smashing) says
  bottom; M3/Apple put Save/Done in the header of full-screen tasks. Resolved by keyboard
  reality: fixed-bottom bars are unreliable under the iOS keyboard (Radix #2323/#3078), so forms
  → header action; short sheets without heavy typing → footer primary.
- **Swipe to dismiss.** Apple: "People expect to swipe vertically"; NN/g: swipe ambiguity, handle
  ignored. Resolved: swipe supported on the handle/header only, always paired with « × », scrim
  tap and back; never on destructive alerts.
- **Drag handle.** M3 optional, Apple "include a grabber in a resizable sheet", NN/g "easy to
  ignore". Resolved: handle present (it also signals "this is a sheet, not a page" — NN/g
  accidental-dismissal argues partial overlays reduce Back misuse), tap toggles height, never the
  only dismiss path.
- **Toast with action: persist (M3) vs 4 s (Sonner).** Resolved at 8 s + pause on touch — a
  persistent undo toast would sit over the bottom bar indefinitely.
- **Skeletons.** NN/g/Carbon pro, Viget's numbers con. Resolved: skeletons only after 300 ms and
  only mirroring a layout the user already knows (repeat screens); never for sub-second loads.
- **Scrim blur.** Element-specs §13 says scrim + blur; motion-spec §4 says blur cost scales with
  area. Resolved for phones: colour-only scrim below `lg`, pending Q1.
- **vaul.** Emil's essay is the best gesture reference; the library itself is unmaintained
  (README ✓). Resolved: borrow the numbers, write ~60 lines of handle-only touch code, no dependency.

## 12. Do-not list

1. No hover-revealed action clusters as the only carrier on touch; gate them `(hover:hover)`.
2. No tooltip, `title=` or long-press as the only label; no tooltip with links/actions.
3. No sheet on a sheet, no full-screen on a full-screen; one alert maximum above a full-screen.
4. No multi-field form inside a 92 dvh bottom sheet with popover pickers.
5. No toasts at the top of a phone screen, over the bottom bar, stacked, or for errors.
6. No « Êtes-vous sûr ? », no OK/Oui/Non, no third button, no confirm where undo exists.
7. No scrim-tap or swipe dismissal of a destructive alert or of a dirty full-screen form.
8. No page scroll behind an overlay; every scroll region `overscroll-contain`.
9. No 32 px menu rows or 32 px icon buttons on touch; ≥ 44 px targets, 52 px sheet rows.
10. No animated blur; on phones no blur at all on scrims (pending Q1).
11. No ⌘K/keyboard hints below `lg`; no bottom-pinned input in a keyboard-opening overlay.
12. No adopting `vaul`; no Framer Motion for sheet gestures (motion-spec §4.7).

## 13. Open questions for the owner

- **Q1 Scrim blur on phones.** Drop `backdrop-blur` below `lg` on dialog/sheet/alert scrims
  (proposed) or keep 6 px and let family F measure? The frosted look is part of the glass identity.
- **Q2 Sheet heights.** Two detents (60 / 92 dvh) with tap-to-toggle and no drag-resize — acceptable,
  or is drag-to-resize wanted enough to fund a custom gesture?
- **Q3 Tutorial « ? » FAB vs toasts.** FAB yields to toasts (translate up), or FAB moves to the top
  bar on phones (family A)?
- **Q4 Long-press.** Skip entirely (proposed) or add later as an accelerator that mirrors « ⋯ »?
- **Q5 Notification bell.** Sheet (proposed) or straight navigation to /mes-rappels on phones?
- **Q6 Undo scope.** Which writes may go optimistic with 8 s undo beyond reassign — statut
  changes, marquer lu, planification cancel? Anything the audit trail (`logHistorique`) must never
  see reverted?
- **Q7 Toast library.** Keep Radix Toast repositioned (proposed, zero dependency change) or adopt
  Sonner now (motion-spec option E) since the phone viewport is being rewritten anyway?

## 14. Sources

✓ M3 bottom sheets · ✓ M3 dialogs · ✓ M3 snackbar · ✓ M3 tooltips · ◦ M3 menus (page shell only)
· ✓ material-components-android BottomSheet.md · ✓ Dialog.md · ✓ Snackbar.md · ✓ Apple HIG Sheets
· ✓ Action sheets · ✓ Alerts · ✓ Context menus · ✓ Modality · ✓ Feedback · ✓ Sarunw
UISheetPresentationController · ✓ eBay Playbook bottom sheet · ✓ NN/g bottom sheet · ✓ NN/g
accidental overlay dismissal · ✓ NN/g modal vs nonmodal · ✓ NN/g tooltip guidelines · ✓ NN/g
confirmation dialogs · ✓ NN/g indicators/validations/notifications · ✓ NN/g contextual menus
· ✓ NN/g skeleton screens · ✓ web.dev building a dialog · ✓ MDN overscroll-behavior · ✓
react-remove-scroll README · ✓ Radix #2323 · ✓ Radix #3078 · ✓ vaul README + API · ✓ Emil
Kowalski building-a-drawer · ✓ Emil building-a-toast · ✓ Sonner toaster docs · ✓ Heydon
Pickering tooltips/toggletips · ✓ Adrian Roselli modal focus · ✓ Aza Raskin (ALA) · ✓ Hoober
(UXmatters) · ✓ Smashing thumb zone · ✓ Smashing obscure mobile techniques · ✓ Viget skeleton
study · ◦ Bill Chung (403) · ✓ Mia Salazar (dev.to) · ✓ Simon Hearne · ✓ digia · ✓
designfornative · ✓ LogRocket sheets/dialogs/snackbars · ✓ HN 35985969 · ✓ Growth.design Hopper
permissions · ✓ uxpatterns.dev command palette · ◦ Mobbin bottom sheet (403) · ◦ Reddit (crawler
blocked) · ◦ HN 47547407 (429) · ◦ Polaris toast (redirect).
