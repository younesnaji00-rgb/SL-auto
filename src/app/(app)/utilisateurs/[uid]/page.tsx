'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  Clock,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Trash2,
  LogOut,
  Smartphone,
  Globe,
  Eye,
  EyeOff,
  Check,
  ChevronsUpDown,
  Plus,
  Search,
} from 'lucide-react';
import { useCompagnies } from '@/hooks/use-compagnies';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button, buttonVariants } from '@/components/ui/button';
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
import { EmptyState } from '@/components/ui/empty-state';
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
import { ROLE_DESCRIPTIONS } from '@/lib/role-descriptions';
import { isSessionStale, timestampToMillis } from '@/lib/session-meta';
import { MultiSelect } from '@/components/ui/multi-select';
import { useOptions } from '@/hooks/use-options';
import { cn } from '@/lib/utils';
import { IconChip } from '@/components/ui/icon-chip';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { UserRecordSkeleton } from './loading';

// Status chip helper — element-specs §11 (Carbon tag / dataviz: one helper per
// domain so the same state always maps to the same status pair; label always).
const statutVariant = (statut: string) => (statut === 'Actif' ? 'success' : 'danger');

type UserForm = {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  password: string;
  role: Role | '';
  statut: 'Actif' | 'Inactif' | '';
  compagnies: string[];
  sites: string[];
  zone: string;
};

const EMPTY_FORM: UserForm = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  password: '',
  role: '',
  statut: '',
  compagnies: [],
  sites: [],
  zone: '',
};

function formFromUser(userData: any): UserForm {
  return {
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
  };
}

/**
 * Permission row — Material 3 lists ("container and label text are required";
 * trailing element = "selection control"; "switches: toggle settings on/off")
 * + Material 3 switch ("the effects of a switch should start immediately,
 * without needing to save"; label "short and direct", describes what is on).
 * Anatomy: optional expand chevron, label t-body 600 + override chip (§11),
 * supporting t-caption (the route), trailing "Enregistrement…" + Switch.
 * 48 px min, hairlines only (element-specs §4).
 */
