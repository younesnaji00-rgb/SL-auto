'use client';

import { PageHeader } from '@/components/layout/page-header';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, STICKY_HEAD, STICKY_CELL, EmptyCell,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Calculator, MessageSquare } from 'lucide-react';
import { DeadlineBar } from '@/components/deadline-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { DateRangeFilter } from '@/components/date-range-filter';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { StatusChip } from '@/components/ui/status-chip';
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

const DEADLINE_HOURS = 24;

function formatRemaining(hours: number): string {
  if (hours >= 1) return `${Math.floor(hours)} h restantes`;
  return `${Math.max(1, Math.round(hours * 60))} min restantes`;
}

export default function AssignationsChiffragePage() {
  const db = useFirestore();
  const router = useRouter();
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
      const DEADLINE_MS = DEADLINE_HOURS * 3600 * 1000;
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

  const toDate = (ts: any): Date | null => {
    if (!ts) return null;
    return ts.toDate ? ts.toDate() : new Date(ts);
  };

  const formatDate = (ts: any) => {
    const date = toDate(ts);
    if (!date) return null;
    try { return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr }); }
    catch { return null; }
  };

  const renderAssure = (assure: any): string | null => {
    if (!assure) return null;
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || null;
  };

  // Empty table cells read « — » in ink-4 (blueprint §9: empty = — muted).
  const emptyCell = <EmptyCell />;

  const isChiffreur = profile?.role === 'Chiffreur';
  const canSeeNameFilter = profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const showChiffreurColumn = !isChiffreur;
  const colCount = showChiffreurColumn ? 10 : 9;
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
      {/* Page header (element-specs §1: Polaris Page ✓ — plural object title,
          count pill, filters row below; no filled button because this queue
          has no page-level action). */}
      <PageHeader
        title={titleForRoute('/assignations-chiffrage') ?? 'Assignations au chiffrage'}
        count={filteredChiffrages.length}
        filters={
          // Filter toolbar (element-specs §2: Polaris filters ✓ ≤ 3 promoted
          // filters + clear-all; NN/g filter categories ✓ general → specific;
          // Carbon data table ✓ toolbar ≤ 5 controls). Labels are `t-label`
          // sentence case above each control; the sort lives in the column
          // header, not here; ONE ghost "Réinitialiser" at the end.
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
                  <SelectValue placeholder="Type de réforme" />
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
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Réinitialiser
              </Button>
            )}
          </div>
        }
      />

      {/* Data table (element-specs §3: Polaris data table ✓ text left, headers
          aligned with their data, "fix the first column when many columns";
          NN/g data tables ✓ freeze header + first column when wider than the
          screen, hover highlight, first column = human identifier; Carbon ✓
          skeleton rows, only the sorted column shows its icon). The Card is
          the table's only frame (§5: no second frame around a single table). */}
      <Card className="overflow-hidden">
        <Table regionLabel="Assignations au chiffrage">
          <TableHeader>
            <TableRow>
              <TableHead className={STICKY_HEAD}>Dossier</TableHead>
              <TableHead>Nom d&apos;assuré</TableHead>
              <TableHead>Immatriculation</TableHead>
              {showChiffreurColumn && <TableHead>Chiffreur</TableHead>}
              <TableHead>Nature du dossier</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Assigné par</TableHead>
              <TableHead>Observations</TableHead>
              <TableHead className="w-[172px]">
                <SortableHeader label="Délai" sort={deadlineSort} onChange={setDeadlineSort} />
              </TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading (element-specs §15: NN/g skeleton screens ✓ mirror the
              // final layout — row-shaped, 44 px, pulse only).
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={colCount} className="p-0">
                    <SkeletonRow />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredChiffrages.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="p-0">
                  {/* Empty state (element-specs §12: NN/g ✓ state + reason +
                      pathway; Polaris ✓ one action). The filtered variant names
                      the fix — clear the filters — as its ONE `tonal` action. */}
                  <EmptyState
                    icon={<Calculator />}
                    title={hasActiveFilter ? 'Aucun chiffrage pour ces filtres' : 'Aucun chiffrage assigné'}
                    description={hasActiveFilter
                      ? 'Élargissez la période ou réinitialisez les filtres pour revoir la file.'
                      : 'Les nouvelles assignations de chiffrage apparaîtront ici.'}
                    action={hasActiveFilter ? (
                      <Button variant="tonal" onClick={resetFilters}>Réinitialiser les filtres</Button>
                    ) : undefined}
                    dashed={false}
                    className="border-0 bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredChiffrages.map((c) => {
                const statut = dossierStatuts[c.dossierId] || 'Nouveau';
                const nature = dossierNatures[c.dossierId] || '';
                const today = isToday(c.createdAt);
                const deadline = getDeadlineInfo(c.createdAt, nature);
                const completed = toDate(c.completedAt);
                const obs = dossierObs[c.dossierId];
                const obsCount = obs?.count ?? 0;
                const remainingHours = Math.max(0, DEADLINE_HOURS - deadline.elapsedHours);
                const dateLabel = formatDate(c.createdAt);

                return (
                  // The whole row is the link (owner 2026-09-02; §3 "row =
                  // link") — clicks anywhere open the chiffrage; the inner
                  // Link and the obs button stop propagation.
                  <TableRow
                    key={c.id}
                    className="group cursor-pointer"
                    onClick={() => {
                      openTab(c.id, c.dossierNom || `Chiffrage ${c.id.slice(0, 6)}`);
                      router.push(`/assignations-chiffrage/${c.id}`);
                    }}
                  >
                    {/* Frozen identifier column: sticky left, solid card so rows
                        scroll under it, hairline on its right edge (§3). */}
                    <TableCell className={STICKY_CELL}>
                      <Link
                        href={`/assignations-chiffrage/${c.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openTab(c.id, c.dossierNom || `Chiffrage ${c.id.slice(0, 6)}`);
                        }}
                        className="t-mono font-semibold hover:underline"
                      >
                        {c.dossierNom || 'Sans réf.'}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium text-ink">{renderAssure(dossierAssure[c.dossierId]) ?? emptyCell}</TableCell>
                    {/* Values in full ink (addendum 5 — values stuck at ink-2 read gray). */}
                    <TableCell className="t-mono text-ink">{dossierMatricule[c.dossierId] || emptyCell}</TableCell>
                    {showChiffreurColumn && <TableCell className="text-ink">{c.assignedChiffreurNom || emptyCell}</TableCell>}
                    <TableCell className="text-ink">{nature || emptyCell}</TableCell>
                    <TableCell>
                      {/* Status chip (§11: Carbon tag ✓ read-only category; label always, one pair per state). */}
                      <StatusChip status={statut} />
                    </TableCell>
                    <TableCell className="text-ink-2">{c.sentByNom || c.sentByEmail || emptyCell}</TableCell>
                    <TableCell>
                      {/* Row action (§3/§8: 1–2 inline row actions as `ghost`
                          buttons; the count is the trailing figure). Opens the
                          observation history sheet. */}
                      {obsCount === 0 ? emptyCell : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setObsHistoryDossier({ id: c.dossierId, refExpert: c.dossierNom }); }}
                          title={obs?.text || "Voir l'historique des observations"}
                          aria-label={`Voir les ${obsCount} observation${obsCount > 1 ? 's' : ''}`}
                        >
                          <MessageSquare />
                          <span className="tabular-nums">{obsCount}</span>
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Deadline meter (§6) — chart-1 fill; warning/danger only
                          when late/overdue; a stopped clock is ✓ + date in ink. */}
                      {completed ? (
                        <DeadlineBar
                          percent={100}
                          overdue={false}
                          completedLabel={`Chiffré le ${format(completed, 'dd/MM/yyyy HH:mm')}`}
                        />
                      ) : (
                        <DeadlineBar
                          percent={deadline.percent}
                          overdue={deadline.overdue}
                          lateness={deadline.overdue ? formatBusinessLateness(deadline.elapsedHours - DEADLINE_HOURS) : undefined}
                          label={formatRemaining(remainingHours)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-ink">
                      {/* Date is text → left-aligned like the other text columns;
                          the figure is Inter 600 tabular (addendum 3). Today = an
                          info chip with a label (§11) instead of tinting the row —
                          and no warm anchor beside the Délai meter. */}
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="font-semibold tabular-nums">{dateLabel ?? emptyCell}</span>
                        {today && <Badge variant="time">Aujourd&apos;hui</Badge>}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
      <ObservationHistorySheet
        open={!!obsHistoryDossier}
        onOpenChange={(open) => !open && setObsHistoryDossier(null)}
        dossier={obsHistoryDossier}
      />
    </div>
  );
}
