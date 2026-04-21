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

const PAGE_BACKGROUND =
  'bg-[radial-gradient(ellipse_at_top,hsl(var(--card))_0%,hsl(var(--background))_70%)]';

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  const [nom, setNom] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect already-authenticated users to dashboard
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setCheckingAuth(false);
      }
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
    try {
      const email = generateEmail(setupName);
      const cred = await createUserWithEmailAndPassword(auth, email, setupPassword);

      await setDoc(doc(db, 'users', cred.user.uid), {
        nom: setupName.trim(),
        prenom: '',
        email: email,
        password: setupPassword,
        role: 'Admin',
        compagnies: [],
        statut: 'Actif',
        createdAt: serverTimestamp(),
        lastLogin: null,
      });

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Setup error:', err);
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
      const q = query(collection(db, 'users'), where('nom', '==', nom.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('Utilisateur introuvable. Vérifiez votre nom.');
        setLoading(false);
        return;
      }

      const userData = snap.docs[0].data();
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

      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Update lastLogin timestamp
      await updateDoc(doc(db, 'users', cred.user.uid), { lastLogin: serverTimestamp() });
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
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
