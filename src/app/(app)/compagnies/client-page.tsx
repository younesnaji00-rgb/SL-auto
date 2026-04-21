'use client';

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
import { SkeletonCard, SkeletonRow } from '@/components/ui/skeleton';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { cn } from '@/lib/utils';
import { CreateDossierDialog } from '@/components/dossiers/create-dossier-dialog';

export default function CompagniesClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get('selected');

  const { compagnies, loading: loadingCompagnies } = useCompagnies();
  const storage = useStorage();
  const db = useFirestore();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);

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
      nouveau: dossiers.filter(d => d.statut === 'Nouveau' || d.statut === 'Création de mission' || d.statut === 'Création de dossier' || d.statut === 'Demande expertise avant réparation').length,
      enCours: dossiers.filter(d => d.statut?.toLowerCase().includes('cours') || d.statut?.toLowerCase().includes('programmée')).length,
      clos: dossiers.filter(d => d.statut === 'Clôture' || d.statut === 'Dossier signé' || d.statut === 'Rapport Validé').length,
    };
  }, [dossiers]);

  if (loadingCompagnies) {
    return <PageLoader label="Chargement des partenaires..." />;
  }

  if (!selectedCompagnie) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Compagnies</h1>
          <p className="text-muted-foreground mt-1">Sélectionnez une compagnie partenaire pour consulter ses indicateurs et dossiers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {compagnies.map((c) => (
            <Card
              key={c.id}
              className="hover:shadow-lg transition-all cursor-pointer group border-l-4 overflow-hidden relative"
              style={{ borderLeftColor: c.couleur }}
              onClick={() => router.push(`/compagnies?selected=${c.id}`)}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 className="h-20 w-20" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div
                    className="relative p-2.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors overflow-hidden"
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
                    {c.logoUrl ? (
                      <img src={c.logoUrl} alt={c.nom} className="h-6 w-6 object-contain" />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <Upload className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transform group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-xl pt-4 group-hover:text-primary transition-colors">{c.nom}</CardTitle>
                <CardDescription>Visualiser l&apos;activité globale</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full w-fit">
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

  const statCards = [
    { label: 'Total Dossiers', val: stats.total, bgClass: 'bg-muted/30', numberClass: 'text-foreground' },
    { label: 'Nouveaux', val: stats.nouveau, bgClass: 'bg-violet-50 dark:bg-violet-900/20', numberClass: 'text-violet-700 dark:text-violet-200' },
    { label: 'En cours', val: stats.enCours, bgClass: 'bg-amber-50 dark:bg-amber-900/20', numberClass: 'text-amber-700 dark:text-amber-200' },
    { label: 'Terminés', val: stats.clos, bgClass: 'bg-emerald-50 dark:bg-emerald-900/20', numberClass: 'text-emerald-700 dark:text-emerald-200' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6">
        <div className="flex items-center gap-5">
          <div
            className="relative h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden cursor-pointer border hover:border-primary/30 transition-colors shrink-0"
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
            {selectedCompagnie.logoUrl ? (
              <img src={selectedCompagnie.logoUrl} alt={selectedCompagnie.nom} className="h-full w-full object-contain p-1" />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <Upload className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="h-8 w-1 rounded-full shrink-0" style={{ backgroundColor: selectedCompagnie.couleur }} />
              <h1 className="text-4xl font-semibold tracking-tight">
                {selectedCompagnie.nom}
              </h1>
            </div>
            <p className="text-muted-foreground">Tableau de bord opérationnel</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dossiers">Tous les dossiers</Link>
          </Button>
          <Button className="shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau dossier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className={cn('border shadow-sm', stat.bgClass)}>
            <CardHeader className="py-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn('text-4xl font-semibold tabular-nums', stat.numberClass)}>{stat.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-md overflow-hidden border">
        <CardHeader className="border-b py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">Portefeuille Dossiers</CardTitle>
              <CardDescription>Extraction en temps réel des missions {selectedCompagnie.nom}.</CardDescription>
            </div>
            <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={v => setFilters({ dateFrom: v })} onDateToChange={v => setFilters({ dateTo: v })} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="font-semibold text-xs uppercase tracking-[0.08em] text-muted-foreground">Réf Expert</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-[0.08em] text-muted-foreground">Assuré</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-[0.08em] text-muted-foreground">Matricule</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-[0.08em] text-muted-foreground">Statut</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-[0.08em] text-muted-foreground">Création</TableHead>
                <TableHead className="text-right font-semibold text-xs uppercase tracking-[0.08em] text-muted-foreground">Gérer</TableHead>
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
                  <TableRow key={d.id} className="group hover:bg-muted/50 transition-colors border-b">
                    <TableCell className="font-mono font-semibold text-primary text-sm tabular-nums">{d.refExpert}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim()}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded inline-block tabular-nums">
                        {d.matricule}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut || 'Nouveau'))}>
                        {d.statut || 'Nouveau'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {d.dateRequete ? format(d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete), 'dd MMM yyyy', { locale: fr }) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" asChild>
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
