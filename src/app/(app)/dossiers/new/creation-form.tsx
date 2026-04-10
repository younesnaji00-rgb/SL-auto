'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, AlertCircle, Loader2, ScanSearch, SkipForward } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useFirebaseApp, useAuth, useUser } from '@/firebase';
import { getStorage } from 'firebase/storage';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import StepDocuments from './step-documents';
import Step1 from './step-1';
import StepPlanification from './step-planification';
import Step4Confirmation from './step-4';
import DocumentViewer from './document-viewer';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import { logWorkflow } from '../[id]/log-historique';

const formSchema = z.object({
  // Expert
  expertRank: z.string().optional(),
  secondExpertName: z.string().optional(),
  secondExpertCompany: z.string().optional(),
  // Dossier
  dossierMode: z.string().optional(),
  company: z.string().optional(),
  dossierType: z.string().optional(),
  nature: z.string().optional(),
  // Assuré
  insuredName: z.string().optional(),
  insuredPhone: z.string().optional(),
  insuredWhatsapp: z.string().optional(),
  insuredOtherPhone: z.string().optional(),
  // Véhicule
  brand: z.string().optional(),
  model: z.string().optional(),
  registration: z.string().optional(),
  registrationW: z.string().optional(),
  dateOfLoss: z.any().optional(),
  dateOfMEC: z.any().optional(),
  // Intermédiaire & Refs
  intermediaryName: z.string().optional(),
  intermediaryEmail: z.string().optional(),
  refExpert: z.string().optional(),
  dateOfRequest: z.any().optional(),
  companyRef: z.string().optional(),
  policyNumber: z.string().optional(),
  repairerType: z.string().optional(),
  garageName: z.string().optional(),
  // Adversaire
  adversaireAssure: z.string().optional(),
  adversaireMatricule: z.string().optional(),
  adversaireMarque: z.string().optional(),
  adversairePolice: z.string().optional(),
  adversaireCompagnie: z.string().optional(),
  // Expert designations
  designation1erExpert: z.string().optional(),
  designation2emeExpert: z.string().optional(),
  designationExpertArbitrage: z.string().optional(),
  // Planification
  planAgentTerrain: z.string().optional(),
  planTypeMission: z.string().optional(),
  planDateRDV: z.any().optional(),
  planTimeRDV: z.string().optional(),
  planZone: z.string().optional(),
  planAdresse: z.string().optional(),
  planObservation: z.string().optional(),

  files: z.any().optional(),
});

export type DossierFormData = z.infer<typeof formSchema>;

interface UploadedFile {
  file: File;
  preview: string;
}

const steps = [
  { id: 1, name: 'Documents', label: 'Étape 1' },
  { id: 2, name: 'Informations', label: 'Étape 2' },
  { id: 3, name: 'Planification', label: 'Étape 3' },
  { id: 4, name: 'Confirmation', label: 'Étape 4' },
];

