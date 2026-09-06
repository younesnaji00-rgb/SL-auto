# Mobile pass — family A: shell & navigation (research + spec, 2026-09-06)

Scope: the chrome every phone page shares — bottom bar, top bar, page header, workspace-tab
strip, breadcrumb/up, primary action placement, thumb zone, safe areas, keyboard, Android back,
PWA/Capacitor specifics, and the phone/tablet breakpoint split. Read against
`src/app/(app)/layout.tsx`, `components/layout/{header,mobile-nav,page-header,workspace-tabs}.tsx`,
`lib/nav-groups.ts`, `hooks/use-mobile.tsx`, `DESIGN.md` §Mobile, `capacitor.config.ts`
(Capacitor 6, remote-URL WebView), `src/app/layout.tsx` (viewport-fit=cover already set).
Sources are numbered at the end; ✓ = fetched and read, ◦ = known but not fetched. Every px value
below is a CSS px at zoom 1 (`--app-zoom` is monitor-only since 2026-09-06).

## 0. Element list covered

A1 bottom bar · A2 top bar (height, anatomy, title) · A3 page header on a phone · A4 back / up
· A5 workspace-tab strip · A6 primary action (FAB vs header vs bottom action bar) · A7 global
search / palette on touch · A8 thumb zone & touch targets for bars · A9 safe areas, keyboard,
viewport height · A10 Android back / swipe-back / PWA-Capacitor · A11 breakpoints (640/768/1024).

## 1. What the measured state gets wrong (why a "re-skin" would not do)

- 1024 px is the only breakpoint: iPad portrait (768–834 px) gets a bottom bar it does not
  need; Android puts 99.96 % of phones under 600 dp and tablets from 600 dp [23].
- 3 + Profil hides 8 of Admin's 12 destinations behind a person icon nobody expects navigation
  in (hidden nav used 57 % of sessions vs combo 86 % [8]; Priority+ "creates a scent" [16]).
- 28 px body title under a 56 px logo bar = 100+ px of chrome before content on 390×844 (NN/g:
  strip unnecessary header height [10]).
- The "?" FAB (bottom-20 right-4) sits in the corner Hoober measures as least accurate (~12 mm
  targets vs 7 mm at the centre [13]).
- The drag / middle-click tab strip renders on phones; no phone browser shows one — Chrome
  phones use a "Switch tabs" count button, tablets get the strip [27].
- No Android `backButton` listener (`grep` returns nothing): hardware back can exit the WebView
  from an open sheet. No `interactive-widget`: with Chrome's default `resizes-visual` the fixed
  bottom bar and sticky submit rows sit under the keyboard [19b][20].

## 2. Per-element findings and specs

### A1 · Bottom bar (3 + Profil vs 5 vs « Plus » vs drawer)

Findings.
- Apple: "it's generally easier to navigate among fewer tabs"; "Avoid overflow tabs" — but iOS
  itself turns the trailing tab into a More tab when there are too many; "Use a tab bar to
  support navigation, not to provide actions"; "Don't disable or hide tab bar buttons"; "Make
  sure the tab bar is visible when people navigate to different sections… If you hide the tab
  bar, people can forget which area of the app they're in. The exception is when a modal view
  covers the tab bar"; default list "of five or fewer" [1]. Apple DTS on the forum: "limit the
  number of tabs in a tab view to six or fewer… If more than five tabs are necessary, consider
  using a NavigationSplitView" [15].
- Material 3 (Android components doc): 3–5 destinations, "Maximum 5 menu items per bar",
  container 80 dp (64 dp in M3 Expressive), active indicator 56×32 dp, 24 dp icons, labels
  "visible on all navigation items", "Avoid exceeding 5 destinations, positioning navigation bars
  elsewhere than the bottom on compact devices, or hiding labels" [5]. The M3 navigation drawer
  "is being deprecated… use an expanded navigation rail instead" [7] — the drawer is no longer
  the blessed overflow for many destinations on Android either.
- NN/g: "If your site has 4 or fewer top-level navigation links, display them as visible links.
  If … more than 4 … the only reasonable solution is to hide some of these"; on mobile, hidden
  nav was used in 57 % of cases, combo (visible + hidden) in 86 % [8]. Tab/nav bars "should be
  the main chrome area of the screen"; more than 5 options do not fit at proper target sizes [9].
- LukeW "Obvious always wins": Polar and Zeebox lost engagement moving to a hidden menu;
  Facebook and Redbooth gained moving to a bottom tab bar; the design job is deciding "what's
  important enough to be visible on mobile" [14].
