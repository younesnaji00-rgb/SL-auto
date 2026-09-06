'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calculator,
  Loader2,
  FileDown,
  FileUp,
  Sparkles,
} from 'lucide-react';
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { generateRapportReformePDF } from '@/lib/generate-rapport-reforme-pdf';
import { generateRapportFinalPDF } from '@/lib/generate-rapport-final-pdf';
import { generateRapportEstimatifPDF } from '@/lib/generate-rapport-estimatif-pdf';
import { generateRapportPreliminairePDF } from '@/lib/generate-rapport-preliminaire-pdf';
import type { RapportType } from '@/lib/generate-rapport-shared';
import { RapportTypeDialog } from '@/components/modals/rapport-type-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { logWorkflow } from './log-historique';
import { useDossierDocWrite, applyPendingToDossier } from './rappel-draft';
import { useTabSlopeMorphRef } from '@/hooks/use-tab-morph';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useReplayHighlight, highlightClass, ChangeBadge } from '@/components/dossier-timeline/replay-highlight';
import { ValiderDossierButton } from '@/components/dossiers/valider-dossier-button';
import CarSvgTop from '@/components/car-svg-top';
import CarSvgBottom from '@/components/car-svg-bottom';
import { apiFetch } from '@/lib/api-fetch';
import { useT } from '@/i18n';

// Browser-tab trigger (owner rulings 2026-09-02 + ter), styled to match
// components/dossier-timeline/step-tabs.tsx: `.tab-slope` (globals.css)
// draws the sloped grey body + outward feet that merge into the list's
// bottom hairline; active = card fill + rim, with the 2 px accent underline
// kept as the second cue (the old underline-only idiom is gone).
const DIAGRAM_TAB_TRIGGER =
  // Underline = span (never border-b-2: a bottom border lifts the padding box
  // the feet anchor to — the arcs hung 2px above the line; owner 2026-09-03).
  'tab-slope group relative -mb-px inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card data-[state=active]:text-ink';

const DIAGRAM_TAB_BAR =
  'pointer-events-none absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary opacity-0 transition-opacity group-data-[state=active]:opacity-100';

