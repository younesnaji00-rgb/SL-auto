'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Trash2,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Clock,
  ExternalLink,
  AlertCircle,
  ShieldAlert,
  Ban,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore } from '@/firebase';
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  collection, 
  where, 
  limit,
  getDocs,
  collectionGroup
} from 'firebase/firestore';
import { roles, type Role, compagnies as defaultCompagnies } from '@/lib/dossiers-data';
import { Eye, EyeOff } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { useOptions } from '@/hooks/use-options';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';

export default function UserDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = React.use(params);
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const userRef = useMemo(() => doc(db, 'users', uid), [db, uid]);
  const { data: userData, loading: userLoading } = useDoc(userRef);

  const { options: dbCompagnies } = useOptions('compagnies', defaultCompagnies);
  const companyOptions = useMemo(() => {
    const opts = dbCompagnies.length > 0 ? dbCompagnies : defaultCompagnies.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true }));
    return opts.map(c => ({ value: c.label, label: c.label }));
  }, [dbCompagnies]);

  // States
  const [assignedDossiers, setAssignedDossiers] = useState<any[]>([]);
  const [dossiersLoading, setDossiersLoading] = useState(true);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    role: '' as Role | '',
    statut: '' as 'Actif' | 'Inactif' | '',
    compagnies: [] as string[],
  });

  // Fetch assigned dossiers (by assignedTo or createdBy)
  useEffect(() => {
    if (!db || !uid) return;
    const fetchDossiers = async () => {
      try {
        // Try both assignedTo and createdBy
        const [snap1, snap2] = await Promise.all([
          getDocs(query(collection(db, 'dossiers'), where('assignedTo', '==', uid), limit(20))),
          getDocs(query(collection(db, 'dossiers'), where('createdBy', '==', uid), limit(20))),
        ]);
        const map = new Map<string, any>();
        snap1.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
        snap2.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
        setAssignedDossiers(Array.from(map.values()));
      } catch (e) {
        console.warn("Failed to fetch assigned dossiers", e);
      } finally {
        setDossiersLoading(false);
      }
    };
    fetchDossiers();
  }, [db, uid]);

  // Fetch activity history
  useEffect(() => {
    if (!db || !uid) return;
    const fetchHistory = async () => {
      try {
        const q = query(collectionGroup(db, 'history'), where('changedBy', '==', uid), limit(50));
        const snap = await getDocs(q);
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        results.sort((a: any, b: any) => {
          const dateA = a.changedAt?.toDate ? a.changedAt.toDate() : new Date(a.changedAt);
          const dateB = b.changedAt?.toDate ? b.changedAt.toDate() : new Date(b.changedAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        setActivityHistory(results.slice(0, 20));
      } catch (e) {
        console.warn("Failed to fetch activity history", e);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [db, uid]);

  useEffect(() => {
    if (userData) {
      setFormData({
        nom: userData.nom || '',
        prenom: userData.prenom || '',
        email: userData.email || '',
        telephone: userData.telephone || '',
        password: userData.password || '',
        role: userData.role || '',
        statut: userData.statut || 'Actif',
        compagnies: userData.compagnies || [],
      });
    }
  }, [userData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(userRef, formData);
      toast({ title: "Profil mis à jour", description: "Les informations ont été enregistrées avec succès." });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de sauvegarder les modifications." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = formData.statut === 'Actif' ? 'Inactif' : 'Actif';
    try {
      await updateDoc(userRef, { statut: newStatus });
      setFormData(p => ({ ...p, statut: newStatus as 'Actif' | 'Inactif' }));
      toast({
        title: newStatus === 'Actif' ? "Utilisateur activé" : "Utilisateur désactivé",
        description: `Le statut de l'utilisateur a été mis à jour avec succès.`
      });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de changer le statut." });
    }
  };

  const handleDeleteUser = async () => {
    setIsDeleting(true);
    try {
      // Clean up role-specific collections
      if (formData.role === 'Agent de Terrain' && formData.nom) {
        const snap = await getDocs(query(collection(db, 'options_agents'), where('label', '==', formData.nom)));
        for (const d of snap.docs) await deleteDoc(d.ref);
      }
      if (formData.role === 'Chiffreur' && formData.nom) {
        const snap = await getDocs(query(collection(db, 'chiffreurs'), where('nom', '==', formData.nom)));
        for (const d of snap.docs) await deleteDoc(d.ref);
      }

      await deleteDoc(userRef);
      toast({ title: "Utilisateur supprimé" });
      router.push('/utilisateurs');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur lors de la suppression" });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
  };

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] md:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Utilisateur introuvable</h1>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/utilisateurs"><ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/utilisateurs"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {formData.prenom} {formData.nom}
            </h1>
            <Badge variant="secondary">{formData.role}</Badge>
            <Badge variant={formData.statut === 'Actif' ? 'success' : 'destructive'} className="flex gap-1 items-center">
              <span className={`w-1.5 h-1.5 rounded-full ${formData.statut === 'Actif' ? 'bg-emerald-500' : 'bg-destructive'} animate-pulse`} />
              {formData.statut}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Informations personnelles
              </CardTitle>
              <CardDescription>Gérez les coordonnées et les accès de l'utilisateur.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input 
                    value={formData.prenom} 
                    onChange={e => setFormData(p => ({...p, prenom: e.target.value}))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input 
                    value={formData.nom} 
                    onChange={e => setFormData(p => ({...p, nom: e.target.value}))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="pl-10"
                      value={formData.email} 
                      onChange={e => setFormData(p => ({...p, email: e.target.value}))} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="pl-10"
                      value={formData.telephone} 
                      onChange={e => setFormData(p => ({...p, telephone: e.target.value}))} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      readOnly
                      className="pr-10 bg-muted/50 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPassword(v => !v)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select value={formData.role} onValueChange={v => setFormData(p => ({...p, role: v as Role}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={formData.statut} onValueChange={v => setFormData(p => ({...p, statut: v as 'Actif' | 'Inactif'}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Actif">Actif</SelectItem>
                      <SelectItem value="Inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Compagnies d&apos;assurance affiliées</Label>
                <MultiSelect
                  options={companyOptions}
                  selected={formData.compagnies}
                  onChange={(vals) => setFormData(p => ({...p, compagnies: vals}))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  L&apos;utilisateur ne verra que les dossiers des compagnies sélectionnées. Si aucune n&apos;est sélectionnée, il verra tous les dossiers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Créé le: {formatTimestamp(userData.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Dernière connexion: {formatTimestamp(userData.lastLogin)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end bg-muted/30 pt-6">
              <Button onClick={handleSave} loading={isSaving}>
                {isSaving ? 'Enregistrement...' : <><Save className="mr-2 h-4 w-4" /> Sauvegarder</>}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dossiers assignés</CardTitle>
              <CardDescription>Liste des dossiers actuellement sous la responsabilité de cet utilisateur.</CardDescription>
            </CardHeader>
            <CardContent>
              {dossiersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !assignedDossiers || assignedDossiers.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                  Aucun dossier assigné
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Réf Expert</TableHead>
                        <TableHead>Assuré</TableHead>
                        <TableHead>Nature du dossier</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedDossiers.map((d: any) => {
                        const assureName = typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim() || 'N/A';
                        return (
                          <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/dossiers/${d.id}`)}>
                            <TableCell className="font-mono text-xs font-semibold text-primary tabular-nums">{d.refExpert || '-'}</TableCell>
                            <TableCell>{assureName}</TableCell>
                            <TableCell>{d.nature || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut || 'Nouveau'))}>{d.statut || 'Nouveau'}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/dossiers/${d.id}`}><ExternalLink className="h-4 w-4" /></Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Historique d'activité
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !activityHistory || activityHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 italic">
                  Aucune activité récente
                </p>
              ) : (
                <div className="space-y-4">
                  {activityHistory.map((entry: any) => (
                    <div key={entry.id} className="relative pl-6 pb-4 border-l last:pb-0">
                      <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{formatTimestamp(entry.changedAt)}</p>
                        <p className="text-sm font-medium">{entry.action}</p>
                        {entry.newStatut && (
                          <p className="text-xs bg-muted px-2 py-1 rounded inline-block">
                            → {entry.newStatut}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={formData.statut === 'Actif' ? "border-destructive/20 bg-destructive/5" : "border-primary/20 bg-primary/5"}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${formData.statut === 'Actif' ? "text-destructive" : "text-primary"}`}>
                <ShieldAlert className="h-5 w-5" />
                Zone de danger
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {formData.statut === 'Actif' ? "Désactiver l'accès" : "Réactiver l'accès"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formData.statut === 'Actif' 
                    ? "L'utilisateur ne pourra plus se connecter mais ses données seront conservées."
                    : "L'utilisateur pourra à nouveau accéder au système."
                  }
                </p>
                <Button 
                  variant={formData.statut === 'Actif' ? "destructive" : "default"} 
                  className="w-full mt-2" 
                  onClick={handleToggleStatus}
                >
                  {formData.statut === 'Actif' ? (
                    <><Ban className="mr-2 h-4 w-4" /> Désactiver l'utilisateur</>
                  ) : (
                    <><UserCheck className="mr-2 h-4 w-4" /> Activer l'utilisateur</>
                  )}
                </Button>
              </div>

              <div className={`space-y-1 pt-4 border-t ${formData.statut === 'Actif' ? "border-destructive/10" : "border-primary/10"}`}>
                <p className="text-sm font-semibold">Suppression définitive</p>
                <p className="text-xs text-muted-foreground">Cette action est irréversible. Toutes les données associées seront supprimées.</p>
                <Button 
                  variant="outline" 
                  className="w-full mt-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer l'utilisateur
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur <strong>{formData.prenom} {formData.nom}</strong> ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDeleteUser(); }} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