- Brad Frost, Priority+: "exposes the most important links and tucks the remaining items behind
  some form of 'more' link"; "does a much better job educating the user… creates a scent";
  caveat: it forces a political ranking of sections [16].
- Practitioners: "provide three to four main options in the bar and use a More icon (…) as the
  last option"; the bar layout "is fixed. All the available options are visible"; only top-level
  views, never actions [17]. Facebook's fifth slot is a "More" that reveals the rest — described
  as "a much better compromise" [18]. HN (2023): "whatever is hidden gets less engagement" is the
  recurring counter-argument; nobody defends 12 visible items [26].
- Smashing (bottom nav on mobile web): "putting a label next to the icon increased engagement by
  75 %"; iOS home indicator and browser chrome "can get in the way of bottom navigation" [12].

SPEC A1. Keep a fixed bottom navigation bar on phones (< 768 px), role-derived from
`nav-groups.ts`, with a **combo rule**: if the role sees ≤ 4 ranked destinations, show them all
plus **Profil** (≤ 5 tabs, nothing hidden); if it sees ≥ 5, show the top 4 by `mobileRank` plus a
**« Plus »** fifth tab (grid icon, label « Plus ») that opens a bottom sheet — never a side
drawer — listing every remaining destination grouped as in the sidebar (Opérations /
Assignations / Administration / Aide), then Profil, then Déconnexion; Profil is also the avatar
in the top bar so it is never more than one tap away. Bar: 56 px content height + `max(8px,
env(safe-area-inset-bottom))` padding, `.glass-bar`, hairline top; each tab is a full-width
column (≥ 72 px on a 360 px screen with 5 tabs) with a 48×48 minimum hit area, 24 px icon
(stroke 1.75 / 2.25 active), 11.5–12 px label in one line (French labels ≤ 12 chars: « Dossiers »,
« Rappels », « Chiffrage », « Terrain », « Tableau », « Plus »), active = teal icon + 56×32 px
tinted pill (already matches Material's indicator) + `aria-current="page"`, badge on Rappels only
(critical counts only, per Apple). The bar is **always visible** on top-level and list pages and
never hides on scroll; it is covered only by modal sheets and, on record/mission pages that need
a contextual action bar, replaced by that bar (A6). It never contains an action, never scrolls
horizontally, never drops a tab because its content is empty. Per role: Admin / Responsable
d'équipe → Tableau de bord · Dossiers · Rappels · Chiffrage · Plus (Plus sheet: Suivi d'équipe,
Consultation, Compagnies, Terrain, Utilisateurs, Tampons, Jours fériés, Signaler un bug, Profil);
Gestionnaire → Dossiers · Rappels · Tableau de bord · Consultation · Profil; Chiffreur →
Chiffrage · Tableau de bord · Profil; Directeurs → Consultation · Jours fériés · Profil;
**Agent de Terrain → Missions · Tableau de bord · Profil** (3 wide tabs, ~130 px each on a
390 px phone — the outdoor, one-thumb role gets the fewest and largest targets; Profil holds GPS
status, session and logout, which that role needs to see). `mobileRank` ties (four items at rank
1 today) must be made explicit per role — see owner question Q1. Sources [1][5][8][9][12][14]
[15][16][17][18][26].

### A2 · Top bar — height, anatomy, where the title lives

Findings.
- Apple: a large title "transitions to a standard title as people begin scrolling… and back to
  large when people scroll to the top"; "Use the standard Back and Close buttons… don't use a
  text label that says Back or Close"; "Prioritize only the most important items… Create a More
  menu to include additional items"; "aim for a maximum of three" groups [2]. iOS 26 tab bars
  float and may minimise on scroll, but the toolbar guidance is "Consider temporarily hiding
  toolbars for a distraction-free experience… do so contextually… offer ways to reliably
  restore" [2][28].
- Material: small top app bar 64 dp, medium-flexible 112 dp collapsing to small on scroll,
  large-flexible 152 dp; anatomy = leading (navigation icon), headline, up to 3 actions +
  overflow; scroll flags `pin`, `scroll`, `enterAlways`, `exitUntilCollapsed` [6].
- NN/g sticky headers: keep readable text (~16 pt) and 1 cm targets "then eliminate unnecessary
  additional height"; partially persistent headers (hide on scroll down, return on scroll up)
  "work best on mobile", animate 300–400 ms, trigger after a few px; but they assume every
  upward scroll wants the header, which "isn't always accurate"; always do a cost-benefit
  check — does the header hold frequently used elements? [10].
- Hoober: users "prefer to view and touch the center of the screen"; edges are for secondary
  actions ("tabs, search, compose buttons"), corners for tertiary ones [13].
