'use client';

/**
 * PHONE rendering of « Mes rappels » (mobile redesign 2026-09-14 — Claude
 * Design handoff `Phone.dc.html`, HTML 187–209 / JS 874–877, turn 4c
 * « cartes avec Ouvrir le dossier / Voir le traitement »).
 *
 * The shell's top bar paints the area toggle (Dossiers | Rappels) and this
 * page's inline search (`usePhoneChrome({ search })`). Under it:
 *
 *   ( À traiter 3 ) ( Traités 12 ) ( Envoyés 6 )        ← ScopePills
 *   ┌──────────────────────────────────────────┐
 *   │ SL-25-0412                          09:12 │  ← ref mono · time (terracotta-deep 600 while unread)
 *   │ Karim Benjelloun                          │  ← assuré 15/600, wraps
 *   │ Relancer le garage pour le PV police…     │  ← rappel text 14 px, 2-line clamp, 500 while unread
 *   │ [À traiter]  Salma E.                     │  ← state chip + sender
 *   │ [ 📁 Ouvrir le dossier ] [ ⟲ Voir le traitement ] │
 *   └──────────────────────────────────────────┘
 *
 * Header tap → the existing phone detail screen (`?rappel=`), which is where
 * « Marquer traité » and the session timeline live. « Ouvrir le dossier »
 * runs the page's session handshake (mark read / start session); « Voir le
 * traitement » opens the read-only replay screen (`?replay=`) and is disabled
 * while the rappel has no session yet (nothing to replay) — kept in place so
 * the two buttons stay equal-width.
 *
 * Desktop / tablet never mount this file (page.tsx gates on `useIsPhone`).
 */

import React, { useMemo } from 'react';
import { CheckCircle2, FolderOpen, History, Inbox, Send, SearchX } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { RecordCard, RecordCardActions, RecordCardList, RecordCardListSkeleton } from '@/components/ui/record-card';
import { ScopePills, type ScopePill } from '@/components/ui/scope-pills';
import { usePhoneChrome } from '@/components/layout/page-chrome';
import { dateFnsLocale, useT } from '@/i18n';
import type { Rappel } from '@/hooks/use-rappels';
import { cn } from '@/lib/utils';

export type PhoneRappelScope = 'a-traiter' | 'traites' | 'envoyes';

