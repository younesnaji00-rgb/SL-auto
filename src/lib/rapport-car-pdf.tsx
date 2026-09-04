/**
 * Native @react-pdf/renderer rendering of the points-de-choc car (top view).
 *
 * This is a faithful port of the app's editor diagram `components/car-svg-top.tsx`
 * — same viewBox, same geometry, same zone keys (AV/AR/AVG/AVD/ARG/ARD/LATG/
 * LATD/Toit) — rendered with @react-pdf SVG primitives instead of rasterising to
 * a PNG. Because the highlighted zones are driven directly by the dossier's
 * `pointsChoc` map in the same render pass, the exact zones the user selected in
 * the timeline are GUARANTEED to appear highlighted in the generated rapport
 * (the old canvas → PNG path was browser-only and silently dropped them).
 *
 * Keep the path data in sync with `car-svg-top.tsx` (and `rapport-car.ts`).
 */
import React from 'react';
import { Svg, Path, Rect, Ellipse, Text as SvgText, G } from '@react-pdf/renderer';

const S = '#1e293b'; // stroke colour (PDF has no currentColor)
const PANEL = '#eeece8'; // ≈ hsl(40 15% 92%) — the app's --muted in light mode
const HILITE = '#dc2626'; // red zone fill — matches the editor
const ASPECT = 300 / 620; // width / height of the viewBox

const BODY =
  'M 150 30 L 200 31 C 228 32, 246 38, 250 56 C 254 72, 256 88, 257 102 C 259 115, 262 128, 262 142 ' +
  'C 262 156, 259 172, 258 188 C 259 260, 259 360, 258 438 C 259 452, 262 468, 262 486 C 262 502, 259 518, 256 532 ' +
  'C 254 550, 251 566, 246 580 C 242 594, 226 599, 200 600 L 100 600 C 74 599, 58 594, 54 580 C 49 566, 46 550, 44 532 ' +
  'C 41 518, 38 502, 38 486 C 38 468, 41 452, 42 438 C 41 360, 41 260, 42 188 C 41 172, 38 156, 38 142 ' +
  'C 38 128, 41 115, 43 102 C 44 88, 46 72, 50 56 C 54 38, 72 32, 100 31 Z';

const GLASS: string[] = [
  'M 66 156 C 110 152, 190 152, 234 156 L 218 218 C 190 215, 110 215, 82 218 Z',
  'M 82 402 C 110 405, 190 405, 218 402 L 234 462 C 190 466, 110 466, 66 462 Z',
  'M 58 164 L 76 222 L 76 318 L 57 318 Z',
  'M 57 318 L 76 318 L 76 400 L 58 458 Z',
  'M 242 164 L 224 222 L 224 318 L 243 318 Z',
  'M 243 318 L 224 318 L 224 400 L 242 458 Z',
];

const MIRRORS: string[] = [
  'M 42 172 C 32 170, 25 174, 25 182 L 25 190 C 25 197, 32 199, 42 195 Z',
  'M 258 172 C 268 170, 275 174, 275 182 L 275 190 C 275 197, 268 199, 258 195 Z',
];

