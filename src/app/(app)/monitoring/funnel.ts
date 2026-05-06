import { ACCORD_BUCKET_MEMBERS } from '@/lib/dossiers-data';

export type StepKey =
  | 'creation'
  | 'photosAvant'
  | 'accord1er'
  | 'photosEnCours'
  | 'accord'
  | 'photosApres'
  | 'facture'
  | 'rapportValide'
  | 'rapport'
  | 'noteHonoraire';

export const STEP_KEYS: StepKey[] = [
  'creation',
  'photosAvant',
  'accord1er',
  'photosEnCours',
  'accord',
  'photosApres',
  'facture',
  'rapportValide',
  'rapport',
  'noteHonoraire',
];

export const STEP_LABELS: Record<StepKey, string> = {
  creation: 'Missions créées',
  photosAvant: 'Expertise avant',
  accord1er: '1er accord ou 1ère proposition',
  photosEnCours: 'Expertise en cours',
  photosApres: 'Expertise après',
  accord: '2ème accord et +',
  facture: 'Facture validée',
  rapportValide: 'Rapport validé',
  rapport: 'Rapport déposé',
  noteHonoraire: "Note d'honoraire",
};

export const STEP_LABELS_SHORT: Record<StepKey, string> = {
  creation: 'Création',
  photosAvant: 'Avant',
  accord1er: '1er accord',
  photosEnCours: 'En cours',
  photosApres: 'Après',
  accord: '2ème+',
  facture: 'Facture',
  rapportValide: 'Validé',
  rapport: 'Rapport',
  noteHonoraire: "Note d'honoraire",
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
  dateRequete?: any;
  dateChiffrage?: any;
  firstAccordReachedAt?: any;
  datePhotosAvant?: any;
  datePhotosEnCours?: any;
  datePhotosApres?: any;
  dateDemandeExpertiseAvant?: any;
  dateDemandeExpertiseEnCours?: any;
  dateDemandeExpertiseApres?: any;
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

const SLA_24H_MS = 24 * 60 * 60 * 1000;

function photoHorsDelai(d: FunnelDossier, demandeKey: string, photoKey: string): Date | null {
  const demande = toDate((d as any)[demandeKey]);
  const photos = toDate((d as any)[photoKey]);
  if (!demande || !photos) return null;
  return photos.getTime() - demande.getTime() > SLA_24H_MS ? photos : null;
}

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
  horsDelaiAt(d: FunnelDossier): Date | null;
}

