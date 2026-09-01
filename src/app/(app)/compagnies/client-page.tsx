'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Building2, ChevronRight, Inbox, Upload } from 'lucide-react';
import { useCompagnies, type Compagnie } from '@/hooks/use-compagnies';
import { useCurrentUser } from '@/hooks/use-current-user';
import { hasPermission } from '@/lib/permissions';
import { useDossiers } from '@/hooks/use-dossiers';
import { useStorage, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter } from '@/components/date-range-filter';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { NAV_ITEMS, titleForRoute } from '@/lib/nav-groups';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';
import { isClosedStatus } from '@/lib/status-machine';
import { cn } from '@/lib/utils';
import { CreateDossierDialog } from '@/components/dossiers/create-dossier-dialog';

/**
 * Status family → semantic status pair (DESIGN.md §10). Local stand-in for
 * `lib/status-colors` (hand-picked hues, shared file outside this page).
 */
function statusChipClass(status: string): string {
  const s = (status || '').trim();
  if (s.startsWith('Planification')) return 'bg-status-info-bg text-status-info-fg';
  if (s === 'Chiffrage en cours') return 'bg-status-warning-bg text-status-warning-fg';
  if (/accord/i.test(s)) return 'bg-status-success-bg text-status-success-fg';
  return 'bg-surface-3 text-ink-2';
}

function isEnCours(statut?: string): boolean {
  const s = statut?.toLowerCase() ?? '';
  return s.includes('cours') || s.includes('programmée');
}

/**
 * Logo tile — also the upload control (one plain click target, no banner;
 * the hover veil is the only cue). `size` = card tile or dashboard tile.
 */
function LogoTile({
  compagnie,
  failed,
  onFail,
  onUpload,
  size = 'sm',
  className,
}: {
  compagnie: Compagnie;
  failed: boolean;
  onFail: () => void;
  onUpload: (file: File) => void;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const pick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (file) onUpload(file);
    };
    input.click();
  };
  const lg = size === 'lg';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        pick();
      }}
      title="Cliquez pour importer un logo"
      aria-label={`Importer le logo de ${compagnie.nom}`}
      className={cn(
        'group/logo relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 shadow-rim transition-colors hover:bg-surface-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        lg ? 'h-16 w-16' : 'h-12 w-12',
        className,
      )}
    >
      {compagnie.logoUrl && !failed ? (
        <img
          src={compagnie.logoUrl}
          alt={compagnie.nom}
          className={cn('object-contain', lg ? 'h-full w-full p-2' : 'h-8 w-8')}
          onError={onFail}
        />
      ) : (
        <Building2 className={cn('text-ink-4', lg ? 'h-8 w-8' : 'h-6 w-6')} aria-hidden />
      )}
      <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-[color:var(--scrim)] text-on-ink opacity-0 transition-opacity group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100">
        <Upload className={lg ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden />
      </span>
    </button>
  );
}

