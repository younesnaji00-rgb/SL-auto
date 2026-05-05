import { ACCORD_BUCKET_MEMBERS } from '@/lib/dossiers-data';

export type StepKey =
  | 'creation'
  | 'photosAvant'
  | 'photosEnCours'
  | 'photosApres'
  | 'accord'
  | 'facture'
  | 'rapport';

export const STEP_KEYS: StepKey[] = [
  'creation',
  'photosAvant',
  'photosEnCours',
  'photosApres',
  'accord',
  'facture',
  'rapport',
];

export const STEP_LABELS: Record<StepKey, string> = {
  creation: 'Missions reçues / créées',
  photosAvant: 'Expertise avant',
  photosEnCours: 'Expertise en cours',
  photosApres: 'Expertise après',
  accord: 'Accord',
  facture: 'Facture validée',
  rapport: 'Rapport déposé',
};

export const STEP_LABELS_SHORT: Record<StepKey, string> = {
  creation: 'Création',
  photosAvant: 'Avant',
  photosEnCours: 'En cours',
  photosApres: 'Après',
  accord: 'Accord',
  facture: 'Facture',
  rapport: 'Rapport',
};

export interface StepCounts {
  realise: number;
  nonRealise: number;
  bloqueIci: number;
}

export interface FunnelRange {
  from?: Date;
  to?: Date;
}

export interface FunnelDossier {
  id: string;
  compagnie?: string;
  statut?: string;
  createdAt?: any;
  createdBy?: string;
  datePhotosAvant?: any;
  datePhotosEnCours?: any;
  datePhotosApres?: any;
  lastStatusChange?: { status?: string; at?: any; by?: string };
  dateFactureValide?: any;
  authorFactureValide?: string;
  dateRapportDepose?: any;
  authorRapportDepose?: string;
}

export interface WorkflowLog {
  _dossierId?: string;
  action?: string;
  date?: any;
  user?: string;
  details?: string;
}

const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (v instanceof Date) return v;
  return null;
};

const inRange = (d: Date | null, range?: FunnelRange) => {
  if (!d) return false;
  if (!range) return true;
  if (range.from && d < range.from) return false;
  if (range.to && d > range.to) return false;
  return true;
};

const photoAuthor = (
  d: FunnelDossier,
  logs: WorkflowLog[],
  category: 'avant' | 'en cours' | 'après',
): string | null => {
  // logs are assumed sorted desc by date by the caller (matches dashboard subscription).
  // We pick the most recent matching log for the given dossier + category.
  const match = logs.find((l) => {
    if (l._dossierId !== d.id) return false;
    const action = (l.action || '').toLowerCase();
    return action.includes('photo') && action.includes(category);
  });
  return match?.user ?? null;
};

export interface StepDef {
  key: StepKey;
  label: string;
  doneAt(d: FunnelDossier): Date | null;
  authorOf(d: FunnelDossier, logs: WorkflowLog[]): string | null;
}

export const STEP_DEFS: Record<StepKey, StepDef> = {
  creation: {
    key: 'creation',
    label: STEP_LABELS.creation,
    doneAt: (d) => toDate(d.createdAt),
    authorOf: (d) => d.createdBy ?? null,
  },
  photosAvant: {
    key: 'photosAvant',
    label: STEP_LABELS.photosAvant,
    doneAt: (d) => toDate(d.datePhotosAvant),
    authorOf: (d, logs) => photoAuthor(d, logs, 'avant'),
  },
  photosEnCours: {
    key: 'photosEnCours',
    label: STEP_LABELS.photosEnCours,
    doneAt: (d) => toDate(d.datePhotosEnCours),
    authorOf: (d, logs) => photoAuthor(d, logs, 'en cours'),
  },
  photosApres: {
    key: 'photosApres',
    label: STEP_LABELS.photosApres,
    doneAt: (d) => toDate(d.datePhotosApres),
    authorOf: (d, logs) => photoAuthor(d, logs, 'après'),
  },
  accord: {
    key: 'accord',
    label: STEP_LABELS.accord,
    doneAt: (d) => {
      const status = d.lastStatusChange?.status ?? d.statut;
      if (status && ACCORD_BUCKET_MEMBERS.has(status)) {
        return toDate(d.lastStatusChange?.at);
      }
      return null;
    },
    authorOf: (d) => d.lastStatusChange?.by ?? null,
  },
  facture: {
    key: 'facture',
    label: STEP_LABELS.facture,
    doneAt: (d) => toDate(d.dateFactureValide),
    authorOf: (d) => d.authorFactureValide ?? null,
  },
  rapport: {
    key: 'rapport',
    label: STEP_LABELS.rapport,
    doneAt: (d) => toDate(d.dateRapportDepose),
    authorOf: (d) => d.authorRapportDepose ?? null,
  },
};

