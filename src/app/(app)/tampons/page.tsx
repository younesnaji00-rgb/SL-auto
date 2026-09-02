'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ImageIcon, Loader2, Stamp as StampIcon, Trash2, Users, X } from 'lucide-react';
import { IconChip } from '@/components/ui/icon-chip';
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
  // Drag-over highlight for the picker button (the one drop target).
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

  // Drop-target handlers for the picker button (element-specs §21: the
  // picker is ONE plain button that is also a drop target; ring on drag-over).
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

  const openPicker = () => fileInputRef.current?.click();

  return (
    <div className="space-y-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesPicked}
      />

      {/* Page header — element-specs §1 (Polaris Page: plural object + count
          pill). No header action: the page primary is the import card's
          button (GOV.UK: one default button per page). */}
      <PageHeader
        title="Tampons"
        subtitle="Gérez les tampons utilisés pour signer les devis et documents générés."
        count={stampsLoading ? undefined : stamps.length}
      />

      {/* Card 1 — element-specs §5 (Material 3 cards: one topic per container). */}
      <Card>
        <CardHeader>
          <CardTitle className="t-heading">Importer des tampons</CardTitle>
          <CardDescription className="t-caption">
            Le nom du tampon est dérivé du nom de fichier, sans l&apos;extension.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File picker — element-specs §21 (owner ruling: ONE plain button
              that is also a drop target, ring on drag-over, no banner, no
              dashed panel, no copy). Emphasis follows the job (§8, GOV.UK
              "one default button"): the picker is `default` until files are
              queued, then « Importer » takes the fill and the picker goes
              `tonal` (Material 3: filled › filled tonal). */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant={queued.length > 0 ? 'tonal' : 'default'}
              onClick={openPicker}
              disabled={isImporting}
              className={cn(dragOver && 'ring-2 ring-ring ring-offset-2 ring-offset-background')}
              {...dropProps}
            >
              <ImageIcon className="h-4 w-4" aria-hidden />
              Choisir des images
            </Button>
            {queued.length > 0 && !isImporting && (
              <Button type="button" onClick={handleBatchImport}>
                Importer {queued.length} tampon{queued.length > 1 ? 's' : ''}
              </Button>
            )}
            {isImporting && progress && (
              <span className="t-caption inline-flex items-center gap-2 tabular-nums" aria-live="polite">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {progress.done}/{progress.total} traités
                {progress.failed > 0 ? ` · ${progress.failed} échec${progress.failed > 1 ? 's' : ''}` : ''}
              </span>
            )}
          </div>
          {/* Queued files — element-specs §4 (Material 3 lists: label +
              supporting text + trailing icon button): 44 px rows, hairlines
              only, derived name 14/600, file name t-caption, remove `ghost`. */}
          {queued.length > 0 && (
            <ul className="divide-y divide-hairline border-t border-hairline" aria-live="polite" aria-label="Fichiers en attente d'import">
              {queued.map((q) => (
                <li key={q.id} className="flex min-h-[44px] items-center gap-3 py-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-3 text-ink-3 shadow-rim">
                    <ImageIcon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="t-body truncate font-semibold">{q.derivedName}</p>
                    <p className="t-caption truncate">{q.file.name}</p>
                  </div>
                  {!isImporting && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-ink-3 hover:text-ink"
                          onClick={() => removeFromQueue(q.id)}
                          aria-label={`Retirer ${q.derivedName} de la file`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Retirer de la file</TooltipContent>
                    </Tooltip>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — the registered stamps as a vertical LIST (original layout). */}
      <Card>
        <CardHeader>
          <CardTitle className="t-heading flex items-center gap-2">
            {/* Section anchor chip (neutral — terracotta = time, 2026-09-02) — addendum 1b: ONE IconChip beside the
                section that anchors the page. */}
            <IconChip><StampIcon /></IconChip>
            Tampons enregistrés
          </CardTitle>
          <CardDescription className="t-caption">
            Activez, désactivez ou supprimez les tampons existants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stampsLoading ? (
            // Row-shaped skeleton (§15), not a spinner.
            <div className="divide-y divide-hairline border-t border-hairline">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`sk-stamp-${i}`} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-16 w-16 rounded-[10px]" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56 max-w-full" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          ) : stamps.length === 0 ? (
            // Empty state — element-specs §12 (Polaris: verb-led heading, ONE
            // action; `tonal` inside a card). Opens the same picker.
            <EmptyState
              icon={<StampIcon />}
              title="Ajouter le premier tampon"
              description="Aucun tampon n'est encore enregistré."
              action={
                <Button type="button" variant="tonal" onClick={openPicker} disabled={isImporting}>
                  Choisir des images
                </Button>
              }
              dashed={false}
            />
          ) : (
            // List rows — element-specs §4 (Material 3 lists: leading media,
            // label, supporting text, trailing selection control / icon
            // button; NN/g cards: homogeneous content → a vertical list, not
            // cards): hairlines only, thumbnail = the leading anchor (64 px,
            // surface-3 + rim, original size), name 14/600, meta t-caption,
            // trailing Switch + label + delete `ghost`.
            <ul className="divide-y divide-hairline border-t border-hairline" aria-label="Tampons enregistrés">
              {stamps.map((stamp) => {
                const assignees = assigneesByStampId.get(stamp.id) ?? [];
                const switchId = `stamp-active-${stamp.id}`;
                return (
                  <li key={stamp.id} className="flex flex-wrap items-center gap-4 py-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface-3 p-1 shadow-rim">
                      {stamp.url ? (
                        <img
                          src={stamp.url}
                          alt=""
                          className={cn('max-h-full max-w-full object-contain', !stamp.active && 'opacity-50')}
                        />
                      ) : (
                        <StampIcon className="h-6 w-6 text-ink-3" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 basis-48">
                      <p className={cn('t-body truncate font-semibold', !stamp.active && 'text-ink-2')}>{stamp.name || 'Sans nom'}</p>
                      <p className="t-caption truncate tabular-nums">{importedMeta(stamp)}</p>
                      {assignees.length > 0 && (
                        <p className="t-caption truncate" title={assignees.join(', ')}>
                          Assigné à : {assignees.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {/* Material 3 switch: immediate effect, label describes the ON state. */}
                      <div className="flex items-center gap-2">
                        <Switch
                          id={switchId}
                          checked={stamp.active}
                          onCheckedChange={(checked) => handleToggleActive(stamp, checked)}
                          aria-label={`Tampon ${stamp.name || 'sans nom'} actif`}
                        />
                        <label htmlFor={switchId} className="t-caption cursor-pointer select-none">
                          {stamp.active ? 'Actif' : 'Inactif'}
                        </label>
                      </div>
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-ink-3 hover:text-destructive"
                              onClick={() => setDeleteTarget(stamp)}
                              aria-label={`Supprimer ${stamp.name || 'ce tampon'}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Supprimer</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Card 3 — assignment rows. */}
      <Card>
        <CardHeader>
          <CardTitle className="t-heading">Assignation par chiffreur</CardTitle>
          <CardDescription className="t-caption">
            Sélectionnez le tampon à utiliser pour chaque chiffreur. Chaque chiffreur peut avoir un tampon distinct.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chiffreursLoading ? (
            <div className="divide-y divide-hairline border-t border-hairline">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`sk-chiff-${i}`} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-10 w-72 max-w-full" />
                </div>
              ))}
            </div>
          ) : !chiffreurUsers || chiffreurUsers.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="Aucun chiffreur"
              description="Aucun utilisateur n'a le rôle Chiffreur."
              dashed={false}
            />
          ) : (
            // Rows — element-specs §4: 40 px preview as the anchor, name
            // 14/600, assigned stamps as neutral chips (§11), the multi-select
            // trigger at the row end.
            <ul className="divide-y divide-hairline border-t border-hairline" aria-label="Chiffreurs">
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
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-3 p-0.5 shadow-rim">
                        {previewStamp?.url ? (
                          <img
                            src={previewStamp.url}
                            alt=""
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <StampIcon className="h-4 w-4 text-ink-3" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="t-body truncate font-semibold">{label}</p>
                        {assignedStamps.length === 0 ? (
                          <p className="t-caption">Aucun tampon assigné</p>
                        ) : (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {assignedStamps.map((s) => (
                              <Badge key={s.id} variant="neutral" title={s.name || 'Sans nom'}>
                                {s.name || 'Sans nom'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-full sm:w-72">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between font-normal"
                            aria-label={`Tampons de ${label}`}
                          >
                            <span className="truncate text-left">{triggerLabel}</span>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
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
                                    role="menuitemcheckbox"
                                    aria-checked={selected}
                                    onClick={() => {
                                      const next = selected
                                        ? assignedIds.filter((id) => id !== s.id)
                                        : [...assignedIds, s.id];
                                      handleSetAssignedStamps(u.id, next);
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <Checkbox checked={selected} className="shrink-0" tabIndex={-1} aria-hidden />
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
        </CardContent>
      </Card>

      {/* Confirmation dialog — element-specs §13 (Material 3 dialogs: names
          the object and its consequence, ≤ 2 actions, confirm at the edge). */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le tampon « {deleteTarget?.name || 'sans nom'} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le fichier sera retiré du stockage et le tampon de la base. Les chiffreurs auxquels il est assigné n&apos;y auront plus accès. Cette action est irréversible.
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
              {isDeleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