- Baymard app benchmark: a visible bottom-bar path beats a hidden one (Best Buy's "Shop" tab vs
  Amazon's hamburger where 60 % of testers failed to find categories) — the top bar is not where
  people look for sections [21].

SPEC A2. Phone top bar = **48 px** tall (+ `env(safe-area-inset-top)` padding when the WebView
draws under the status bar), `.glass-bar`, hairline bottom, `position: sticky; top: 0` inside the
inset. Anatomy, left to right: leading slot (40×40 icon button, 48 hit area) = brand monogram on
the role's top-level destinations, **« ‹ Parent »** up-link elsewhere (A4); **the page title**
(t-title 17–18 px / 600, single line, ellipsis, with the count pill) — supplied by the existing
`useRegisterPageTitle` registry, so `PageHeader` stops painting an H1 on phones; trailing slot
= at most **two** 40 px icon buttons: the page's one primary action (A6) and the bell (unread
count badge), then the 32 px avatar (Profil + Déconnexion menu). Anything else goes into a
« ⋯ » action sheet (A6). Behaviour: pinned (not scroll-away) on list, queue and record pages,
because every one of them keeps the primary action and up-link in it; scroll-away is allowed only
on read-only long documents (PDF viewer, photo gallery) as "distraction-free", with 300 ms
motion-spec exits and re-entry on the first upward scroll. Keep total chrome ≤ 48 (top) + 56
(bottom) + safe areas = ~104–140 px on a 844 px viewport (≥ 5:1 content-to-chrome). Never show
the full breadcrumb, the logo and the title together. Sources [2][6][10][13][21][28].

### A3 · Page header (title + primary action + overflow) on a phone

Findings. Material folds headline + actions into the top app bar on compact windows [6]; Apple
puts the title in the navigation bar and page actions in a toolbar/More menu [2]; NN/g's
content-to-chrome ratio argument [10]; Hoober's "primary content in the centre" [13].

SPEC A3. Below 768 px `PageHeader` renders only: (a) `meta` chips and `subtitle` are dropped
(subtitle → the tutorial / empty state), (b) the `tabs` row as a full-width segmented control or
scrollable chip row **sticky under the top bar** (48 px, the assignations-atg pattern), (c) the
`filters` row collapsed to a search field + « Filtres (n) » button (family B owns the sheet).
Title, count and primary action are hoisted into the top bar via `PageChromeProvider`; `actions`
beyond the primary become items of the « ⋯ » sheet. `size="compact"` becomes the only phone
size. From 768 px the desktop header returns (title in body, t-display 24 px at md, 28 px at lg).
Sources [2][6][10][13].

### A4 · Back vs up, breadcrumb

Findings.
- NN/g breadcrumbs: on mobile "a single breadcrumb pointing up a level may be all that is
  necessary" (Best Buy shows the parent only); never wrap or crowd [11]. Smashing breadcrumbs:
  "the parent of the current page should be visible at all times"; wrapped trails "take up too
  much space" [22]. NN/g mobile subnavigation: sequential menus with their own back button get
  confused with the browser back [24].
- NN/g user control: "users tend to transfer their knowledge of the Back button from… the web
  and have the same expectation for it: that is a way to move back a step"; when designers make
  it mean "up in the IA… users can easily get disoriented"; on full-screen overlays "ensure the
  Back button has the same effect as a Close link" [25].
- Baymard: 59 % of sites break back-button expectations; users expect back to return to what
  they "perceived to be their previous page"; fix = `history.pushState()` for every view that
  reads as a page, so back closes overlays [30].
- Android: "Up and Back are identical within your app's task"; "the Up button never exits the
  app"; deep links get a synthetic back stack [32]. Apple: standard chevron, no "Back" text [2].

SPEC A4. Two distinct controls, never one button doing both. **Up** = the leading top-bar link
« ‹ Parent » (chevron + parent short label from `useCrumbs`, ≤ 12 chars, truncated) — a plain
`href` to the parent route (NN/g single-parent crumb), present on every non-top-level page, never
on the five root destinations. **Back** = the platform's own (browser gesture, Android hardware /
predictive gesture, iOS edge swipe) and is chronological: every sheet, dialog, filter sheet,
Plus sheet, workspace-switcher sheet and photo viewer pushes a history entry on open and pops it
on close, so back closes the overlay instead of leaving the page (Baymard), and `App.backButton`
in Capacitor is wired to the same stack (A10). The full breadcrumb trail stays ≥ 768 px only.
`PageHeader.backHref` (the 36 px outline arrow inside the body) is removed on phones — the up
link in the bar replaces it. Sources [2][11][22][24][25][30][32].