export const STEP_DEFS: Record<StepKey, StepDef> = {
  creation: {
    key: 'creation',
    label: STEP_LABELS.creation,
    doneAt: (d) => toDate(d.createdAt),
    authorOf: (d) => d.createdBy ?? null,
    horsDelaiAt: (d) => {
      const created = toDate(d.createdAt);
      const requete = toDate(d.dateRequete);
      if (!created || !requete) return null;
      // 24h sliding window (not calendar day) between dateRequete and createdAt.
      // |delta| > 24h → hors délai. Math.abs guards against data-entry rows
      // where the two dates land in the wrong order.
      return Math.abs(created.getTime() - requete.getTime()) > SLA_24H_MS ? created : null;
    },
  },
  photosAvant: {
    key: 'photosAvant',
    label: STEP_LABELS.photosAvant,
    doneAt: (d) => toDate(d.datePhotosAvant),
    authorOf: (d, logs) => photoAuthor(d, logs, 'avant'),
    horsDelaiAt: (d) => photoHorsDelai(d, 'dateDemandeExpertiseAvant', 'datePhotosAvant'),
  },
  photosEnCours: {
    key: 'photosEnCours',
    label: STEP_LABELS.photosEnCours,
    doneAt: (d) => toDate(d.datePhotosEnCours),
    authorOf: (d, logs) => photoAuthor(d, logs, 'en cours'),
    horsDelaiAt: (d) => photoHorsDelai(d, 'dateDemandeExpertiseEnCours', 'datePhotosEnCours'),
  },
  photosApres: {
    key: 'photosApres',
    label: STEP_LABELS.photosApres,
    doneAt: (d) => toDate(d.datePhotosApres),
    authorOf: (d, logs) => photoAuthor(d, logs, 'après'),
    horsDelaiAt: (d) => photoHorsDelai(d, 'dateDemandeExpertiseApres', 'datePhotosApres'),
  },
  accord1er: {
    key: 'accord1er',
    label: STEP_LABELS.accord1er,
    doneAt: (d) => toDate(d.firstAccordReachedAt),
    authorOf: () => null,
    horsDelaiAt: () => null,
  },
  accord: {
    key: 'accord',
    label: STEP_LABELS.accord,
    doneAt: (d) => {
      const status = d.lastStatusChange?.status ?? d.statut;
      if (!status) return null;
      if (!ACCORD_BUCKET_MEMBERS.has(status)) return null;
      if (status === 'Accord' || status === "Proposition d'accord") return null;
      return toDate(d.lastStatusChange?.at);
    },
    authorOf: (d) => d.lastStatusChange?.by ?? null,
    horsDelaiAt: (d) => {
      const status = d.lastStatusChange?.status ?? d.statut;
      if (!status || !ACCORD_BUCKET_MEMBERS.has(status)) return null;
      if (status === 'Accord' || status === "Proposition d'accord") return null;
      const accordAt = toDate(d.lastStatusChange?.at);
      const chiffrageAt = toDate(d.dateChiffrage);
      if (!accordAt || !chiffrageAt) return null;
      return accordAt.getTime() - chiffrageAt.getTime() > SLA_24H_MS ? accordAt : null;
    },
  },
  facture: {
    key: 'facture',
    label: STEP_LABELS.facture,
    doneAt: (d) => toDate(d.dateFactureValide),
    authorOf: (d) => d.authorFactureValide ?? null,
    horsDelaiAt: () => null,
  },
  rapportValide: {
    key: 'rapportValide',
    label: STEP_LABELS.rapportValide,
    doneAt: (d) => toDate(d.directorValidated?.at),
    authorOf: (d) => d.directorValidated?.by ?? null,
    horsDelaiAt: () => null,
  },
  rapport: {
    key: 'rapport',
    label: STEP_LABELS.rapport,
    doneAt: (d) => toDate(d.dateRapportDepose),
    authorOf: (d) => d.authorRapportDepose ?? null,
    horsDelaiAt: () => null,
  },
  noteHonoraire: {
    key: 'noteHonoraire',
    label: STEP_LABELS.noteHonoraire,
    doneAt: () => null,
    authorOf: () => null,
    horsDelaiAt: () => null,
  },
};