const LINES_1: string[] = [
  'M 102 42 C 80 40, 62 42, 54 52 C 48 62, 46 74, 48 84 L 60 82 C 64 70, 74 60, 94 54 Z',
  'M 198 42 C 220 40, 238 42, 246 52 C 252 62, 254 74, 252 84 L 240 82 C 236 70, 226 60, 206 54 Z',
  'M 102 552 C 78 550, 60 552, 54 560 C 51 566, 52 574, 56 580 L 68 578 C 70 568, 80 560, 100 560 Z',
  'M 198 552 C 222 550, 240 552, 246 560 C 249 566, 248 574, 244 580 L 232 578 C 230 568, 220 560, 200 560 Z',
  'M 104 58 C 120 55, 180 55, 196 58',
  'M 64 152 C 100 148, 200 148, 236 152',
  'M 60 84 C 64 110, 66 130, 64 152',
  'M 240 84 C 236 110, 234 130, 236 152',
  'M 82 218 C 110 215, 190 215, 218 218 L 224 222 L 224 400 L 218 402 C 190 405, 110 405, 82 402 L 76 400 L 76 222 Z',
  'M 58 164 L 76 222', 'M 66 156 L 82 218',
  'M 242 164 L 224 222', 'M 234 156 L 218 218',
  'M 76 400 L 58 458', 'M 82 402 L 66 462',
  'M 224 400 L 242 458', 'M 218 402 L 234 462',
  'M 58 164 C 57 260, 57 360, 58 458',
  'M 242 164 C 243 260, 243 360, 242 458',
  'M 58 318 L 76 318', 'M 242 318 L 224 318',
  'M 42 190 L 58 190', 'M 41 318 L 58 318', 'M 42 442 L 60 442',
  'M 258 190 L 242 190', 'M 259 318 L 242 318', 'M 258 442 L 240 442',
  'M 44 104 C 50 118, 52 162, 46 186', 'M 256 104 C 250 118, 248 162, 254 186',
  'M 44 448 C 50 462, 52 508, 46 530', 'M 256 448 C 250 462, 248 508, 254 530',
  'M 62 466 C 58 500, 56 530, 60 548', 'M 238 466 C 242 500, 244 530, 240 548',
  'M 60 548 C 100 552, 200 552, 240 548',
  'M 58 584 C 100 588, 200 588, 242 584',
];

const LINES_075: string[] = [
  'M 150 66 L 150 146',
  'M 118 66 C 116 100, 116 130, 120 148', 'M 182 66 C 184 100, 184 130, 180 148',
  'M 58 74 C 62 64, 70 58, 84 54', 'M 242 74 C 238 64, 230 58, 216 54',
  'M 58 570 C 62 564, 70 560, 84 558', 'M 242 570 C 238 564, 230 560, 216 558',
  'M 114 41 L 186 41', 'M 114 45 L 186 45',
  'M 100 161 L 142 158', 'M 200 161 L 158 158',
  'M 30 178 L 30 192', 'M 270 178 L 270 192',
  'M 46 300 L 54 300', 'M 46 425 L 54 425', 'M 254 300 L 246 300', 'M 254 425 L 246 425',
];

const ZONES: { id: string; d: string; label: string; x: number; y: number; rotate?: number }[] = [
  { id: 'AV', d: 'M 100 31 L 200 31 L 200 50 C 224 56, 236 68, 240 84 L 240 100 C 200 94, 100 94, 60 100 L 60 84 C 64 68, 76 56, 100 50 Z', label: 'AV', x: 150, y: 80 },
  { id: 'AVG', d: 'M 100 31 C 72 32, 54 38, 50 56 C 46 72, 44 88, 43 102 C 41 115, 38 128, 38 142 C 38 156, 41 172, 42 190 L 62 190 L 64 152 C 66 130, 64 110, 60 84 C 64 68, 76 56, 100 50 Z', label: 'AVG', x: 51, y: 130, rotate: -90 },
  { id: 'AVD', d: 'M 200 31 C 228 32, 246 38, 250 56 C 254 72, 256 88, 257 102 C 259 115, 262 128, 262 142 C 262 156, 259 172, 258 190 L 238 190 L 236 152 C 234 130, 236 110, 240 84 C 236 68, 224 56, 200 50 Z', label: 'AVD', x: 249, y: 130, rotate: 90 },
  { id: 'LATG', d: 'M 42 190 L 60 190 L 76 222 L 76 400 L 63 442 L 42 442 C 41 360, 41 260, 42 190 Z', label: 'LATG', x: 50, y: 254, rotate: -90 },
  { id: 'LATD', d: 'M 258 190 L 240 190 L 224 222 L 224 400 L 237 442 L 258 442 C 259 360, 259 260, 258 190 Z', label: 'LATD', x: 250, y: 254, rotate: 90 },
  { id: 'Toit', d: 'M 82 218 C 110 215, 190 215, 218 218 L 224 222 L 224 400 L 218 402 C 190 405, 110 405, 82 402 L 76 400 L 76 222 Z', label: 'TOIT', x: 150, y: 314 },
  { id: 'ARG', d: 'M 42 442 L 63 442 L 58 458 L 62 466 C 58 500, 56 530, 60 548 L 68 580 L 100 600 C 74 599, 58 594, 54 580 C 49 566, 46 550, 44 532 C 41 518, 38 502, 38 486 C 38 468, 41 452, 42 442 Z', label: 'ARG', x: 51, y: 500, rotate: -90 },
  { id: 'ARD', d: 'M 258 442 L 237 442 L 242 458 L 238 466 C 242 500, 244 530, 240 548 L 232 580 L 200 600 C 226 599, 242 594, 246 580 C 251 566, 254 550, 256 532 C 259 518, 262 502, 262 486 C 262 468, 259 452, 258 442 Z', label: 'ARD', x: 249, y: 500, rotate: 90 },
  { id: 'AR', d: 'M 66 462 C 110 466, 190 466, 234 462 L 238 466 C 242 500, 244 530, 240 548 L 232 580 L 200 600 L 100 600 L 68 580 L 60 548 C 56 530, 58 500, 62 466 Z', label: 'AR', x: 150, y: 512 },
];

