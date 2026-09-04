'use client';

import { useState, useEffect } from 'react';
import { BRAND } from '@/lib/brand';
import { LanguageSwitcher } from '@/components/language-switcher';
import { TutorialLauncher } from '@/components/tutorial/tutorial-launcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { RolesGuideDialog } from '@/components/roles-guide-dialog';
import { useT } from '@/i18n';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { SINGLE_SESSION_ROLES } from '@/lib/dossiers-data';
import { landingPathFor } from '@/lib/role-landing';
import { collectSessionMeta, isSessionClaimable, timestampToMillis } from '@/lib/session-meta';
import { trialStatus } from '@/lib/trial';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageLoader } from '@/components/ui/page-loader';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

/** Generate a deterministic email from the user's full name */
function generateEmail(nom: string): string {
  const sanitized = nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '.');
  return `${sanitized}@${BRAND.authEmailDomain}`;
}

// Single-session enforcement (BLOCK model): for the basic roles in
// SINGLE_SESSION_ROLES, the first device claims `currentSessionId` and a SECOND
// device is BLOCKED here at login (it never overwrites the id, so the first
// device keeps its session). The claim is released only by an explicit
// sign-out or an admin force-disconnect. Other roles are unrestricted. Keep the
// storage keys in sync with src/hooks/use-current-user.tsx.
const SESSION_STORAGE_KEY = 'sl-auto.session-id';
// In-flight flag: set before signIn, cleared after the user doc is updated.
// CurrentUserProvider respects this flag so the snapshot listener that
// attaches during signIn does not evict us in the brief window before our
// own currentSessionId write commits.
const LOGIN_IN_FLIGHT_KEY = 'sl-auto.login-in-flight';
// One-shot flag the eviction listener (in use-current-user) sets right before
// signing the older device out. We consume it once on /login mount to render
// a friendly toast explaining why the user landed here.
const EVICTED_FLAG_KEY = 'sl-auto.evicted-by-other-device';
// Per-tab UID guard mirror of the key defined in src/hooks/use-current-user.tsx.
// Written here BEFORE signIn so the CurrentUserProvider that mounts on the
// post-login redirect sees a matching identity instead of treating its own
// freshly-acquired auth state as a cross-tab hijack. Keep these in sync.
const EXPECTED_UID_KEY = 'sl-auto.expected-uid';
function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Read THIS TAB's existing session id for the claim-or-block decision. Read
// from sessionStorage ONLY (per-tab) — NOT localStorage. localStorage is shared
// across all tabs of the browser; using it would let a second tab read the
// first tab's id, skip the block, mint a new id and displace the first tab
// (the "latest login wins" behaviour we removed). A genuine same-tab re-login
// (e.g. token expiry) keeps its sessionStorage id and is still recognised; a
// fresh tab/device has none and is correctly blocked.
function readTabSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(SESSION_STORAGE_KEY);
}

// Flat cream canvas (blueprint §3: no ambient gradient/mesh behind the page).
const PAGE_BACKGROUND = 'bg-background text-ink';