export default function CompagniesClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get('selected');

  const { compagnies: allCompagnies, loading: loadingCompagnies } = useCompagnies();
  const { profile } = useCurrentUser();
  // Filter out compagnies the current user has been denied access to via
  // the per-user permissions. Applied across the entire page (cards grid,
  // detail view, etc.) — `compagnies` below is the post-filter list.
  const compagnies = useMemo(
    () => allCompagnies.filter((c) => hasPermission(profile, `/compagnies#${c.id}`, true)),
    [allCompagnies, profile],
  );
  const storage = useStorage();
  const db = useFirestore();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());
  const markLogoFailed = (id: string) =>
    setLogoErrors((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  const handleLogoUpload = async (compagnieId: string, file: File) => {
    if (!storage || !db) return;
    try {
      const storagePath = `compagnies/${compagnieId}/logo/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'compagnies', compagnieId), { logoUrl: url });
      toast({ title: 'Logo mis à jour' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: e.message });
    }
  };

  const selectedCompagnie = useMemo(() =>
    compagnies.find(c => c.id === selectedId),
    [compagnies, selectedId]
  );

  const { dossiers: allDossiers, loading: loadingDossiers } = useDossiers(selectedCompagnie?.nom ? [selectedCompagnie.nom] : undefined);
  const filterDefaults = { dateFrom: '', dateTo: '' };
  const [filters, setFilters] = usePersistedFilters('compagnies', filterDefaults);
  const { dateFrom, dateTo } = filters;

  const dossiers = useMemo(() => {
    let results = [...allDossiers];
    if (dateFrom) {
      const from = new Date(dateFrom);
      results = results.filter(d => {
        if (!d.dateRequete) return false;
        const date = d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete);
        return date >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(d => {
        if (!d.dateRequete) return false;
        const date = d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete);
        return date <= to;
      });
    }
    return results;
  }, [allDossiers, dateFrom, dateTo]);

  const stats = useMemo(() => {
    if (!dossiers) return { total: 0, nouveau: 0, enCours: 0, clos: 0 };
    return {
      total: dossiers.length,
      nouveau: dossiers.filter(d => d.statut === 'Nouveau' || d.statut === 'Création dossier').length,
      enCours: dossiers.filter(d => isEnCours(d.statut)).length,
      clos: dossiers.filter(d => isClosedStatus(d.statut || '')).length,
    };
  }, [dossiers]);

  // Grid view: with no compagnie selected, `useDossiers()` already streams
  // every dossier, so per-compagnie counts come free (no extra query).
  const countsByCompagnie = useMemo(() => {
    const map = new Map<string, { total: number; enCours: number }>();
    if (selectedCompagnie) return map;
    for (const d of allDossiers) {
      const key = d.compagnie || '';
      const entry = map.get(key) ?? { total: 0, enCours: 0 };
      entry.total++;
      if (isEnCours(d.statut)) entry.enCours++;
      map.set(key, entry);
    }
    return map;
  }, [allDossiers, selectedCompagnie]);

  const nav = NAV_ITEMS.find((i) => i.href === '/compagnies');
  const pageTitle = titleForRoute('/compagnies') ?? 'Compagnies';

  if (loadingCompagnies) {
    // Same anatomy as compagnies/loading.tsx (header + card grid).
    return (
      <div className="space-y-8" aria-busy="true" aria-live="polite">
        <PageHeader title={pageTitle} subtitle={nav?.subtitle} noAutoFocus />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="paper p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-6">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!selectedCompagnie) {
    return (
      <div className="space-y-8">
        <PageHeader title={pageTitle} subtitle={nav?.subtitle} count={compagnies.length} />

        {compagnies.length === 0 ? (
          <EmptyState
            icon={<Building2 />}
            title="Aucune compagnie accessible"
            description="Aucune compagnie partenaire n'est visible avec vos permissions actuelles."
          />
        ) : (
          // Glass panes with the light edge: logo tile + name as the row
          // anchor, counts as quiet label / bold value pairs (blueprint §6).
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Compagnies partenaires">
            {compagnies.map((c) => {
              const counts = countsByCompagnie.get(c.nom);
              return (
                <li key={c.id} className="min-w-0">
                  <Card
                    role="link"
                    tabIndex={0}
                    aria-label={`Ouvrir ${c.nom}`}
                    className="group relative cursor-pointer p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => router.push(`/compagnies?selected=${c.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/compagnies?selected=${c.id}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <LogoTile
                        compagnie={c}
                        failed={logoErrors.has(c.id)}
                        onFail={() => markLogoFailed(c.id)}
                        onUpload={(file) => handleLogoUpload(c.id, file)}
                      />
                      <h2 className="t-heading min-w-0 flex-1 truncate">{c.nom}</h2>
                      <ChevronRight className="h-5 w-5 shrink-0 text-ink-4 transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-ink motion-reduce:transition-none" aria-hidden />
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-x-6">
                      <div>
                        <dt className="t-label">Dossiers</dt>
                        <dd className="t-title mt-1 tabular-nums">
                          {loadingDossiers ? <Skeleton className="h-6 w-10" /> : counts?.total ?? 0}
                        </dd>
                      </div>
                      <div>
                        <dt className="t-label">En cours</dt>
                        <dd className="t-title mt-1 tabular-nums">
                          {loadingDossiers ? <Skeleton className="h-6 w-10" /> : counts?.enCours ?? 0}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // First entry is the headline → the page's single featured (terracotta) surface.
  const statCards = [
    { label: 'Total dossiers', val: stats.total, featured: true },
    { label: 'Nouveaux', val: stats.nouveau, featured: false },
    { label: 'En cours', val: stats.enCours, featured: false },
    { label: 'Terminés', val: stats.clos, featured: false },
  ];

  return (
    <div className="space-y-8 animate-fade-in motion-reduce:animate-none">
      {/* Record-style header: logo tile beside the compact PageHeader; the
          ONE solid primary (Nouveau dossier) sits in the actions slot. */}
      <div className="flex items-start gap-4">
        <LogoTile
          compagnie={selectedCompagnie}
          failed={logoErrors.has(selectedCompagnie.id)}
          onFail={() => markLogoFailed(selectedCompagnie.id)}
          onUpload={(file) => handleLogoUpload(selectedCompagnie.id, file)}
          size="lg"
          className="mt-0.5"
        />
        <PageHeader
          className="min-w-0 flex-1"
          size="compact"
          backHref="/compagnies"
          backLabel={pageTitle}
          title={selectedCompagnie.nom}
          subtitle="Tableau de bord opérationnel"
          actions={
            <>
              <Button variant="outline" asChild>
                <Link href="/dossiers">Tous les dossiers</Link>
              </Button>
              <Button onClick={() => setCreateOpen(true)}>Nouveau dossier</Button>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} variant={stat.featured ? 'featured' : 'tonal'} className="p-6">
            <p className={cn('t-label', stat.featured && 'text-tertiary-foreground')}>{stat.label}</p>
            <p className={cn('mt-1 tabular-nums', stat.featured ? 't-display text-tertiary-foreground' : 't-title')}>{stat.val}</p>
          </Card>
        ))}
      </div>

      {/* Portfolio: Section pattern (information-tab) — hairline header row
          with the block title and the date filter, table body below. */}
      <Card role="region" aria-label="Portefeuille dossiers" className="overflow-hidden">
        <header className="flex min-h-[48px] flex-wrap items-center justify-between gap-3 border-b border-hairline px-6 py-3">
          <div className="min-w-0">
            <h2 className="t-heading truncate">Portefeuille dossiers</h2>
            <p className="t-caption truncate">Extraction en temps réel des missions {selectedCompagnie.nom}.</p>
          </div>
          <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={v => setFilters({ dateFrom: v })} onDateToChange={v => setFilters({ dateTo: v })} />
        </header>
        <Table regionLabel={`Dossiers ${selectedCompagnie.nom}`}>
          <TableHeader>
            <TableRow>
              <TableHead>Réf. expert</TableHead>
              <TableHead>Assuré</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Création</TableHead>
              <TableHead className="w-12 text-right"><span className="sr-only">Ouvrir</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingDossiers ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={6} className="p-0">
                    <SkeletonRow />
                  </TableCell>
                </TableRow>
              ))
            ) : dossiers.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={<Inbox />}
                    title={`Aucun dossier pour ${selectedCompagnie.nom}`}
                    description="Aucun dossier n'est actuellement associé à cette compagnie sur la période sélectionnée."
                    dashed={false}
                    className="rounded-none bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            ) : (
              dossiers.map((d) => {
                const assure = typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim();
                return (
                  <TableRow key={d.id} className="group cursor-pointer" onClick={() => router.push(`/dossiers/${d.id}`)}>
                    <TableCell className="t-mono font-semibold">{d.refExpert || <span className="text-ink-4">—</span>}</TableCell>
                    <TableCell className="font-medium">{assure || <span className="text-ink-4">—</span>}</TableCell>
                    <TableCell className="t-mono">{d.matricule || <span className="text-ink-4">—</span>}</TableCell>
                    <TableCell>
                      <span className={cn('inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[11px] font-medium', statusChipClass(d.statut || 'Nouveau'))}>
                        {d.statut || 'Nouveau'}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-ink-2">
                      {d.dateRequete ? format(d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete), 'dd MMM yyyy', { locale: fr }) : <span className="text-ink-4">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Row = link, chevron at the row end (DESIGN.md §4). */}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-3 hover:text-ink" asChild onClick={(e) => e.stopPropagation()}>
                        <Link href={`/dossiers/${d.id}`} title="Ouvrir le dossier" aria-label={`Ouvrir le dossier ${d.refExpert || ''}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <CreateDossierDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialCompagnie={selectedCompagnie.nom}
        onCreated={(id) => router.push(`/dossiers/${id}`)}
      />
    </div>
  );
}
