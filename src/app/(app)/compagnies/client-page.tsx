'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Building2,
  FileText,
  ChevronRight,
  ExternalLink,
  Inbox,
  Upload,
  Plus,
} from 'lucide-react';
import { useCompagnies } from '@/hooks/use-compagnies';
import { useCurrentUser } from '@/hooks/use-current-user';
import { hasPermission } from '@/lib/permissions';
import { useDossiers } from '@/hooks/use-dossiers';
import { useStorage, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { PageLoader } from '@/components/ui/page-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { isClosedStatus } from '@/lib/status-machine';
import { cn } from '@/lib/utils';
import { CreateDossierDialog } from '@/components/dossiers/create-dossier-dialog';

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
      enCours: dossiers.filter(d => d.statut?.toLowerCase().includes('cours') || d.statut?.toLowerCase().includes('programmée')).length,
      clos: dossiers.filter(d => isClosedStatus(d.statut || '')).length,
    };
  }, [dossiers]);

  if (loadingCompagnies) {
    return <PageLoader label="Chargement des partenaires..." />;
  }

  if (!selectedCompagnie) {
    return (
      <div className="space-y-8">
        <PageHeader title="Compagnies" subtitle="Sélectionnez une compagnie partenaire pour consulter ses indicateurs et dossiers." />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {compagnies.map((c) => (
            <Card
              key={c.id}
              className="group relative cursor-pointer overflow-hidden border-l-4 transition-shadow hover:shadow-raised"
              style={{ borderLeftColor: c.couleur }}
              onClick={() => router.push(`/compagnies?selected=${c.id}`)}
            >
              <div className="absolute right-0 top-0 p-4 text-ink-4 opacity-20 transition-opacity group-hover:opacity-40" aria-hidden>
                <Building2 className="h-20 w-20" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div
                    className="relative overflow-hidden rounded-lg bg-surface-2 p-2.5 transition-colors group-hover:bg-surface-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (ev) => {
                        const file = (ev.target as HTMLInputElement).files?.[0];
                        if (file) handleLogoUpload(c.id, file);
                      };
                      input.click();
                    }}
                    title="Cliquez pour importer un logo"
                  >
                    {c.logoUrl && !logoErrors.has(c.id) ? (
                      <img
                        src={c.logoUrl}
                        alt={c.nom}
                        className="h-6 w-6 object-contain"
                        onError={() => markLogoFailed(c.id)}
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-ink-3" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <Upload className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-ink-4 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
                </div>
                <CardTitle className="pt-4 font-headline text-xl">{c.nom}</CardTitle>
                <CardDescription>Visualiser l&apos;activité globale</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="t-caption flex w-fit items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 font-medium">
                  <FileText className="h-3 w-3" />
                  Gérer les sinistres
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // First entry is the headline → the page's single featured (navy) surface.
  const statCards = [
    { label: 'Total dossiers', val: stats.total, featured: true },
    { label: 'Nouveaux', val: stats.nouveau, featured: false },
    { label: 'En cours', val: stats.enCours, featured: false },
    { label: 'Terminés', val: stats.clos, featured: false },
  ];

  return (
    <div className="space-y-8 animate-fade-in motion-reduce:animate-none">
      <div className="flex flex-col justify-between gap-6 border-b border-hairline pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-5">
          <div
            className="relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-surface-2 ring-1 ring-hairline transition-shadow hover:ring-hairline-strong"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (ev) => {
                const file = (ev.target as HTMLInputElement).files?.[0];
                if (file && selectedCompagnie) handleLogoUpload(selectedCompagnie.id, file);
              };
              input.click();
            }}
            title="Cliquez pour modifier le logo"
          >
            {selectedCompagnie.logoUrl && !logoErrors.has(selectedCompagnie.id) ? (
              <img
                src={selectedCompagnie.logoUrl}
                alt={selectedCompagnie.nom}
                className="h-full w-full object-contain p-2"
                onError={() => markLogoFailed(selectedCompagnie.id)}
              />
            ) : (
              <Building2 className="h-14 w-14 text-ink-4" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <Upload className="h-4 w-4 text-white" />
            </div>
          </div>
          <PageHeader
            size="compact"
            backHref="/compagnies"
            backLabel="Compagnies"
            title={selectedCompagnie.nom}
            icon={<span className="block h-6 w-1 rounded-full" style={{ backgroundColor: selectedCompagnie.couleur }} aria-hidden />}
            subtitle="Tableau de bord opérationnel"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dossiers">Tous les dossiers</Link>
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau dossier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} variant={stat.featured ? 'featured' : 'tonal'}>
            <CardContent className="p-5">
              <p className={cn('t-label', stat.featured && 'text-on-ink/70')}>{stat.label}</p>
              <p className={cn('mt-1 tabular-nums', stat.featured ? 't-display text-on-ink' : 't-title')}>{stat.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-hairline">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Portefeuille dossiers</CardTitle>
              <CardDescription>Extraction en temps réel des missions {selectedCompagnie.nom}.</CardDescription>
            </div>
            <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={v => setFilters({ dateFrom: v })} onDateToChange={v => setFilters({ dateTo: v })} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Réf. expert</TableHead>
                <TableHead>Assuré</TableHead>
                <TableHead>Matricule</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Création</TableHead>
                <TableHead className="text-right">Gérer</TableHead>
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
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      icon={<Inbox />}
                      title={`Aucun dossier pour ${selectedCompagnie.nom}`}
                      description="Aucun dossier n'est actuellement associé à cette compagnie sur la période sélectionnée."
                      dashed={false}
                      className="border-0 bg-transparent py-10"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                dossiers.map((d) => (
                  <TableRow key={d.id} className="group">
                    <TableCell className="t-mono font-semibold">{d.refExpert}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim()}
                    </TableCell>
                    <TableCell>
                      <span className="t-mono inline-block rounded bg-surface-2 px-2 py-0.5">
                        {d.matricule}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut || 'Nouveau'))}>
                        {d.statut || 'Nouveau'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-ink-3">
                      {d.dateRequete ? format(d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete), 'dd MMM yyyy', { locale: fr }) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/dossiers/${d.id}`} title="Ouvrir le dossier">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
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