const isStepDone = (d: FunnelDossier, key: StepKey): boolean =>
  STEP_DEFS[key].doneAt(d) != null;

/** Furthest completed step index (0..n-1). -1 if no step is done. */
export const furthestStepIndex = (d: FunnelDossier): number => {
  let last = -1;
  for (let i = 0; i < STEP_KEYS.length; i++) {
    if (isStepDone(d, STEP_KEYS[i])) last = i;
  }
  return last;
};

/**
 * The step where the dossier is currently stuck = next gap after the furthest
 * completed step. -1 if the dossier has no step done OR every step is done.
 */
export const stuckAtStepIndex = (d: FunnelDossier): number => {
  const last = furthestStepIndex(d);
  if (last < 0) return -1;
  if (last >= STEP_KEYS.length - 1) return -1;
  return last + 1;
};

const emptyCounts = (): Record<StepKey, StepCounts> =>
  STEP_KEYS.reduce((acc, k) => {
    acc[k] = { realise: 0, nonRealise: 0, bloqueIci: 0 };
    return acc;
  }, {} as Record<StepKey, StepCounts>);

/**
 * For each step, count:
 *  - realise: step done AND its date falls in range
 *  - nonRealise: step's date is NOT set on the dossier
 *  - bloqueIci: dossier is currently stuck right at this step
 */
export const computeStepCounts = (
  dossiers: FunnelDossier[],
  range: FunnelRange,
): Record<StepKey, StepCounts> => {
  const out = emptyCounts();
  for (const d of dossiers) {
    const stuck = stuckAtStepIndex(d);
    for (let i = 0; i < STEP_KEYS.length; i++) {
      const key = STEP_KEYS[i];
      const at = STEP_DEFS[key].doneAt(d);
      if (at != null) {
        if (inRange(at, range)) out[key].realise += 1;
      } else {
        out[key].nonRealise += 1;
        if (stuck === i) out[key].bloqueIci += 1;
      }
    }
  }
  return out;
};

export const computePerCompagnieCounts = (
  dossiers: FunnelDossier[],
  range: FunnelRange,
): Array<{ compagnie: string; counts: Record<StepKey, StepCounts> }> => {
  const groups = new Map<string, FunnelDossier[]>();
  for (const d of dossiers) {
    const key = (d.compagnie || '').trim() || '— non précisé —';
    const arr = groups.get(key) || [];
    arr.push(d);
    groups.set(key, arr);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([compagnie, arr]) => ({ compagnie, counts: computeStepCounts(arr, range) }));
};

export interface PerUserRow {
  user: string;
  realise: Record<StepKey, number>;
  totalRealise: number;
  bottleneck: number;
}

/**
 * Per-user breakdown:
 *  - realise[stepKey]: # dossiers where the user authored this step AND it happened in range
 *  - bottleneck: # dossiers where the user did the LAST completed step (i.e. the
 *    work is now waiting on whatever comes next — they're the holder of the baton)
 */
export const computePerUserCounts = (
  dossiers: FunnelDossier[],
  logs: WorkflowLog[],
  range: FunnelRange,
): PerUserRow[] => {
  const map = new Map<string, PerUserRow>();
  const ensure = (user: string): PerUserRow => {
    let row = map.get(user);
    if (!row) {
      row = {
        user,
        realise: STEP_KEYS.reduce((acc, k) => {
          acc[k] = 0;
          return acc;
        }, {} as Record<StepKey, number>),
        totalRealise: 0,
        bottleneck: 0,
      };
      map.set(user, row);
    }
    return row;
  };

  for (const d of dossiers) {
    for (const key of STEP_KEYS) {
      const at = STEP_DEFS[key].doneAt(d);
      if (!at || !inRange(at, range)) continue;
      const author = STEP_DEFS[key].authorOf(d, logs);
      if (!author) continue;
      const row = ensure(author);
      row.realise[key] += 1;
      row.totalRealise += 1;
    }

    const last = furthestStepIndex(d);
    if (last >= 0 && last < STEP_KEYS.length - 1) {
      const author = STEP_DEFS[STEP_KEYS[last]].authorOf(d, logs);
      if (author) ensure(author).bottleneck += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.bottleneck - a.bottleneck || b.totalRealise - a.totalRealise);
};
