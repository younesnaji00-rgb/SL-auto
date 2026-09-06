'use client';

/**
 * One Firestore subscription set for every role dashboard.
 *
 * The role dashboards read the SAME sources as the queues and the Suivi
 * d'équipe funnel (dossiers, `chiffrages`, `planifications` group, `rappels`),
 * so a number on the dashboard always agrees with the queue it summarises.
 * Listeners the role cannot use are simply not attached (`users` and the
 * `workflow` group are admin-only).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useHolidays } from '@/hooks/use-holidays';
import type { Rappel } from '@/hooks/use-rappels';
import type { FunnelDossier, WorkflowLog } from '../monitoring/funnel';
import type { ChiffrageAssignment, TerrainMission } from '../monitoring/metrics';
import type { StructuredDevis } from '@/lib/devis-schema';

/** `chiffrages/{id}` with the queue's extra fields the dashboard shows. */
export interface DashboardChiffrage extends ChiffrageAssignment {
  dossierNom?: string;
  status?: string;
  files?: unknown[];
  sentByNom?: string;
  /** Structured devis snapshots keyed by doc type (`Devis Garage`, `Devis accordé`, …). */
  structuredEditables?: Record<string, StructuredDevis>;
}

/** `dossiers/{id}/planifications/{pid}` with the fields the terrain queue shows. */
export interface DashboardMission extends TerrainMission {
  dossierNom?: string;
  zone?: string;
  adresse?: string;
  checkinAt?: any;
  checkinLat?: number;
  checkinLng?: number;
  agentTerrainUid?: string | null;
}

export interface DashboardUser {
  id: string;
  nom?: string;
  prenom?: string;
  email?: string;
  role?: string;
  statut?: string;
}

export interface DashboardData {
  dossiers: FunnelDossier[];
  chiffrages: DashboardChiffrage[];
  missions: DashboardMission[];
  /** Rappels addressed to the current user. */
  rappelsRecus: Rappel[];
  /** Rappels the current user sent. */
  rappelsEnvoyes: Rappel[];
  users: DashboardUser[];
  workflowLogs: WorkflowLog[];
  holidays: ReadonlySet<string>;
  loading: boolean;
  /** Time of the last snapshot received from any listener (the freshness stamp). */
  updatedAt: Date | null;
}

export interface DashboardDataOptions {
  /** Attach the `users` listener (admin views only). */
  withUsers?: boolean;
  /** Attach the `workflow` collection-group listener (activity feed). */
  withWorkflow?: boolean;
  /** Attach the rappel listeners (gestionnaire / admin). */
  withRappels?: boolean;
}

export function useDashboardData(opts: DashboardDataOptions = {}): DashboardData {
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const holidays = useHolidays();
  const uid = profile?.uid;
  const compagnieScope = useMemo(
    () => (profile?.compagnies || []).map((c: string) => c.toLowerCase().trim()),
    [profile?.compagnies],
  );

  const [dossiers, setDossiers] = useState<FunnelDossier[]>([]);
  const [chiffrages, setChiffrages] = useState<DashboardChiffrage[]>([]);
  const [missions, setMissions] = useState<DashboardMission[]>([]);
  const [rappelsRecus, setRappelsRecus] = useState<Rappel[]>([]);
  const [rappelsEnvoyes, setRappelsEnvoyes] = useState<Rappel[]>([]);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);
  const [dossiersLoaded, setDossiersLoaded] = useState(false);
  const [chiffragesLoaded, setChiffragesLoaded] = useState(false);
  const [missionsLoaded, setMissionsLoaded] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const touch = () => setUpdatedAt(new Date());

  const { withUsers = false, withWorkflow = false, withRappels = false } = opts;

  useEffect(() => {
    if (!db) return;
    const scope = compagnieScope;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        query(collection(db, 'dossiers'), orderBy('createdAt', 'desc')),
        (snap) => {
          let data: FunnelDossier[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          if (scope.length > 0) {
            data = data.filter((d) => scope.includes((d.compagnie || '').toLowerCase().trim()));
          }
          setDossiers(data);
          setDossiersLoaded(true);
          touch();
        },
        (err) => {
          console.error('Dashboard dossiers sync error:', err);
          setDossiersLoaded(true);
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'chiffrages'),
        (snap) => {
          setChiffrages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
          setChiffragesLoaded(true);
          touch();
        },
        (err) => {
          console.warn('Dashboard chiffrages sync error:', err);
          setChiffragesLoaded(true);
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        collectionGroup(db, 'planifications'),
        (snap) => {
          setMissions(
            snap.docs.map((d) => ({
              id: d.id,
              dossierId: d.ref.parent.parent?.id || '',
              ...(d.data() as any),
            })),
          );
          setMissionsLoaded(true);
          touch();
        },
        (err) => {
          console.warn('Dashboard planifications sync error:', err);
          setMissionsLoaded(true);
        },
      ),
    );

    if (withUsers) {
      unsubs.push(
        onSnapshot(
          collection(db, 'users'),
          (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
          (err) => console.warn('Dashboard users sync error:', err),
        ),
      );
    }

    if (withWorkflow) {
      unsubs.push(
        onSnapshot(
          query(collectionGroup(db, 'workflow'), orderBy('date', 'desc')),
          (snap) =>
            setWorkflowLogs(
              snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
                _dossierId: d.ref.parent.parent?.id || '',
              })),
            ),
          (err) => console.warn('Dashboard workflow sync error:', err),
        ),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [db, compagnieScope, withUsers, withWorkflow]);

  useEffect(() => {
    if (!db || !uid || !withRappels) return;
    const unsubRecus = onSnapshot(
      query(collection(db, 'rappels'), where('recipientUid', '==', uid)),
      (snap) => {
        setRappelsRecus(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        touch();
      },
      (err) => console.warn('Dashboard rappels reçus sync error:', err),
    );
    const unsubEnvoyes = onSnapshot(
      query(collection(db, 'rappels'), where('senderUid', '==', uid)),
      (snap) => setRappelsEnvoyes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      (err) => console.warn('Dashboard rappels envoyés sync error:', err),
    );
    return () => {
      unsubRecus();
      unsubEnvoyes();
    };
  }, [db, uid, withRappels]);

  return {
    dossiers,
    chiffrages,
    missions,
    rappelsRecus,
    rappelsEnvoyes,
    users,
    workflowLogs,
    holidays,
    loading: !(dossiersLoaded && chiffragesLoaded && missionsLoaded),
    updatedAt,
  };
}
