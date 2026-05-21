'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { ROLES_THAT_CAN_DELETE, type Role } from '@/lib/dossiers-data';

// Single-session enforcement: each login writes a fresh `currentSessionId` to
// the user doc, to sessionStorage (tab-local — the source of truth), AND to
// localStorage (so a refresh in the same tab can resume). The snapshot listener
// below evicts this client (firebaseSignOut + redirect) whenever the remote id
// no longer matches the tab-local one. Using sessionStorage as primary lets us
// distinguish tabs/windows within the SAME browser profile — critical for the
// "single device" guarantee. Keep keys in sync with src/app/login/page.tsx.
const SESSION_STORAGE_KEY = 'sl-auto.session-id';
const LOGIN_IN_FLIGHT_KEY = 'sl-auto.login-in-flight';
// One-shot flag picked up by the login page to render a toast explaining
// why the user landed there (read once, then cleared).
const EVICTED_FLAG_KEY = 'sl-auto.evicted-by-other-device';

// Single-session is intentionally scoped: only the operational roles below
// are restricted to one device at a time. Admin / Directeur* / Responsable
// d'équipe stay free to be logged in on several devices in parallel (often
// needed for oversight). Keep these strings in sync with src/lib/dossiers-data.ts.
const SINGLE_SESSION_ROLES = new Set(['Chiffreur', 'Agent de Terrain', 'Gestionnaire']);

/**
 * Read the effective session id for this tab. Prefer sessionStorage (tab-local).
 * Fall back to localStorage (browser-wide) so a tab that opens fresh AFTER a
 * successful login in another tab inherits the same id and doesn't self-evict.
 * Promotes the localStorage value into sessionStorage so subsequent reads in
 * this tab are stable.
 */
function readLocalSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  const sid = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (sid) return sid;
  const fromLocal = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (fromLocal) {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, fromLocal);
    return fromLocal;
  }
  return null;
}

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface UserProfile {
  uid: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  compagnies: string[];
  statut: string;
  password?: string;
  assignedStampIds: string[];
  /** Per-user override: nav `href` values that are EXPLICITLY HIDDEN for this
   *  user even though their role would otherwise allow them. Used for
   *  temporary revocation. `/signaler-bug` is never enforced — see
   *  `src/components/layout/sidebar.tsx`. */
  deniedNavItems: string[];
  /** Per-user override: nav `href` values that are EXPLICITLY VISIBLE for this
   *  user even though their role would not otherwise allow them. Used for
   *  temporary privilege grants. Granted entries take precedence over the
   *  role gate AND over `deniedNavItems` — clean writes from the admin UI
   *  guarantee no href appears in both lists. */
  grantedNavItems: string[];
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
    let unsubDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }
      setFirebaseUser(user);

      if (user && db) {
        // Live subscription so single-session evictions land in real time:
        // another device's login writes a new currentSessionId; this listener
        // sees the mismatch and signs the older device out.
        unsubDoc = onSnapshot(
          doc(db, 'users', user.uid),
          async (snap) => {
            if (!snap.exists()) {
              setProfile(null);
              setLoading(false);
              return;
            }
            const data = snap.data();
            const remoteSessionId: string | undefined = data.currentSessionId;
            const localSessionId = readLocalSessionId();
            const loginInFlight =
              typeof window !== 'undefined' &&
              window.sessionStorage.getItem(LOGIN_IN_FLIGHT_KEY) === '1';

            // Diagnostic log — keeps a paper trail when investigating eviction
            // issues. Cheap (fires per snapshot, once per user-doc change).
            if (typeof window !== 'undefined') {
              console.debug('[single-session]', {
                remote: remoteSessionId,
                local: localSessionId,
                loginInFlight,
                tabPath: window.location.pathname,
              });
            }

            const roleEnforced = SINGLE_SESSION_ROLES.has(data.role);

            if (!loginInFlight && roleEnforced) {
              // Eviction: another device/tab claimed this session. We evict
              // whenever remote is set and either we have no local id (legacy
              // pre-feature persisted-auth) or our local id no longer matches.
              if (
                remoteSessionId &&
                (!localSessionId || remoteSessionId !== localSessionId)
              ) {
                console.warn('[single-session] EVICTING', { remote: remoteSessionId, local: localSessionId });
                if (typeof window !== 'undefined') {
                  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
                  window.localStorage.removeItem(SESSION_STORAGE_KEY);
                  window.localStorage.setItem(EVICTED_FLAG_KEY, '1');
                }
                try {
                  await firebaseSignOut(auth);
                } catch (err) {
                  console.error('Single-session eviction signOut failed:', err);
                }
                setProfile(null);
                setLoading(false);
                if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                  window.location.assign('/login');
                }
                return;
              }
              // Claim: pre-feature persisted-auth devices reach here with a
              // null remote id. Stamp a fresh id on both sides so the next
              // login on another device produces a detectable mismatch and
              // evicts us. Fire-and-forget; the resulting snapshot will match.
              if (!remoteSessionId) {
                const claimId = localSessionId || newSessionId();
                if (!localSessionId && typeof window !== 'undefined') {
                  window.sessionStorage.setItem(SESSION_STORAGE_KEY, claimId);
                  window.localStorage.setItem(SESSION_STORAGE_KEY, claimId);
                }
                updateDoc(doc(db, 'users', user.uid), { currentSessionId: claimId })
                  .catch((e) => console.warn('Session claim failed:', e));
              }
            }
            setProfile({
              uid: user.uid,
              nom: data.nom || '',
              prenom: data.prenom || '',
              email: data.email || user.email || '',
              role: data.role || 'Gestionnaire',
              compagnies: data.compagnies || [],
              statut: data.statut || 'Actif',
              password: data.password || '',
              assignedStampIds: Array.isArray(data.assignedStampIds)
                ? data.assignedStampIds
                : data.assignedStampId
                  ? [data.assignedStampId]
                  : [],
              deniedNavItems: Array.isArray(data.deniedNavItems)
                ? data.deniedNavItems.filter((v: unknown): v is string => typeof v === 'string')
                : [],
              grantedNavItems: Array.isArray(data.grantedNavItems)
                ? data.grantedNavItems.filter((v: unknown): v is string => typeof v === 'string')
                : [],
            });
            setLoading(false);
          },
          (err) => {
            console.error('User profile listener error:', err);
            setProfile(null);
            setLoading(false);
          },
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, [auth, db]);

  const handleSignOut = async () => {
    if (auth) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
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
