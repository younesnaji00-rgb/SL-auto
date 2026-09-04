'use client';

/**
 * Mission peek panel — the researched answer to row-click-only navigation
 * (terrain research 2026-09-03, terrain-table-alternatives.md: NN/g non-modal
 * panels for single-record view; Pencil & Paper ranks the sidebar panel "the
 * most scalable option"; GitLab drawer rule — the primary task stays on the
 * queue). Read-only summary + quick actions; « Ouvrir le dossier » keeps the
 * full page one click away. Audit metadata (Créé le / Créé par / Assigné par)
 * lives HERE, not in the table row — no fetched source shows audit fields in
 * a queue row.
 */

import * as React from 'react';
import { format } from 'date-fns';
import { MessageCircle, Navigation, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  CheckinButton, EnRouteButton, ReassignPopover, mapsSearchUrl, telHref, waHref,
} from './mission-quick-actions';
import { useT, dateFnsLocale } from '@/i18n';

type PhotoCategory = 'avant' | 'en_cours' | 'apres';

export interface PeekMission {
  dossierId: string;
  id: string;
  dossierNom?: string;
  assureNom?: string;
  compagnie?: string;
  agentTerrain: string;
  agentTerrainUid?: string | null;
  typeMission: string;
  dateRDV: any;
  createdAt: any;
  zone: string;
  adresse: string;
  observation: string;
  createdByName?: string;
  createdByRole?: string;
  modifiedByName?: string;
  checkinAt?: any;
}

function toDate(ts: any): Date | null {
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date(ts);
}

function formatFull(ts: any): string | null {
  const d = toDate(ts);
  if (!d) return null;
  try { return format(d, "d MMM yyyy HH:mm", { locale: dateFnsLocale() }); } catch { return null; }
}

const CATEGORY_LABELS: Array<{ key: PhotoCategory; label: string }> = [
  { key: 'avant', label: 'Avant' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'apres', label: 'Après' },
];

function missionCategory(typeMission: string): PhotoCategory {
  const n = typeMission === 'Apres' ? 'Après' : typeMission;
  if (n === 'En cours') return 'en_cours';
  if (n === 'Après') return 'apres';
  return 'avant';
}

