'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { ROLES_THAT_CAN_DELETE, type Role } from '@/lib/dossiers-data';

interface UserProfile {
  uid: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  compagnies: string[];
  statut: string;
  password?: string;
}

type Section = 'dossiers' | 'assignations-chiffrage' | 'assignations-atg' | 'utilisateurs';

/** Returns true if the given role can write/delete in the given section */
function canRoleWrite(role: string | undefined, section: Section): boolean {
  if (!role) return false;
  if (role === 'Admin') return true;
  // Directeur-family roles are read + validate, not write. They do get
  // delete permission elsewhere (see canRoleDelete below).
  if (
    role === 'Directeur des opérations' ||
    role === 'Directeur' ||
    role === 'Directeur technique'
  ) return false;
  switch (section) {
    case 'dossiers': return role === 'Gestionnaire' || role === "Responsable d'équipe";
    case 'assignations-chiffrage': return role === 'Chiffreur';
    case 'assignations-atg': return role === 'Agent de Terrain';
    case 'utilisateurs': return false;
    default: return false;
  }
}

/** Returns true if the given role may delete records anywhere in the app. */
function canRoleDelete(role: string | undefined): boolean {
  if (!role) return false;
  return ROLES_THAT_CAN_DELETE.has(role);
}

/** Returns true if the given role may validate a dossier's rapport. */
export function canValidateRapport(role: Role | undefined | null): boolean {
  return role === 'Admin'
    || role === 'Directeur des opérations'
    || role === 'Directeur'
    || role === 'Directeur technique';
}

interface CurrentUserContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  canWrite: (section: Section) => boolean;
  /** True iff the current user's role is admin or a directeur-family role.
   *  Drives the visibility of every Delete/Trash UI element. See item 011. */
  canDelete: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextType>({
  firebaseUser: null,
  profile: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  canWrite: () => false,
  canDelete: false,
});

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const db = useFirestore();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user && db) {
        try {
          // Look up the user's profile in Firestore by their auth UID
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile({
              uid: user.uid,
              nom: data.nom || '',
              prenom: data.prenom || '',
              email: data.email || user.email || '',
              role: data.role || 'Gestionnaire',
              compagnies: data.compagnies || [],
              statut: data.statut || 'Actif',
              password: data.password || '',
            });
          } else {
            // Auth user exists but no Firestore profile — could be a legacy user
            setProfile(null);
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  const handleSignOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
      setProfile(null);
    }
  };

  const isAdmin = profile?.role === 'Admin';
  const canWrite = (section: Section) => canRoleWrite(profile?.role, section);
  const canDelete = canRoleDelete(profile?.role);

  return (
    <CurrentUserContext.Provider value={{ firebaseUser, profile, isAdmin, loading, signOut: handleSignOut, canWrite, canDelete }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
