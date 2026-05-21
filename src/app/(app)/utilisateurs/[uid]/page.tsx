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
  ShieldCheck,
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { NAV_GROUPS, isItemVisibleToRole } from '@/lib/nav-groups';
import { useDoc, useFirestore } from '@/firebase';
import {
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  collection,
  where,
  limit,
  getDocs,
  collectionGroup,
  serverTimestamp
} from 'firebase/firestore';
import { roles, type Role } from '@/lib/dossiers-data';
import { Eye, EyeOff, Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { useOptions } from '@/hooks/use-options';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

export default function UserDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = React.use(params);
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { canDelete } = useCurrentUser();

  const userRef = useMemo(() => doc(db, 'users', uid), [db, uid]);
  const { data: userData, loading: userLoading } = useDoc(userRef);

  // Single source of truth: Firestore. Filter inactive entries client-side.
  const { options: dbCompagnies } = useOptions('compagnies');
  const companyOptions = useMemo(
    () => dbCompagnies.filter(o => o.active !== false).map(c => ({ value: c.label, label: c.label })),
    [dbCompagnies],
  );

  const { options: dbZones } = useOptions('options_zones');
  const zoneOptions = useMemo(() => dbZones.filter(o => o.active !== false), [dbZones]);

  const { options: dbSites } = useOptions('options_sites');
  const siteOptions = useMemo(
    () => dbSites.filter(o => o.active !== false).map(s => ({ value: s.label, label: s.label })),
    [dbSites],
  );

  // Zone typeahead combobox state
  const [zonePopoverOpen, setZonePopoverOpen] = useState(false);
  const [zoneQuery, setZoneQuery] = useState('');

  // States
  const [assignedDossiers, setAssignedDossiers] = useState<any[]>([]);
  const [dossiersLoading, setDossiersLoading] = useState(true);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Per-user permission overrides. `deniedNavItems` = hrefs hidden despite the
  // role allowing them (revoke). `grantedNavItems` = hrefs visible despite the
  // role denying them (grant). Both mirror Firestore fields. The toggle UI
  // shows ALL sidebar items except `/signaler-bug` (universally accessible),
  // letting the admin grant OR revoke any page temporarily.
  // `permissionsSaving` is a transient marker per-item so the row can show a
  // saved/saving cue.
  const [deniedNavItems, setDeniedNavItems] = useState<string[]>([]);
  const [grantedNavItems, setGrantedNavItems] = useState<string[]>([]);
  const [permissionsSaving, setPermissionsSaving] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    role: '' as Role | '',
    statut: '' as 'Actif' | 'Inactif' | '',
    compagnies: [] as string[],
    sites: [] as string[],
    zone: '',
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
        sites: userData.sites || [],
        zone: userData.zone || '',
      });
      setDeniedNavItems(Array.isArray(userData.deniedNavItems) ? userData.deniedNavItems : []);
      setGrantedNavItems(Array.isArray(userData.grantedNavItems) ? userData.grantedNavItems : []);
    }
  }, [userData]);

  // Items shown in the Permissions card: ALL sidebar items except
  // `/signaler-bug` (universally accessible). The toggle UI lets the admin
  // grant OR revoke any page temporarily — regardless of the user's role
  // baseline. The `roleDefault` flag is the role-baseline answer used to
  // both (a) compute the initial effective state when no override exists,
  // and (b) decide which list (denied vs granted) an override write goes
  // into. Recomputes when the target user's role changes.
  const permissionItems = useMemo(() => {
    const role = formData.role || undefined;
    const out: { href: string; label: string; roleDefault: boolean }[] = [];
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.href === '/signaler-bug') continue;
        out.push({
          href: item.href,
          label: item.label,
          roleDefault: isItemVisibleToRole(item, role),
        });
      }
    }
    return out;
  }, [formData.role]);

  const handleTogglePermission = async (
    href: string,
    nextAllowed: boolean,
    roleDefault: boolean,
  ) => {
    // Compute the next state of both lists so an href ends up in at most ONE
    // list (sidebar precedence guarantees correctness even on conflict, but
    // clean writes are nicer). The rule:
    //   nextAllowed === roleDefault  → no override needed, clear from both
    //   nextAllowed && !roleDefault  → grant (add to granted, remove from denied)
    //   !nextAllowed && roleDefault  → revoke (add to denied, remove from granted)
    let nextDenied = deniedNavItems.filter((h) => h !== href);
    let nextGranted = grantedNavItems.filter((h) => h !== href);
    if (nextAllowed && !roleDefault) {
      nextGranted = Array.from(new Set([...nextGranted, href]));
    } else if (!nextAllowed && roleDefault) {
      nextDenied = Array.from(new Set([...nextDenied, href]));
    }
    const prevDenied = deniedNavItems;
    const prevGranted = grantedNavItems;
    setDeniedNavItems(nextDenied);
    setGrantedNavItems(nextGranted);
    setPermissionsSaving((p) => ({ ...p, [href]: true }));
    try {
      await updateDoc(userRef, {
        deniedNavItems: nextDenied,
        grantedNavItems: nextGranted,
      });
    } catch (err) {
      console.error('Failed to persist permission overrides', err);
      // Roll back optimistic UI on failure.
      setDeniedNavItems(prevDenied);
      setGrantedNavItems(prevGranted);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de mettre à jour la permission." });
    } finally {
      setPermissionsSaving((p) => {
        const { [href]: _omit, ...rest } = p;
        return rest;
      });
    }
  };

  const handleSave = async () => {
    // Round 9 — `nom` is mandatory per the user policy. Block save with a
    // toast rather than silently writing an empty name to Firestore (which
    // would render as "Utilisateur inconnu" in audit surfaces going forward).
    if (!formData.nom || !formData.nom.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nom requis',
        description: 'Le nom complet est obligatoire.',
      });
      return;
    }
    setIsSaving(true);
    try {
      const previousRole = userData?.role;
      const previousNom = userData?.nom;
      const typedZone = (formData.zone || '').trim();
      const nextZone = formData.role === 'Agent de Terrain' ? typedZone : '';

      // Auto-register zone in options_zones if it's a new value.
      if (formData.role === 'Agent de Terrain' && typedZone) {
        const zoneExists = dbZones.some(z => z.label.toLowerCase() === typedZone.toLowerCase());
        if (!zoneExists) {
          const maxOrder = dbZones.length > 0 ? Math.max(...dbZones.map(z => z.order)) : -1;
          await addDoc(collection(db, 'options_zones'), {
            label: typedZone,
            order: maxOrder + 1,
            active: true,
            createdAt: serverTimestamp(),
          });
        }
      }

      await updateDoc(userRef, { ...formData, zone: nextZone, nomLowercase: (formData.nom || '').trim().toLowerCase() });

      // Mirror zone into options_agents when user is currently an Agent de Terrain.
      if (formData.role === 'Agent de Terrain' && formData.nom) {
        const agentSnap = await getDocs(query(collection(db, 'options_agents'), where('label', '==', formData.nom)));
        if (agentSnap.empty) {
          // Agent doc missing — create one (covers role-change TO Agent de Terrain).
          const allAgents = await getDocs(collection(db, 'options_agents'));
          const maxOrder = allAgents.docs.reduce((m, d) => Math.max(m, (d.data().order as number) ?? 0), 0);
          await addDoc(collection(db, 'options_agents'), {
            label: formData.nom,
            zone: nextZone,
            order: maxOrder + 1,
            active: true,
            createdAt: serverTimestamp(),
          });
        } else {
          for (const d of agentSnap.docs) {
            await updateDoc(d.ref, { zone: nextZone });
          }
        }
      }

      // If role changed AWAY from Agent de Terrain, remove the options_agents doc(s)
      // tied to this user's previous nom.
      if (previousRole === 'Agent de Terrain' && formData.role !== 'Agent de Terrain' && previousNom) {
        const staleSnap = await getDocs(query(collection(db, 'options_agents'), where('label', '==', previousNom)));
        for (const d of staleSnap.docs) await deleteDoc(d.ref);
      }

      toast({ title: "Profil mis à jour", description: "Les informations ont été enregistrées avec succès." });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de sauvegarder les modifications." });
    } finally {
      setIsSaving(false);
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
                {formData.role === 'Agent de Terrain' && (() => {
                  const trimmedQuery = zoneQuery.trim();
                  const qLower = trimmedQuery.toLowerCase();
                  const filteredZones = qLower
                    ? zoneOptions.filter(z => z.label.toLowerCase().startsWith(qLower))
                    : zoneOptions;
                  const exactMatch = trimmedQuery
                    ? zoneOptions.some(z => z.label.toLowerCase() === qLower)
                    : true;
                  const selected = formData.zone || '';
                  return (
                    <div className="space-y-2">
                      <Label>Zone</Label>
                      <Popover open={zonePopoverOpen} onOpenChange={(open) => { setZonePopoverOpen(open); if (!open) setZoneQuery(''); }}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={zonePopoverOpen}
                            className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}
                          >
                            {selected || 'Sélectionnez ou saisissez une zone'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}>
                            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                              <input
                                value={zoneQuery}
                                onChange={(e) => setZoneQuery(e.target.value)}
                                placeholder="Tapez pour rechercher ou créer..."
                                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && trimmedQuery) {
                                    e.preventDefault();
                                    setFormData(p => ({ ...p, zone: trimmedQuery }));
                                    setZonePopoverOpen(false);
                                    setZoneQuery('');
                                  }
                                }}
                              />
                            </div>
                            <CommandList>
                              {filteredZones.length === 0 && !trimmedQuery && (
                                <CommandEmpty>Aucune zone enregistrée. Tapez pour créer.</CommandEmpty>
                              )}
                              {filteredZones.length > 0 && (
                                <CommandGroup>
                                  {filteredZones.map(z => (
                                    <CommandItem
                                      key={z.id}
                                      value={z.label}
                                      onSelect={() => {
                                        setFormData(p => ({ ...p, zone: z.label }));
                                        setZonePopoverOpen(false);
                                        setZoneQuery('');
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", selected === z.label ? "opacity-100" : "opacity-0")} />
                                      {z.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                              {trimmedQuery && !exactMatch && (
                                <CommandGroup heading="Créer">
                                  <CommandItem
                                    value={`__create__${trimmedQuery}`}
                                    onSelect={() => {
                                      setFormData(p => ({ ...p, zone: trimmedQuery }));
                                      setZonePopoverOpen(false);
                                      setZoneQuery('');
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Créer «{trimmedQuery}»
                                  </CommandItem>
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  );
                })()}
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

              <div className="space-y-2">
                <Label>Sites</Label>
                <MultiSelect
                  options={siteOptions}
                  selected={formData.sites}
                  onChange={(vals) => setFormData(p => ({...p, sites: vals}))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Villes dans lesquelles l&apos;utilisateur intervient. Plusieurs choix possibles.
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
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Permissions
              </CardTitle>
              <CardDescription>
                Accordez ou retirez l&apos;accès à n&apos;importe quelle page pour cet utilisateur, indépendamment de son rôle. Utile pour des privilèges temporaires. «&nbsp;Signaler un bug&nbsp;» reste toujours accessible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {permissionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Aucun menu configurable.
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {permissionItems.map((item) => {
                    const granted = grantedNavItems.includes(item.href);
                    const denied = deniedNavItems.includes(item.href);
                    // Effective state matches the sidebar's precedence:
                    // grant > deny > role default.
                    const allowed = granted || (!denied && item.roleDefault);
                    const isOverride =
                      (allowed && !item.roleDefault) || (!allowed && item.roleDefault);
                    const saving = !!permissionsSaving[item.href];
                    return (
                      <li key={item.href} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium leading-tight">{item.label}</p>
                            {isOverride && (
                              <span
                                className={cn(
                                  'text-[9px] uppercase tracking-[0.08em] font-semibold rounded-sm px-1.5 py-px',
                                  allowed
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                                )}
                                title={allowed ? 'Accordé en plus du rôle' : 'Retiré du rôle'}
                              >
                                {allowed ? 'Accordé' : 'Retiré'}
                              </span>
                            )}
                            {!item.roleDefault && !isOverride && (
                              <span
                                className="text-[9px] uppercase tracking-[0.08em] font-semibold rounded-sm px-1.5 py-px bg-muted text-muted-foreground"
                                title="Non inclus dans le rôle par défaut"
                              >
                                Hors rôle
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono">{item.href}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {saving && (
                            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
                              Enregistrement…
                            </span>
                          )}
                          <Switch
                            checked={allowed}
                            disabled={saving}
                            onCheckedChange={(v) => handleTogglePermission(item.href, v, item.roleDefault)}
                            aria-label={`Autoriser l'accès à ${item.label}`}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
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

          {canDelete && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Supprimer cet utilisateur</CardTitle>
                <CardDescription>
                  L&apos;utilisateur sera retiré du système. Les journaux d&apos;activité (historique, workflow) attribués à cet utilisateur seront conservés.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer l&apos;utilisateur
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement l&apos;utilisateur <strong>{formData.prenom} {formData.nom}</strong> ?
              Cette action est irréversible. Les journaux d&apos;activité (historique, workflow) attribués à cet utilisateur seront conservés.
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