const line = { stroke: S, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

export function CarTopSvg({
  zones,
  height = 82,
  width,
  hiliteOpacity = 0.42,
}: {
  zones?: Record<string, boolean> | null;
  height?: number;
  width?: number;
  hiliteOpacity?: number;
}) {
  const z = zones || {};
  const w = width ?? Math.round(height * ASPECT * 100) / 100;
  // SVG text is anchored on the baseline; the editor centres labels vertically
  // (dominant-baseline: middle), so nudge the PDF baseline down by ~0.35em.
  const LABEL = 10;
  const dy = LABEL * 0.35;

  return (
    <Svg viewBox="0 0 300 620" width={w} height={height}>
      {/* ── Body ── */}
      <Path d={BODY} {...line} strokeWidth={2} fill={PANEL} fillOpacity={0.6} />
      {MIRRORS.map((d) => (
        <Path key={d} d={d} {...line} strokeWidth={1.5} fill={PANEL} fillOpacity={0.6} />
      ))}

      {/* ── Glazing ── */}
      {GLASS.map((d) => (
        <Path key={d} d={d} fill={S} fillOpacity={0.06} />
      ))}

      {/* ── Grille, plate recess, antenna ── */}
      <Rect x={110} y={36} width={80} height={14} rx={4} {...line} strokeWidth={1} />
      <Rect x={128} y={587} width={44} height={9} rx={1.5} {...line} strokeWidth={0.75} />
      <Ellipse cx={150} cy={390} rx={3} ry={7} {...line} strokeWidth={0.75} fill={S} fillOpacity={0.08} />

      {/* ── Panel lines ── */}
      {LINES_1.map((d) => (
        <Path key={d} d={d} {...line} strokeWidth={1} />
      ))}
      {LINES_075.map((d) => (
        <Path key={d} d={d} {...line} strokeWidth={0.75} />
      ))}

      {/* ── Zone highlights (driven by pointsChoc) ── */}
      {ZONES.map(({ id, d }) =>
        z[id] ? (
          <Path key={id} d={d} fill={HILITE} fillOpacity={hiliteOpacity} stroke={HILITE} strokeWidth={1.5} strokeLinejoin="round" />
        ) : null,
      )}

      {/* ── Labels ── */}
      {ZONES.map(({ id, label, x, y, rotate }) => {
        const text = (
          <SvgText
            key={id}
            x={x}
            y={y + dy}
            textAnchor="middle"
            fill={S}
            fillOpacity={0.7}
            style={{ fontSize: LABEL, fontFamily: 'Helvetica-Bold' }}
          >
            {label}
          </SvgText>
        );
        return rotate ? (
          <G key={id} transform={`rotate(${rotate} ${x} ${y})`}>
            {text}
          </G>
        ) : (
          text
        );
      })}
    </Svg>
  );
}
