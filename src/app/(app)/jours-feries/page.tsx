'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, Loader2, CalendarDays, Upload } from 'lucide-react';
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

/** Top-level block: hairline header (icon + title + actions), 24 px body. */
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

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function JoursFeriesSettingsPage() {
  const { profile, loading: userLoading, canDelete } = useCurrentUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { options, loading } = useOptions('options_holidays');

  const [newDate, setNewDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sorted = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label)),
    [options],
  );

  // Calendar view: months as hairline-separated groups (planification-tab
  // rows); the next upcoming holiday is the page's one terracotta element.
  const { groups, nextId } = useMemo(() => {
    const today = startOfDay(new Date());
    let next: string | null = null;
    const byMonth = new Map<string, { month: Date | null; items: { id: string; label: string; date: Date | null; past: boolean }[] }>();
    for (const o of sorted) {
      const d = ISO_DATE.test(o.label) ? parseISO(o.label) : null;
      const date = d && isValid(d) ? d : null;
      const past = date ? isBefore(date, today) : false;
      if (date && !past && !next) next = o.id;
      const key = date ? format(date, 'yyyy-MM') : 'invalid';
      const g = byMonth.get(key) ?? { month: date ? new Date(date.getFullYear(), date.getMonth(), 1) : null, items: [] };
      g.items.push({ id: o.id, label: o.label, date, past });
      byMonth.set(key, g);
    }
    return { groups: Array.from(byMonth.entries()).map(([key, g]) => ({ key, ...g })), nextId: next };
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
    if (!newDate) return;
    setIsAdding(true);
    try {
      await addOne(newDate);
      setNewDate('');
      setAddOpen(false);
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
        toast({ variant: 'destructive', title: "Échec de l'analyse IA", description: msg });
        return;
      }
      const dates: string[] = Array.isArray(json.dates) ? json.dates : [];
      if (dates.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Aucune date détectée',
          description: "L'IA n'a trouvé aucune date dans l'image. Essayez une capture plus nette.",
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
    <div className="space-y-6">
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

      <PageHeader
        title="Jours fériés"
        subtitle="Dates pendant lesquelles les délais ne sont pas comptés (compteur hors délai)."
        count={loading ? undefined : options.length}
        actions={<Button onClick={() => setAddOpen(true)}>Ajouter un jour férié</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Section title="Calendrier" icon={<CalendarDays />}>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-14 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={<CalendarDays />}
              title="Aucune date enregistrée"
              description="Importez le calendrier marocain par défaut pour démarrer, ou ajoutez vos dates une par une."
              action={
                <Button variant="tonal" onClick={handleSeedDefaults} loading={isImporting}>
                  Importer le calendrier marocain par défaut
                </Button>
              }
              dashed={false}
            />
          ) : (
            <div className="divide-y divide-hairline">
              {groups.map((g) => (
                <section key={g.key} className="py-4 first:pt-0 last:pb-0" aria-label={g.month ? format(g.month, 'LLLL yyyy', { locale: fr }) : 'Dates invalides'}>
                  <h3 className="t-label mb-2">
                    {g.month ? capitalize(format(g.month, 'LLLL yyyy', { locale: fr })) : 'Format non reconnu'}
                  </h3>
                  <ol className="divide-y divide-hairline">
                    {g.items.map((o) => {
                      const upcoming = o.id === nextId;
                      return (
                        <li key={o.id} className="group flex items-center gap-4 py-2.5">
                          {/* Date block — the row's anchor (planification-tab). */}
                          <div
                            className={cn(
                              'flex w-14 shrink-0 flex-col items-center justify-center rounded-md py-1.5 text-center tabular-nums',
                              upcoming ? 'bg-tertiary text-tertiary-foreground shadow-rim-filled' : 'bg-surface-3 text-ink-2 shadow-rim',
                            )}
                          >
                            <span className="text-[11px] font-medium leading-none">
                              {o.date ? format(o.date, 'EEE', { locale: fr }).replace('.', '') : '—'}
                            </span>
                            <span className="font-headline text-xl font-semibold leading-tight">{o.date ? format(o.date, 'd') : '—'}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn('t-body truncate', o.past ? 'font-medium text-ink-2' : 'font-semibold text-ink')}>
                              {o.date ? capitalize(format(o.date, 'EEEE d MMMM yyyy', { locale: fr })) : o.label}
                            </p>
                            <p className="t-caption flex flex-wrap items-center gap-x-2 tabular-nums">
                              <span className="font-mono">{o.label}</span>
                              {upcoming && <span className="text-tertiary-deep">· Prochain jour férié</span>}
                              {o.past && <span>· Passé</span>}
                            </p>
                          </div>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-ink-3 opacity-0 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 motion-reduce:transition-none data-[busy=true]:opacity-100"
                              data-busy={deletingId === o.id}
                              disabled={deletingId === o.id}
                              onClick={() => handleDelete(o.id)}
                              aria-label={`Supprimer ${o.label}`}
                              title="Supprimer"
                            >
                              {deletingId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </Section>

        <Section title="Importer" icon={<Upload />} className="self-start">
          <div className="divide-y divide-hairline">
            {/* One plain picker button — no banner, no dashed panel. */}
            <div className="space-y-3 pb-5">
              <div>
                <p className="t-label">Depuis une image</p>
                <p className="t-caption mt-1">
                  Choisissez une capture d&apos;écran listant les jours fériés de l&apos;année : les dates sont extraites automatiquement. PNG, JPG, WEBP ; les doublons sont ignorés.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                loading={isScanning}
              >
                {isScanning ? 'Analyse en cours…' : 'Choisir une image'}
              </Button>
            </div>

            <div className="space-y-3 pt-5">
              <div>
                <Label htmlFor="import-dates" className="t-label">Depuis une liste</Label>
                <p className="t-caption mt-1">
                  Une date par ligne au format YYYY-MM-DD. Les doublons et formats invalides sont ignorés.
                </p>
              </div>
              <Textarea
                id="import-dates"
                rows={5}
                placeholder={'2026-01-01\n2026-05-01\n2026-07-30'}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="font-mono text-sm"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={handleSeedDefaults} disabled={isImporting}>
                  Calendrier marocain par défaut
                </Button>
                <Button variant="outline" onClick={handleImport} disabled={!importText.trim() || isImporting} loading={isImporting}>
                  Importer
                </Button>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <Dialog open={addOpen} onOpenChange={(open) => { if (!isAdding) setAddOpen(open); }}>
        <DialogContent className="lg:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter un jour férié</DialogTitle>
            <DialogDescription>La date sera exclue du compteur de délais.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-date" className="t-label">Date</Label>
            <Input
              id="new-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newDate && !isAdding) {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)} disabled={isAdding}>Annuler</Button>
            <Button type="button" onClick={handleAdd} disabled={!newDate || isAdding} loading={isAdding}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
