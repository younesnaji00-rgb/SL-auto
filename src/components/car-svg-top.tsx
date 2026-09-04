'use client';

import React from 'react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

interface CarSvgTopProps {
  zones: Record<string, boolean>;
  onToggleZone: (zone: string) => void;
  className?: string;
}

/**
 * Car top (plan) view — technical line-art of a modern sedan.
 *
 * Front of the car is at the TOP of the drawing (AV), rear at the bottom (AR).
 * Left of the drawing = left of the vehicle (AVG / LATG / ARG, small x).
 *
 * viewBox 0 0 300 620 — the PDF port (`lib/rapport-car-pdf.tsx`) and the raster
 * fallback (`lib/rapport-car.ts`) mirror this geometry exactly; change all three
 * together.
 *
 * Zone ids: AV, AR, AVG, AVD, ARG, ARD, LATG, LATD, Toit
 */

const HILITE = '#dc2626';

// ── Geometry (all coordinates absolute, right side = mirror of left about x=150) ──

/** Outer silhouette: 1.85 m × 4.6 m sedan → x 38–262, y 30–600 (wheel-arch bulges at y≈142 / 486). */
const BODY =
  'M 150 30 L 200 31 C 228 32, 246 38, 250 56 C 254 72, 256 88, 257 102 C 259 115, 262 128, 262 142 ' +
  'C 262 156, 259 172, 258 188 C 259 260, 259 360, 258 438 C 259 452, 262 468, 262 486 C 262 502, 259 518, 256 532 ' +
  'C 254 550, 251 566, 246 580 C 242 594, 226 599, 200 600 L 100 600 C 74 599, 58 594, 54 580 C 49 566, 46 550, 44 532 ' +
  'C 41 518, 38 502, 38 486 C 38 468, 41 452, 42 438 C 41 360, 41 260, 42 188 C 41 172, 38 156, 38 142 ' +
  'C 38 128, 41 115, 43 102 C 44 88, 46 72, 50 56 C 54 38, 72 32, 100 31 Z';

/** Glazing (drawn with a faint tint so the greenhouse reads). */
const GLASS: string[] = [
  // windshield
  'M 66 156 C 110 152, 190 152, 234 156 L 218 218 C 190 215, 110 215, 82 218 Z',
  // rear window
  'M 82 402 C 110 405, 190 405, 218 402 L 234 462 C 190 466, 110 466, 66 462 Z',
  // side windows (front / rear, left then right)
  'M 58 164 L 76 222 L 76 318 L 57 318 Z',
  'M 57 318 L 76 318 L 76 400 L 58 458 Z',
  'M 242 164 L 224 222 L 224 318 L 243 318 Z',
  'M 243 318 L 224 318 L 224 400 L 242 458 Z',
];

/** Wing mirrors (protrude beyond the silhouette at the A-pillar base). */
const MIRRORS: string[] = [
  'M 42 172 C 32 170, 25 174, 25 182 L 25 190 C 25 197, 32 199, 42 195 Z',
  'M 258 172 C 268 170, 275 174, 275 182 L 275 190 C 275 197, 268 199, 258 195 Z',
];

