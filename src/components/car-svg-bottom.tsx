'use client';

import React from 'react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

interface CarSvgBottomProps {
  zones: Record<string, boolean>;
  onToggleZone: (zone: string) => void;
  className?: string;
}

/**
 * Car underside view — technical line-art of a sedan seen from below
 * (front at the TOP: front axle y≈150, rear axle y≈500, viewBox 0 0 300 640).
 *
 * Layout: chassis rails, front / rear subframes, longitudinal engine + gearbox,
 * two-piece prop shaft with centre bearing, rear differential and half-shafts,
 * exhaust line (catalyst → muffler → tail pipe) down the right side, fuel tank
 * in front of the rear axle on the left, four tyres with tread hatching.
 *
 * Zone ids: suspensionAV, soubassementAV, plancher, transmission, differentiel,
 * suspensionAR, echappement, reservoir
 */

const HILITE = '#dc2626';
const MUTED = 'hsl(var(--muted))';

const BODY =
  'M 150 30 L 200 31 C 228 32, 246 38, 250 56 C 254 74, 256 92, 257 108 C 259 122, 262 136, 262 150 ' +
  'C 262 164, 259 180, 258 196 C 259 280, 259 370, 258 452 C 259 466, 262 484, 262 500 C 262 516, 259 532, 256 548 ' +
  'C 254 566, 251 584, 246 598 C 242 613, 226 619, 200 620 L 100 620 C 74 619, 58 613, 54 598 C 49 584, 46 566, 44 548 ' +
  'C 41 532, 38 516, 38 500 C 38 484, 41 466, 42 452 C 41 370, 41 280, 42 196 C 41 180, 38 164, 38 150 ' +
  'C 38 136, 41 122, 43 108 C 44 92, 46 74, 50 56 C 54 38, 72 32, 100 31 Z';

interface ZoneDef {
  id: string;
  d: string;
  labels: { text: string; x: number; y: number; rotate?: number; size?: number }[];
}

const ZONES: ZoneDef[] = [
  {
    id: 'soubassementAV',
    d: 'M 100 32 L 200 32 C 228 33, 246 39, 250 58 L 254 98 L 188 98 L 188 148 L 112 148 L 112 98 L 46 98 L 50 58 C 54 39, 72 33, 100 32 Z',
    labels: [{ text: 'Soubassement AV', x: 150, y: 50 }],
  },
  {
    id: 'suspensionAV',
    d: 'M 40 100 L 112 100 L 112 208 L 40 208 Z M 260 100 L 188 100 L 188 208 L 260 208 Z',
    labels: [
      { text: 'Susp. AV', x: 84, y: 202 },
      { text: 'Susp. AV', x: 216, y: 202 },
    ],
  },
  {
    id: 'plancher',
    d: 'M 44 210 L 136 210 L 136 386 L 44 386 Z M 256 210 L 164 210 L 164 386 L 256 386 Z',
    labels: [
      { text: 'Plancher', x: 67, y: 298, rotate: -90 },
      { text: 'Plancher', x: 233, y: 298, rotate: 90 },
    ],
  },
  {
    id: 'transmission',
    d: 'M 128 150 L 172 150 L 172 250 L 160 264 L 160 476 L 140 476 L 140 264 L 128 250 Z',
    labels: [{ text: 'Transmission', x: 150, y: 330, rotate: -90 }],
  },
  {
    id: 'reservoir',
    d: 'M 58 386 L 134 386 L 134 446 L 58 446 Z',
    labels: [{ text: 'Réservoir', x: 96, y: 418 }],
  },
  {
    id: 'differentiel',
    d: 'M 104 476 L 196 476 L 196 526 L 104 526 Z',
    labels: [{ text: 'Différentiel', x: 150, y: 501, size: 8 }],
  },
  {
    id: 'suspensionAR',
    d: 'M 40 448 L 104 448 L 104 556 L 40 556 Z M 260 448 L 196 448 L 196 556 L 260 556 Z',
    labels: [
      { text: 'Susp. AR', x: 84, y: 550 },
      { text: 'Susp. AR', x: 216, y: 550 },
    ],
  },
  {
    // drawn last: sits over the right floor lobe, like the real pipe does
    id: 'echappement',
    d: 'M 172 150 L 188 150 L 188 208 L 196 208 L 196 530 L 206 536 L 206 596 L 218 610 L 206 618 L 194 606 L 168 598 L 168 536 L 172 530 Z',
    labels: [{ text: 'Échappement', x: 197, y: 330, rotate: -90 }],
  },
];

