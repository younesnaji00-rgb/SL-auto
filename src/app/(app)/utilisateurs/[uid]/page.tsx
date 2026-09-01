'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User as UserIcon,
  Clock,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  AlertTriangle,
  MoreHorizontal,
  Pencil,
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
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { isSessionStale, timestampToMillis } from '@/lib/session-meta';
import { MultiSelect } from '@/components/ui/multi-select';
import { useOptions } from '@/hooks/use-options';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { useRegisterPageTitle } from '@/components/layout/page-chrome';
import { UserRecordSkeleton } from './loading';

// ── Presentation helpers (mirrors dossiers/[id]/information-tab.tsx) ──

/** Top-level block on the canvas: hairline header (icon + title + actions),
 *  24 px body. `tonal` because nothing wraps it (DESIGN.md §10). */
const Section = ({
  title,
  icon,
  actions,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <Card variant="tonal" role="region" aria-label={title} className={cn('min-w-0', className)}>
    <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-hairline px-6 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="shrink-0 text-ink-3 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        <h2 className="t-heading truncate">{title}</h2>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
    <div className="px-6 py-5">{children}</div>
  </Card>
);

/** Definition-list cell: quiet label over a bold value; in edit mode the
 *  value is swapped for the control in place. */
const Field = ({
  label,
  value,
  edit,
  editing,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  edit?: React.ReactNode;
  editing: boolean;
  className?: string;
}) => {
  const empty = value === undefined || value === null || value === '';
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="t-label truncate">{label}</dt>
      <dd className="mt-1 min-h-[20px]">
        {editing && edit ? (
          <div className="w-full">{edit}</div>
        ) : typeof value === 'string' || empty ? (
          <span className={cn('t-body break-words', empty ? 'text-ink-4' : 'font-semibold text-ink')}>{empty ? '—' : value}</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
};

const Chip = ({ className, children, title }: { className?: string; children: React.ReactNode; title?: string }) => (
  <span title={title} className={cn('inline-flex h-5 max-w-full items-center truncate rounded-full px-2 text-[11px] font-medium', className)}>
    {children}
  </span>
);
const ROLE_CHIP = 'bg-surface-3 text-ink-2';
const statutChip = (statut: string) =>
  statut === 'Actif' ? 'bg-status-success-bg text-status-success-fg' : 'bg-status-danger-bg text-status-danger-fg';

const ChipList = ({ items, emptyLabel }: { items: string[]; emptyLabel: React.ReactNode }) =>
  items.length === 0 ? (
    <span className="t-body text-ink-4">{emptyLabel}</span>
  ) : (
    <span className="flex flex-wrap gap-1">
      {items.map((c) => (
        <Chip key={c} className="bg-surface-2 text-ink-2" title={c}>{c}</Chip>
      ))}
    </span>
  );

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
  // Edit-in-place (information-tab pattern): read-only definition lists by
  // default; « Modifier » swaps values for controls, the record bar carries
  // the single « Enregistrer ».
  const [editing, setEditing] = useState(false);
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
  useRegisterPageTitle(userLoading ? null : displayName);

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
      setEditing(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de sauvegarder les modifications." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData(initialForm);
    setEditing(false);
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
    return <UserRecordSkeleton />;
  }

  if (!userData) {
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

  const passwordValue = (
    <span className="flex items-center gap-1">
      <span className="t-mono text-ink-2">{showPassword ? (formData.password || '—') : '••••••'}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-ink-3 hover:text-ink"
        onClick={() => setShowPassword(v => !v)}
        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
    </span>
  );

  const zoneEdit = (() => {
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
      <Popover open={zonePopoverOpen} onOpenChange={(open) => { setZonePopoverOpen(open); if (!open) setZoneQuery(''); }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={zonePopoverOpen}
            className={cn("w-full justify-between font-normal", !selected && "text-ink-3")}
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
                placeholder="Tapez pour rechercher ou créer..."
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
    );
  })();

  return (
    <div className="space-y-6">
      {/* Sticky identity bar — same tokens as components/dossiers/record-bar.tsx:
          identity · role · statut · email, ONE primary (Enregistrer while editing),
          ⋯ menu. Bleeds into the layout padding so it spans the inset. */}
      <div
        className="sticky top-0 z-30 -mx-4 -mt-4 flex min-h-[48px] items-center gap-2 glass-bar border-b border-hairline px-4 md:-mx-6 md:-mt-6 md:px-6 lg:-mx-8 lg:-mt-8 lg:px-8"
        data-record-bar
      >
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-ink-3 hover:text-ink" asChild>
          <Link href="/utilisateurs" aria-label="Retour aux utilisateurs" title="Utilisateurs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
          <h1 className="t-heading min-w-0 truncate" tabIndex={-1}>{displayName}</h1>
          {formData.role && <Chip className={ROLE_CHIP}>{formData.role}</Chip>}
          <Chip className={statutChip(statut)}>{statut}</Chip>
          {formData.email && <span className="t-mono hidden truncate text-ink-3 md:inline">{formData.email}</span>}
        </div>

        {editing && (
          <>
            <Button size="sm" variant="ghost" className="h-8" onClick={handleCancelEdit} disabled={isSaving}>
              Annuler
            </Button>
            <Button size="sm" className="h-8" onClick={handleSave} loading={isSaving} disabled={!dirty && !isSaving}>
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Plus d'actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="t-caption truncate font-normal">{displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!editing && (
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Modifier les informations
              </DropdownMenuItem>
            )}
            {showSessionCard && (
              <DropdownMenuItem onSelect={handleForceDisconnect} disabled={!userData.currentSessionId || isDisconnecting}>
                <LogOut className="mr-2 h-4 w-4" /> Déconnecter la session
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer l&apos;utilisateur
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section
            title="Informations"
            icon={<UserIcon />}
            actions={
              !editing ? (
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 px-2.5 text-xs" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
              ) : undefined
            }
          >
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field
                label="Prénom"
                editing={editing}
                value={formData.prenom}
                edit={<Input value={formData.prenom} onChange={e => setFormData(p => ({ ...p, prenom: e.target.value }))} />}
              />
              <Field
                label="Nom"
                editing={editing}
                value={formData.nom}
                edit={<Input value={formData.nom} onChange={e => setFormData(p => ({ ...p, nom: e.target.value }))} />}
              />
              <Field
                label="Email"
                editing={editing}
                value={formData.email ? <span className="t-mono break-all font-semibold">{formData.email}</span> : ''}
                edit={<Input className="font-mono" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />}
              />
              <Field
                label="Téléphone"
                editing={editing}
                value={formData.telephone ? <span className="t-body font-semibold tabular-nums text-ink">{formData.telephone}</span> : ''}
                edit={<Input type="tel" inputMode="tel" placeholder="+212 6 00 00 00 00" value={formData.telephone} onChange={e => setFormData(p => ({ ...p, telephone: e.target.value }))} />}
              />
              <Field label="Mot de passe" editing={editing} value={passwordValue} />
              <Field
                label="Rôle"
                editing={editing}
                value={formData.role ? <Chip className={ROLE_CHIP}>{formData.role}</Chip> : ''}
                edit={
                  <Select value={formData.role} onValueChange={v => setFormData(p => ({ ...p, role: v as Role }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                }
              />
              <Field
                label="Statut"
                editing={editing}
                value={<Chip className={statutChip(statut)}>{statut}</Chip>}
                edit={
                  <Select value={formData.statut} onValueChange={v => setFormData(p => ({ ...p, statut: v as 'Actif' | 'Inactif' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Actif">Actif</SelectItem>
                      <SelectItem value="Inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              {formData.role === 'Agent de Terrain' && (
                <Field label="Zone" editing={editing} value={formData.zone} edit={zoneEdit} />
              )}
            </dl>

            <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-hairline pt-5 lg:grid-cols-2">
              <div className="min-w-0">
                <dt className="t-label">Compagnies d&apos;assurance affiliées</dt>
                <dd className="mt-1">
                  {editing ? (
                    <>
                      <MultiSelect
                        options={companyOptions}
                        selected={formData.compagnies}
                        onChange={(vals) => setFormData(p => ({ ...p, compagnies: vals }))}
                        className="w-full"
                      />
                      <p className="t-caption mt-1.5">
                        L&apos;utilisateur ne verra que les dossiers des compagnies sélectionnées. Si aucune n&apos;est sélectionnée, il verra tous les dossiers.
                      </p>
                    </>
                  ) : (
                    <ChipList items={formData.compagnies} emptyLabel="Toutes" />
                  )}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="t-label">Sites</dt>
                <dd className="mt-1">
                  {editing ? (
                    <>
                      <MultiSelect
                        options={siteOptions}
                        selected={formData.sites}
                        onChange={(vals) => setFormData(p => ({ ...p, sites: vals }))}
                        className="w-full"
                      />
                      <p className="t-caption mt-1.5">
                        Villes dans lesquelles l&apos;utilisateur intervient. Plusieurs choix possibles.
                      </p>
                    </>
                  ) : (
                    <ChipList items={formData.sites} emptyLabel="—" />
                  )}
                </dd>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-hairline pt-5 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="t-label">Créé le</dt>
                <dd className="t-body mt-1 tabular-nums text-ink-2">{formatTimestamp(userData.createdAt)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="t-label">Dernière connexion</dt>
                <dd className="t-body mt-1 tabular-nums text-ink-2">{formatTimestamp(userData.lastLogin)}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Accès aux pages" icon={<ShieldCheck />}>
            <p className="t-caption mb-3 max-w-[65ch]">
              Accordez ou retirez l&apos;accès à n&apos;importe quelle page pour cet utilisateur, indépendamment de son rôle. Utile pour des privilèges temporaires. «&nbsp;Signaler un bug&nbsp;» reste toujours accessible.
            </p>
            {permissionTree.length === 0 ? (
              <p className="t-caption py-2">Aucun menu configurable.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {permissionTree.map((item) => {
                  const allowed = effectiveAllowed(item.id, item.roleDefault);
                  const isOverride =
                    (allowed && !item.roleDefault) || (!allowed && item.roleDefault);
                  const saving = !!permissionsSaving[item.id];
                  const hasChildren = !!item.children && item.children.length > 0;
                  const isExpanded = expandedPerms.has(item.id);
                  return (
                    <li key={item.id}>
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <button
                          type="button"
                          disabled={!hasChildren}
                          onClick={() => hasChildren && toggleExpand(item.id)}
                          className={cn(
                            'flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            hasChildren && 'transition-colors hover:text-ink-2',
                          )}
                          aria-expanded={hasChildren ? isExpanded : undefined}
                        >
                          {hasChildren ? (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                            )
                          ) : (
                            <span className="w-4 shrink-0" aria-hidden />
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="t-body font-semibold leading-tight">{item.label}</p>
                              {isOverride && (
                                <Chip
                                  className={allowed ? 'bg-status-success-bg text-status-success-fg' : 'bg-status-warning-bg text-status-warning-fg'}
                                  title={allowed ? 'Accordé en plus du rôle' : 'Retiré du rôle'}
                                >
                                  {allowed ? 'Accordé' : 'Retiré'}
                                </Chip>
                              )}
                              {!item.roleDefault && !isOverride && (
                                <Chip className="bg-surface-2 text-ink-3" title="Non inclus dans le rôle par défaut">
                                  Hors rôle
                                </Chip>
                              )}
                            </div>
                            <p className="font-mono text-[11px] text-ink-3">{item.id}</p>
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          {saving && <span className="t-label">Enregistrement…</span>}
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
                        <ul className="divide-y divide-hairline border-t border-hairline">
                          {item.children!.map((child) => {
                            const cAllowed = effectiveAllowed(child.id, child.roleDefault);
                            const cIsOverride =
                              (cAllowed && !child.roleDefault) || (!cAllowed && child.roleDefault);
                            const cSaving = !!permissionsSaving[child.id];
                            return (
                              <li
                                key={child.id}
                                className="flex items-center justify-between gap-3 py-2 pl-6"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="t-body leading-tight">{child.label}</p>
                                    {cIsOverride && (
                                      <Chip className={cAllowed ? 'bg-status-success-bg text-status-success-fg' : 'bg-status-warning-bg text-status-warning-fg'}>
                                        {cAllowed ? 'Accordé' : 'Retiré'}
                                      </Chip>
                                    )}
                                  </div>
                                  <p className="font-mono text-[11px] text-ink-3">{child.id}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  {cSaving && <span className="t-label">Enregistrement…</span>}
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
          </Section>

          <Section title="Dossiers assignés" icon={<FolderOpen />}>
            {dossiersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !assignedDossiers || assignedDossiers.length === 0 ? (
              <EmptyState
                icon={<FolderOpen />}
                title="Aucun dossier assigné"
                description="Les dossiers créés par ou confiés à cet utilisateur apparaîtront ici."
                dashed={false}
              />
            ) : (
              <div className="-mx-6 -mb-5">
                <Table regionLabel="Dossiers assignés">
                  <TableHeader className="bg-card">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Réf expert</TableHead>
                      <TableHead>Assuré</TableHead>
                      <TableHead>Nature</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-12 pr-6 text-right"><span className="sr-only">Ouvrir</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedDossiers.map((d: any) => {
                      const assureName = typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim() || 'N/A';
                      return (
                        <TableRow key={d.id} className="group cursor-pointer" onClick={() => router.push(`/dossiers/${d.id}`)}>
                          <TableCell className="t-mono pl-6 font-semibold">{d.refExpert || '—'}</TableCell>
                          <TableCell className="font-medium">{assureName}</TableCell>
                          <TableCell className="text-ink-2">{d.nature || '—'}</TableCell>
                          <TableCell>
                            <span className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut || 'Nouveau'))}>{d.statut || 'Nouveau'}</span>
                          </TableCell>
                          <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/dossiers/${d.id}`} aria-label={`Ouvrir le dossier ${d.refExpert || ''}`} className="inline-flex text-ink-4 transition-colors group-hover:text-ink">
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
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Historique d'activité" icon={<Clock />}>
            {historyLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !activityHistory || activityHistory.length === 0 ? (
              <p className="t-caption py-2">Aucune activité récente</p>
            ) : (
              // Hairline rows, date as the quiet caption, action as the value.
              <ol className="divide-y divide-hairline">
                {activityHistory.map((entry: any) => (
                  <li key={entry.id} className="space-y-1 py-2.5 first:pt-0 last:pb-0">
                    <p className="t-caption tabular-nums">{formatTimestamp(entry.changedAt)}</p>
                    <p className="t-body-sm font-medium text-ink">{entry.action}</p>
                    {entry.newStatut && (
                      <span className={cn(STATUS_BADGE_CLASS, 'inline-block', getStatusBadgeStyles(entry.newStatut))}>
                        {entry.newStatut}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          {showSessionCard && (() => {
            // A session is "active" while its heartbeat is fresh. A held slot
            // whose heartbeat has gone stale (app closed/killed without a clean
            // sign-out) is shown as inactive — it will free itself for the next
            // login within STALE_SESSION_MS even without a force-disconnect.
            const hasSession = !!userData.currentSessionId;
            const sessionStale = hasSession && isSessionStale(timestampToMillis(userData.currentSessionSeenAt), Date.now());
            const sessionActive = hasSession && !sessionStale;
            return (
              <Section title="Session / Appareil" icon={<Smartphone />}>
                <p className="t-caption mb-3">
                  Ce rôle est limité à un seul appareil à la fois. Déconnectez sa session
                  pour lui permettre de se connecter depuis un autre appareil.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      sessionActive
                        ? 'bg-status-success-fg'
                        : sessionStale
                          ? 'bg-status-warning-fg'
                          : 'bg-ink-4',
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
                {userData.currentSessionId && (
                  <dl className="mt-3 divide-y divide-hairline border-t border-hairline">
                    <div className="flex items-center justify-between gap-3 py-2">
                      <dt className="t-label flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Appareil</dt>
                      <dd className="t-body-sm truncate text-right font-semibold text-ink">{sessionMeta?.device || 'Inconnu'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <dt className="t-label flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Adresse IP</dt>
                      <dd className="t-mono text-right">{sessionMeta?.ip || 'Inconnue'}</dd>
                    </div>
                    {sessionMeta?.at && (
                      <div className="flex items-center justify-between gap-3 py-2">
                        <dt className="t-label flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Connecté depuis</dt>
                        <dd className="t-body-sm text-right tabular-nums text-ink">{formatTimestamp(sessionMeta.at)}</dd>
                      </div>
                    )}
                  </dl>
                )}
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  disabled={!userData.currentSessionId || isDisconnecting}
                  loading={isDisconnecting}
                  onClick={handleForceDisconnect}
                >
                  Déconnecter la session
                </Button>
              </Section>
            );
          })()}

          {canDelete && (
            // Destructive zone: kept apart from the record's data, one
            // `destructive` control only (GOV.UK: dangerous actions stand alone).
            <Section title="Zone sensible" icon={<AlertTriangle />}>
              <p className="t-caption mb-4">
                L&apos;utilisateur sera retiré du système. Les journaux d&apos;activité (historique, workflow) attribués à cet utilisateur seront conservés.
              </p>
              <Button variant="destructive" className="w-full" onClick={() => setShowDeleteDialog(true)}>
                Supprimer l&apos;utilisateur
              </Button>
            </Section>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement l&apos;utilisateur <strong className="text-ink">{formData.prenom} {formData.nom}</strong> ?
              Cette action est irréversible. Les journaux d&apos;activité (historique, workflow) attribués à cet utilisateur seront conservés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
              className={buttonVariants({ variant: 'destructive' })}
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression…' : 'Confirmer la suppression'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