function PermissionRow({
  label,
  id,
  allowed,
  roleDefault,
  saving,
  onToggle,
  child,
  expandable,
  expanded,
  onExpand,
}: {
  label: string;
  id: string;
  allowed: boolean;
  roleDefault: boolean;
  saving: boolean;
  onToggle: (next: boolean) => void;
  child?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  const isOverride = (allowed && !roleDefault) || (!allowed && roleDefault);
  const head = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn('t-body leading-tight', child ? 'font-medium' : 'font-semibold')}>{label}</p>
        {isOverride && (
          <Badge variant={allowed ? 'success' : 'warning'} title={allowed ? 'Accordé en plus du rôle' : 'Retiré du rôle'}>
            {allowed ? 'Accordé' : 'Retiré'}
          </Badge>
        )}
        {!roleDefault && !isOverride && (
          <Badge variant="neutral" title="Non inclus dans le rôle par défaut">Hors rôle</Badge>
        )}
      </div>
      <p className="t-caption font-mono">{id}</p>
    </div>
  );
  return (
    <div className={cn('flex min-h-[48px] items-center justify-between gap-3 py-2', child && 'pl-10')}>
      {expandable ? (
        <button
          type="button"
          onClick={onExpand}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left transition-colors hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
          )}
          {head}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!child && <span className="w-4 shrink-0" aria-hidden />}
          {head}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2">
        {saving && <span className="t-label">Enregistrement…</span>}
        <Switch
          checked={allowed}
          disabled={saving}
          onCheckedChange={onToggle}
          aria-label={child ? `Autoriser ${label}` : `Autoriser l'accès à ${label}`}
        />
      </div>
    </div>
  );
}

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
  const [formData, setFormData] = useState<UserForm>(EMPTY_FORM);

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
      setFormData(formFromUser(userData));
      setDeniedNavItems(Array.isArray(userData.deniedNavItems) ? userData.deniedNavItems : []);
      setGrantedNavItems(Array.isArray(userData.grantedNavItems) ? userData.grantedNavItems : []);
    }
  }, [userData]);

  const initialForm = useMemo(() => (userData ? formFromUser(userData) : EMPTY_FORM), [userData]);
  const dirty = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialForm), [formData, initialForm]);

  const displayName = `${formData.prenom ?? ''} ${formData.nom ?? ''}`.trim() || 'Utilisateur';

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
      // Guard rail (addendum ter E): the last Admin can never be removed.
      if (formData.role === 'Admin') {
        const admins = await getDocs(query(collection(db, 'users'), where('role', '==', 'Admin')));
        if (admins.docs.filter((d) => d.id !== uid).length === 0) {
          toast({ variant: 'destructive', title: 'Suppression impossible', description: 'C’est le dernier compte Admin — créez-en un autre avant de supprimer celui-ci.' });
          setIsDeleting(false);
          setShowDeleteDialog(false);
          return;
        }
      }
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
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
  };
  const toDate = (ts: any): Date | null => {
    if (!ts) return null;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  };

  if (userLoading) {
    return <UserRecordSkeleton />;
  }

  if (!userData) {
    // Empty state — element-specs §12 (state + reason + one pathway).
    return (
      <EmptyState
        icon={<UserIcon />}
        title="Utilisateur introuvable"
        description="Ce compte n'existe plus ou l'adresse est incorrecte."
        action={
          <Button asChild variant="outline">
            <Link href="/utilisateurs">Retour à la liste</Link>
          </Button>
        }
      />
    );
  }

  const showSessionCard = isAdmin && isSingleSessionRole(userData.role);
  const statut = formData.statut || 'Actif';

  return (
    <div className="space-y-6">
      {/* Page header — element-specs §1 (Polaris Page: "always provide
          breadcrumbs when a page has a parent"; record pages use the compact
          t-title). Meta = role (neutral) + statut (status pair, §11). No
          action here: the form's « Sauvegarder » is the page primary. */}
      <PageHeader
        size="compact"
        backHref="/utilisateurs"
        backLabel="Utilisateurs"
        title={displayName}
        meta={
          <>
            {formData.role && <Badge variant="neutral">{formData.role}</Badge>}
            <Badge variant={statutVariant(statut)}>{statut}</Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Content card — element-specs §5 (Material 3 cards; NN/g cards):
              24 px padding, t-heading title, no restated description. */}
          <Card>
            <CardHeader>
              <CardTitle className="t-heading flex items-center gap-2">
                {/* Section anchor chip (neutral — terracotta = time, 2026-09-02) — addendum 1b: ONE IconChip beside the
                    section that anchors the page; other card icons stay quiet. */}
                <IconChip><UserIcon /></IconChip>
                Informations personnelles
              </CardTitle>
            </CardHeader>
            {/* Always-editable form — element-specs §9 + addendum 4 (GOV.UK:
                "size inputs to known lengths"; NN/g: field width matches the
                input): chunked groups — identité / accès / affectations — rows
                16 apart inside a group, 24 px between groups; téléphone,
                mot de passe and the selects are content-sized, only nom /
                prénom / email stay wide. Two-column grid inside a group is
                the original layout (3d5629a). */}
            <CardContent className="space-y-6">
              {/* Identité */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="u-prenom">Prénom</Label>
                  <Input
                    id="u-prenom"
                    value={formData.prenom}
                    onChange={e => setFormData(p => ({ ...p, prenom: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="u-nom">Nom</Label>
                  <Input
                    id="u-nom"
                    value={formData.nom}
                    onChange={e => setFormData(p => ({ ...p, nom: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="u-email">Email</Label>
                  <Input
                    id="u-email"
                    type="email"
                    inputMode="email"
                    className="font-mono"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="u-tel">Téléphone</Label>
                  {/* Moroccan format cue (owner rule 8), never a sample number. */}
                  <Input
                    id="u-tel"
                    type="tel"
                    inputMode="tel"
                    placeholder="+212 6 00 00 00 00"
                    className="max-w-[14rem] tabular-nums"
                    value={formData.telephone}
                    onChange={e => setFormData(p => ({ ...p, telephone: e.target.value }))}
                  />
                </div>
              </div>
              {/* Accès */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="u-password">Mot de passe</Label>
                  {/* NN/g password masking: masked by default + explicit toggle
                      (`ghost` icon button, aria-pressed). Read-only value. */}
                  <div className="relative max-w-[16rem]">
                    <Input
                      id="u-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      readOnly
                      className="bg-surface-2 pr-10 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-ink-3 shadow-none hover:text-ink"
                      onClick={() => setShowPassword(v => !v)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="u-role">Rôle</Label>
                  <Select value={formData.role} onValueChange={v => setFormData(p => ({ ...p, role: v as Role }))}>
                    <SelectTrigger id="u-role" className="max-w-[16rem]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {/* What this role can do, at the point of assignment
                      (addendum ter E). */}
                  {ROLE_DESCRIPTIONS[formData.role] && (
                    <p className="t-caption max-w-[24rem]">{ROLE_DESCRIPTIONS[formData.role]}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="u-statut">Statut</Label>
                  <Select value={formData.statut} onValueChange={v => setFormData(p => ({ ...p, statut: v as 'Actif' | 'Inactif' }))}>
                    <SelectTrigger id="u-statut" className="max-w-[12rem]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Actif">Actif</SelectItem>
                      <SelectItem value="Inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Affectations */}
              <div className="space-y-4">
                {/* Zone only exists for an Agent de Terrain (original gating). */}
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
                    <div className="space-y-1">
                      <Label htmlFor="u-zone">Zone</Label>
                      <Popover open={zonePopoverOpen} onOpenChange={(open) => { setZonePopoverOpen(open); if (!open) setZoneQuery(''); }}>
                        <PopoverTrigger asChild>
                          <Button
                            id="u-zone"
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={zonePopoverOpen}
                            className={cn("w-full max-w-[16rem] justify-between font-normal", !selected && "text-ink-3")}
                          >
                            {selected || 'Sélectionnez ou saisissez une zone'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-ink-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}>
                            <div className="flex items-center border-b border-hairline px-3" cmdk-input-wrapper="">
                              <Search className="mr-2 h-4 w-4 shrink-0 text-ink-3" />
                              <input
                                value={zoneQuery}
                                onChange={(e) => setZoneQuery(e.target.value)}
                                placeholder="Rechercher ou créer une zone"
                                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-ink-3"
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

              <div className="space-y-1">
                <Label>Compagnies d&apos;assurance affiliées</Label>
                <p className="t-caption">Vide = accès à tous les dossiers ; sinon uniquement ceux des compagnies choisies</p>
                <MultiSelect
                  options={companyOptions}
                  selected={formData.compagnies}
                  onChange={(vals) => setFormData(p => ({ ...p, compagnies: vals }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <Label>Sites <span className="text-ink-4">(facultatif)</span></Label>
                <p className="t-caption">Villes dans lesquelles l&apos;utilisateur intervient, plusieurs choix possibles</p>
                <MultiSelect
                  options={siteOptions}
                  selected={formData.sites}
                  onChange={(vals) => setFormData(p => ({ ...p, sites: vals }))}
                  className="w-full"
                />
              </div>
              </div>

              {/* Read-only facts — element-specs §10 (GOV.UK summary list:
                  key over value; Refactoring UI: labels quiet, values primary). */}
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-hairline pt-4 md:grid-cols-2">
                <div className="min-w-0">
                  <dt className="t-label">Créé le</dt>
                  <dd className="t-body mt-1 font-semibold tabular-nums text-ink">{formatTimestamp(userData.createdAt)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="t-label">Dernière connexion</dt>
                  <dd className={cn('t-body mt-1 tabular-nums', userData.lastLogin ? 'font-semibold text-ink' : 'text-ink-4')}>
                    {formatTimestamp(userData.lastLogin)}
                  </dd>
                </div>
              </dl>
            </CardContent>
            {/* Footer — element-specs §8 (GOV.UK: one default button; "disabled
                buttons have poor contrast… avoid them" → the button stays
                enabled and the unsaved state is said in words next to it). */}
            <CardFooter className="flex flex-wrap items-center justify-end gap-3 border-t border-hairline pt-6">
              {dirty && !isSaving && (
                <span className="t-caption" aria-live="polite">Modifications non enregistrées</span>
              )}
              <Button onClick={handleSave} loading={isSaving}>
                {isSaving ? 'Enregistrement…' : 'Sauvegarder'}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="t-heading flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-ink-3" aria-hidden />
                Permissions
              </CardTitle>
              <CardDescription className="t-caption max-w-[65ch]">
                Accordez ou retirez l&apos;accès à n&apos;importe quelle page pour cet utilisateur, indépendamment de son rôle. Utile pour des privilèges temporaires. «&nbsp;Signaler un bug&nbsp;» reste toujours accessible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {permissionTree.length === 0 ? (
                <p className="t-caption py-2">Aucun menu configurable.</p>
              ) : (
                // Toggle rows — Material 3 lists + switch (see PermissionRow);
                // hairlines only, no box around the list (§4: no boxes inside rows).
                <ul className="divide-y divide-hairline border-t border-hairline">
                  {permissionTree.map((item) => {
                    const allowed = effectiveAllowed(item.id, item.roleDefault);
                    const hasChildren = !!item.children && item.children.length > 0;
                    const isExpanded = expandedPerms.has(item.id);
                    return (
                      <li key={item.id}>
                        <PermissionRow
                          label={item.label}
                          id={item.id}
                          allowed={allowed}
                          roleDefault={item.roleDefault}
                          saving={!!permissionsSaving[item.id]}
                          expandable={hasChildren}
                          expanded={isExpanded}
                          onExpand={() => toggleExpand(item.id)}
                          onToggle={(v) =>
                            hasChildren
                              ? handleToggleParent(
                                  { id: item.id, roleDefault: item.roleDefault },
                                  item.children!.map((c) => ({ id: c.id, roleDefault: c.roleDefault })),
                                  v,
                                )
                              : handleTogglePermission(item.id, v, item.roleDefault)
                          }
                        />
                        {hasChildren && isExpanded && (
                          <ul className="divide-y divide-hairline border-t border-hairline">
                            {item.children!.map((child) => (
                              <li key={child.id}>
                                <PermissionRow
                                  child
                                  label={child.label}
                                  id={child.id}
                                  allowed={effectiveAllowed(child.id, child.roleDefault)}
                                  roleDefault={child.roleDefault}
                                  saving={!!permissionsSaving[child.id]}
                                  onToggle={(v) => handleTogglePermission(child.id, v, child.roleDefault)}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="t-heading flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-ink-3" aria-hidden />
                Dossiers assignés
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dossiersLoading ? (
                // Row-shaped skeleton (§15), not a spinner.
                <div className="space-y-2">
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ) : !assignedDossiers || assignedDossiers.length === 0 ? (
                <EmptyState
                  icon={<FolderOpen />}
                  title="Aucun dossier assigné"
                  description="Les dossiers créés par ou confiés à cet utilisateur apparaîtront ici."
                  dashed={false}
                />
              ) : (
                // Data table — element-specs §3 (Polaris: text left; NN/g: first
                // column = the human identifier, row = link with the chevron at
                // the row end; Carbon: sticky header). The table sits in the card
                // without a second frame (§5) — it bleeds to the card edges.
                <div className="-mx-6 -mb-6 border-t border-hairline">
                  <Table regionLabel="Dossiers assignés">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Réf. expert</TableHead>
                        <TableHead>Assuré</TableHead>
                        <TableHead>Nature du dossier</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="w-12 pr-6 text-right"><span className="sr-only">Ouvrir</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedDossiers.map((d: any) => {
                        const assureName = typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim();
                        return (
                          <TableRow key={d.id} className="group cursor-pointer" onClick={() => router.push(`/dossiers/${d.id}`)}>
                            <TableCell className="t-mono pl-6 font-semibold">{d.refExpert || <span className="text-ink-4">—</span>}</TableCell>
                            <TableCell className="font-medium">{assureName || <span className="text-ink-4">—</span>}</TableCell>
                            <TableCell className="text-ink-2">{d.nature || <span className="text-ink-4">—</span>}</TableCell>
                            <TableCell>
                              <span className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut || 'Nouveau'))}>{d.statut || 'Nouveau'}</span>
                            </TableCell>
                            <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                              <Link href={`/dossiers/${d.id}`} aria-label={`Ouvrir le dossier ${d.refExpert || ''}`} className="inline-flex rounded-sm text-ink-4 transition-colors group-hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <ChevronRight className="h-4 w-4" />
                              </Link>
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
              <CardTitle className="t-heading flex items-center gap-2">
                <Clock className="h-4 w-4 text-ink-3" aria-hidden />
                Historique d&apos;activité
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : !activityHistory || activityHistory.length === 0 ? (
                <EmptyState
                  icon={<Clock />}
                  title="Aucune activité récente"
                  description="Les changements effectués par cet utilisateur apparaîtront ici."
                  dashed={false}
                />
              ) : (
                // Event rows — element-specs §4 (Material 3 lists: leading
                // element + label + supporting text; GOV.UK summary list rows):
                // 56 px two-line rows, hairlines only, the date block is the
                // anchor — NEUTRAL (2026-09-02 time ruling: terracotta means
                // today/next/upcoming; history is past, so no warm tone).
                // Day number in Inter 600 (numbers never in Outfit).
                <ol className="divide-y divide-hairline border-t border-hairline">
                  {activityHistory.map((entry: any) => {
                    const d = toDate(entry.changedAt);
                    return (
                      <li key={entry.id} className="flex min-h-[56px] items-center gap-3 py-2">
                        <div className="flex w-10 shrink-0 flex-col items-center justify-center rounded-md bg-surface-3 py-1 text-center text-ink-2 shadow-rim">
                          <span className="text-[11px] font-medium leading-none">
                            {d ? format(d, 'MMM', { locale: fr }).replace('.', '') : '—'}
                          </span>
                          <span className="text-base font-semibold leading-tight tabular-nums">{d ? format(d, 'd') : '—'}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="t-body truncate font-semibold">{entry.action}</p>
                          <p className="t-caption flex flex-wrap items-center gap-x-2 tabular-nums">
                            <span>{d ? format(d, 'yyyy · HH:mm', { locale: fr }) : '—'}</span>
                            {entry.newStatut && (
                              <span className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(entry.newStatut))}>
                                {entry.newStatut}
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          {showSessionCard && (() => {
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
                  <CardTitle className="t-heading flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-ink-3" aria-hidden />
                    Session / Appareil
                  </CardTitle>
                  <CardDescription className="t-caption">
                    Ce rôle est limité à un seul appareil à la fois. Déconnectez sa session
                    pour lui permettre de se connecter depuis un autre appareil.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* State line — §11: status colour always with a text label. */}
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        sessionActive ? 'bg-status-success-fg' : sessionStale ? 'bg-status-warning-fg' : 'bg-ink-4',
                      )}
                      aria-hidden
                    />
                    <span className={cn(sessionActive ? 'font-semibold text-ink' : 'text-ink-3')}>
                      {sessionActive
                        ? 'Connecté sur un appareil'
                        : sessionStale
                          ? 'Session inactive (se libère automatiquement)'
                          : 'Aucune session active'}
                    </span>
                  </div>
                  {/* Definition list — element-specs §10 (GOV.UK summary list:
                      key / value rows; empty = "—", never a fake value). */}
                  {userData.currentSessionId && (
                    <dl className="divide-y divide-hairline border-t border-hairline">
                      <div className="flex items-center justify-between gap-3 py-2">
                        <dt className="t-label flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" aria-hidden /> Appareil</dt>
                        <dd className={cn('t-body-sm truncate text-right', sessionMeta?.device ? 'font-semibold text-ink' : 'text-ink-4')}>{sessionMeta?.device || '—'}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-2">
                        <dt className="t-label flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" aria-hidden /> Adresse IP</dt>
                        <dd className={cn('t-mono text-right', !sessionMeta?.ip && 'text-ink-4')}>{sessionMeta?.ip || '—'}</dd>
                      </div>
                      {sessionMeta?.at && (
                        <div className="flex items-center justify-between gap-3 py-2">
                          <dt className="t-label flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden /> Connecté depuis</dt>
                          <dd className="t-body-sm text-right font-semibold tabular-nums text-ink">{formatTimestamp(sessionMeta.at)}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {/* One `outline` action (§8) — reversible, so not destructive. */}
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!userData.currentSessionId || isDisconnecting}
                    loading={isDisconnecting}
                    onClick={handleForceDisconnect}
                  >
                    {!isDisconnecting && <LogOut className="h-4 w-4" aria-hidden />}
                    {isDisconnecting ? 'Déconnexion…' : 'Déconnecter la session'}
                  </Button>
                </CardContent>
              </Card>
            );
          })()}

          {canDelete && (
            // Destructive card — element-specs §8 (GOV.UK button: warning
            // buttons only for actions with "serious destructive consequences
            // that cannot be easily undone"): one `destructive` button, the
            // consequence said in a caption above it.
            <Card>
              <CardHeader>
                <CardTitle className="t-heading">Supprimer cet utilisateur</CardTitle>
                <CardDescription className="t-caption">
                  L&apos;utilisateur sera retiré du système. Les journaux d&apos;activité (historique, workflow) attribués à cet utilisateur seront conservés.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" className="w-full" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4" aria-hidden /> Supprimer l&apos;utilisateur
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation dialog — element-specs §13 (Material 3 dialogs: headline
          names the object, "avoid apologies, alarm, or ambiguity", ≤ 2 actions,
          confirm closest to the edge). */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {displayName} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Son compte et sa fiche seront définitivement supprimés. Les journaux d&apos;activité (historique, workflow) qui lui sont attribués seront conservés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
              className={buttonVariants({ variant: 'destructive' })}
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
