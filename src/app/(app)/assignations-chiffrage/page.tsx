'use client';

import { PageHeader } from '@/components/layout/page-header';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calculator, ChevronRight, MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangeFilter } from '@/components/date-range-filter';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { fr } from 'date-fns/locale';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { SortableHeader, type SortDirection } from '@/components/ui/sortable-header';
import { useChiffreurWorkload } from '@/hooks/use-workload-counts';
import { REFORME_TYPES, normalizeReformeType } from '@/components/chiffreurs/reforme-dialog';
import { businessHoursBetween, formatBusinessLateness } from '@/lib/business-days';
import { useHolidays } from '@/hooks/use-holidays';
import { titleForRoute } from '@/lib/nav-groups';
import ObservationHistorySheet from '@/app/(app)/dossiers/observation-history-sheet';
import { useChiffrageTabs } from '@/hooks/use-chiffrage-tabs';

interface ChiffrageItem {
  id: string;
  dossierId: string;
  dossierNom: string;
  assignedChiffreurId?: string;
  assignedChiffreurNom: string;
  status: string;
  files: any[];
  createdAt: any;
  sentByNom?: string;
  sentByEmail?: string;
  completedAt?: any;
}

// Status pairs only (DESIGN.md §10) — never hand-picked amber/red classes.
type ChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
const CHIP_TONE: Record<ChipTone, string> = {
  neutral: 'bg-surface-3 text-ink-2',
  success: 'bg-status-success-bg text-status-success-fg',
  warning: 'bg-status-warning-bg text-status-warning-fg',
  danger: 'bg-status-danger-bg text-status-danger-fg',
  info: 'bg-status-info-bg text-status-info-fg',
};
function StatusChip({ tone, className, children }: { tone: ChipTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[11px] font-medium tabular-nums', CHIP_TONE[tone], className)}>
      {children}
    </span>
  );
}

const DEADLINE_HOURS = 24;

function formatRemaining(hours: number): string {
  if (hours >= 1) return `${Math.floor(hours)} h restantes`;
  return `${Math.max(1, Math.round(hours * 60))} min restantes`;
}

