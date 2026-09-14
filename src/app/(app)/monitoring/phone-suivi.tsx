'use client';

/**
 * Suivi d'équipe — PHONE rendering (mobile redesign 2026-09-14,
 * `Phone.dc.html` ll. 399–420 « Pilotage / Suivi d'équipe »).
 *
 *   Pills     the page's period presets (Tout · Jour · Semaine · Mois — the
 *             state `page.tsx` already owns) + the two other modes of the page
 *             (« Par compagnie », « Par utilisateur ») as toggles.
 *   KPI line  the headline figures (`computeHeadline` + the total cycle time).
 *   Funnel    « Funnel des étapes » — one 10 px bar per step, width = share of
 *             the first step, value tabular; a row opens the same DossierDrawer
 *             the desktop tiles open.
 *   Team      « Par gestionnaire » — initials · name · open · hors délai
 *             from the page's per-user measures (Gestionnaire rows; every
 *             user when no row carries that role).
 *
 * Desktop/tablet keep the tiles, tables and bar lists of page.tsx unchanged.
 */

import { useMemo } from 'react';
import { useT } from '@/i18n';
import { ScopePills, type ScopePill } from '@/components/ui/scope-pills';
import { PhoneBarCard, PhoneBarRow, PhoneBlock, PhoneKpiLine, PhonePersonRow, type PhoneKpi } from '../dashboard/phone-blocks';
import { fmtHours } from '../dashboard/ui';
import { STEP_KEYS, STEP_LABELS_SHORT, type StepKey } from './funnel';
import type { CycleTimeRow, Headline } from './metrics';

export type SuiviPreset = 'tout' | 'jour' | 'semaine' | 'mois' | 'custom';
export type SuiviVue = 'global' | 'compagnie' | 'user';

/** The slice of `UserRow` (page.tsx) the team card reads. */
export interface SuiviUserRow {
  user: string;
  role?: string;
  ouverts: number;
  horsDelai: Record<StepKey, number>;
  totalEnDelai: number;
}

const PRESETS: Array<{ key: Exclude<SuiviPreset, 'custom'>; label: string }> = [
  { key: 'tout', label: 'Tout' },
  { key: 'jour', label: 'Jour' },
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois', label: 'Mois' },
];

const TEAM_ROWS = 6;

export interface PhoneSuiviPillsProps {
  activePreset: SuiviPreset;
  onPreset: (p: Exclude<SuiviPreset, 'custom'>) => void;
  vue: SuiviVue;
  onChangeVue: (v: SuiviVue) => void;
}

export interface PhoneSuiviProps {
  onChangeVue: (v: SuiviVue) => void;
  periodLabel: string;
  headline: Headline;
  counts: Record<StepKey, number>;
  horsDelaiCounts: Record<StepKey, number>;
  cycleTimes: CycleTimeRow[];
  users: SuiviUserRow[];
  totalDossiers: number;
  loading: boolean;
  onSelectStep: (step: StepKey, mode: 'realise' | 'horsDelai') => void;
}

export function PhoneSuiviPills({ activePreset, onPreset, vue, onChangeVue }: PhoneSuiviPillsProps) {
  const t = useT();
  const pills: ScopePill[] = [
    ...PRESETS.map((p) => ({ key: p.key, label: t(p.label), active: vue === 'global' && activePreset === p.key, onClick: () => { onPreset(p.key); if (vue !== 'global') onChangeVue('global'); } })),
    { key: 'compagnie', label: t('Par compagnie'), active: vue === 'compagnie', onClick: () => onChangeVue(vue === 'compagnie' ? 'global' : 'compagnie'), dataTour: 'mon-tab-compagnie' },
    { key: 'user', label: t('Par utilisateur'), active: vue === 'user', onClick: () => onChangeVue(vue === 'user' ? 'global' : 'user'), dataTour: 'mon-tab-user' },
  ];
  return <ScopePills pills={pills} sticky ariaLabel={t('Période')} dataTour="mon-periode" />;
}