### A5 · Workspace-tab strip on a phone

Findings. Chrome for Android phones: "To the right of the address bar, tap Switch tabs" — a
count button opening a switcher; the tab strip is a tablet feature [27]. Apple: "Avoid overflow
tabs" and horizontally scrolling tab rows hurt touch targets [1][9]. NN/g mobile subnavigation:
minimise interaction cost, keep people aware of where they are [24]. The strip's affordances
(drag reorder, middle-click close, double-click pin, Alt hotkeys) are pointer/keyboard-only.

SPEC A5. Hide `WorkspaceTabs` below 768 px. Replace it with a **« N » switcher chip** (folder
icon + count, 40×32, 48 hit) in the top bar's trailing slot, shown only when the store holds ≥ 2
tabs of the current kind and the route is inside that kind's section (same ruling as today).
Tapping it opens a bottom sheet (max 60 % viewport) listing open records: 56 px rows with label,
dirty dot, a 44 px « × » close, the active row highlighted, « Fermer les autres » and « Rouvrir »
at the bottom; the list tab (« Dossiers ») is the first row. The store, preview/pin semantics and
the `useDossierDocWrite` drafts are untouched — only the surface changes. From 768 px the strip
returns with drag disabled on touch pointers (`(pointer: coarse)`), ≥ 1024 px unchanged. Sources
[1][9][24][27].

### A6 · The ONE primary action of a list page (FAB vs header vs bottom action bar)

Findings.
- Material: a FAB "represents the primary action of a screen", one per screen, 56 dp, 16 dp
  from the edges, hides under bottom sheets [4]. Bottom app bar: ≤ 4 actions + FAB, 80 dp,
  `hideOnScroll` off under TalkBack, "should not be combined with a navigation bar" [3].
- Apple: "a tab bar is specifically for navigating"; toolbars "act on content in the view";
  essentials in the bar, the rest in a More menu [2]; iOS 26 favours floating glass buttons [28].
- Hoober: corners ~12 mm vs 7 mm centre; edges for secondary actions [13]. Hurff: destructive
  actions in the hard zone, primary in the natural zone [29]. FAB critics (not fetched): covers
  list content, the right thumb rests on it, unfamiliar on iOS ◦ [33]. Sticky-CTA practice:
  "pick one action", "keep it slim", "if everything floats, nothing stands out" [31].

SPEC A6. Three placements, one rule each. (1) **List / queue pages**: the single primary action
is a **filled 40×40 icon button in the top bar's trailing slot** (`+` with `aria-label`; the
existing `QuickCreate` generalised through the chrome registry), not a FAB — a FAB here would
cover the last row's swipe actions and the "?" launcher already fights for that corner; secondary
actions (export, colonnes, vues, densité) go into a « ⋯ » bottom action sheet from the same slot.
(2) **Record / mission / editor pages** with a contextual primary action (Enregistrer, Arrivé
sur place, Valider le chiffrage): a **bottom action bar** 56 px + safe area, one filled button
(full width or ≥ 50 %) at the right and at most two 48 px icon actions at the left, which
**replaces** the navigation bar on that page (Material: never both; Apple: modal/detail views may
cover the tab bar) — the up-link in the top bar and the platform back are the way out. (3) **No
FAB anywhere on phones**; the tutorial « ? » leaves the corner and becomes a row in the Plus /
Profil sheet and an item of the « ⋯ » sheet (owner Q3). Sources [2][3][4][13][28][29][31][33].

### A7 · Global search / ⌘K palette on touch

Findings. Apple's search tab role puts search "at the trailing end" of the tab bar [1][28];
Hoober lists search among the edge (secondary) controls [13]; the palette is keyboard-taught and
has no touch affordance in the app today.

SPEC A7. No palette on phones. Each list page keeps its own search field (family B) and the top
bar offers a 40 px search icon on list pages that focuses that field (scrolls it under the bar).
Roles whose bar has no list page (Agent de Terrain, Chiffreur) get plate/dossier search inside
their queue page, not in the shell. The « g » chords and ⌘K stay ≥ 768 px with a hardware
keyboard. Sources [1][13][28].

### A8 · Thumb zone, touch targets and spacing for bars

