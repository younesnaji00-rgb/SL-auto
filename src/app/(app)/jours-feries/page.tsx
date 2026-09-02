'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IconChip } from '@/components/ui/icon-chip';
import { Trash2, Loader2, CalendarDays, ImageIcon, AlertCircle } from 'lucide-react';
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
import { format, isBefore, isValid, parseISO, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { JoursFeriesSkeleton } from './loading';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function JoursFeriesSettingsPage() {
  const { profile, loading: userLoading, canDelete } = useCurrentUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { options, loading } = useOptions('options_holidays');

  const [newDate, setNewDate] = useState('');
  const [addError, setAddError] = useState('');
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

  // Parse each ISO label once: real Date, `past` flag, and the id of the next
  // upcoming holiday (the page's one third-colour element — §4 "next event").
  // Items are sorted by date (unparseable labels last).
  const { items, nextId } = useMemo(() => {
    const today = startOfDay(new Date());
    const parsed = sorted.map((o) => {
      const d = ISO_DATE.test(o.label) ? parseISO(o.label) : null;
      const date = d && isValid(d) ? d : null;
      return { id: o.id, label: o.label, date, past: date ? isBefore(date, today) : false };
    });
    parsed.sort((a, b) => {
      if (a.date && b.date) return a.date.getTime() - b.date.getTime();
      if (a.date) return -1;
      if (b.date) return 1;
      return a.label.localeCompare(b.label);
    });
    const next = parsed.find((p) => p.date && !p.past)?.id ?? null;
    return { items: parsed, nextId: next };
  }, [sorted]);

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
    return <JoursFeriesSkeleton />;
  }
  if (profile?.role !== 'Admin' && profile?.role !== 'Directeur' && profile?.role !== 'Directeur des opérations' && profile?.role !== 'Directeur technique') {
    return null;
  }

  const addOne = async (label: string) => {
    if (!db) return;
    const clean = label.trim();
    if (!ISO_DATE.test(clean)) {
      toast({ variant: 'destructive', title: 'Format invalide', description: 'Utilisez YYYY-MM-DD (ex: 2026-07-30).' });
      return;
    }
    if (options.some((o) => o.label === clean)) {
      toast({ variant: 'destructive', title: 'Doublon', description: 'Cette date est déjà dans la liste.' });
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
    // Inline validation next to the field (NN/g web-form design) instead of a
    // disabled button (GOV.UK: avoid disabled buttons).
    if (!newDate) {
      setAddError('Choisissez une date');
      return;
    }
    if (options.some((o) => o.label === newDate)) {
      setAddError('Cette date est déjà dans la liste');
      return;
    }
    setAddError('');
    setIsAdding(true);
    try {
      await addOne(newDate);
      setNewDate('');
      toast({ title: 'Jour férié ajouté' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'options_holidays', id));
      toast({ title: 'Jour férié supprimé' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
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
        toast({ title: 'Rien à importer', description: 'Toutes les dates étaient déjà présentes ou invalides.' });
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
        title: `${fresh.length} date(s) importée(s)`,
        description: skipped > 0 ? `${skipped} ligne(s) ignorée(s) (format invalide).` : undefined,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
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
          reject(new Error('Lecture du fichier échouée.'));
          return;
        }
        resolve({ contentType: match[1], base64: match[2] });
      };
      reader.onerror = () => reject(reader.error || new Error('Erreur de lecture.'));
      reader.readAsDataURL(file);
    });

  const handleImageImport = async (file: File) => {
    if (!db) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Fichier invalide', description: 'Veuillez choisir une image.' });
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
        const msg = (json && json.error) || `Erreur HTTP ${res.status}`;
        toast({ variant: 'destructive', title: "Échec de l'analyse", description: msg });
        return;
      }
      const dates: string[] = Array.isArray(json.dates) ? json.dates : [];
      if (dates.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Aucune date détectée',
          description: "Aucune date n'a été trouvée dans l'image. Essayez une capture plus nette.",
        });
        return;
      }
      const existing = new Set(options.map((o) => o.label));
      const fresh = dates.filter((d) => ISO_DATE.test(d) && !existing.has(d));
      const skipped = dates.length - fresh.length;
      if (fresh.length === 0) {
        toast({
          title: 'Rien à ajouter',
          description: `${dates.length} date(s) détectée(s), toutes déjà présentes.`,
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
        title: `${fresh.length} date(s) ajoutée(s)`,
        description:
          skipped > 0 ? `${skipped} ignorée(s) (déjà présente(s)).` : undefined,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err?.message || "Impossible d'analyser l'image.",
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
        toast({ title: 'Liste déjà complète' });
        return;
      }
      const batch = writeBatch(db);
      const baseOrder = options.length;
      fresh.forEach((label, i) => {
        const ref = doc(collection(db, 'options_holidays'));
        batch.set(ref, { label, order: baseOrder + i, active: true, createdAt: serverTimestamp() });
      });
      await batch.commit();
      toast({ title: `${fresh.length} jour(s) férié(s) par défaut importé(s)` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8">
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

      {/* Page header — element-specs §1 (Polaris Page: plural object, count
          pill). No header action: « Ajouter » in the first card is the page
          primary (GOV.UK: one default button per page). */}
      <PageHeader
        title="Jours fériés"
        subtitle="Dates pendant lesquelles les délais ne sont pas comptés (compteur hors délai)."
        count={loading ? undefined : options.length}
      />

      {/* Card 1 — element-specs §5; inline add row is the original layout. */}
      <Card>
        <CardHeader>
          <CardTitle className="t-heading">Ajouter une date</CardTitle>
        </CardHeader>
        {/* Form — element-specs §9 (GOV.UK text input: visible label above;
            NN/g date input: typed input always allowed; NN/g web-form design:
            inline error under the field with icon + red text). The field and
            its button sit side by side as in the original. */}
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1 basis-56 space-y-1">
              <Label htmlFor="new-date">Date</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => { setNewDate(e.target.value); if (addError) setAddError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isAdding) {
                    e.preventDefault();
                    void handleAdd();
                  }
                }}
                aria-invalid={addError ? true : undefined}
                aria-describedby={addError ? 'new-date-error' : undefined}
                className="max-w-[12rem]"
              />
            </div>
            {/* THE page primary (§8): `default`, verb label, never disabled. */}
            <Button onClick={handleAdd} loading={isAdding}>
              {isAdding ? 'Ajout…' : 'Ajouter'}
            </Button>
          </div>
          {addError && (
            <p id="new-date-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-status-danger-fg">
              <AlertCircle className="h-4 w-4" aria-hidden /> {addError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — image import (title without the sparkle icon: owner rule 7). */}
      <Card>
        <CardHeader>
          <CardTitle className="t-heading">Importer depuis une image</CardTitle>
        </CardHeader>
        {/* File picker — element-specs §21 (ONE plain button, no banner, no
            dashed panel, no copy beyond a t-caption format hint). `outline`:
            not the page primary (§8). */}
        <CardContent className="flex flex-wrap items-center gap-4">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isScanning} loading={isScanning}>
            {!isScanning && <ImageIcon className="h-4 w-4" aria-hidden />}
            {isScanning ? 'Analyse en cours…' : 'Choisir une image'}
          </Button>
          <p className="t-caption">Capture listant les jours fériés de l&apos;année · PNG, JPG, WEBP · les doublons sont ignorés</p>
        </CardContent>
      </Card>

      {/* Card 3 — list import. */}
      <Card>
        <CardHeader>
          <CardTitle className="t-heading">Importer des dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Form — §9: label above, hint between label and field (GOV.UK:
              "a single short sentence, without full stops"), placeholder as
              a format cue only. */}
          <div className="space-y-1">
            <Label htmlFor="import-dates">Dates</Label>
            <p className="t-caption">Une date par ligne au format AAAA-MM-JJ, les doublons et formats invalides sont ignorés</p>
            <Textarea
              id="import-dates"
              rows={5}
              placeholder={'2026-01-01\n2026-05-01\n2026-07-30'}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          {/* Emphasis ladder (§8, Material 3): the section's own action is
              `tonal` (not the page primary); the seed shortcut is `outline`. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" onClick={handleSeedDefaults} loading={isImporting}>
              Importer le calendrier marocain par défaut
            </Button>
            <Button variant="tonal" onClick={handleImport} loading={isImporting}>
              Importer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 4 — the current list as a pill grid (original layout). */}
      <Card>
        <CardHeader>
          <CardTitle className="t-heading flex items-center gap-2">
            {/* Warm anchor chip — addendum 1b: one IconChip beside the section
                that anchors the page (the calendar list). */}
            <IconChip><CalendarDays /></IconChip>
            Liste actuelle
            {/* Count pill — §11: neutral surface-3 / ink-2, tabular digits. */}
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
              {options.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex h-14 items-center gap-3 rounded-lg border border-hairline px-3">
                  <Skeleton className="h-10 w-12 rounded-md" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            // Empty state — element-specs §12 (NN/g: state + reason + one
            // pathway; Polaris: verb-led heading, ONE action, `tonal` in a card).
            <EmptyState
              icon={<CalendarDays />}
              title="Importer le calendrier marocain"
              description="Aucune date n'est enregistrée : les délais sont comptés tous les jours."
              action={
                <Button variant="tonal" onClick={handleSeedDefaults} loading={isImporting}>
                  Importer le calendrier marocain par défaut
                </Button>
              }
              dashed={false}
            />
          ) : (
            // Pills = §4 mini rows (Material 3 lists: leading element + label +
            // trailing icon button; GOV.UK summary list: the row's border ties
            // it to its action): date block as the warm anchor (addendum 1a:
            // tertiary tint + rim on every pill; the NEXT holiday alone stays
            // solid tertiary), the full French date, delete `ghost`. Day number in
            // Inter 600 (numbers never in Outfit), weekday ≥ 11 px.
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3" aria-label="Jours fériés">
              {items.map((o) => {
                const upcoming = o.id === nextId;
                return (
                  <li
                    key={o.id}
                    className={cn(
                      'flex min-h-[56px] items-center gap-3 rounded-lg bg-card px-3 py-2 shadow-rim',
                      o.past && 'text-ink-3',
                    )}
                  >
                    <div
                      className={cn(
                        'flex w-12 shrink-0 flex-col items-center justify-center rounded-md py-1 text-center',
                        upcoming
                          ? 'bg-tertiary text-tertiary-foreground shadow-rim-filled'
                          : 'bg-tertiary-bg text-tertiary-deep shadow-rim',
                      )}
                    >
                      <span className="text-[11px] font-medium leading-none">
                        {o.date ? format(o.date, 'EEE', { locale: fr }).replace('.', '') : '—'}
                      </span>
                      <span className="text-lg font-semibold leading-tight tabular-nums">{o.date ? format(o.date, 'd') : '—'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('t-body truncate', o.past ? 'font-medium text-ink-3' : 'font-semibold text-ink')}>
                        {o.date ? capitalize(format(o.date, 'EEEE d MMMM yyyy', { locale: fr })) : o.label}
                      </p>
                      <p className="t-caption truncate tabular-nums">
                        {upcoming ? 'Prochain jour férié' : o.past ? 'Passé' : <span className="font-mono">{o.label}</span>}
                      </p>
                    </div>
                    {canDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-ink-3 hover:text-destructive"
                            disabled={deletingId === o.id}
                            onClick={() => handleDelete(o.id)}
                            aria-label={`Supprimer ${o.label}`}
                          >
                            {deletingId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Supprimer</TooltipContent>
                      </Tooltip>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
