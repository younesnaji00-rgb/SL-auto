'use client';

/**
 * Quick actions for the Missions terrain queue (terrain research 2026-09-03,
 * terrain-navigation-tools.md: every fetched dispatch product does call /
 * message / navigate / reassign ON the board; WhatsApp is the locally-correct
 * channel — 75 % of Moroccans use it, 95 % daily). Row cluster on desktop is
 * hover-revealed (P&P "display the right interactions only when and where
 * they are needed") but never the ONLY path — the peek panel repeats them.
 */

import { useState } from 'react';
import { doc, updateDoc, serverTimestamp, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { MessageCircle, Navigation, Phone, UserCog, MapPin, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useAuth } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOptions } from '@/hooks/use-options';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/** `tel:` normalisation: keep a leading `+`, strip everything but digits. */
export function telHref(raw?: string | null): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  return `tel:${trimmed.startsWith('+') ? `+${digits}` : digits}`;
}

/**
 * wa.me deep link for a Moroccan number: 06… → 2126…, keeps 212-prefixed and
 * international numbers as-is. Optional prefilled French message.
 */
export function waHref(raw?: string | null, text?: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return null;
  let intl = digits;
  if (digits.startsWith('00')) intl = digits.slice(2);
  else if (digits.startsWith('0')) intl = `212${digits.slice(1)}`;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function mapsSearchUrl(adresse: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}

/** Best-effort current position ("lat,lng") within 4 s; null otherwise. */
function readPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return; }
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => { if (!settled) { settled = true; clearTimeout(timer); resolve(null); } },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 30000 },
    );
  });
}

export interface ReassignTarget {
  dossierId: string;
  planifId: string;
  agentTerrain: string;
  zone?: string;
  agentTerrainUid?: string | null;
}

/**
 * Reassign one or several missions without leaving the queue (Salesforce
 * console: actions on selected appointments; popover = 80 % of drag-and-drop's
 * value at 20 % of its cost). Undo via toast, not a confirm dialog (Eleken;
 * Raskin: "never use a warning when you mean undo").
 */
