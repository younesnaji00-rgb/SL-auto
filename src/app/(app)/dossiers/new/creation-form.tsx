'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import StepDocuments from './step-documents';
import Step1 from './step-1';
import StepPlanification from './step-planification';
import StepUploadDocuments from './step-upload-documents';
import Step4Confirmation from './step-4';
import DocumentViewer, { type DocumentViewerHandle } from './document-viewer';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import { logWorkflow } from '../[id]/log-historique';
import { useCompagnies } from '@/hooks/use-compagnies';
import { marques as defaultMarques } from '@/lib/dossiers-data';

const formSchema = z.object({
  // Expert
  expertRank: z.string().optional(),
  secondExpertName: z.string().optional(),
  secondExpertCompany: z.string().optional(),
  // Dossier
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
  chassisNumber: z.string().optional(),
  fiscalPower: z.string().optional(),
  fuelType: z.string().optional(),
  mileage: z.string().optional(),
  vehicleNewValue: z.string().optional(),
  vehicleUsage: z.string().optional(),
  // Assuré extended
  insuredSubscriber: z.string().optional(),
  insuredCardHolder: z.string().optional(),
  insuredAddress: z.string().optional(),
  // Contrat extended
  insuranceValidUntil: z.any().optional(),
  product: z.string().optional(),
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
  { id: 4, name: 'Pièces jointes', label: 'Étape 4' },
  { id: 5, name: 'Confirmation', label: 'Étape 5' },
];

export default function DossierCreationForm({ stepperCompact = false }: { stepperCompact?: boolean }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showSoftWarning, setShowSoftWarning] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]);
  const [tempFormData, setTempFormData] = useState<DossierFormData | null>(null);

  // Categorized document upload state
  const [categorizedFiles, setCategorizedFiles] = useState<Record<string, UploadedFile[]>>({});

  // Expert modal state
  const [expertModalOpen, setExpertModalOpen] = useState(true);
  const [pendingExpertRank, setPendingExpertRank] = useState('1er expert');
  const [pendingCompany, setPendingCompany] = useState('');
  const [pendingFirstExpertName, setPendingFirstExpertName] = useState('');
  const [pendingFirstExpertCompany, setPendingFirstExpertCompany] = useState('');

  // Document state
  const [scanFiles, setScanFiles] = useState<UploadedFile[]>([]);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [showDocViewer, setShowDocViewer] = useState(true);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanRegions, setScanRegions] = useState<Record<string, { fileIndex: number; xMin: number; yMin: number; xMax: number; yMax: number }>>({});
  const docViewerRef = useRef<DocumentViewerHandle | null>(null);

  const sectionRefs = useRef<(HTMLElement | null)[]>([null, null, null, null, null]);

  const { toast } = useToast();
  const db = useFirestore();
  const app = useFirebaseApp();
  const auth = useAuth();
  const { user: currentUser, loading: authLoading } = useUser();
  const { compagnies: canonicalCompagnies } = useCompagnies();
  const router = useRouter();
  const isOnline = useNetworkStatus();

  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const previousSidebarState = useRef<boolean | null>(null);

  const allFiles = scanFiles;

  const form = useForm<DossierFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expertRank: '1er expert',
      repairerType: 'Agréé',
      secondExpertName: '',
      secondExpertCompany: '',
      dateOfRequest: new Date(),
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
      chassisNumber: '',
      fiscalPower: '',
      fuelType: '',
      mileage: '',
      vehicleNewValue: '',
      vehicleUsage: '',
      insuredSubscriber: '',
      insuredCardHolder: '',
      insuredAddress: '',
      product: '',
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

  // ----- Auto-pan document viewer to the field the user is currently editing -----
  useEffect(() => {
    if (Object.keys(scanRegions).length === 0) return;
    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const name = (target as HTMLInputElement).name || target.getAttribute('data-field-name') || '';
      if (!name) return;
      const region = scanRegions[name];
      if (!region) return;
      if (docViewerRef.current) {
        docViewerRef.current.setCurrentFile(region.fileIndex);
        // Small delay so the file switch completes before panning
        setTimeout(() => docViewerRef.current?.focusRegion(region), 50);
      }
    };
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, [scanRegions]);

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
      // Send all uploaded scan files in a single multi-image request (same cost, one round-trip).
      const files = await Promise.all(scanFiles.map(async (f) => {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(f.file);
        });
        return { fileBase64: base64, contentType: f.file.type };
      }));

      const response = await fetch('/api/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });

      if (!response.ok) throw new Error('Erreur lors du scan');

      const { data, fieldsFound, regions } = await response.json();

      if (regions) setScanRegions(regions);

      if (data && fieldsFound > 0) {
        const dateFields = ['dateOfLoss', 'dateOfRequest', 'dateOfMEC', 'insuranceValidUntil'];
        const skipScanFields = new Set(['dateOfRequest']);
        // Case-insensitive lookup for the canonical Marque list so the Select can actually render the AI value.
        const brandLookup = new Map(defaultMarques.map((m) => [m.toLowerCase(), m]));
        for (const [key, value] of Object.entries(data)) {
          if (value === null || value === undefined) continue;
          if (skipScanFields.has(key)) continue;
          if (dateFields.includes(key) && typeof value === 'string') {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) { form.setValue(key as any, parsed); filled.add(key); }
          } else if (typeof value === 'string' && value.trim()) {
            let finalValue: string = value.trim();
            if (key === 'brand') {
              const canonical = brandLookup.get(finalValue.toLowerCase());
              if (canonical) finalValue = canonical;
            }
            form.setValue(key as any, finalValue); filled.add(key);
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
    if (!data.nature) missing.push("Nature du dossier");
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
        modeDossier: '',
        matricule: data.registration || '',
        policeNumber: data.policyNumber || '',
        referenceCompagnie: data.companyRef || '',
        repairerType: data.repairerType || '',
        garageName: data.garageName || '',
        // Dates as Firestore Timestamps for consistency
        dateSinistre: data.dateOfLoss ? Timestamp.fromDate(data.dateOfLoss instanceof Date ? data.dateOfLoss : new Date(data.dateOfLoss)) : null,
        dateRequete: data.dateOfRequest ? Timestamp.fromDate(data.dateOfRequest instanceof Date ? data.dateOfRequest : new Date(data.dateOfRequest)) : null,
        // Assuré (structured)
        assure: {
          nom: data.insuredName || '',
          prenom: '',
          telephone: data.insuredPhone || '',
          whatsapp: data.insuredWhatsapp || '',
          telephone2: data.insuredOtherPhone || '',
          email: '',
          adresse: data.insuredAddress || '',
          cin: '',
          souscripteur: data.insuredSubscriber || '',
          titulaireCarteGrise: data.insuredCardHolder || '',
        },
        // Véhicule (structured)
        vehicule: {
          marque: data.brand || '',
          modele: data.model || '',
          immatriculation: data.registration || '',
          serie: data.chassisNumber || '',
          energie: data.fuelType || '',
          puissance: data.fiscalPower || '',
          mec: data.dateOfMEC ? (data.dateOfMEC instanceof Date ? data.dateOfMEC : new Date(data.dateOfMEC)).toISOString() : '',
          km: data.mileage || '',
          valeurNeuf: data.vehicleNewValue || '',
          usage: data.vehicleUsage || '',
        },
        // Contrat extended
        dateValiditeAssurance: data.insuranceValidUntil ? Timestamp.fromDate(data.insuranceValidUntil instanceof Date ? data.insuranceValidUntil : new Date(data.insuranceValidUntil)) : null,
        produit: data.product || '',
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

      // Upload categorized documents with their type metadata
      for (const [typeLabel, files] of Object.entries(categorizedFiles)) {
        for (const uf of files) {
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
              type: typeLabel,
              taille: uf.file.size,
              uploadePar: userEmail,
              storagePath,
              _localCreatedAt: timestamp,
            },
          });
        }
      }

      toast({ title: "Dossier Créé", description: `Le dossier ${refCode} a été enregistré avec succès.` });

      // Warn if compagnie doesn't match any canonical compagnie used for user assignments
      const selectedCompagnie = (data.company || '').toLowerCase().trim();
      if (selectedCompagnie && canonicalCompagnies.length > 0) {
        const match = canonicalCompagnies.some(c => c.nom.toLowerCase().trim() === selectedCompagnie);
        if (!match) {
          toast({
            variant: 'destructive',
            title: 'Attention — Nom de compagnie non reconnu',
            description: `La compagnie "${data.company}" ne correspond à aucune compagnie du système. Certains utilisateurs pourraient ne pas voir ce dossier. Vérifiez le nom dans la gestion des compagnies.`,
          });
        }
      }

      router.push('/dossiers');
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur", description: "Erreur lors de la création du dossier." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpertModalConfirm = () => {
    form.setValue('expertRank', pendingExpertRank);
    if (pendingCompany) {
      form.setValue('company', pendingCompany);
    }
    if (pendingExpertRank === '2eme expert') {
      form.setValue('secondExpertName', pendingFirstExpertName);
      form.setValue('secondExpertCompany', pendingFirstExpertCompany);
    } else {
      form.setValue('secondExpertName', '');
      form.setValue('secondExpertCompany', '');
    }
    setExpertModalOpen(false);
  };

  const handleReopenExpertModal = () => {
    setPendingExpertRank(form.getValues('expertRank') || '1er expert');
    setPendingCompany(form.getValues('company') || '');
    setPendingFirstExpertName(form.getValues('secondExpertName') || '');
    setPendingFirstExpertCompany(form.getValues('secondExpertCompany') || '');
    setExpertModalOpen(true);
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
      {/* Stepper — sticky, full size at rest, minimizes on scroll. Always clickable. */}
      <div className={cn(
        "sticky top-0 z-30 bg-background/95 backdrop-blur border-b -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 mb-4 transition-[padding] duration-200",
        stepperCompact ? "py-1.5" : "py-4"
      )}>
        <div className={cn(
          "relative flex items-center justify-between mx-auto transition-[max-width] duration-200",
          stepperCompact ? "max-w-md" : "max-w-3xl"
        )}>
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-px bg-muted -z-10" />
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => scrollToStep(step.id)}
                className="relative flex items-center gap-2 bg-background px-1.5 group"
                title={step.name}
              >
                <span className={cn(
                  "shrink-0 rounded-full border-2 flex items-center justify-center font-semibold transition-all duration-200",
                  stepperCompact ? "w-5 h-5 text-[10px] border" : "w-7 h-7 text-sm",
                  isCompleted && "bg-blue-600 border-blue-600 text-white",
                  isActive && "bg-white dark:bg-background border-blue-600 text-blue-600",
                  !isActive && !isCompleted && "bg-background border-muted text-muted-foreground"
                )}>
                  {isCompleted ? (
                    <Check className={cn("transition-all", stepperCompact ? "w-2.5 h-2.5" : "w-3.5 h-3.5")} />
                  ) : (
                    step.id
                  )}
                </span>
                <span className={cn(
                  "font-medium whitespace-nowrap transition-all duration-200",
                  stepperCompact ? "text-[0px] opacity-0 w-0 overflow-hidden" : "text-sm",
                  isActive ? "text-blue-600" : "text-muted-foreground"
                )}>
                  {step.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Main Content: Split layout */}
        <div className={cn("flex gap-6", showSideViewer ? "items-start" : "")}>
          {/* Form Side */}
          <div className={cn("transition-all duration-300 min-w-0", showSideViewer ? "flex-1" : "w-full max-w-4xl mx-auto")}>
            <form onSubmit={form.handleSubmit(handleSubmitClick, (errors) => {
              console.error('Form validation errors:', errors);
              const fieldNames = Object.keys(errors).join(', ');
              toast({ variant: 'destructive', title: 'Erreur de validation', description: `Champs invalides : ${fieldNames}` });
            })} className="space-y-0">

              {/* ===== Step 1: Documents ===== */}
              <section
                id="step-1"
                ref={el => { sectionRefs.current[0] = el; }}
                className="scroll-mt-16"
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
                className="scroll-mt-16"
              >
                <Card className="shadow-lg border-blue-600/5">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                      <h2 className="text-lg font-semibold">Informations</h2>
                    </div>
                    <div className="border-l-4 border-blue-600 pl-6">
                      <Step1 autoFilledFields={autoFilledFields} onReopenExpertModal={handleReopenExpertModal} />
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
                className="scroll-mt-16"
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

              {/* ===== Step 4: Pièces jointes ===== */}
              <section
                id="step-4"
                ref={el => { sectionRefs.current[3] = el; }}
                className="scroll-mt-16"
              >
                <Card className="shadow-lg border-blue-600/5">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">4</div>
                      <h2 className="text-lg font-semibold">Pièces jointes</h2>
                    </div>
                    <div className="border-l-4 border-blue-600 pl-6">
                      <StepUploadDocuments
                        categorizedFiles={categorizedFiles}
                        onCategorizedFilesChange={setCategorizedFiles}
                      />
                    </div>
                  </CardContent>
                </Card>
              </section>

              <hr className="my-10 border-muted" />

              {/* ===== Step 5: Confirmation ===== */}
              <section
                id="step-5"
                ref={el => { sectionRefs.current[4] = el; }}
                className="scroll-mt-16"
              >
                <Card className="shadow-lg border-blue-600/5">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">5</div>
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

          {/* Document Viewer Side - sticky column that follows scroll */}
          {hasDocuments && (
            <div
              className={cn(
                "shrink-0 self-start",
                showDocViewer ? "w-1/2" : "w-10"
              )}
              style={{
                position: 'sticky',
                top: stepperCompact ? '52px' : '90px',
                height: stepperCompact ? 'calc(100dvh - 68px)' : 'calc(100dvh - 106px)',
              }}
            >
              <DocumentViewer ref={docViewerRef} files={allFiles} currentStep={currentStep} visible={showDocViewer} onToggle={() => setShowDocViewer(v => !v)} />
            </div>
          )}
        </div>
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

      {/* Expert Type Selection Modal */}
      <Dialog open={expertModalOpen} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          hideCloseButton
        >
          <DialogHeader>
            <DialogTitle>Type d&apos;expert</DialogTitle>
            <DialogDescription>Choisissez votre type d&apos;expert avant de commencer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={pendingExpertRank} onValueChange={setPendingExpertRank} className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="1er expert" id="expert-1er" />
                <Label htmlFor="expert-1er" className="cursor-pointer flex-1">1er expert</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="2eme expert" id="expert-2eme" />
                <Label htmlFor="expert-2eme" className="cursor-pointer flex-1">2ème expert</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="Arbitre" id="expert-arbitre" />
                <Label htmlFor="expert-arbitre" className="cursor-pointer flex-1">Arbitre</Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="dossier-company">Compagnie du dossier</Label>
              <Select value={pendingCompany} onValueChange={setPendingCompany}>
                <SelectTrigger id="dossier-company">
                  <SelectValue placeholder="Sélectionner la compagnie" />
                </SelectTrigger>
                <SelectContent>
                  {canonicalCompagnies.map((c) => (
                    <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pendingExpertRank === '2eme expert' && (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/20 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="first-expert-name">Nom du 1er expert</Label>
                  <Input
                    id="first-expert-name"
                    placeholder="Saisir le nom du 1er expert"
                    value={pendingFirstExpertName}
                    onChange={(e) => setPendingFirstExpertName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first-expert-company">Compagnie du 1er expert</Label>
                  <Select value={pendingFirstExpertCompany} onValueChange={setPendingFirstExpertCompany}>
                    <SelectTrigger id="first-expert-company">
                      <SelectValue placeholder="Sélectionner la compagnie" />
                    </SelectTrigger>
                    <SelectContent>
                      {canonicalCompagnies.map((c) => (
                        <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleExpertModalConfirm} className="w-full bg-blue-600 hover:bg-blue-700">
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
