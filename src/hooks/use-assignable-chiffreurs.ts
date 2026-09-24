'use client';

/**
 * The chiffreurs a dossier can be sent to = the USER ACCOUNTS with the
 * Chiffreur role (owner ruling 2026-09-24: « un nouveau chiffreur ne peut
 * être ajouté que depuis Utilisateurs »).
 *
 * The picker used to list the `chiffreurs` directory, which the send dialog
 * itself could extend. An entry created there had no account behind it
 * (e.g. « test2 », admin@test.test), so a dossier sent to it appeared in
 * nobody's queue or dashboard. Listing accounts makes that impossible.
 *
 * Each account is mapped to its directory entry when one exists (by uid,
 * then login e-mail, then name) so assignments keep the directory id the
 * workload counts and older chiffrages use; an account with no entry is
 * keyed by its uid, which the queue and dashboard also match on.
 */
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { onSnapshot } from '@/lib/firestore-logged';
import { useFirestore } from '@/firebase';
import { useChiffreurs } from '@/hooks/use-chiffreurs';
import { compactName } from '@/lib/chiffreur-identity';

export interface AssignableChiffreur {
  /** Directory id when the account has an entry, else the account uid. */
  id: string;
  uid: string;
  nom: string;
  email: string;
}

interface ChiffreurAccount {
  uid: string;
  nom: string;
  prenom: string;
  email: string;
  inactive: boolean;
}

export function useAssignableChiffreurs(): { chiffreurs: AssignableChiffreur[]; loading: boolean } {
  const db = useFirestore();
  const { chiffreurs: directory, loading: directoryLoading } = useChiffreurs();
  const [accounts, setAccounts] = useState<ChiffreurAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'Chiffreur')),
      (snap) => {
        setAccounts(
          snap.docs.map((d) => {
            const u = d.data() as Record<string, unknown>;
            const statut = String(u.statut ?? '').toLowerCase();
            return {
              uid: d.id,
              nom: String(u.nom ?? '').trim(),
              prenom: String(u.prenom ?? '').trim(),
              email: String(u.email ?? '').toLowerCase().trim(),
              // A deactivated account cannot log in to see its queue.
              inactive: u.active === false || statut === 'inactif' || statut === 'désactivé' || statut === 'suspendu',
            };
          }),
        );
        setAccountsLoading(false);
      },
      (err) => {
        console.error('[use-assignable-chiffreurs]', err);
        setAccountsLoading(false);
      },
    );
    return () => unsub();
  }, [db]);

  const chiffreurs = useMemo(() => {
    return accounts
      .filter((a) => !a.inactive)
      .map((a) => {
        const full = compactName(`${a.prenom} ${a.nom}`);
        const entry =
          directory.find((c) => c.uid && c.uid === a.uid) ??
          directory.find((c) => a.email && (c.email || '').toLowerCase().trim() === a.email) ??
          directory.find((c) => [compactName(a.nom), full].includes(compactName(c.nom)));
        const nom = [a.prenom, a.nom].filter(Boolean).join(' ') || a.email || a.uid;
        return { id: entry?.id ?? a.uid, uid: a.uid, nom, email: a.email };
      })
      .sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
  }, [accounts, directory]);

  return { chiffreurs, loading: accountsLoading || directoryLoading };
}
