'use client';

/**
 * The agents a mission can be given to: the `options_agents` list (one entry
 * per Agent de Terrain account, written by Utilisateurs) joined with the
 * accounts — an entry with no account is left out — plus the Responsable des
 * agents de terrain, who goes on site too
 * (owner ruling 2026-10-14) and has no entry there. Each agent says whether
 * it is the team's Responsable (« Responsable » pill) and carries its uid when
 * an account bears its name.
 *
 * Missions name their agent by this label (= the account's `nom`), so a
 * responsable's missions reach them like any agent's.
 */

import { useMemo } from 'react';
import { useOptions, type Option } from '@/hooks/use-options';
import { useTeamMembers } from '@/hooks/use-team-members';

export interface AssignableAgent extends Option {
  uid?: string;
  lead: boolean;
}

const nameKey = (s: string | null | undefined) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

export function useAssignableAgents({ includeInactive = false }: { includeInactive?: boolean } = {}): {
  agents: AssignableAgent[];
  loading: boolean;
} {
  const { options, loading: optionsLoading } = useOptions('options_agents');
  const { members, loading: membersLoading } = useTeamMembers('Agent de Terrain');

  const agents = useMemo(() => {
    const byName = new Map(members.map((m) => [nameKey(m.nom), m]));
    const seen = new Set<string>();
    const out: AssignableAgent[] = [];
    for (const o of options) {
      if (!includeInactive && o.active === false) continue;
      const key = nameKey(o.label);
      const m = byName.get(key);
      // An entry no account bears (« Agent de terrain 1 », typed when the
      // list had a gear): a visit given to it reaches nobody (owner
      // 2026-10-19). Every account is listed below anyway.
      if (!m) continue;
      seen.add(key);
      out.push({ ...o, zone: o.zone || m.zone || undefined, uid: m.uid, lead: m.lead });
    }
    // Accounts with no entry: the Responsable, or an agent created before the
    // list was kept in sync — listed after the others.
    for (const m of members) {
      const key = nameKey(m.nom);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ id: `user-${m.uid}`, label: m.nom, order: Number.MAX_SAFE_INTEGER, active: true, zone: m.zone || undefined, uid: m.uid, lead: m.lead });
    }
    return out;
  }, [options, members, includeInactive]);

  return { agents, loading: optionsLoading || membersLoading };
}