/** Secondary panel lines — 1px. */
const LINES_1: string[] = [
  // headlights (swept back along the wings) + taillights
  'M 102 42 C 80 40, 62 42, 54 52 C 48 62, 46 74, 48 84 L 60 82 C 64 70, 74 60, 94 54 Z',
  'M 198 42 C 220 40, 238 42, 246 52 C 252 62, 254 74, 252 84 L 240 82 C 236 70, 226 60, 206 54 Z',
  'M 102 552 C 78 550, 60 552, 54 560 C 51 566, 52 574, 56 580 L 68 578 C 70 568, 80 560, 100 560 Z',
  'M 198 552 C 222 550, 240 552, 246 560 C 249 566, 248 574, 244 580 L 232 578 C 230 568, 220 560, 200 560 Z',
  // hood leading edge, cowl (hood / windshield shut line)
  'M 104 58 C 120 55, 180 55, 196 58',
  'M 64 152 C 100 148, 200 148, 236 152',
  // hood ↔ wing shut lines
  'M 60 84 C 64 110, 66 130, 64 152',
  'M 240 84 C 236 110, 234 130, 236 152',
  // roof panel
  'M 82 218 C 110 215, 190 215, 218 218 L 224 222 L 224 400 L 218 402 C 190 405, 110 405, 82 402 L 76 400 L 76 222 Z',
  // A-pillars (outer / inner edge), C-pillars
  'M 58 164 L 76 222', 'M 66 156 L 82 218',
  'M 242 164 L 224 222', 'M 234 156 L 218 218',
  'M 76 400 L 58 458', 'M 82 402 L 66 462',
  'M 224 400 L 242 458', 'M 218 402 L 234 462',
  // belt lines (window sills seen from above)
  'M 58 164 C 57 260, 57 360, 58 458',
  'M 242 164 C 243 260, 243 360, 242 458',
  // B-pillars
  'M 58 318 L 76 318', 'M 242 318 L 224 318',
  // door shut lines (front edge / B-pillar / rear edge) across the shoulder
  'M 42 190 L 58 190', 'M 41 318 L 58 318', 'M 42 442 L 60 442',
  'M 258 190 L 242 190', 'M 259 318 L 242 318', 'M 258 442 L 240 442',
  // wheel-arch creases
  'M 44 104 C 50 118, 52 162, 46 186', 'M 256 104 C 250 118, 248 162, 254 186',
  'M 44 448 C 50 462, 52 508, 46 530', 'M 256 448 C 250 462, 248 508, 254 530',
  // trunk lid shut lines + trunk rear edge + rear bumper top edge
  'M 62 466 C 58 500, 56 530, 60 548', 'M 238 466 C 242 500, 244 530, 240 548',
  'M 60 548 C 100 552, 200 552, 240 548',
  'M 58 584 C 100 588, 200 588, 242 584',
];

/** Fine details — 0.75px. */
const LINES_075: string[] = [
  // hood centre crease + power-dome creases
  'M 150 66 L 150 146',
  'M 118 66 C 116 100, 116 130, 120 148', 'M 182 66 C 184 100, 184 130, 180 148',
  // lamp inner details
  'M 58 74 C 62 64, 70 58, 84 54', 'M 242 74 C 238 64, 230 58, 216 54',
  'M 58 570 C 62 564, 70 560, 84 558', 'M 242 570 C 238 564, 230 560, 216 558',
  // grille slats
  'M 114 41 L 186 41', 'M 114 45 L 186 45',
  // wipers
  'M 100 161 L 142 158', 'M 200 161 L 158 158',
  // mirror glass
  'M 30 178 L 30 192', 'M 270 178 L 270 192',
  // door handles
  'M 46 300 L 54 300', 'M 46 425 L 54 425', 'M 254 300 L 246 300', 'M 254 425 L 246 425',
];

interface ZoneDef {
  id: string;
  d: string;
  label: string;
  x: number;
  y: number;
  rotate?: number;
}