const emptyCounts = (): Record<StepKey, number> =>
  STEP_KEYS.reduce((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as Record<StepKey, number>);

/**
 * Per-step count of dossiers that completed the step IN RANGE and ON TIME.
 * Drives the green "en délai" segment in the KPI cards. A dossier counts when
 * `STEP_DEFS[key].doneAt(d)` falls within `range` AND `horsDelaiAt(d)` is null.
 *
 * Step `accord` remains sensitive to the current status — when the
 * gestionnaire's "+" button rolls statut back to "Chiffrage en cours"
 * awaiting the next cardinal accord, `doneAt` returns null and the dossier
 * drops out of the count until the chiffreur saves again.
 */
export const computeStepCounts = (
  dossiers: FunnelDossier[],
  range: FunnelRange,
): Record<StepKey, number> => {
  const out = emptyCounts();
  for (const d of dossiers) {
    for (const key of STEP_KEYS) {
      const def = STEP_DEFS[key];
      const at = def.doneAt(d);
      if (!at) continue;
      if (!inRange(at, range)) continue;
      if (def.horsDelaiAt(d) != null) continue;
      out[key] += 1;
    }
  }
  return out;
};

/**
 * Per-step cumulative count of dossiers that have completed the step at any
 * time. Used to compute "non réalisé" (= total in scope − completed all-time)
 * which must NOT respect the date filter.
 */
export const computeStepCountsRealiseAllTime = (
  dossiers: FunnelDossier[],
): Record<StepKey, number> => {
  const out = emptyCounts();
  for (const d of dossiers) {
    for (const key of STEP_KEYS) {
      if (key === 'creation') {
        out[key] += 1;
        continue;
      }
      const at = STEP_DEFS[key].doneAt(d);
      if (at != null) out[key] += 1;
    }
  }
  return out;
};

/**
 * Per-step count of dossiers flagged as hors-délai. A dossier is hors-délai
 * for a given step when `STEP_DEFS[key].horsDelaiAt(d)` returns a non-null
 * Date. Steps with stub predicates (returning null for everything) contribute
 * 0 across the board until their SLA logic is wired in.
 *
 * For the `creation` card, hors-délai means the dossier was created on a
 * different calendar day than its imported `dateRequete`. For `photosAvant`
 * / `photosEnCours` / `photosApres`, the SLA is 24h after the corresponding
 * `dateDemandeExpertise${X}`. For `accord`, 24h after `dateChiffrage`.
 */
export const computeStepCountsHorsDelai = (
  dossiers: FunnelDossier[],
): Record<StepKey, number> => {
  const out = emptyCounts();
  for (const d of dossiers) {
    for (const key of STEP_KEYS) {
      const at = STEP_DEFS[key].horsDelaiAt(d);
      if (at != null) out[key] += 1;
    }
  }
  return out;
};

export interface DossierForStep {
  dossier: FunnelDossier;
  doneAt: Date | null;
  author: string | null;
}

/**
 * Dossiers that completed `step` WITHIN `range` AND ON TIME — mirrors the
 * "en délai" count in `computeStepCounts`. Used by the drawer when the user
 * clicks the green "en délai" bar. Sorted most-recent first.
 */
export const dossiersForStep = (
  dossiers: FunnelDossier[],
  logs: WorkflowLog[],
  range: FunnelRange,
  step: StepKey,
): DossierForStep[] => {
  const def = STEP_DEFS[step];
  const out: DossierForStep[] = [];
  for (const d of dossiers) {
    const at = def.doneAt(d);
    if (!at) continue;
    if (!inRange(at, range)) continue;
    if (def.horsDelaiAt(d) != null) continue;
    out.push({ dossier: d, doneAt: at, author: def.authorOf(d, logs) });
  }
  return out.sort((a, b) => {
    const ad = a.doneAt?.getTime() ?? 0;
    const bd = b.doneAt?.getTime() ?? 0;
    return bd - ad;
  });
};

/**
 * Dossiers flagged as hors-délai for a given step. Subset of `dossiersForStep`
 * whose `STEP_DEFS[step].horsDelaiAt(d)` returned a non-null Date.
 */
export const dossiersHorsDelai = (
  dossiers: FunnelDossier[],
  logs: WorkflowLog[],
  step: StepKey,
): DossierForStep[] => {
  const def = STEP_DEFS[step];
  const out: DossierForStep[] = [];
  for (const d of dossiers) {
    if (def.horsDelaiAt(d) == null) continue;
    out.push({ dossier: d, doneAt: def.doneAt(d), author: def.authorOf(d, logs) });
  }
  return out.sort((a, b) => {
    const ad = a.doneAt?.getTime() ?? 0;
    const bd = b.doneAt?.getTime() ?? 0;
    return bd - ad;
  });
};

/**
 * Inverse of `dossiersForStep` — return dossiers that have NOT done the step.
 * Returns [] for step `creation` (every in-scope dossier has been "created" by
 * definition, so there's no non-réalisé bucket). Sorted by createdAt desc.
 */
export const dossiersNotForStep = (
  dossiers: FunnelDossier[],
  _logs: WorkflowLog[],
  step: StepKey,
): DossierForStep[] => {
  if (step === 'creation') return [];
  const def = STEP_DEFS[step];
  const out: DossierForStep[] = [];
  for (const d of dossiers) {
    if (def.doneAt(d) != null) continue;
    out.push({ dossier: d, doneAt: null, author: null });
  }
  return out.sort((a, b) => {
    const ad = toDate(a.dossier.createdAt)?.getTime() ?? 0;
    const bd = toDate(b.dossier.createdAt)?.getTime() ?? 0;
    return bd - ad;
  });
};

export const computePerCompagnieCounts = (
  dossiers: FunnelDossier[],
  _range: FunnelRange,
  allCompagnies?: string[],
): Array<{ compagnie: string; counts: Record<StepKey, number> }> => {
  const groups = new Map<string, FunnelDossier[]>();
  for (const d of dossiers) {
    const key = (d.compagnie || '').trim() || '— non précisé —';
    const arr = groups.get(key) || [];
    arr.push(d);
    groups.set(key, arr);
  }
  // Surface every assigned compagnie even when it has no dossiers yet.
  if (allCompagnies) {
    for (const raw of allCompagnies) {
      const key = (raw || '').trim();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
    }
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([compagnie, arr]) => ({ compagnie, counts: computeStepCountsRealiseAllTime(arr) }));
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
