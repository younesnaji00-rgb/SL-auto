import * as React from 'react';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { getStatusTone } from '@/lib/status-colors';
import { cn } from '@/lib/utils';

/**
 * StatusChip — ONE status → status-pair mapping for the whole app
 * (element-specs §11: "the same state always maps to the same pair app-wide
 * (one helper per domain)"; Carbon tag: read-only tags categorise, and
 * colours distinguish categories; dataviz/Carbon notification: status colour
 * always ships with a text label — never colour alone).
 *
 * Tone map (dossier statuses come from `lib/status-colors.getStatusTone`,
 * the canonical 15-label set; the keyword fallbacks cover the other domains
 * the four page-local helpers handled — utilisateurs `Actif/Inactif`,
 * legacy/free-text values):
 *
 *   neutral  Création dossier · Nouveau · (unknown)
 *   info     Planification programmée / expertise · Proposition d'accord (1/2/3)
 *            · "en attente" · "en cours de …" (waiting on someone else)
 *   warning  Chiffrage en cours · "à valider" · "validation"
 *   success  Accord / 2ème / 3ème accord · Accord envoyé · Actif · terminé · clôturé · expertisé
 *   danger   refusé · annulé · rejeté · Inactif · suspendu · bloqué
 *
 * Page agents replace their local `StatusChip` / `statusPair` /
 * `statusChipClass` helpers with this component in a later pass.
 */
export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const DANGER_RE = /refus|annul|rejet|inactif|suspend|bloqu/i;
const SUCCESS_RE = /^actif$|termin|cl[ôo]tur|expertis[ée]/i;
const WARNING_RE = /valid/i;
const INFO_RE = /attente|planif|programm/i;

/** Status label → semantic tone. Exported so lists can colour dots/filters the same way. */
export function statusTone(status: string | null | undefined): StatusTone {
  const s = (status || '').trim();
  if (!s || /^nouveau$/i.test(s)) return 'neutral';
  const canonical = getStatusTone(s);
  if (canonical !== 'neutral') return canonical;
  if (DANGER_RE.test(s)) return 'danger';
  if (SUCCESS_RE.test(s)) return 'success';
  if (WARNING_RE.test(s)) return 'warning';
  if (INFO_RE.test(s)) return 'info';
  return 'neutral';
}

export interface StatusChipProps extends Omit<BadgeProps, 'variant' | 'children'> {
  /** Raw status label — rendered as-is (the label IS the state). */
  status: string | null | undefined;
  /** Optional 12 px leading icon (Badge sizes it). */
  icon?: React.ReactNode;
  /** Text shown when `status` is empty. */
  fallback?: string;
}

/** 11 px / 500 status pill on the matching status pair, label always visible. */
export function StatusChip({ status, icon, fallback = 'Nouveau', className, ...props }: StatusChipProps) {
  const label = (status || '').trim() || fallback;
  return (
    <Badge variant={statusTone(label)} className={cn('max-w-full', className)} title={label} {...props}>
      {icon}
      <span className="truncate">{label}</span>
    </Badge>
  );
}

export default StatusChip;