/** Quiet label over semibold value (element-specs §10). */
function Fact({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2 min-w-0' : 'min-w-0'}>
      <dt className="t-label">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

const Empty = () => <span className="font-normal text-ink-4">—</span>;

export default function MissionPeekPanel({
  mission,
  onOpenChange,
  telephone,
  matricule,
  statut,
  photoCounts,
  photoItems,
  deadlineChip,
  canReassign,
  isATG,
  onOpenDossier,
}: {
  mission: PeekMission | null;
  onOpenChange: (open: boolean) => void;
  telephone?: string;
  matricule?: string;
  statut?: string;
  photoCounts?: Record<PhotoCategory, number>;
  photoItems?: Array<{ url: string; category: PhotoCategory }>;
  deadlineChip?: React.ReactNode;
  canReassign: boolean;
  isATG: boolean;
  onOpenDossier: (m: PeekMission) => void;
}) {
  const t = useT();
  const m = mission;
  const rdv = m ? toDate(m.dateRDV) : null;
  const tel = telHref(telephone);
  const wa = waHref(telephone);
  const stageKey = m ? missionCategory(m.typeMission) : 'avant';
  const stagePhotos = (photoItems || []).filter((p) => p.category === stageKey).slice(0, 8);
  const checkinLabel = m?.checkinAt ? formatFull(m.checkinAt) : null;

  return (
    <Sheet open={!!m} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        {m && (
          <>
            <SheetHeader className="space-y-2 border-b border-hairline px-6 py-4 text-left">
              <SheetTitle className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="t-mono text-base font-semibold">{m.dossierNom || m.dossierId}</span>
                <span className="truncate text-sm font-medium text-ink-2">{m.assureNom || ''}</span>
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{t('Mission')} {t(m.typeMission)}</Badge>
                {deadlineChip}
                {checkinLabel && <Badge variant="success">{t('Arrivé')} · {checkinLabel}</Badge>}
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Rendez-vous & contact */}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Fact label={t('Rendez-vous')}>
                  <span className="tabular-nums">{formatFull(m.dateRDV) ?? <Empty />}</span>
                </Fact>
                <Fact label={t('Zone')}>{m.zone || <Empty />}</Fact>
                <Fact label={t('Téléphone')}>
                  {tel ? (
                    <span className="inline-flex items-center gap-2">
                      <a href={tel} className="tabular-nums text-primary underline-offset-4 hover:underline">
                        {(telephone || '').trim()}
                      </a>
                      {wa && (
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-ink-3" title={t('Écrire sur WhatsApp')}>
                          <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={t('Écrire sur WhatsApp')}>
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </span>
                  ) : <Empty />}
                </Fact>
                <Fact label={t('Immatriculation')}>
                  {matricule ? <span className="t-mono">{matricule}</span> : <Empty />}
                </Fact>
                <Fact label={t('Compagnie')}>{m.compagnie || <Empty />}</Fact>
                <Fact label={t('Agent de terrain')}>{m.agentTerrain !== '-' ? m.agentTerrain : <Empty />}</Fact>
                <Fact label={t('Adresse')} wide>
                  {m.adresse ? (
                    <span className="inline-flex max-w-full items-start gap-2">
                      <span className="min-w-0 break-words font-medium">{m.adresse}</span>
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-ink-3" title={t('Ouvrir dans Google Maps')}>
                        <a href={mapsSearchUrl(m.adresse)} target="_blank" rel="noopener noreferrer" aria-label={t('Ouvrir dans Google Maps')}>
                          <Navigation className="h-4 w-4" />
                        </a>
                      </Button>
                    </span>
                  ) : <Empty />}
                </Fact>
              </dl>

              {/* Observation — prose steps up to 15 px (Butterick: body text
                  is for reading; 13–14 px is for chrome and rows). */}
              {m.observation && (
                <div>
                  <h3 className="t-label">{t('Observation')}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink">{m.observation}</p>
                </div>
              )}

              {/* Photos per stage — the differentiating fact surfaced without
                  opening the dossier (NN/g pogo-sticking remedy). */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="t-heading">{t('Photos')}</h3>
                  {CATEGORY_LABELS.map(({ key, label }) => {
                    const count = photoCounts?.[key] ?? 0;
                    const active = key === stageKey;
                    return (
                      <span
                        key={key}
                        className={
                          active
                            ? 'inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink'
                            : 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-3'
                        }
                      >
                        {t(label)} {count}
                      </span>
                    );
                  })}
                </div>
                {stagePhotos.length > 0 ? (
                  <ul className="mt-3 grid grid-cols-4 gap-2">
                    {stagePhotos.map((p, i) => (
                      <li key={`${p.url}-${i}`} className="overflow-hidden rounded-md border border-hairline bg-surface-2">
                        <img src={p.url} alt={`${t('Photo')} ${i + 1} — ${t(m.typeMission)}`} loading="lazy" className="h-16 w-full object-cover" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-ink-3">
                    {/* Whole sentence is the key (one per stage), the way
                        terrain.ts already keys « Aucune photo … pour le
                        moment. » — French output is unchanged. */}
                    {t(`Aucune photo ${m.typeMission.toLowerCase()} pour l'instant.`)}
                  </p>
                )}
              </div>

              {/* Suivi — audit metadata moved out of the queue row. */}
              <div>
                <h3 className="t-heading">{t('Suivi')}</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
                  <Fact label={t('Créé le')}>
                    <span className="font-normal tabular-nums text-ink-2">{formatFull(m.createdAt) ?? <Empty />}</span>
                  </Fact>
                  <Fact label={t('Créé par')}>
                    {m.createdByName ? (
                      <span className="font-normal text-ink-2">
                        {m.createdByName}
                        {m.createdByRole ? <span className="text-ink-3"> ({m.createdByRole})</span> : null}
                      </span>
                    ) : <Empty />}
                  </Fact>
                  <Fact label={t('Assigné par')}>
                    {m.modifiedByName ? <span className="font-normal text-ink-2">{m.modifiedByName}</span> : <Empty />}
                  </Fact>
                  <Fact label={t('Statut du dossier')}>
                    {statut ? <span className="font-normal text-ink-2">{t(statut)}</span> : <Empty />}
                  </Fact>
                </dl>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline px-6 py-4">
              {tel && (
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={tel}><Phone className="h-4 w-4" />{t('Appeler')}</a>
                </Button>
              )}
              {isATG && (
                <>
                  <EnRouteButton telephone={telephone} rdvTime={rdv ? format(rdv, 'HH:mm') : null} />
                  <CheckinButton dossierId={m.dossierId} planifId={m.id} checkedIn={!!m.checkinAt} />
                </>
              )}
              {canReassign && (
                <ReassignPopover
                  targets={[{
                    dossierId: m.dossierId,
                    planifId: m.id,
                    agentTerrain: m.agentTerrain,
                    zone: m.zone,
                    agentTerrainUid: m.agentTerrainUid ?? null,
                  }]}
                >
                  <Button variant="outline" size="sm">{t('Réassigner')}</Button>
                </ReassignPopover>
              )}
              <Button size="sm" onClick={() => onOpenDossier(m)}>{t('Ouvrir le dossier')}</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
