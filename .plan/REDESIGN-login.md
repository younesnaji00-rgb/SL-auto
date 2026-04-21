# REDESIGN: Login Page (Area 4 / 16)

Scope: the unauthenticated entry point. Dual-mode: first-time admin setup + returning-user login. First impression of the product.

## Files in scope

- [src/app/login/page.tsx](../src/app/login/page.tsx)

## Current state (audit)

The file is a single-page client component with three render branches: auth/setup check spinner, first-time setup form, normal login form.

### Branch 1 — Auth/setup check ([page.tsx:168-174](../src/app/login/page.tsx#L168-L174))
- `bg-gradient-to-br from-background to-muted/50` — blue-palette gradient. Will auto-shift to warm cream after foundation-tokens, but the linear 45° gradient is exactly the "perfectly even gradient" pattern the redesign skill calls out as generic.
- Centered `Loader2` with no label. Should use the `PageLoader` primitive.

### Branch 2 — First-time setup ([page.tsx:177-249](../src/app/login/page.tsx#L177-L249))
- Same gradient wrapper.
- `Card max-w-md shadow-xl` — heavy shadow on blue gradient. Review after palette swap.
- **CardHeader uses `text-center`** — overrides the default `bg-heading-bg rounded-t-lg` with custom content. The default chip-style header tint will show a band on the card top — may conflict with centered-text aesthetic. Decision: use the `plain` CardHeader variant (to be added in shared-ui) so the setup card has no top band.
- **Hardcoded blue**: `text-blue-600` on the `ShieldCheck` icon at [page.tsx:187](../src/app/login/page.tsx#L187). Bypasses token system.
- **Hardcoded blue CTA**: `bg-blue-600 hover:bg-blue-700` on the submit button at [page.tsx:237](../src/app/login/page.tsx#L237). Bypasses Button default variant — will clash hard with teal palette.
- Form fields: 3 inputs (name, password, confirm) using `Label` + `Input` — correct pattern.
- Error banner at [page.tsx:231-234](../src/app/login/page.tsx#L231-L234) is an inline `<div>` with manual destructive styling. Should use `Alert variant="destructive"` from shared-ui.
- Button loading spinner pattern (`<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...`) — manual. Should use the Button `loading` prop planned in shared-ui.
- No password-strength helper text, no inline validation feedback as user types. The min-6-char rule only surfaces on submit.

### Branch 3 — Normal login ([page.tsx:252-317](../src/app/login/page.tsx#L252-L317))
- Same gradient wrapper.
- Same `Card max-w-md shadow-xl` pattern.
- CardHeader with Logo + "Connexion" + CardDescription. Will inherit warm palette correctly.
- Form fields: name (autoFocus) + password.
- **Password visibility toggle** at [page.tsx:288-296](../src/app/login/page.tsx#L288-L296): clever absolute-positioned `Button variant="ghost" size="icon"`. Pattern is good. Just needs palette recheck.
- Error banner — same manual pattern as setup, same fix.
- Submit button uses default variant (teal after foundation-tokens) — no hardcoded color here, good.

### Business logic (preserve verbatim)
- [`generateEmail`](../src/app/login/page.tsx#L16-L25): deterministic email from name (strip accents → spaces → dots → `@sl-auto.app`). **Do not touch.**
- [page.tsx:40-50](../src/app/login/page.tsx#L40-L50): `onAuthStateChanged` redirect to `/dashboard` if already authed.
- [page.tsx:62-77](../src/app/login/page.tsx#L62-L77): setup detection query (`where password != ''`).
- [page.tsx:79-116](../src/app/login/page.tsx#L79-L116): `handleSetup` creates Firebase Auth user + Firestore user doc with role `Admin`, `statut: 'Actif'`, `serverTimestamp()`.
- [page.tsx:118-166](../src/app/login/page.tsx#L118-L166): `handleLogin` looks up user by `nom`, pulls email, calls `signInWithEmailAndPassword`, updates `lastLogin`. Handles all Firebase error codes with French messages.
- `statut === 'Inactif'` block message. Preserve.

### French copy (preserve verbatim)
- Error messages: "Mot de passe incorrect.", "Utilisateur introuvable.", "Trop de tentatives. Réessayez plus tard.", "Erreur de connexion. Réessayez.", "Le mot de passe doit contenir au moins 6 caractères.", "Les mots de passe ne correspondent pas.", "Votre compte est désactivé. Contactez un administrateur.", "Aucun identifiant associé à cet utilisateur."
- CTAs: "Se connecter", "Créer le compte Admin", "Connexion...", "Création..."
- Labels: "Nom complet", "Mot de passe", "Confirmez le mot de passe", "Nom complet de l'administrateur"
- Descriptions: "Entrez vos identifiants pour accéder au système.", "Aucun utilisateur n'existe encore. Créez le compte administrateur pour commencer."
- Placeholders: "Ex: Ahmed Benali", "Minimum 6 caractères", "Retapez le mot de passe", "Entrez votre nom complet", "Entrez votre mot de passe"

## Concrete changes

### Background treatment
- Replace `bg-gradient-to-br from-background to-muted/50` with a warmer, softer background. Options:
  1. **Radial gradient** (recommended): `bg-[radial-gradient(ellipse_at_top,hsl(var(--card))_0%,hsl(var(--background))_70%)]` — cream brightening toward the top where the card sits. Feels like soft ambient light instead of a linear fade.
  2. **Ambient orb**: warm cream base with a single blurred teal-tinted blob positioned top-right or top-left. Requires absolute-positioned `<div>` with `blur-3xl bg-primary/10 w-[500px] h-[500px] rounded-full`.
- Apply the same treatment to all three branches so transitioning between them is seamless.
- Optionally add a subtle noise overlay (fixed `pointer-events-none` div with a repeating SVG noise pattern at very low opacity) — per redesign skill "grain and noise overlays" technique. Defer unless the cream reads too flat after palette swap.

### Auth/setup check branch
- Replace the `Loader2` block with `<PageLoader label="Chargement..." />` from shared-ui.
- Keep the same background treatment as the forms so the transition is seamless.

### First-time setup branch
- Wrap outer div in same background treatment as login.
- `ShieldCheck` icon: remove `text-blue-600`, let it inherit or use `text-primary` to tint teal.
- Submit `Button`: remove `bg-blue-600 hover:bg-blue-700` — use the default variant (teal). The button should read as the primary CTA naturally.
- Replace the manual error banner `<div>` with:
  ```
  {setupError && <Alert variant="destructive"><AlertDescription>{setupError}</AlertDescription></Alert>}
  ```
- Replace the manual loading spinner in the button with `<Button loading={setupLoading}>Créer le compte Admin</Button>` once the `loading` prop lands in Button.
- Add `CardHeader variant="plain"` (or pass `className` to override the `bg-heading-bg`) so the card header doesn't have the chip band — feels cleaner for the setup entry.
- Optional: add inline helper text below the password input, e.g. `<p className="text-xs text-muted-foreground">Au moins 6 caractères.</p>` — proactive rather than reactive.

### Normal login branch
- Same background treatment.
- Same Alert replacement for error banner.
- Same Button loading-prop refactor.
- Password visibility toggle: keep the absolute-positioned `Button variant="ghost" size="icon"` pattern. Verify the ghost variant's hover (`hover:bg-accent`) reads well against the input's inner padding — may need a `hover:bg-transparent` override if it looks busy.
- Keep the Logo at top — it's the brand anchor.

### Card + shadow
- `shadow-xl` is heavy. On warm cream the shadow should be tinted (warm) not pure black. Options:
  - Drop to `shadow-lg` + add a tinted shadow utility: `shadow-[0_20px_50px_-12px_hsl(var(--foreground)/0.15)]`.
  - Or defer to a Phase 2 visual review — the Card primitive may get a tinted shadow default in shared-ui.
- `max-w-md` (448px) is good. Consider increasing to `max-w-sm` (384px) if the form feels airy — defer to visual review.

### Micro-polish
- `text-2xl` CardTitle — once Outfit loads, review if `tracking-tight` helps the display weight feel intentional.
- `autoFocus` on first input — keep.
- `required` attrs on inputs — keep (HTML5 validation is the floor).

## Constraints / no-go

- Do **not** touch `generateEmail` (accent strip + dot replacement + `@sl-auto.app` domain). It's the contract between setup and login.
- Do **not** change the Firestore queries or the shape of the user doc (`nom`, `prenom`, `email`, `password`, `role`, `compagnies`, `statut`, `createdAt`, `lastLogin`).
- Do **not** remove `statut === 'Inactif'` check — deactivated-user gate.
- Do **not** change French error messages.
- Do **not** remove the `onAuthStateChanged` redirect — prevents double-login.
- Do **not** replace the name-based login flow with email/password — it's intentional UX per the app's data model.
- Do **not** add "Forgot password" UI — no reset flow exists in Firebase rules/admin yet.
- Preserve `autoFocus` on the first input.

## Risk level

**Medium.** This is the first screen every user sees. Visual changes are judged harshly. The `bg-blue-600` removal is behavioral (button color changes), the gradient swap is aesthetic (background feels different). Logic is untouched so regressions are limited to Firebase auth behavior, which should be zero-risk.

Low for: Alert swap, PageLoader swap, loading-prop swap.

## Dependencies

- **Requires foundation-tokens first** — Outfit font, teal palette, warm cream bg.
- **Requires shared-ui first** — `Alert`, `PageLoader`, `Button.loading` prop, `CardHeader` variant if we add one.

## Exit criteria

- `npm run typecheck` passes.
- Setup branch (first-time) still creates Admin user correctly and redirects to dashboard.
- Login branch still authenticates existing users.
- `Inactif` statut still blocks login with French message.
- `auth/wrong-password`, `auth/invalid-credential`, `auth/user-not-found`, `auth/too-many-requests` all still render their French messages.
- No `text-blue-*` or `bg-blue-*` classes remain on this page.
- Error banners render via `Alert`, not manual divs.
- Loading spinners render via `Button loading`, not inline Loader2.
- Background reads warm cream, no blue tint.
- Card feels grounded on the cream (tinted shadow or appropriate shadow level).

## Open items to resolve during implementation

1. Background treatment — radial gradient vs ambient orb vs static cream. Lean radial.
2. Whether to add `CardHeader variant="plain"` (requires a shared-ui addition) or override via className inline. Lean inline override — one-off, not worth a new variant.
3. Whether to show the setup helper text ("Au moins 6 caractères") inline. Lean yes, low cost.
4. Shadow treatment — keep `shadow-xl` or drop to tinted shadow. Defer to visual review after palette lands.
