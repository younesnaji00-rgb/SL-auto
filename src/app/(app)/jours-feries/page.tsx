'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Loader2, CalendarDays, Upload, ImageIcon, Sparkles } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useOptions } from '@/hooks/use-options';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getDefaultRouteForRole } from '@/lib/nav-groups';
import {
  addDoc, collection, deleteDoc, doc, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { MOROCCAN_HOLIDAYS_DEFAULT } from '@/lib/business-days';
import { apiFetch } from '@/lib/api-fetch';
import { useT } from '@/i18n';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function JoursFeriesSettingsPage() {
  const t = useT();
  const { profile, loading: userLoading, canDelete } = useCurrentUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { options, loading } = useOptions('options_holidays');

  const [newDate, setNewDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sorted = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label)),
    [options],
  );

  const router = useRouter();
  React.useEffect(() => {
    if (
      !userLoading &&
      profile?.role &&
      profile.role !== 'Admin' &&
      profile.role !== 'Directeur' &&
      profile.role !== 'Directeur des opérations' &&
      profile.role !== 'Directeur technique'
    ) {
      router.replace(getDefaultRouteForRole(profile.role));
    }
  }, [userLoading, profile?.role, router]);

  if (userLoading) {
    return <div className="py-12 text-sm text-muted-foreground">{t('Chargement...')}</div>;
  }
  if (profile?.role !== 'Admin' && profile?.role !== 'Directeur' && profile?.role !== 'Directeur des opérations' && profile?.role !== 'Directeur technique') {
    return null;
  }

  const addOne = async (label: string) => {
    if (!db) return;
    const clean = label.trim();
    if (!ISO_DATE.test(clean)) {
      toast({ variant: 'destructive', title: t('Format invalide'), description: t('Utilisez YYYY-MM-DD (ex: 2026-07-30).') });
      return;
    }
    if (options.some((o) => o.label === clean)) {
      toast({ variant: 'destructive', title: t('Doublon'), description: t('Cette date est déjà dans la liste.') });
      return;
    }
    const nextOrder = options.length > 0 ? Math.max(...options.map((o) => o.order ?? 0)) + 1 : 0;
    await addDoc(collection(db, 'options_holidays'), {
      label: clean,
      order: nextOrder,
      active: true,
      createdAt: serverTimestamp(),
    });
  };

  const handleAdd = async () => {
    if (!newDate) return;
    setIsAdding(true);
    try {
      await addOne(newDate);
      setNewDate('');
      toast({ title: t('Jour férié ajouté') });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: err.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'options_holidays', id));
      toast({ title: t('Jour férié supprimé') });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleImport = async () => {
    if (!db || !importText.trim()) return;
    setIsImporting(true);
    try {
      const lines = importText.split(/[\n,;]/).map((l) => l.trim()).filter(Boolean);
      const validLines = lines.filter((l) => ISO_DATE.test(l));
      const skipped = lines.length - validLines.length;
      const existing = new Set(options.map((o) => o.label));
      const fresh = validLines.filter((l) => !existing.has(l));
      if (fresh.length === 0) {
        toast({ title: t('Rien à importer'), description: t('Toutes les dates étaient déjà présentes ou invalides.') });
        return;
      }
      const batch = writeBatch(db);
      const baseOrder = options.length;
      fresh.forEach((label, i) => {
        const ref = doc(collection(db, 'options_holidays'));
        batch.set(ref, { label, order: baseOrder + i, active: true, createdAt: serverTimestamp() });
      });
      await batch.commit();
      setImportText('');
      toast({
        title: `${fresh.length} ${t('date(s) importée(s)')}`,
        description: skipped > 0 ? `${skipped} ${t('ligne(s) ignorée(s) (format invalide).')}` : undefined,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: err.message });
    } finally {
      setIsImporting(false);
    }
  };

  const fileToBase64 = (file: File): Promise<{ base64: string; contentType: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // result format: "data:image/png;base64,XXXX"
        const match = /^data:([^;]+);base64,(.+)$/.exec(result || '');
        if (!match) {
          reject(new Error(t('Lecture du fichier échouée.')));
          return;
        }
        resolve({ contentType: match[1], base64: match[2] });
      };
      reader.onerror = () => reject(reader.error || new Error(t('Erreur de lecture.')));
      reader.readAsDataURL(file);
    });

  const handleImageImport = async (file: File) => {
    if (!db) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: t('Fichier invalide'), description: t('Veuillez choisir une image.') });
      return;
    }
    setIsScanning(true);
    try {
      const { base64, contentType } = await fileToBase64(file);
      const res = await apiFetch('/api/scan-holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, contentType }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (json && json.error) || `${t('Erreur HTTP')} ${res.status}`;
        toast({ variant: 'destructive', title: t("Échec de l'analyse IA"), description: msg });
        return;
      }
      const dates: string[] = Array.isArray(json.dates) ? json.dates : [];
      if (dates.length === 0) {
        toast({
          variant: 'destructive',
          title: t('Aucune date détectée'),
          description: t("L'IA n'a trouvé aucune date dans l'image. Essayez une capture plus nette."),
        });
        return;
      }
      const existing = new Set(options.map((o) => o.label));
      const fresh = dates.filter((d) => ISO_DATE.test(d) && !existing.has(d));
      const skipped = dates.length - fresh.length;
      if (fresh.length === 0) {
        toast({
          title: t('Rien à ajouter'),
          description: `${dates.length} ${t('date(s) détectée(s), toutes déjà présentes.')}`,
        });
        return;
      }
      const batch = writeBatch(db);
      const baseOrder = options.length;
      fresh.forEach((label, i) => {
        const ref = doc(collection(db, 'options_holidays'));
        batch.set(ref, { label, order: baseOrder + i, active: true, createdAt: serverTimestamp() });
      });
      await batch.commit();
      toast({
        title: `${fresh.length} ${t('date(s) ajoutée(s)')}`,
        description:
          skipped > 0 ? `${skipped} ${t('ignorée(s) (déjà présente(s)).')}` : undefined,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: t('Erreur'),
        description: err?.message || t("Impossible d'analyser l'image."),
      });
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSeedDefaults = async () => {
    if (!db) return;
    setIsImporting(true);
    try {
      const existing = new Set(options.map((o) => o.label));
      const fresh = Array.from(MOROCCAN_HOLIDAYS_DEFAULT).filter((d) => !existing.has(d));
      if (fresh.length === 0) {
        toast({ title: t('Liste déjà complète') });
        return;
      }
      const batch = writeBatch(db);
      const baseOrder = options.length;
      fresh.forEach((label, i) => {
        const ref = doc(collection(db, 'options_holidays'));
        batch.set(ref, { label, order: baseOrder + i, active: true, createdAt: serverTimestamp() });
      });
      await batch.commit();
      toast({ title: `${fresh.length} ${t('jour(s) férié(s) par défaut importé(s)')}` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: err.message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" /> {t('Jours fériés')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('Dates pendant lesquelles les délais ne sont pas comptés (compteur hors délai). Format YYYY-MM-DD.')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Ajouter une date')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-date">{t('Date')}</Label>
            <Input
              id="new-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-9"
            />
          </div>
          <Button onClick={handleAdd} disabled={!newDate || isAdding} className="gap-1.5">
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('Ajouter')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('Importer depuis une image (IA)')}
          </CardTitle>
          <CardDescription>
            {t("Choisissez une capture d'écran listant les jours fériés de l'année. L'IA extrait automatiquement les dates et les ajoute à la liste.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImageImport(f);
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="gap-1.5"
          >
            {isScanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {isScanning ? t('Analyse en cours...') : t('Choisir une image')}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t('Formats: PNG, JPG, WEBP. Les doublons sont ignorés.')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Importer des dates')}</CardTitle>
          <CardDescription>
            {t('Une date par ligne au format YYYY-MM-DD. Les doublons et formats invalides sont ignorés.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            rows={5}
            placeholder={'2026-01-01\n2026-05-01\n2026-07-30'}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="font-mono text-sm"
          />
          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={isImporting} className="gap-1.5">
              {t('Importer le calendrier marocain par défaut')}
            </Button>
            <Button onClick={handleImport} disabled={!importText.trim() || isImporting} className="gap-1.5">
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {t('Importer')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {t('Liste actuelle')}
            <Badge variant="secondary" className="text-[10px] font-mono">{options.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('Chargement...')}</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {t('Aucune date enregistrée. Utilisez «Importer le calendrier marocain par défaut» pour démarrer.')}
            </p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {sorted.map((o) => (
                <li key={o.id} className="flex items-center justify-between px-3 py-1.5 rounded-md border bg-card">
                  <span className="font-mono text-sm tabular-nums">{o.label}</span>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      disabled={deletingId === o.id}
                      onClick={() => handleDelete(o.id)}
                      title={t('Supprimer')}
                    >
                      {deletingId === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
