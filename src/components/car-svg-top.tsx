'use client';

import React from 'react';

interface CarSvgTopProps {
  zones: Record<string, boolean>;
  onToggleZone: (zone: string) => void;
  className?: string;
}

/**
 * Detailed car top-view SVG — technical illustration style.
 * Zones: AV, AR, AVG, AVD, ARG, ARD, LATG, LATD, Toit
 */
export default function CarSvgTop({ zones, onToggleZone, className }: CarSvgTopProps) {
  const zoneColor = (zone: string) => zones[zone] ? '#dc2626' : 'transparent';
  const zoneOpacity = (zone: string) => zones[zone] ? 0.35 : 0;
  const S = '#1e293b'; // stroke color

  return (
    <svg
      viewBox="0 0 300 620"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', maxWidth: 280, height: 'auto' }}
    >
      {/* ── BODY OUTLINE ───────────────────────────────────────── */}
      <path
        d={`
          M 95 52
          Q 95 28, 115 20 L 185 20 Q 205 28, 205 52
          L 210 75
          Q 218 95, 224 120
          L 228 155
          Q 232 185, 232 220
          L 232 310
          Q 232 400, 228 440
          L 224 475
          Q 218 500, 210 520
          L 205 548
          Q 205 572, 185 580 L 115 580 Q 95 572, 95 548
          L 90 520
          Q 82 500, 76 475
          L 72 440
          Q 68 400, 68 310
          L 68 220
          Q 68 185, 72 155
          L 76 120
          Q 82 95, 90 75
          Z
        `}
        stroke={S}
        strokeWidth="2.5"
        fill="none"
      />

      {/* ── FRONT BUMPER DETAIL ────────────────────────────────── */}
      <path d="M 105 30 Q 100 30, 97 35 L 95 45" stroke={S} strokeWidth="1.2" />
      <path d="M 195 30 Q 200 30, 203 35 L 205 45" stroke={S} strokeWidth="1.2" />
      {/* Bumper lower edge */}
      <path d="M 100 22 Q 150 14, 200 22" stroke={S} strokeWidth="1" />
      {/* Grille suggestion */}
      <path d="M 120 26 L 180 26" stroke={S} strokeWidth="0.8" />
      <path d="M 125 30 L 175 30" stroke={S} strokeWidth="0.6" />

      {/* ── HEADLIGHTS ─────────────────────────────────────────── */}
      <path d="M 82 55 Q 78 42, 95 38 L 105 35 Q 108 48, 95 55 Z" stroke={S} strokeWidth="1.5" fill="none" />
      <path d="M 218 55 Q 222 42, 205 38 L 195 35 Q 192 48, 205 55 Z" stroke={S} strokeWidth="1.5" fill="none" />
      {/* Inner headlight detail */}
      <path d="M 88 48 Q 92 43, 100 41" stroke={S} strokeWidth="0.6" />
      <path d="M 212 48 Q 208 43, 200 41" stroke={S} strokeWidth="0.6" />

      {/* ── HOOD LINES ─────────────────────────────────────────── */}
      <path d="M 120 55 Q 150 50, 180 55" stroke={S} strokeWidth="0.8" />
      <line x1="150" y1="50" x2="150" y2="95" stroke={S} strokeWidth="0.6" />
      {/* Hood edge */}
      <path d="M 85 95 Q 150 88, 215 95" stroke={S} strokeWidth="1" />

      {/* ── WINDSHIELD ─────────────────────────────────────────── */}
      <path
        d="M 90 100 Q 92 92, 110 88 L 190 88 Q 208 92, 210 100 L 210 145 Q 208 150, 200 152 L 100 152 Q 92 150, 90 145 Z"
        stroke={S}
        strokeWidth="1.8"
        fill="none"
      />
      {/* A-pillar left */}
      <path d="M 82 100 L 90 100 L 90 152 L 78 155" stroke={S} strokeWidth="1.2" fill="none" />
      {/* A-pillar right */}
      <path d="M 218 100 L 210 100 L 210 152 L 222 155" stroke={S} strokeWidth="1.2" fill="none" />
      {/* Windshield center bar (rearview mirror area) */}
      <ellipse cx="150" cy="100" rx="6" ry="3" stroke={S} strokeWidth="0.8" fill="none" />

      {/* ── ROOF ───────────────────────────────────────────────── */}
      <path d="M 88 155 L 88 430 L 212 430 L 212 155 Z" stroke={S} strokeWidth="0.8" strokeDasharray="5 3" fill="none" />
      {/* Roof rails */}
      <line x1="92" y1="165" x2="92" y2="420" stroke={S} strokeWidth="0.5" />
      <line x1="208" y1="165" x2="208" y2="420" stroke={S} strokeWidth="0.5" />

      {/* ── B-PILLAR ───────────────────────────────────────────── */}
      <line x1="78" y1="248" x2="92" y2="248" stroke={S} strokeWidth="1.5" />
      <line x1="208" y1="248" x2="222" y2="248" stroke={S} strokeWidth="1.5" />

      {/* ── SIDE WINDOWS (left) ────────────────────────────────── */}
      <path d="M 78 158 L 88 155 L 88 245 L 75 245" stroke={S} strokeWidth="1.2" fill="none" />
      <path d="M 75 252 L 88 252 L 88 425 L 80 422" stroke={S} strokeWidth="1.2" fill="none" />
      {/* ── SIDE WINDOWS (right) ───────────────────────────────── */}
      <path d="M 222 158 L 212 155 L 212 245 L 225 245" stroke={S} strokeWidth="1.2" fill="none" />
      <path d="M 225 252 L 212 252 L 212 425 L 220 422" stroke={S} strokeWidth="1.2" fill="none" />

      {/* ── REAR WINDOW ────────────────────────────────────────── */}
      <path
        d="M 92 435 Q 92 430, 100 428 L 200 428 Q 208 430, 208 435 L 208 478 Q 208 488, 195 492 L 105 492 Q 92 488, 92 478 Z"
        stroke={S}
        strokeWidth="1.8"
        fill="none"
      />
      {/* C-pillar left */}
      <path d="M 80 425 L 88 430 L 92 435 L 78 440" stroke={S} strokeWidth="1.2" fill="none" />
      {/* C-pillar right */}
      <path d="M 220 425 L 212 430 L 208 435 L 222 440" stroke={S} strokeWidth="1.2" fill="none" />

      {/* ── TRUNK LID ──────────────────────────────────────────── */}
      <path d="M 85 498 Q 150 492, 215 498" stroke={S} strokeWidth="1" />
      <line x1="150" y1="495" x2="150" y2="540" stroke={S} strokeWidth="0.6" />

      {/* ── TAILLIGHTS ─────────────────────────────────────────── */}
      <path d="M 78 540 Q 75 555, 95 560 L 105 562 Q 108 548, 95 542 Z" stroke={S} strokeWidth="1.5" fill="none" />
      <path d="M 222 540 Q 225 555, 205 560 L 195 562 Q 192 548, 205 542 Z" stroke={S} strokeWidth="1.5" fill="none" />
      {/* Inner taillight detail */}
      <path d="M 84 548 Q 88 552, 100 555" stroke={S} strokeWidth="0.6" />
      <path d="M 216 548 Q 212 552, 200 555" stroke={S} strokeWidth="0.6" />

      {/* ── REAR BUMPER ────────────────────────────────────────── */}
      <path d="M 100 575 Q 150 582, 200 575" stroke={S} strokeWidth="1" />
      <path d="M 105 570 Q 150 576, 195 570" stroke={S} strokeWidth="0.6" />

      {/* ── SIDE MIRRORS ───────────────────────────────────────── */}
      <path d="M 68 130 Q 56 128, 54 138 L 54 150 Q 56 158, 64 156 L 68 152" stroke={S} strokeWidth="1.8" fill="none" />
      <path d="M 232 130 Q 244 128, 246 138 L 246 150 Q 244 158, 236 156 L 232 152" stroke={S} strokeWidth="1.8" fill="none" />
      {/* Mirror glass */}
      <line x1="56" y1="135" x2="56" y2="152" stroke={S} strokeWidth="0.6" />
      <line x1="244" y1="135" x2="244" y2="152" stroke={S} strokeWidth="0.6" />

      {/* ── DOOR HANDLES ───────────────────────────────────────── */}
      <rect x="64" y="200" width="8" height="3" rx="1.5" stroke={S} strokeWidth="0.8" fill="none" />
      <rect x="64" y="310" width="8" height="3" rx="1.5" stroke={S} strokeWidth="0.8" fill="none" />
      <rect x="228" y="200" width="8" height="3" rx="1.5" stroke={S} strokeWidth="0.8" fill="none" />
      <rect x="228" y="310" width="8" height="3" rx="1.5" stroke={S} strokeWidth="0.8" fill="none" />

      {/* ── FRONT DOOR LINES ───────────────────────────────────── */}
      <path d="M 72 120 Q 70 155, 70 190 L 70 245" stroke={S} strokeWidth="1" />
      <path d="M 228 120 Q 230 155, 230 190 L 230 245" stroke={S} strokeWidth="1" />

      {/* ── REAR DOOR LINES ────────────────────────────────────── */}
      <path d="M 70 252 L 70 380 Q 70 420, 76 445" stroke={S} strokeWidth="1" />
      <path d="M 230 252 L 230 380 Q 230 420, 224 445" stroke={S} strokeWidth="1" />

      {/* ── WHEEL ARCHES ───────────────────────────────────────── */}
      {/* Front left */}
      <path d="M 68 80 Q 55 80, 52 100 L 52 125 Q 55 140, 68 140" stroke={S} strokeWidth="1.5" fill="none" />
      <path d="M 56 88 L 56 130" stroke={S} strokeWidth="0.6" />
      {/* Front right */}
      <path d="M 232 80 Q 245 80, 248 100 L 248 125 Q 245 140, 232 140" stroke={S} strokeWidth="1.5" fill="none" />
      <path d="M 244 88 L 244 130" stroke={S} strokeWidth="0.6" />
      {/* Rear left */}
      <path d="M 68 450 Q 55 450, 52 470 L 52 495 Q 55 510, 68 510" stroke={S} strokeWidth="1.5" fill="none" />
      <path d="M 56 458 L 56 502" stroke={S} strokeWidth="0.6" />
      {/* Rear right */}
      <path d="M 232 450 Q 245 450, 248 470 L 248 495 Q 245 510, 232 510" stroke={S} strokeWidth="1.5" fill="none" />
      <path d="M 244 458 L 244 502" stroke={S} strokeWidth="0.6" />

      {/* ── CLICKABLE ZONE OVERLAYS ────────────────────────────── */}
      {/* AV — Front */}
      <rect x="80" y="16" width="140" height="75" rx="10"
        fill={zoneColor('AV')} fillOpacity={zoneOpacity('AV')}
        onClick={() => onToggleZone('AV')} cursor="pointer" />
      {/* AR — Rear */}
      <rect x="80" y="520" width="140" height="60" rx="10"
        fill={zoneColor('AR')} fillOpacity={zoneOpacity('AR')}
        onClick={() => onToggleZone('AR')} cursor="pointer" />
      {/* AVG — Front left */}
      <rect x="50" y="55" width="35" height="95" rx="6"
        fill={zoneColor('AVG')} fillOpacity={zoneOpacity('AVG')}
        onClick={() => onToggleZone('AVG')} cursor="pointer" />
      {/* AVD — Front right */}
      <rect x="215" y="55" width="35" height="95" rx="6"
        fill={zoneColor('AVD')} fillOpacity={zoneOpacity('AVD')}
        onClick={() => onToggleZone('AVD')} cursor="pointer" />
      {/* ARG — Rear left */}
      <rect x="50" y="440" width="35" height="90" rx="6"
        fill={zoneColor('ARG')} fillOpacity={zoneOpacity('ARG')}
        onClick={() => onToggleZone('ARG')} cursor="pointer" />
      {/* ARD — Rear right */}
      <rect x="215" y="440" width="35" height="90" rx="6"
        fill={zoneColor('ARD')} fillOpacity={zoneOpacity('ARD')}
        onClick={() => onToggleZone('ARD')} cursor="pointer" />
      {/* LATG — Left side */}
      <rect x="50" y="150" width="30" height="290" rx="5"
        fill={zoneColor('LATG')} fillOpacity={zoneOpacity('LATG')}
        onClick={() => onToggleZone('LATG')} cursor="pointer" />
      {/* LATD — Right side */}
      <rect x="220" y="150" width="30" height="290" rx="5"
        fill={zoneColor('LATD')} fillOpacity={zoneOpacity('LATD')}
        onClick={() => onToggleZone('LATD')} cursor="pointer" />
      {/* Toit — Roof */}
      <rect x="88" y="155" width="124" height="275" rx="6"
        fill={zoneColor('Toit')} fillOpacity={zoneOpacity('Toit')}
        onClick={() => onToggleZone('Toit')} cursor="pointer" />

      {/* ── ZONE LABELS ────────────────────────────────────────── */}
      <text x="150" y="62" textAnchor="middle" fontSize="13" fontWeight="800" fill={S} className="pointer-events-none select-none">AV</text>
      <text x="150" y="558" textAnchor="middle" fontSize="13" fontWeight="800" fill={S} className="pointer-events-none select-none">AR</text>
      <text x="63" y="105" textAnchor="middle" fontSize="11" fontWeight="800" fill={S} className="pointer-events-none select-none">AVG</text>
      <text x="237" y="105" textAnchor="middle" fontSize="11" fontWeight="800" fill={S} className="pointer-events-none select-none">AVD</text>
      <text x="63" y="490" textAnchor="middle" fontSize="11" fontWeight="800" fill={S} className="pointer-events-none select-none">ARG</text>
      <text x="237" y="490" textAnchor="middle" fontSize="11" fontWeight="800" fill={S} className="pointer-events-none select-none">ARD</text>
      <text x="58" y="300" textAnchor="middle" fontSize="10" fontWeight="800" fill={S} className="pointer-events-none select-none" transform="rotate(-90 58 300)">LATG</text>
      <text x="242" y="300" textAnchor="middle" fontSize="10" fontWeight="800" fill={S} className="pointer-events-none select-none" transform="rotate(90 242 300)">LATD</text>
      <text x="150" y="298" textAnchor="middle" fontSize="13" fontWeight="800" fill={S} className="pointer-events-none select-none">TOIT</text>
    </svg>
  );
}
