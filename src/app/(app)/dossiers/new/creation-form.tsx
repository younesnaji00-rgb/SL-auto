'use client';

import React, { useState, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, AlertCircle, Loader2, ScanSearch, SkipForward } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useFirebaseApp, useAuth } from '@/firebase';
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
  dateOfLoss: z.date().optional().nullable(),
  dateOfMEC: z.date().optional().nullable(),
  // Intermédiaire & Refs
  intermediaryName: z.string().optional(),
  intermediaryEmail: z.string().optional(),
  refExpert: z.string().optional(),
  dateOfRequest: z.date().optional().nullable(),
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
  planDateRDV: z.date().optional().nullable(),
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

  // Document state - split into scan vs normal
  const [scanFiles, setScanFiles] = useState<UploadedFile[]>([]);
  const [normalFiles, setNormalFiles] = useState<UploadedFile[]>([]);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [showDocViewer, setShowDocViewer] = useState(true);
  const [scanComplete, setScanComplete] = useState(false);

  const { toast } = useToast();
  const db = useFirestore();
  const app = useFirebaseApp();
  const auth = useAuth();
  const router = useRouter();

  const allFiles = [...scanFiles, ...normalFiles];

  const form = useForm<DossierFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expertRank: '1er expert',
      dossierMode: 'Procédure normale',
      repairerType: 'Agréé',
      secondExpertName: '',
      secondExpertCompany: '',
      registrationW: '',
      insuredWhatsapp: '',
      insuredOtherPhone: '',
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
      planTypeMission: 'Expertise',
      planTimeRDV: '09:00',
      planZone: '',
      planAdresse: '',
      planObservation: '',
    },
  });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

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
      setCurrentStep(2);
    }
  }, [scanFiles, form, toast]);

  const handleSkipScan = () => {
    setScanComplete(false);
    setAutoFilledFields(new Set());
    setCurrentStep(2);
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
    if (!db || !app || !auth?.currentUser) return;
    setIsSubmitting(true);
    const storage = getStorage(app);
    const userEmail = auth.currentUser.email || 'Admin';
    const userId = auth.currentUser.uid;

    try {
      const refCode = data.refExpert || `EXP-${Date.now().toString().slice(-6)}`;

      const dossierData = {
        ...data,
        dateOfLoss: data.dateOfLoss ? data.dateOfLoss.toISOString() : null,
        dateOfRequest: data.dateOfRequest ? data.dateOfRequest.toISOString() : null,
        dateOfMEC: data.dateOfMEC?.toISOString() || null,
        statut: 'Création de mission',
        createdAt: serverTimestamp(),
        createdBy: userId,
        refExpert: refCode,
        // Structured fields for unified information tab
        assure: { nom: data.insuredName || '', prenom: '', telephone: data.insuredPhone || '', whatsapp: data.insuredWhatsapp || '', telephone2: data.insuredOtherPhone || '', email: '', adresse: '', cin: '' },
        nature: data.nature || '',
        typeDossier: data.dossierType || '',
        modeDossier: data.dossierMode || '',
        matricule: data.registration || '',
        policeNumber: data.policyNumber || '',
        referenceCompagnie: data.companyRef || '',
        dateSinistre: data.dateOfLoss ? data.dateOfLoss.toISOString() : null,
        dateRequete: data.dateOfRequest ? data.dateOfRequest.toISOString() : null,
        compagnie: data.company || '',
        vehicule: { marque: data.brand || '', modele: data.model || '', immatriculation: data.registration || '', serie: '', energie: '', puissance: '', mec: data.dateOfMEC?.toISOString() || '', km: '' },
        // Partie adverse (flat fields for unified tab)
        adverseNom: data.adversaireAssure || '',
        adverseMatricule: data.adversaireMatricule || '',
        adverseCompagnie: data.adversaireCompagnie || '',
        partieAdverse: { assure: data.adversaireAssure || '', matricule: data.adversaireMatricule || '', marque: data.adversaireMarque || '', police: data.adversairePolice || '', compagnie: data.adversaireCompagnie || '' },
        // Intermédiaire (flat fields for unified tab)
        intermediaireNom: data.intermediaryName || '',
        intermediaireEmail: data.intermediaryEmail || '',
        // Expert designations
        experts: { designation1er: data.designation1erExpert || '', designation2eme: data.designation2emeExpert || '', designationArbitrage: data.designationExpertArbitrage || '' },
        expertRank: data.expertRank || '1er expert',
        secondExpertName: data.secondExpertName || '',
        secondExpertCompany: data.secondExpertCompany || '',
      };

      // Remove plan fields from dossier doc (they go in subcollection)
      const { planAgentTerrain, planTypeMission, planDateRDV, planTimeRDV, planZone, planAdresse, planObservation, ...cleanDossierData } = dossierData as any;

      const docRef = await addDoc(collection(db, 'dossiers'), cleanDossierData);
      const dossierId = docRef.id;

      // Create historique entry
      await addDoc(collection(db, 'dossiers', dossierId, 'historique'), {
        action: 'Création',
        date: serverTimestamp(),
        user: userEmail,
        details: `Dossier créé (Réf: ${refCode})`,
      });

      await logWorkflow(db, dossierId, 'Création de mission', userEmail, userId, 'done');

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
          typeMission: data.planTypeMission || 'Expertise',
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

      // Upload ALL files (scan + normal)
      for (const uf of allFiles) {
        const storagePath = `dossiers/${dossierId}/documents/${uf.file.name}`;
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, uf.file);
        const downloadUrl = await getDownloadURL(fileRef);
        await addDoc(collection(db, 'dossiers', dossierId, 'documents'), {
          nom: uf.file.name,
          type: 'Autre',
          url: downloadUrl,
          taille: uf.file.size,
          uploadePar: userEmail,
          dateUpload: serverTimestamp(),
          storagePath,
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
  const showSideViewer = hasDocuments && currentStep >= 2 && showDocViewer;

  return (
    <FormProvider {...form}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Stepper */}
        <div className="relative flex justify-between px-4 max-w-3xl mx-auto">
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-muted -z-10" />
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            return (
              <button key={step.id} type="button" onClick={() => setCurrentStep(step.id)}
                className="flex flex-col items-center gap-2 bg-background group">
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

        {/* Main Content: Split layout */}
        <div className={cn("flex gap-6", showSideViewer ? "items-start" : "")}>
          {/* Form Side */}
          <div className={cn("transition-all duration-300", showSideViewer ? "flex-1 min-w-0" : "w-full max-w-4xl mx-auto")}>
            <Card className="shadow-lg border-blue-600/5">
              <CardContent className="p-8">
                <form onSubmit={form.handleSubmit(handleSubmitClick)} className="space-y-8">
                  <div className="min-h-[400px]">
                    {currentStep === 1 && (
                      <StepDocuments
                        scanFiles={scanFiles}
                        normalFiles={normalFiles}
                        onScanFilesChange={setScanFiles}
                        onNormalFilesChange={setNormalFiles}
                      />
                    )}
                    {currentStep === 2 && <Step1 autoFilledFields={autoFilledFields} />}
                    {currentStep === 3 && <StepPlanification />}
                    {currentStep === 4 && <Step4Confirmation />}
                  </div>

                  {/* Auto-fill indicator */}
                  {currentStep === 2 && autoFilledFields.size > 0 && scanComplete && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm">
                      <ScanSearch className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-amber-700 dark:text-amber-400">
                        <strong>{autoFilledFields.size} champ(s)</strong> pré-rempli(s) par l'IA (marqués <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold">AUTO</span>). Veuillez vérifier.
                      </span>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between pt-6 border-t">
                    <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1 || isSubmitting || isScanning}>
                      Précédent
                    </Button>
                    <div className="flex gap-3">
                      {currentStep === 1 && (
                        <>
                          <Button type="button" variant="outline" onClick={handleSkipScan} className="gap-2">
                            <SkipForward className="h-4 w-4" /> Passer le scan
                          </Button>
                          <Button type="button" onClick={handleScanDocuments} disabled={isScanning || scanFiles.length === 0} className="gap-2 bg-blue-600 hover:bg-blue-700">
                            {isScanning ? (<><Loader2 className="h-4 w-4 animate-spin" /> Scan en cours...</>) : (<><ScanSearch className="h-4 w-4" /> Scanner & Continuer</>)}
                          </Button>
                        </>
                      )}
                      {currentStep > 1 && currentStep < steps.length && (
                        <Button type="button" onClick={nextStep}>Suivant</Button>
                      )}
                      {currentStep === steps.length && (
                        <Button type="submit" disabled={isSubmitting} className="min-w-[150px] bg-blue-600 hover:bg-blue-700">
                          {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</>) : "Créer le dossier"}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Document Viewer Side */}
          {hasDocuments && currentStep >= 2 && (
            <div className={cn("transition-all duration-300 shrink-0 sticky top-4", showDocViewer ? "w-[400px]" : "w-10")}>
              <DocumentViewer files={allFiles} currentStep={currentStep} visible={showDocViewer} onToggle={() => setShowDocViewer(v => !v)} />
            </div>
          )}
        </div>

        {/* Soft Warning Dialog */}
        <AlertDialog open={showSoftWarning} onOpenChange={setShowSoftWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600"><AlertCircle className="h-5 w-5" /> Dossier incomplet</AlertDialogTitle>
              <AlertDialogDescription>
                Certains champs importants sont encore vides :
                <ul className="list-disc pl-5 mt-2 font-semibold">{missingFieldsList.map((f, i) => <li key={i}>{f}</li>)}</ul>
                <p className="mt-4">Voulez-vous créer le dossier quand même ?</p>
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
    </FormProvider>
  );
}
