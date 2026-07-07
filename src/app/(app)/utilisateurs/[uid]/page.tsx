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
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useCompagnies } from '@/hooks/use-compagnies';
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
import { rappelsEnvoyesRoleDefault } from '@/lib/permissions';
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
import { roles, isSingleSessionRole, type Role } from '@/lib/dossiers-data';
import { isSessionStale, timestampToMillis } from '@/lib/session-meta';
import { Eye, EyeOff, Check, ChevronsUpDown, Plus, Search, LogOut, Smartphone, Globe } from 'lucide-react';
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
  const { canDelete, isAdmin } = useCurrentUser();

  const userRef = useMemo(() => doc(db, 'users', uid), [db, uid]);
  const { data: userData, loading: userLoading } = useDoc(userRef);
  // Device + IP of the active session live in an admin-only subcollection (kept
  // off the world-readable user doc). Only admins reach this page, so the read
  // is always authorised.
  const sessionMetaRef = useMemo(() => doc(db, 'users', uid, 'session_meta', 'current'), [db, uid]);
  const { data: sessionMeta } = useDoc(sessionMetaRef);

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
  const [isDisconnecting, setIsDisconnecting] = useState(false);
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

  // Permission tree shown in the card. Top-level entries are sidebar items
  // (except `/signaler-bug` which is universally accessible). Some entries
  // expand into sub-permissions:
  //   - Mes rappels → Reçus / Envoyés (tab visibility on /mes-rappels)
  //   - Compagnies → each individual compagnie (sidebar + /compagnies list)
  //   - Gestion des dossiers → Validation de dossier (valider-dossier button)
  // Each node carries a `roleDefault` (the role-baseline answer). The toggle
  // handler decides which list (denied vs granted) to write to based on it.
  const { compagnies: allCompagnies } = useCompagnies();
  const permissionTree = useMemo(() => {
    const role = formData.role || undefined;
    type Node = { id: string; label: string; roleDefault: boolean; children?: Node[] };
    const out: Node[] = [];
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.href === '/signaler-bug') continue;
        const parentDefault = isItemVisibleToRole(item, role);
        const node: Node = { id: item.href, label: item.label, roleDefault: parentDefault };
        if (item.href === '/mes-rappels') {
          node.children = [
            { id: '/mes-rappels#recus', label: 'Reçus', roleDefault: parentDefault },
            // Gestionnaires only receive rappels, never send → "Envoyés" tab is
            // off by default for them (kept in sync with the /mes-rappels gate).
            { id: '/mes-rappels#envoyes', label: 'Envoyés', roleDefault: parentDefault && rappelsEnvoyesRoleDefault(role) },
          ];
        } else if (item.href === '/dossiers') {
          // Validation has its own role gate (canValidateRapport): Admin +
          // Directeur-family roles. Other roles cannot validate by default;
          // an admin can still GRANT the override.
          const canValidate =
            role === 'Admin' ||
            role === 'Directeur des opérations' ||
            role === 'Directeur' ||
            role === 'Directeur technique';
          node.children = [
            { id: '/dossiers#validation', label: 'Validation de dossier', roleDefault: canValidate },
          ];
        } else if (item.href === '/compagnies') {
          node.children = allCompagnies.map((c) => ({
            id: `/compagnies#${c.id}`,
            label: c.nom,
            roleDefault: parentDefault,
          }));
        }
        out.push(node);
      }
    }
    return out;
  }, [formData.role, allCompagnies]);

  // Tracks which dropdown rows are expanded.
  const [expandedPerms, setExpandedPerms] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => {
    setExpandedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Persist a permission update to Firestore with optimistic UI + rollback.
   * Handles BOTH single-row toggles AND parent-row cascades: pass `updates`
   * as an array of `{ id, nextAllowed, roleDefault }` and the function
   * computes the consolidated `deniedNavItems` + `grantedNavItems` writes.
   */
  const applyPermissionUpdates = async (
    updates: { id: string; nextAllowed: boolean; roleDefault: boolean }[],
  ) => {
    if (updates.length === 0) return;
    // For each (id, nextAllowed, roleDefault):
    //   nextAllowed === roleDefault  → clear from both (no override needed)
    //   nextAllowed && !roleDefault  → grant
    //   !nextAllowed && roleDefault  → deny
    const idsTouched = new Set(updates.map((u) => u.id));
    let nextDenied = deniedNavItems.filter((h) => !idsTouched.has(h));
    let nextGranted = grantedNavItems.filter((h) => !idsTouched.has(h));
    for (const { id, nextAllowed, roleDefault } of updates) {
      if (nextAllowed && !roleDefault) nextGranted.push(id);
      else if (!nextAllowed && roleDefault) nextDenied.push(id);
    }
    nextDenied = Array.from(new Set(nextDenied));
    nextGranted = Array.from(new Set(nextGranted));
    const prevDenied = deniedNavItems;
    const prevGranted = grantedNavItems;
    setDeniedNavItems(nextDenied);
    setGrantedNavItems(nextGranted);
    setPermissionsSaving((p) => {
      const next = { ...p };
      for (const u of updates) next[u.id] = true;
      return next;
    });
    try {
      await updateDoc(userRef, {
        deniedNavItems: nextDenied,
        grantedNavItems: nextGranted,
      });
    } catch (err) {
      console.error('Failed to persist permission overrides', err);
      setDeniedNavItems(prevDenied);
      setGrantedNavItems(prevGranted);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de mettre à jour la permission." });
    } finally {
      setPermissionsSaving((p) => {
        const next = { ...p };
        for (const u of updates) delete next[u.id];
        return next;
      });
    }
  };

  /** Effective state of a single permission (matches sidebar precedence). */
  const effectiveAllowed = (id: string, roleDefault: boolean): boolean => {
    if (grantedNavItems.includes(id)) return true;
    if (deniedNavItems.includes(id)) return false;
    return roleDefault;
  };

  /** Toggle a single permission. */
  const handleTogglePermission = (id: string, nextAllowed: boolean, roleDefault: boolean) => {
    return applyPermissionUpdates([{ id, nextAllowed, roleDefault }]);
  };

  /** Cascade a parent toggle to ALL its children. Parent + children all
   *  written in one Firestore round-trip. */
  const handleToggleParent = (
    parent: { id: string; roleDefault: boolean },
    children: { id: string; roleDefault: boolean }[],
    nextAllowed: boolean,
  ) => {
    const updates = [
      { id: parent.id, nextAllowed, roleDefault: parent.roleDefault },
      ...children.map((c) => ({ id: c.id, nextAllowed, roleDefault: c.roleDefault })),
    ];
    return applyPermissionUpdates(updates);
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

      // Single-session hygiene: clear `currentSessionId` when the role changes
      // (the previous session's scoping no longer applies) OR when the new role
      // is not single-session. This prevents a dangling claim from becoming an
      // un-releasable login lock if the user is (later) a basic role.
      const clearSession =
        previousRole !== formData.role || !isSingleSessionRole(formData.role);
      await updateDoc(userRef, {
        ...formData,
        zone: nextZone,
        nomLowercase: (formData.nom || '').trim().toLowerCase(),
        ...(clearSession ? { currentSessionId: null, currentSessionSeenAt: null } : {}),
      });
      // Drop the admin-only session metadata alongside the cleared claim.
      if (clearSession) {
        await deleteDoc(doc(db, 'users', uid, 'session_meta', 'current')).catch(() => {});
      }

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

      // Firestore doesn't cascade-delete subcollections, so drop the session
      // metadata explicitly or it would orphan (PII) after the parent is gone.
      await deleteDoc(doc(db, 'users', uid, 'session_meta', 'current')).catch(() => {});
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

  // Admin force-disconnect: clear the user's single-session claim so they can
  // log in on a new device. The holding device's CurrentUserProvider sees the
  // cleared id and signs itself out. Admin-only (Firestore rules enforce it).
  const handleForceDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await updateDoc(userRef, { currentSessionId: null, currentSessionSeenAt: null });
      await deleteDoc(doc(db, 'users', uid, 'session_meta', 'current')).catch(() => {});
      toast({
        title: 'Session déconnectée',
        description: "L'utilisateur a été déconnecté de son appareil et peut se reconnecter ailleurs.",
      });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de déconnecter la session.' });
    } finally {
      setIsDisconnecting(false);
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
              {permissionTree.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Aucun menu configurable.
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {permissionTree.map((item) => {
                    const allowed = effectiveAllowed(item.id, item.roleDefault);
                    const isOverride =
                      (allowed && !item.roleDefault) || (!allowed && item.roleDefault);
                    const saving = !!permissionsSaving[item.id];
                    const hasChildren = !!item.children && item.children.length > 0;
                    const isExpanded = expandedPerms.has(item.id);
                    return (
                      <li key={item.id}>
                        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <button
                            type="button"
                            disabled={!hasChildren}
                            onClick={() => hasChildren && toggleExpand(item.id)}
                            className={cn(
                              'flex items-center gap-2 min-w-0 flex-1 text-left',
                              hasChildren && 'hover:opacity-80 transition-opacity',
                            )}
                          >
                            {hasChildren ? (
                              isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              )
                            ) : (
                              <span className="w-4 shrink-0" aria-hidden />
                            )}
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
                              <p className="text-[11px] text-muted-foreground font-mono">{item.id}</p>
                            </div>
                          </button>
                          <div className="flex items-center gap-2 shrink-0">
                            {saving && (
                              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
                                Enregistrement…
                              </span>
                            )}
                            <Switch
                              checked={allowed}
                              disabled={saving}
                              onCheckedChange={(v) =>
                                hasChildren
                                  ? handleToggleParent(
                                      { id: item.id, roleDefault: item.roleDefault },
                                      item.children!.map((c) => ({ id: c.id, roleDefault: c.roleDefault })),
                                      v,
                                    )
                                  : handleTogglePermission(item.id, v, item.roleDefault)
                              }
                              aria-label={`Autoriser l'accès à ${item.label}`}
                            />
                          </div>
                        </div>
                        {hasChildren && isExpanded && (
                          <ul className="bg-muted/20 border-t">
                            {item.children!.map((child) => {
                              const cAllowed = effectiveAllowed(child.id, child.roleDefault);
                              const cIsOverride =
                                (cAllowed && !child.roleDefault) || (!cAllowed && child.roleDefault);
                              const cSaving = !!permissionsSaving[child.id];
                              return (
                                <li
                                  key={child.id}
                                  className="flex items-center justify-between gap-3 pl-10 pr-3 py-2 border-b last:border-b-0"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm leading-tight">{child.label}</p>
                                      {cIsOverride && (
                                        <span
                                          className={cn(
                                            'text-[9px] uppercase tracking-[0.08em] font-semibold rounded-sm px-1.5 py-px',
                                            cAllowed
                                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                                          )}
                                        >
                                          {cAllowed ? 'Accordé' : 'Retiré'}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-mono">{child.id}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {cSaving && (
                                      <span className="text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
                                        Enregistrement…
                                      </span>
                                    )}
                                    <Switch
                                      checked={cAllowed}
                                      disabled={cSaving}
                                      onCheckedChange={(v) =>
                                        handleTogglePermission(child.id, v, child.roleDefault)
                                      }
                                      aria-label={`Autoriser ${child.label}`}
                                    />
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
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

          {isAdmin && isSingleSessionRole(userData.role) && (() => {
            // A session is "active" while its heartbeat is fresh. A held slot
            // whose heartbeat has gone stale (app closed/killed without a clean
            // sign-out) is shown as inactive — it will free itself for the next
            // login within STALE_SESSION_MS even without a force-disconnect.
            const hasSession = !!userData.currentSessionId;
            const sessionStale = hasSession && isSessionStale(timestampToMillis(userData.currentSessionSeenAt), Date.now());
            const sessionActive = hasSession && !sessionStale;
            return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  Session / Appareil
                </CardTitle>
                <CardDescription>
                  Ce rôle est limité à un seul appareil à la fois. Déconnectez sa session
                  pour lui permettre de se connecter depuis un autre appareil.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      sessionActive
                        ? 'bg-emerald-500 animate-pulse'
                        : sessionStale
                          ? 'bg-amber-500'
                          : 'bg-muted-foreground/40',
                    )}
                  />
                  <span className={cn(!sessionActive && 'text-muted-foreground')}>
                    {sessionActive
                      ? 'Connecté sur un appareil'
                      : sessionStale
                        ? 'Session inactive (se libère automatiquement)'
                        : 'Aucune session active'}
                  </span>
                </div>
                {userData.currentSessionId && (
                  <div className="rounded-md border bg-muted/20 px-3 py-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Smartphone className="h-3.5 w-3.5" />
                        Appareil
                      </span>
                      <span className="font-medium text-right">
                        {sessionMeta?.device || 'Inconnu'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        Adresse IP
                      </span>
                      <span className="font-mono tabular-nums text-right">
                        {sessionMeta?.ip || 'Inconnue'}
                      </span>
                    </div>
                    {sessionMeta?.at && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Connecté depuis
                        </span>
                        <span className="tabular-nums text-right">
                          {formatTimestamp(sessionMeta.at)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!userData.currentSessionId || isDisconnecting}
                  loading={isDisconnecting}
                  onClick={handleForceDisconnect}
                >
                  {!isDisconnecting && <LogOut className="mr-2 h-4 w-4" />}
                  Déconnecter la session
                </Button>
              </CardContent>
            </Card>
            );
          })()}

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
