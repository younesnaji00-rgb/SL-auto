'use client';

/**
 * Direction / Pilotage — the executive view (docs/research/dashboard-demo-impact.md
 * Part D, dashboard-kpi-expansion.md §4.5).
 *
 * It is NOT a fifth operational dashboard: the four role views keep the daily
 * job, and nothing here duplicates them. This one answers a director's monthly
 * question — "are we fast, are we right, and for which insurer?" — with a
 * closed cohort, a named window on every figure, and one comparison each.
 *
 * Layout (R61/R69, demo-impact D1): the first screen is the north star + five
 * tiles + the stage ladder — five headline figures, two charts, no scrolling.
 * Everything past that is grouped by question in sub-tabs, so depth is one
 * click away rather than piled onto the landing screen (R17, R63).
 *
 * Honesty rules that are load-bearing here: every rate prints its denominator
 * (a « 100 % » over n = 2 says n = 2), external references are drawn as a
 * labelled tick with their source and date and NEVER as "you vs the market",
 * and the money tile only exists when enough dossiers actually carry a
 * structured accord (demo-impact D2, pitfall 12).
 */

import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SlaItem } from '../monitoring/metrics';
import type { FunnelDossier, WorkflowLog } from '../monitoring/funnel';
import type { DashboardChiffrage, DashboardMission } from './use-dashboard-data';
import { computeDirectionView, type Dist, type Rate } from './analytics';
import { fmtWindow } from './metrics';
import { Block, DoneLine, StatTile, fmtHours } from './ui';
import { Bullet, DotStrip, HeatTable, PairedColumns, StackedBar, TrendChart, fmtDays, fmtDec, fmtInt, fmtMAD, fmtPct } from '@/components/viz';

/** Period choices — the only selector in the app's dashboards (R64, E.6). */
const PERIODS = [
  { key: 30, label: '30 jours' },
  { key: 90, label: '90 jours' },
  { key: 365, label: '12 mois' },
] as const;

/**
 * External reference points. Each one is drawn as a labelled tick and carries
 * its source and date, because no published Moroccan cabinet benchmark exists
 * (demo-impact D4). They are context, never a score.
 */
const REFS = {
  facture48: { value: 48, label: 'BCA : rapport sous 48 h après facture (2026)' },
  revision: { value: 35, label: '≈ 35 % de révisions — moyenne du secteur (Veritas, US, 2025)' },
};

/** A rate with its denominator spelled out — « 92 % · 46 sur 50 ». */
function RateLine({ r, unit = '' }: { r: Rate; unit?: string }) {
  const t = useT();
  if (r.den === 0) return <span className="text-ink-3">{t('aucune donnée sur la période')}</span>;
  return (
    <span className="tabular-nums">
      {r.num} {t('sur')} {r.den}
      {unit}
    </span>
  );
}

/** The (i) popover every figure carries: formula, window, exclusions (R26, trust furniture). */
function Def({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger
        className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-ink-4 hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t('Comment ce chiffre est calculé')}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-[13px] leading-relaxed text-ink-2">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function SectionTitle({ title, caption, def }: { title: string; caption?: string; def?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="t-heading flex items-center">
        {title}
        {def && <Def>{def}</Def>}
      </h2>
      {caption && <p className="t-caption mt-0.5">{caption}</p>}
    </div>
  );
}

/** One ladder stage: label, median bar, P90 and n — the decomposition of the total délai. */
function LadderRowView({ label, d, max }: { label: string; d: Dist; max: number }) {
  const t = useT();
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <div className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-x-3 py-1.5">
      <span className="t-body-sm truncate text-ink-2" title={label}>
        {label}
      </span>
      <span className="relative block h-4 rounded-sm bg-surface-3">
        {d.p90 != null && <span className="absolute inset-y-0 rounded-sm bg-ink/10" style={{ width: pct(d.p90) }} aria-hidden />}
        {d.p50 != null && <span className="absolute inset-y-[5px] left-0 rounded-sm bg-chart-1" style={{ width: pct(d.p50) }} aria-hidden />}
      </span>
      <span className="t-caption whitespace-nowrap tabular-nums">
        {d.p50 == null ? <span className="text-ink-4">—</span> : <span className="font-medium text-ink">{fmtDays(d.p50)}</span>}
        {d.p90 != null && <span className="text-ink-3"> · P90 {fmtDays(d.p90)}</span>}
        <span className="text-ink-4"> · n = {d.n}</span>
      </span>
    </div>
  );
}