type StrokeProps = { stroke: string; strokeLinecap: 'round'; strokeLinejoin: 'round' };

function Tyre({ x, y, stroke }: { x: number; y: number; stroke: StrokeProps }) {
  const treads = [8, 16, 24, 32, 40, 48, 56, 64].map((dy) => y + dy);
  return (
    <g>
      <rect x={x} y={y} width={26} height={74} rx={4} {...stroke} strokeWidth={1.25} fill="currentColor" fillOpacity={0.12} />
      {treads.map((ty) => (
        <line key={ty} x1={x + 3} y1={ty} x2={x + 23} y2={ty} {...stroke} strokeWidth={0.75} strokeOpacity={0.6} />
      ))}
      <line x1={x + 13} y1={y + 3} x2={x + 13} y2={y + 71} {...stroke} strokeWidth={0.75} strokeOpacity={0.6} />
    </g>
  );
}

export default function CarSvgBottom({ zones, onToggleZone, className }: CarSvgBottomProps) {
  const t = useT();
  const stroke = {
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const part = { ...stroke, strokeWidth: 1, fill: MUTED }; // solid component (occludes what is under it)

  return (
    <svg
      viewBox="0 0 300 640"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={t('Vue de dessous du véhicule — points de choc')}
      className={cn('text-foreground', className)}
      style={{ width: '100%', maxWidth: 280, height: 'auto' }}
    >
      {/* ── Body / floor pan ── */}
      <path d={BODY} {...stroke} strokeWidth={2} fill={MUTED} fillOpacity={0.4} vectorEffect="non-scaling-stroke" />
      {/* bumper valances */}
      <path d="M 70 40 C 100 36, 200 36, 230 40" {...stroke} strokeWidth={1} />
      <path d="M 66 612 C 100 616, 200 616, 234 612" {...stroke} strokeWidth={1} />
      {/* sills + jacking points */}
      <line x1={50} y1={196} x2={50} y2={452} {...stroke} strokeWidth={1} />
      <line x1={250} y1={196} x2={250} y2={452} {...stroke} strokeWidth={1} />
      {[226, 418].map((jy) => (
        <React.Fragment key={jy}>
          <rect x={46} y={jy} width={8} height={6} rx={1} {...stroke} strokeWidth={0.75} />
          <rect x={246} y={jy} width={8} height={6} rx={1} {...stroke} strokeWidth={0.75} />
        </React.Fragment>
      ))}
      {/* floor cross members */}
      <line x1={92} y1={250} x2={208} y2={250} {...stroke} strokeWidth={1} strokeDasharray="6 3" />
      <line x1={92} y1={330} x2={208} y2={330} {...stroke} strokeWidth={1} strokeDasharray="6 3" />
      {/* spare wheel well */}
      <circle cx={150} cy={574} r={24} {...stroke} strokeWidth={0.75} strokeDasharray="4 3" />

      {/* ── Chassis rails + cross members ── */}
      <rect x={84} y={66} width={8} height={540} rx={1} {...part} />
      <rect x={208} y={66} width={8} height={540} rx={1} {...part} />
      <rect x={66} y={58} width={168} height={10} rx={2} {...part} />
      <rect x={78} y={598} width={144} height={8} rx={2} {...part} />

      {/* ── Front subframe (H-frame) ── */}
      <rect x={78} y={118} width={12} height={78} rx={2} {...part} />
      <rect x={210} y={118} width={12} height={78} rx={2} {...part} />
      <rect x={78} y={184} width={144} height={12} rx={2} {...part} />
      {/* lower wishbones + ball joints */}
      <path d="M 90 128 L 66 150 L 90 172 Z" {...part} />
      <path d="M 210 128 L 234 150 L 210 172 Z" {...part} />
      <circle cx={66} cy={150} r={3} {...stroke} strokeWidth={0.75} fill={MUTED} />
      <circle cx={234} cy={150} r={3} {...stroke} strokeWidth={0.75} fill={MUTED} />

      {/* ── Rear subframe + control arms ── */}
      <rect x={78} y={456} width={12} height={88} rx={2} {...part} />
      <rect x={210} y={456} width={12} height={88} rx={2} {...part} />
      <rect x={78} y={456} width={144} height={12} rx={2} {...part} />
      <rect x={78} y={532} width={144} height={12} rx={2} {...part} />
      <path d="M 90 480 L 66 500" {...stroke} strokeWidth={1.5} />
      <path d="M 90 520 L 66 500" {...stroke} strokeWidth={1.5} />
      <path d="M 210 480 L 234 500" {...stroke} strokeWidth={1.5} />
      <path d="M 210 520 L 234 500" {...stroke} strokeWidth={1.5} />

      {/* ── Engine block, sump, steering rack ── */}
      <rect x={112} y={72} width={76} height={74} rx={6} {...part} />
      <line x1={130} y1={78} x2={130} y2={100} {...stroke} strokeWidth={0.75} />
      <line x1={150} y1={78} x2={150} y2={100} {...stroke} strokeWidth={0.75} />
      <line x1={170} y1={78} x2={170} y2={100} {...stroke} strokeWidth={0.75} />
      <rect x={124} y={104} width={52} height={36} rx={8} {...stroke} strokeWidth={0.75} />
      <circle cx={150} cy={128} r={2.5} {...stroke} strokeWidth={0.75} />
      <rect x={100} y={152} width={100} height={10} rx={3} {...part} />
      <path d="M 100 157 L 66 162" {...stroke} strokeWidth={1} />
      <path d="M 200 157 L 234 162" {...stroke} strokeWidth={1} />

      {/* ── Gearbox + prop shaft ── */}
      <path d="M 128 166 L 172 166 L 170 196 C 170 214, 164 226, 160 238 L 160 262 L 140 262 L 140 238 C 136 226, 130 214, 130 196 Z" {...part} />
      <rect x={145} y={262} width={10} height={212} rx={2} {...part} />
      <rect x={141} y={262} width={18} height={10} rx={2} {...part} />
      <rect x={141} y={464} width={18} height={10} rx={2} {...part} />
      <rect x={140} y={376} width={20} height={12} rx={3} {...part} />

      {/* ── Fuel tank (left, ahead of the rear axle) ── */}
      <rect x={62} y={390} width={68} height={56} rx={8} {...part} />
      <line x1={62} y1={402} x2={130} y2={402} {...stroke} strokeWidth={0.75} />
      <line x1={62} y1={436} x2={130} y2={436} {...stroke} strokeWidth={0.75} />
      <path d="M 62 412 C 54 410, 48 416, 46 428" {...stroke} strokeWidth={1} />

      {/* ── Differential + half-shafts ── */}
      <rect x={66} y={495} width={64} height={10} rx={2} {...part} />
      <rect x={170} y={495} width={64} height={10} rx={2} {...part} />
      <rect x={144} y={474} width={12} height={10} rx={2} {...part} />
      <circle cx={150} cy={500} r={20} {...part} strokeWidth={1.25} />
      <circle cx={150} cy={500} r={8} {...stroke} strokeWidth={0.75} />

      {/* ── Exhaust line ── */}
      <path d="M 176 146 L 184 158 L 184 216" {...stroke} strokeWidth={3} strokeOpacity={0.55} />
      <rect x={176} y={216} width={16} height={46} rx={6} {...part} />
      <path d="M 184 262 L 184 540" {...stroke} strokeWidth={3} strokeOpacity={0.55} />
      <rect x={174} y={540} width={28} height={50} rx={9} {...part} />
      <path d="M 194 590 C 194 602, 202 608, 210 612" {...stroke} strokeWidth={3} strokeOpacity={0.55} />
      <circle cx={212} cy={613} r={4} {...stroke} strokeWidth={1} fill={MUTED} />
      <circle cx={212} cy={613} r={2} {...stroke} strokeWidth={0.75} />

      {/* ── Tyres ── */}
      <Tyre x={38} y={113} stroke={stroke} />
      <Tyre x={236} y={113} stroke={stroke} />
      <Tyre x={38} y={463} stroke={stroke} />
      <Tyre x={236} y={463} stroke={stroke} />

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
      {ZONES.flatMap(({ id, labels }) =>
        labels.map(({ text, x, y, rotate, size }, i) => (
          <text
            key={`${id}-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size ?? 9}
            fontWeight={700}
            letterSpacing={0.4}
            fill="currentColor"
            opacity={0.7}
            stroke="hsl(var(--background))"
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke"
            transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
            className="pointer-events-none select-none uppercase"
          >
            {t(text)}
          </text>
        )),
      )}
    </svg>
  );
}
