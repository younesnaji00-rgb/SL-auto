'use client';

/**
 * Gestionnaire dashboard — "keep every dossier I own moving through its next
 * milestone" (GQM viewpoint: the case handler, today).
 *
 * Block order (docs/research/dashboard-theory.md C1 · dashboard-role-based.md
 * C1 · dashboard-elements.md B10): headline tiles → « À traiter » (the app's
 * own À-faire logic per dossier, oldest first) beside « En attente d'un
 * tiers » and « Sans mouvement » → « Mes dossiers par étape » and « Âge des
 * dossiers ouverts ». No charts, no peers, no period selector: every caption
 * prints its own window.
 */

import { useMemo } from 'react';
import { useT } from '@/i18n';
import { assureName } from '@/lib/dossier-label';
import { cn } from '@/lib/utils';
import type { SlaItem } from '../monitoring/metrics';
import type { FunnelDossier } from '../monitoring/funnel';
import type { Rappel } from '@/hooks/use-rappels';
import { computeGestionnaireView, fmtWindow, type PersonRef, type WaitingParty, type WorkItem } from './metrics';
import { factureToDepot48, photosToChiffrageOpen } from './analytics';
import type { DashboardChiffrage } from './use-dashboard-data';
import { BarList, Block, Delta, DoneLine, StatTile, WorkRow, fmtHours } from './ui';
import { fmtPct } from '@/components/viz';

const WORKLIST_CAP = 7;
const STALE_CAP = 5;

const refOf = (d: FunnelDossier): string => {
  const raw = (d as any).refExpert;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : d.id;
};
const whoOf = (d: FunnelDossier): string => assureName((d as any).assure) || ((d as any).compagnie ?? '');

const PARTY_LABEL: Record<WaitingParty, string> = {
  chiffreur: 'Chez le chiffreur',
  agent: "Chez l'agent de terrain",
  direction: 'Autre',
};

export interface GestionnaireDashboardProps {
  dossiers: FunnelDossier[];
  /** Queue assignments — used to spot dossiers whose photos never left for chiffrage. */
  chiffrages?: DashboardChiffrage[];
  sla: SlaItem[];
  rappelsRecus: Rappel[];
  holidays: ReadonlySet<string>;
  now: Date;
  person: PersonRef | null;
  loading: boolean;
  /** Admin « view as »: rappels are the signed-in user's, so the tile is hidden. */
  viewAs?: boolean;
}