Findings. Hoober 2013: one-handed 49 %, cradled 36 %, two-handed 15 %; grips change "sometimes
every few seconds" [13a]. Hoober 2017: 75 % touch with one thumb; centre targets 7 mm, corners
~12 mm, sizes "contain only 95 % of all observed taps"; people avoid the far left edge and
scroll on the right; Material's 8 dp gap is "minimal" [13][13b]. Apple: 44×44 pt; controls
"in the middle or bottom area of the display" are easier to reach [2a][2b]. Material: 48×48 dp,
8 dp between targets [5]. NN/g: 1 cm × 1 cm (≈ 38–48 px depending on density) [10a]. WCAG
2.5.8: 24×24 CSS px AA minimum; 44×44 AAA [34].

SPEC A8. Every control in a bar has a **48×48 px hit area** (visible 40×40 is fine) and **≥ 8 px**
between adjacent hit areas; tab columns are full-width; the leading up-link keeps a 48 px-high hit
area across its whole label. Corner controls (top-right avatar, any bottom-right button) are the
least accurate — never put a destructive or irreversible action there. Primary content and the
list's first tappable row start below the sticky rows, in the centre band; edges carry only
navigation and secondary actions. Text in bars ≥ 11 px labels, ≥ 15 px titles; bar icons 24 px.
Sources [2a][2b][5][10a][13][13a][13b][34].

### A9 · Safe areas, keyboard avoidance, viewport height

Findings.
- MDN: safe-area insets are "the safe distance… where it is safe to place content";
  `viewport-fit=cover` + the inset variables [19a][19b]. Android 16 removes the edge-to-edge
  opt-out [36]; WebView < 140 returns wrong `env(safe-area-inset-*)`, Capacitor 8.3.2 injects
  `--safe-area-inset-*`; pattern `var(--safe-area-inset-top, env(safe-area-inset-top, 0px))` [37].
- Chrome 108 default `interactive-widget=resizes-visual`: the layout viewport no longer shrinks
  for the keyboard — "look out for elements that use position: fixed"; opt in with
  `resizes-content` [19b][20]. VirtualKeyboard API is Chromium-only, experimental [38].
  Capacitor Keyboard `resize: native` resizes the WebView and "affects the vh unit" [39].
- web.dev: `svh` = toolbars expanded, `lvh` = retracted, `dvh` between; dynamic units "do not
  update at 60fps"; "the on-screen keyboard… is not considered part of the UA UI" [35].

SPEC A9. Shell stays `h-svh` (no address-bar jump); full-screen sheets use `100dvh`; never
`100vh`. Add `interactive-widget=resizes-content` to the viewport meta so the flex shell shrinks
above the keyboard and the inner `<main>` scroller keeps the focused field and any sticky submit
row visible (iOS ignores the key and keeps its own behaviour; acceptable). Top bar padding-top =
`var(--safe-area-inset-top, env(safe-area-inset-top, 0px))`, bottom bar and bottom action bars
padding-bottom = `max(8px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))`;
`<main>` padding-bottom = bar height + inset (already the case, keep in a CSS variable
`--bottom-bar` so sheets and toasts can offset by it). For the Android app: either upgrade to
Capacitor ≥ 8.3.2 or add `@capacitor-community/safe-area`, and set the Keyboard plugin
`resize: 'native'` (so `svh`/`dvh` and fixed bars follow the keyboard) — owner Q4. When the
keyboard is open the bottom navigation bar is hidden (it is under the keyboard anyway with
`native`; explicitly `display:none` on `keyboardWillShow` so it never floats mid-screen). Sources
[19a][19b][20][35][36][37][38][39].

### A10 · Android back, swipe-back, PWA + Capacitor

Findings. Capacitor `App.addListener('backButton')`: listening "will disable the default back
button behaviour, so you might want to call `window.history.back()` manually"; `canGoBack` is
false "when the history stack is on the first entry" [40]. Android predictive back: don't
intercept back "to run business logic"; enable a callback only while a confirmation is needed
(unsaved form) [41]. Android principles: Up never exits; back from the start destination exits
[32]. NN/g overlays: users dismiss with the Back button and "the mistake often results in lost
work"; "Support the Back button as an overlay-dismissal method", never stack overlays [42].

SPEC A10. One `useShellBack()` in the app layout: (1) if an overlay is open (sheet, dialog, Plus,
switcher, photo viewer) → close the top-most one; (2) else if the form is dirty → the existing
confirm; (3) else if `history.length > 1` / `canGoBack` → `history.back()`; (4) else on a root
destination → `App.minimizeApp()` (never a silent exit). Every overlay pushes `history.state
{overlay: id}` on open and closes on `popstate`, which makes browser/PWA back and the hardware
button behave identically. Never nest sheets (open the second in place of the first). Route
transitions keep the platform edge-swipe (no custom horizontal gestures on the shell). Sources
[32][40][41][42].

