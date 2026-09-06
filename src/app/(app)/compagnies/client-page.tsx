'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Building2, ChevronRight, FileText, FolderOpen, Inbox, Plus, Upload } from 'lucide-react';
import { useCompagnies, type Compagnie } from '@/hooks/use-compagnies';
import { useCurrentUser } from '@/hooks/use-current-user';
import { hasPermission } from '@/lib/permissions';
import { useDossiers } from '@/hooks/use-dossiers';
import { useStorage, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter } from '@/components/date-range-filter';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { NAV_ITEMS, titleForRoute } from '@/lib/nav-groups';
import { format, parseISO, isValid } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { IconChip } from '@/components/ui/icon-chip';
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';
import { isClosedStatus } from '@/lib/status-machine';
import { cn } from '@/lib/utils';
import { CreateDossierDialog } from '@/components/dossiers/create-dossier-dialog';
// Mobile pass 2026-09-06 (mobile-synthesis §4): the compagnie CARDS stay (they
// are heterogeneous browsing tiles — NN/g) but go 1-up with 16 px padding; the
// « Portefeuille dossiers » table is a RECORD QUEUE, so below md it becomes a
// `RecordList` (research §2 must-not: a frozen table is for FIGURE comparison,
// "never for record queues").
import { useIsPhone } from '@/hooks/use-viewport-class';
import { RecordList, RecordRow, RecordListSkeleton } from '@/components/ui/record-row';
import { LoadMore, useRenderCap } from '@/components/ui/load-more';
import { usePhoneChrome } from '@/components/layout/page-chrome';

// ── Status chip (element-specs §11: Carbon tag / dataviz — status colours
//    reserved, always with a label; one helper per domain). Local stand-in for
//    `lib/status-colors` (hand-picked hues, shared file outside this page). ──
function statusVariant(status: string): 'info' | 'warning' | 'success' | 'neutral' {
  const s = (status || '').trim();
  if (s.startsWith('Planification')) return 'info';
  if (s === 'Chiffrage en cours') return 'warning';
  if (/accord/i.test(s)) return 'success';
  return 'neutral';
}

function isEnCours(statut?: string): boolean {
  const s = statut?.toLowerCase() ?? '';
  return s.includes('cours') || s.includes('programmée');
}

/** `yyyy-MM-dd` (the persisted filter value) → `dd/MM/yyyy` for captions. */
function fmtIsoDay(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'dd/MM/yyyy') : iso;
}

/**
 * Logo tile — also the upload control (element-specs §21: the picker is ONE
 * plain button, no banner, no dashed panel; the hover veil is the only cue).
 * `size` = card tile (48 px) or the detail header tile (112 px, as at 3d5629a).
 */
function LogoTile({
  compagnie,
  failed,
  onFail,
  onUpload,
  size = 'sm',
  className,
}: {
  compagnie: Compagnie;
  failed: boolean;
  onFail: () => void;
  onUpload: (file: File) => void;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const t = useT();
  const pick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (file) onUpload(file);
    };
    input.click();
  };
  const lg = size === 'lg';
  return (
    <button
      type="button"
      data-tour="cie-logo"
      onClick={(e) => {
        e.stopPropagation();
        pick();
      }}
      title={t('Cliquez pour importer un logo')}
      aria-label={`${t('Importer le logo de')} ${compagnie.nom}`}
      className={cn(
        'group/logo relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 shadow-rim transition-colors hover:bg-surface-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        lg ? 'h-28 w-28' : 'h-12 w-12',
        className,
      )}
    >
      {compagnie.logoUrl && !failed ? (
        <img
          src={compagnie.logoUrl}
          alt={compagnie.nom}
          className={cn('object-contain', lg ? 'h-full w-full p-2' : 'h-8 w-8')}
          onError={onFail}
        />
      ) : (
        <Building2 className={cn('text-ink-4', lg ? 'h-14 w-14' : 'h-6 w-6')} aria-hidden />
      )}
      <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-[color:var(--scrim)] text-on-ink opacity-0 transition-opacity group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100">
        <Upload className={lg ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden />
      </span>
    </button>
  );
}

