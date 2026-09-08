'use client';

/**
 * Gestionnaire dashboard — layout « 5b » (Dashboard redesign brief, tour 5:
 * « tout tient en 16:9, sans défilement »).
 *
 * Same viewpoint as before — "keep every dossier I own moving through its next
 * milestone" — and the SAME metric layer: everything comes from
 * `computeGestionnaireView`, plus `photosToChiffrageOpen` and
 * `factureToDepot48`. Nothing new is computed here; 5b only re-lays it out so
 * the whole day fits one screen instead of four stacked rows:
 *
 *   Tuiles   en cours (avec sa répartition) · en retard · rappels · terminés 7 j
 *   Rang A   à traiter (6) · en attente d'un tiers, anneau (3) · par étape, camembert (3)
 *   Rang B   sans mouvement (4) · photos reçues (4) · facture → dépôt (2) · âge (2)
 *
 * The two chart forms come from `./pie` — scoped to this folder, never the
 * shared viz library (see the note at the top of that file).
 */

import { useMemo } from 'react';
import { useT } from '@/i18n';
import { assureName } from '@/lib/dossier-label';
import { cn } from '@/lib/utils';
import type { SlaItem } from '../monitoring/metrics';
import type { FunnelDossier } from '../monitoring/funnel';
import type { Rappel } from '@/hooks/use-rappels';
import { computeGestionnaireView, computeTeamView, fmtWindow, type PersonRef, type WaitingParty, type WorkItem } from './metrics';
import { factureToDepot48, photosToChiffrageOpen } from './analytics';
import type { DashboardChiffrage, DashboardUser } from './use-dashboard-data';
import { BarList, Block, Delta, DoneLine, StatTile, WorkRow, fmtHours } from './ui';
import { Donut, Pie, SliceLegend, toSlices, type PieDatum } from './pie';
import { fmtPct } from '@/components/viz';

/** 5b shows six rows in « À traiter » and four in the two exception lists. */
const WORKLIST_CAP = 6;
const STALE_CAP = 4;

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
  /**
   * Team roster — passed ONLY by the admin roll-up. With it the last slot is
   * « Charge par personne » (owner 2026-09-08); a real gestionnaire has no team
   * to spread, so their page keeps « Facture → dépôt » there instead.
   */
  users?: DashboardUser[];
}

