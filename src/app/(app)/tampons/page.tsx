'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, Loader2, Plus, Stamp as StampIcon, Trash2, Users, X } from 'lucide-react';
import { useFirestore, useStorage, useCollection } from '@/firebase';
import { addDoc, collection, deleteDoc, deleteField, doc, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getDefaultRouteForRole } from '@/lib/nav-groups';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStamps, type Stamp } from '@/hooks/use-stamps';
import { cn } from '@/lib/utils';
import { TamponsSkeleton } from './loading';

// Sentinel value used by the per-stamp "assign to chiffreur" Select. Radix's
// SelectItem rejects empty-string `value`, so we use a sentinel to represent
// "no assignment" and translate it to `deleteField()` on write.
const UNASSIGN_VALUE = '__unassign__';

interface ChiffreurUser {
  id: string;
  uid?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  role?: string;
  /** Multi-select: list of stamp IDs available to this chiffreur. */
  assignedStampIds?: string[];
  /** Legacy single-stamp field (round-1 L). Treated as [singleId] on read. */
  assignedStampId?: string;
}

/** Read assigned stamp IDs, tolerating the legacy singular field. */
function readAssigned(u: ChiffreurUser): string[] {
  if (Array.isArray(u.assignedStampIds)) return u.assignedStampIds;
  if (u.assignedStampId) return [u.assignedStampId];
  return [];
}

function extensionFromFile(file: File): string {
  const nameExt = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  if (nameExt) return nameExt;
  const type = file.type || '';
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/svg+xml') return 'svg';
  return 'img';
}

/** Top-level block: hairline header (icon + title), 24 px body (information-tab Section). */
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