export default function DossierCreationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showSoftWarning, setShowSoftWarning] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]);
  const [tempFormData, setTempFormData] = useState<DossierFormData | null>(null);

  // Document state
  const [scanFiles, setScanFiles] = useState<UploadedFile[]>([]);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [showDocViewer, setShowDocViewer] = useState(true);
  const [scanComplete, setScanComplete] = useState(false);

  const sectionRefs = useRef<(HTMLElement | null)[]>([null, null, null, null]);

  const { toast } = useToast();
  const db = useFirestore();
  const app = useFirebaseApp();
  const auth = useAuth();
  const { user: currentUser, loading: authLoading } = useUser();
  const router = useRouter();
  const isOnline = useNetworkStatus();

  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const previousSidebarState = useRef<boolean | null>(null);

  const allFiles = scanFiles;

  const form = useForm<DossierFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expertRank: '1er expert',
      dossierMode: 'Procédure normale',
      repairerType: 'Agréé',
      secondExpertName: '',
      secondExpertCompany: '',
      company: '',
      dossierType: '',
      nature: '',
      insuredName: '',
      insuredPhone: '',
      insuredWhatsapp: '',
      insuredOtherPhone: '',
      brand: '',
      model: '',
      registration: '',
      registrationW: '',
      intermediaryName: '',
      intermediaryEmail: '',
      refExpert: '',
      companyRef: '',
      policyNumber: '',
      garageName: '',
      adversaireAssure: '',
      adversaireMatricule: '',
      adversaireMarque: '',
      adversairePolice: '',
      adversaireCompagnie: '',
      designation1erExpert: '',
      designation2emeExpert: '',
      designationExpertArbitrage: '',
      planAgentTerrain: '',
      planTypeMission: 'Avant',
      planTimeRDV: '09:00',
      planZone: '',
      planAdresse: '',
      planObservation: '',
    },
  });

  // ----- IntersectionObserver to track active section -----
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          if (id) {
            const stepNum = parseInt(id.replace('step-', ''), 10);
            if (!isNaN(stepNum)) {
              setCurrentStep(stepNum);
            }
          }
        }
      }
    };

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    });

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // ----- Click to scroll -----
  const scrollToStep = (stepId: number) => {
    document.getElementById(`step-${stepId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ----- AI SCAN (only scan files) -----
  const handleScanDocuments = useCallback(async () => {
    if (scanFiles.length === 0) {
      toast({ variant: 'destructive', title: 'Aucun document à scanner', description: 'Ajoutez des documents dans la zone "Documents à scanner".' });
      return;
    }

    setIsScanning(true);
    const filled = new Set<string>();

    try {
      const fileToScan = scanFiles[0];
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(fileToScan.file);
      });

      const response = await fetch('/api/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, contentType: fileToScan.file.type }),
      });

      if (!response.ok) throw new Error('Erreur lors du scan');

      const { data, fieldsFound } = await response.json();

      if (data && fieldsFound > 0) {
        const dateFields = ['dateOfLoss', 'dateOfRequest', 'dateOfMEC'];
        for (const [key, value] of Object.entries(data)) {
          if (value === null || value === undefined) continue;
          if (dateFields.includes(key) && typeof value === 'string') {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) { form.setValue(key as any, parsed); filled.add(key); }
          } else if (typeof value === 'string' && value.trim()) {
            form.setValue(key as any, value); filled.add(key);
          }
        }
        setAutoFilledFields(filled);
        setScanComplete(true);
        toast({ title: 'Scan terminé', description: `${filled.size} champ(s) pré-rempli(s). Veuillez vérifier.` });
      } else {
        toast({ variant: 'destructive', title: 'Aucune donnée extraite', description: 'Remplissez manuellement.' });
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      toast({ variant: 'destructive', title: 'Erreur de scan', description: error.message || 'Erreur.' });
    } finally {
      setIsScanning(false);
      // After scan, scroll to the Informations section
      document.getElementById('step-2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scanFiles, form, toast]);

  const handleSkipScan = () => {
    setScanComplete(false);
    setAutoFilledFields(new Set());
    // Scroll to Informations section
    document.getElementById('step-2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ----- SUBMISSION -----
  const checkEmptyFields = (data: DossierFormData) => {
    const missing: string[] = [];
    if (!data.company) missing.push("Compagnie");
    if (!data.nature) missing.push("Nature");
    if (!data.brand) missing.push("Marque véhicule");
    if (!data.registration) missing.push("Immatriculation");
    if (!data.insuredName) missing.push("Nom assuré");
    if (!data.dateOfLoss) missing.push("Date sinistre");
    if (!data.dateOfRequest) missing.push("Date requête");
    return missing;
  };

  const handleSubmitClick = (data: DossierFormData) => {
    console.log('[DossierCreation] handleSubmitClick called', data);
    const missing = checkEmptyFields(data);
    if (missing.length > 0) {
      setMissingFieldsList(missing);
      setTempFormData(data);
      setShowSoftWarning(true);
    } else {
      executeCreation(data);
    }
  };

  const executeCreation = async (data: DossierFormData) => {
    if (!db || !app) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Services Firebase non disponibles. Rechargez la page.' });
      return;
    }
    setIsSubmitting(true);
    const storage = getStorage(app);
    const userEmail = currentUser?.email || auth?.currentUser?.email || 'Admin';
    const userId = currentUser?.uid || auth?.currentUser?.uid || 'system';

    try {
      const refCode = data.refExpert || `EXP-${Date.now().toString().slice(-6)}`;

      // Build clean dossier document — only structured fields, no orphan form fields
      const cleanDossierData: Record<string, any> = {
        statut: 'Création de mission',
        createdAt: serverTimestamp(),
        createdBy: userId,
        refExpert: refCode,
        expertRank: data.expertRank || '1er expert',
        secondExpertName: data.secondExpertName || '',
        secondExpertCompany: data.secondExpertCompany || '',
        // Dossier info
        compagnie: data.company || '',
        typeDossier: data.dossierType || '',
        nature: data.nature || '',
        modeDossier: data.dossierMode || '',
        matricule: data.registration || '',
        policeNumber: data.policyNumber || '',
        referenceCompagnie: data.companyRef || '',
        repairerType: data.repairerType || '',
        garageName: data.garageName || '',
        // Dates as Firestore Timestamps for consistency
        dateSinistre: data.dateOfLoss ? Timestamp.fromDate(data.dateOfLoss instanceof Date ? data.dateOfLoss : new Date(data.dateOfLoss)) : null,
        dateRequete: data.dateOfRequest ? Timestamp.fromDate(data.dateOfRequest instanceof Date ? data.dateOfRequest : new Date(data.dateOfRequest)) : null,
        // Assuré (structured)
        assure: { nom: data.insuredName || '', prenom: '', telephone: data.insuredPhone || '', whatsapp: data.insuredWhatsapp || '', telephone2: data.insuredOtherPhone || '', email: '', adresse: '', cin: '' },
        // Véhicule (structured)
        vehicule: { marque: data.brand || '', modele: data.model || '', immatriculation: data.registration || '', serie: '', energie: '', puissance: '', mec: data.dateOfMEC ? (data.dateOfMEC instanceof Date ? data.dateOfMEC : new Date(data.dateOfMEC)).toISOString() : '', km: '' },
        // Partie adverse (flat + structured for compatibility)
        adverseNom: data.adversaireAssure || '',
        adverseMatricule: data.adversaireMatricule || '',
        adverseCompagnie: data.adversaireCompagnie || '',
        partieAdverse: { assure: data.adversaireAssure || '', matricule: data.adversaireMatricule || '', marque: data.adversaireMarque || '', police: data.adversairePolice || '', compagnie: data.adversaireCompagnie || '' },
        // Intermédiaire (flat fields matching information-tab reads)
        intermediaireNom: data.intermediaryName || '',
        intermediaireEmail: data.intermediaryEmail || '',
        // Expert designations
        experts: { designation1er: data.designation1erExpert || '', designation2eme: data.designation2emeExpert || '', designationArbitrage: data.designationExpertArbitrage || '' },
      };

      const docRef = await addDoc(collection(db, 'dossiers'), cleanDossierData);
      const dossierId = docRef.id;

      // Create historique entry
      await addDoc(collection(db, 'dossiers', dossierId, 'historique'), {
        action: 'Création',
        date: serverTimestamp(),
        user: userEmail,
        details: `Dossier créé (Réf: ${refCode})`,
      });

      await logWorkflow(db, dossierId, 'Création de dossier', userEmail, userId, 'done', { dossierRef: refCode, details: `Nouveau dossier créé (Réf: ${refCode})` });

      // Create planification if any field was filled
      if (data.planAgentTerrain || data.planDateRDV || data.planZone) {
        let finalRDV = null;
        if (data.planDateRDV) {
          const d = new Date(data.planDateRDV);
          const timeParts = (data.planTimeRDV || '09:00').split(':');
          d.setHours(parseInt(timeParts[0] || '0'), parseInt(timeParts[1] || '0'), 0, 0);
          finalRDV = Timestamp.fromDate(d);
        }
        await addDoc(collection(db, 'dossiers', dossierId, 'planifications'), {
          agentTerrain: data.planAgentTerrain || '',
          typeMission: data.planTypeMission || 'Avant',
          dateRDV: finalRDV,
          zone: data.planZone || '',
          adresse: data.planAdresse || '',
          observation: data.planObservation || '',
          createdAt: serverTimestamp(),
          modifiedAt: serverTimestamp(),
          modifiedBy: userId,
          modifiedByName: userEmail,
          active: true,
        });
      }

      // Upload ALL files (scan + normal) — with offline support
      for (const uf of allFiles) {
        const timestamp = Date.now();
        const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${uf.file.name}`;
        await uploadFileWithOfflineSupport({
          storage,
          db,
          file: uf.file,
          fileName: uf.file.name,
          storagePath,
          firestoreDocPath: `dossiers/${dossierId}/documents`,
          firestoreMetadata: {
            nom: uf.file.name,
            type: 'Autre',
            taille: uf.file.size,
            uploadePar: userEmail,
            storagePath,
            _localCreatedAt: timestamp,
          },
        });
      }

      toast({ title: "Dossier Créé", description: `Le dossier ${refCode} a été enregistré avec succès.` });
      router.push('/dossiers');
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur", description: "Erreur lors de la création du dossier." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasDocuments = allFiles.length > 0;
  const showSideViewer = hasDocuments && showDocViewer;

  // Auto-collapse sidebar when document viewer is open to maximize space
  useEffect(() => {
    if (showSideViewer) {
      if (previousSidebarState.current === null) {
        previousSidebarState.current = sidebarOpen;
      }
      setSidebarOpen(false);
    } else if (previousSidebarState.current !== null) {
      setSidebarOpen(previousSidebarState.current);
      previousSidebarState.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSideViewer]);

  // Restore sidebar on unmount
  useEffect(() => {
    return () => {
      if (previousSidebarState.current !== null) {
        setSidebarOpen(previousSidebarState.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FormProvider {...form}>
      <div className="flex flex-col -mx-4 md:-mx-6 lg:-mx-8 -mb-4 md:-mb-6 lg:-mb-8" style={{ height: 'calc(100vh - 130px)' }}>
        {/* Fixed Stepper Navigation — always visible toolbar */}
        <div className="shrink-0 z-30 bg-background/95 backdrop-blur border-b py-4 px-4 md:px-6 lg:px-8">
          <div className="relative flex justify-between px-4 max-w-3xl mx-auto">
            <div className="absolute top-5 left-8 right-8 h-0.5 bg-muted -z-10" />
            {steps.map((step) => {
              const isCompleted = currentStep > step.id;
              const isActive = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => scrollToStep(step.id)}
                  className="flex flex-col items-center gap-2 bg-transparent group"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 bg-background",
                    isCompleted && "bg-blue-600 border-blue-600 text-white",
                    isActive && "border-blue-600 ring-4 ring-blue-600/10",
                    !isActive && !isCompleted && "border-muted text-muted-foreground"
                  )}>
                    {isCompleted ? <Check className="w-6 h-6" /> : <span>{step.id}</span>}
                  </div>
                  <span className={cn("text-xs font-medium transition-colors hidden sm:block", isActive ? "text-blue-600" : "text-muted-foreground")}>
                    {step.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto mt-8">
        {/* Main Content: Split layout */}
        <div className={cn("flex gap-6", showSideViewer ? "items-start" : "")}>
          {/* Form Side */}
          <div className={cn("transition-all duration-300", showSideViewer ? "flex-1 min-w-0" : "w-full max-w-4xl mx-auto")}>
            <form onSubmit={form.handleSubmit(handleSubmitClick, (errors) => {
              console.error('Form validation errors:', errors);
              const fieldNames = Object.keys(errors).join(', ');
              toast({ variant: 'destructive', title: 'Erreur de validation', description: `Champs invalides : ${fieldNames}` });
            })} className="space-y-0">

              {/* ===== Step 1: Documents ===== */}
              <section
                id="step-1"
                ref={el => { sectionRefs.current[0] = el; }}
                className="scroll-mt-4"
              >
                <Card className="shadow-lg border-blue-600/5">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                      <h2 className="text-lg font-semibold">Documents</h2>
                    </div>
                    <div className="border-l-4 border-blue-600 pl-6">
                      <StepDocuments
                        scanFiles={scanFiles}
                        onScanFilesChange={setScanFiles}
                      />
                      {/* Scan buttons */}
                      <div className="flex gap-3 mt-6">
                        <Button type="button" variant="outline" onClick={handleSkipScan} className="gap-2">
                          <SkipForward className="h-4 w-4" /> Passer le scan
                        </Button>
                        <Button
                          type="button"
                          onClick={handleScanDocuments}
                          disabled={isScanning || scanFiles.length === 0 || !isOnline}
                          className="gap-2 bg-blue-600 hover:bg-blue-700"
                          title={!isOnline ? 'Scanner non disponible hors ligne' : undefined}
                        >
                          {isScanning ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Scan en cours...</>
                          ) : (
                            <><ScanSearch className="h-4 w-4" /> {!isOnline ? 'Scan (hors ligne)' : 'Scanner & Continuer'}</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <hr className="my-10 border-muted" />

              {/* ===== Step 2: Informations ===== */}
              <section
                id="step-2"
                ref={el => { sectionRefs.current[1] = el; }}
                className="scroll-mt-4"
              >
                <Card className="shadow-lg border-blue-600/5">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                      <h2 className="text-lg font-semibold">Informations</h2>
                    </div>
                    <div className="border-l-4 border-blue-600 pl-6">
                      <Step1 autoFilledFields={autoFilledFields} />
                    </div>
                    {/* Auto-fill indicator */}
                    {autoFilledFields.size > 0 && scanComplete && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm mt-6">
                        <ScanSearch className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="text-amber-700 dark:text-amber-400">
                          <strong>{autoFilledFields.size} champ(s)</strong> pré-rempli(s) par l&apos;IA (marqués <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold">AUTO</span>). Veuillez vérifier.
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>

              <hr className="my-10 border-muted" />

              {/* ===== Step 3: Planification ===== */}
              <section
                id="step-3"
                ref={el => { sectionRefs.current[2] = el; }}
                className="scroll-mt-4"
              >
                <Card className="shadow-lg border-blue-600/5">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">3</div>
                      <h2 className="text-lg font-semibold">Planification</h2>
                    </div>
                    <div className="border-l-4 border-blue-600 pl-6">
                      <StepPlanification />
                    </div>
                  </CardContent>
                </Card>
              </section>

              <hr className="my-10 border-muted" />

              {/* ===== Step 4: Confirmation ===== */}
              <section
                id="step-4"
                ref={el => { sectionRefs.current[3] = el; }}
                className="scroll-mt-4"
              >
                <Card className="shadow-lg border-blue-600/5">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">4</div>
                      <h2 className="text-lg font-semibold">Confirmation</h2>
                    </div>
                    <div className="border-l-4 border-blue-600 pl-6">
                      <Step4Confirmation />
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Submit button at the bottom */}
              <div className="flex justify-end pt-8 pb-4">
                <Button type="submit" disabled={isSubmitting} className="min-w-[150px] bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</>) : "Créer le dossier"}
                </Button>
              </div>
            </form>
          </div>

          {/* Document Viewer Side - sticky sidebar visible when files are uploaded */}
          {hasDocuments && (
            <div className={cn("transition-all duration-300 shrink-0 sticky top-24", showDocViewer ? "w-1/2" : "w-10")}>
              <DocumentViewer files={allFiles} currentStep={currentStep} visible={showDocViewer} onToggle={() => setShowDocViewer(v => !v)} />
            </div>
          )}
        </div>

        {/* Soft Warning Dialog */}
        <AlertDialog open={showSoftWarning} onOpenChange={setShowSoftWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600"><AlertCircle className="h-5 w-5" /> Dossier incomplet</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="text-sm text-muted-foreground">
                  Certains champs importants sont encore vides :
                  <ul className="list-disc pl-5 mt-2 font-semibold">{missingFieldsList.map((f, i) => <li key={i}>{f}</li>)}</ul>
                  <p className="mt-4">Voulez-vous créer le dossier quand même ?</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowSoftWarning(false)}>Compléter les champs</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowSoftWarning(false); if (tempFormData) executeCreation(tempFormData); }} className="bg-blue-600 hover:bg-blue-700">
                Continuer quand même
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
        </div>{/* close scrollable content area */}
      </div>
    </FormProvider>
  );
}
