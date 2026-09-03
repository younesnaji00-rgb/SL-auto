'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import { geocodeAddress } from '@/lib/geocode';
import { cn } from '@/lib/utils';

export interface MapMission {
  key: string;
  dossierId: string;
  refLabel: string; // dossier ref, mono
  assureNom?: string;
  adresse: string; // caller guarantees non-empty
  group: 'today' | 'expired' | 'future';
  rdvLabel?: string; // e.g. « 3 sept. 14:30 »
}

interface MissionMapViewProps {
  missions: MapMission[];
  onSelect: (key: string) => void; // open the mission (peek panel)
  className?: string; // caller sets the height (e.g. h-[560px])
}

/** Read an HSL-triplet CSS custom property and wrap it as a usable color. */
function cssHsl(varName: string): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return `hsl(${raw})`;
}

const GROUP_VAR: Record<MapMission['group'], string> = {
  expired: '--status-danger-fg',
  today: '--tertiary',
  future: '--ink-3',
};

export default function MissionMapView({
  missions,
  onSelect,
  className,
}: MissionMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const missionsRef = useRef(missions);
  missionsRef.current = missions;

  const [ready, setReady] = useState(false);
  const [pinCount, setPinCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [pending, setPending] = useState(false);

  // Stable signature so unrelated parent re-renders don't clear/re-add markers.
  const missionsSignature = useMemo(
    () =>
      missions
        .map((m) =>
          [m.key, m.adresse, m.group, m.refLabel, m.assureNom, m.rdvLabel].join(
            ''
          )
        )
        .join(''),
    [missions]
  );

  // Map lifecycle: create once, destroy on unmount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        center: [33.57, -7.59], // Casablanca until pins exist
        zoom: 11,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Markers: geocode progressively, add as results arrive, fit bounds once.
  useEffect(() => {
    if (!ready) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;

    const current = missionsRef.current;
    let cancelled = false;
    let didFit = false;
    let settled = 0;
    let failed = 0;
    const points: [number, number][] = [];

    layer.clearLayers();
    setPinCount(0);
    setFailedCount(0);
    setPending(current.length > 0);

    const stroke = cssHsl('--card');

    const fitOnce = () => {
      if (didFit || points.length === 0) return;
      didFit = true;
      map.fitBounds(L.latLngBounds(points), {
        padding: [32, 32],
        maxZoom: 14,
      });
    };

    const buildPopup = (m: MapMission): HTMLElement => {
      const root = document.createElement('div');
      root.className = 'space-y-1 py-0.5';

      const ref = document.createElement('div');
      ref.textContent = m.refLabel;
      ref.className = 'font-mono text-xs font-medium';
      ref.style.color = 'hsl(var(--ink))';
      root.appendChild(ref);

      if (m.assureNom) {
        const nom = document.createElement('div');
        nom.textContent = m.assureNom;
        nom.className = 'text-sm';
        nom.style.color = 'hsl(var(--ink-2))';
        root.appendChild(nom);
      }

      if (m.rdvLabel) {
        const rdv = document.createElement('div');
        rdv.textContent = m.rdvLabel;
        rdv.className = 'text-xs';
        rdv.style.color = 'hsl(var(--tertiary-deep))'; // time = terracotta
        root.appendChild(rdv);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Ouvrir';
      btn.className =
        'mt-1 text-xs font-medium underline-offset-2 hover:underline';
      btn.style.color = 'hsl(var(--primary))';
      btn.addEventListener('click', () => {
        onSelectRef.current(m.key);
      });
      root.appendChild(btn);

      return root;
    };

    for (const m of current) {
      geocodeAddress(m.adresse).then((point) => {
        if (cancelled) return;
        settled += 1;
        if (point) {
          const marker = L.circleMarker([point.lat, point.lon], {
            radius: 9,
            weight: 2,
            color: stroke,
            fillColor: cssHsl(GROUP_VAR[m.group]),
            fillOpacity: 0.85,
          });
          marker.bindPopup(buildPopup(m));
          marker.addTo(layer);
          points.push([point.lat, point.lon]);
          setPinCount(points.length);
        } else {
          failed += 1;
          setFailedCount(failed);
        }
        if (settled === current.length) {
          setPending(false);
          fitOnce();
        } else if (points.length >= 3) {
          // Early fit once a few pins exist; never re-fit afterwards so the
          // map doesn't yank while the user pans.
          fitOnce();
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [ready, missionsSignature]);

  return (
    <div
      className={cn(
        'relative z-0 overflow-hidden rounded-lg border border-hairline bg-card shadow-rim',
        className
      )}
      style={{ isolation: 'isolate' }}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Legend */}
      <div className="pointer-events-none absolute right-2 top-2 z-[600] flex items-center gap-3 rounded-md border border-hairline bg-card/95 px-2.5 py-1.5 text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--status-danger-fg))]" />
          En retard
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--tertiary))]" />
          Aujourd&apos;hui
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--ink-3))]" />
          À venir
        </span>
      </div>

      {/* Progress note while nothing is on the map yet */}
      {pending && pinCount === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[600] flex items-center justify-center">
          <span className="rounded-md border border-hairline bg-card/95 px-3 py-1.5 text-sm text-ink-3">
            Localisation des adresses…
          </span>
        </div>
      )}

      {/* Failed-geocoding caption */}
      {failedCount > 0 && (
        <div className="absolute bottom-1.5 left-2 z-[600] rounded bg-card/90 px-1.5 py-0.5 text-xs text-ink-3">
          {failedCount} adresse{failedCount > 1 ? 's' : ''} non localisable
          {failedCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