// ── Grid skeleton (element-specs §15: mirror the final layout) — the same
//    card anatomy: logo tile + chevron row, title, description, affordance pill. ──
function CompagnieCardSkeleton() {
  return (
    <div className="rounded-xl border border-hairline border-l-4 border-l-surface-4 bg-card p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <Skeleton className="h-5 w-5" />
      </div>
      <Skeleton className="mt-4 h-6 w-40" />
      <Skeleton className="mt-2 h-3 w-44" />
      <Skeleton className="mt-4 h-7 w-36 rounded-full" />
    </div>
  );
}

export default function CompagniesClientPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get('selected');

  const { compagnies: allCompagnies, loading: loadingCompagnies } = useCompagnies();
  const { profile } = useCurrentUser();
  // Filter out compagnies the current user has been denied access to via
  // the per-user permissions. Applied across the entire page (cards grid,
  // detail view, etc.) — `compagnies` below is the post-filter list.
  const compagnies = useMemo(
    () => allCompagnies.filter((c) => hasPermission(profile, `/compagnies#${c.id}`, true)),
    [allCompagnies, profile],
  );
  const storage = useStorage();
  const db = useFirestore();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());
  const markLogoFailed = (id: string) =>
    setLogoErrors((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  const handleLogoUpload = async (compagnieId: string, file: File) => {
    if (!storage || !db) return;
    try {
      const storagePath = `compagnies/${compagnieId}/logo/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'compagnies', compagnieId), { logoUrl: url });
      toast({ title: t('Logo mis à jour') });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: e.message });
    }
  };

  const selectedCompagnie = useMemo(() =>
    compagnies.find(c => c.id === selectedId),
    [compagnies, selectedId]
  );

  const { dossiers: allDossiers, loading: loadingDossiers } = useDossiers(selectedCompagnie?.nom ? [selectedCompagnie.nom] : undefined);
  const filterDefaults = { dateFrom: '', dateTo: '' };
  const [filters, setFilters] = usePersistedFilters('compagnies', filterDefaults);
  const { dateFrom, dateTo } = filters;

  const dossiers = useMemo(() => {
    let results = [...allDossiers];
    if (dateFrom) {
      const from = new Date(dateFrom);
      results = results.filter(d => {
        if (!d.dateRequete) return false;
        const date = d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete);
        return date >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(d => {
        if (!d.dateRequete) return false;
        const date = d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete);
        return date <= to;
      });
    }
    return results;
  }, [allDossiers, dateFrom, dateTo]);

  const stats = useMemo(() => {
    if (!dossiers) return { total: 0, nouveau: 0, enCours: 0, clos: 0 };
    return {
      total: dossiers.length,
      nouveau: dossiers.filter(d => d.statut === 'Nouveau' || d.statut === 'Création dossier').length,
      enCours: dossiers.filter(d => isEnCours(d.statut)).length,
      clos: dossiers.filter(d => isClosedStatus(d.statut || '')).length,
    };
  }, [dossiers]);

  /* ------------------------------------------------------------------ */
  /* Phone (hooks before the early returns below)                        */
  /* ------------------------------------------------------------------ */
  const isPhone = useIsPhone();
  const cap = useRenderCap(dossiers, 25, { signature: `${selectedId ?? ''}|${dateFrom}|${dateTo}` });
  // On a compagnie's dashboard the phone top bar needs its own up-link (the
  // route is `/compagnies?selected=…`, so the crumb parent cannot infer it)
  // and the page primary (« Nouveau dossier » lives in `actions`, ≥ md only).
  usePhoneChrome(
    React.useMemo(
      () =>
        selectedCompagnie
          ? {
              upHref: '/compagnies',
              upLabel: 'Compagnies',
              primaryAction: { label: t('Nouveau dossier'), icon: <Plus className="h-5 w-5" />, onClick: () => setCreateOpen(true), dataTour: 'cie-new' },
            }
          : null,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [selectedCompagnie?.id],
    ),
  );

  const nav = NAV_ITEMS.find((i) => i.href === '/compagnies');
  const pageTitle = t(titleForRoute('/compagnies') ?? 'Compagnies');
  const pageSubtitle = nav?.subtitle ? t(nav.subtitle) : undefined;

  if (loadingCompagnies) {
    // Same anatomy as compagnies/loading.tsx (header + card grid).
    return (
      <div className="space-y-8" aria-busy="true" aria-live="polite">
        <PageHeader title={pageTitle} subtitle={pageSubtitle} noAutoFocus />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CompagnieCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!selectedCompagnie) {
    return (
      <div className="space-y-8">
        {/* Page header (element-specs §1: Polaris Page — plural object as the
            title, count pill; no page primary: compagnies are seeded, not
            created here). Title and subtitle come from nav-groups. */}
        <PageHeader title={pageTitle} subtitle={pageSubtitle} count={compagnies.length} />

        {compagnies.length === 0 ? (
          // Empty state (§12): state + reason; no action the reader can take
          // (access is granted by an admin on /utilisateurs).
          <EmptyState
            icon={<Building2 />}
            title={t('Aucune compagnie accessible')}
            description={t("Aucune compagnie partenaire n'est visible avec vos permissions actuelles.")}
            dashed={false}
          />
        ) : (
          // Card grid as at 3d5629a (element-specs §5: Material 3 — the container
          // is the only required element, whole card clickable when it links;
          // NN/g cards — heterogeneous browsing → cards; Carbon tile — no
          // decorative shadow, do not mix variants in a group). Anatomy: 4 px
          // left edge in the company's own colour (per-company DATA, not a
          // design hue), faded watermark, logo tile + chevron row, name as the
          // card title, one-line description, "Gérer les sinistres" affordance.
          // 1-up with a 16 px gutter on phones (density §7); the card's own
          // padding drops from 24 to 16 below md.
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3" aria-label={t('Compagnies partenaires')} data-tour="cie-grid">
            {compagnies.map((c) => (
              <li key={c.id} className="min-w-0">
                <Card
                  role="link"
                  tabIndex={0}
                  aria-label={`${t('Ouvrir')} ${c.nom}`}
                  className="group relative cursor-pointer overflow-hidden border-l-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ borderLeftColor: c.couleur }}
                  onClick={() => router.push(`/compagnies?selected=${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/compagnies?selected=${c.id}`);
                    }
                  }}
                >
                  {/* Decorative watermark: ink-4 at low opacity (never a hue). */}
                  <div className="pointer-events-none absolute right-0 top-0 p-4 text-ink-4 opacity-20 transition-opacity group-hover:opacity-40 motion-reduce:transition-none" aria-hidden>
                    <Building2 className="h-20 w-20" />
                  </div>
                  <CardHeader className="gap-4 space-y-0 pb-4 max-md:p-4 max-md:pb-3">
                    <div className="flex items-center justify-between">
                      <LogoTile
                        compagnie={c}
                        failed={logoErrors.has(c.id)}
                        onFail={() => markLogoFailed(c.id)}
                        onUpload={(file) => handleLogoUpload(c.id, file)}
                      />
                      <ChevronRight className="h-5 w-5 shrink-0 text-ink-4 transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-ink motion-reduce:transition-none" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      {/* Card title = t-title (20/600 Outfit — a title, not a number). */}
                      <h2 className="t-title truncate">{c.nom}</h2>
                      <CardDescription className="t-caption mt-1">{t("Visualiser l'activité globale")}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="max-md:px-4 max-md:pb-4">
                    {/* Affordance pill (§11 count-pill surface + the light rim
                        on a raised pill): the card itself is the link. */}
                    <span className="t-caption inline-flex w-fit items-center gap-2 rounded-full bg-surface-3 px-3 py-1.5 font-medium text-ink-2 shadow-rim">
                      <FileText className="h-3 w-3" aria-hidden />
                      {t('Gérer les sinistres')}
                    </span>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Stat tiles (element-specs §6): four figures on neutral paper — no featured
  // tile in a KPI row (Few: bright colour only for an exception; a zero is ink).
  const statTiles = [
    { label: 'Total dossiers', val: stats.total },
    { label: 'Nouveaux', val: stats.nouveau },
    { label: 'En cours', val: stats.enCours },
    { label: 'Terminés', val: stats.clos },
  ];
  // Real range printed under each figure (§6 / §23: never "· période").
  const rangeCaption = dateFrom || dateTo
    ? `${t('du')} ${dateFrom ? fmtIsoDay(dateFrom) : '—'} ${t('au')} ${dateTo ? fmtIsoDay(dateTo) : '—'}`
    : t('toutes périodes');

  return (
    <div className="space-y-8">
      {/* Detail header as at 3d5629a: a band closed by a hairline holding the
          112 px logo tile and the compact PageHeader (element-specs §1:
          breadcrumb/back to the parent, title, one filled primary at the right
          end of `actions`, the other action `outline`). The 6×1 colour bar is
          the company's own colour (data, not a design hue). */}
      <div className="flex items-start gap-4 border-b border-hairline pb-6 max-md:items-center max-md:gap-3 max-md:pb-4">
        <LogoTile
          compagnie={selectedCompagnie}
          failed={logoErrors.has(selectedCompagnie.id)}
          onFail={() => markLogoFailed(selectedCompagnie.id)}
          onUpload={(file) => handleLogoUpload(selectedCompagnie.id, file)}
          size="lg"
          className="max-md:h-16 max-md:w-16"
        />
        {/* Below md the PageHeader paints nothing (the bar has the name), so
            the identity line lives here. */}
        <div className="min-w-0 flex-1 md:hidden">
          <p className="t-title truncate">{selectedCompagnie.nom}</p>
          <p className="t-caption truncate">{t('Tableau de bord opérationnel')}</p>
        </div>
        <PageHeader
          className="min-w-0 flex-1 max-md:hidden"
          size="compact"
          backHref="/compagnies"
          backLabel={pageTitle}
          title={selectedCompagnie.nom}
          icon={<span className="block h-6 w-1 rounded-full" style={{ backgroundColor: selectedCompagnie.couleur }} aria-hidden />}
          subtitle={t('Tableau de bord opérationnel')}
          actions={
            <>
              <Button variant="outline" asChild>
                <Link href="/dossiers">{t('Tous les dossiers')}</Link>
              </Button>
              <Button data-tour="cie-new" onClick={() => setCreateOpen(true)}>
                <Plus aria-hidden />
                {t('Nouveau dossier')}
              </Button>
            </>
          }
        />
      </div>

      {/* KPI row (element-specs §6: dataviz stat-tile contract — label sentence
          case, value in the UI sans semibold with proportional digits, caption
          with the real range; Carbon tile — padding 16, no decorative shadow;
          NN/g dashboards — at-a-glance). 36 px headline tier, Inter, never Outfit. */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4" data-tour="cie-stats">
        {statTiles.map((stat) => (
          <Card key={stat.label} className="min-w-0 p-4">
            <p className="t-label">{t(stat.label)}</p>
            <div className="mt-2 text-[36px] font-semibold leading-none text-ink">
              {loadingDossiers ? <Skeleton className="h-9 w-12" /> : stat.val}
            </div>
            <p className="t-caption mt-2 truncate">{rangeCaption}</p>
          </Card>
        ))}
      </div>

      {/* Portfolio card (element-specs §5: Material 3 — filter controls sit in
          the card header, outside the collection; one frame around the table,
          no second frame). Hairline header row: t-heading + caption + the
          date-range filter; the table below follows §3. */}
      <Card
        role="region"
        aria-label={t('Portefeuille dossiers')}
        className="overflow-hidden max-md:border-0 max-md:bg-transparent max-md:shadow-none"
        data-tour="cie-table"
      >
        <header className="flex min-h-[48px] flex-wrap items-center justify-between gap-4 border-b border-hairline px-6 py-4 max-md:gap-3 max-md:border-0 max-md:px-0 max-md:py-0">
          {/* Section anchor (neutral since the time ruling; addendum 2026-09-02 §1b: ONE small IconChip beside
              the section title that anchors the page — terracotta as the
              second voice; never on actions or status). Decorative. */}
          <div className="flex min-w-0 items-center gap-3">
            <IconChip><FolderOpen /></IconChip>
            <div className="min-w-0">
              <h2 className="t-heading truncate">{t('Portefeuille dossiers')}</h2>
              <p className="t-caption truncate">{t('Extraction en temps réel des missions')} {selectedCompagnie.nom}.</p>
            </div>
          </div>
          {/* `DateRangeFilter` renders its own native two-field form below md
              (a popover calendar is a fine-pointer control). */}
          <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={v => setFilters({ dateFrom: v })} onDateToChange={v => setFilters({ dateTo: v })} />
        </header>

        {/* PHONE — the portfolio is a record queue, so it becomes a row list
            (research §2: a frozen table is for figure comparison, never for a
            record queue): réf + date · assuré · matricule · statut. */}
        {isPhone && (
          <div className="mt-4 md:hidden">
            {loadingDossiers ? (
              <RecordListSkeleton count={6} lines={3} ariaLabel={t('Chargement des dossiers')} />
            ) : dossiers.length === 0 ? (
              <EmptyState
                icon={<Inbox />}
                title={dateFrom || dateTo ? t('Aucun dossier sur cette période') : `${t('Aucun dossier pour')} ${selectedCompagnie.nom}`}
                description={
                  dateFrom || dateTo
                    ? `${t('Aucun dossier')} ${selectedCompagnie.nom} ${rangeCaption}.`
                    : t("Aucun dossier n'est encore associé à cette compagnie.")
                }
                action={
                  dateFrom || dateTo ? (
                    <Button variant="tonal" onClick={() => setFilters({ dateFrom: '', dateTo: '' })}>{t('Effacer la période')}</Button>
                  ) : (
                    <Button variant="tonal" onClick={() => setCreateOpen(true)}>{t('Créer un dossier')}</Button>
                  )
                }
                className="bg-transparent"
              />
            ) : (
              <>
                <RecordList ariaLabel={`${t('Dossiers')} ${selectedCompagnie.nom}`}>
                  {cap.rows.map((d: any) => {
                    const assure = typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim();
                    const requete = d.dateRequete ? (d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete)) : null;
                    return (
                      <RecordRow
                        key={d.id}
                        recordId={d.id}
                        id={d.refExpert || <span className="font-sans font-normal text-ink-4">{t('Sans réf.')}</span>}
                        figure={requete && !Number.isNaN(requete.getTime()) ? <span className="tabular-nums">{format(requete, 'dd/MM/yyyy')}</span> : null}
                        primary={assure || t('Assuré non renseigné')}
                        secondary={d.matricule || undefined}
                        line3={<Badge variant={statusVariant(d.statut || 'Nouveau')}>{t(d.statut || 'Nouveau')}</Badge>}
                        href={`/dossiers/${d.id}`}
                        ariaLabel={`${t('Ouvrir le dossier')} ${d.refExpert || ''}`.trim()}
                      />
                    );
                  })}
                </RecordList>
                <LoadMore
                  shown={cap.rows.length}
                  total={cap.total}
                  step={25}
                  hasMore={cap.hasMore}
                  onMore={cap.showMore}
                  noun={t('dossier')}
                  nounPlural={t('dossiers')}
                />
              </>
            )}
          </div>
        )}
        {/* Data table (§3: Polaris — text left, headers aligned with their
            data, first column fixed when the table overflows; Carbon — 44 px
            rows, skeleton rows; NN/g — row is the link, chevron at the row
            end, sticky header, hover tint). Refs and plates in t-mono. */}
        {!isPhone && (
        <Table regionLabel={`${t('Dossiers')} ${selectedCompagnie.nom}`}>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-[2] min-w-[9rem] border-r border-hairline bg-card">{t('Réf. expert')}</TableHead>
              <TableHead>{t('Assuré')}</TableHead>
              <TableHead>{t('Matricule')}</TableHead>
              <TableHead>{t('Statut')}</TableHead>
              <TableHead>{t('Création')}</TableHead>
              <TableHead className="w-12 text-right"><span className="sr-only">{t('Ouvrir')}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingDossiers ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={6} className="p-0">
                    <SkeletonRow />
                  </TableCell>
                </TableRow>
              ))
            ) : dossiers.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="whitespace-normal p-0">
                  {/* Empty state (§12): state + reason + ONE `tonal` action —
                      clear the period when one is set, else create the first
                      dossier (the header's filled button stays the page primary). */}
                  <EmptyState
                    icon={<Inbox />}
                    title={dateFrom || dateTo ? t('Aucun dossier sur cette période') : `${t('Aucun dossier pour')} ${selectedCompagnie.nom}`}
                    description={
                      dateFrom || dateTo
                        ? `${t('Aucun dossier')} ${selectedCompagnie.nom} ${rangeCaption}.`
                        : t("Aucun dossier n'est encore associé à cette compagnie.")
                    }
                    action={
                      dateFrom || dateTo ? (
                        <Button variant="tonal" onClick={() => setFilters({ dateFrom: '', dateTo: '' })}>{t('Effacer la période')}</Button>
                      ) : (
                        <Button variant="tonal" onClick={() => setCreateOpen(true)}>{t('Créer un dossier')}</Button>
                      )
                    }
                    dashed={false}
                    className="rounded-none bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            ) : (
              dossiers.map((d) => {
                const assure = typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim();
                return (
                  <TableRow key={d.id} className="group cursor-pointer" onClick={() => router.push(`/dossiers/${d.id}`)}>
                    <TableCell className="t-mono sticky left-0 z-[1] border-r border-hairline bg-card font-semibold [tr:hover_&]:bg-surface-2">
                      {d.refExpert || <span className="text-ink-4">—</span>}
                    </TableCell>
                    <TableCell className="font-medium">{assure || <span className="text-ink-4">—</span>}</TableCell>
                    <TableCell className="t-mono">{d.matricule || <span className="text-ink-4">—</span>}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(d.statut || 'Nouveau')}>{t(d.statut || 'Nouveau')}</Badge>
                    </TableCell>
                    {/* Dates are values → full ink (addendum §3: darker values;
                        ink-2 columns were part of the "one gray sheet" read). */}
                    <TableCell>
                      {d.dateRequete ? format(d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete), 'dd MMM yyyy', { locale: dateFnsLocale() }) : <span className="text-ink-4">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Row = link, chevron at the row end (§3 / DESIGN.md §4). */}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-3 hover:text-ink" asChild onClick={(e) => e.stopPropagation()}>
                        <Link href={`/dossiers/${d.id}`} title={t('Ouvrir le dossier')} aria-label={`${t('Ouvrir le dossier')} ${d.refExpert || ''}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        )}
      </Card>

      <CreateDossierDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialCompagnie={selectedCompagnie.nom}
        onCreated={(id) => router.push(`/dossiers/${id}`)}
      />
    </div>
  );
}