export interface DirectionDashboardProps {
  dossiers: FunnelDossier[];
  chiffrages: DashboardChiffrage[];
  missions: DashboardMission[];
  workflowLogs: WorkflowLog[];
  sla: SlaItem[];
  holidays: ReadonlySet<string>;
  now: Date;
  loading: boolean;
}

export function DirectionDashboard({ dossiers, chiffrages, missions, workflowLogs, sla, holidays, now, loading }: DirectionDashboardProps) {
  const t = useT();
  const [days, setDays] = useState<number>(30);
  const view = useMemo(
    () => computeDirectionView({ dossiers, chiffrages, missions, workflowLogs, sla, holidays }, now, days),
    [dossiers, chiffrages, missions, workflowLogs, sla, holidays, now, days],
  );
  const win = fmtWindow(now, days);
  const prevWin = t('vs période préc.');

  // Stocks are read at « maintenant », never over the window (demo-impact D3).
  const lateNow = useMemo(() => sla.filter((s) => s.late && !s.doneAt).length, [sla]);

  // North star: the median a director is judged on, its P90 and its 13-week shape.
  const ns = view.lead.requeteRapport;
  const trend = view.flow.map((w) => ({ label: w.label, value: w.termines }));
  const ladderMax = Math.max(1, ...view.ladder.map((r) => r.dist.p90 ?? r.dist.p50 ?? 0));

  // The money figure is gated on coverage: a wrong MAD number loses the room.
  const devisCoverage = view.devis.dossiers > 0 ? view.devis.withAccord / view.devis.dossiers : 0;
  const showMoney = view.devis.withAccord >= 5 && devisCoverage >= 0.6;

  return (
    <div className="space-y-6">
      {/* Period selector — page-scoped, top-right; every caption still prints its own window (R64). */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-caption">
          {t('Cohorte clôturée')} · {win} · {t('les stocks sont à maintenant')}
        </p>
        <div className="inline-flex rounded-md bg-surface-2 p-0.5" role="group" aria-label={t('Période')}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setDays(p.key)}
              aria-pressed={days === p.key}
              className={cn(
                'rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors',
                days === p.key ? 'bg-card text-ink shadow-rim' : 'text-ink-3 hover:text-ink-2',
              )}
            >
              {t(p.label)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bloc 1 — the north star, twice the size of anything else (demo-impact C1.2) ── */}
      <Card className="p-5" data-tour="dir-northstar">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <div className="min-w-0">
            <p className="t-label flex items-center">
              {t('Délai médian requête → rapport déposé')}
              <Def>
                <p className="font-medium text-ink">{t('Médiane des jours calendaires entre la requête de la compagnie et le dépôt du rapport.')}</p>
                <p className="mt-2">
                  {t('Cohorte : les dossiers DÉPOSÉS pendant la période — jamais un mélange d’ouverts et de clos. Champs : dateRequete → dateRapportDepose.')}
                </p>
                <p className="mt-2">{t('Le P90 dit ce que vit le dossier le plus lent sur dix ; c’est lui qui fait les réclamations.')}</p>
              </Def>
            </p>
            <p className="mt-1 text-[48px] font-semibold leading-none text-ink">{ns.p50 == null ? '—' : fmtDays(ns.p50)}</p>
            <p className="t-caption mt-2 flex flex-wrap items-center gap-x-2">
              <span>
                P90 <span className="font-medium text-ink-2">{fmtDays(ns.p90)}</span>
              </span>
              <span className="text-ink-4">·</span>
              <span>
                {ns.n} {t('dossiers clôturés')}
              </span>
              <span className="text-ink-4">·</span>
              <span>{win}</span>
            </p>
            <p className="t-caption mt-3 max-w-prose">
              {t('Sinistre → rapport')} : <span className="font-medium text-ink-2">{fmtDays(view.lead.sinistreRapport.p50)}</span>{' '}
              <span className="text-ink-4">({t('vécu par l’assuré, quand la date de sinistre est saisie')})</span>
            </p>
          </div>
          <div className="min-w-0">
            <TrendChart
              points={trend}
              kind="bar"
              label={t('Dossiers clôturés par semaine, 13 semaines')}
              fmt={(v) => fmtInt(v)}
              height={104}
            />
            <p className="t-caption mt-1">{t('Rapports déposés par semaine · 13 sem. · la dernière est en cours')}</p>
          </div>
        </div>
      </Card>

      {/* ── Bloc 2 — five tiles, the ceiling (demo-impact D1, R17) ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5" data-tour="dir-tiles">
        <StatTile
          label={t('En retard maintenant')}
          value={lateNow}
          danger={lateNow > 0}
          loading={loading}
          caption={<span>{t('délai de 24 h ouvrées dépassé')} · {t('maintenant')}</span>}
          title={t('Assignations chiffrage, terrain ou création au-delà de 24 h ouvrées et non terminées')}
        />
        <StatTile
          label={t('Dans les délais')}
          value={fmtPct(view.slaOnTime.pct)}
          loading={loading}
          caption={<RateLine r={view.slaOnTime} />}
          title={t('Part des assignations chiffrage et terrain terminées en 24 h ouvrées ou moins')}
        >
          <div className="mt-3">
            <Bullet value={view.slaOnTime.pct} max={100} label={t('Dans les délais')} fmt={(v) => fmtPct(v)} bands={[70, 90]} />
          </div>
        </StatTile>
        <StatTile
          label={t('Taux de révision')}
          value={view.firstPass.rate.pct == null ? '—' : fmtPct(100 - view.firstPass.rate.pct)}
          loading={loading}
          caption={
            <span>
              {view.firstPass.rate.den - view.firstPass.rate.num} {t('repris sur')} {view.firstPass.rate.den}
            </span>
          }
          title={t('Dossiers repris en 2ème ou 3ème accord, sur les dossiers chiffrés de la période')}
        >
          <p className="t-caption mt-2 text-tertiary-deep">{t(REFS.revision.label)}</p>
        </StatTile>
        <StatTile
          label={t('Clôturés / entrées')}
          value={view.closing == null ? '—' : fmtDec(view.closing, 2)}
          loading={loading}
          caption={
            <span>
              {view.termines} {t('clôturés')} · {view.recus} {t('entrés')} · {win}
            </span>
          }
          title={t('Au-dessus de 1, le stock baisse ; en dessous, il monte')}
        />
        <StatTile
          label={t('Dossiers en cours')}
          value={view.enCours}
          loading={loading}
          caption={<span>{t('sans rapport déposé')} · {t('maintenant')}</span>}
          href="/dossiers"
        />
      </div>

      {/* ── Bloc 3 — where the days actually go ── */}
      <Card className="p-5" data-tour="dir-ladder">
        <SectionTitle
          title={t('Décomposition du délai')}
          caption={`${t('Médiane pleine, P90 en fond clair · jours calendaires · dossiers clôturés')} · ${win}`}
          def={
            <>
              <p className="font-medium text-ink">{t('Chaque étape est mesurée entre ses deux dates, sur les dossiers clôturés de la période.')}</p>
              <p className="mt-2">{t('Un dossier ne compte pour une étape que si ses deux bornes existent et sont dans l’ordre — l’effectif n est donc différent d’une ligne à l’autre, et il est imprimé.')}</p>
            </>
          }
        />
        {view.ladder.every((r) => r.dist.n === 0) ? (
          <p className="t-caption">{t('Aucun dossier clôturé sur la période.')}</p>
        ) : (
          view.ladder.map((r) => <LadderRowView key={r.key} label={t(r.label)} d={r.dist} max={ladderMax} />)
        )}
      </Card>

      {/* ── The depth, grouped by question (R63) ── */}
      <Tabs defaultValue="compagnies" className="space-y-4">
        <TabsList data-tour="dir-tabs">
          <TabsTrigger value="compagnies">{t('Compagnies')}</TabsTrigger>
          <TabsTrigger value="qualite">{t('Qualité')}</TabsTrigger>
          <TabsTrigger value="terrain">{t('Terrain')}</TabsTrigger>
          <TabsTrigger value="portefeuille">{t('Portefeuille')}</TabsTrigger>
          <TabsTrigger value="flux">{t('Flux')}</TabsTrigger>
        </TabsList>

        {/* Compagnies — the insurer IS the customer (demo-impact Q3.6). */}
        <TabsContent value="compagnies">
          <Block
            title={t('Par compagnie')}
            caption={`${t('Volume, encours, délai médian, respect du délai et reprises')} · ${win}`}
            bodyClassName="pb-0"
          >
            {view.compagnies.length === 0 ? (
              <DoneLine title={t('Aucun dossier sur la période.')} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Compagnie')}</TableHead>
                      <TableHead className="text-right">{t('Entrées')}</TableHead>
                      <TableHead className="text-right">{t('Part')}</TableHead>
                      <TableHead className="text-right">{t('En cours')}</TableHead>
                      <TableHead className="text-right">{t('Délai médian')}</TableHead>
                      <TableHead className="text-right">P90</TableHead>
                      <TableHead className="text-right">{t('Sinistre → requête')}</TableHead>
                      <TableHead className="text-right">{t('Dans les délais')}</TableHead>
                      <TableHead className="text-right">{t('1er accord net')}</TableHead>
                      <TableHead className="text-right">EAD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {view.compagnies.map((c) => (
                      <TableRow key={c.key}>
                        <TableCell className="font-medium text-ink">{c.label}</TableCell>
                        <TableCell className="text-right">{c.volume}</TableCell>
                        <TableCell className="text-right text-ink-3">{fmtPct(c.share)}</TableCell>
                        <TableCell className="text-right">{c.enCours}</TableCell>
                        <TableCell className="text-right">{fmtDays(c.delaiP50)}</TableCell>
                        <TableCell className="text-right text-ink-2">{fmtDays(c.delaiP90)}</TableCell>
                        <TableCell className="text-right text-ink-2">{fmtDays(c.sinistreRequeteP50)}</TableCell>
                        <TableCell className="text-right">{fmtPct(c.slaOnTime.pct)}</TableCell>
                        <TableCell className="text-right">{fmtPct(c.firstPass.pct)}</TableCell>
                        <TableCell className="text-right text-ink-2">{fmtPct(c.ead.pct)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Block>
        </TabsContent>

        {/* Qualité — the twin of every speed number (A1 pairing rule). */}
        <TabsContent value="qualite" className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle
              title={t('Premier accord sans reprise')}
              caption={`${t('Part des dossiers chiffrés une seule fois')} · ${win}`}
              def={
                <>
                  <p className="font-medium text-ink">{t('1 − (dossiers repris en 2ème ou 3ème accord ÷ dossiers chiffrés).')}</p>
                  <p className="mt-2">{t('La cohorte est le dossier dont le PREMIER envoi au chiffrage tombe dans la période, pour que la reprise soit comptée avec son origine.')}</p>
                </>
              }
            />
            <p className="text-[36px] font-semibold leading-none text-ink">{fmtPct(view.firstPass.rate.pct)}</p>
            <p className="t-caption mt-2">
              <RateLine r={view.firstPass.rate} /> · {t('3ème accord')} : {fmtPct(view.firstPass.thirdRound.pct)}
            </p>
            <p className="t-caption mt-3">
              {t('Délai médian d’une reprise')} : <span className="font-medium text-ink-2">{fmtHours(view.revisionHours.p50)}</span>{' '}
              <span className="text-ink-4">· n = {view.revisionHours.n}</span>
            </p>
            {view.firstPassByGarage.length > 0 && (
              <div className="mt-4 border-t border-hairline pt-3">
                <p className="t-label mb-2">{t('Par garage')}</p>
                <ul className="space-y-1">
                  {view.firstPassByGarage.slice(0, 6).map((g) => (
                    <li key={g.key} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="truncate text-ink-2">{g.label}</span>
                      <span className="tabular-nums text-ink">
                        {fmtPct(g.rate.pct)} <span className="text-ink-4">· n = {g.n}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle
              title={t('Le contrôle du devis')}
              caption={`${t('Lignes du dernier devis structuré de chaque dossier')} · ${win}`}
              def={
                <>
                  <p className="font-medium text-ink">{t('Compté en LIGNES, pas en dirhams : une ligne écartée est un contrôle exercé.')}</p>
                  <p className="mt-2">{t('Un seul devis par dossier (le plus récent). Les devis scannés sans table structurée ne comptent pas — l’effectif est imprimé.')}</p>
                </>
              }
            />
            {view.devis.rows === 0 ? (
              <p className="t-caption">{t('Aucun devis structuré sur la période.')}</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="t-label">{t('Lignes écartées')}</p>
                  <p className="mt-0.5 text-2xl font-semibold leading-none text-ink">{fmtPct(view.devisRates.ecartees.pct)}</p>
                  <p className="t-caption mt-1">
                    <RateLine r={view.devisRates.ecartees} unit={` ${t('lignes')}`} /> · {view.devis.dossiers} {t('dossiers')}
                  </p>
                </div>
                <StackedBar
                  label={t('Réparation ou remplacement')}
                  segments={[
                    { key: 'rep', label: t('Réparation'), value: view.devis.reparation, tone: 'accent' },
                    { key: 'remp', label: t('Remplacement'), value: view.devis.remplacement, tone: 'muted' },
                  ]}
                />
                {view.devis.remplacement > 0 && (
                  <StackedBar
                    label={t('Nature des pièces remplacées')}
                    segments={[
                      { key: 'ori', label: t('Originale'), value: view.devis.originale, tone: 'accent' },
                      { key: 'ada', label: t('Adaptable'), value: view.devis.adaptable, tone: 'accent-2' },
                      { key: 'occ', label: t('Occasion'), value: view.devis.occasion, tone: 'accent-3' },
                    ]}
                  />
                )}
                {showMoney && (
                  <div className="border-t border-hairline pt-3">
                    <p className="t-label flex items-center">
                      {t('Écart devis → accord')}
                      <Def>
                        <p className="font-medium text-ink">{t('Somme des lignes du devis moins la colonne d’accord, sur les dossiers qui portent un accord chiffré.')}</p>
                        <p className="mt-2">{t('Estimation : les valeurs d’accord sont saisies au clavier dans le tableau, et seuls les dossiers avec une colonne d’accord comptent. À lire avec son effectif.')}</p>
                      </Def>
                    </p>
                    <p className="mt-0.5 text-2xl font-semibold leading-none text-ink">{fmtMAD(view.devisRates.economieHT)}</p>
                    <p className="t-caption mt-1">
                      {fmtPct(view.devisRates.economiePct)} {t('du devis')} · {view.devis.withAccord} {t('dossiers avec accord chiffré')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title={t('Facture → rapport déposé')} caption={`${t('Part déposée en 48 h ouvrées ou moins')} · ${win}`} />
            <p className="text-[36px] font-semibold leading-none text-ink">{fmtPct(view.facture48.pct)}</p>
            <p className="t-caption mt-2">
              <RateLine r={view.facture48} />
            </p>
            <p className="t-caption mt-2 text-tertiary-deep">{t(REFS.facture48.label)}</p>
          </Card>

          <Card className="p-5">
            <SectionTitle
              title={t('Touches par dossier')}
              caption={`${t('Personnes distinctes intervenues, dossiers clôturés')} · ${win}`}
              def={<p>{t('Nombre d’utilisateurs humains distincts ayant écrit dans le journal du dossier. Les écritures système et invité sont exclues.')}</p>}
            />
            {view.touches.n === 0 ? (
              <p className="t-caption">{t('Aucun dossier clôturé avec un journal sur la période.')}</p>
            ) : (
              <DotStrip
                values={view.touches.values}
                label={t('Touches par dossier')}
                fmt={(v) => fmtDec(v, 0)}
                p50={view.touches.p50}
                p90={view.touches.p90}
              />
            )}
          </Card>
        </TabsContent>

        {/* Terrain — proof that someone actually stood in front of the vehicle. */}
        <TabsContent value="terrain" className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle
              title={t('Ponctualité et preuve de visite')}
              caption={`${t('Missions dont les photos sont arrivées')} · ${win}`}
              def={
                <>
                  <p className="font-medium text-ink">{t('Visite le jour du RDV : les photos de la mission portent la date du rendez-vous.')}</p>
                  <p className="mt-2">{t('Pointage : la mission porte un pointage GPS. Le pointage est facultatif, donc ce taux mesure l’usage de l’outil autant que le terrain — les deux sont imprimés côte à côte.')}</p>
                </>
              }
            />
            <div className="space-y-4">
              <div>
                <p className="t-label">{t('Visite le jour du RDV')}</p>
                <p className="mt-0.5 text-2xl font-semibold leading-none text-ink">{fmtPct(view.terrain.visiteJourRdv.pct)}</p>
                <p className="t-caption mt-1">
                  <RateLine r={view.terrain.visiteJourRdv} />
                </p>
              </div>
              <div>
                <p className="t-label">{t('Missions avec pointage GPS')}</p>
                <p className="mt-0.5 text-2xl font-semibold leading-none text-ink">{fmtPct(view.terrain.pointageGps.pct)}</p>
                <p className="t-caption mt-1">
                  <RateLine r={view.terrain.pointageGps} />
                </p>
              </div>
              <div>
                <p className="t-label">{t('Missions replanifiées')}</p>
                <p className="mt-0.5 text-2xl font-semibold leading-none text-ink">{fmtPct(view.terrain.replanifiees.pct)}</p>
                <p className="t-caption mt-1">
                  <RateLine r={view.terrain.replanifiees} />
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title={t('Préavis et délai photo')} caption={`${t('Jours entre la planification et le RDV, puis heures ouvrées jusqu’aux photos')} · ${win}`} />
            {view.terrain.preavis.n === 0 ? (
              <p className="t-caption">{t('Aucune mission planifiée sur la période.')}</p>
            ) : (
              <>
                <p className="t-label mb-1">{t('Préavis de rendez-vous')}</p>
                <DotStrip
                  values={view.terrain.preavis.values}
                  label={t('Préavis de rendez-vous')}
                  fmt={(v) => fmtDays(v)}
                  p50={view.terrain.preavis.p50}
                  p90={view.terrain.preavis.p90}
                />
                <p className="t-label mb-1 mt-4">{t('Planification → photos')}</p>
                <DotStrip
                  values={view.terrain.photosDelaiHours.values}
                  label={t('Planification → photos')}
                  fmt={(v) => fmtHours(v)}
                  p50={view.terrain.photosDelaiHours.p50}
                  p90={view.terrain.photosDelaiHours.p90}
                  reference={24}
                  referenceLabel={t('délai')}
                />
              </>
            )}
          </Card>
        </TabsContent>

        {/* Portefeuille — the mix a buyer asks about. */}
        <TabsContent value="portefeuille" className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle title={t('Nature des dossiers')} caption={`${t('Dossiers entrés')} · ${win}`} />
            {view.natures.length === 0 ? (
              <p className="t-caption">{t('Aucun dossier sur la période.')}</p>
            ) : (
              <ul className="space-y-1.5">
                {view.natures.slice(0, 8).map((n) => (
                  <li key={n.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-x-3">
                    <span className="t-body-sm truncate text-ink-2" title={n.label}>
                      {n.label}
                    </span>
                    <span className="relative block h-3 rounded-sm bg-surface-3">
                      <span className="absolute inset-y-0 left-0 rounded-sm bg-chart-1" style={{ width: `${n.share}%` }} aria-hidden />
                    </span>
                    <span className="t-caption whitespace-nowrap tabular-nums">
                      <span className="font-medium text-ink">{n.count}</span> · {fmtPct(n.share)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle
              title={t('Expertise à distance et réforme')}
              caption={`${t('Deux marqueurs que toute compagnie regarde')} · ${win}`}
              def={
                <>
                  <p className="font-medium text-ink">{t('EAD : nature = EAD, sur les dossiers entrés.')}</p>
                  <p className="mt-2">{t('Réforme : nature ou statut = Réforme. L’âge du véhicule vient de la mise en circulation, quand elle est saisie.')}</p>
                </>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="t-label">{t('Part EAD')}</p>
                <p className="mt-0.5 text-2xl font-semibold leading-none text-ink">{fmtPct(view.ead.pct)}</p>
                <p className="t-caption mt-1">
                  <RateLine r={view.ead} />
                </p>
              </div>
              <div>
                <p className="t-label">{t('Taux de réforme')}</p>
                <p className="mt-0.5 text-2xl font-semibold leading-none text-ink">{fmtPct(view.reforme.rate.pct)}</p>
                <p className="t-caption mt-1">
                  <RateLine r={view.reforme.rate} />
                </p>
              </div>
            </div>
            {view.reforme.byAge.some((b) => b.rate.den > 0) && (
              <div className="mt-4 border-t border-hairline pt-3">
                <p className="t-label mb-2">{t('Réforme par âge du véhicule')}</p>
                <ul className="space-y-1">
                  {view.reforme.byAge.map((b) => (
                    <li key={b.key} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="text-ink-2">{b.label} {t('ans')}</span>
                      <span className="tabular-nums text-ink">
                        {fmtPct(b.rate.pct)} <span className="text-ink-4">· n = {b.rate.den}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="t-caption mt-4">
              {t('Contradictoires et arbitrages')} : <span className="font-medium text-ink-2">{fmtPct(view.contradictoire.pct)}</span>{' '}
              <span className="text-ink-4">
                (<RateLine r={view.contradictoire} />)
              </span>
            </p>
          </Card>
        </TabsContent>

        {/* Flux — arrivals vs departures, and when the work lands. */}
        <TabsContent value="flux" className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle
              title={t('Entrées et sorties')}
              caption={t('Dossiers créés et rapports déposés par semaine · 13 sem.')}
              def={<p>{t('Quand les barres d’entrée dépassent durablement celles de sortie, le stock monte : c’est le signal qu’un diagramme de flux cumulé donne, en deux longueurs comparables.')}</p>}
            />
            <PairedColumns
              points={view.flow.map((w) => ({ label: w.label, a: w.recus, b: w.termines }))}
              label={t('Entrées et sorties par semaine')}
              aLabel={t('Entrés')}
              bLabel={t('Clôturés')}
            />
          </Card>

          <Card className="p-5">
            <SectionTitle title={t('Quand les dossiers arrivent')} caption={`${t('Heure de création, jours ouvrés')} · ${win}`} />
            {view.heat.max === 0 ? (
              <p className="t-caption">{t('Aucun dossier sur la période.')}</p>
            ) : (
              /* Sunday earns its column only when something landed on it — otherwise
                 it is an empty strip, and its counts would still scale the others. */
              <HeatTable
                cells={view.heat.cells}
                max={view.heat.max}
                label={t('Créations par jour et par heure')}
                days={view.heat.cells.some((c) => c.weekday === 6 && c.count > 0) ? 7 : 6}
              />
            )}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <SectionTitle
              title={t('Déposés sans note d’honoraire')}
              caption={t('Rapport déposé il y a plus de 30 jours, note d’honoraire absente · maintenant')}
              def={<p>{t('Du travail fini et non facturé. Le compteur est à maintenant, pas sur la période.')}</p>}
            />
            {view.unbilled.length === 0 ? (
              <p className="t-body-sm text-ink">{t('Rien en attente de facturation.')}</p>
            ) : (
              <>
                <p className="text-2xl font-semibold leading-none text-ink">{view.unbilled.length}</p>
                <ul className="mt-3 space-y-1">
                  {view.unbilled.slice(0, 8).map((u) => (
                    <li key={u.dossier.id} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="t-mono truncate">{(u.dossier as any).refExpert || u.dossier.id}</span>
                      <span className="tabular-nums text-ink-2">{fmtDays(u.daysSinceDepot)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DirectionDashboard;
