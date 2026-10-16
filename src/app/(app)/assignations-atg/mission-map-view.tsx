'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap, Marker } from 'leaflet';
import { MapPinOff } from 'lucide-react';
import { locateAddress } from '@/lib/geocode';
import { positionKey, ringOffsets, tallyMap, type MapGroup, type MapLocateState } from '@/lib/map-tally';
// `useT` drives the React chrome; `tGlobal` the imperatively-built Leaflet
// popups, which live outside the render tree.
import { useT, t as tGlobal } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface MapMission {
  key: string;
  dossierId: string;
  refLabel: string; // dossier ref, mono
  assureNom?: string;
  /** Empty when the planification has no address: counted as « non localisée ». */
  adresse: string;
  group: MapGroup;
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
  className?: string; // caller sets the map height (e.g. h-[560px])
}

/** Freshness window — mirrors use-agent-live-location.ts. */
const AGENT_FRESH_MS = 10 * 60 * 1000;

/** Mission marker diameter, px. */
const MARKER_PX = 18;

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

const GROUP_VAR: Record<MapGroup, string> = {
  expired: '--status-danger-fg',
  today: '--tertiary',
  future: '--ink-3',
};

const GROUP_LABEL: Record<MapGroup, string> = {
  expired: 'En retard',
  today: "Aujourd'hui",
  future: 'À venir',
};

/** Draw order: the most urgent on top where markers come close. */
const GROUP_Z: Record<MapGroup, number> = { expired: 300, today: 200, future: 100 };

