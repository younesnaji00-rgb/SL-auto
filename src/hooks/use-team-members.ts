'use client';

/**
 * The accounts that do one team's work: its members and the « Responsable
 * des … » who leads it (owner ruling 2026-10-14 — a responsable also does
 * their team's work, and appears in that team's pickers with a « Responsable »
 * pill). Roles are read through teamRoleOf, so labels saved in another case
 * (« chiffreur », « Agent de terrain ») count too; an exact `where('role', '==')`
 * missed them.
 *
 * Deactivated accounts are left out: they cannot log in to see the work.
 */

import { useEffect, useState } from 'react';
import { collection } from 'firebase/firestore';
import { onSnapshot } from '@/lib/firestore-logged';
import { useFirestore } from '@/firebase';
import { isTeamLead, teamRoleOf, type TeamRole } from '@/lib/role-access';

export interface TeamMember {
  uid: string;
  /** The account's name as stored (the label pickers and missions use). */
  nom: string;
  prenom: string;
  email: string;
  zone: string;
  /** The team's Responsable. */
  lead: boolean;
}

export function isInactiveAccount(u: Record<string, unknown>): boolean {
  const statut = String(u.statut ?? '').toLowerCase();
  return u.active === false || statut === 'inactif' || statut === 'désactivé' || statut === 'suspendu';
}

export function useTeamMembers(team: TeamRole): { members: TeamMember[]; loading: boolean } {
  const db = useFirestore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: TeamMember[] = [];
        for (const d of snap.docs) {
          const u = d.data() as Record<string, unknown>;
          if (teamRoleOf(String(u.role ?? '')) !== team || isInactiveAccount(u)) continue;
          list.push({
            uid: d.id,
            nom: String(u.nom ?? '').trim(),
            prenom: String(u.prenom ?? '').trim(),
            email: String(u.email ?? '').toLowerCase().trim(),
            zone: String(u.zone ?? '').trim(),
            lead: isTeamLead(String(u.role ?? '')),
          });
        }
        list.sort((a, b) => (a.nom || a.email).localeCompare(b.nom || b.email, 'fr'));
        setMembers(list);
        setLoading(false);
      },
      (err) => {
        console.warn('[use-team-members]', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [db, team]);

  return { members, loading };
}