/** Field label: 12 px sentence case, quiet (blueprint §2 `t-label`). Plain
 *  <label> rather than the shadcn Label so its 14 px utility doesn't win. */
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="t-label block">
      {children}
    </label>
  );
}

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const t = useT();

  // Single-session eviction notice: if the previous tab was signed out
  // because another device claimed the session, show one informational toast.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(EVICTED_FLAG_KEY) === '1') {
      window.localStorage.removeItem(EVICTED_FLAG_KEY);
      // Neutral wording: this flag is raised for several causes (admin
      // force-disconnect, displacement, sign-out in another tab, cross-tab
      // identity guard), so don't assert a specific one.
      toast({
        title: t('Session fermée'),
        description: t('Votre session a été fermée. Veuillez vous reconnecter.'),
        variant: 'destructive',
      });
    }
  }, [toast, t]);

  const [nom, setNom] = useState('');
  const [password, setPassword] = useState('');
  // Demo entry: one-click role buttons by default; classic form on demand
  // (trial prospects with their own accounts).
  const isDemo = BRAND.id === 'demo';
  const [showClassicForm, setShowClassicForm] = useState(!isDemo);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Success morph state — true from sign-in success until navigation.
  const [loginSuccess, setLoginSuccess] = useState(false);
  // Demo brand: a gestionnaire login restarts the showcase — the server
  // wipes walkthrough leftovers and re-seeds the sample data while this
  // flag drives the "preparing your demo" message.
  const [preparing, setPreparing] = useState(false);

  // Redirect already-authenticated users to dashboard, BUT only when the
  // live Firebase Auth user matches this tab's expected identity. If another
  // tab in the same browser just signed in as a different account, the
  // shared IndexedDB flips our auth state too — silently following that
  // redirect would land this user on the other account's dashboard, which
  // is exactly the leak we are guarding against. Show the form instead.
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCheckingAuth(false);
        return;
      }
      // A login attempt is mid-flight: handleLogin set the in-flight flag and
      // still owns the post-claim navigation (and may need to block + sign out
      // first for a single-session role). Don't auto-redirect underneath it.
      if (
        typeof window !== 'undefined' &&
        window.sessionStorage.getItem(LOGIN_IN_FLIGHT_KEY) === '1'
      ) {
        setCheckingAuth(false);
        return;
      }
      const expectedUid =
        typeof window !== 'undefined'
          ? window.sessionStorage.getItem(EXPECTED_UID_KEY)
          : null;
      if (expectedUid && user.uid !== expectedUid) {
        setCheckingAuth(false);
        return;
      }
      if (!expectedUid && typeof window !== 'undefined') {
        window.sessionStorage.setItem(EXPECTED_UID_KEY, user.uid);
      }
      router.replace('/dashboard');
    });
    return () => unsub();
  }, [auth, router]);

  // First-time setup detection
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupName, setSetupName] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  // Check if any users with Firebase Auth exist (ones that have a 'password' field = new format)
  useEffect(() => {
    if (!db) return;
    const checkUsers = async () => {
      try {
        const q = query(collection(db, 'users'), where('password', '!=', ''));
        const snap = await getDocs(q);
        setNeedsSetup(snap.empty);
      } catch (e) {
        console.warn('Failed to check users:', e);
        setNeedsSetup(false);
      } finally {
        setCheckingSetup(false);
      }
    };
    checkUsers();
  }, [db]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');

    if (setupPassword.length < 6) {
      setSetupError(t('Le mot de passe doit contenir au moins 6 caractères.'));
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSetupError(t('Les mots de passe ne correspondent pas.'));
      return;
    }

    setSetupLoading(true);
    window.sessionStorage.setItem(LOGIN_IN_FLIGHT_KEY, '1');
    // The setup account is an Admin — a NON single-session role — so we never
    // seed a `currentSessionId` or local session markers. A dangling id on an
    // unrestricted account would become an un-releasable lock if the account
    // were ever demoted to a basic role.
    try {
      const email = generateEmail(setupName);
      const cred = await createUserWithEmailAndPassword(auth, email, setupPassword);
      // Stamp the per-tab UID guard now that we know the auth uid. Setup runs
      // exactly once on a fresh database so concurrent-tab hijack is unlikely
      // here, but keeping the marker consistent across login paths makes the
      // CurrentUserProvider guard symmetric and avoids a spurious soft-evict
      // on the post-setup redirect.
      window.sessionStorage.setItem(EXPECTED_UID_KEY, cred.user.uid);

      await setDoc(doc(db, 'users', cred.user.uid), {
        nom: setupName.trim(),
        nomLowercase: setupName.trim().toLowerCase(),
        prenom: '',
        email: email,
        password: setupPassword,
        role: 'Admin',
        compagnies: [],
        statut: 'Actif',
        createdAt: serverTimestamp(),
        lastLogin: null,
      });

      window.sessionStorage.removeItem(LOGIN_IN_FLIGHT_KEY);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Setup error:', err);
      window.sessionStorage.removeItem(LOGIN_IN_FLIGHT_KEY);
      window.sessionStorage.removeItem(EXPECTED_UID_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      setSetupError(err.message || t('Erreur lors de la création du compte.'));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(nom, password);
  };

  // Shared by the classic form and the demo one-click role buttons.
  const doLogin = async (nomValue: string, passwordValue: string) => {
    setError('');
    setLoading(true);

    try {
      const trimmed = nomValue.trim();
      const lower = trimmed.toLowerCase();
      let snap = await getDocs(
        query(collection(db, 'users'), where('nomLowercase', '==', lower))
      );

      // Fallback for users whose docs predate the nomLowercase backfill:
      // try an exact-case match on `nom` and opportunistically backfill
      // the lowercase field so subsequent logins use the fast path.
      let backfillNeeded = false;
      if (snap.empty) {
        snap = await getDocs(
          query(collection(db, 'users'), where('nom', '==', trimmed))
        );
        if (!snap.empty) backfillNeeded = true;
      }

      if (snap.empty) {
        setError(t('Utilisateur introuvable. Vérifiez votre nom (insensible à la casse).'));
        setLoading(false);
        return;
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data();
      const email = userData.email;

      if (!email) {
        setError(t('Aucun identifiant associé à cet utilisateur.'));
        setLoading(false);
        return;
      }

      if (userData.statut === 'Inactif') {
        setError(t('Votre compte est désactivé. Contactez un administrateur.'));
        setLoading(false);
        return;
      }

      // Account-based free trial (white-label demo): block an expired account
      // HERE, before signIn — nothing is authenticated yet and no single-
      // session claim exists, so there is nothing to unwind or sign out.
      // Exempt accounts and never-started trials pass through (see
      // src/lib/trial.ts).
      if (trialStatus(userData).expired) {
        setError(t('Votre période d’essai est terminée. Contactez-nous pour continuer.'));
        setLoading(false);
        return;
      }

      // Single-session enforcement (BLOCK model) — only for the operational
      // roles in SINGLE_SESSION_ROLES. Every other role may be logged in on
      // several devices at once, so they skip the claim/block entirely.
      const isBasicRole = SINGLE_SESSION_ROLES.has(userData.role);
      // Capture THIS TAB's prior session id (sessionStorage only) before minting
      // a new one: a same-tab re-login (token expiry) re-claims its own session;
      // a fresh tab/device has none, so the remote id (held by device 1) won't
      // match → blocked. Reading per-tab (not shared localStorage) prevents a
      // second tab from inheriting the first tab's id and displacing it.
      const priorLocalId = readTabSessionId();
      const sessionId = newSessionId();

      // The in-flight flag + expected-UID guard are stamped BEFORE signIn so
      // CurrentUserProvider (and this page's redirect effect) see a consistent
      // state and don't act on the half-finished login. expected-UID also
      // marks this tab as the legitimate signer (cross-tab hijack guard).
      window.sessionStorage.setItem(LOGIN_IN_FLIGHT_KEY, '1');
      window.sessionStorage.setItem(EXPECTED_UID_KEY, userDoc.id);
      if (isBasicRole) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      } else {
        // Unrestricted role — never enforce a single session. Clear any stale
        // local marker so the provider doesn't try to.
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }

      const cred = await signInWithEmailAndPassword(auth, email, passwordValue);

      // Account-based free trial: the FIRST login starts the clock. Merge-
      // write only the timestamp (never touches the rest of the doc); skipped
      // for exempt accounts and for brands without a trial. Runs after signIn
      // because Firestore rules require auth for writes. Best-effort — a
      // failed stamp just retries at the next login.
      if (BRAND.trialDays != null && !userData.trialExempt && !userData.trialStartedAt) {
        await setDoc(
          doc(db, 'users', cred.user.uid),
          { trialStartedAt: serverTimestamp() },
          { merge: true },
        ).catch((err) => console.warn('trialStartedAt stamp failed:', err));
      }

      if (isBasicRole) {
        // Capture the device + public IP for the admin session card. Collected
        // BEFORE the transaction (its callback can retry on contention, and we
        // must not fetch inside it). Best-effort — never blocks the login.
        const sessionMeta = await collectSessionMeta();
        // Atomic claim-or-block: succeed only if no OTHER device currently
        // holds an ACTIVE session. The transaction guarantees two simultaneous
        // logins can't both win. We may claim when the slot is free, when this
        // same device is re-claiming (`remote === priorLocalId`), or when the
        // current holder's heartbeat is stale/absent — i.e. it was stranded by
        // an app close, crash, network drop or storage clear and is no longer
        // live. See isSessionClaimable in @/lib/session-meta.
        try {
          await runTransaction(db, async (tx) => {
            const ref = doc(db, 'users', cred.user.uid);
            const fresh = await tx.get(ref);
            const data = fresh.exists() ? (fresh.data() as any) : null;
            const remote = data?.currentSessionId ?? null;
            const lastSeenMs = timestampToMillis(data?.currentSessionSeenAt);
            if (!isSessionClaimable(remote, lastSeenMs, priorLocalId, Date.now())) {
              throw new Error('SESSION_OCCUPIED');
            }
            const updates: Record<string, any> = {
              lastLogin: serverTimestamp(),
              currentSessionId: sessionId,
              // First heartbeat — CurrentUserProvider keeps it fresh from here.
              currentSessionSeenAt: serverTimestamp(),
            };
            if (backfillNeeded) updates.nomLowercase = lower;
            tx.update(ref, updates);
            // Device + IP go in an admin-only subcollection (kept off the
            // world-readable user doc). Same transaction → the admin card never
            // sees a claim without its metadata.
            tx.set(doc(db, 'users', cred.user.uid, 'session_meta', 'current'), {
              device: sessionMeta.device,
              ip: sessionMeta.ip,
              at: serverTimestamp(),
            });
          });
        } catch (txErr: any) {
          if (txErr?.message === 'SESSION_OCCUPIED') {
            // Blocked: undo the half-finished login and explain why.
            await firebaseSignOut(auth).catch(() => {});
            window.sessionStorage.removeItem(LOGIN_IN_FLIGHT_KEY);
            window.sessionStorage.removeItem(EXPECTED_UID_KEY);
            window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
            window.localStorage.removeItem(SESSION_STORAGE_KEY);
            setError(
              t("Ce compte est déjà connecté sur un autre appareil. Déconnectez-vous d'abord de cet appareil pour pouvoir vous connecter ici.") +
                ' ' +
                t("Si l'autre appareil n'est plus utilisé, réessayez dans une à deux minutes, ou demandez à un administrateur de déconnecter votre session."),
            );
            setLoading(false);
            return;
          }
          throw txErr;
        }
      } else {
        // Unrestricted role — stamp lastLogin and proactively clear any
        // `currentSessionId` so the doc never carries a dangling claim while
        // unenforced (which would lock the user out if later demoted to a basic
        // role). Safe: this role is not single-session.
        const updates: Record<string, any> = {
          lastLogin: serverTimestamp(),
          currentSessionId: null,
          currentSessionSeenAt: null,
        };
        if (backfillNeeded) updates.nomLowercase = lower;
        await updateDoc(doc(db, 'users', cred.user.uid), updates);
        // Drop any stale session metadata left from a prior basic-role session
        // on this account. Best-effort.
        deleteDoc(doc(db, 'users', cred.user.uid, 'session_meta', 'current')).catch(() => {});
      }

      // Demo restart: logging in as the GESTIONNAIRE resets the showcase —
      // every entry from the previous run (created files, reminders,
      // estimating assignments) is deleted and the sample data re-seeded.
      // Blocking here (with a message) keeps the first screen clean; a
      // failure or timeout never blocks the login itself.
      if (BRAND.id === 'demo' && userData.role === 'Gestionnaire') {
        setPreparing(true);
        try {
          const idToken = await cred.user.getIdToken();
          const ctrl = new AbortController();
          const timer = window.setTimeout(() => ctrl.abort(), 30_000);
          await fetch('/api/demo-reset', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
            signal: ctrl.signal,
          });
          window.clearTimeout(timer);
        } catch {
          // Non-fatal: the demo simply keeps its previous data.
        }
        // The walkthrough state must restart with the data: saved tour
        // positions point at dossiers that no longer exist.
        try {
          const prefix = `${BRAND.storagePrefix}.tour.`;
          const stale: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && k.startsWith(prefix)) stale.push(k);
          }
          for (const k of stale) window.localStorage.removeItem(k);
        } catch { /* non-fatal */ }
        setPreparing(false);
      }

      window.sessionStorage.removeItem(LOGIN_IN_FLIGHT_KEY);
      // Fresh sign-in marker: the tutorial launcher offers the guided tour
      // on the landing page after EVERY login (demo brand only reads it).
      if (BRAND.showTutorials) {
        try {
          window.sessionStorage.setItem(`${BRAND.storagePrefix}.tour.justLoggedIn`, '1');
        } catch { /* non-fatal */ }
      }
      // Success morph (motion-spec §5 / §1.2: login is an F3 moment — the
      // one daily event allowed a small ceremony): ✓ « Connecté » held
      // briefly before the app opens. Content swap only, no motion — safe
      // under reduced motion.
      setLoginSuccess(true);
      await new Promise((r) => setTimeout(r, 700));
      router.push(landingPathFor(userData.role));
    } catch (err: any) {
      console.error('Login error:', err);
      window.sessionStorage.removeItem(LOGIN_IN_FLIGHT_KEY);
      window.sessionStorage.removeItem(EXPECTED_UID_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(t('Mot de passe incorrect.'));
      } else if (err.code === 'auth/user-not-found') {
        setError(t('Utilisateur introuvable.'));
      } else if (err.code === 'auth/too-many-requests') {
        setError(t('Trop de tentatives. Réessayez plus tard.'));
      } else {
        setError(t('Erreur de connexion. Réessayez.'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth || checkingSetup) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${PAGE_BACKGROUND}`}>
        <PageLoader label={t('Chargement…')} />
      </div>
    );
  }

  // ===== FIRST-TIME SETUP =====
  if (needsSetup) {
    return (
      <div className={`flex min-h-screen items-center justify-center p-4 ${PAGE_BACKGROUND}`}>
        {/* Login card — element-specs §20 (GOV.UK create accounts: "solely about that task"; NN/g: single column, labels above, one submit): one glass card ≤ 400 px, 24–32 px padding. */}
        <Card className="w-full max-w-[400px] p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Logo />
            <div className="space-y-1">
              <h1 className="t-title">{t('Configuration initiale')}</h1>
              <p className="t-body-sm text-ink-3">
                {t("Aucun utilisateur n'existe encore. Créez le compte administrateur pour commencer.")}
              </p>
            </div>
          </div>
          {/* Addendum 4: fields grouped tight (16 px rows), the submit a
              group-gap (24 px) below; widths come from the ≤ 400 px card. */}
          <form onSubmit={handleSetup} className="mt-6 space-y-6">
            <div className="space-y-4">
            <div className="space-y-1">
              <FieldLabel htmlFor="setup-name">{t("Nom complet de l'administrateur")}</FieldLabel>
              <Input
                id="setup-name"
                value={setupName}
                onChange={e => setSetupName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="setup-password">{t('Mot de passe')}</FieldLabel>
              <Input
                id="setup-password"
                type="password"
                placeholder={t('Minimum 6 caractères')}
                value={setupPassword}
                onChange={e => setSetupPassword(e.target.value)}
                required
              />
              <p className="t-caption">{t('Au moins 6 caractères.')}</p>
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="setup-confirm">{t('Confirmez le mot de passe')}</FieldLabel>
              <Input
                id="setup-confirm"
                type="password"
                value={setupConfirm}
                onChange={e => setSetupConfirm(e.target.value)}
                required
              />
            </div>
            </div>

            {setupError && (
              <Alert variant="danger">
                <AlertCircle aria-hidden />
                <AlertDescription>{setupError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" loading={setupLoading}>
              {setupLoading ? t('Création…') : t('Créer le compte Admin')}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // ===== NORMAL LOGIN =====
  const demoEntry = isDemo && !showClassicForm;

  return (
    <div className={`relative flex min-h-screen items-center justify-center p-4 ${PAGE_BACKGROUND}`}>
      {/* Theme + language controls (white-label: the switcher only renders for
          brands that allow more than one locale). Tour anchor: login-lang. */}
      <div className="absolute right-4 top-4 flex items-center gap-1" data-tour="login-lang">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <TutorialLauncher />
      {/* Login card — element-specs §20 (GOV.UK create accounts: "solely about that task"; NN/g: single column, labels above, one submit): one glass card ≤ 400 px, 24–32 px padding. */}
      <Card className="w-full max-w-[400px] p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <div className="space-y-1">
            <h1 className="t-title">{demoEntry ? t('Explorer la démo') : t('Connexion')}</h1>
            <p className="t-body-sm text-ink-3">
              {demoEntry
                ? t('Choisissez un rôle — aucun compte, aucun engagement.')
                : t('Entrez vos identifiants pour accéder au système.')}
            </p>
          </div>
        </div>
        {demoEntry ? (
          // Demo entry — one click per role, no credentials to type. The
          // Lionheart demo depends on this block; keep its tour anchors.
          <div className="mt-6 space-y-4" data-tour="login-roles-grid">
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Admin Demo', label: 'Admin', desc: t('Supervision et réglages') },
                { name: 'Manager Demo', label: 'Manager', desc: t('Pilote les dossiers') },
                { name: 'Estimator Demo', label: 'Estimator', desc: t('Vérifie les devis') },
                { name: 'Field Agent Demo', label: 'Field Agent', desc: t('Photos sur le terrain') },
              ].map((r) => (
                <button
                  key={r.name}
                  type="button"
                  disabled={loading}
                  onClick={() => doLogin(r.name, 'Demo2026!')}
                  className="rounded-xl bg-surface-2 p-3 text-center shadow-rim transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <span className="t-body block font-semibold">{r.label}</span>
                  <span className="t-caption mt-0.5 block">{r.desc}</span>
                </button>
              ))}
            </div>
            {loading && (
              <p className="t-caption text-center">
                {preparing
                  ? t('Préparation de votre démo : les données d’exemple se réinitialisent…')
                  : t('Connexion…')}
              </p>
            )}
            {error && (
              <Alert variant="danger">
                <AlertCircle aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <p className="t-caption text-center">
              {t('Conseil : essayez « Field Agent » depuis un téléphone, et les autres rôles depuis un ordinateur.')}
            </p>
            <div className="flex flex-col items-center gap-1.5">
              <RolesGuideDialog
                trigger={
                  <button type="button" data-tour="login-roles" className="text-sm font-semibold text-primary hover:underline">
                    {t('Découvrir les rôles ici')}
                  </button>
                }
              />
            </div>
          </div>
        ) : (
        /* Addendum 4: fields grouped tight (16 px rows), the submit a
           group-gap (24 px) below; widths come from the ≤ 400 px card. */
        <form onSubmit={handleLogin} className="mt-6 space-y-6">
          <div className="space-y-4">
          <div className="space-y-1" data-tour="login-nom">
            <FieldLabel htmlFor="nom">{t('Nom complet')}</FieldLabel>
            <Input
              id="nom"
              value={nom}
              onChange={e => setNom(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1" data-tour="login-password">
            <FieldLabel htmlFor="password">{t('Mot de passe')}</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              {/* Show/hide toggle — element-specs §20 + NN/g password masking ("offer a
                  show-password toggle"): a `ghost` icon Button with aria-pressed, flat
                  inside the field (no rim on an inline affordance). */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-ink-3 shadow-none hover:text-ink"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </Button>
            </div>
          </div>
          </div>

          {error && (
            <Alert variant="danger">
              <AlertCircle aria-hidden />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" loading={loading && !loginSuccess} disabled={loading || loginSuccess}>
            {loginSuccess ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                {t('Connecté')}
              </>
            ) : loading
              ? preparing
                ? t('Préparation de votre démo…')
                : t('Connexion…')
              : t('Se connecter')}
          </Button>

          {BRAND.id === 'demo' && (
            <div className="space-y-1 rounded-md bg-surface-2 p-3 text-xs text-ink-2 shadow-rim" data-tour="login-demo">
              <p className="t-body font-semibold">{t('Comptes de démonstration')}</p>
              <p>Admin Demo · Manager Demo · Estimator Demo · Field Agent Demo</p>
              <p>{t('Mot de passe')} : Demo2026!</p>
              <RolesGuideDialog
                trigger={
                  <button
                    type="button"
                    data-tour="login-roles"
                    className="pt-1 font-semibold text-primary hover:underline"
                  >
                    {t('Découvrir les rôles ici')}
                  </button>
                }
              />
            </div>
          )}
        </form>
        )}
      </Card>
    </div>
  );
}