interface Located {
  state: MapLocateState;
  /** What the map found (the address or its neighbourhood). */
  matched?: string;
}

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
  const [located, setLocated] = useState<Record<string, Located>>({});
  const [agentCount, setAgentCount] = useState(0);

  // Stable signature so unrelated parent re-renders don't clear/re-add markers.
  const missionsSignature = useMemo(
    () =>
      missions
        .map((m) =>
          [m.key, m.adresse, m.group, m.refLabel, m.assureNom, m.rdvLabel].join(
            ''
          )
        )
        .join(''),
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

  // Markers: locate progressively, add as results arrive, fit bounds once.
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
    const points: [number, number][] = [];
    // Markers sharing a position, spread around it (QA #062: a mission of
    // today drawn under a late one at the same address was invisible).
    const atPosition = new Map<string, Array<{ marker: Marker; m: MapMission; approx: boolean }>>();

    layer.clearLayers();
    const initial: Record<string, Located> = {};
    for (const m of current) initial[m.key] = { state: m.adresse.trim() ? 'pending' : 'missing' };
    setLocated(initial);

    const stroke = cssHsl('--card');
    const fills: Record<MapGroup, string> = {
      expired: cssHsl(GROUP_VAR.expired),
      today: cssHsl(GROUP_VAR.today),
      future: cssHsl(GROUP_VAR.future),
    };

    const iconFor = (m: MapMission, approx: boolean, [dx, dy]: [number, number]) =>
      L.divIcon({
        className: '',
        iconSize: [MARKER_PX, MARKER_PX],
        iconAnchor: [MARKER_PX / 2 - dx, MARKER_PX / 2 - dy],
        popupAnchor: [dx, dy - MARKER_PX / 2],
        // Approximate position (neighbourhood): a ring in the group colour.
        html: `<div data-map-group="${m.group}" data-map-precision="${approx ? 'approx' : 'exact'}" style="width:${MARKER_PX}px;height:${MARKER_PX}px;box-sizing:border-box;border-radius:9999px;background:${approx ? stroke : fills[m.group]};border:${approx ? `4px solid ${fills[m.group]}` : `2px solid ${stroke}`};box-shadow:0 1px 3px rgba(0,0,0,.35);opacity:${approx ? 0.9 : 1};"></div>`,
      });

    const layoutPosition = (key: string) => {
      const entries = atPosition.get(key) ?? [];
      const offsets = ringOffsets(entries.length, MARKER_PX);
      entries.forEach((e, i) => e.marker.setIcon(iconFor(e.m, e.approx, offsets[i])));
    };

    const fitOnce = () => {
      if (didFit || points.length === 0) return;
      didFit = true;
      map.fitBounds(L.latLngBounds(points), {
        padding: [32, 32],
        maxZoom: 14,
      });
    };

    const buildPopup = (m: MapMission, approxOf: string | null): HTMLElement => {
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

      if (approxOf) {
        const approx = document.createElement('div');
        approx.textContent = `${tGlobal('Position approximative')} : ${approxOf}`;
        approx.className = 'text-xs italic';
        approx.style.color = 'hsl(var(--ink-3))';
        root.appendChild(approx);
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

    const withAddress = current.filter((m) => m.adresse.trim());
    if (withAddress.length === 0) return () => { cancelled = true; };

    for (const m of withAddress) {
      locateAddress(m.adresse).then((pos) => {
        if (cancelled) return;
        settled += 1;
        if (pos) {
          const approx = pos.precision === 'approx';
          const key = positionKey(pos.point.lat, pos.point.lon);
          const marker = L.marker([pos.point.lat, pos.point.lon], {
            icon: iconFor(m, approx, [0, 0]),
            zIndexOffset: GROUP_Z[m.group],
            keyboard: true,
            title: `${m.refLabel} — ${tGlobal(GROUP_LABEL[m.group])}`,
          });
          marker.bindPopup(buildPopup(m, approx ? pos.matched : null));
          marker.addTo(layer);
          const entries = atPosition.get(key) ?? [];
          entries.push({ marker, m, approx });
          atPosition.set(key, entries);
          if (entries.length > 1) layoutPosition(key);
          points.push([pos.point.lat, pos.point.lon]);
          setLocated((prev) => ({ ...prev, [m.key]: { state: approx ? 'approx' : 'exact', matched: pos.matched } }));
        } else {
          setLocated((prev) => ({ ...prev, [m.key]: { state: 'not-found' } }));
        }
        if (settled === withAddress.length) {
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

  // What the map shows against the lists' counts (QA #061): per category,
  // the missions on the map out of its total, and the ones it cannot place.
  const tally = useMemo(
    () => tallyMap(missions.map((m) => ({ group: m.group, state: located[m.key]?.state ?? (m.adresse.trim() ? 'pending' : 'missing') }))),
    [missions, located],
  );
  const unlocated = useMemo(
    () => missions.filter((m) => {
      const s = located[m.key]?.state ?? (m.adresse.trim() ? 'pending' : 'missing');
      return s === 'missing' || s === 'not-found';
    }),
    [missions, located],
  );
  const onMapCount = tally.expired.onMap + tally.today.onMap + tally.future.onMap;
  const locatedSoFar = missions.length - tally.pending;

  return (
    <div className="space-y-2">
      {/* Summary strip — above the map, never under it: the old « N adresses
          non localisables » caption sat at the map's bottom edge, off screen
          on a short window. */}
      <div
        data-testid="map-summary"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-hairline bg-card px-3 py-2 text-sm shadow-rim"
      >
        <span className="t-label">{t('Sur la carte')}</span>
        {(['expired', 'today', 'future'] as MapGroup[]).map((g) => (
          <span key={g} className="flex items-center gap-1.5 text-ink-2" data-testid={`map-count-${g}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(var(${GROUP_VAR[g]}))` }} aria-hidden />
            {t(GROUP_LABEL[g])}
            <span className="tabular-nums">
              <span className="font-semibold text-ink">{tally[g].onMap}</span> {t('sur')} {tally[g].total}
            </span>
          </span>
        ))}
        {tally.approx > 0 && (
          <span className="flex items-center gap-1.5 text-ink-3" data-testid="map-approx">
            <span className="h-2.5 w-2.5 rounded-full border-[3px] border-ink-3 bg-card" aria-hidden />
            {tally.approx}{' '}
            {tally.approx > 1 ? t('positions approximatives (quartier)') : t('position approximative (quartier)')}
          </span>
        )}
        <span className="ml-auto flex items-center gap-3">
          {tally.pending > 0 && (
            <span className="t-caption tabular-nums" aria-live="polite" data-testid="map-pending">
              {t('Localisation des adresses…')} {locatedSoFar}/{missions.length}
            </span>
          )}
          {unlocated.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" data-testid="map-unlocated">
                  <MapPinOff className="h-3.5 w-3.5" aria-hidden />
                  <span className="tabular-nums">{unlocated.length}</span>
                  {unlocated.length > 1 ? t('missions non localisées') : t('mission non localisée')}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] bg-card p-0">
                <p className="t-caption border-b border-hairline px-3 py-2">
                  {t('Ces missions ne sont pas sur la carte : leur adresse manque ou la carte ne la connaît pas. Elles restent dans la liste.')}
                </p>
                <ul className="max-h-72 divide-y divide-hairline overflow-y-auto" data-testid="map-unlocated-list">
                  {unlocated.map((m) => {
                    const missing = !m.adresse.trim();
                    return (
                      <li key={m.key} className="flex items-start gap-3 px-3 py-2">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: `hsl(var(${GROUP_VAR[m.group]}))` }} title={t(GROUP_LABEL[m.group])} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-xs font-medium text-ink">
                            {m.refLabel}
                            {m.assureNom ? <span className="font-sans font-normal text-ink-2"> · {m.assureNom}</span> : null}
                          </span>
                          <span className="t-caption block truncate" title={missing ? undefined : m.adresse}>
                            {missing ? t('Adresse manquante') : `${t('Adresse introuvable')} : ${m.adresse}`}
                          </span>
                        </span>
                        <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2" onClick={() => onSelect(m.key)}>
                          {t('Ouvrir')}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </PopoverContent>
            </Popover>
          )}
        </span>
      </div>

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
          {(['expired', 'today', 'future'] as MapGroup[]).map((g) => (
            <span key={g} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(${GROUP_VAR[g]}))` }} />
              {t(GROUP_LABEL[g])}
            </span>
          ))}
          {agentCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
              {agentCount > 1 ? t('Agents') : t('Agent')}
            </span>
          )}
        </div>

        {/* Progress note while nothing is on the map yet */}
        {tally.pending > 0 && onMapCount === 0 && (
          <div className="pointer-events-none absolute inset-0 z-[600] flex items-center justify-center">
            <span className="rounded-md border border-hairline bg-card/95 px-3 py-1.5 text-sm text-ink-3">
              {t('Localisation des adresses…')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
