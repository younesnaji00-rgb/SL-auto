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
 */
import React from 'react';
import { Svg, Path, Line, Ellipse, Rect, Text as SvgText, G } from '@react-pdf/renderer';

const S = '#1e293b'; // stroke colour — matches the editor
const HILITE = '#dc2626'; // red zone fill — matches the editor
const ASPECT = 300 / 620; // width / height of the viewBox

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
  const zc = (k: string) => (z[k] ? HILITE : 'none');
  const zo = (k: string) => (z[k] ? hiliteOpacity : 0);
  const lbl = (size: number) => ({ fontSize: size, fontFamily: 'Helvetica-Bold' as const });

  return (
    <Svg viewBox="0 0 300 620" width={w} height={height}>
      {/* ── BODY OUTLINE ── */}
      <Path
        d="M 95 52 Q 95 28, 115 20 L 185 20 Q 205 28, 205 52 L 210 75 Q 218 95, 224 120 L 228 155 Q 232 185, 232 220 L 232 310 Q 232 400, 228 440 L 224 475 Q 218 500, 210 520 L 205 548 Q 205 572, 185 580 L 115 580 Q 95 572, 95 548 L 90 520 Q 82 500, 76 475 L 72 440 Q 68 400, 68 310 L 68 220 Q 68 185, 72 155 L 76 120 Q 82 95, 90 75 Z"
        stroke={S}
        strokeWidth={2.5}
        fill="none"
      />

      {/* ── FRONT BUMPER ── */}
      <Path d="M 105 30 Q 100 30, 97 35 L 95 45" stroke={S} strokeWidth={1.2} fill="none" />
      <Path d="M 195 30 Q 200 30, 203 35 L 205 45" stroke={S} strokeWidth={1.2} fill="none" />
      <Path d="M 100 22 Q 150 14, 200 22" stroke={S} strokeWidth={1} fill="none" />
      <Path d="M 120 26 L 180 26" stroke={S} strokeWidth={0.8} fill="none" />
      <Path d="M 125 30 L 175 30" stroke={S} strokeWidth={0.6} fill="none" />

      {/* ── HEADLIGHTS ── */}
      <Path d="M 82 55 Q 78 42, 95 38 L 105 35 Q 108 48, 95 55 Z" stroke={S} strokeWidth={1.5} fill="none" />
      <Path d="M 218 55 Q 222 42, 205 38 L 195 35 Q 192 48, 205 55 Z" stroke={S} strokeWidth={1.5} fill="none" />
      <Path d="M 88 48 Q 92 43, 100 41" stroke={S} strokeWidth={0.6} fill="none" />
      <Path d="M 212 48 Q 208 43, 200 41" stroke={S} strokeWidth={0.6} fill="none" />

      {/* ── HOOD ── */}
      <Path d="M 120 55 Q 150 50, 180 55" stroke={S} strokeWidth={0.8} fill="none" />
      <Line x1={150} y1={50} x2={150} y2={95} stroke={S} strokeWidth={0.6} />
      <Path d="M 85 95 Q 150 88, 215 95" stroke={S} strokeWidth={1} fill="none" />

      {/* ── WINDSHIELD ── */}
      <Path
        d="M 90 100 Q 92 92, 110 88 L 190 88 Q 208 92, 210 100 L 210 145 Q 208 150, 200 152 L 100 152 Q 92 150, 90 145 Z"
        stroke={S}
        strokeWidth={1.8}
        fill="none"
      />
      <Path d="M 82 100 L 90 100 L 90 152 L 78 155" stroke={S} strokeWidth={1.2} fill="none" />
      <Path d="M 218 100 L 210 100 L 210 152 L 222 155" stroke={S} strokeWidth={1.2} fill="none" />
      <Ellipse cx={150} cy={100} rx={6} ry={3} stroke={S} strokeWidth={0.8} fill="none" />

      {/* ── ROOF ── */}
      <Path d="M 88 155 L 88 430 L 212 430 L 212 155 Z" stroke={S} strokeWidth={0.8} strokeDasharray="5 3" fill="none" />
      <Line x1={92} y1={165} x2={92} y2={420} stroke={S} strokeWidth={0.5} />
      <Line x1={208} y1={165} x2={208} y2={420} stroke={S} strokeWidth={0.5} />

      {/* ── B-PILLAR ── */}
      <Line x1={78} y1={248} x2={92} y2={248} stroke={S} strokeWidth={1.5} />
      <Line x1={208} y1={248} x2={222} y2={248} stroke={S} strokeWidth={1.5} />

      {/* ── SIDE WINDOWS ── */}
      <Path d="M 78 158 L 88 155 L 88 245 L 75 245" stroke={S} strokeWidth={1.2} fill="none" />
      <Path d="M 75 252 L 88 252 L 88 425 L 80 422" stroke={S} strokeWidth={1.2} fill="none" />
      <Path d="M 222 158 L 212 155 L 212 245 L 225 245" stroke={S} strokeWidth={1.2} fill="none" />
      <Path d="M 225 252 L 212 252 L 212 425 L 220 422" stroke={S} strokeWidth={1.2} fill="none" />

      {/* ── REAR WINDOW ── */}
      <Path
        d="M 92 435 Q 92 430, 100 428 L 200 428 Q 208 430, 208 435 L 208 478 Q 208 488, 195 492 L 105 492 Q 92 488, 92 478 Z"
        stroke={S}
        strokeWidth={1.8}
        fill="none"
      />
      <Path d="M 80 425 L 88 430 L 92 435 L 78 440" stroke={S} strokeWidth={1.2} fill="none" />
      <Path d="M 220 425 L 212 430 L 208 435 L 222 440" stroke={S} strokeWidth={1.2} fill="none" />

      {/* ── TRUNK ── */}
      <Path d="M 85 498 Q 150 492, 215 498" stroke={S} strokeWidth={1} fill="none" />
      <Line x1={150} y1={495} x2={150} y2={540} stroke={S} strokeWidth={0.6} />

      {/* ── TAILLIGHTS ── */}
      <Path d="M 78 540 Q 75 555, 95 560 L 105 562 Q 108 548, 95 542 Z" stroke={S} strokeWidth={1.5} fill="none" />
      <Path d="M 222 540 Q 225 555, 205 560 L 195 562 Q 192 548, 205 542 Z" stroke={S} strokeWidth={1.5} fill="none" />
      <Path d="M 84 548 Q 88 552, 100 555" stroke={S} strokeWidth={0.6} fill="none" />
      <Path d="M 216 548 Q 212 552, 200 555" stroke={S} strokeWidth={0.6} fill="none" />

      {/* ── REAR BUMPER ── */}
      <Path d="M 100 575 Q 150 582, 200 575" stroke={S} strokeWidth={1} fill="none" />
      <Path d="M 105 570 Q 150 576, 195 570" stroke={S} strokeWidth={0.6} fill="none" />

      {/* ── SIDE MIRRORS ── */}
      <Path d="M 68 130 Q 56 128, 54 138 L 54 150 Q 56 158, 64 156 L 68 152" stroke={S} strokeWidth={1.8} fill="none" />
      <Path d="M 232 130 Q 244 128, 246 138 L 246 150 Q 244 158, 236 156 L 232 152" stroke={S} strokeWidth={1.8} fill="none" />
      <Line x1={56} y1={135} x2={56} y2={152} stroke={S} strokeWidth={0.6} />
      <Line x1={244} y1={135} x2={244} y2={152} stroke={S} strokeWidth={0.6} />

      {/* ── DOOR HANDLES ── */}
      <Rect x={64} y={200} width={8} height={3} rx={1.5} stroke={S} strokeWidth={0.8} fill="none" />
      <Rect x={64} y={310} width={8} height={3} rx={1.5} stroke={S} strokeWidth={0.8} fill="none" />
      <Rect x={228} y={200} width={8} height={3} rx={1.5} stroke={S} strokeWidth={0.8} fill="none" />
      <Rect x={228} y={310} width={8} height={3} rx={1.5} stroke={S} strokeWidth={0.8} fill="none" />

      {/* ── DOOR LINES ── */}
      <Path d="M 72 120 Q 70 155, 70 190 L 70 245" stroke={S} strokeWidth={1} fill="none" />
      <Path d="M 228 120 Q 230 155, 230 190 L 230 245" stroke={S} strokeWidth={1} fill="none" />
      <Path d="M 70 252 L 70 380 Q 70 420, 76 445" stroke={S} strokeWidth={1} fill="none" />
      <Path d="M 230 252 L 230 380 Q 230 420, 224 445" stroke={S} strokeWidth={1} fill="none" />

      {/* ── WHEEL ARCHES ── */}
      <Path d="M 68 80 Q 55 80, 52 100 L 52 125 Q 55 140, 68 140" stroke={S} strokeWidth={1.5} fill="none" />
      <Path d="M 56 88 L 56 130" stroke={S} strokeWidth={0.6} fill="none" />
      <Path d="M 232 80 Q 245 80, 248 100 L 248 125 Q 245 140, 232 140" stroke={S} strokeWidth={1.5} fill="none" />
      <Path d="M 244 88 L 244 130" stroke={S} strokeWidth={0.6} fill="none" />
      <Path d="M 68 450 Q 55 450, 52 470 L 52 495 Q 55 510, 68 510" stroke={S} strokeWidth={1.5} fill="none" />
      <Path d="M 56 458 L 56 502" stroke={S} strokeWidth={0.6} fill="none" />
      <Path d="M 232 450 Q 245 450, 248 470 L 248 495 Q 245 510, 232 510" stroke={S} strokeWidth={1.5} fill="none" />
      <Path d="M 244 458 L 244 502" stroke={S} strokeWidth={0.6} fill="none" />

      {/* ── ZONE HIGHLIGHTS (driven by pointsChoc) ── */}
      <Rect x={80} y={16} width={140} height={75} rx={10} fill={zc('AV')} fillOpacity={zo('AV')} />
      <Rect x={80} y={520} width={140} height={60} rx={10} fill={zc('AR')} fillOpacity={zo('AR')} />
      <Rect x={50} y={55} width={35} height={95} rx={6} fill={zc('AVG')} fillOpacity={zo('AVG')} />
      <Rect x={215} y={55} width={35} height={95} rx={6} fill={zc('AVD')} fillOpacity={zo('AVD')} />
      <Rect x={50} y={440} width={35} height={90} rx={6} fill={zc('ARG')} fillOpacity={zo('ARG')} />
      <Rect x={215} y={440} width={35} height={90} rx={6} fill={zc('ARD')} fillOpacity={zo('ARD')} />
      <Rect x={50} y={150} width={30} height={290} rx={5} fill={zc('LATG')} fillOpacity={zo('LATG')} />
      <Rect x={220} y={150} width={30} height={290} rx={5} fill={zc('LATD')} fillOpacity={zo('LATD')} />
      <Rect x={88} y={155} width={124} height={275} rx={6} fill={zc('Toit')} fillOpacity={zo('Toit')} />

      {/* ── ZONE LABELS ── */}
      <SvgText x={150} y={62} textAnchor="middle" fill={S} style={lbl(13)}>AV</SvgText>
      <SvgText x={150} y={558} textAnchor="middle" fill={S} style={lbl(13)}>AR</SvgText>
      <SvgText x={63} y={105} textAnchor="middle" fill={S} style={lbl(11)}>AVG</SvgText>
      <SvgText x={237} y={105} textAnchor="middle" fill={S} style={lbl(11)}>AVD</SvgText>
      <SvgText x={63} y={490} textAnchor="middle" fill={S} style={lbl(11)}>ARG</SvgText>
      <SvgText x={237} y={490} textAnchor="middle" fill={S} style={lbl(11)}>ARD</SvgText>
      <G transform="rotate(-90 58 300)">
        <SvgText x={58} y={300} textAnchor="middle" fill={S} style={lbl(10)}>LATG</SvgText>
      </G>
      <G transform="rotate(90 242 300)">
        <SvgText x={242} y={300} textAnchor="middle" fill={S} style={lbl(10)}>LATD</SvgText>
      </G>
      <SvgText x={150} y={298} textAnchor="middle" fill={S} style={lbl(13)}>TOIT</SvgText>
    </Svg>
  );
}
