'use client';

import React from 'react';

interface CarSvgBottomProps {
  zones: Record<string, boolean>;
  onToggleZone: (zone: string) => void;
  className?: string;
}

/**
 * Detailed car bottom-view (underside) SVG — technical illustration style.
 * Zones: suspensionAV, soubassementAV, plancher, transmission, differentiel, suspensionAR, echappement, reservoir
 */
export default function CarSvgBottom({ zones, onToggleZone, className }: CarSvgBottomProps) {
  const zoneColor = (zone: string) => zones[zone] ? '#dc2626' : 'transparent';
  const zoneOpacity = (zone: string) => zones[zone] ? 0.35 : 0;
  const S = '#475569'; // stroke color

  return (
    <svg
      viewBox="0 0 300 640"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', maxWidth: 280, height: 'auto' }}
    >
      {/* ── BODY OUTLINE (underside) ───────────────────────────── */}
      <path
        d={`
          M 95 52
          Q 95 28, 115 20 L 185 20 Q 205 28, 205 52
          L 210 75
          Q 218 95, 224 120
          L 228 155
          Q 232 185, 232 230
          L 232 340
          Q 232 420, 228 460
          L 224 495
          Q 218 515, 210 535
          L 205 565
          Q 205 585, 185 592 L 115 592 Q 95 585, 95 565
          L 90 535
          Q 82 515, 76 495
          L 72 460
          Q 68 420, 68 340
          L 68 230
          Q 68 185, 72 155
          L 76 120
          Q 82 95, 90 75
          Z
        `}
        stroke={S}
        strokeWidth="2"
        fill="none"
      />

      {/* ── FRONT AXLE ─────────────────────────────────────────── */}
      <line x1="52" y1="100" x2="248" y2="100" stroke={S} strokeWidth="3" />
      {/* Front left wheel */}
      <rect x="38" y="72" width="22" height="56" rx="5" stroke={S} strokeWidth="2" fill="none" />
      <line x1="42" y1="80" x2="56" y2="80" stroke={S} strokeWidth="0.8" />
      <line x1="42" y1="90" x2="56" y2="90" stroke={S} strokeWidth="0.8" />
      <line x1="42" y1="100" x2="56" y2="100" stroke={S} strokeWidth="0.8" />
      <line x1="42" y1="110" x2="56" y2="110" stroke={S} strokeWidth="0.8" />
      <line x1="42" y1="120" x2="56" y2="120" stroke={S} strokeWidth="0.8" />
      {/* Front right wheel */}
      <rect x="240" y="72" width="22" height="56" rx="5" stroke={S} strokeWidth="2" fill="none" />
      <line x1="244" y1="80" x2="258" y2="80" stroke={S} strokeWidth="0.8" />
      <line x1="244" y1="90" x2="258" y2="90" stroke={S} strokeWidth="0.8" />
      <line x1="244" y1="100" x2="258" y2="100" stroke={S} strokeWidth="0.8" />
      <line x1="244" y1="110" x2="258" y2="110" stroke={S} strokeWidth="0.8" />
      <line x1="244" y1="120" x2="258" y2="120" stroke={S} strokeWidth="0.8" />
      {/* Hub circles */}
      <circle cx="49" cy="100" r="8" stroke={S} strokeWidth="1.5" fill="none" />
      <circle cx="49" cy="100" r="3" stroke={S} strokeWidth="1" fill="none" />
      <circle cx="251" cy="100" r="8" stroke={S} strokeWidth="1.5" fill="none" />
      <circle cx="251" cy="100" r="3" stroke={S} strokeWidth="1" fill="none" />

      {/* ── REAR AXLE ──────────────────────────────────────────── */}
      <line x1="52" y1="505" x2="248" y2="505" stroke={S} strokeWidth="3" />
      {/* Rear left wheel */}
      <rect x="38" y="477" width="22" height="56" rx="5" stroke={S} strokeWidth="2" fill="none" />
      <line x1="42" y1="485" x2="56" y2="485" stroke={S} strokeWidth="0.8" />
      <line x1="42" y1="495" x2="56" y2="495" stroke={S} strokeWidth="0.8" />
      <line x1="42" y1="505" x2="56" y2="505" stroke={S} strokeWidth="0.8" />
      <line x1="42" y1="515" x2="56" y2="515" stroke={S} strokeWidth="0.8" />
      <line x1="42" y1="525" x2="56" y2="525" stroke={S} strokeWidth="0.8" />
      {/* Rear right wheel */}
      <rect x="240" y="477" width="22" height="56" rx="5" stroke={S} strokeWidth="2" fill="none" />
      <line x1="244" y1="485" x2="258" y2="485" stroke={S} strokeWidth="0.8" />
      <line x1="244" y1="495" x2="258" y2="495" stroke={S} strokeWidth="0.8" />
      <line x1="244" y1="505" x2="258" y2="505" stroke={S} strokeWidth="0.8" />
      <line x1="244" y1="515" x2="258" y2="515" stroke={S} strokeWidth="0.8" />
      <line x1="244" y1="525" x2="258" y2="525" stroke={S} strokeWidth="0.8" />
      {/* Hub circles */}
      <circle cx="49" cy="505" r="8" stroke={S} strokeWidth="1.5" fill="none" />
      <circle cx="49" cy="505" r="3" stroke={S} strokeWidth="1" fill="none" />
      <circle cx="251" cy="505" r="8" stroke={S} strokeWidth="1.5" fill="none" />
      <circle cx="251" cy="505" r="3" stroke={S} strokeWidth="1" fill="none" />

      {/* ── FRONT SUSPENSION ARMS ──────────────────────────────── */}
      {/* Left — upper & lower A-arms */}
      <path d="M 70 72 L 100 95 L 70 100" stroke={S} strokeWidth="1.8" fill="none" />
      <path d="M 70 128 L 100 105 L 70 100" stroke={S} strokeWidth="1.8" fill="none" />
      {/* Right — upper & lower A-arms */}
      <path d="M 230 72 L 200 95 L 230 100" stroke={S} strokeWidth="1.8" fill="none" />
      <path d="M 230 128 L 200 105 L 230 100" stroke={S} strokeWidth="1.8" fill="none" />
      {/* Steering rack */}
      <rect x="105" y="94" width="90" height="12" rx="3" stroke={S} strokeWidth="1.2" fill="none" />
      {/* Tie rods */}
      <line x1="105" y1="100" x2="80" y2="98" stroke={S} strokeWidth="1" />
      <line x1="195" y1="100" x2="220" y2="98" stroke={S} strokeWidth="1" />

      {/* ── ENGINE / SUBFRAME (front) ──────────────────────────── */}
      <rect x="95" y="40" width="110" height="50" rx="8" stroke={S} strokeWidth="1.5" fill="none" />
      {/* Engine block detail */}
      <rect x="115" y="48" width="70" height="34" rx="4" stroke={S} strokeWidth="1" fill="none" />
      <line x1="130" y1="48" x2="130" y2="82" stroke={S} strokeWidth="0.6" />
      <line x1="150" y1="48" x2="150" y2="82" stroke={S} strokeWidth="0.6" />
      <line x1="170" y1="48" x2="170" y2="82" stroke={S} strokeWidth="0.6" />

      {/* ── DRIVESHAFT / TRANSMISSION TUNNEL ───────────────────── */}
      <rect x="138" y="100" width="24" height="405" rx="6" stroke={S} strokeWidth="1.5" fill="none" />
      {/* Universal joints */}
      <circle cx="150" cy="115" r="5" stroke={S} strokeWidth="1" fill="none" />
      <circle cx="150" cy="490" r="5" stroke={S} strokeWidth="1" fill="none" />
      {/* Shaft center line */}
      <line x1="150" y1="120" x2="150" y2="485" stroke={S} strokeWidth="0.8" strokeDasharray="8 4" />

      {/* ── FLOOR PAN CROSS MEMBERS ────────────────────────────── */}
      <line x1="75" y1="175" x2="225" y2="175" stroke={S} strokeWidth="1.2" strokeDasharray="6 3" />
      <line x1="75" y1="245" x2="225" y2="245" stroke={S} strokeWidth="1.2" strokeDasharray="6 3" />
      <line x1="75" y1="320" x2="225" y2="320" stroke={S} strokeWidth="1.2" strokeDasharray="6 3" />
      <line x1="75" y1="390" x2="225" y2="390" stroke={S} strokeWidth="1.2" strokeDasharray="6 3" />

      {/* ── FLOOR PAN SIDE RAILS ───────────────────────────────── */}
      <line x1="82" y1="130" x2="82" y2="470" stroke={S} strokeWidth="1" />
      <line x1="218" y1="130" x2="218" y2="470" stroke={S} strokeWidth="1" />

      {/* ── REAR SUSPENSION ARMS ───────────────────────────────── */}
      {/* Left — trailing arms */}
      <path d="M 70 477 L 100 500 L 70 505" stroke={S} strokeWidth="1.8" fill="none" />
      <path d="M 70 533 L 100 510 L 70 505" stroke={S} strokeWidth="1.8" fill="none" />
      {/* Right — trailing arms */}
      <path d="M 230 477 L 200 500 L 230 505" stroke={S} strokeWidth="1.8" fill="none" />
      <path d="M 230 533 L 200 510 L 230 505" stroke={S} strokeWidth="1.8" fill="none" />

      {/* ── DIFFERENTIAL ───────────────────────────────────────── */}
      <circle cx="150" cy="505" r="18" stroke={S} strokeWidth="1.8" fill="none" />
      <circle cx="150" cy="505" r="8" stroke={S} strokeWidth="1" fill="none" />
      {/* Half-shafts */}
      <line x1="132" y1="505" x2="65" y2="505" stroke={S} strokeWidth="2" />
      <line x1="168" y1="505" x2="235" y2="505" stroke={S} strokeWidth="2" />

      {/* ── EXHAUST SYSTEM ─────────────────────────────────────── */}
      <path d="M 120 90 L 120 140 Q 120 150, 110 150 L 100 150 Q 90 150, 90 160 L 90 440 Q 90 455, 100 455 L 110 455 Q 120 455, 120 465 L 120 560 Q 120 575, 110 580" stroke={S} strokeWidth="2" fill="none" />
      {/* Muffler */}
      <rect x="84" y="350" width="22" height="50" rx="6" stroke={S} strokeWidth="1.5" fill="none" />
      {/* Catalytic converter */}
      <rect x="84" y="180" width="20" height="30" rx="5" stroke={S} strokeWidth="1.2" fill="none" />
      {/* Exhaust tip */}
      <circle cx="110" cy="584" r="6" stroke={S} strokeWidth="1.5" fill="none" />
      <circle cx="110" cy="584" r="3" stroke={S} strokeWidth="0.8" fill="none" />

      {/* ── FUEL TANK ──────────────────────────────────────────── */}
      <rect x="170" y="440" width="48" height="38" rx="8" stroke={S} strokeWidth="1.8" fill="none" />
      {/* Filler pipe */}
      <path d="M 218 450 L 226 445 Q 230 443, 230 448 L 230 458 Q 230 463, 226 461 L 218 456" stroke={S} strokeWidth="1" fill="none" />
      {/* Internal baffles */}
      <line x1="185" y1="445" x2="185" y2="473" stroke={S} strokeWidth="0.6" strokeDasharray="3 2" />
      <line x1="200" y1="445" x2="200" y2="473" stroke={S} strokeWidth="0.6" strokeDasharray="3 2" />

      {/* ── SPARE TIRE WELL ────────────────────────────────────── */}
      <circle cx="150" cy="560" r="22" stroke={S} strokeWidth="1" strokeDasharray="4 3" fill="none" />

      {/* ── CLICKABLE ZONE OVERLAYS ────────────────────────────── */}
      {/* Suspension AV */}
      <rect x="55" y="60" width="190" height="75" rx="8"
        fill={zoneColor('suspensionAV')} fillOpacity={zoneOpacity('suspensionAV')}
        onClick={() => onToggleZone('suspensionAV')} cursor="pointer" />
      {/* Soubassement AV */}
      <rect x="70" y="135" width="160" height="55" rx="8"
        fill={zoneColor('soubassementAV')} fillOpacity={zoneOpacity('soubassementAV')}
        onClick={() => onToggleZone('soubassementAV')} cursor="pointer" />
      {/* Plancher */}
      <rect x="70" y="190" width="160" height="70" rx="8"
        fill={zoneColor('plancher')} fillOpacity={zoneOpacity('plancher')}
        onClick={() => onToggleZone('plancher')} cursor="pointer" />
      {/* Transmission */}
      <rect x="100" y="260" width="100" height="80" rx="8"
        fill={zoneColor('transmission')} fillOpacity={zoneOpacity('transmission')}
        onClick={() => onToggleZone('transmission')} cursor="pointer" />
      {/* Differentiel */}
      <rect x="110" y="480" width="80" height="50" rx="8"
        fill={zoneColor('differentiel')} fillOpacity={zoneOpacity('differentiel')}
        onClick={() => onToggleZone('differentiel')} cursor="pointer" />
      {/* Suspension AR */}
      <rect x="55" y="465" width="190" height="75" rx="8"
        fill={zoneColor('suspensionAR')} fillOpacity={zoneOpacity('suspensionAR')}
        onClick={() => onToggleZone('suspensionAR')} cursor="pointer" />
      {/* Echappement */}
      <rect x="78" y="340" width="55" height="75" rx="8"
        fill={zoneColor('echappement')} fillOpacity={zoneOpacity('echappement')}
        onClick={() => onToggleZone('echappement')} cursor="pointer" />
      {/* Reservoir */}
      <rect x="165" y="435" width="60" height="50" rx="8"
        fill={zoneColor('reservoir')} fillOpacity={zoneOpacity('reservoir')}
        onClick={() => onToggleZone('reservoir')} cursor="pointer" />

      {/* ── ZONE LABELS ────────────────────────────────────────── */}
      <text x="150" y="102" textAnchor="middle" fontSize="10" fontWeight="800" fill={S} className="pointer-events-none select-none">Suspension AV</text>
      <text x="150" y="168" textAnchor="middle" fontSize="10" fontWeight="800" fill={S} className="pointer-events-none select-none">SOUBASSEMENT AV</text>
      <text x="150" y="230" textAnchor="middle" fontSize="11" fontWeight="800" fill={S} className="pointer-events-none select-none">PLANCHER</text>
      <text x="150" y="305" textAnchor="middle" fontSize="10" fontWeight="800" fill={S} className="pointer-events-none select-none">TRANSMISSION</text>
      <text x="95" y="382" textAnchor="middle" fontSize="9" fontWeight="800" fill={S} className="pointer-events-none select-none">ECHAP.</text>
      <text x="194" y="462" textAnchor="middle" fontSize="9" fontWeight="800" fill={S} className="pointer-events-none select-none">RESERVOIR</text>
      <text x="150" y="508" textAnchor="middle" fontSize="9" fontWeight="800" fill={S} className="pointer-events-none select-none">DIFF.</text>
      <text x="60" y="510" textAnchor="middle" fontSize="8" fontWeight="800" fill={S} className="pointer-events-none select-none">SUSP. AR</text>
    </svg>
  );
}
