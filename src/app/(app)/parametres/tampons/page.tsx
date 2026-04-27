'use client';

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Stamp as StampIcon, Trash2, Upload } from 'lucide-react';
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
  const { profile, loading: userLoading } = useCurrentUser();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { stamps, loading: stampsLoading } = useStamps({ includeInactive: true });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Stamp | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const resetForm = () => {
    setFile(null);
    setName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!db || !storage) return;
    const trimmedName = name.trim();
    if (!file) {
      toast({ variant: 'destructive', title: 'Fichier manquant', description: 'Sélectionnez une image de tampon.' });
      return;
    }
    if (!trimmedName) {
      toast({ variant: 'destructive', title: 'Nom manquant', description: 'Saisissez un nom pour le tampon.' });
      return;
    }

    setIsUploading(true);
    try {
      const uuid =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const ext = extensionFromFile(file);
      const storagePath = `stamps/${uuid}.${ext}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file, { contentType: file.type || undefined });
      const url = await getDownloadURL(storageRef);

      const createdByName =
        [profile.prenom, profile.nom].filter(Boolean).join(' ').trim() ||
        profile.email ||
        '';
      await addDoc(collection(db, 'stamps'), {
        name: trimmedName,
        storagePath,
        url,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: profile.uid,
        createdByName,
      });

      toast({ title: 'Tampon ajouté', description: trimmedName });
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur lors de l\'ajout', description: err?.message || 'Erreur inconnue.' });
    } finally {
      setIsUploading(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tampons</h1>
        <p className="text-muted-foreground">
          Gérez les tampons utilisés pour signer les devis et documents générés.
        </p>
      </div>

      <div>
        <Card className="border shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Tampons enregistrés</CardTitle>
            <CardDescription>
              Activez, désactivez ou supprimez les tampons existants. L&apos;import d&apos;un nouveau tampon se fait directement depuis l&apos;aperçu PDF au moment d&apos;enregistrer un devis ou une facture.
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(stamp)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
