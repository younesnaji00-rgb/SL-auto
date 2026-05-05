import { ACCORD_BUCKET_MEMBERS } from '@/lib/dossiers-data';

export type StepKey =
  | 'creation'
  | 'photosAvant'
  | 'photosEnCours'
  | 'photosApres'
  | 'accord'
  | 'facture'
  | 'rapportValide'
  | 'rapport';

export const STEP_KEYS: StepKey[] = [
  'creation',
  'photosAvant',
  'photosEnCours',
  'photosApres',
  'accord',
  'facture',
  'rapportValide',
  'rapport',
];

export const STEP_LABELS: Record<StepKey, string> = {
  creation: 'Missions reçues / créées',
  photosAvant: 'Expertise avant',
  photosEnCours: 'Expertise en cours',
  photosApres: 'Expertise après',
  accord: 'Accord',
  facture: 'Facture validée',
  rapportValide: 'Rapport validé',
  rapport: 'Rapport déposé',
};

export const STEP_LABELS_SHORT: Record<StepKey, string> = {
  creation: 'Création',
  photosAvant: 'Avant',
  photosEnCours: 'En cours',
  photosApres: 'Après',
  accord: 'Accord',
  facture: 'Facture',
  rapportValide: 'Validé',
  rapport: 'Rapport',
};

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
  directorValidated?: { by?: string; at?: any; role?: string } | null;
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
  rapportValide: {
    key: 'rapportValide',
    label: STEP_LABELS.rapportValide,
    doneAt: (d) => toDate(d.directorValidated?.at),
    authorOf: (d) => d.directorValidated?.by ?? null,
  },
  rapport: {
    key: 'rapport',
    label: STEP_LABELS.rapport,
    doneAt: (d) => toDate(d.dateRapportDepose),
    authorOf: (d) => d.authorRapportDepose ?? null,
  },
};

const emptyCounts = (): Record<StepKey, number> =>
  STEP_KEYS.reduce((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as Record<StepKey, number>);

/**
 * For each step, count the dossiers that have completed it. Step `creation`
 * counts every dossier passed in (no date filter — it's the total in scope).
 * Other steps count only dossiers whose step timestamp falls in `range`.
 */
export const computeStepCounts = (
  dossiers: FunnelDossier[],
  range: FunnelRange,
): Record<StepKey, number> => {
  const out = emptyCounts();
  for (const d of dossiers) {
    for (const key of STEP_KEYS) {
      if (key === 'creation') {
        out[key] += 1;
        continue;
      }
      const at = STEP_DEFS[key].doneAt(d);
      if (at != null && inRange(at, range)) out[key] += 1;
    }
  }
  return out;
};

export const computePerCompagnieCounts = (
  dossiers: FunnelDossier[],
  range: FunnelRange,
): Array<{ compagnie: string; counts: Record<StepKey, number> }> => {
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
}

/**
 * Per-user breakdown: for each user, count the dossiers where they authored
 * a step that completed within `range`.
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
  }

  return Array.from(map.values()).sort((a, b) => b.totalRealise - a.totalRealise);
};
