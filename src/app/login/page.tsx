'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
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
  return `${sanitized}@sl-auto.app`;
}

// Single-session enforcement: every successful login writes a fresh session id
// to the user doc + localStorage. CurrentUserProvider compares the two on every
// snapshot \u2014 if they diverge (another device just logged in), it signs the
// older device out. Keep the storage key stable across the codebase.
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

const PAGE_BACKGROUND =
  'bg-[radial-gradient(ellipse_at_top,hsl(var(--card))_0%,hsl(var(--background))_70%)]';

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  // Single-session eviction notice: if the previous tab was signed out
  // because another device claimed the session, show one informational toast.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(EVICTED_FLAG_KEY) === '1') {
      window.localStorage.removeItem(EVICTED_FLAG_KEY);
      toast({
        title: 'Session terminée',
        description:
          "Vous avez été déconnecté car votre compte s'est connecté sur un autre appareil.",
        variant: 'destructive',
      });
    }
  }, [toast]);

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
      setSetupError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSetupError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSetupLoading(true);
    const sessionId = newSessionId();
    window.sessionStorage.setItem(LOGIN_IN_FLIGHT_KEY, '1');
    // Write to BOTH sessionStorage (tab-local, primary source of truth for the
    // listener) and localStorage (persists across refresh in the same tab).
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
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
        currentSessionId: sessionId,
      });

      window.sessionStorage.removeItem(LOGIN_IN_FLIGHT_KEY);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Setup error:', err);
      window.sessionStorage.removeItem(LOGIN_IN_FLIGHT_KEY);
      window.sessionStorage.removeItem(EXPECTED_UID_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      setSetupError(err.message || 'Erreur lors de la création du compte.');
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
        setError('Utilisateur introuvable. Vérifiez votre nom (insensible à la casse).');
        setLoading(false);
        return;
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data();
      const email = userData.email;

      if (!email) {
        setError('Aucun identifiant associé à cet utilisateur.');
        setLoading(false);
        return;
      }

      if (userData.statut === 'Inactif') {
        setError('Votre compte est désactivé. Contactez un administrateur.');
        setLoading(false);
        return;
      }

      // Single-session: stamp a fresh session id on the user doc and store it
      // locally. Any other device with a different local id will be signed
      // out by the snapshot listener in CurrentUserProvider. Both the in-flight
      // flag and localStorage are set BEFORE signIn so the snapshot listener
      // that attaches via onAuthStateChanged sees a consistent state. The
      // expected-UID guard is also stamped here (userDoc.id is the auth UID)
      // so CurrentUserProvider recognises this tab as the legitimate signer
      // and not a victim of cross-tab IndexedDB hijack.
      const sessionId = newSessionId();
      window.sessionStorage.setItem(LOGIN_IN_FLIGHT_KEY, '1');
      window.sessionStorage.setItem(EXPECTED_UID_KEY, userDoc.id);
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const updates: Record<string, any> = {
        lastLogin: serverTimestamp(),
        currentSessionId: sessionId,
      };
      if (backfillNeeded) updates.nomLowercase = lower;
      await updateDoc(doc(db, 'users', cred.user.uid), updates);
      window.sessionStorage.removeItem(LOGIN_IN_FLIGHT_KEY);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      window.sessionStorage.removeItem(LOGIN_IN_FLIGHT_KEY);
      window.sessionStorage.removeItem(EXPECTED_UID_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Mot de passe incorrect.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Utilisateur introuvable.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Réessayez plus tard.');
      } else {
        setError('Erreur de connexion. Réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth || checkingSetup) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${PAGE_BACKGROUND}`}>
        <PageLoader label="Chargement..." />
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
                <CardTitle className="text-2xl">Configuration initiale</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Aucun utilisateur n&apos;existe encore. Créez le compte administrateur pour commencer.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setup-name">Nom complet de l&apos;administrateur</Label>
                <Input
                  id="setup-name"
                  value={setupName}
                  onChange={e => setSetupName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-password">Mot de passe</Label>
                <Input
                  id="setup-password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={setupPassword}
                  onChange={e => setSetupPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Au moins 6 caractères.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-confirm">Confirmez le mot de passe</Label>
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
                {setupLoading ? 'Création...' : 'Créer le compte Admin'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== NORMAL LOGIN =====
  return (
    <div className={`flex min-h-screen items-center justify-center p-4 ${PAGE_BACKGROUND}`}>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <Logo />
          </div>
          <div>
            <CardTitle className="text-2xl">Connexion</CardTitle>
            <CardDescription className="mt-1">Entrez vos identifiants pour accéder au système.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom complet</Label>
              <Input
                id="nom"
                value={nom}
                onChange={e => setNom(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
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
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