function toDate(ts: any): Date | null {
  if (!ts) return null;
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

/** Card time (design): « 09:12 » today, « Hier », else « 12 sept. ». */
function whenLabel(ts: any, t: (s: string) => string): string {
  const d = toDate(ts);
  if (!d) return '—';
  try {
    if (isToday(d)) return format(d, 'HH:mm', { locale: dateFnsLocale() });
    if (isYesterday(d)) return t('Hier');
    return format(d, 'd MMM', { locale: dateFnsLocale() });
  } catch {
    return '—';
  }
}

/** Assuré name carried on the rappel (denormalised `dossierData`). */
export function rappelAssureName(r: Rappel): string {
  const a = r.dossierData?.assure;
  if (typeof a === 'string') return a.trim();
  if (a && typeof a === 'object') return `${a.prenom || ''} ${a.nom || ''}`.trim();
  return '';
}

function fold(s: string): string {
  // Strip combining diacritics so « reforme » finds « réforme ».
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Client-side search over ref, rappel text, sender / recipient, assuré. */
export function rappelMatches(r: Rappel, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  const hay = [r.dossierRef, r.dossierId, r.observation, r.senderNom, r.recipientNom, rappelAssureName(r)]
    .filter(Boolean)
    .map((s) => fold(String(s)));
  return hay.some((h) => h.includes(q));
}

export interface PhoneRappelsListProps {
  scope: PhoneRappelScope;
  onScopeChange: (scope: PhoneRappelScope) => void;
  /** Reçus, newest first (the page already sorts both segments). */
  aTraiter: Rappel[];
  traites: Rappel[];
  /** Envoyés, newest first (flat — one card per rappel, not per batch). */
  envoyes: Rappel[];
  loading: boolean;
  sentLoading: boolean;
  recusVisible: boolean;
  envoyesVisible: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  /** Header tap → the phone detail screen. */
  onSelect: (r: Rappel) => void;
  /** « Ouvrir le dossier » on a received rappel (session handshake). */
  onOpenDossier: (r: Rappel) => void;
  /** « Ouvrir le dossier » on a sent rappel (plain navigation). */
  onOpenSentDossier: (r: Rappel) => void;
  /** « Voir le traitement » → the replay screen. */
  onShowReplay: (r: Rappel) => void;
}

export default function PhoneRappelsList({
  scope,
  onScopeChange,
  aTraiter,
  traites,
  envoyes,
  loading,
  sentLoading,
  recusVisible,
  envoyesVisible,
  search,
  onSearchChange,
  onSelect,
  onOpenDossier,
  onOpenSentDossier,
  onShowReplay,
}: PhoneRappelsListProps) {
  const t = useT();

  // Bar chrome: the inline search only. The area segment and its unread count
  // are painted by the shell (phone-top-bar reads useRappels itself).
  usePhoneChrome(
    useMemo(
      () => ({
        search: {
          value: search,
          onChange: onSearchChange,
          placeholder: t('Réf., texte du rappel…'),
          ariaLabel: t('Rechercher un rappel'),
        },
        primaryAction: null,
        secondaryActions: [],
        onSearchFocus: null,
        filters: null,
      }),
      [search, onSearchChange, t],
    ),
  );

  const pills = useMemo<ScopePill[]>(() => {
    const out: ScopePill[] = [];
    if (recusVisible) {
      out.push({ key: 'a-traiter', label: t('À traiter'), count: aTraiter.length, active: scope === 'a-traiter', onClick: () => onScopeChange('a-traiter') });
      out.push({ key: 'traites', label: t('Traités'), count: traites.length, active: scope === 'traites', onClick: () => onScopeChange('traites') });
    }
    if (envoyesVisible) {
      out.push({ key: 'envoyes', label: t('Envoyés'), count: envoyes.length, active: scope === 'envoyes', onClick: () => onScopeChange('envoyes') });
    }
    return out;
  }, [recusVisible, envoyesVisible, scope, aTraiter.length, traites.length, envoyes.length, onScopeChange, t]);

  const isSent = scope === 'envoyes';
  const source = scope === 'a-traiter' ? aTraiter : scope === 'traites' ? traites : envoyes;
  const visible = useMemo(() => source.filter((r) => rappelMatches(r, search)), [source, search]);
  const busy = isSent ? sentLoading : loading;
  const hasQuery = search.trim().length > 0;

  let body: React.ReactNode;
  if (busy) {
    body = <RecordCardListSkeleton count={5} ariaLabel={t('Chargement des rappels')} />;
  } else if (visible.length === 0) {
    if (hasQuery) {
      body = (
        <EmptyState
          icon={<SearchX />}
          title={t('Aucun résultat')}
          description={`${t('Aucun rappel ne correspond à')} « ${search.trim()} ».`}
          dashed={false}
        />
      );
    } else if (isSent) {
      body = (
        <EmptyState
          icon={<Send />}
          title={t('Aucun rappel envoyé')}
          description={t('Les rappels que vous envoyez depuis un dossier apparaîtront ici.')}
          dashed={false}
        />
      );
    } else if (scope === 'a-traiter') {
      body = aTraiter.length + traites.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={t('Aucun rappel reçu')}
          description={t('Les rappels envoyés depuis un dossier apparaîtront ici.')}
          dashed={false}
        />
      ) : (
        <EmptyState
          icon={<CheckCircle2 />}
          title={t('Tout est traité')}
          description={t('Aucun rappel en attente — les nouveaux apparaîtront ici.')}
          dashed={false}
        />
      );
    } else {
      body = (
        <EmptyState
          icon={<Inbox />}
          title={t('Aucun rappel traité')}
          description={t('Les rappels marqués comme traités apparaîtront ici.')}
          dashed={false}
        />
      );
    }
  } else {
    body = (
      <RecordCardList ariaLabel={isSent ? t('Rappels envoyés') : t('Rappels reçus')} dataTour={isSent ? 'rap-envoyes-table' : 'rap-recus-table'}>
        {visible.map((r) => {
          const treated = !!r.resolvedAt;
          const unread = !isSent && !r.read && !treated;
          const assure = rappelAssureName(r);
          const ref = r.dossierRef || r.dossierId;
          // Reçus: « À traiter » (warning) / « Traité » (success) — the queue
          // states. Envoyés: the sender wants to know whether it was seen, so
          // the desktop Envoyés triplet (Nouveau / Lu / Traité) is kept.
          const chip = treated ? (
            <Badge variant="success">{t('Traité')}</Badge>
          ) : isSent ? (
            r.read ? <Badge variant="neutral">{t('Lu')}</Badge> : <Badge variant="info">{t('Nouveau')}</Badge>
          ) : (
            <Badge variant="warning">{t('À traiter')}</Badge>
          );
          const from = isSent ? (r.recipientNom ? `${t('Pour')} ${r.recipientNom}` : null) : r.senderNom || null;
          return (
            <RecordCard
              key={r.id}
              recordId={r.id}
              dataTour="rap-row-ref"
              id={assure ? ref : undefined}
              title={assure || ref}
              trailing={
                <span className={cn('text-[12px] leading-4 tabular-nums', unread ? 'font-semibold text-tertiary-deep' : 'text-ink-3')}>
                  {whenLabel(r.createdAt, t)}
                </span>
              }
              unread={unread}
              onClick={() => onSelect(r)}
              ariaLabel={`${ref} — ${r.observation || ''}`.trim()}
              footer={
                <RecordCardActions>
                  {/* 36 px rim buttons (design) — the primitive's phone floor
                      (44) is lowered here on purpose: two side-by-side inside a card. */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 px-2 text-[13px] font-medium max-md:min-h-9 [&_svg]:size-5"
                    onClick={() => (isSent ? onOpenSentDossier(r) : onOpenDossier(r))}
                  >
                    <FolderOpen aria-hidden />
                    {t('Ouvrir le dossier')}
                  </Button>
                  {/* Always present so the two buttons keep equal widths (design
                      197–200); without a session there is nothing to replay → disabled. */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 px-2 text-[13px] font-medium max-md:min-h-9 [&_svg]:size-5"
                    data-tour="rap-detail-btn"
                    disabled={!r.sessionId}
                    aria-label={r.sessionId ? undefined : t('Aucun traitement')}
                    onClick={() => onShowReplay(r)}
                  >
                    <History aria-hidden />
                    {t('Voir le traitement')}
                  </Button>
                </RecordCardActions>
              }
            >
              {/* Rappel text + state row: a full-width block under the header
                  (design 197–200), flush with the card padding so the 2-line
                  clamp uses the whole card width. The header button above
                  carries the tap (and the text in its aria-label). */}
              <div className="-mt-1.5 flex flex-col gap-1 px-3.5 pb-2.5">
                <p
                  className={cn(
                    'm-0 overflow-hidden text-[14px] leading-[1.4] text-ink [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]',
                    unread ? 'font-medium' : 'font-normal',
                  )}
                >
                  {r.observation || <span className="text-ink-4">—</span>}
                </p>
                <div className="flex min-w-0 items-center gap-2 text-[12px] leading-4 text-ink-3">
                  {chip}
                  {from && <span className="min-w-0 truncate">{from}</span>}
                </div>
              </div>
            </RecordCard>
          );
        })}
      </RecordCardList>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Not sticky, not bled under the bar (brief: flush=false); the -mx-4
          only cancels the page gutter so the pills sit on the same 16 px
          line as the cards (design: padding 10px 16px). */}
      {pills.length > 0 && (
        <ScopePills pills={pills} sticky={false} flush={false} className="-mx-4" ariaLabel={t('État des rappels')} dataTour="rap-tabs" />
      )}
      {body}
    </div>
  );
}