export function GestionnaireDashboard({ dossiers, chiffrages = [], sla, rappelsRecus, holidays, now, person, loading, viewAs, users }: GestionnaireDashboardProps) {
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

  const charge = useMemo(
    () => (users && users.length ? computeTeamView('Gestionnaire', users, { dossiers, chiffrages, missions: [], sla, holidays }, now) : null),
    [users, dossiers, chiffrages, sla, holidays, now],
  );

  const attente = view.enAttente.reduce((n, g) => n + g.count, 0);

  /** Ring: who the open dossiers are waiting on, with the oldest wait per party. */
  const attenteData: PieDatum[] = view.enAttente.map((g) => ({
    key: g.party,
    label: t(PARTY_LABEL[g.party]),
    value: g.count,
    detail: g.oldest?.since ? `${t('le plus ancien')} ${fmtHours(g.oldest.ageHours)}` : undefined,
    detailDanger: !!g.oldest?.late,
  }));
  const attenteSlices = toSlices(attenteData).slices;

  /** Pie: where my open work sits, by next step; the second figure is late. */
  const etapeData: PieDatum[] = view.parEtape.map((s) => ({
    key: String(s.stepId),
    label: t(s.label),
    value: s.count,
    late: s.late,
  }));
  const etapeSlices = toSlices(etapeData).slices;

  const rowOf = (w: WorkItem) => (
    <WorkRow
      key={w.id}
      href={`/dossiers/${w.dossier.id}`}
      id={refOf(w.dossier)}
      who={whoOf(w.dossier)}
      label={w.todo.label}
      time={w.since ? fmtHours(w.ageHours) : undefined}
      timeTone={w.late ? 'danger' : 'neutral'}
      badge={w.late ? <span className="rounded-full bg-status-danger-bg px-2 py-0.5 text-[11px] font-medium text-status-danger-fg">{t('Hors délai')}</span> : undefined}
    />
  );

  const moreLabel = (total: number, cap: number) => `${t('Voir les')} ${total - cap} ${t('autres')}`;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Tuiles ─────────────────────────────────────────────────────── */}
      <div data-tour="dash-tiles" className={cn('grid grid-cols-2 gap-4', viewAs ? 'lg:grid-cols-3' : 'lg:grid-cols-4')}>
        <StatTile label={t('En cours')} value={tiles.enCours} loading={loading} href="/dossiers">
          {/* The one tile that decomposes itself: the same 24 dossiers, split
              into the three lists below it, so the page reads as one whole. */}
          <div className="mt-3">
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-surface-3">
              <span className="bg-chart-1" style={{ width: `${share(view.aTraiter.length, tiles.enCours)}%` }} />
              <span className="bg-primary" style={{ width: `${share(attente, tiles.enCours)}%` }} />
              <span className="bg-ink/30" style={{ width: `${share(view.sansMouvement.length, tiles.enCours)}%` }} />
            </div>
            <p className="t-caption mt-2 tabular-nums">
              {view.aTraiter.length} {t('à traiter')} · {attente} {t('en attente')} · {view.sansMouvement.length}{' '}
              {t('sans mvt')}
            </p>
          </div>
        </StatTile>

        <StatTile
          label={t('En retard')}
          value={tiles.enRetard}
          danger={tiles.enRetard > 0}
          loading={loading}
          title={t('Dossiers avec une assignation chiffrage ou terrain au-delà de 24 h ouvrées')}
        >
          <div className="mt-3 flex flex-wrap gap-1.5">
            {view.aTraiter.filter((w) => w.late).slice(0, 2).map((w) => (
              <span
                key={w.id}
                className="inline-flex h-[19px] items-center rounded-md bg-status-danger-bg px-1.5 font-mono text-[10px] font-semibold text-status-danger-fg"
              >
                {refOf(w.dossier)}
              </span>
            ))}
            {tiles.enRetard > 2 && (
              <span className="inline-flex h-[19px] items-center rounded-md bg-surface-2 px-1.5 text-[10px] font-medium text-ink-2">
                +{tiles.enRetard - 2}
              </span>
            )}
            {tiles.enRetard === 0 && <span className="t-caption">{t('délai de 24 h ouvrées tenu')}</span>}
          </div>
        </StatTile>

        {!viewAs && (
          <StatTile label={t('Rappels non lus')} value={tiles.rappelsNonLus} loading={loading} href="/mes-rappels">
            <p className="t-caption mt-3 truncate tabular-nums">
              {tiles.rappelOldest
                ? `${tiles.rappelOldest.senderNom || '—'} · ${tiles.rappelOldest.dossierRef || ''}`
                : t('rien en attente de lecture')}
            </p>
          </StatTile>
        )}

        <StatTile label={`${t('Terminés')} · 7 j`} value={tiles.termines7} loading={loading}>
          <div className="t-caption mt-3 flex flex-wrap items-center gap-x-1.5">
            <Delta cur={tiles.termines7} prev={tiles.termines7Prev} suffix={t('vs 7 j préc.')} />
          </div>
          <p className="t-caption mt-0.5">
            {t('rapport déposé')} · {week}
          </p>
        </StatTile>
      </div>

      {/* ── Rang A ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Block
          title={t('À traiter')}
          count={view.aTraiter.length}
          caption={t('La prochaine étape vous revient · sans mouvement depuis')}
          moreHref="/dossiers"
          moreLabel={view.aTraiter.length > WORKLIST_CAP ? moreLabel(view.aTraiter.length, WORKLIST_CAP) : t('Tous les dossiers')}
          dataTour="dash-worklist"
          className="lg:col-span-6"
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
              detail={attente > 0 ? `${attente} ${t('en attente d’un tiers')}` : undefined}
            />
          ) : (
            view.aTraiter.slice(0, WORKLIST_CAP).map(rowOf)
          )}
        </Block>

        <Block
          title={t("En attente d'un tiers")}
          caption={t('Le dossier attend quelqu’un d’autre')}
          className="lg:col-span-3"
          bodyClassName="px-5 pb-5"
          dataTour="dash-context"
        >
          {attente === 0 ? (
            <DoneLine title={t('Rien en attente')} />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Donut
                data={attenteData}
                label={t('Dossiers en attente d’un tiers, par partie')}
                caption={t("En attente d'un tiers")}
                centerValue={attente}
                centerLabel={t('dossiers')}
              />
              <SliceLegend slices={attenteSlices} className="w-full space-y-2.5" />
            </div>
          )}
        </Block>

        <Block
          title={t('Par étape')}
          caption={`${view.openCount} ${t('ouverts')} · ${t('en rouge, en retard')}`}
          className="lg:col-span-3"
          bodyClassName="px-5 pb-5"
          dataTour="dash-etapes"
        >
          {etapeSlices.length === 0 ? (
            <DoneLine title={t('Aucun dossier ouvert')} />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Pie
                data={etapeData}
                label={t('Dossiers ouverts par prochaine étape')}
                caption={t('Mes dossiers par étape')}
                size={132}
              />
              <SliceLegend slices={etapeSlices} className="w-full space-y-2" />
            </div>
          )}
        </Block>
      </div>

      {/* ── Rang B ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <Block
          title={t('Sans mouvement')}
          count={view.sansMouvement.length}
          countDanger
          caption={t('Aucune action depuis plus de 2 j ouvrés')}
          moreHref={view.sansMouvement.length > STALE_CAP ? '/dossiers' : undefined}
          moreLabel={moreLabel(view.sansMouvement.length, STALE_CAP)}
          className="lg:col-span-4"
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

        <Block
          title={t('Photos reçues, chiffrage à demander')}
          count={handoff.length}
          caption={t('L’attente qu’aucun délai ne mesure')}
          moreHref={handoff.length > STALE_CAP ? '/dossiers' : undefined}
          moreLabel={moreLabel(handoff.length, STALE_CAP)}
          className="lg:col-span-4"
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
                time={fmtHours(h.sinceHours)}
                timeTone={h.sinceHours > 24 ? 'danger' : 'neutral'}
              />
            ))
          )}
        </Block>

        {charge ? (
          <Block
            title={t('Charge par personne')}
            caption={t('Éléments ouverts · le second chiffre est en retard')}
            className="lg:col-span-2"
            dataTour="dash-charge"
          >
            {charge.perPerson.length === 0 ? (
              <DoneLine title={t('Aucun utilisateur actif avec ce rôle.')} />
            ) : (
              <BarList
                rows={charge.perPerson.map((r) => ({
                  key: r.user.id,
                  label: r.user.nom || r.user.email || r.user.id,
                  value: r.enCours,
                  late: r.enRetard,
                }))}
                labelWidth="w-20"
              />
            )}
          </Block>
        ) : (
        <Block
            title={t('Facture → dépôt')}
            caption={`${t('en 48 h ouvrées')} · ${month}`}
            className="lg:col-span-2"
            bodyClassName="px-5 pb-5"
          >
            <p className="text-[32px] font-semibold leading-none text-ink">{fmtPct(facture48.pct)}</p>
            <span className="mt-3 block h-2.5 rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full bg-chart-1"
                style={{ width: `${facture48.pct ?? 0}%` }}
              />
            </span>
            <p className="t-caption mt-2 tabular-nums">
              {facture48.den === 0
                ? t('aucune facture validée sur la période')
                : `${facture48.num} ${t('sur')} ${facture48.den} ${t('dossiers déposés')}`}
            </p>
          </Block>
        )}

        <Block
          title={t('Âge des ouverts')}
          caption={t('depuis la requête')}
          className="lg:col-span-2"
        >
          <BarList rows={view.ageBuckets.map((b) => ({ key: b.key, label: t(b.label), value: b.count }))} labelWidth="w-14" />
        </Block>
      </div>
    </div>
  );
}

/** Percentage of `total`, guarded so an empty dashboard draws nothing. */
function share(n: number, total: number): number {
  return total > 0 ? (n / total) * 100 : 0;
}
