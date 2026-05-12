'use client';

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { EmptyState } from '@/components/ui/empty-state';
import { Loader2, Stamp as StampIcon, Trash2, Upload, X } from 'lucide-react';
import { useFirestore, useStorage } from '@/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStamps, type Stamp } from '@/hooks/use-stamps';
import { SkeletonRow } from '@/components/ui/skeleton';

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

  const isImporting = progress !== null;

  const newId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  if (userLoading) {
    return (
      <div className="py-12 text-sm text-muted-foreground">Chargement...</div>
    );
  }

  if (profile?.role !== 'Admin') {
    return (
      <Card className="border shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle>Accès refusé</CardTitle>
          <CardDescription>
            Cette page est réservée aux administrateurs.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const next = files.map((f) => ({
      id: newId(),
      file: f,
      derivedName: f.name.replace(/\.[^/.]+$/, '').trim() || f.name,
    }));
    setQueued((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tampons</h1>
        <p className="text-muted-foreground">
          Gérez les tampons utilisés pour signer les devis et documents générés.
        </p>
      </div>

      <Card className="border shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle>Importer des tampons</CardTitle>
          <CardDescription>
            Sélectionnez une ou plusieurs images. Le nom du tampon sera dérivé du nom de fichier (sans l&apos;extension).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesPicked}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              Sélectionner des fichiers
            </Button>
            {queued.length > 0 && !isImporting && (
              <Button type="button" onClick={handleBatchImport}>
                Importer {queued.length} tampon{queued.length > 1 ? 's' : ''}
              </Button>
            )}
            {isImporting && progress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {progress.done}/{progress.total} traités
                  {progress.failed > 0 ? ` · ${progress.failed} échec${progress.failed > 1 ? 's' : ''}` : ''}
                </span>
              </div>
            )}
          </div>
          {queued.length > 0 && (
            <ul className="mt-4 divide-y border rounded-md">
              {queued.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <span className="text-xs text-muted-foreground truncate min-w-0 flex-1 basis-40">
                    {q.file.name}
                  </span>
                  <span className="text-sm font-medium truncate min-w-0 flex-1 basis-40">
                    {q.derivedName}
                  </span>
                  {!isImporting && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeFromQueue(q.id)}
                      title="Retirer de la file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div>
        <Card className="border shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Tampons enregistrés</CardTitle>
            <CardDescription>
              Activez, désactivez ou supprimez les tampons existants.
            </CardDescription>
          </CardHeader>
            <CardContent>
              {stampsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonRow key={`sk-stamp-${i}`} />
                  ))}
                </div>
              ) : stamps.length === 0 ? (
                <EmptyState
                  icon={<StampIcon />}
                  title="Aucun tampon"
                  description="Ajoutez votre premier tampon via le formulaire."
                  dashed={false}
                  className="border-0 bg-transparent py-10"
                />
              ) : (
                <ul className="divide-y">
                  {stamps.map((stamp) => (
                    <li key={stamp.id} className="flex items-center gap-4 py-3">
                      <div className="h-16 w-16 shrink-0 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
                        {stamp.url ? (
                          <img
                            src={stamp.url}
                            alt={stamp.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <StampIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{stamp.name || 'Sans nom'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(() => {
                            const importedBy = stamp.createdByName || stamp.createdBy || '—';
                            const importedAt = (() => {
                              const ts = stamp.createdAt as { toDate?: () => Date } | null | undefined;
                              try {
                                const d = ts?.toDate ? ts.toDate() : null;
                                return d ? format(d, 'dd/MM/yyyy HH:mm', { locale: fr }) : '—';
                              } catch {
                                return '—';
                              }
                            })();
                            return `Importé par ${importedBy} · ${importedAt}`;
                          })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={stamp.active}
                            onCheckedChange={(checked) => handleToggleActive(stamp, checked)}
                            aria-label="Basculer l'état actif"
                          />
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {stamp.active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(stamp)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce tampon ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name && <span className="font-semibold">{deleteTarget.name}</span>} sera définitivement supprimé du stockage et de la base.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