export function GestionnaireDashboard({ dossiers, chiffrages = [], sla, rappelsRecus, holidays, now, person, loading, viewAs }: GestionnaireDashboardProps) {
  const t = useT();
  const view = useMemo(
    () => computeGestionnaireView(dossiers, sla, rappelsRecus, holidays, now, person),
    [dossiers, sla, rappelsRecus, holidays, now, person],
  );
  const { tiles } = view;
  const week = fmtWindow(now, 7);
  const month = fmtWindow(now, 30);

  // The hand-off nobody clocks today (kpi-expansion §4.1.1): photos are in, the
  // dossier has not been sent to a chiffreur, and the wait is invisible to every
  // other view because no SLA clock covers it.
  const handoff = useMemo(
    () => photosToChiffrageOpen(dossiers, chiffrages, holidays, now, person),
    [dossiers, chiffrages, holidays, now, person],
  );
  // The firm's most quotable promise: the report follows the invoice inside 48 h.
  const facture48 = useMemo(() => factureToDepot48(dossiers, holidays, now, 30), [dossiers, holidays, now]);
  const rowOf = (w: WorkItem) => (
    <WorkRow
      key={w.id}
      href={`/dossiers/${w.dossier.id}`}
      id={refOf(w.dossier)}
      who={whoOf(w.dossier)}
      label={w.todo.label}
      time={w.since ? `${t('sans mouvement depuis')} ${fmtHours(w.ageHours)}` : undefined}
      timeTone={w.late ? 'danger' : 'neutral'}
      badge={w.late ? <span className="rounded-full bg-status-danger-bg px-2 py-0.5 text-[11px] font-medium text-status-danger-fg">{t('Hors délai')}</span> : undefined}
    />
  );

  return (
    <div className="space-y-6">
      {/* Row 1 — headline tiles (one chunk): WIP · exception · inbox · throughput vs own previous week. */}
      <div data-tour="dash-tiles" className={cn('grid grid-cols-2 gap-3 sm:gap-4', viewAs ? 'lg:grid-cols-3' : 'lg:grid-cols-4')}>
        <StatTile
          label={t('En cours')}
          value={tiles.enCours}
          loading={loading}
          caption={<span>{tiles.crees7} {t('créés')} · {week}</span>}
          href="/dossiers"
        />
        <StatTile
          label={t('En retard')}
          value={tiles.enRetard}
          danger={tiles.enRetard > 0}
          loading={loading}
          caption={<span>{t('délai de 24 h ouvrées dépassé')} · {t('maintenant')}</span>}
          title={t('Dossiers avec une assignation chiffrage ou terrain au-delà de 24 h ouvrées')}
        />
        {!viewAs && (
          <StatTile
            label={t('Rappels non lus')}
            value={tiles.rappelsNonLus}
            loading={loading}
            caption={
              tiles.rappelOldest ? (
                <span>
                  {t('le plus ancien')} : {tiles.rappelOldest.senderNom || '—'} · {tiles.rappelOldest.dossierRef || ''}
                </span>
              ) : (
                <span>{t('rien en attente de lecture')}</span>
              )
            }
            href="/mes-rappels"
          />
        )}
        <StatTile
          label={t('Terminés')}
          value={tiles.termines7}
          loading={loading}
          caption={
            <>
              <span>{t('rapport déposé')} · {week}</span>
              <span className="text-ink-4">·</span>
              <Delta cur={tiles.termines7} prev={tiles.termines7Prev} suffix={t('vs 7 j préc.')} />
            </>
          }
        />
      </div>

      {/* Row 2 — the action gateway (left) and what is waited for (right). */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Block
          title={t('À traiter')}
          count={view.aTraiter.length}
          countDanger={false}
          caption={t('Vos dossiers dont la prochaine étape vous revient, les plus anciens en premier')}
          moreHref="/dossiers"
          moreLabel={view.aTraiter.length > WORKLIST_CAP ? `${t('Voir les')} ${view.aTraiter.length - WORKLIST_CAP} ${t('autres')}` : t('Tous les dossiers')}
          dataTour="dash-worklist"
          className="lg:col-span-2"
        >
          {loading ? (
            <div className="space-y-3 px-5 py-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-surface-2" />
              ))}
            </div>
          ) : view.aTraiter.length === 0 ? (
            <DoneLine
              title={t('Rien à traiter — vos dossiers avancent.')}
              detail={
                view.enAttente.some((g) => g.count > 0)
                  ? `${view.enAttente.reduce((n, g) => n + g.count, 0)} ${t('en attente d’un tiers')}`
                  : undefined
              }
            />
          ) : (
            view.aTraiter.slice(0, WORKLIST_CAP).map(rowOf)
          )}
        </Block>

        <div className="space-y-6" data-tour="dash-context">
          <Block title={t("En attente d'un tiers")} count={view.enAttente.reduce((n, g) => n + g.count, 0)} caption={t('Le dossier attend quelqu’un d’autre')}>
            {view.enAttente.every((g) => g.count === 0) ? (
              <DoneLine title={t('Rien en attente')} />
            ) : (
              <ul>
                {view.enAttente.map((g) => (
                  <li key={g.party} className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-2.5 text-sm">
                    <span className={cn(g.count === 0 ? 'text-ink-3' : 'text-ink')}>{t(PARTY_LABEL[g.party])}</span>
                    <span className="flex items-center gap-2">
                      {g.oldest && g.oldest.since && (
                        <span className={cn('t-caption tabular-nums', g.oldest.late && 'font-medium text-status-danger-fg')}>
                          {t('le plus ancien')} : {fmtHours(g.oldest.ageHours)}
                        </span>
                      )}
                      <span className={cn('font-semibold tabular-nums', g.count === 0 ? 'text-ink-4' : 'text-ink')}>{g.count}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block
            title={t('Sans mouvement')}
            count={view.sansMouvement.length}
            countDanger
            caption={t('Aucune action depuis plus de 2 j ouvrés')}
            moreHref={view.sansMouvement.length > STALE_CAP ? '/dossiers' : undefined}
            moreLabel={`${t('Voir les')} ${Math.max(0, view.sansMouvement.length - STALE_CAP)} ${t('autres')}`}
          >
            {view.sansMouvement.length === 0 ? (
              <DoneLine title={t('Tous vos dossiers ont bougé récemment.')} />
            ) : (
              view.sansMouvement.slice(0, STALE_CAP).map((w) => (
                <WorkRow
                  key={w.id}
                  href={`/dossiers/${w.dossier.id}`}
                  id={refOf(w.dossier)}
                  label={w.todo.label}
                  time={fmtHours(w.ageHours)}
                  timeTone={w.late ? 'danger' : 'neutral'}
                />
              ))
            )}
          </Block>
        </div>
      </div>

      {/* Row 3 — where my work piles up (WIP by step) and how old it is (buckets since requête). */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Block title={t('Mes dossiers par étape')} caption={t('Dossiers ouverts, par prochaine étape · le second chiffre est en retard')} className="lg:col-span-2" dataTour="dash-etapes">
          <BarList rows={view.parEtape.map((s) => ({ key: String(s.stepId), label: t(s.label), value: s.count, late: s.late }))} labelWidth="w-44" />
        </Block>
        <Block title={t('Âge des dossiers ouverts')} caption={t('Jours calendaires depuis la requête de la compagnie')}>
          <BarList rows={view.ageBuckets.map((b) => ({ key: b.key, label: t(b.label), value: b.count }))} labelWidth="w-16" />
        </Block>
      </div>

      {/* Row 4 — my own hand-off, and the promise the firm is judged on. */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Block
          title={t('Photos reçues, chiffrage pas encore demandé')}
          count={handoff.length}
          caption={t('L’attente qu’aucun délai ne mesure — elle est entre vos mains')}
          moreHref={handoff.length > STALE_CAP ? '/dossiers' : undefined}
          moreLabel={`${t('Voir les')} ${Math.max(0, handoff.length - STALE_CAP)} ${t('autres')}`}
          className="lg:col-span-2"
        >
          {handoff.length === 0 ? (
            <DoneLine title={t('Tout ce qui est photographié est parti au chiffrage.')} />
          ) : (
            handoff.slice(0, STALE_CAP).map((h) => (
              <WorkRow
                key={h.dossier.id}
                href={`/dossiers/${h.dossier.id}`}
                id={refOf(h.dossier)}
                who={whoOf(h.dossier)}
                label={t('À envoyer au chiffrage')}
                time={`${t('depuis')} ${fmtHours(h.sinceHours)}`}
                timeTone={h.sinceHours > 24 ? 'danger' : 'neutral'}
              />
            ))
          )}
        </Block>
        <Block title={t('Facture → rapport déposé')} caption={`${t('Part déposée en 48 h ouvrées ou moins')} · ${month}`}>
          <div className="px-5 pb-3">
            <p className="text-2xl font-semibold leading-tight text-ink">{fmtPct(facture48.pct)}</p>
            <p className="t-caption mt-1 tabular-nums">
              {facture48.den === 0
                ? t('aucune facture validée sur la période')
                : `${facture48.num} ${t('sur')} ${facture48.den} ${t('dossiers déposés')}`}
            </p>
            <p className="t-caption mt-2">{t('Le délai que les compagnies citent en premier quand elles comparent deux cabinets.')}</p>
          </div>
        </Block>
      </div>
    </div>
  );
}

export default GestionnaireDashboard;
