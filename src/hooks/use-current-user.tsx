'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, onSnapshot, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { ROLES_THAT_CAN_DELETE, SINGLE_SESSION_ROLES, type Role } from '@/lib/dossiers-data';
import { collectSessionMeta } from '@/lib/session-meta';

// Single-session enforcement (BLOCK model): the FIRST device to log in claims
// `currentSessionId` on the user doc and holds it. A SECOND device is blocked
// at the login page (see src/app/login/page.tsx) and never overwrites that id,
// so a normal second login no longer evicts the first device. The claim is
// released only by an explicit sign-out on the holding device (which clears
// `currentSessionId`) or by an admin force-disconnect (which clears it
// remotely). The snapshot listener below signs THIS device out whenever the
// remote id stops matching our local id — i.e. when we have been
// force-disconnected or displaced. The session id is written to sessionStorage
// (tab-local, primary) AND localStorage (survives same-tab refresh). Keep keys
// in sync with src/app/login/page.tsx.
const SESSION_STORAGE_KEY = 'sl-auto.session-id';
const LOGIN_IN_FLIGHT_KEY = 'sl-auto.login-in-flight';
// One-shot flag picked up by the login page to render a toast explaining
// why the user landed there (read once, then cleared).
const EVICTED_FLAG_KEY = 'sl-auto.evicted-by-other-device';
// Per-tab UID guard: records which user UID this tab believes itself to be
// signed in as. Firebase Auth's browserLocalPersistence stores the token in
// IndexedDB shared across ALL tabs, so a sign-in in another tab silently
// flips this tab's onAuthStateChanged user too. Comparing the live UID
// against this per-tab marker lets us refuse the hijack without calling
// firebaseSignOut (which would clear the shared IndexedDB and log out the
// legitimate tab as well). Distinct from SESSION_STORAGE_KEY, which is the
// cross-device single-session marker. Keep in sync with src/app/login/page.tsx.
const EXPECTED_UID_KEY = 'sl-auto.expected-uid';
// While a basic-role device holds the session it refreshes `currentSessionSeenAt`
// on this cadence. Login (src/app/login/page.tsx) treats a claim whose timestamp
// is older than STALE_SESSION_MS — or missing entirely — as dead and
// reclaimable, so a device that closed WITHOUT signing out (the common case on
// the Capacitor Android app) can never strand the slot and lock the user out.
const SESSION_HEARTBEAT_MS = 60_000;