### A11 · Phone / tablet breakpoint split (640 / 768 / 1024)

Findings. Tailwind: sm 640, md 768, lg 1024, xl 1280; "Don't use `sm:` to target mobile devices"
[43]. Android window size classes: compact < 600 dp = 99.96 % of phones in portrait; medium
600–840 = 93.7 % of tablets in portrait; expanded ≥ 840 = 97.2 % of tablets in landscape; phone
landscape height < 480 dp for 99.8 % of phones [23]. Apple: on iPad "Prefer a tab bar" that can
"convert… to a sidebar"; design the full-screen iPad layout first [1][2a].

SPEC A11. Three shells. **Phone < 768**: bottom bar, 48 px top bar with title, no tab strip, no
breadcrumb, sheets, single column. **Tablet 768–1023**: no bottom bar; a collapsed 64 px icon
rail (the existing sidebar in `collapsed` mode) + 56 px top bar with breadcrumb and the tab strip;
dialogs remain centred dialogs ≤ 640 px; side sheets are 420 px sheets, not full-screen.
**Desktop ≥ 1024**: unchanged. `sm` (640) changes only inline details (button labels appear,
KPI tiles 2→4 up). Phone landscape (`(max-height: 500px)`): bottom bar hidden, its destinations
reachable from the Plus/avatar menu, top bar 40 px. Replace `useIsMobile` (1024) with
`useViewportClass()` returning `'phone' | 'tablet' | 'desktop'` and use `max-md:` /
`md:max-lg:` classes instead of `max-lg:`. Android tablets narrower than 768 px (600–767 dp,
7-inch) get the phone shell — accepted. Sources [1][2a][23][43].

## 3. Contradictions and how I resolved them

1. **"Avoid overflow tabs" (Apple) vs Priority+ / Facebook's More tab.** Apple's rule targets
   the automatic, unlabelled More list that breaks navigation stacks [1][15]; NN/g and Frost show
   a deliberate, labelled overflow (combo nav) is used in 86 % of sessions vs 57 % for a fully
   hidden menu [8][16]. Resolution: a designed « Plus » sheet only for roles with ≥ 5 destinations;
   roles with ≤ 4 hide nothing.
2. **Drawer vs sheet for the overflow.** Material 2 said drawer for 5+; Material 3 is deprecating
   the drawer [7], NN/g measured hidden side menus as the weakest [8]. Resolution: bottom sheet
   from a labelled tab, keeps the bar visible and the thumb zone.
3. **Bar hides on scroll (Material `hideOnScroll`, iOS 26 minimise) vs Apple "keep the tab bar
   visible".** Material disables hide-on-scroll for TalkBack [3]; Apple minimises only with an
   accessory [1]; NN/g says partially persistent headers assume intent that "isn't always
   accurate" [10]. Resolution: bottom bar never hides; top bar pinned except on read-only
   documents.
4. **"Back" = chronological (NN/g, Android) vs single up crumb (NN/g breadcrumbs).** Both are
   right about different controls. Resolution: in-app control is an explicit « ‹ Parent » up
   link; back is left to the platform and wired through history entries.
5. **FAB is the canonical primary action (Material) vs corner inaccuracy (Hoober) and FAB
   criticism.** The app already has a bottom bar and a corner launcher; a FAB would stack a third
   floating element. Resolution: header button on lists, replacing bottom action bar on records.
6. **Material 80 dp bar vs Apple 49 pt.** Material's height includes label + indicator padding;
   the app's 56 px content + safe area equals the Apple size and passes 48 px hit areas.
   Resolution: 56 px.
7. **`interactive-widget=resizes-content` vs `resizes-visual` default.** Chrome changed the
   default to protect fixed elements from jumping [20]; our shell is a non-body scroller with
   sticky bottom rows, which is the case the article says to test. Resolution: opt into
   `resizes-content`, hide the nav bar while the keyboard is open.
8. **1024 single breakpoint (current DESIGN.md) vs window size classes.** Resolution: 768 as the
   phone/tablet line (Tailwind `md`, ≈ iPad portrait), 1024 stays desktop.

## 4. Do-not list

- Do not put more than 5 tabs in the bar, scroll it, hide a tab for an empty section, or use a
  tab as an action (« + Nouveau » is never a tab) [1][5][17].
- Do not use a hamburger / side drawer on phones; the only hidden navigation is the labelled
  « Plus » sheet, and only for roles with ≥ 5 destinations [7][8][14].
