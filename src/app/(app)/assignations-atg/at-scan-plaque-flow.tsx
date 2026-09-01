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

// Status pairs only (DESIGN.md §10) for the scan outcome — never a coloured banner.
type ChipTone = 'success' | 'warning' | 'danger';
const CHIP_TONE: Record<ChipTone, string> = {
  success: 'bg-status-success-bg text-status-success-fg',
  warning: 'bg-status-warning-bg text-status-warning-fg',
  danger: 'bg-status-danger-bg text-status-danger-fg',
};

/**
 * The single AT self-service entry point: « Scanner la plaque » opens the
 * phone camera directly; once the dossier is identified the agent chooses
 * the action — planifier une mission or importer photos/documents. Replaces
 * the former separate "Nouvelle planification" / "Ajouter photos" buttons.
 * Scan-only by design: no manual matricule entry.
 */
export default function AtScanPlaqueFlow({ buttonClassName }: { buttonClassName?: string }) {
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
  useEffect(() => {
    if (scanning) {
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

  // Scan outcome as a status-pair chip + one caption (no coloured banner).
  const scanOutcome = () => {
    if (!scan || chosen) return null;
    const uncertain = scan.confidence === 'low' ? ' (lecture incertaine — vérifiez)' : '';
    let tone: ChipTone = 'success';
    let short: string;
    let msg: string;
    if (scan.matches.length > 1) {
      short = `${scan.matches.length} dossiers`;
      msg = `${scan.matches.length} dossiers portent cette plaque${uncertain}. Sélectionnez le bon ci-dessous.`;
    } else if (scan.fuzzy.length > 0) {
      tone = 'warning';
      short = 'Aucune correspondance exacte';
      msg = `Aucune correspondance exacte${uncertain}. Vérifiez les correspondances possibles ci-dessous, ou reprenez la photo.`;
    } else {
      tone = 'danger';
      short = 'Aucun dossier';
      msg = `Aucun dossier ne correspond à cette plaque${uncertain}. Le dossier n'existe peut-être pas encore — reprenez la photo ou contactez votre gestionnaire.`;
    }
    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="t-label">Plaque détectée</span>
          <span className="t-mono font-semibold">{scan.plate}</span>
          <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium', CHIP_TONE[tone])}>{short}</span>
        </div>
        <p className="t-caption">{msg}</p>
      </div>
    );
  };

  return (
    <>
      {inputNode}

      {/* The ONE solid primary of the AT list: camera-first, full size. */}
      <Button
        type="button"
        onClick={handleScanClick}
        disabled={scanning}
        loading={scanning}
        className={cn('gap-2 font-semibold', buttonClassName)}
      >
        {!scanning && <Camera />}
        Scanner la plaque
      </Button>

      <Dialog
        open={resultOpen}
        onOpenChange={(o) => {
          if (!o) closeAll();
          else setResultOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Scanner la plaque</DialogTitle>
            <DialogDescription>
              Le dossier est identifié par la photo de la plaque, puis choisissez l&apos;action.
            </DialogDescription>
          </DialogHeader>

          {busy ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-ink-3" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" />
              {scanning ? 'Lecture de la plaque...' : 'Chargement des dossiers...'}
            </div>
          ) : chosen ? (
            <>
              {/* Action stage — dossier identified: label/value pairs in a flat well. */}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-surface-2 p-4">
                {scan && (
                  <div className="min-w-0">
                    <dt className="t-label">Plaque détectée</dt>
                    <dd className="t-mono mt-0.5 font-semibold">{scan.plate}</dd>
                  </div>
                )}
                <div className="min-w-0">
                  <dt className="t-label">Dossier</dt>
                  <dd className="t-mono mt-0.5 truncate font-semibold">{chosen.refExpert || chosen.id}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="t-label">Assuré</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{assureLabel(chosen)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="t-label">Compagnie</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{chosen.compagnie || '—'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="t-label">Immatriculation</dt>
                  <dd className="t-mono mt-0.5 font-semibold">{chosen.matricule || chosen.vehicule?.immatriculation || '—'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="t-label">Statut</dt>
                  <dd className="mt-0.5">
                    <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(chosen.statut || 'Nouveau'))}>
                      {chosen.statut || 'Nouveau'}
                    </Badge>
                  </dd>
                </div>
              </dl>

              <div className="grid grid-cols-1 gap-2">
                <Button type="button" onClick={() => handlePhotos(chosen)} className="h-12 gap-2 font-semibold">
                  <Camera />
                  Ajouter photos / documents
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handlePlanifier(chosen)}
                  className="h-12 gap-2"
                >
                  <Calendar />
                  Planifier la mission
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
                    Autres résultats
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
                  Reprendre la photo
                </Button>
              </div>
            </>
          ) : (
            <>
              {error && <p role="alert" className="text-sm text-status-danger-fg">{error}</p>}
              {scanOutcome()}

              {displayed.length > 0 && (
                <div className="max-h-[280px] overflow-y-auto rounded-md border border-hairline">
                  <ul className="divide-y divide-hairline">
                    {scan && scan.matches.length === 0 && scan.fuzzy.length > 0 && (
                      <li className="t-label px-3 py-2">
                        Correspondances possibles
                      </li>
                    )}
                    {displayed.map((d) => (
                      <li key={d.id}>
                        {/* Thumb-friendly rows (≥ 56 px) on hairlines. */}
                        <button
                          type="button"
                          onClick={() => setChosen(d)}
                          className="flex min-h-[56px] w-full flex-col justify-center px-3 py-2 text-left hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="t-mono font-semibold">
                              {d.refExpert || d.id}
                            </span>
                            <span className="t-caption truncate">
                              {d.compagnie || '—'}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-baseline justify-between gap-2 text-sm text-ink-2">
                            <span className="truncate">{assureLabel(d)}</span>
                            <span className="t-mono text-ink-2">
                              {d.matricule || d.vehicule?.immatriculation || '—'}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button type="button" variant="outline" onClick={trigger} className="h-12 w-full gap-2">
                <Camera />
                Reprendre la photo
              </Button>
            </>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeAll}>
              Fermer
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
