'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import { geocodeAddress } from '@/lib/geocode';
// `useT` drives the React chrome; `tGlobal` the imperatively-built Leaflet
// popups, which live outside the render tree.
import { useT, t as tGlobal } from '@/i18n';
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

export interface MapAgent {
  uid: string;
  name: string;
  lat: number;
  lng: number;
  updatedAtMs: number;
}

interface MissionMapViewProps {
  missions: MapMission[];
  onSelect: (key: string) => void; // open the mission (peek panel)
  /** Live Agent de Terrain positions (users/{uid}.currentLocation). */
  agents?: MapAgent[];
  /** Dispatcher-only: ping an agent's device for a fresh position. */
  onRequestPosition?: (uid: string) => void;
  className?: string; // caller sets the height (e.g. h-[560px])
}

/** Freshness window — mirrors use-agent-live-location.ts. */
const AGENT_FRESH_MS = 10 * 60 * 1000;

function agentInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || 'A';
}

/**
 * Relative age. Translated in fragments around the number so English can put
 * the suffix after it (« il y a 5 min » → "5 min ago") without changing the
 * French wording.
 */
function agoLabel(updatedAtMs: number): string {
  const mins = Math.round((Date.now() - updatedAtMs) / 60000);
  if (mins < 1) return tGlobal("à l'instant");
  if (mins < 60) return `${tGlobal('il y a ')}${mins}${tGlobal(' min')}`;
  const hours = Math.round(mins / 60);
  return `${tGlobal('il y a ')}${hours}${tGlobal(' h')}`;
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
  agents,
  onRequestPosition,
  className,
}: MissionMapViewProps) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const agentLayerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const missionsRef = useRef(missions);
  missionsRef.current = missions;
  const agentsRef = useRef(agents);
  agentsRef.current = agents;
  const onRequestPositionRef = useRef(onRequestPosition);
  onRequestPositionRef.current = onRequestPosition;

  const [ready, setReady] = useState(false);
  const [pinCount, setPinCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [agentCount, setAgentCount] = useState(0);

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
      agentLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      agentLayerRef.current = null;
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
      btn.textContent = tGlobal('Ouvrir');
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

  // Agent layer — live Agent de Terrain positions. Rebuilt on any position
  // change (minute-bucketed so the « il y a X min » labels stay honest
  // without churning on every render). Fresh = teal identity pin with
  // initials; stale (> 10 min) = quiet grey. No motion (motion spec).
  const agentsSignature = useMemo(
    () =>
      (agents ?? [])
        .map((a) => [a.uid, a.lat.toFixed(5), a.lng.toFixed(5), Math.floor(a.updatedAtMs / 60000)].join(','))
        .join('|'),
    [agents]
  );

  useEffect(() => {
    if (!ready) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = agentLayerRef.current;
    if (!L || !map || !layer) return;

    const current = agentsRef.current ?? [];
    layer.clearLayers();
    setAgentCount(current.length);
    if (current.length === 0) return;

    const now = Date.now();
    const freshColor = cssHsl('--primary');
    const staleColor = cssHsl('--ink-4');
    const ring = cssHsl('--card');

    for (const a of current) {
      const fresh = now - a.updatedAtMs < AGENT_FRESH_MS;
      const icon = L.divIcon({
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
        html: `<div style="width:28px;height:28px;border-radius:9999px;display:flex;align-items:center;justify-content:center;background:${fresh ? freshColor : staleColor};color:${ring};border:2px solid ${ring};box-shadow:0 1px 3px rgba(0,0,0,.25);font:600 11px/1 system-ui,sans-serif;">${agentInitials(a.name)}</div>`,
      });
      const marker = L.marker([a.lat, a.lng], { icon, zIndexOffset: 500 });

      const root = document.createElement('div');
      root.className = 'space-y-1 py-0.5';
      const nameEl = document.createElement('div');
      nameEl.textContent = a.name;
      nameEl.className = 'text-sm font-semibold';
      nameEl.style.color = 'hsl(var(--ink))';
      root.appendChild(nameEl);
      const metaEl = document.createElement('div');
      metaEl.textContent = fresh
        ? `${tGlobal('Position')} · ${agoLabel(a.updatedAtMs)}`
        : `${tGlobal('Position ancienne')} · ${agoLabel(a.updatedAtMs)}`;
      metaEl.className = 'text-xs';
      metaEl.style.color = 'hsl(var(--ink-3))';
      root.appendChild(metaEl);
      if (onRequestPositionRef.current) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = tGlobal('Actualiser la position');
        btn.className = 'mt-1 text-xs font-medium underline-offset-2 hover:underline';
        btn.style.color = 'hsl(var(--primary))';
        btn.addEventListener('click', () => {
          onRequestPositionRef.current?.(a.uid);
        });
        root.appendChild(btn);
      }
      marker.bindPopup(root);
      marker.addTo(layer);
    }

    // No missions on the map (e.g. all addresses failed geocoding): frame
    // the agents instead so the lens still shows something useful.
    if ((missionsRef.current ?? []).length === 0) {
      map.fitBounds(L.latLngBounds(current.map((a) => [a.lat, a.lng] as [number, number])), {
        padding: [48, 48],
        maxZoom: 13,
      });
    }
  }, [ready, agentsSignature]);

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
          {t('En retard')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--tertiary))]" />
          {t("Aujourd'hui")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--ink-3))]" />
          {t('À venir')}
        </span>
        {agentCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
            {agentCount > 1 ? t('Agents') : t('Agent')}
          </span>
        )}
      </div>

      {/* Progress note while nothing is on the map yet */}
      {pending && pinCount === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[600] flex items-center justify-center">
          <span className="rounded-md border border-hairline bg-card/95 px-3 py-1.5 text-sm text-ink-3">
            {t('Localisation des adresses…')}
          </span>
        </div>
      )}

      {/* Failed-geocoding caption */}
      {failedCount > 0 && (
        <div className="absolute bottom-1.5 left-2 z-[600] rounded bg-card/90 px-1.5 py-0.5 text-xs text-ink-3">
          {failedCount}{' '}
          {failedCount > 1 ? t('adresses non localisables') : t('adresse non localisable')}
        </div>
      )}
    </div>
  );
}
