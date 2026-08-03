"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useAuth } from '@/firebase';
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDossierDocWrite, applyPendingToDossier } from './rappel-draft';
import { displayUserName } from '@/lib/display-user';
import { UserNameLink } from '@/components/user-name-link';
import { useT, intlLocale } from '@/i18n';

/**
 * AI-sourced date fields visible in Dates clés. For these fields:
 *   - The Gemini scan extracts only a date (YYYY-MM-DD), no time.
 *   - Time is rendered as `--/--` until the gestionnaire manually fills it.
 *   - The sibling boolean `<field>TimeKnown` flips to true when filled.
 *
 * Other fields visible in Dates clés (createdAt, datePhotosAvant, etc.) are
 * `serverTimestamp()` from user actions — always time-known.
 */
const AI_SOURCED_DATE_FIELDS = new Set<string>([
  'dateRequete',
  'dateSinistre',
]);

type HistoriqueTabProps = {
  dossierId: string;
};

export default function HistoriqueTab({ dossierId }: HistoriqueTabProps) {
  const t = useT();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { canWrite } = useCurrentUser();

  const [entries, setEntries] = useState<any[]>([]);
  const [rawDossier, setRawDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Rappel session: date edits & sinistre-douteux decisions buffer until
  // « Sauvegarder »; the displayed dossier gets the buffer overlaid so the
  // Dates clés reflect the session's local edits.
  const { write: writeDossierDoc, buffered, draft } = useDossierDocWrite(dossierId);
  const dossier = useMemo(
    () => (draft.active ? applyPendingToDossier(rawDossier, draft.pending) : rawDossier),
    [rawDossier, draft.active, draft.pending],
  );

  // Listen to historique subcollection
  useEffect(() => {
    if (!db || !dossierId) return;

    const q = query(
      collection(db, 'dossiers', dossierId, 'historique'),
      orderBy('date', 'desc')
    );
    
    const unsubscribeHistory = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(items);
      setLoading(false);
    }, (err) => {
      console.error('Historique listener error:', err);
      setLoading(false);
    });
    
    return () => unsubscribeHistory();
  }, [db, dossierId]);

  // Listen to parent dossier doc for approval banner status
  useEffect(() => {
    if (!db || !dossierId) return;

    const unsubscribeDossier = onSnapshot(doc(db, 'dossiers', dossierId), (snapshot) => {
      if (snapshot.exists()) {
        setRawDossier({ id: snapshot.id, ...snapshot.data() });
      }
    });
    
    return () => unsubscribeDossier();
  }, [db, dossierId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return t('Date inconnue');
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString(intlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Format for the Dates clés table: when `timeKnown` is false, the time
   * portion renders as `--/--` (Q-2 / item 006). Date is still shown when
   * the value is present.
   */
  const formatDateWithTimeFlag = (value: any, timeKnown: boolean): string => {
    if (!value) return '—';
    const d = value.toDate ? value.toDate() : new Date(value);
    const datePart = d.toLocaleDateString(intlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!timeKnown) return `${datePart} --/--`;
    const timePart = d.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
  };

  const currentUserEmail = auth?.currentUser?.email || 'Admin';

  // Item 007 — inline edit of AI-sourced date/time when the gestionnaire wants
  // to fill what the AI didn't pick up. State is per-row keyed by the
  // dossier field name (e.g. "dateRequete"). Visible only when the user can
  // write the dossier.
  const canEditDates = canWrite('dossiers');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  // True when the row entered edit mode for a date that was AI-extracted.
  // Only the time is editable in that case; the date stays as-is and the
  // source flag remains `'ai'` on save.
  const [dateLockedAi, setDateLockedAi] = useState(false);
  // Wraps the inline inputs so blur handlers can tell "focus left the edit
  // group" from "tabbed to the other input within the same group".
  const editRowRef = useRef<HTMLSpanElement>(null);

  const openDateEditor = (field: string, currentValue: any) => {
    if (currentValue) {
      const d = currentValue.toDate ? currentValue.toDate() : new Date(currentValue);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setEditDate(`${dd}/${mm}/${yyyy}`);
      const timeKnown = !!dossier?.[`${field}TimeKnown`];
      if (timeKnown) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        setEditTime(`${hh}:${mi}`);
      } else {
        setEditTime('');
      }
      // Legacy rows without an explicit source are treated as AI-filled
      // (the only pre-flag write path was the Gemini scan).
      const src = dossier?.[`${field}Source`] ?? 'ai';
      setDateLockedAi(src === 'ai');
    } else {
      setEditDate('');
      setEditTime('');
      setDateLockedAi(false);
    }
    setEditingField(field);
  };

  const saveDateEdit = async () => {
    if (!db || !editingField) return;
    if (!editDate) {
      toast({ variant: 'destructive', title: t('Date requise'), description: t('Veuillez saisir une date.') });
      return;
    }
    // Build a Date from the user inputs. If time is provided, set hh:mm
    // (timeKnown=true); otherwise persist at midnight with timeKnown=false.
    const [dd, mm, yy] = editDate.split('/').map((n) => parseInt(n, 10));
    const dateValid =
      Number.isFinite(dd) && dd >= 1 && dd <= 31 &&
      Number.isFinite(mm) && mm >= 1 && mm <= 12 &&
      Number.isFinite(yy) && yy >= 1900 && yy <= 2100;
    if (!dateValid) {
      toast({ variant: 'destructive', title: t('Date invalide'), description: t('Format attendu : JJ/MM/AAAA.') });
      return;
    }
    let when: Date;
    let timeKnown = false;
    if (editTime) {
      if (!/^\d{1,2}:\d{2}$/.test(editTime)) {
        toast({ variant: 'destructive', title: t('Heure invalide'), description: t('Format attendu : HH:MM.') });
        return;
      }
      const [hh, mi] = editTime.split(':').map((n) => parseInt(n, 10));
      if (!Number.isFinite(hh) || hh < 0 || hh > 23 || !Number.isFinite(mi) || mi < 0 || mi > 59) {
        toast({ variant: 'destructive', title: t('Heure invalide'), description: t('Heure hors plage (00:00 – 23:59).') });
        return;
      }
      when = new Date(yy, mm - 1, dd, hh, mi, 0, 0);
      timeKnown = true;
    } else {
      when = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
    }
    if (isNaN(when.getTime())) {
      toast({ variant: 'destructive', title: t('Date invalide'), description: t('Impossible d\'interpréter la date saisie.') });
      return;
    }
    try {
      // Persist to the SAME dossier field the AI scan writes to in
      // src/components/dossier-timeline/step-1-import.tsx (FIELD_MAP):
      //   dateOfLoss    -> dossiers/{id}.dateSinistre  (Timestamp)
      //   dateOfRequest -> dossiers/{id}.dateRequete   (Timestamp)
      // Sibling `<field>TimeKnown` boolean reflects whether the gestionnaire
      // also filled the hh:mm (the AI never extracts time).
      await writeDossierDoc({
        [editingField]: Timestamp.fromDate(when),
        [`${editingField}TimeKnown`]: timeKnown,
        // Source tracks DATE provenance, not time. If the date was AI-extracted
        // and the user only added the time, the row stays AI-sourced.
        [`${editingField}Source`]: dateLockedAi ? 'ai' : 'manual',
      });
      toast(
        buffered
          ? { title: t('Date modifiée (en attente)'), description: t('Publiée après « Sauvegarder » dans la bannière rappel.') }
          : { title: t('Date mise à jour') },
      );
      setEditingField(null);
    } catch (err: any) {
      console.error('Date update error:', err);
      toast({ variant: 'destructive', title: t('Erreur'), description: err.message || t('Impossible de mettre à jour la date.') });
    }
  };

  // Auto-format the Heure input so the user only types digits — the colon
  // appears on its own after the hours. We skip the auto-insert during a
  // deletion so backspacing past the colon doesn't immediately re-add it.
  const handleEditTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    let formatted = digits;
    if (digits.length >= 3) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    } else if (digits.length === 2 && raw.length > editTime.length) {
      formatted = `${digits}:`;
    }
    setEditTime(formatted);
  };

  // Inline edit keyboard shortcuts: Enter commits, Escape cancels.
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveDateEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingField(null);
    }
  };

  // When focus leaves the entire edit group (not just one input), cancel
  // without saving. Using setTimeout so we read activeElement *after* the
  // browser has moved focus to the next element (or document.body).
  const handleEditBlur = () => {
    setTimeout(() => {
      if (editRowRef.current && !editRowRef.current.contains(document.activeElement)) {
        setEditingField(null);
      }
    }, 0);
  };

  const renderDateClesRow = (row: { label: string; field?: string; value: any }) => {
    const aiSourced = !!row.field && AI_SOURCED_DATE_FIELDS.has(row.field);
    const timeKnown = aiSourced ? !!dossier?.[`${row.field}TimeKnown`] : true;
    // Source provenance for AI-sourced fields. Legacy rows (set before the
    // source flag existed) are assumed AI-filled if a value is present.
    const rawSource = aiSourced ? dossier?.[`${row.field}Source`] : undefined;
    const source: 'ai' | 'manual' | undefined = aiSourced
      ? (rawSource ?? (row.value ? 'ai' : undefined))
      : undefined;
    const isAiFilled = aiSourced && !!row.value && source === 'ai';
    // Any AI-sourced row stays editable so the gestionnaire can correct a
    // mistake. `dateLockedAi` (set in openDateEditor) still prevents an
    // AI-extracted date from being retyped — only the time changes.
    const canFill = canEditDates && aiSourced;
    const inEdit = editingField === row.field;

    // Pre-compute display parts so the date can show next to an inline time
    // input when only the time is being edited.
    let datePartDisplay = '';
    let timePartDisplay = '';
    if (row.value) {
      const d = row.value.toDate ? row.value.toDate() : new Date(row.value);
      datePartDisplay = d.toLocaleDateString(intlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (timeKnown) {
        timePartDisplay = d.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' });
      }
    }

    const aiTextStyle = isAiFilled ? 'text-muted-foreground/70 italic' : '';
    const inlineInputClass =
      'h-6 px-1.5 text-sm rounded border border-input bg-background ' +
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring tabular-nums';
    // Subtle hover-only affordance — no underline so the `--/--` / `—`
    // glyphs aren't visually doubled.
    const dashedClickable =
      'cursor-pointer rounded px-1 hover:bg-muted hover:text-foreground transition-colors';

    return (
      <div className="flex justify-between items-center text-sm py-1.5 border-b border-border/30 last:border-0">
        <span className="text-muted-foreground">{row.label}</span>
        <span
          ref={inEdit ? editRowRef : undefined}
          className={`flex items-center gap-1.5 font-medium tabular-nums ${aiTextStyle}`}
        >
          {inEdit ? (
            <>
              {dateLockedAi ? (
                <span>{datePartDisplay}</span>
              ) : (
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleEditBlur}
                  placeholder={t('JJ/MM/AAAA')}
                  maxLength={10}
                  className={`${inlineInputClass} w-28`}
                />
              )}
              <input
                autoFocus={dateLockedAi}
                type="text"
                inputMode="numeric"
                value={editTime}
                onChange={handleEditTimeChange}
                onKeyDown={handleEditKeyDown}
                onBlur={handleEditBlur}
                placeholder="HH:MM"
                maxLength={5}
                className={`${inlineInputClass} w-16`}
              />
            </>
          ) : canFill && row.field ? (
            <span
              role="button"
              tabIndex={0}
              className={dashedClickable}
              onClick={() => openDateEditor(row.field!, row.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openDateEditor(row.field!, row.value);
                }
              }}
              title={t('Cliquer pour modifier')}
            >
              {row.value
                ? `${datePartDisplay}${timeKnown ? ' ' + timePartDisplay : ' --/--'}`
                : '—'}
            </span>
          ) : (
            <span>
              {row.value
                ? `${datePartDisplay}${timeKnown ? ' ' + timePartDisplay : ' --/--'}`
                : '—'}
            </span>
          )}
        </span>
      </div>
    );
  };

  // Approve/reject share one path: the dossier write goes through the rappel
  // buffer (when a session is active) and the audit entry is deferred with it
  // so the historique never gets ahead of the visible dossier state.
  const handleDouteuxDecision = async (decision: 'Sinistre Douteux Approuvé' | 'Sinistre Douteux Rejeté') => {
    if (!db || !dossierId) return;
    const details =
      decision === 'Sinistre Douteux Approuvé'
        ? "La demande a été approuvée par l'administration."
        : "La demande a été rejetée par l'administration.";
    try {
      await writeDossierDoc({
        'sinistreDouteux.active': false,
        statut: decision,
      });

      if (buffered) {
        draft.bufferLog({ kind: 'historique', args: [decision, currentUserEmail, details, 'sinistre_douteux'] });
        toast({ title: t('Décision en attente'), description: t('Publiée après « Sauvegarder » dans la bannière rappel.') });
      } else {
        await addDoc(collection(db, 'dossiers', dossierId, 'historique'), {
          action: decision,
          date: serverTimestamp(),
          user: currentUserEmail,
          details,
          type: 'sinistre_douteux'
        });
        toast({ title: t('Succès'), description: decision === 'Sinistre Douteux Approuvé' ? t('Sinistre douteux approuvé.') : t('Sinistre douteux rejeté.') });
      }
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: t('Erreur'), description: err.message });
    }
  };

  const handleApprove = () => handleDouteuxDecision('Sinistre Douteux Approuvé');
  const handleReject = () => handleDouteuxDecision('Sinistre Douteux Rejeté');

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-8 mt-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">{t('État du dossier')}</h2>
        <p className="text-sm text-muted-foreground">{t('Suivez la progression du dossier étape par étape.')}</p>
      </div>

      {/* DATES CLÉS */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold text-base">{t('Dates clés')}</h3>
          {/* Top block: single-column rows (no left/right pairing). */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {[
              { label: t('Date réception mission'), field: 'dateRequete',          value: dossier?.dateRequete },
              { label: t('Date sinistre'),          field: 'dateSinistre',         value: dossier?.dateSinistre },
              { label: t('Date création dossier'),  field: 'createdAt',            value: dossier?.createdAt },
              { label: t('Date mission AT'),        field: 'dateMissionAgentTerrain', value: dossier?.dateMissionAgentTerrain },
            ].map((row) => (
              <React.Fragment key={row.label}>{renderDateClesRow(row)}</React.Fragment>
            ))}
          </div>
          {/* Paired rows: demande on the left, expertise on the right, per phase. */}
          {([
            { phase: 'avant',    demande: dossier?.dateDemandeExpertiseAvant,    expertise: dossier?.datePhotosAvant },
            { phase: 'en cours', demande: dossier?.dateDemandeExpertiseEnCours,  expertise: dossier?.datePhotosEnCours },
            { phase: 'après',    demande: dossier?.dateDemandeExpertiseApres,    expertise: dossier?.datePhotosApres },
          ] as const).map((row) => (
            <div key={row.phase} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {renderDateClesRow({ label: `${t('Date demande expertise')} (${t(row.phase)})`, value: row.demande })}
              {renderDateClesRow({ label: `${t('Date expertise')} (${t(row.phase)})`, value: row.expertise })}
            </div>
          ))}
          {/* Tail block: remaining single-column rows. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {[
              { label: t('Date chiffrage'), value: dossier?.dateChiffrage },
              { label: t('Date validation facture'), value: dossier?.dateFactureValide },
              { label: t('Date envoi accord devis'), value: dossier?.dateEnvoiAccordDevis },
              { label: t('Date validation rapport'), value: dossier?.directorValidated?.at },
              { label: t('Date dépôt rapport'), value: dossier?.dateRapportDepose },
              { label: t("Date dépôt note d'honoraire"), value: (dossier as any)?.dateDepotNoteHonoraire },
            ].map((row) => (
              <React.Fragment key={row.label}>{renderDateClesRow(row)}</React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SINISTRE DOUTEUX APPROVAL BANNER */}
      {dossier?.sinistreDouteux?.active && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-red-800 dark:text-red-400">{t('Sinistre Douteux - En attente de validation')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('Demandé par')} <span className="font-semibold">{dossier.sinistreDouteux.demandePar || 'N/A'}</span> {t('le')} {formatDate(dossier.sinistreDouteux.dateDemande)}
                </p>
                {dossier.sinistreDouteux.motif && (
                  <p className="text-sm italic mt-2 bg-white/50 dark:bg-black/20 p-2 rounded border border-red-100 dark:border-red-900/50">
                    &quot;{dossier.sinistreDouteux.motif}&quot;
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  <Button 
                    onClick={handleApprove} 
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4" /> {t('Approuver')}
                  </Button>
                  <Button 
                    onClick={handleReject} 
                    className="bg-red-600 hover:bg-red-700 text-white gap-2"
                    size="sm"
                  >
                    <XCircle className="h-4 w-4" /> {t('Rejeter')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TIMELINE — status changes + chiffreur document saves. Round 9
          item 005: include 'document' so the gestionnaire sees exactly
          what type of doc the chiffreur edited ("Enregistré Devis Garage"
          etc.) in the same audit timeline. */}
      {(() => {
        const statusEntries = entries.filter((e) => e.type === 'statut' || e.type === 'sinistre_douteux' || e.type === 'document');
        return statusEntries.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground italic">
            {t('Aucun changement de statut enregistré pour ce dossier.')}
          </div>
        ) : (
          <div className="relative pl-8 pt-4">
            {/* Vertical line */}
            <div className="absolute left-[5px] top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-10">
              {statusEntries.map((entry) => (
                <div key={entry.id} className="relative">
                  {/* Bullet */}
                  <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-muted-foreground border-2 border-background z-10" />

                  <div className="space-y-1">
                    <p className="font-semibold text-base">{t(entry.action)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(entry.date)} {t('par')} <UserNameLink entry={entry} className="font-bold" />
                    </p>
                    {entry.details && (
                      <div className="mt-2 pl-4 border-l-2 border-primary/40 text-sm italic text-muted-foreground bg-muted/50 py-2 rounded-r-md">
                        &quot;{t(entry.details)}&quot;
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