export default function AssignationsChiffragePage() {
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const { openTab } = useChiffrageTabs();
  const chiffreurWorkload = useChiffreurWorkload();
  const [chiffrages, setChiffrages] = useState<ChiffrageItem[]>([]);
  const [dossierStatuts, setDossierStatuts] = useState<Record<string, string>>({});
  const [dossierObs, setDossierObs] = useState<Record<string, { text: string; count: number }>>({});
  const [dossierReformeTypes, setDossierReformeTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [deadlineSort, setDeadlineSort] = useState<SortDirection>(null);
  const [obsHistoryDossier, setObsHistoryDossier] = useState<{ id: string; refExpert?: string } | null>(null);
  const filterDefaults = { dateFrom: '', dateTo: '', compagnieFilter: 'Toutes', chiffreurFilter: 'Tous', typeReformeFilter: 'Tous' };
  const [filters, setFilters, clearFilter] = usePersistedFilters('assignations-chiffrage', filterDefaults);
  const { dateFrom, dateTo, compagnieFilter, chiffreurFilter, typeReformeFilter } = filters;

  // Listen to chiffrages
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'chiffrages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      let items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChiffrageItem)).filter(c => c.files && c.files.length > 0);
      if (profile?.role === 'Chiffreur' && profile?.nom) {
        const myName = profile.nom.toLowerCase().trim();
        items = items.filter(c => c.assignedChiffreurNom?.toLowerCase().trim() === myName);
      }
      setChiffrages(items);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [db, profile?.role, profile?.nom]);

  // Listen to dossier statuts + compagnies + natures for all referenced dossierIds
  const [dossierCompagnies, setDossierCompagnies] = useState<Record<string, string>>({});
  const [dossierNatures, setDossierNatures] = useState<Record<string, string>>({});
  const [dossierAssure, setDossierAssure] = useState<Record<string, any>>({});
  const [dossierMatricule, setDossierMatricule] = useState<Record<string, string>>({});
  const dossierIds = useMemo(() => [...new Set(chiffrages.map(c => c.dossierId).filter(Boolean))], [chiffrages]);

  useEffect(() => {
    if (!db || dossierIds.length === 0) return;
    const unsubs = dossierIds.map(did =>
      onSnapshot(doc(db, 'dossiers', did), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setDossierStatuts(prev => ({ ...prev, [did]: data.statut || 'Nouveau' }));
          setDossierCompagnies(prev => ({ ...prev, [did]: data.compagnie || '' }));
          setDossierNatures(prev => ({ ...prev, [did]: data.nature || '' }));
          setDossierReformeTypes(prev => ({ ...prev, [did]: data.reforme?.typeReforme || '' }));
          setDossierAssure(prev => ({ ...prev, [did]: data.assure }));
          setDossierMatricule(prev => ({ ...prev, [did]: data.matricule || '' }));
        }
      })
    );
    return () => unsubs.forEach(u => u());
  }, [db, dossierIds.join(',')]);

  // Listen to observations subcollection per dossier (latest text + count)
  useEffect(() => {
    if (!db || dossierIds.length === 0) return;
    const unsubs = dossierIds.map(did =>
      onSnapshot(
        query(collection(db, 'dossiers', did, 'observations'), orderBy('createdAt', 'desc')),
        (snap) => {
          const text = (snap.docs[0]?.data().text as string) || '';
          setDossierObs(prev => ({ ...prev, [did]: { text, count: snap.size } }));
        }
      )
    );
    return () => unsubs.forEach(u => u());
  }, [db, dossierIds.join(',')]);

  // Build filter options from loaded data
  const compagnieOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    chiffrages.forEach(c => {
      const comp = dossierCompagnies[c.dossierId] || '';
      if (comp) counts[comp] = (counts[comp] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [chiffrages, dossierCompagnies]);

  // Chiffreur filter counts. We group for DISPLAY by name (what the user
  // picks in the dropdown) but compute counts from the shared "open chiffrage"
  // workload keyed by chiffreur id — so these numbers always match the ones
  // shown in the "Envoyer vers chiffrage" modal's chiffreur dropdown.
  // See src/lib/chiffreur-workload.ts for the single source of truth.
  const chiffreurOptions = useMemo(() => {
    const namesById: Record<string, string> = {};
    chiffrages.forEach(c => {
      const id = c.assignedChiffreurId;
      const name = c.assignedChiffreurNom?.trim();
      if (id && name && !namesById[id]) namesById[id] = name;
    });
    const byName: Record<string, number> = {};
    Object.entries(namesById).forEach(([id, name]) => {
      const n = chiffreurWorkload[id] || 0;
      byName[name] = (byName[name] || 0) + n;
    });
    return Object.entries(byName)
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [chiffrages, chiffreurWorkload]);

  const isToday = (ts: any) => {
    if (!ts) return false;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  };

  const holidays = useHolidays();
  const getDeadlineInfo = (ts: any, _nature: string) => {
    if (!ts) return { percent: 0, elapsed: 0, total: 0, overdue: false, elapsedHours: 0 };
    const created = ts.toDate ? ts.toDate() : new Date(ts);
    // Business-hours deadline: weekends + Moroccan holidays don't count.
    const totalHours = DEADLINE_HOURS;
    const elapsedHours = businessHoursBetween(created, new Date(), holidays);
    const percent = Math.min(Math.max((elapsedHours / totalHours) * 100, 0), 100);
    const HOUR_MS = 3_600_000;
    return {
      percent,
      elapsed: elapsedHours * HOUR_MS,
      total: totalHours * HOUR_MS,
      overdue: elapsedHours >= totalHours,
      elapsedHours,
    };
  };

  const filteredChiffrages = useMemo(() => {
    let results = [...chiffrages];
    if (compagnieFilter !== 'Toutes') {
      results = results.filter(c => (dossierCompagnies[c.dossierId] || '') === compagnieFilter);
    }
    if (chiffreurFilter !== 'Tous') {
      results = results.filter(c => c.assignedChiffreurNom?.trim() === chiffreurFilter);
    }
    if (typeReformeFilter !== 'Tous') {
      results = results.filter(c => normalizeReformeType(dossierReformeTypes[c.dossierId]) === typeReformeFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      results = results.filter(c => {
        if (!c.createdAt) return false;
        const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return date >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(c => {
        if (!c.createdAt) return false;
        const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return date <= to;
      });
    }
    if (deadlineSort) {
      // Sort by deadline end time (createdAt + 24h). Ascending = most urgent first.
      const DEADLINE_MS = 24 * 3600 * 1000;
      results.sort((a, b) => {
        const aCreated = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : null);
        const bCreated = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : null);
        const aEnd = aCreated === null ? (deadlineSort === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : aCreated + DEADLINE_MS;
        const bEnd = bCreated === null ? (deadlineSort === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : bCreated + DEADLINE_MS;
        return deadlineSort === 'asc' ? aEnd - bEnd : bEnd - aEnd;
      });
    } else {
      // Default: today's items first, then by createdAt desc
      results.sort((a, b) => {
        const aToday = isToday(a.createdAt) ? 1 : 0;
        const bToday = isToday(b.createdAt) ? 1 : 0;
        if (aToday !== bToday) return bToday - aToday;
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        return bDate - aDate;
      });
    }
    return results;
  }, [chiffrages, compagnieFilter, chiffreurFilter, typeReformeFilter, dossierCompagnies, dossierReformeTypes, dateFrom, dateTo, deadlineSort]);

  // The single most urgent open item gets the third colour on its date block
  // (planification-tab "next visit" convention): nearest deadline, not yet
  // overdue, not yet chiffré.
  const urgentId = useMemo(() => {
    let best: { id: string; end: number } | null = null;
    for (const c of filteredChiffrages) {
      if (c.completedAt || !c.createdAt) continue;
      const nature = dossierNatures[c.dossierId] || '';
      const d = getDeadlineInfo(c.createdAt, nature);
      if (d.overdue) continue;
      const created = c.createdAt.toDate ? c.createdAt.toDate().getTime() : new Date(c.createdAt).getTime();
      const end = created + DEADLINE_HOURS * 3_600_000;
      if (!best || end < best.end) best = { id: c.id, end };
    }
    return best?.id ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredChiffrages, dossierNatures, holidays]);

  const toDate = (ts: any): Date | null => {
    if (!ts) return null;
    return ts.toDate ? ts.toDate() : new Date(ts);
  };

  const renderAssure = (assure: any): string => {
    if (!assure) return 'N/A';
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || 'N/A';
  };

  const isChiffreur = profile?.role === 'Chiffreur';
  const canSeeNameFilter = profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const showChiffreur = !isChiffreur;
  const hasActiveFilter =
    compagnieFilter !== 'Toutes' || chiffreurFilter !== 'Tous' || typeReformeFilter !== 'Tous' || !!dateFrom || !!dateTo;

  const resetFilters = () => {
    clearFilter('compagnieFilter');
    clearFilter('chiffreurFilter');
    clearFilter('typeReformeFilter');
    clearFilter('dateFrom');
    clearFilter('dateTo');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={titleForRoute('/assignations-chiffrage') ?? 'Assignations au chiffrage'}
        count={filteredChiffrages.length}
        filters={
          // Quiet toolbar: solid selects under `t-label` labels, one ghost reset.
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className="flex flex-col gap-1">
              <span className="t-label">Compagnie</span>
              <Select value={compagnieFilter} onValueChange={v => setFilters({ compagnieFilter: v })}>
                <SelectTrigger className="h-9 w-[180px]" aria-label="Compagnie">
                  <SelectValue placeholder="Compagnie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Toutes">Toutes les compagnies</SelectItem>
                  {compagnieOptions.map(([name, count]) => (
                    <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canSeeNameFilter && (
              <div className="flex flex-col gap-1">
                <span className="t-label">Chiffreur</span>
                <Select value={chiffreurFilter} onValueChange={v => setFilters({ chiffreurFilter: v })}>
                  <SelectTrigger className="h-9 w-[180px]" aria-label="Chiffreur">
                    <SelectValue placeholder="Chiffreur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tous">Tous les chiffreurs</SelectItem>
                    {chiffreurOptions.map(([name, count]) => (
                      <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="t-label">Type de réforme</span>
              <Select value={typeReformeFilter} onValueChange={v => setFilters({ typeReformeFilter: v })}>
                <SelectTrigger className="h-9 w-[160px]" aria-label="Type de réforme">
                  <SelectValue placeholder="Type réforme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous">Tous les types</SelectItem>
                  {REFORME_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="t-label">Période</span>
              <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={v => setFilters({ dateFrom: v })} onDateToChange={v => setFilters({ dateTo: v })} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="t-label">Tri</span>
              <div className="flex h-9 items-center">
                <SortableHeader label="Délai" sort={deadlineSort} onChange={setDeadlineSort} className="text-sm" />
              </div>
            </div>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Réinitialiser
              </Button>
            )}
          </div>
        }
      />

      {/* Queue rows on hairlines with a date block anchor (planification-tab
          convention) — no table, no card-per-item. */}
      <Card className="overflow-hidden">
        {loading ? (
          <ul className="divide-y divide-hairline" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={`sk-${i}`} className="flex items-start gap-4 px-6 py-4">
                <Skeleton className="h-14 w-14 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3.5 w-72 max-w-full" />
                </div>
                <Skeleton className="h-5 w-24 rounded-full" />
              </li>
            ))}
          </ul>
        ) : filteredChiffrages.length === 0 ? (
          <EmptyState
            icon={<Calculator />}
            title="Aucun chiffrage assigné"
            description="Les nouvelles assignations de chiffrage apparaîtront ici."
            dashed={false}
            className="rounded-none bg-transparent py-12"
          />
        ) : (
          <ol className="divide-y divide-hairline">
            {filteredChiffrages.map((c) => {
              const statut = dossierStatuts[c.dossierId] || 'Nouveau';
              const nature = dossierNatures[c.dossierId] || '';
              const today = isToday(c.createdAt);
              const deadline = getDeadlineInfo(c.createdAt, nature);
              const created = toDate(c.createdAt);
              const completed = toDate(c.completedAt);
              const urgent = c.id === urgentId;
              const obs = dossierObs[c.dossierId];
              const obsCount = obs?.count ?? 0;
              const obsText = obs?.text || '';
              const obsTruncated = obsText.length > 60 ? obsText.slice(0, 60) + '…' : obsText;
              const remainingHours = Math.max(0, DEADLINE_HOURS - deadline.elapsedHours);
              const deadlineTone: ChipTone = deadline.overdue ? 'danger' : deadline.percent > 80 ? 'danger' : deadline.percent > 50 ? 'warning' : 'neutral';
              const href = `/assignations-chiffrage/${c.id}`;

              return (
                <li key={c.id} className="relative flex items-start gap-4 px-6 py-4 transition-colors hover:bg-surface-2">
                  {/* Date block — the row's anchor; the most urgent open item wears the third colour. */}
                  <div
                    className={cn(
                      'flex w-14 shrink-0 flex-col items-center justify-center rounded-md py-1.5 text-center tabular-nums',
                      urgent ? 'bg-tertiary text-tertiary-foreground shadow-rim-filled' : 'bg-surface-3 text-ink-2 shadow-rim',
                    )}
                  >
                    <span className="text-[11px] font-medium leading-none">{created ? format(created, 'MMM', { locale: fr }).replace('.', '') : '—'}</span>
                    <span className="font-headline text-xl font-semibold leading-tight">{created ? format(created, 'd') : '—'}</span>
                    <span className="text-[11px] leading-none">{created ? format(created, 'HH:mm') : ''}</span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {/* Stretched link: the ref names the row and covers it; other controls sit above (z-10). */}
                      <Link
                        href={href}
                        onClick={() => openTab(c.id, c.dossierNom || `Chiffrage ${c.id.slice(0, 6)}`)}
                        className="t-mono font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                      >
                        {c.dossierNom || 'Sans ref.'}
                      </Link>
                      <span className="text-sm font-semibold text-ink">{renderAssure(dossierAssure[c.dossierId])}</span>
                      {today && <StatusChip tone="info">Aujourd&apos;hui</StatusChip>}
                      <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(statut), 'shrink-0')}>{statut}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
                      <span className="truncate">{dossierCompagnies[c.dossierId] || '—'}</span>
                      <span className="t-mono text-ink-3">{dossierMatricule[c.dossierId] || '—'}</span>
                      {nature && <span className="truncate">{nature}</span>}
                    </div>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 xl:grid-cols-4">
                      {showChiffreur && (
                        <div className="min-w-0">
                          <dt className="t-label">Chiffreur</dt>
                          <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{c.assignedChiffreurNom || <span className="font-normal text-ink-3">—</span>}</dd>
                        </div>
                      )}
                      <div className="min-w-0">
                        <dt className="t-label">Assigné par</dt>
                        <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{c.sentByNom || c.sentByEmail || <span className="font-normal text-ink-3">—</span>}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="t-label">Délai</dt>
                        <dd className="mt-0.5">
                          {completed ? (
                            <StatusChip tone="success">Chiffré le {format(completed, 'dd/MM/yyyy HH:mm')}</StatusChip>
                          ) : deadline.overdue ? (
                            <StatusChip tone="danger">En retard {formatBusinessLateness(deadline.elapsedHours - DEADLINE_HOURS)}</StatusChip>
                          ) : (
                            <StatusChip tone={deadlineTone}>{formatRemaining(remainingHours)}</StatusChip>
                          )}
                        </dd>
                      </div>
                      <div className="col-span-2 min-w-0 sm:col-span-3 xl:col-span-1">
                        <dt className="t-label">Observations</dt>
                        <dd className="mt-0.5">
                          {obsCount === 0 ? (
                            <span className="text-sm text-ink-3">—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setObsHistoryDossier({ id: c.dossierId, refExpert: c.dossierNom });
                              }}
                              title="Voir l'historique des observations"
                              className="relative z-10 inline-flex max-w-full items-center gap-1.5 rounded-md text-left text-sm text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                              <span className="truncate">{obsTruncated}</span>
                              {obsCount > 1 && <span className="t-caption shrink-0 tabular-nums">({obsCount})</span>}
                            </button>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <ChevronRight className="mt-4 h-4 w-4 shrink-0 text-ink-4" aria-hidden />
                </li>
              );
            })}
          </ol>
        )}
      </Card>
      <ObservationHistorySheet
        open={!!obsHistoryDossier}
        onOpenChange={(open) => !open && setObsHistoryDossier(null)}
        dossier={obsHistoryDossier}
      />
    </div>
  );
}