- Do not hide the bottom bar on scroll; do not show two bottom bars at once (nav + action) [1][3].
- Do not paint the title twice (body H1 + bar) or show logo + breadcrumb + title in a 48 px bar.
- Do not label the leading control « Retour » / « Back »; it is « ‹ Parent » (up) [2][25].
- Do not open a sheet without a history entry; do not stack sheets [30][42].
- Do not place a FAB, the « ? » launcher or any destructive control in a screen corner on phones
  [13][29].
- Do not use `100vh`; do not size the shell with `dvh` [35].
- Do not intercept Android back for anything but overlay-close and dirty-form confirmation [41].
- Do not use `sm:` as "phone" — phone rules are unprefixed, tablet rules `md:`, desktop `lg:` [43].
- Do not ship the tab strip, drag handles, hover-only close buttons or Alt hotkeys to phones [27].

## 5. Open questions for the owner

- Q1 Admin/Responsable 4th visible slot: Chiffrage (queue supervision), Terrain (field
  supervision) or Suivi d'équipe? The other two go into « Plus ». (`mobileRank` currently ties
  four items at rank 1 — needs a per-role explicit order in `nav-groups.ts`.)
- Q2 Agent de Terrain bar: 3 tabs (Missions · Tableau de bord · Profil) as specified, or 2 tabs
  (Missions · Profil) with the terrain dashboard folded into the Missions page header?
- Q3 The draggable « ? » tutorial launcher: keep it on tablets/desktop only and move it into the
  « ⋯ » / Profil sheet on phones, or keep a smaller pill above the bottom bar (bottom-left, the
  less-used corner)?
- Q4 Android app: upgrade Capacitor 6 → 8.3.2+ (edge-to-edge insets, `--safe-area-inset-*`) or
  add `@capacitor-community/safe-area` now and upgrade later? Either way `@capacitor/keyboard`
  must be added (not in `package.json`).
- Q5 Record pages: confirm that the contextual bottom action bar may replace the navigation bar
  (one bar at a time), with « ‹ Dossiers » as the way back — this shapes family E.
- Q6 Tablet 768–1023: collapsed icon rail (this spec) or the phone bottom bar kept up to 1024
  for iPad users who hold it like a big phone?

## 6. Sources

