
'use client';

import React, { useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Building2,
  FileText,
  ChevronRight,
  ExternalLink,
  Loader2,
  Inbox,
  Upload,
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

export default function CompagniesClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get('selected');
  
  const { compagnies, loading: loadingCompagnies } = useCompagnies();
  const storage = useStorage();
  const db = useFirestore();
  const { toast } = useToast();

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

  const { dossiers, loading: loadingDossiers } = useDossiers(selectedCompagnie?.nom ? [selectedCompagnie.nom] : undefined);

  const stats = useMemo(() => {
    if (!dossiers) return { total: 0, nouveau: 0, enCours: 0, clos: 0 };
    return {
      total: dossiers.length,
      nouveau: dossiers.filter(d => d.statut === 'Nouveau' || d.statut === 'Création de mission' || d.statut === 'Demande expertise avant réparation').length,
      enCours: dossiers.filter(d => d.statut?.toLowerCase().includes('cours') || d.statut?.toLowerCase().includes('programmée')).length,
      clos: dossiers.filter(d => d.statut === 'Clôture' || d.statut === 'Dossier signé' || d.statut === 'Rapport Validé').length,
    };
  }, [dossiers]);

  if (loadingCompagnies) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Chargement des partenaires...</p>
      </div>
    );
  }

  if (!selectedCompagnie) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compagnies</h1>
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
                    className="relative p-2.5 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors overflow-hidden"
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <Upload className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transform group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-xl pt-4 group-hover:text-primary transition-colors">{c.nom}</CardTitle>
                <CardDescription>Visualiser l'activité globale</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full w-fit">
                  <FileText className="h-3 w-3" />
                  Gérer les Sinistres
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6">
        <div className="flex items-center gap-5">
          <div
            className="relative h-12 w-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden cursor-pointer border hover:border-primary/30 transition-colors"
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
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <Upload className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">
                {selectedCompagnie.nom}
              </h1>
            </div>
            <p className="text-muted-foreground font-medium">Tableau de bord opérationnel</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dossiers">Tous les dossiers</Link>
          </Button>
          <Button asChild className="shadow-lg shadow-primary/20">
            <Link href="/dossiers/new">Nouveau Dossier</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Dossiers', val: stats.total, color: 'text-foreground', bg: 'bg-primary/5' },
          { label: 'Nouveaux', val: stats.nouveau, color: 'text-blue-600', bg: 'bg-blue-500/5' },
          { label: 'En cours', val: stats.enCours, color: 'text-amber-600', bg: 'bg-amber-500/5' },
          { label: 'Terminés', val: stats.clos, color: 'text-green-600', bg: 'bg-green-500/5' },
        ].map((stat, i) => (
          <Card key={i} className={`${stat.bg} border-none shadow-sm`}>
            <CardHeader className="py-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-black ${stat.color}`}>{stat.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-md overflow-hidden border-none">
        <CardHeader className="bg-muted/30 border-b py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Portefeuille Dossiers</CardTitle>
              <CardDescription>Extraction en temps réel des missions {selectedCompagnie.nom}.</CardDescription>
            </div>
            <Badge variant="secondary" className="px-3 py-1 font-mono text-[10px]">
              SYNC ACTIVE
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="font-bold text-xs">Réf Expert</TableHead>
                <TableHead className="font-bold text-xs">Assuré</TableHead>
                <TableHead className="font-bold text-xs">Matricule</TableHead>
                <TableHead className="font-bold text-xs">Statut</TableHead>
                <TableHead className="font-bold text-xs">Création</TableHead>
                <TableHead className="text-right font-bold text-xs">Gérer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingDossiers ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Calcul des données...</span>
                  </TableCell>
                </TableRow>
              ) : dossiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Inbox className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground italic">Aucun dossier actif pour {selectedCompagnie.nom}.</p>
                  </TableCell>
                </TableRow>
              ) : (
                dossiers.map((d) => (
                  <TableRow key={d.id} className="group hover:bg-muted/50 transition-colors border-b">
                    <TableCell className="font-mono font-black text-primary text-xs">{d.refExpert}</TableCell>
                    <TableCell className="font-bold text-xs uppercase text-foreground/80">
                      {typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim()}
                    </TableCell>
                    <TableCell className="text-[10px] font-black font-mono tracking-tighter bg-muted/50 px-2 py-0.5 rounded w-fit inline-block mt-3 ml-4">
                      {d.matricule}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-bold py-0 h-5 border-primary/20">
                        {d.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] font-bold text-muted-foreground">
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
    </div>
  );
}