export function PhoneSuivi({ periodLabel, headline, counts, horsDelaiCounts, cycleTimes, users, totalDossiers, loading, onSelectStep, onChangeVue }: PhoneSuiviProps) {
  const t = useT();
  const total = cycleTimes.find((r) => r.key === 'total')?.medianHours ?? null;

  const kpis: PhoneKpi[] = [
    { key: 'traites', value: headline.traites, label: t('traités') },
    { key: 'late', value: headline.enRetard, label: t('en retard'), danger: headline.enRetard > 0 },
    { key: 'delai', value: fmtHours(total), label: t('délai médian') },
    { key: 'respect', value: headline.respectPct == null ? '—' : `${headline.respectPct} %`, label: t('en délai') },
    { key: 'attente', value: headline.enAttente, label: t('en attente') },
    { key: 'crees', value: headline.crees, label: t('créés') },
  ];

  // Width = share of the FIRST step (the design's 64 → 100 %); when nothing
  // was created in the period, the busiest step carries the scale instead.
  const first = counts[STEP_KEYS[0]] ?? 0;
  const ref = first > 0 ? first : Math.max(1, ...STEP_KEYS.map((k) => counts[k] ?? 0));

  const team = useMemo(() => {
    const gest = users.filter((u) => u.role === 'Gestionnaire');
    const rows = (gest.length > 0 ? gest : users).map((u) => ({
      name: u.user,
      open: u.ouverts,
      late: STEP_KEYS.reduce((n, k) => n + (u.horsDelai[k] ?? 0), 0),
      total: u.totalEnDelai,
    }));
    rows.sort((a, b) => b.late - a.late || b.open - a.open || b.total - a.total);
    return { rows, gestionnaires: gest.length > 0 };
  }, [users]);

  return (
    <div className="flex flex-col gap-2">
      {totalDossiers > 0 && <PhoneKpiLine items={kpis} />}

      <PhoneBarCard title={t('Funnel des étapes')} caption={`${t('Dossiers ayant franchi chaque étape en délai')} · ${periodLabel}`} dataTour="mon-kpis">
        {loading ? (
          <div className="space-y-2.5 py-1" aria-busy="true">
            {STEP_KEYS.map((k) => (
              <div key={k} className="h-2.5 w-full animate-pulse rounded-full bg-surface-2" />
            ))}
          </div>
        ) : (
          STEP_KEYS.map((k) => {
            const v = counts[k] ?? 0;
            const late = horsDelaiCounts[k] ?? 0;
            return (
              <PhoneBarRow
                key={k}
                label={t(STEP_LABELS_SHORT[k])}
                value={v}
                frac={ref > 0 ? v / ref : 0}
                late={late}
                onClick={() => onSelectStep(k, late > 0 && v === 0 ? 'horsDelai' : 'realise')}
                ariaLabel={`${t(STEP_LABELS_SHORT[k])} : ${v} ${t('en délai')}${late > 0 ? ` · ${late} ${t('hors délai')}` : ''} — ${t('voir les dossiers')}`}
              />
            );
          })
        )}
        {!loading && <p className="mt-1.5 text-[12px] leading-4 text-ink-3">{t('Le second chiffre, en rouge, est hors délai · toucher une étape ouvre ses dossiers')}</p>}
      </PhoneBarCard>

      <PhoneBlock
        title={team.gestionnaires ? t('Par gestionnaire') : t('Par utilisateur')}
        caption={`${t('ouverts')} · ${t('hors délai')} · ${periodLabel}`}
        onMore={team.rows.length > TEAM_ROWS ? () => onChangeVue('user') : undefined}
        emptyText={t('Aucun utilisateur dans le périmètre')}
        loading={loading}
        dataTour="mon-user-table"
      >
        {team.rows.slice(0, TEAM_ROWS).map((r) => (
          <PhonePersonRow key={r.name} name={r.name} open={r.open} late={r.late} />
        ))}
      </PhoneBlock>
    </div>
  );
}