export default function RapportTab({
  dossierId,
  dossierOverride,
  readOnly,
}: {
  dossierId: string;
  /** Replay: frozen dossier data rendered instead of the live subscription. */
  dossierOverride?: Record<string, any> | null;
  /**
   * Replay: hard read-only. Hides the director-validation button and inerts
   * « Générer le rapport » (both are role-gated, not canWrite-gated).
   */
  readOnly?: boolean;
}) {
  const t = useT();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { canWrite, profile } = useCurrentUser();
  const canEditDossiers = canWrite('dossiers');
  // Rappel session: the type/sous-type select autosaves are buffered until
  // « Sauvegarder »; PDF generation force-flushes first (see handleGenerate).
  const { write: writeDossierDoc, draft: rappelDraft } = useDossierDocWrite(dossierId);
  // Inert on the live page; in the rappel replica it flags whether the
  // gestionnaire changed the points-de-choc diagram during their session.
  const hl = useReplayHighlight();
  const pointsChocStatus = hl.statusForPath('pointsChoc');
  const pointsChocDessousStatus = hl.statusForPath('pointsChocDessous');
  // Symbiote morph on the diagram's vue dessus/dessous strip (owner
  // 2026-09-02: raw TabsPrimitive strips animate like every other tab).
  const diagramMorphRef = useTabSlopeMorphRef();

  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [directorValidated, setDirectorValidated] = useState<
    { by?: string; at?: any; role?: string } | null
  >(null);
  const [rapportAlreadyDepose, setRapportAlreadyDepose] = useState(false);

  // Chiffrage type state
  const [typeChiffrage, setTypeChiffrage] = useState<'Réparation' | 'Réforme' | ''>('');
  const [sousTypeChiffrage, setSousTypeChiffrage] = useState('');
  const typeChiffrageInitialLoaded = useRef(false);

  // Scan / AI import
  const [isScanning, setIsScanning] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Points de Choc
  const [pointsChoc, setPointsChoc] = useState<Record<string, boolean>>({
    AR: false, ARG: false, ARD: false,
    LATG: false, LATD: false,
    AVG: false, AVD: false, AV: false,
    Toit: false
  });
  const [pointsChocDessous, setPointsChocDessous] = useState<Record<string, boolean>>({
    suspensionAV: false, soubassementAV: false, plancher: false,
    transmission: false, differentiel: false,
    suspensionAR: false, echappement: false, reservoir: false
  });
  const pointsChocInitialLoaded = useRef(false);

  useEffect(() => {
    if (dossierOverride !== undefined) {
      // Replay override: initialise from the frozen snapshot, no live subscription.
      const data = dossierOverride ?? {};
      if (data.pointsChoc) setPointsChoc(data.pointsChoc);
      if (data.pointsChocDessous) setPointsChocDessous(data.pointsChocDessous);
      if (data.typeChiffrage) setTypeChiffrage(data.typeChiffrage);
      if (data.sousTypeChiffrage) setSousTypeChiffrage(data.sousTypeChiffrage);
      setDirectorValidated(data.directorValidated ?? null);
      setRapportAlreadyDepose(!!data.dateRapportDepose);
      setLoading(false);
      return;
    }
    if (!db || !dossierId) return;

    const unsubscribeDossier = onSnapshot(doc(db, 'dossiers', dossierId), (snap) => {
      if (snap.exists()) {
        // Overlay the rappel buffer so a session's not-yet-published select /
        // points-de-choc edits survive a remount within the same session.
        const data = applyPendingToDossier(snap.data(), rappelDraft.getPending());

        if (!pointsChocInitialLoaded.current) {
          if (data.pointsChoc) setPointsChoc(data.pointsChoc);
          if (data.pointsChocDessous) setPointsChocDessous(data.pointsChocDessous);
          pointsChocInitialLoaded.current = true;
        }

        if (!typeChiffrageInitialLoaded.current) {
          if (data.typeChiffrage) setTypeChiffrage(data.typeChiffrage);
          if (data.sousTypeChiffrage) setSousTypeChiffrage(data.sousTypeChiffrage);
          typeChiffrageInitialLoaded.current = true;
        }

        setDirectorValidated(data.directorValidated ?? null);
        setRapportAlreadyDepose(!!data.dateRapportDepose);
      }
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => {
      unsubscribeDossier();
    };
  }, [db, dossierId, dossierOverride]);

  const handleTypeChiffrageChange = async (value: 'Réparation' | 'Réforme') => {
    setTypeChiffrage(value);
    setSousTypeChiffrage('');
    if (db) {
      try {
        await writeDossierDoc({ typeChiffrage: value, sousTypeChiffrage: '' });
      } catch { /* silent */ }
    }
  };

  const handleSousTypeChange = async (value: string) => {
    setSousTypeChiffrage(value);
    if (db) {
      try {
        await writeDossierDoc({ sousTypeChiffrage: value });
      } catch { /* silent */ }
    }
  };

  const handleScanImport = async (file: File) => {
    if (!db) return;
    setIsScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await apiFetch('/api/scan-rapport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, contentType: file.type }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t('Erreur lors du scan'));
      }

      const { data } = await res.json();

      // Add pieces to Firestore (chiffrage workflow)
      if (data.pieces && data.pieces.length > 0) {
        for (const piece of data.pieces) {
          await addDoc(collection(db, 'dossiers', dossierId, 'rapport_pieces'), {
            designation: piece.designation || '',
            operation: piece.operation || 'Echange',
            typePiece: piece.typePiece || 'P.Ps',
            vetuste: Number(piece.vetuste) || 0,
            quantite: Number(piece.quantite) || 1,
            puHT: Number(piece.puHT) || 0,
            remise: Number(piece.remise) || 0,
            tva: piece.tva !== false,
            typeChoc: piece.typeChoc || 'Choc 1',
            createdAt: serverTimestamp(),
          });
        }
      }

      // Update points de choc
      if (data.pointsChoc) {
        setPointsChoc(prev => {
          const updated = { ...prev };
          for (const [key, val] of Object.entries(data.pointsChoc)) {
            if (key in updated) updated[key] = Boolean(val);
          }
          return updated;
        });
      }
      if (data.pointsChocDessous) {
        setPointsChocDessous(prev => {
          const updated = { ...prev };
          for (const [key, val] of Object.entries(data.pointsChocDessous)) {
            if (key in updated) updated[key] = Boolean(val);
          }
          return updated;
        });
      }

      const userEmail = auth?.currentUser?.email || 'Admin';
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'Rapport mis à jour', userEmail, userId, 'done', { details: `Importation IA : ${data.pieces?.length || 0} pièce(s) extraite(s)` }, profile?.nom);

      toast({
        title: t('Importation réussie'),
        description: `${data.pieces?.length || 0} ${t("pièce(s) extraite(s) par l'IA.")}`,
      });
    } catch (error: any) {
      console.error('Scan rapport error:', error);
      toast({ variant: 'destructive', title: t("Erreur lors de l'importation"), description: error.message });
    } finally {
      setIsScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  const handleToggleZone = (key: string, isDessous: boolean = false) => {
    if (isDessous) {
      setPointsChocDessous(prev => ({ ...prev, [key]: !prev[key] }));
    } else {
      setPointsChoc(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleOpenTypeDialog = () => {
    setTypeDialogOpen(true);
  };

  const handleGenerate = async (type: RapportType) => {
    setIsGenerating(true);
    try {
      // Generating a rapport is a publication act: the PDF generators read
      // the dossier from Firestore, so any rappel-session buffer must be
      // committed first or the document would be built on stale data.
      await rappelDraft.flush();
      // Persist current points de choc before generating
      if (db) {
        try {
          await updateDoc(doc(db, 'dossiers', dossierId), { pointsChoc, pointsChocDessous });
        } catch { /* silent */ }
      }
      if (type === 'preliminaire') {
        await generateRapportPreliminairePDF(db, dossierId);
      } else if (type === 'estimatif') {
        await generateRapportEstimatifPDF(db, dossierId);
      } else if (type === 'reforme') {
        await generateRapportReformePDF(db, dossierId);
      } else {
        await generateRapportFinalPDF(db, dossierId);
      }
      if (db && !rapportAlreadyDepose) {
        const userEmail = auth?.currentUser?.email || 'Admin';
        const userId = auth?.currentUser?.uid || 'unknown';
        try {
          await updateDoc(doc(db, 'dossiers', dossierId), {
            dateRapportDepose: serverTimestamp(),
            authorRapportDepose: userEmail,
          });
        } catch { /* silent — funnel-only data, must not break the user-facing flow */ }
        try {
          await logWorkflow(db, dossierId, 'Rapport déposé', userEmail, userId, 'done', { details: `Type: ${type}` }, profile?.nom);
        } catch { /* silent */ }
      }
      toast({ title: t('Rapport généré') });
      setTypeDialogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <Card><CardContent className="p-10"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  const alreadyValidated = directorValidated != null;

  return (
    <div className="space-y-8">
      {/* HEADER WITH GÉNÉRER LE RAPPORT BUTTON */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-ink-3">{t('Diagramme des points de choc et génération du PDF final.')}</p>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <ValiderDossierButton
              dossierId={dossierId}
              alreadyValidated={alreadyValidated}
            />
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span data-tour="dosd-rapport-generer">
                  <Button
                    onClick={handleOpenTypeDialog}
                    disabled={isGenerating || !alreadyValidated || !!readOnly}
                    className="gap-2"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    {t('Générer le rapport')}
                  </Button>
                </span>
              </TooltipTrigger>
              {!alreadyValidated && (
                <TooltipContent>
                  {t("En attente de validation du directeur des opérations ou de l'administrateur")}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <RapportTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        onConfirm={handleGenerate}
        isGenerating={isGenerating}
      />

      {/* POINTS DE CHOC */}
      <Card>
        <CardHeader className="border-b border-hairline"><CardTitle>{t('Points de choc')}</CardTitle></CardHeader>
        <CardContent className="p-5">
          {/* Vue dessus / dessous as sloped browser tabs (styled like step-tabs).
              Zone-selection state lives in THIS component (pointsChoc /
              pointsChocDessous), so switching tabs unmounts only the SVG —
              nothing is lost and no forceMount is needed. PDF generation
              reads state + Firestore, not the DOM. */}
          <TabsPrimitive.Root defaultValue="dessus" className="w-full">
            <TabsPrimitive.List
              ref={diagramMorphRef}
              aria-label={t('Vue du diagramme')}
              className="relative isolate -mx-2 flex items-end gap-4 overflow-x-auto border-b border-hairline px-2 scrollbar-thin"
            >
              <TabsPrimitive.Trigger value="dessus" className={DIAGRAM_TAB_TRIGGER}>
                {t('Vue dessus')} <ChangeBadge status={pointsChocStatus} />
                <span className={DIAGRAM_TAB_BAR} aria-hidden />
                <span className="tab-feet" aria-hidden />
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger value="dessous" className={DIAGRAM_TAB_TRIGGER}>
                {t('Vue dessous')} <ChangeBadge status={pointsChocDessousStatus} />
                <span className={DIAGRAM_TAB_BAR} aria-hidden />
                <span className="tab-feet" aria-hidden />
              </TabsPrimitive.Trigger>
            </TabsPrimitive.List>
            <TabsPrimitive.Content value="dessus" className="pt-5 focus-visible:outline-none">
          <div className={cn("space-y-4 rounded-md", highlightClass(pointsChocStatus) && `${highlightClass(pointsChocStatus)} p-3`)}>
            <div className={cn("grid items-center gap-6 md:gap-10", canEditDossiers ? "grid-cols-1 lg:grid-cols-2" : "mx-auto max-w-md grid-cols-1")}>
              <div className={cn("mx-auto", !canEditDossiers && "pointer-events-none")}>
                <CarSvgTop zones={pointsChoc} onToggleZone={canEditDossiers ? (zone) => handleToggleZone(zone) : () => {}} />
              </div>
              {canEditDossiers && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.keys(pointsChoc).map(zone => (
                    <div key={zone} className="flex items-center space-x-3 rounded-md bg-surface-2 p-3 transition-colors hover:bg-surface-3">
                      <Checkbox id={`top-${zone}`} checked={pointsChoc[zone]} onCheckedChange={() => handleToggleZone(zone)} />
                      <Label htmlFor={`top-${zone}`} className="cursor-pointer text-[13px] font-medium text-ink">{zone}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
            </TabsPrimitive.Content>
            <TabsPrimitive.Content value="dessous" className="pt-5 focus-visible:outline-none">
          <div className={cn("space-y-4 rounded-md", highlightClass(pointsChocDessousStatus) && `${highlightClass(pointsChocDessousStatus)} p-3`)}>
            <div className={cn("grid items-center gap-6 md:gap-10", canEditDossiers ? "grid-cols-1 lg:grid-cols-2" : "mx-auto max-w-md grid-cols-1")}>
              <div className={cn("mx-auto", !canEditDossiers && "pointer-events-none")}>
                <CarSvgBottom zones={pointsChocDessous} onToggleZone={canEditDossiers ? (zone) => handleToggleZone(zone, true) : () => {}} />
              </div>
              {canEditDossiers && (
                <div className="grid grid-cols-1 gap-3">
                  {Object.keys(pointsChocDessous).map(zone => (
                    <div key={zone} className="flex items-center space-x-3 rounded-md bg-surface-2 p-3 transition-colors hover:bg-surface-3">
                      <Checkbox id={`bot-${zone}`} checked={pointsChocDessous[zone]} onCheckedChange={() => handleToggleZone(zone, true)} />
                      <Label htmlFor={`bot-${zone}`} className="cursor-pointer text-[13px] font-medium capitalize text-ink">{zone.replace(/([A-Z])/g, ' $1')}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
            </TabsPrimitive.Content>
          </TabsPrimitive.Root>
        </CardContent>
      </Card>
    </div>
  );
}