1 ✓ Apple HIG, Tab bars — https://developer.apple.com/design/human-interface-guidelines/tab-bars (read via the HIG JSON endpoint)
2 ✓ Apple HIG, Toolbars (navigation-bar guidance since iOS 26) — https://developer.apple.com/design/human-interface-guidelines/toolbars
2a ✓ Apple HIG, Layout — https://developer.apple.com/design/human-interface-guidelines/layout
2b ✓ Apple HIG, Designing for iOS — https://developer.apple.com/design/human-interface-guidelines/designing-for-ios
3 ✓ Material Components Android, Bottom app bar — https://github.com/material-components/material-components-android/blob/master/docs/components/BottomAppBar.md
4 ✓ Material Components Android, FAB — https://github.com/material-components/material-components-android/blob/master/docs/components/FloatingActionButton.md
5 ✓ Material Components Android, Navigation bar (BottomNavigation.md, M3 + Expressive values) — https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md
6 ✓ Material Components Android, Top app bar — https://github.com/material-components/material-components-android/blob/master/docs/components/TopAppBar.md
7 ✓ Material Components Android, Navigation drawer (deprecation note) — https://github.com/material-components/material-components-android/blob/master/docs/components/NavigationDrawer.md
8 ✓ NN/g, Hamburger menus and hidden navigation hurt UX metrics — https://www.nngroup.com/articles/hamburger-menus/
9 ✓ NN/g, Basic patterns for mobile navigation — https://www.nngroup.com/articles/mobile-navigation-patterns/
10 ✓ NN/g, Sticky headers — https://www.nngroup.com/articles/sticky-headers/
10a ✓ NN/g, Touch target size — https://www.nngroup.com/articles/touch-target-size/
11 ✓ NN/g, Breadcrumbs: 11 design guidelines — https://www.nngroup.com/articles/breadcrumbs/
12 ✓ Smashing, Bottom navigation pattern on mobile web pages (2019) — https://www.smashingmagazine.com/2019/08/bottom-navigation-pattern-mobile-web-pages/
13 ✓ Hoober, Design for fingers, touch and people, part 1 (2017) — https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php
13a ✓ Hoober, How do users really hold mobile devices? (2013) — https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
13b ✓ Hoober, Design for fingers, touch and people, part 2 — https://www.uxmatters.com/mt/archives/2017/05/design-for-fingers-touch-and-people-part-2.php
14 ✓ LukeW, Obvious always wins — https://www.lukew.com/ff/entry.asp?1945
15 ✓ Apple Developer Forums, TabView More tab double navigation bar (DTS reply) — https://developer.apple.com/forums/thread/764293
16 ✓ Brad Frost, Revisiting the Priority+ pattern — https://bradfrost.com/blog/post/revisiting-the-priority-pattern/
17 ✓ UXD World, Bottom tab bar navigation best practices — https://uxdworld.com/bottom-tab-bar-navigation-design-best-practices/
18 ✓ Smashing (Babich), Basic patterns for mobile navigation (2017) — https://www.smashingmagazine.com/2017/05/basic-patterns-mobile-navigation/
19a ✓ MDN, env() — https://developer.mozilla.org/en-US/docs/Web/CSS/env
19b ✓ MDN, viewport meta (viewport-fit, interactive-widget) — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport
20 ✓ Chrome Developers, Prepare for viewport resize behavior changes (Chrome 108) — https://developer.chrome.com/blog/viewport-resize-behavior
21 ✓ Baymard, Ecommerce mobile app UX trends — https://baymard.com/blog/mobile-app-ux-trends
22 ✓ Smashing (Friedman), Designing effective breadcrumbs navigation — https://www.smashingmagazine.com/2022/04/breadcrumbs-ux-design/
23 ✓ Android Developers, Window size classes — https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes
24 ✓ NN/g, Mobile subnavigation — https://www.nngroup.com/articles/mobile-subnavigation/
25 ✓ NN/g, User control and freedom (heuristic 3) — https://www.nngroup.com/articles/user-control-and-freedom/
26 ✓ Hacker News, The core problem with hamburger menus (2023) — https://news.ycombinator.com/item?id=35833163
27 ✓ Google Chrome Help, Manage tabs in Chrome (Android: Switch tabs button; tablet tab strip) — https://support.google.com/chrome/answer/2391819
28 ✓ Donny Wals, Exploring tab bars on iOS 26 with Liquid Glass — https://www.donnywals.com/exploring-tab-bars-on-ios-26-with-liquid-glass/
29 ✓ Scott Hurff, How to design for thumbs in the era of huge screens — https://www.scotthurff.com/posts/how-to-design-for-thumbs-in-the-era-of-huge-screens/
30 ✓ Baymard, 4 design patterns that violate Back-button expectations — https://baymard.com/blog/back-button-expectations
31 ✓ Digital X Labs, Sticky CTA buttons best practices — https://www.digitalxlabs.io/blogs/web-design/sticky-cta-design
32 ✓ Android Developers, Principles of navigation — https://developer.android.com/guide/navigation/navigation-principles
33 ◦ Teo Yu Siang, Why the FAB is bad UX design (+ HN 10735680, Usabilla, Severo replies) — https://news.ycombinator.com/item?id=10735680 (HN returned 429; Medium 403)
34 ✓ W3C, Understanding SC 2.5.8 Target size (minimum) — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
35 ✓ web.dev, The large, small and dynamic viewport units — https://web.dev/blog/viewport-units
36 ✓ Capacitor, Status Bar plugin (Android 15/16 edge-to-edge) — https://capacitorjs.com/docs/apis/status-bar
37 ✓ Capawesome, Capacitor edge-to-edge and safe areas guide — https://capawesome.io/blog/capacitor-edge-to-edge-and-safe-areas-guide/
38 ✓ MDN, VirtualKeyboard API — https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API
39 ✓ Capacitor, Keyboard plugin (resize modes) — https://capacitorjs.com/docs/apis/keyboard
40 ✓ Capacitor, App plugin (backButton, canGoBack) — https://capacitorjs.com/docs/apis/app
41 ✓ Android Developers, Predictive back gesture — https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture
42 ✓ NN/g, Accidental dismissal of overlays — https://www.nngroup.com/articles/accidental-overlay-dismissal/
43 ✓ Tailwind CSS, Responsive design — https://tailwindcss.com/docs/responsive-design
44 ✓ The Designer's Field Guide, 3 design patterns better than hamburger menus — https://thedesignersfieldguide.substack.com/p/3-design-patterns-for-navigation
45 ◦ Hacker News, The Scroll Up Bar (hide-on-scroll debate) — https://news.ycombinator.com/item?id=7799687 (429)
46 ◦ Smashing (Friedman), Designing navigation for mobile (2022) — https://www.smashingmagazine.com/2022/11/navigation-design-mobile-ux/ (fetched; covers curtain/billboard patterns, no bar rules — not relied on)
47 ◦ Reddit r/UXDesign threads on More tabs vs drawers — not fetchable from this environment; the practitioner side is covered by [15][16][17][18][26][44]
