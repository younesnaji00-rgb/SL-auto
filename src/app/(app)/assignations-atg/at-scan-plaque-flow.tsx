'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Camera, Loader2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { useT } from '@/i18n';
import { useCurrentUser } from '@/hooks/use-current-user';
import { matchDossiersByPlate } from '@/lib/plate-match';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import ModalPlanification from '@/app/(app)/dossiers/[id]/modal-planification';
import { usePlateScan, type PlateScanResult } from './at-plate-scan';

const MAX_RESULTS = 20;

interface ScanState {
  plate: string;
  confidence: 'high' | 'low';
  /** Exact plate matches across all dossiers. */
  matches: any[];
  /** Digit-based candidates when no exact match. */
  fuzzy: any[];
}

/**
 * The single AT self-service entry point: « Scanner la plaque » opens the
 * phone camera directly; once the dossier is identified the agent chooses
 * the action — planifier une mission or importer photos/documents. Replaces
 * the former separate "Nouvelle planification" / "Ajouter photos" buttons.
 * Scan-only by design: no manual matricule entry.
 */
export default function AtScanPlaqueFlow({
  buttonClassName,
  buttonSize = 'default',
}: {
  buttonClassName?: string;
  /** `lg` on phones (thumb-sized target); `default` (40 px) in the desktop header. */
  buttonSize?: 'default' | 'lg';
}) {
  const t = useT();
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const router = useRouter();
  const canUse = profile?.role === 'Agent de Terrain' || profile?.role === 'Admin';

  const [resultOpen, setResultOpen] = useState(false);
  const [allDossiers, setAllDossiers] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [scan, setScan] = useState<ScanState | null>(null);
  const [pendingPlate, setPendingPlate] = useState<PlateScanResult | null>(null);
  /** Dossier identified by the scan (or picked from the list) — action stage. */
  const [chosen, setChosen] = useState<any | null>(null);
  /** Dossier for which the planning modal is open. */
  const [planifTarget, setPlanifTarget] = useState<any | null>(null);

  const { trigger, scanning, error, inputNode } = usePlateScan(setPendingPlate);

  // Dossier fetch is kicked off by the first camera click, in parallel with
  // the shot + AI read; matching waits for both (see the pendingPlate effect).
  useEffect(() => {
    if (!wanted || loaded || !db) return;
    let cancelled = false;
    getDocs(collection(db, 'dossiers'))
      .then((snap) => {
        if (cancelled) return;
        setAllDossiers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoaded(true);
      })
      .catch((err) => {
        console.warn('[at-scan-plaque] dossier fetch failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [wanted, loaded, db]);

  // A new shot surfaces the progress dialog and clears the previous result.
  // It also arms the dossier fetch: the scan button is not the only way a
  // photo reaches the input (the guided tour feeds it directly), and without
  // `wanted` the match effect below would wait on a list that never loads.
  useEffect(() => {
    if (scanning) {
      setWanted(true);
      setScan(null);
      setChosen(null);
      setResultOpen(true);
    }
  }, [scanning]);

  useEffect(() => {
    if (error) setResultOpen(true);
  }, [error]);

  // Match once BOTH the plate and the dossier list are available.
  useEffect(() => {
    if (!pendingPlate || !loaded) return;
    const { plate, confidence } = pendingPlate;
    setPendingPlate(null);
    const { exact, fuzzy } = matchDossiersByPlate(allDossiers, plate);
    setScan({ plate, confidence, matches: exact, fuzzy });
    setChosen(exact.length === 1 ? exact[0] : null);
    setResultOpen(true);
  }, [pendingPlate, loaded, allDossiers]);

  const closeAll = useCallback(() => {
    setResultOpen(false);
    setScan(null);
    setChosen(null);
    setPendingPlate(null);
  }, []);

  const handlePlanifier = (d: any) => {
    closeAll();
    setPlanifTarget(d);
  };

  const handlePhotos = (d: any) => {
    closeAll();
    router.push(`/assignations-atg/${d.id}?mission=Avant`);
  };

  if (!canUse) return null;

  const handleScanClick = () => {
    setWanted(true);
    trigger();
  };

  const assureLabel = (d: any) => {
    if (typeof d.assure === 'string') return d.assure || '—';
    return `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim() || '—';
  };

  const displayed = scan
    ? scan.matches.length > 0
      ? scan.matches
      : scan.fuzzy.slice(0, MAX_RESULTS)
    : [];

  const busy = scanning || (!!pendingPlate && !loaded);

  // Scan outcome as a status-pair chip + one caption (element-specs §11 /
  // §14: status colour always with a text label; no coloured banner).
  const scanOutcome = () => {
    if (!scan || chosen) return null;
    const uncertain = scan.confidence === 'low' ? ` ${t('(lecture incertaine — vérifiez)')}` : '';
    let tone: 'success' | 'warning' | 'danger' = 'success';
    let short: string;
    let msg: string;
    if (scan.matches.length > 1) {
      short = `${scan.matches.length} ${t('dossiers')}`;
      msg = `${scan.matches.length} ${t('dossiers portent cette plaque')}${uncertain}. ${t('Sélectionnez le bon ci-dessous.')}`;
    } else if (scan.fuzzy.length > 0) {
      tone = 'warning';
      short = t('Aucune correspondance exacte');
      msg = `${t('Aucune correspondance exacte')}${uncertain}. ${t('Vérifiez les correspondances possibles ci-dessous, ou reprenez la photo.')}`;
    } else {
      tone = 'danger';
      short = t('Aucun dossier');
      msg = `${t('Aucun dossier ne correspond à cette plaque')}${uncertain}. ${t("Le dossier n'existe peut-être pas encore — reprenez la photo ou contactez votre gestionnaire.")}`;
    }
    return (
      <div className="space-y-1.5" aria-live="polite">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="t-label">{t('Plaque détectée')}</span>
          <span className="t-mono font-semibold">{scan.plate}</span>
          <Badge variant={tone}>{short}</Badge>
        </div>
        <p className="t-caption">{msg}</p>
      </div>
    );
  };

  return (
    <>
      {inputNode}

      {/* The ONE filled button of the missions list (element-specs §8: GOV.UK
          "use a default button for the main call to action"; verb + noun,
          leading 16 px icon). Camera-first — the icon is the action. */}
      <Button
        type="button"
        size={buttonSize}
        onClick={handleScanClick}
        disabled={scanning}
        loading={scanning}
        className={cn('gap-2', buttonClassName)}
      >
        {!scanning && <Camera />}
        {t('Scanner la plaque')}
      </Button>

      {/* Dialog (element-specs §13: Material 3 dialogs ✓ brief headline + one
          line, confirmation nearest the edge, ≤ 2 footer actions; bottom sheet
          below lg and `lg:max-w-lg` come from the primitive). */}
      <Dialog
        open={resultOpen}
        onOpenChange={(o) => {
          if (!o) closeAll();
          else setResultOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Scanner la plaque')}</DialogTitle>
            <DialogDescription>
              {t("Le dossier est identifié par la photo de la plaque, puis choisissez l'action.")}
            </DialogDescription>
          </DialogHeader>

          {busy ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-ink-3" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {scanning ? t('Lecture de la plaque...') : t('Chargement des dossiers...')}
            </div>
          ) : chosen ? (
            <>
              {/* Action stage — dossier identified: definition list (§10: quiet
                  labels, 14/600 values, empty = —) in a flat `surface-2` well
                  (nested-solid rule inside the glass dialog). */}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg bg-surface-2 p-4">
                {scan && (
                  <div className="min-w-0">
                    <dt className="t-label">{t('Plaque détectée')}</dt>
                    <dd className="t-mono mt-0.5 font-semibold">{scan.plate}</dd>
                  </div>
                )}
                <div className="min-w-0">
                  <dt className="t-label">{t('Dossier')}</dt>
                  <dd className="t-mono mt-0.5 truncate font-semibold">{chosen.refExpert || chosen.id}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="t-label">{t('Assuré')}</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{assureLabel(chosen)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="t-label">{t('Compagnie')}</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{chosen.compagnie || <span className="font-normal text-ink-4">—</span>}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="t-label">{t('Immatriculation')}</dt>
                  <dd className="t-mono mt-0.5 font-semibold">{chosen.matricule || chosen.vehicule?.immatriculation || <span className="font-normal text-ink-4">—</span>}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="t-label">{t('Statut')}</dt>
                  <dd className="mt-0.5">
                    {/* Status chip (§11) — same helper/pair as everywhere else. */}
                    <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(chosen.statut || 'Nouveau'))}>
                      {t(chosen.statut || 'Nouveau')}
                    </Badge>
                  </dd>
                </div>
              </dl>

              {/* Buttons (§8: ONE `default` per stage — the camera-first action;
                  the alternative is `outline`; back / retry are `ghost`). */}
              <div className="grid grid-cols-1 gap-2">
                <Button type="button" onClick={() => handlePhotos(chosen)} className="w-full gap-2">
                  <Camera />
                  {t('Ajouter photos / documents')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handlePlanifier(chosen)}
                  className="w-full gap-2"
                >
                  <Calendar />
                  {t('Planifier la mission')}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                {scan && scan.matches.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setChosen(null)}
                    className="gap-1.5"
                  >
                    <ArrowLeft />
                    {t('Autres résultats')}
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={trigger}
                  className="gap-1.5"
                >
                  <Camera />
                  {t('Reprendre la photo')}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Inline error (§14: errors next to the block, never a toast). */}
              {error && <p role="alert" className="text-sm text-status-danger-fg">{error}</p>}
              {scanOutcome()}

              {displayed.length > 0 && (
                // Candidate rows (element-specs §4: Material 3 lists ✓ label +
                // supporting text + trailing meta; ≥ 56 px two-line rows on
                // hairlines; whole row is the control; status chip §11).
                <div className="max-h-[280px] overflow-y-auto rounded-md border border-hairline">
                  <ul className="divide-y divide-hairline">
                    {scan && scan.matches.length === 0 && scan.fuzzy.length > 0 && (
                      <li className="t-label px-4 py-2">
                        {t('Correspondances possibles')}
                      </li>
                    )}
                    {displayed.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => setChosen(d)}
                          className="flex min-h-[56px] w-full flex-col justify-center px-4 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="t-mono font-semibold">
                              {d.refExpert || d.id}
                            </span>
                            <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut || 'Nouveau'), 'shrink-0')}>
                              {t(d.statut || 'Nouveau')}
                            </Badge>
                          </div>
                          <div className="mt-0.5 flex items-baseline justify-between gap-2 text-sm text-ink-2">
                            <span className="truncate">{assureLabel(d)}{d.compagnie ? ` · ${d.compagnie}` : ''}</span>
                            <span className="t-mono shrink-0 text-ink-2">
                              {d.matricule || d.vehicule?.immatriculation || '—'}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Retry is `ghost` (§8) — no filled button at this stage: the
                  agent is choosing, not committing. */}
              <Button type="button" variant="ghost" onClick={trigger} className="w-full gap-2">
                <Camera />
                {t('Reprendre la photo')}
              </Button>
            </>
          )}

          {/* Footer (§13): a single dismissive `outline` action nearest the edge. */}
          <DialogFooter>
            <Button variant="outline" onClick={closeAll}>
              {t('Fermer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {planifTarget && (
        <ModalPlanification
          open={!!planifTarget}
          onOpenChange={(o) => {
            if (!o) setPlanifTarget(null);
          }}
          dossierId={planifTarget.id}
          dossierData={planifTarget}
          defaultAgentTerrain={profile?.nom ?? ''}
        />
      )}
    </>
  );
}
