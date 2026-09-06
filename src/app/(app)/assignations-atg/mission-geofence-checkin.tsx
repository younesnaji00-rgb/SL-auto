'use client';

/**
 * Geofenced check-in suggestion (terrain research 2026-09-03 follow-up).
 * Watches the agent's live position; when it lands within RADIUS_M of a
 * geocoded mission address (today's or overdue missions only), a fixed
 * bottom banner — the phone's thumb zone (Corvus: primary actions in the
 * bottom 40 %) — offers a ONE-TAP « Confirmer l'arrivée ».
 *
 * Deliberately a suggestion, not a silent auto-stamp: GPS noise and
 * geocoding error would otherwise write wrong audit data (FieldProMax: the
 * board must never become fiction). Positions with accuracy worse than
 * MAX_ACCURACY_M are ignored; a dismissed suggestion stays dismissed for
 * the session.
 */

import { useEffect, useMemo, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore, useAuth } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { geocodeAddress, type GeoPoint } from '@/lib/geocode';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

export interface GeofenceCandidate {
  key: string;
  dossierId: string;
  planifId: string;
  refLabel: string;
  adresse: string;
}

const RADIUS_M = 150;
const MAX_ACCURACY_M = 150;
const MAX_CANDIDATES = 20;
const DISMISS_KEY = 'atg-geofence-dismissed';

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function readDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(DISMISS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function GeofenceCheckinBanner({
  candidates,
  className,
}: {
  candidates: GeofenceCandidate[];
  className?: string;
}) {
  const db = useFirestore();
  const auth = useAuth();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const t = useT();
  const [pos, setPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geo, setGeo] = useState<Record<string, GeoPoint | null>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);
  const [saving, setSaving] = useState(false);

  const scoped = useMemo(() => candidates.slice(0, MAX_CANDIDATES), [candidates]);
  const hasCandidates = scoped.length > 0;

  // Foreground position watch — only while there is something to match.
  useEffect(() => {
    if (!hasCandidates || typeof navigator === 'undefined' || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? 9999 }),
      () => { /* denied/unavailable — banner simply never shows */ },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [hasCandidates]);

  // Geocode candidate addresses (cache + throttle live in geocodeAddress).
  const addrSignature = useMemo(() => scoped.map((c) => c.adresse).join('|'), [scoped]);
  useEffect(() => {
    if (!hasCandidates) return;
    let cancelled = false;
    scoped.forEach((c) => {
      geocodeAddress(c.adresse).then((pt) => {
        if (cancelled) return;
        setGeo((prev) => (c.adresse in prev && prev[c.adresse] === pt ? prev : { ...prev, [c.adresse]: pt }));
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addrSignature, hasCandidates]);

  const suggestion = useMemo(() => {
    if (!pos || pos.accuracy > MAX_ACCURACY_M) return null;
    let best: { candidate: GeofenceCandidate; distanceM: number } | null = null;
    for (const c of scoped) {
      if (dismissed.has(c.key)) continue;
      const pt = geo[c.adresse];
      if (!pt) continue;
      const d = haversineM(pos.lat, pos.lng, pt.lat, pt.lon);
      if (d <= RADIUS_M && (!best || d < best.distanceM)) best = { candidate: c, distanceM: d };
    }
    return best;
  }, [pos, scoped, geo, dismissed]);

  if (!suggestion) return null;
  const { candidate, distanceM } = suggestion;

  const dismiss = () => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(candidate.key);
      try { window.sessionStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };

  const confirm = async () => {
    if (!db || saving || !pos) return;
    setSaving(true);
    try {
      const userEmail = auth?.currentUser?.email || 'Agent';
      await updateDoc(doc(db, 'dossiers', candidate.dossierId, 'planifications', candidate.planifId), {
        checkinAt: serverTimestamp(),
        checkinLat: pos.lat,
        checkinLng: pos.lng,
        checkinBy: profile?.nom || userEmail,
      });
      try {
        // Audit trail: action + details stay French (translated at display time).
        await logHistorique(
          db,
          candidate.dossierId,
          'Arrivée sur place',
          userEmail,
          `Arrivée confirmée depuis la suggestion géolocalisée (~${Math.round(distanceM)} m de l'adresse).`,
          'planification',
          profile?.nom,
        );
      } catch { /* non-fatal */ }
      toast({ title: t('Arrivée enregistrée'), description: `${candidate.refLabel} · ${t('heure et position GPS horodatées.')}` });
    } catch (e) {
      console.error('[geofence-checkin] failed:', e);
      toast({ title: t('Enregistrement impossible'), description: t('Réessayez dans un instant.'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        // Thumb zone, above the 60 px mobile nav bar; card grammar, no scrim.
        'fixed inset-x-3 bottom-20 z-40 rounded-lg border border-hairline bg-card p-3 shadow-rim',
        className,
      )}
      role="status"
      data-tour="atg-checkin"
    >
      <div className="flex items-start gap-2.5">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{t('Vous êtes sur place')}</p>
          <p className="truncate text-xs text-ink-3">
            <span className="t-mono">{candidate.refLabel}</span>
            {` · ${t('à ~')}${Math.round(distanceM)}${t(" m de l'adresse")}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 text-ink-3 md:h-8 md:w-8"
          onClick={dismiss}
          aria-label={t('Ignorer la suggestion')}
          title={t('Ignorer la suggestion')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="tonal" className="mt-2 h-11 w-full" onClick={confirm} loading={saving}>
        {t("Confirmer l'arrivée")}
      </Button>
    </div>
  );
}
