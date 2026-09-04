// French source string -> English translation. Filled by the i18n sweep.
export const AUTH_EN: Record<string, string> = {
  // ── Session toast ──
  'Session fermée': 'Session closed',
  'Votre session a été fermée. Veuillez vous reconnecter.':
    'Your session has been closed. Please sign in again.',

  // ── First-time setup ──
  'Configuration initiale': 'Initial setup',
  "Aucun utilisateur n'existe encore. Créez le compte administrateur pour commencer.":
    'No users exist yet. Create the administrator account to get started.',
  "Nom complet de l'administrateur": "Administrator's full name",
  'Minimum 6 caractères': 'Minimum 6 characters',
  'Au moins 6 caractères.': 'At least 6 characters.',
  'Confirmez le mot de passe': 'Confirm password',
  'Création...': 'Creating...',
  'Créer le compte Admin': 'Create Admin account',
  'Le mot de passe doit contenir au moins 6 caractères.':
    'Password must be at least 6 characters.',
  'Les mots de passe ne correspondent pas.': 'Passwords do not match.',
  'Erreur lors de la création du compte.': 'Error creating the account.',

  // ── Login form ──
  'Connexion': 'Sign in',
  'Entrez vos identifiants pour accéder au système.':
    'Enter your credentials to access the system.',
  'Nom complet': 'Full name',
  'Mot de passe': 'Password',
  'Connexion...': 'Signing in...',
  'Se connecter': 'Sign in',
  'Comptes de démonstration': 'Demo accounts',

  // ── Login errors ──
  'Utilisateur introuvable. Vérifiez votre nom (insensible à la casse).':
    'User not found. Check your name (case-insensitive).',
  'Aucun identifiant associé à cet utilisateur.':
    'No sign-in credentials are associated with this user.',
  'Votre compte est désactivé. Contactez un administrateur.':
    'Your account is disabled. Contact an administrator.',
  "Ce compte est déjà connecté sur un autre appareil. Déconnectez-vous d'abord de cet appareil pour pouvoir vous connecter ici.":
    'This account is already signed in on another device. Sign out on that device first to sign in here.',
  "Si l'autre appareil n'est plus utilisé, réessayez dans une à deux minutes, ou demandez à un administrateur de déconnecter votre session.":
    'If the other device is no longer in use, try again in a minute or two, or ask an administrator to disconnect your session.',
  'Mot de passe incorrect.': 'Incorrect password.',
  'Utilisateur introuvable.': 'User not found.',
  'Trop de tentatives. Réessayez plus tard.': 'Too many attempts. Try again later.',
  'Erreur de connexion. Réessayez.': 'Sign-in error. Please try again.',
};
