'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToastAction } from '@/components/ui/toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IconChip } from '@/components/ui/icon-chip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trash2, Loader2, CalendarDays, ImageIcon, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useOptions } from '@/hooks/use-options';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getDefaultRouteForRole } from '@/lib/nav-groups';
import {
  addDoc, collection, deleteDoc, doc, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { HOLIDAYS_CATALOG, getHolidayCountry } from '@/lib/holidays-catalog';
import { BRAND } from '@/lib/brand';
import { apiFetch } from '@/lib/api-fetch';
import {
  addDays, addMonths, endOfMonth, endOfWeek, format, isBefore, isSameDay,
  isSameMonth, isValid, parseISO, startOfDay, startOfMonth, startOfWeek,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useT, dateFnsLocale } from '@/i18n';
import { JoursFeriesSkeleton } from './loading';
import { useIsPhone } from '@/hooks/use-viewport-class';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const WEEKDAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

/**
 * Month grid — element-specs §17 (NN/g date input ✓ "calendar pickers for
 * events close to the present"; M3 ◦ month header + ‹ › nav, today outlined,
 * selected filled): `t-heading` month spelled out, weekday `t-label` row,
 * 7-column grid of 40 px cells, today = 1 px `primary` ring, holidays =
 * `bg-accent` fill (the accent, never terracotta — §17 must-not), weekends
 * `ink-3`, other-month days `ink-4`. Clicking a free day prefills the typed
 * date input beside it (§17: a typed input accompanies any picker). The
 * month's entries are NOT repeated under the grid — the full « Liste
 * actuelle » card follows directly (documented deviation from §17's
 * below-grid list to avoid a duplicate list on one page).
 */
function HolidayCalendar({ holidaySet, onPickDate }: { holidaySet: Set<string>; onPickDate: (iso: string) => void }) {
  const t = useT();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = useMemo(() => {
    const start = startOfWeek(month, { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);
  const today = startOfDay(new Date());
  return (
    <div className="w-fit" aria-label={t('Calendrier des jours fériés')}>
      <div className="flex items-center justify-between gap-2">
        <p className="t-heading">{capitalize(format(month, 'MMMM yyyy', { locale: dateFnsLocale() }))}</p>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label={t('Mois précédent')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label={t('Mois suivant')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-1 grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <span key={w} className="t-label flex h-8 w-10 items-center justify-center">{t(w)}</span>
        ))}
        {days.map((d) => {
          const iso = format(d, 'yyyy-MM-dd');
          const inMonth = isSameMonth(d, month);
          const isNow = isSameDay(d, today);
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          if (holidaySet.has(iso)) {
            return (
              <span
                key={iso}
                title={`${t('Jour férié')} — ${capitalize(format(d, 'EEEE d MMMM yyyy', { locale: dateFnsLocale() }))}`}
                className={cn(
                  't-body-sm flex h-10 w-10 items-center justify-center rounded-md bg-accent font-semibold tabular-nums text-accent-foreground',
                  isNow && 'ring-1 ring-primary',
                  !inMonth && 'opacity-60',
                )}
              >
                {format(d, 'd')}
              </span>
            );
          }
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPickDate(iso)}
              aria-label={`${t('Choisir le')} ${format(d, 'd MMMM yyyy', { locale: dateFnsLocale() })}`}
              className={cn(
                't-body-sm flex h-10 w-10 items-center justify-center rounded-md tabular-nums transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isNow && 'font-semibold text-ink ring-1 ring-primary',
                !inMonth ? 'text-ink-4' : weekend ? 'text-ink-3' : 'text-ink',
              )}
            >
              {format(d, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function JoursFeriesSettingsPage() {
  const t = useT();
  const { profile, loading: userLoading, canDelete } = useCurrentUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { options, loading } = useOptions('options_holidays');

  const [newDate, setNewDate] = useState('');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [importText, setImportText] = useState('');
  // Default-holiday catalog country — seeded from the brand's market so the
  // white-label deployments (MA / CA) start on the right calendar.
  const [seedCountry, setSeedCountry] = useState<string>(BRAND.market);
  const [isImporting, setIsImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sorted = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label)),
    [options],
  );

  // ISO labels as a set for the calendar's holiday fills (§17).
  const holidaySet = useMemo(() => new Set(options.map((o) => o.label)), [options]);

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

  // Mobile pass 2026-09-06 (mobile-synthesis §4): below md the pill GRID
  // becomes ONE grouped list — a sticky 40 px year header per group
  // (research §9), full-bleed rows, hairlines only.
  const isPhone = useIsPhone();
  const yearGroups = useMemo(() => {
    const groups: { year: string; rows: typeof items }[] = [];
    for (const it of items) {
      const year = it.date ? String(it.date.getFullYear()) : '—';
      const last = groups[groups.length - 1];
      if (last && last.year === year) last.rows.push(it);
      else groups.push({ year, rows: [it] });
    }
    return groups;
  }, [items]);

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
    // Inline validation next to the field (NN/g web-form design) instead of a
    // disabled button (GOV.UK: avoid disabled buttons).
    if (!newDate) {
      setAddError(t('Choisissez une date'));
      return;
    }
    if (options.some((o) => o.label === newDate)) {
      setAddError(t('Cette date est déjà dans la liste'));
      return;
    }
    setAddError('');
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

  // Undo-first delete (addendum ter E, applied 2026-09-02 on owner's
  // "implement everything"; Raskin: "never use a warning when you mean
  // undo"): a holiday is a single trivially re-creatable doc, so it is
  // removed immediately and the toast offers « Annuler », which re-creates
  // it with the same label/order — no interrupting dialog.
  const handleDelete = async (id: string) => {
    if (!db) return;
    const target = options.find((o) => o.id === id);
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'options_holidays', id));
      const d = target && ISO_DATE.test(target.label) ? parseISO(target.label) : null;
      toast({
        title: t('Jour férié supprimé'),
        description: d && isValid(d) ? capitalize(format(d, 'EEEE d MMMM yyyy', { locale: dateFnsLocale() })) : target?.label,
        action: target ? (
          <ToastAction
            altText={t('Annuler la suppression')}
            onClick={() => {
              void addDoc(collection(db, 'options_holidays'), {
                label: target.label,
                order: target.order ?? 0,
                active: target.active !== false,
                createdAt: serverTimestamp(),
              }).catch((err: any) => {
                toast({ variant: 'destructive', title: t('Erreur'), description: err.message });
              });
            }}
          >
            {t('Annuler')}
          </ToastAction>
        ) : undefined,
      });
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
        toast({ variant: 'destructive', title: t("Échec de l'analyse"), description: msg });
        return;
      }
      const dates: string[] = Array.isArray(json.dates) ? json.dates : [];
      if (dates.length === 0) {
        toast({
          variant: 'destructive',
          title: t('Aucune date détectée'),
          description: t("Aucune date n'a été trouvée dans l'image. Essayez une capture plus nette."),
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
    const country = getHolidayCountry(seedCountry);
    if (!country) return;
    setIsImporting(true);
    try {
      const existing = new Set(options.map((o) => o.label));
      const fresh = country.dates.filter((d) => !existing.has(d));
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
        title={t('Jours fériés')}
        subtitle={t('Dates pendant lesquelles les délais ne sont pas comptés (compteur hors délai).')}
        count={loading ? undefined : options.length}
      />

      {/* Card 1 — element-specs §5; inline add row is the original layout. */}
      <Card data-tour="jf-add">
        <CardHeader className="max-md:p-4 max-md:pb-2">
          <CardTitle className="t-heading">{t('Ajouter une date')}</CardTitle>
        </CardHeader>
        {/* Form — element-specs §9 (GOV.UK text input: visible label above;
            NN/g date input: typed input always allowed; NN/g web-form design:
            inline error under the field with icon + red text). The field and
            its button sit side by side as in the original. */}
        {/* Typed input + month grid side by side (§17: a typed date Input
            accompanies any picker; clicking a free day prefills the field). */}
        <CardContent className="flex flex-wrap items-start gap-x-12 gap-y-6 max-md:p-4 max-md:pt-0">
          <div className="min-w-0 flex-1 basis-64">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="new-date">{t('Date')}</Label>
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
                  className="w-[12rem]"
                />
              </div>
              {/* THE page primary (§8): `default`, verb label, never disabled. */}
              <Button onClick={handleAdd} loading={isAdding}>
                {isAdding ? t('Ajout…') : t('Ajouter')}
              </Button>
            </div>
            {addError && (
              <p id="new-date-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-status-danger-fg">
                <AlertCircle className="h-4 w-4" aria-hidden /> {addError}
              </p>
            )}
            <p className="t-caption mt-3">{t('Cliquer un jour du calendrier remplit le champ · les jours fériés existants sont en teinte')}</p>
          </div>
          <HolidayCalendar
            holidaySet={holidaySet}
            onPickDate={(iso) => { setNewDate(iso); if (addError) setAddError(''); }}
          />
        </CardContent>
      </Card>

      {/* Card 2 — image import (title without the sparkle icon: owner rule 7). */}
      <Card data-tour="jf-ai">
        <CardHeader className="max-md:p-4 max-md:pb-2">
          <CardTitle className="t-heading">{t('Importer depuis une image')}</CardTitle>
        </CardHeader>
        {/* File picker — element-specs §21 (ONE plain button, no banner, no
            dashed panel, no copy beyond a t-caption format hint). `outline`:
            not the page primary (§8). */}
        <CardContent className="flex flex-wrap items-center gap-4 max-md:p-4 max-md:pt-0">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isScanning} loading={isScanning}>
            {!isScanning && <ImageIcon className="h-4 w-4" aria-hidden />}
            {isScanning ? t('Analyse en cours…') : t('Choisir une image')}
          </Button>
          <p className="t-caption">{t("Capture listant les jours fériés de l'année · PNG, JPG, WEBP · les doublons sont ignorés")}</p>
        </CardContent>
      </Card>

      {/* Card 3 — list import. */}
      <Card data-tour="jf-bulk">
        <CardHeader className="max-md:p-4 max-md:pb-2">
          <CardTitle className="t-heading">{t('Importer des dates')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-md:p-4 max-md:pt-0">
          {/* Form — §9: label above, hint between label and field (GOV.UK:
              "a single short sentence, without full stops"), placeholder as
              a format cue only. */}
          <div className="space-y-1">
            <Label htmlFor="import-dates">{t('Dates')}</Label>
            <p className="t-caption">{t('Une date par ligne au format AAAA-MM-JJ, les doublons et formats invalides sont ignorés')}</p>
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
              `tonal` (not the page primary); the seed shortcut is `outline`.
              The country select picks which statutory calendar is seeded — it
              defaults to the brand's market (white-label). */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={seedCountry} onValueChange={setSeedCountry}>
                <SelectTrigger className="h-9 w-[160px]" aria-label={t('Pays')}>
                  <SelectValue placeholder={t('Pays')} />
                </SelectTrigger>
                <SelectContent>
                  {HOLIDAYS_CATALOG.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{t(c.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleSeedDefaults} loading={isImporting}>
                {t('Importer les jours fériés par défaut')}
              </Button>
            </div>
            <Button variant="tonal" onClick={handleImport} loading={isImporting}>
              {t('Importer')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 4 — the current list as a pill grid (original layout). */}
      <Card data-tour="jf-list">
        <CardHeader className="max-md:p-4 max-md:pb-2">
          <CardTitle className="t-heading flex items-center gap-2">
            {/* Section anchor chip (neutral — terracotta = time, 2026-09-02) — addendum 1b: one IconChip beside the section
                that anchors the page (the calendar list). */}
            <IconChip><CalendarDays /></IconChip>
            {t('Liste actuelle')}
            {/* Count pill — §11: neutral surface-3 / ink-2, tabular digits. */}
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
              {options.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="max-md:p-4 max-md:pt-0">
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
              title={t('Importer les jours fériés')}
              description={t("Aucune date n'est enregistrée : les délais sont comptés tous les jours.")}
              action={
                <Button variant="tonal" onClick={handleSeedDefaults} loading={isImporting}>
                  {t('Importer les jours fériés par défaut')}
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
            (() => {
              const renderRow = (o: (typeof items)[number], flat: boolean) => {
                const upcoming = o.id === nextId;
                return (
                  <li
                    key={o.id}
                    className={cn(
                      flat
                        ? 'flex min-h-[64px] items-center gap-3 px-4 py-2'
                        : 'flex min-h-[56px] items-center gap-3 rounded-lg bg-card px-3 py-2 shadow-rim',
                      o.past && 'text-ink-3',
                    )}
                  >
                    <div
                      className={cn(
                        'flex w-12 shrink-0 flex-col items-center justify-center rounded-md py-1 text-center',
                        // Terracotta = time (2026-09-02): solid for THE next
                        // holiday, warm tint for upcoming ones, neutral for
                        // the past — the colour only ever means "ahead".
                        upcoming
                          ? 'bg-tertiary text-tertiary-foreground shadow-rim-filled'
                          : o.past
                            ? 'bg-surface-2 text-ink-3 shadow-rim'
                            : 'bg-tertiary-bg text-tertiary-deep shadow-rim',
                      )}
                    >
                      <span className="text-[11px] font-medium leading-none">
                        {o.date ? format(o.date, 'EEE', { locale: dateFnsLocale() }).replace('.', '') : '—'}
                      </span>
                      <span className="text-lg font-semibold leading-tight tabular-nums">{o.date ? format(o.date, 'd') : '—'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('t-body truncate', o.past ? 'font-medium text-ink-3' : 'font-semibold text-ink')}>
                        {o.date ? capitalize(format(o.date, 'EEEE d MMMM yyyy', { locale: dateFnsLocale() })) : o.label}
                      </p>
                      <p className="t-caption truncate tabular-nums">
                        {upcoming ? <span className="font-medium text-tertiary-deep">{t('Prochain jour férié')}</span> : o.past ? t('Passé') : <span className="font-mono">{o.label}</span>}
                      </p>
                    </div>
                    {canDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-ink-3 hover:text-destructive max-md:h-11 max-md:w-11"
                            disabled={deletingId === o.id}
                            onClick={() => handleDelete(o.id)}
                            aria-label={`${t('Supprimer')} ${o.label}`}
                          >
                            {deletingId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('Supprimer')}</TooltipContent>
                      </Tooltip>
                    )}
                  </li>
                );
              };

              // PHONE — one grouped list: a sticky 40 px year header per group
              // (bg-surface-2 SOLID, never glass), full-bleed hairline rows.
              if (isPhone) {
                return (
                  <div className="-mx-4">
                    {yearGroups.map((g) => (
                      <section key={g.year}>
                        <h3 className="sticky top-0 z-10 flex h-10 items-center gap-2 border-y border-hairline bg-surface-2 px-4">
                          <span className="t-label">{g.year}</span>
                          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                            {g.rows.length}
                          </span>
                        </h3>
                        <ul className="divide-y divide-hairline" aria-label={`${t('Jours fériés')} ${g.year}`}>
                          {g.rows.map((o) => renderRow(o, true))}
                        </ul>
                      </section>
                    ))}
                  </div>
                );
              }

              return (
                <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3" aria-label={t('Jours fériés')}>
                  {items.map((o) => renderRow(o, false))}
                </ul>
              );
            })()
          )}
        </CardContent>
      </Card>

    </div>
  );
}
