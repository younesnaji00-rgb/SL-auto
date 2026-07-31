'use client';

import { useState, useEffect } from 'react';
import { BRAND } from '@/lib/brand';
import { LanguageSwitcher } from '@/components/language-switcher';
import { TutorialLauncher } from '@/components/tutorial/tutorial-launcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { useT } from '@/i18n';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { SINGLE_SESSION_ROLES } from '@/lib/dossiers-data';
import { landingPathFor } from '@/lib/role-landing';
import { collectSessionMeta, isSessionClaimable, timestampToMillis } from '@/lib/session-meta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageLoader } from '@/components/ui/page-loader';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Logo from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

/** Generate a deterministic email from the user's full name */
function generateEmail(nom: string): string {
  const sanitized = nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

const PAGE_BACKGROUND =
  'bg-[radial-gradient(ellipse_at_top,hsl(var(--card))_0%,hsl(var(--background))_70%)]';

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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    setError('');
    setLoading(true);

    try {
      const trimmed = nom.trim();
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

      const cred = await signInWithEmailAndPassword(auth, email, password);

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

      window.sessionStorage.removeItem(LOGIN_IN_FLIGHT_KEY);
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
        <PageLoader label={t('Chargement...')} />
      </div>
    );
  }

  // ===== FIRST-TIME SETUP =====
  if (needsSetup) {
    return (
      <div className={`flex min-h-screen items-center justify-center p-4 ${PAGE_BACKGROUND}`}>
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="flex justify-center">
              <Logo />
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">{t('Configuration initiale')}</CardTitle>
              </div>
              <CardDescription className="mt-1">
                {t("Aucun utilisateur n'existe encore. Créez le compte administrateur pour commencer.")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setup-name">{t("Nom complet de l'administrateur")}</Label>
                <Input
                  id="setup-name"
                  value={setupName}
                  onChange={e => setSetupName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-password">{t('Mot de passe')}</Label>
                <Input
                  id="setup-password"
                  type="password"
                  placeholder={t('Minimum 6 caractères')}
                  value={setupPassword}
                  onChange={e => setSetupPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">{t('Au moins 6 caractères.')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-confirm">{t('Confirmez le mot de passe')}</Label>
                <Input
                  id="setup-confirm"
                  type="password"
                  value={setupConfirm}
                  onChange={e => setSetupConfirm(e.target.value)}
                  required
                />
              </div>

              {setupError && (
                <Alert variant="destructive">
                  <AlertDescription>{setupError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" loading={setupLoading}>
                {setupLoading ? t('Création...') : t('Créer le compte Admin')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== NORMAL LOGIN =====
  return (
    <div className={`relative flex min-h-screen items-center justify-center p-4 ${PAGE_BACKGROUND}`}>
      <div className="absolute top-4 right-4 flex items-center gap-1" data-tour="login-lang">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <TutorialLauncher />
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <Logo />
          </div>
          <div>
            <CardTitle className="text-2xl">{t('Connexion')}</CardTitle>
            <CardDescription className="mt-1">{t('Entrez vos identifiants pour accéder au système.')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2" data-tour="login-nom">
              <Label htmlFor="nom">{t('Nom complet')}</Label>
              <Input
                id="nom"
                value={nom}
                onChange={e => setNom(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2" data-tour="login-password">
              <Label htmlFor="password">{t('Mot de passe')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {loading ? t('Connexion...') : t('Se connecter')}
            </Button>

            {BRAND.id === 'demo' && (
              <div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground space-y-1" data-tour="login-demo">
                <p className="font-semibold text-foreground">{t('Comptes de démonstration')}</p>
                <p>Admin Demo · Manager Demo · Estimator Demo · Field Agent Demo</p>
                <p>{t('Mot de passe')} : Demo2026!</p>
                <details className="pt-1" data-tour="login-roles">
                  <summary className="cursor-pointer font-semibold text-teal-700 dark:text-teal-400 select-none">
                    {t('Découvrir les rôles ici')}
                  </summary>
                  <ul className="mt-2 space-y-1.5 text-left">
                    <li>
                      <span className="font-semibold text-foreground">Admin</span>{' '}
                      — {t('supervise tout : utilisateurs, permissions, compagnies, jours fériés et configuration.')}
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">Manager</span>{' '}
                      — {t('pilote les dossiers de bout en bout : création, planification, accords, rapports et suivi des délais.')}
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">Estimator</span>{' '}
                      — {t('vérifie les devis extraits par l’IA ligne par ligne, négocie les accords et dépose les verdicts de réforme.')}
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">Field Agent</span>{' '}
                      — {t('réalise les missions photo sur le terrain depuis son mobile : scan de plaque, photos avant/pendant/après.')}
                    </li>
                  </ul>
                </details>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
