'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Camera, Loader2, ScanLine } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

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
export default function AtScanPlaqueFlow() {
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

  const scanBanner = () => {
    if (!scan || chosen) return null;
    const uncertain = scan.confidence === 'low' ? ' (lecture incertaine — vérifiez)' : '';
    let tone = 'bg-status-success-bg text-status-success-fg';
    let msg: string;
    if (scan.matches.length > 1) {
      msg = `${scan.matches.length} dossiers portent cette plaque${uncertain}. Sélectionnez le bon ci-dessous.`;
    } else if (scan.fuzzy.length > 0) {
      tone = 'bg-status-warning-bg text-status-warning-fg';
      msg = `Aucune correspondance exacte${uncertain}. Vérifiez les correspondances possibles ci-dessous, ou reprenez la photo.`;
    } else {
      tone = 'bg-status-danger-bg text-status-danger-fg';
      msg = `Aucun dossier ne correspond à cette plaque${uncertain}. Le dossier n'existe peut-être pas encore — reprenez la photo ou contactez votre gestionnaire.`;
    }
    return (
      <div className={`rounded-md px-3 py-2 text-xs ${tone}`}>
        <span className="font-semibold font-mono">Plaque détectée : {scan.plate}</span>
        <p className="mt-0.5">{msg}</p>
      </div>
    );
  };

  return (
    <>
      {inputNode}

      <Button
        type="button"
        size="sm"
        onClick={handleScanClick}
        disabled={scanning}
        className="h-9 gap-1.5 text-xs"
      >
        <ScanLine className="h-3.5 w-3.5" />
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
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-ink-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              {scanning ? 'Lecture de la plaque...' : 'Chargement des dossiers...'}
            </div>
          ) : chosen ? (
            <>
              {/* Action stage — dossier identified */}
              <div className="rounded-md bg-status-success-bg px-3 py-2 text-xs text-status-success-fg">
                {scan && (
                  <span className="font-semibold font-mono">Plaque détectée : {scan.plate}</span>
                )}
                <div className="mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm">{chosen.refExpert || chosen.id}</span>
                  <span className="text-[11px]">{chosen.compagnie || '—'}</span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-2">
                  <span>{assureLabel(chosen)}</span>
                  <span className="font-mono">
                    {chosen.matricule || chosen.vehicule?.immatriculation || '—'}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px]">
                  Statut : {chosen.statut || 'Nouveau'}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button type="button" onClick={() => handlePhotos(chosen)} className="h-11 gap-2">
                  <Camera className="h-4 w-4" />
                  Ajouter photos / documents
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handlePlanifier(chosen)}
                  className="h-11 gap-2"
                >
                  <Calendar className="h-4 w-4" />
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
                    className="gap-1.5 text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
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
                  className="gap-1.5 text-xs"
                >
                  <ScanLine className="h-3.5 w-3.5" />
                  Reprendre la photo
                </Button>
              </div>
            </>
          ) : (
            <>
              {error && <p className="text-xs text-destructive">{error}</p>}
              {scanBanner()}

              {displayed.length > 0 && (
                <div className="max-h-[280px] overflow-y-auto rounded-md border border-hairline">
                  <ul>
                    {scan && scan.matches.length === 0 && scan.fuzzy.length > 0 && (
                      <li className="t-label border-b border-hairline bg-status-warning-bg px-3 py-1.5 text-status-warning-fg">
                        Correspondances possibles
                      </li>
                    )}
                    {displayed.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => setChosen(d)}
                          className="w-full border-b border-hairline px-3 py-2 text-left text-xs last:border-b-0 hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-mono font-semibold tabular-nums text-ink">
                              {d.refExpert || d.id}
                            </span>
                            <span className="text-[11px] text-ink-3">
                              {d.compagnie || '—'}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-baseline justify-between gap-2 text-ink-2">
                            <span>{assureLabel(d)}</span>
                            <span className="font-mono">
                              {d.matricule || d.vehicule?.immatriculation || '—'}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button type="button" variant="outline" onClick={trigger} className="w-full gap-2">
                <ScanLine className="h-4 w-4" />
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