// Single-session is intentionally scoped: only the operational roles in
// SINGLE_SESSION_ROLES (Chiffreur / Agent de Terrain / Gestionnaire) are
// restricted to one device at a time. Admin / Directeur* / Responsable
// d'équipe stay free to be logged in on several devices in parallel (often
// needed for oversight). The list lives in src/lib/dossiers-data.ts.

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

  // Tracks which uid we've already stamped lastLogin for during this provider
  // mount. Firebase Auth persists sessions, so most logins are silent resumes —
  // stamping here (rather than only in /login's handleLogin) keeps the field
  // honest. One write per tab mount / refresh; SPA navigation doesn't re-fire
  // onAuthStateChanged, so no extra writes there.
  const stampedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    let unsubDoc: (() => void) | null = null;

    // Single-session heartbeat: while THIS device holds the session, refresh
    // `currentSessionSeenAt` on a cadence (and immediately when the app returns
    // to the foreground — mobile suspends timers in the background) so a login
    // elsewhere can tell a live holder from an abandoned one. Stranded sessions
    // (app killed, crashed, storage cleared) stop beating and become claimable
    // after STALE_SESSION_MS. Best-effort: a failed beat never disrupts the UI.
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let heartbeatActivityHandler: (() => void) | null = null;

    const stopHeartbeat = () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (heartbeatActivityHandler && typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', heartbeatActivityHandler);
        window.removeEventListener('focus', heartbeatActivityHandler);
        heartbeatActivityHandler = null;
      }
    };

    const beat = (uid: string) => {
      // Only refresh while we still believe we hold the session locally; once
      // evicted (local marker cleared) we must not resurrect a session that has
      // moved on. Updating only `currentSessionSeenAt` keeps the owner-update
      // rule happy (it never touches `role`).
      if (!db || !readLocalSessionId()) return;
      updateDoc(doc(db, 'users', uid), { currentSessionSeenAt: serverTimestamp() }).catch((e) =>
        console.debug('[single-session] heartbeat failed (non-fatal):', e),
      );
    };

    const startHeartbeat = (uid: string) => {
      if (heartbeatTimer) return; // already running for this holder
      beat(uid); // immediate, so a just-confirmed hold is fresh right away
      heartbeatTimer = setInterval(() => beat(uid), SESSION_HEARTBEAT_MS);
      heartbeatActivityHandler = () => {
        if (typeof document === 'undefined' || document.visibilityState === 'visible') beat(uid);
      };
      if (typeof window !== 'undefined') {
        document.addEventListener('visibilitychange', heartbeatActivityHandler);
        window.addEventListener('focus', heartbeatActivityHandler);
      }
    };

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }
      stopHeartbeat();

      const expectedUid =
        typeof window !== 'undefined'
          ? window.sessionStorage.getItem(EXPECTED_UID_KEY)
          : null;

      // Cross-tab hijack: another tab in this browser signed in as a
      // different user, flipping the shared Firebase Auth state. Refuse to
      // adopt that identity in this tab. Do NOT firebaseSignOut — that
      // clears the shared IndexedDB and would log out the legitimate tab.
      if (user && expectedUid && user.uid !== expectedUid) {
        console.warn('[single-session] CROSS-TAB MISMATCH', {
          live: user.uid,
          expected: expectedUid,
        });
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(EVICTED_FLAG_KEY, '1');
        }
        setFirebaseUser(null);
        setProfile(null);
        setLoading(false);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
        return;
      }

      // First-time inherit: fresh tab opening into an existing browser-wide
      // session (e.g. user reopens the app after closing the previous tab).
      // Adopt the current auth UID as this tab's expected identity.
      if (user && !expectedUid && typeof window !== 'undefined') {
        window.sessionStorage.setItem(EXPECTED_UID_KEY, user.uid);
      }

      setFirebaseUser(user);

      if (user && db) {
        if (stampedUidRef.current !== user.uid) {
          stampedUidRef.current = user.uid;
          updateDoc(doc(db, 'users', user.uid), { lastLogin: serverTimestamp() })
            .catch((e) => console.warn('lastLogin stamp failed:', e));
        }

        // Live subscription enforcing the BLOCK model in real time. The first
        // device claims `currentSessionId`; a second basic-role device is
        // blocked at /login and never overwrites it. This listener signs THIS
        // device out only when it discovers it no longer holds the session
        // (admin force-disconnect cleared the id, or it was displaced) — never
        // because a second device logged in. `isFirstSnapshot` gates the
        // one-time legacy claim so a remote id that goes null on a LATER
        // snapshot is treated as a force-disconnect, not a reason to re-claim.
        let isFirstSnapshot = true;
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
            // Only SERVER-confirmed snapshots drive claim/eviction decisions. A
            // cached snapshot (offline, reconnecting, or a wedged long-poll —
            // see experimentalForceLongPolling) can momentarily show a stale or
            // missing currentSessionId; acting on it would sign an idle sole
            // device out and strand `currentSessionId` on the doc, which then
            // blocked that SAME device from logging back in ("session already
            // active"). A genuine force-disconnect/displacement is a real
            // content change delivered from the server, so it is still caught —
            // directly on the confirmed snapshot, with no extra read to fail.
            const fromServer = !snap.metadata.fromCache;
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
                fromServer,
                tabPath: window.location.pathname,
              });
            }

            const roleEnforced = SINGLE_SESSION_ROLES.has(data.role);

            // Sign THIS device out and bounce to /login. Used when we discover
            // we no longer hold the session (force-disconnect / displacement).
            const evictThisDevice = async () => {
              stopHeartbeat();
              if (typeof window !== 'undefined') {
                window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
                window.sessionStorage.removeItem(EXPECTED_UID_KEY);
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
            };

            if (fromServer && !loginInFlight && roleEnforced) {
              // Consume the first-snapshot flag on the first SERVER-confirmed
              // evaluation (a cached first snapshot must not burn the flag or
              // arm the legacy claim).
              const firstServerSnapshot = isFirstSnapshot;
              isFirstSnapshot = false;
              if (remoteSessionId) {
                // Someone holds the session. If it's not us (force-disconnect
                // re-claimed elsewhere, or a displaced legacy session) → sign
                // out. A normal second-device login NEVER reaches here because
                // that device is blocked at /login and never writes the id.
                if (!localSessionId || remoteSessionId !== localSessionId) {
                  console.warn('[single-session] EVICTING (displaced)', { remote: remoteSessionId, local: localSessionId });
                  await evictThisDevice();
                  return;
                }
                // remote === local → we still hold it. Keep the heartbeat alive
                // so a login elsewhere sees this device as live, not abandoned.
                startHeartbeat(user.uid);
              } else if (localSessionId) {
                // We thought we held the session but the remote id was cleared
                // → admin force-disconnect (or explicit sign-out elsewhere).
                console.warn('[single-session] EVICTING (session cleared remotely)', { local: localSessionId });
                await evictThisDevice();
                return;
              } else if (firstServerSnapshot) {
                // Legacy persisted-auth with no session id anywhere, observed on
                // the FIRST snapshot. Claim one so a future force-disconnect is
                // detectable. Only ever runs once per listener — a remote id
                // that goes null on a later snapshot is a force-disconnect
                // (handled below), NOT a reason to silently re-claim.
                const claimId = newSessionId();
                if (typeof window !== 'undefined') {
                  window.sessionStorage.setItem(SESSION_STORAGE_KEY, claimId);
                  window.localStorage.setItem(SESSION_STORAGE_KEY, claimId);
                }
                // Stamp the claim + device/IP for the admin session card. The
                // /api/client-ip round-trip widens the gap between observing the
                // empty slot and writing, so mirror the login page's claim-or-
                // block: collect meta first, then a transaction that only writes
                // if the slot is STILL free — otherwise a device that legitimately
                // claimed during the fetch would be clobbered. collectSessionMeta
                // never rejects (IP failure → null).
                collectSessionMeta()
                  .then((meta) =>
                    runTransaction(db, async (tx) => {
                      const ref = doc(db, 'users', user.uid);
                      const fresh = await tx.get(ref);
                      const remote = fresh.exists() ? (fresh.data() as any).currentSessionId : null;
                      // Someone else took the slot during the meta fetch → abort
                      // rather than resurrect a session that has moved on. The
                      // next snapshot evicts this device (remote !== local).
                      if (remote && remote !== claimId) return;
                      // First heartbeat alongside the claim — the next server
                      // snapshot confirms remote === local and starts the timer.
                      tx.update(ref, { currentSessionId: claimId, currentSessionSeenAt: serverTimestamp() });
                      // Device + IP in the admin-only subcollection (off the
                      // world-readable user doc).
                      tx.set(doc(db, 'users', user.uid, 'session_meta', 'current'), {
                        device: meta.device,
                        ip: meta.ip,
                        at: serverTimestamp(),
                      });
                    }),
                  )
                  .catch((e) => console.warn('Session claim failed:', e));
              } else {
                // remote AND local both null on a LATER snapshot → the id was
                // cleared remotely (admin force-disconnect) after we lost our
                // local marker. Do NOT re-claim — sign out so the rescue sticks.
                console.warn('[single-session] EVICTING (session cleared remotely, no local marker)');
                await evictThisDevice();
                return;
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
        stopHeartbeat();
        stampedUidRef.current = null;
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
      stopHeartbeat();
    };
  }, [auth, db]);

  const handleSignOut = async () => {
    if (!auth) return;
    // Strict single-session: release our claim so another device can log in.
    // Guarded transaction — only clear `currentSessionId` when it's still ours,
    // so we never clobber a session that has already moved to another device.
    // Runs while we are still authenticated (rules require owner auth to write).
    const uid = auth.currentUser?.uid;
    const localId = readLocalSessionId();
    if (uid && db && localId) {
      try {
        await runTransaction(db, async (tx) => {
          const ref = doc(db, 'users', uid);
          const snap = await tx.get(ref);
          if (snap.exists() && (snap.data() as any).currentSessionId === localId) {
            tx.update(ref, { currentSessionId: null, currentSessionSeenAt: null });
            tx.delete(doc(db, 'users', uid, 'session_meta', 'current'));
          }
        });
      } catch (e) {
        console.warn('Session release on sign-out failed (non-fatal):', e);
      }
    }
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(EXPECTED_UID_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    await firebaseSignOut(auth);
    setProfile(null);
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

/**
 * Wrap a subtree to force a read-only view: `canWrite` returns false for every
 * section, `canDelete`/`isAdmin` are false. The real `profile` is preserved (so
 * names/roles still resolve). Used by the rappel treatment replica so the live
 * dossier-timeline components render in their read-only display mode for a
 * manager who would otherwise have write access. No edits to the (frozen) tab
 * components are needed — they already gate on `canWrite('dossiers')`.
 */
export function ReadOnlyUserScope({ children }: { children: React.ReactNode }) {
  const ctx = useContext(CurrentUserContext);
  const value = useMemo<CurrentUserContextType>(
    () => ({ ...ctx, canWrite: () => false, canDelete: false, isAdmin: false }),
    [ctx],
  );
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