export function ReassignPopover({
  targets,
  children,
  onDone,
}: {
  targets: ReassignTarget[];
  children: React.ReactNode;
  onDone?: () => void;
}) {
  const db = useFirestore();
  const auth = useAuth();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const { options: agents } = useOptions('options_agents');
  const t = useT();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const applyAgent = async (
    items: ReassignTarget[],
    agentLabel: string,
    agentUid: string | null,
    zone: string,
    logLabel: string,
  ) => {
    if (!db) return;
    const userEmail = auth?.currentUser?.email || 'Admin';
    await Promise.all(items.map(async (item) => {
      await updateDoc(doc(db, 'dossiers', item.dossierId, 'planifications', item.planifId), {
        agentTerrain: agentLabel,
        agentTerrainUid: agentUid,
        zone,
        modifiedAt: serverTimestamp(),
        modifiedBy: auth?.currentUser?.uid || 'Admin',
        modifiedByName: profile?.nom || userEmail,
      });
      try {
        // Audit trail: stored in French on purpose (translated at display time).
        await logHistorique(db, item.dossierId, 'Planification modifiée', userEmail, logLabel, 'planification', profile?.nom);
      } catch { /* non-fatal */ }
    }));
  };

  const reassignTo = async (agentLabel: string, zone: string) => {
    if (!db || saving || targets.length === 0) return;
    setSaving(true);
    try {
      // Resolve the agent uid once (mirrors modal-planification's lookup).
      let agentUid: string | null = null;
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('nom', '==', agentLabel), limit(1)));
        agentUid = snap.docs[0]?.id ?? null;
      } catch { agentUid = null; }

      const previous = targets.map((target) => ({ ...target }));
      // The two log labels below are audit-trail text — stored in French.
      await applyAgent(targets, agentLabel, agentUid, zone, `Mission réassignée à ${agentLabel}.`);
      setOpen(false);
      onDone?.();
      toast({
        title: targets.length > 1 ? `${targets.length} ${t('missions réassignées')}` : t('Mission réassignée'),
        description: `${t('Nouvel agent')} : ${agentLabel}`,
        action: (
          <ToastAction
            altText={t('Annuler la réassignation')}
            onClick={() => {
              Promise.all(previous.map((p) =>
                applyAgent([p], p.agentTerrain, p.agentTerrainUid ?? null, p.zone || '', 'Réassignation annulée.')
              )).catch(() => {
                toast({ title: t('Annulation impossible'), variant: 'destructive' });
              });
            }}
          >
            {t('Annuler')}
          </ToastAction>
        ),
      });
    } catch (e) {
      console.error('[reassign] failed:', e);
      toast({ title: t('Réassignation impossible'), description: t('Réessayez dans un instant.'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const currentAgent = targets.length === 1 ? targets[0].agentTerrain : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="t-label px-2 pb-1">
          {targets.length > 1
            ? `${t('Réassigner')} ${targets.length} ${t('missions à')}`
            : t('Réassigner à')}
        </p>
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {agents.length === 0 && (
            <p className="px-2 py-2 text-sm text-ink-3">{t('Aucun agent disponible')}</p>
          )}
          {agents.map((a) => {
            const isCurrent = a.label === currentAgent;
            return (
              <button
                key={a.id ?? a.label}
                type="button"
                disabled={saving || isCurrent}
                onClick={() => reassignTo(a.label, a.zone?.trim() || '')}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-ink transition-colors',
                  isCurrent ? 'cursor-default bg-surface-2 text-ink-3' : 'hover:bg-surface-2',
                )}
              >
                <span className="truncate font-medium">{a.label}</span>
                <span className="shrink-0 text-xs text-ink-3">
                  {isCurrent ? t('actuel') : a.zone?.trim() || ''}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Desktop row cluster — ghost 32 px icon buttons, revealed on row hover /
 * focus (never the only path: the peek panel repeats everything). Icons sit
 * at ink-3 (Hobday: dim icons paired with text… here paired with the row).
 */
export function MissionRowActions({
  telephone,
  adresse,
  reassignTarget,
  canReassign,
}: {
  telephone?: string | null;
  adresse?: string;
  reassignTarget: ReassignTarget;
  canReassign: boolean;
}) {
  const t = useT();
  const tel = telHref(telephone);
  const wa = waHref(telephone);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <span className="inline-flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
      {tel && (
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-ink-3" title={t("Appeler l'assuré")}>
          <a href={tel} onClick={stop} aria-label={t("Appeler l'assuré")}><Phone className="h-4 w-4" /></a>
        </Button>
      )}
      {wa && (
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-ink-3" title={t('Écrire sur WhatsApp')}>
          <a href={wa} target="_blank" rel="noopener noreferrer" onClick={stop} aria-label={t('Écrire sur WhatsApp')}>
            <MessageCircle className="h-4 w-4" />
          </a>
        </Button>
      )}
      {adresse?.trim() && (
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-ink-3" title={t('Itinéraire Google Maps')}>
          <a href={mapsSearchUrl(adresse)} target="_blank" rel="noopener noreferrer" onClick={stop} aria-label={t('Itinéraire Google Maps')}>
            <Navigation className="h-4 w-4" />
          </a>
        </Button>
      )}
      {canReassign && (
        <ReassignPopover targets={[reassignTarget]}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-3" title={t('Réassigner la mission')} aria-label={t('Réassigner la mission')}>
            <UserCog className="h-4 w-4" />
          </Button>
        </ReassignPopover>
      )}
    </span>
  );
}

/**
 * « En route » — prefilled WhatsApp ETA message to the insured (ServiceM8's
 * on-the-way SMS, FieldProMax: automated arrival texts cut ETA complaints to
 * a third; wa.me is the honest Moroccan substitute for an SMS pipeline).
 */
export function EnRouteButton({
  telephone,
  rdvTime,
  className,
}: {
  telephone?: string | null;
  rdvTime?: string | null;
  className?: string;
}) {
  const t = useT();
  // Message read by the insured on WhatsApp — translated in fragments so the
  // French wording stays byte-identical.
  const message = `${t("Bonjour, votre expert automobile est en route pour l'expertise de votre véhicule")}${rdvTime ? ` (${t('rendez-vous prévu à')} ${rdvTime})` : ''}. ${t('À très bientôt.')}`;
  const href = waHref(telephone, message);
  if (!href) return null;
  return (
    <Button asChild variant="secondary" size="sm" className={cn('gap-1.5', className)} title={t("Prévenir l'assuré sur WhatsApp")}>
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        <Car className="h-4 w-4" />
        {t('En route')}
      </a>
    </Button>
  );
}

/**
 * « Arrivé sur place » — one-tap check-in stamping time + GPS on the
 * planification (Corvus 3-tap rule; FieldProMax: techs updating from the
 * field is THE adoption predictor). Falls back to time-only when
 * geolocation is unavailable.
 */
export function CheckinButton({
  dossierId,
  planifId,
  checkedIn,
  className,
}: {
  dossierId: string;
  planifId: string;
  checkedIn: boolean;
  className?: string;
}) {
  const db = useFirestore();
  const auth = useAuth();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const t = useT();
  const [saving, setSaving] = useState(false);

  if (checkedIn) return null;

  const checkin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!db || saving) return;
    setSaving(true);
    try {
      const pos = await readPosition();
      const userEmail = auth?.currentUser?.email || 'Agent';
      await updateDoc(doc(db, 'dossiers', dossierId, 'planifications', planifId), {
        checkinAt: serverTimestamp(),
        checkinLat: pos?.lat ?? null,
        checkinLng: pos?.lng ?? null,
        checkinBy: profile?.nom || userEmail,
      });
      try {
        // Audit trail: action + details stay French (translated at display time).
        await logHistorique(db, dossierId, 'Arrivée sur place', userEmail, pos ? 'Arrivée horodatée avec position GPS.' : 'Arrivée horodatée (position indisponible).', 'planification', profile?.nom);
      } catch { /* non-fatal */ }
      toast({ title: t('Arrivée enregistrée'), description: pos ? t('Heure et position GPS horodatées.') : t('Heure enregistrée (position GPS indisponible).') });
    } catch (err) {
      console.error('[checkin] failed:', err);
      toast({ title: t('Enregistrement impossible'), description: t('Réessayez dans un instant.'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('gap-1.5', className)}
      onClick={checkin}
      loading={saving}
      title={t("Horodater l'arrivée sur place (heure + GPS)")}
    >
      <MapPin className="h-4 w-4" />
      {t('Arrivé sur place')}
    </Button>
  );
}