export default function TamponsSettingsPage() {
  const { profile, loading: userLoading, canDelete } = useCurrentUser();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { stamps, loading: stampsLoading } = useStamps({ includeInactive: true });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [queued, setQueued] = useState<Array<{ id: string; file: File; derivedName: string }>>([]);
  const [progress, setProgress] = useState<{ total: number; done: number; failed: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Stamp | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Drag-over highlight for the empty socket / picker (both are drop targets).
  const [dragOver, setDragOver] = useState(false);

  // Per-chiffreur stamp assignment. Read all users with role `Chiffreur`; each
  // user doc carries an optional `assignedStampId` pointing at a stamp.id.
  // We do NOT modify the read site here (PDF generator) — this just plumbs
  // the write field so a future iteration can adopt it.
  const chiffreursQuery = useMemo(
    () => (db ? (query(collection(db, 'users'), where('role', '==', 'Chiffreur')) as any) : null),
    [db]
  );
  const { data: chiffreurUsers, loading: chiffreursLoading } = useCollection<ChiffreurUser>(chiffreursQuery);

  const isImporting = progress !== null;

  // Reverse index: stamp.id -> array of chiffreur display labels currently
  // assigned to it. Used to annotate each stamp row with its assignees.
  const assigneesByStampId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const u of chiffreurUsers ?? []) {
      const ids = readAssigned(u);
      if (ids.length === 0) continue;
      const label =
        [u.prenom, u.nom].filter(Boolean).join(' ').trim() || u.email || u.id;
      for (const sid of ids) {
        const arr = map.get(sid) ?? [];
        arr.push(label);
        map.set(sid, arr);
      }
    }
    return map;
  }, [chiffreurUsers]);

  const newId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const router = useRouter();
  React.useEffect(() => {
    if (!userLoading && profile?.role && profile.role !== 'Admin') {
      router.replace(getDefaultRouteForRole(profile.role));
    }
  }, [userLoading, profile?.role, router]);

  if (userLoading) {
    return <TamponsSkeleton />;
  }

  if (profile?.role !== 'Admin') return null;

  const enqueueFiles = (files: File[]) => {
    if (files.length === 0) return;
    const next = files.map((f) => ({
      id: newId(),
      file: f,
      derivedName: f.name.replace(/\.[^/.]+$/, '').trim() || f.name,
    }));
    setQueued((prev) => [...prev, ...next]);
  };

  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    enqueueFiles(Array.from(e.target.files ?? []));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drop-target handlers shared by the picker button and the empty socket
  // (DESIGN.md §9 — the picker is a plain button that is also a drop target).
  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      if (isImporting) return;
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (isImporting) return;
      enqueueFiles(Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith('image/')));
    },
  };

  const removeFromQueue = (id: string) => {
    setQueued((prev) => prev.filter((q) => q.id !== id));
  };

  const handleBatchImport = async () => {
    if (!db || !storage || queued.length === 0) return;
    const createdByName =
      [profile.prenom, profile.nom].filter(Boolean).join(' ').trim() ||
      profile.email ||
      '';
    const total = queued.length;
    setProgress({ total, done: 0, failed: 0 });
    let done = 0;
    let failed = 0;
    for (const item of queued) {
      try {
        const uuid = newId();
        const ext = extensionFromFile(item.file);
        const storagePath = `stamps/${uuid}.${ext}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, item.file, { contentType: item.file.type || undefined });
        const url = await getDownloadURL(storageRef);
        await addDoc(collection(db, 'stamps'), {
          name: item.derivedName || item.file.name,
          storagePath,
          url,
          active: true,
          createdAt: serverTimestamp(),
          createdBy: profile.uid,
          createdByName,
        });
        done += 1;
      } catch (err) {
        console.error('Stamp import failed for', item.file.name, err);
        failed += 1;
      } finally {
        setProgress({ total, done, failed });
      }
    }
    const plural = (n: number) => (n > 1 ? 's' : '');
    const summary =
      failed > 0
        ? `${done} tampon${plural(done)} importé${plural(done)}, ${failed} échec${plural(failed)}`
        : `${done} tampon${plural(done)} importé${plural(done)}`;
    toast({
      variant: failed > 0 && done === 0 ? 'destructive' : 'default',
      title: failed > 0 && done === 0 ? 'Import échoué' : 'Import terminé',
      description: summary,
    });
    setQueued([]);
    setProgress(null);
  };

  // Set the full list of stamps assigned to a chiffreur. Multi-select: caller
  // passes the desired final array. Empty array → field is removed. Also clears
  // the legacy singular `assignedStampId` so the two never disagree.
  const handleSetAssignedStamps = async (chiffreurUid: string, ids: string[]) => {
    if (!db || !chiffreurUid) return;
    try {
      await updateDoc(doc(db, 'users', chiffreurUid), {
        assignedStampIds: ids.length === 0 ? deleteField() : ids,
        // Clear the legacy singular field on first write so read-helpers
        // converge on the new array shape.
        assignedStampId: deleteField(),
      });
      toast({
        title: ids.length === 0 ? 'Tampons retirés' : `${ids.length} tampon(s) assigné(s)`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err?.message || "Impossible d'assigner les tampons.",
      });
    }
  };

  const handleToggleActive = async (stamp: Stamp, next: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'stamps', stamp.id), { active: next });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur', description: err?.message || 'Impossible de mettre à jour le tampon.' });
    }
  };

  const confirmDelete = async () => {
    if (!db || !storage || !deleteTarget) return;
    setIsDeleting(true);
    try {
      // Best-effort storage cleanup; Firestore deletion is the authoritative action.
      if (deleteTarget.storagePath) {
        try {
          await deleteObject(ref(storage, deleteTarget.storagePath));
        } catch (storageErr) {
          console.warn('Stamp storage object delete failed (continuing):', storageErr);
        }
      }
      await deleteDoc(doc(db, 'stamps', deleteTarget.id));
      toast({ title: 'Tampon supprimé' });
      setDeleteTarget(null);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur', description: err?.message || 'Suppression impossible.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const importedMeta = (stamp: Stamp) => {
    const importedBy = stamp.createdByName || stamp.createdBy || '—';
    const ts = stamp.createdAt as { toDate?: () => Date } | null | undefined;
    let importedAt = '—';
    try {
      const d = ts?.toDate ? ts.toDate() : null;
      importedAt = d ? format(d, 'dd/MM/yyyy HH:mm', { locale: fr }) : '—';
    } catch {
      importedAt = '—';
    }
    return `Importé par ${importedBy} · ${importedAt}`;
  };

  const pickerLabel = 'Ajouter des tampons';

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesPicked}
      />

      {/* Emphasis follows the job (GOV.UK): the picker is the primary until
          files are queued, then « Importer » takes the solid fill. */}
      <PageHeader
        title="Tampons"
        subtitle="Gérez les tampons utilisés pour signer les devis et documents générés."
        count={stampsLoading ? undefined : stamps.length}
        actions={
          queued.length > 0 && !isImporting ? (
            <>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} {...dropProps}>
                {pickerLabel}
              </Button>
              <Button type="button" onClick={handleBatchImport}>
                Importer {queued.length} tampon{queued.length > 1 ? 's' : ''}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className={cn(dragOver && 'ring-2 ring-ring ring-offset-2 ring-offset-background')}
              {...dropProps}
            >
              {pickerLabel}
            </Button>
          )
        }
      />

      {/* Chips only while something is queued or importing — never a banner. */}
      {(queued.length > 0 || isImporting) && (
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          {queued.map((q) => (
            <span
              key={q.id}
              className="inline-flex h-7 max-w-[240px] items-center gap-1 rounded-full bg-surface-2 pl-3 pr-1 text-xs text-ink-2 shadow-rim"
              title={q.file.name}
            >
              <span className="truncate">{q.derivedName}</span>
              {!isImporting && (
                <button
                  type="button"
                  className="rounded-full p-0.5 text-ink-3 hover:bg-surface-4 hover:text-ink"
                  onClick={() => removeFromQueue(q.id)}
                  aria-label={`Retirer ${q.derivedName} de la file`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {isImporting && progress && (
            <span className="t-caption inline-flex items-center gap-1.5 tabular-nums">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {progress.done}/{progress.total} traités
              {progress.failed > 0 ? ` · ${progress.failed} échec${progress.failed > 1 ? 's' : ''}` : ''}
            </span>
          )}
        </div>
      )}

      {/* Socket grid (document-board convention): filled = raised tile,
          empty/add = dashed recessed socket that is a button + drop target. */}
      {stampsLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`sk-stamp-${i}`} className="paper overflow-hidden rounded-[10px]">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Tampons enregistrés">
          {stamps.map((stamp) => {
            const assignees = assigneesByStampId.get(stamp.id) ?? [];
            return (
              <li key={stamp.id} className="group min-w-0">
                <Card variant="tonal" className="flex h-full flex-col overflow-hidden rounded-[10px]">
                  <div className="relative flex aspect-[4/3] items-center justify-center border-b border-hairline bg-card p-4">
                    {stamp.url ? (
                      <img
                        src={stamp.url}
                        alt={stamp.name}
                        className={cn('max-h-full max-w-full object-contain', !stamp.active && 'opacity-50')}
                      />
                    ) : (
                      <StampIcon className="h-8 w-8 text-ink-4" />
                    )}
                    {!stamp.active && (
                      <span className="absolute left-2 top-2 inline-flex h-5 items-center rounded-full bg-surface-3 px-2 text-[11px] font-medium text-ink-2">
                        Inactif
                      </span>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 bg-card text-ink-3 opacity-0 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
                        onClick={() => setDeleteTarget(stamp)}
                        aria-label={`Supprimer ${stamp.name || 'ce tampon'}`}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 p-3">
                    <p className="t-body truncate font-semibold" title={stamp.name}>{stamp.name || 'Sans nom'}</p>
                    <p className="t-caption truncate tabular-nums">{importedMeta(stamp)}</p>
                    {assignees.length > 0 && (
                      <p className="t-caption truncate" title={assignees.join(', ')}>Assigné à : {assignees.join(', ')}</p>
                    )}
                    <label className="mt-auto flex items-center gap-2 pt-2 text-xs text-ink-2">
                      <Switch
                        checked={stamp.active}
                        onCheckedChange={(checked) => handleToggleActive(stamp, checked)}
                        aria-label="Basculer l'état actif"
                      />
                      {stamp.active ? 'Actif' : 'Inactif'}
                    </label>
                  </div>
                </Card>
              </li>
            );
          })}
          <li className="min-w-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className={cn(
                'flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-hairline-strong bg-surface-2/60 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                dragOver && 'bg-surface-2 ring-2 ring-ring',
              )}
              {...dropProps}
            >
              <Plus className="h-5 w-5" aria-hidden />
              <span className="t-caption">{stamps.length === 0 ? 'Ajouter votre premier tampon' : 'Ajouter un tampon'}</span>
            </button>
          </li>
        </ul>
      )}

      <Section title="Assignation par chiffreur" icon={<Users />}>
        <p className="t-caption mb-3 max-w-[65ch]">
          Sélectionnez le tampon à utiliser pour chaque chiffreur. Chaque chiffreur peut avoir un tampon distinct.
        </p>
        {chiffreursLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`sk-chiff-${i}`} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-10 w-72 rounded-md" />
              </div>
            ))}
          </div>
        ) : !chiffreurUsers || chiffreurUsers.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="Aucun chiffreur"
            description="Aucun utilisateur avec le rôle Chiffreur n'a été trouvé."
            dashed={false}
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {chiffreurUsers.map((u) => {
              const label =
                [u.prenom, u.nom].filter(Boolean).join(' ').trim() || u.email || u.id;
              const assignedIds = readAssigned(u);
              const assignedStamps = assignedIds
                .map((id) => stamps.find((s) => s.id === id))
                .filter((s): s is Stamp => Boolean(s));
              const previewStamp = assignedStamps[0];
              const visibleStamps = stamps.filter(
                (s) => s.active || assignedIds.includes(s.id),
              );
              const triggerLabel =
                assignedStamps.length === 0
                  ? 'Aucun tampon'
                  : assignedStamps.length === 1
                    ? assignedStamps[0].name || 'Sans nom'
                    : `${assignedStamps.length} tampons sélectionnés`;
              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-3 shadow-rim">
                      {previewStamp?.url ? (
                        <img
                          src={previewStamp.url}
                          alt={previewStamp.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <StampIcon className="h-4 w-4 text-ink-3" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="t-body truncate font-semibold">{label}</p>
                      <p className="t-caption truncate">
                        {assignedStamps.length === 0
                          ? 'Aucun tampon assigné'
                          : assignedStamps.map((s) => s.name || 'Sans nom').join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-72">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate text-left">{triggerLabel}</span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-ink-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 p-2">
                        {visibleStamps.length === 0 ? (
                          <p className="t-caption p-2">Aucun tampon disponible.</p>
                        ) : (
                          <div className="max-h-[300px] space-y-0.5 overflow-y-auto">
                            {visibleStamps.map((s) => {
                              const selected = assignedIds.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    const next = selected
                                      ? assignedIds.filter((id) => id !== s.id)
                                      : [...assignedIds, s.id];
                                    handleSetAssignedStamps(u.id, next);
                                  }}
                                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                                >
                                  <Checkbox checked={selected} className="shrink-0" />
                                  <span className="flex-1 truncate">
                                    {s.name || 'Sans nom'}
                                    {!s.active && <span className="text-ink-3"> (inactif)</span>}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {assignedIds.length > 0 && (
                          <div className="mt-2 border-t border-hairline pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full justify-center text-xs"
                              onClick={() => handleSetAssignedStamps(u.id, [])}
                            >
                              Tout désélectionner
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce tampon ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name && <span className="font-semibold text-ink">{deleteTarget.name}</span>} sera définitivement supprimé du stockage et de la base.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