/** Closed zone paths tile the real body regions (no overlaps). */
const ZONES: ZoneDef[] = [
  {
    id: 'AV',
    d: 'M 100 31 L 200 31 L 200 50 C 224 56, 236 68, 240 84 L 240 100 C 200 94, 100 94, 60 100 L 60 84 C 64 68, 76 56, 100 50 Z',
    label: 'AV', x: 150, y: 80,
  },
  {
    id: 'AVG',
    d: 'M 100 31 C 72 32, 54 38, 50 56 C 46 72, 44 88, 43 102 C 41 115, 38 128, 38 142 C 38 156, 41 172, 42 190 L 62 190 L 64 152 C 66 130, 64 110, 60 84 C 64 68, 76 56, 100 50 Z',
    label: 'AVG', x: 51, y: 130, rotate: -90,
  },
  {
    id: 'AVD',
    d: 'M 200 31 C 228 32, 246 38, 250 56 C 254 72, 256 88, 257 102 C 259 115, 262 128, 262 142 C 262 156, 259 172, 258 190 L 238 190 L 236 152 C 234 130, 236 110, 240 84 C 236 68, 224 56, 200 50 Z',
    label: 'AVD', x: 249, y: 130, rotate: 90,
  },
  {
    id: 'LATG',
    d: 'M 42 190 L 60 190 L 76 222 L 76 400 L 63 442 L 42 442 C 41 360, 41 260, 42 190 Z',
    label: 'LATG', x: 50, y: 254, rotate: -90,
  },
  {
    id: 'LATD',
    d: 'M 258 190 L 240 190 L 224 222 L 224 400 L 237 442 L 258 442 C 259 360, 259 260, 258 190 Z',
    label: 'LATD', x: 250, y: 254, rotate: 90,
  },
  {
    id: 'Toit',
    d: 'M 82 218 C 110 215, 190 215, 218 218 L 224 222 L 224 400 L 218 402 C 190 405, 110 405, 82 402 L 76 400 L 76 222 Z',
    label: 'TOIT', x: 150, y: 314,
  },
  {
    id: 'ARG',
    d: 'M 42 442 L 63 442 L 58 458 L 62 466 C 58 500, 56 530, 60 548 L 68 580 L 100 600 C 74 599, 58 594, 54 580 C 49 566, 46 550, 44 532 C 41 518, 38 502, 38 486 C 38 468, 41 452, 42 442 Z',
    label: 'ARG', x: 51, y: 500, rotate: -90,
  },
  {
    id: 'ARD',
    d: 'M 258 442 L 237 442 L 242 458 L 238 466 C 242 500, 244 530, 240 548 L 232 580 L 200 600 C 226 599, 242 594, 246 580 C 251 566, 254 550, 256 532 C 259 518, 262 502, 262 486 C 262 468, 259 452, 258 442 Z',
    label: 'ARD', x: 249, y: 500, rotate: 90,
  },
  {
    id: 'AR',
    d: 'M 66 462 C 110 466, 190 466, 234 462 L 238 466 C 242 500, 244 530, 240 548 L 232 580 L 200 600 L 100 600 L 68 580 L 60 548 C 56 530, 58 500, 62 466 Z',
    label: 'AR', x: 150, y: 512,
  },
];

export default function CarSvgTop({ zones, onToggleZone, className }: CarSvgTopProps) {
  const t = useT();
  const stroke = {
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <svg
      viewBox="0 0 300 620"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={t('Vue de dessus du véhicule — points de choc')}
      className={cn('text-foreground', className)}
      style={{ width: '100%', maxWidth: 280, height: 'auto' }}
    >
      {/* ── Body ── */}
      <path d={BODY} {...stroke} strokeWidth={2} fill="hsl(var(--muted))" fillOpacity={0.4} vectorEffect="non-scaling-stroke" />
      {MIRRORS.map((d) => (
        <path key={d} d={d} {...stroke} strokeWidth={1.5} fill="hsl(var(--muted))" fillOpacity={0.4} />
      ))}

      {/* ── Glazing ── */}
      {GLASS.map((d) => (
        <path key={d} d={d} fill="currentColor" fillOpacity={0.06} />
      ))}

      {/* ── Grille, plate recess, antenna ── */}
      <rect x={110} y={36} width={80} height={14} rx={4} {...stroke} strokeWidth={1} />
      <rect x={128} y={587} width={44} height={9} rx={1.5} {...stroke} strokeWidth={0.75} />
      <ellipse cx={150} cy={390} rx={3} ry={7} {...stroke} strokeWidth={0.75} fill="currentColor" fillOpacity={0.08} />

      {/* ── Panel lines ── */}
      {LINES_1.map((d) => (
        <path key={d} d={d} {...stroke} strokeWidth={1} />
      ))}
      {LINES_075.map((d) => (
        <path key={d} d={d} {...stroke} strokeWidth={0.75} />
      ))}

      {/* ── Clickable zones (above the line art) ── */}
      {ZONES.map(({ id, d }) => {
        const on = !!zones[id];
        return (
          <path
            key={id}
            d={d}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={`Zone ${id}`}
            className={cn(
              'cursor-pointer outline-none transition-[fill] focus-visible:stroke-primary',
              !on && 'hover:fill-primary/10',
            )}
            fill={on ? HILITE : 'transparent'}
            fillOpacity={on ? 0.35 : 1}
            stroke={on ? HILITE : 'none'}
            strokeWidth={1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="all"
            onClick={() => onToggleZone(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleZone(id);
              }
            }}
          />
        );
      })}

      {/* ── Labels ── */}
      {ZONES.map(({ id, label, x, y, rotate }) => (
        <text
          key={id}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fontWeight={700}
          letterSpacing={0.5}
          fill="currentColor"
          opacity={0.7}
          stroke="hsl(var(--background))"
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
          transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
          className="pointer-events-none select-none uppercase"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}
