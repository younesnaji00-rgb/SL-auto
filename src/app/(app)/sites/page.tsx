'use client';

/**
 * Sites — the areas where a rendez-vous is accepted (owner ruling 2026-10-16:
 * « the admins shall now determine the areas which planifications are
 * accepted … I can go to Sites and add Mohammedia, once I add it any
 * planification there will be accepted »).
 *
 * The list is the `options_sites` collection: /api/check-address reads it
 * (accepted-areas-server.ts) and refuses a rendez-vous address that names none
 * of these areas or that Google places elsewhere; the accounts' « Sites »
 * (Utilisateurs) are chosen in it. Admin and the Directeurs keep it. Removing
 * an area never touches planifications already saved.
 */

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info, MapPin, Plus, Trash2 } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
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
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOptions, type Option } from '@/hooks/use-options';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/i18n';
import { INPUT_TEXT } from '@/lib/input-attrs';
import { samePlace } from '@/lib/moroccan-address';
import { NAV_ITEMS, getDefaultRouteForRole, titleForRoute } from '@/lib/nav-groups';

export default function SitesPage() {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const { profile, loading: userLoading, isFullAdmin } = useCurrentUser();
  const { options, loading, addOption, deleteOption } = useOptions('options_sites');
  const areas = useMemo(() => options.filter((o) => o.active !== false), [options]);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Option | null>(null);

  // Admin and the Directeurs only (the route guard already keeps the others out).
  React.useEffect(() => {
    if (!userLoading && profile?.role && !isFullAdmin) router.replace(getDefaultRouteForRole(profile.role));
  }, [userLoading, profile?.role, isFullAdmin, router]);

  const nav = NAV_ITEMS.find((i) => i.href === '/sites');
  const title = t(titleForRoute('/sites') ?? 'Sites');
  const subtitle = nav?.subtitle ? t(nav.subtitle) : undefined;

  if (userLoading || loading) return <PageSkeleton variant="list" action={false} />;
  if (!isFullAdmin) return null;

  const add = async () => {
    const clean = name.replace(/\s+/g, ' ').trim();
    if (!clean) {
      setError(t('Ce champ est requis.'));
      return;
    }
    if (!/\p{L}{2}/u.test(clean) || clean.length > 60 || /[^\p{L}\p{M}\s'’\-.()]/u.test(clean)) {
      setError(t('Nom invalide : lettres uniquement (espace, tiret et apostrophe admis).'));
      return;
    }
    // Any spelling of a listed area (« fes », « Fez », « FÈS ») is that area.
    const twin = options.find((o) => samePlace(o.label, clean));
    if (twin) {
      setError(`${t('Cette zone existe déjà')} : « ${twin.label} ».`);
      return;
    }
    setSaving(true);
    try {
      await addOption(clean);
      toast({ title: t('Zone ajoutée'), description: `${clean} — ${t('les rendez-vous y sont acceptés.')}` });
      setName('');
      setError(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: String(e?.message ?? e) });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const target = toDelete;
    setToDelete(null);
    if (!target) return;
    try {
      await deleteOption(target.id);
      toast({ title: t('Zone retirée'), description: target.label });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: String(e?.message ?? e) });
    }
  };

  const lastOne = areas.length <= 1;

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} count={areas.length} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="t-heading">{t('Ajouter une zone')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void add();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="site-nom">
                  {t('Ville ou commune')} <span aria-hidden className="text-status-danger-fg">*</span>
                </Label>
                <Input
                  {...INPUT_TEXT}
                  id="site-nom"
                  autoCapitalize="words"
                  placeholder={t('ex. Mohammedia')}
                  aria-required
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? 'site-nom-error' : 'site-nom-hint'}
                  className={error ? 'border-status-danger-fg ring-1 ring-status-danger-fg' : undefined}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                />
                {error ? (
                  <p id="site-nom-error" role="alert" className="t-caption text-status-danger-fg">{error}</p>
                ) : (
                  <p id="site-nom-hint" className="t-caption">
                    {t('Écrivez-la comme Google l’écrit dans les adresses.')}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" loading={saving}>
                {!saving && <Plus aria-hidden />}
                {t('Ajouter')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-3">
          <p className="t-caption flex items-start gap-1.5 rounded-lg border border-hairline bg-surface-2 px-4 py-2.5 text-ink-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {t('Une adresse de rendez-vous doit se terminer par l’une de ces zones, et Google doit l’y situer. Les quartiers d’une ville (Maarif, Aïn Diab…) en font déjà partie ; ajoutez les communes voisines (Mohammedia, Bouskoura, Dar Bouazza…).')}
            </span>
          </p>
          {areas.length === 0 ? (
            <EmptyState
              icon={<MapPin />}
              title={t('Aucune zone')}
              description={t('Tant que la liste est vide, Casablanca et Fès restent acceptées.')}
            />
          ) : (
            <ul aria-label={t('Zones acceptées')} data-testid="sites-list" className="divide-y divide-hairline rounded-lg border border-hairline bg-card">
              {areas.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <MapPin className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                  <span className="t-body-sm min-w-0 flex-1 truncate font-medium text-ink">{a.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-ink-3 hover:text-destructive max-md:h-11 max-md:w-11"
                    onClick={() => setToDelete(a)}
                    disabled={lastOne}
                    title={lastOne ? t('Il faut au moins une zone') : `${t('Retirer')} ${a.label}`}
                    aria-label={`${t('Retirer')} ${a.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Retirer')} « {toDelete?.label} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Les nouveaux rendez-vous dans cette zone seront refusés. Les planifications déjà enregistrées ne changent pas.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Annuler')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('Retirer')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
