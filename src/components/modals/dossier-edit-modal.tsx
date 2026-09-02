'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InlineLoader } from '@/components/ui/inline-loader';
import { IconChip } from '@/components/ui/icon-chip';
import { FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { DatePicker } from '@/components/ui/date-picker';

interface DossierEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossierId: string;
}

/**
 * Label-over-control field — element-specs §9 (GOV.UK text input: a visible
 * label above every input, 4 px to the control; NN/g web forms: placeholder
 * only as a FORMAT cue). `t-label` + 40 px solid `Input`. Hoisted to module
 * scope so React keeps the same component identity between renders (an
 * inline definition remounted the input — and dropped focus — on every
 * keystroke). NEVER move it back inside the component.
 */
const InputField = ({ label, value, onChange, type = 'text', className = '', placeholder }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  placeholder?: string;
}) => (
  <div className={cn('min-w-0', className)}>
    <Label className="t-label">{label}</Label>
    <Input type={type} className="mt-1" value={value} onChange={onChange} placeholder={placeholder} />
  </div>
);

export default function DossierEditModal({ isOpen, onClose, dossierId }: DossierEditModalProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // DB-driven options — Firestore is the single source of truth.
  const { options: dbCompagnies } = useOptions('compagnies');
  const { options: dbNatures } = useOptions('options_natures');
  const { options: dbDossierTypes } = useOptions('options_types_dossier');

  const compagnies = useMemo(() => dbCompagnies.filter(o => o.active !== false), [dbCompagnies]);
  const natures = useMemo(() => dbNatures.filter(o => o.active !== false), [dbNatures]);
  const dossierTypes = useMemo(() => dbDossierTypes.filter(o => o.active !== false), [dbDossierTypes]);

  const [formData, setFormData] = useState<any>({
    expertRank: '1er expert',
    compagnie: '',
    typeDossier: '',
    nature: '',
    assure: { nom: '', telephone: '', whatsapp: '', telephone2: '' },
    dateRequete: null as Date | null,
    vehicule: { marque: '', modele: '', immatriculation: '', immatriculationAnterieur: '', registrationW: '', mec: null as Date | null },
    dateSinistre: null as Date | null,
    // Flat fields matching information-tab
    intermediaireNom: '',
    intermediaireEmail: '',
    referenceCompagnie: '',
    policeNumber: '',
    repairerType: 'Agréé',
    garageName: '',
  });

  useEffect(() => {
    if (isOpen && dossierId && db) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'dossiers', dossierId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            const parseDate = (val: any) => {
              if (!val) return null;
              if (val.toDate) return val.toDate();
              try { return new Date(val); } catch { return null; }
            };

            setFormData({
              expertRank: data.expertRank || '1er expert',
              compagnie: data.compagnie || '',
              typeDossier: data.typeDossier || '',
              nature: data.nature || '',
              assure: {
                nom: typeof data.assure === 'string' ? data.assure : (data.assure?.nom || ''),
                telephone: data.assure?.telephone || '',
                whatsapp: data.assure?.whatsapp || '',
                telephone2: data.assure?.telephone2 || '',
              },
              dateRequete: parseDate(data.dateRequete),
              vehicule: {
                marque: data.vehicule?.marque || '',
                modele: data.vehicule?.modele || '',
                immatriculation: data.vehicule?.immatriculation || '',
                immatriculationAnterieur: data.vehicule?.immatriculationAnterieur || '',
                registrationW: data.vehicule?.registrationW || '',
                mec: parseDate(data.vehicule?.mec),
              },
              dateSinistre: parseDate(data.dateSinistre),
              // Read flat fields (matching information-tab)
              intermediaireNom: data.intermediaireNom || data.intermediaryName || '',
              intermediaireEmail: data.intermediaireEmail || data.intermediaryEmail || '',
              referenceCompagnie: data.referenceCompagnie || data.companyRef || '',
              policeNumber: data.policeNumber || '',
              repairerType: data.repairerType || 'Agréé',
              garageName: data.garageName || '',
            });
          }
        } catch (error) {
          console.error("Error fetching dossier:", error);
          toast({ variant: 'destructive', title: "Erreur de chargement" });
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, dossierId, db, toast]);

  const handleUpdate = async () => {
    if (!db || !dossierId) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        expertRank: formData.expertRank,
        compagnie: formData.compagnie,
        typeDossier: formData.typeDossier,
        nature: formData.nature,
        assure: formData.assure,
        dateRequete: formData.dateRequete ? Timestamp.fromDate(formData.dateRequete) : null,
        dateSinistre: formData.dateSinistre ? Timestamp.fromDate(formData.dateSinistre) : null,
        vehicule: {
          ...formData.vehicule,
          mec: formData.vehicule.mec ? formData.vehicule.mec.toISOString() : '',
        },
        // Flat fields matching what information-tab reads
        intermediaireNom: formData.intermediaireNom,
        intermediaireEmail: formData.intermediaireEmail,
        referenceCompagnie: formData.referenceCompagnie,
        policeNumber: formData.policeNumber,
        repairerType: formData.repairerType,
        garageName: formData.garageName,
        // Also keep matricule in sync with vehicule.immatriculation
        matricule: formData.vehicule.immatriculation,
      };

      await updateDoc(doc(db, 'dossiers', dossierId), payload);
      toast({ title: "Dossier mis à jour" });
      onClose();
    } catch (error) {
      console.error("Error updating dossier:", error);
      toast({ variant: 'destructive', title: "Erreur lors de la mise à jour" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Dialog — element-specs §13 (M3 dialogs: brief headline; confirm
          closest to the edge, dismissive `outline` to its left, two actions
          max; bottom sheet below `lg` via the Dialog primitive). Body padding
          24, sections separated by hairlines with `t-heading` titles. */}
      <DialogContent className="max-h-[calc(95vh/var(--app-zoom))] overflow-y-auto p-0 lg:max-w-4xl">
        <DialogHeader className="border-b border-hairline px-6 py-4">
          <DialogTitle className="t-title">Modifier le dossier</DialogTitle>
        </DialogHeader>

        {loading ? (
          <InlineLoader label="Chargement des données…" size="md" className="justify-center py-20" />
        ) : (
          // Form — element-specs §9 (GOV.UK text input: visible sentence-case
          // labels above; NN/g: rows 16 apart, short related fields may share
          // a row); 40 px controls so inputs, selects and DatePicker align.
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 px-6 py-6 lg:grid-cols-2">
            <div className="space-y-6">
              <section className="space-y-4" aria-label="Dossier">
                {/* Addendum §1(b): ONE warm anchor chip beside the section
                    title that anchors the dialog — first section only. */}
                <div className="flex items-center gap-2">
                  <IconChip><FolderOpen /></IconChip>
                  <h3 className="t-heading">Dossier</h3>
                </div>
                <div>
                  <Label className="t-label">Expert</Label>
                  <RadioGroup
                    value={formData.expertRank}
                    onValueChange={(v) => setFormData({ ...formData, expertRank: v })}
                    className="mt-2 flex flex-wrap gap-6"
                  >
                    {['1er expert', '2eme expert', 'Arbitre'].map((rank) => (
                      <div key={rank} className="flex items-center space-x-2">
                        <RadioGroupItem value={rank} id={`modal-${rank}`} />
                        <Label htmlFor={`modal-${rank}`} className="cursor-pointer text-sm font-medium text-ink">{rank}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between">
                      <Label className="t-label">Compagnie</Label>
                      <OptionsManagerModal collectionName="compagnies" title="Compagnies" />
                    </div>
                    <Select value={formData.compagnie} onValueChange={(v) => setFormData({ ...formData, compagnie: v })}>
                      <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>{compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between">
                      <Label className="t-label">Type de dossier</Label>
                      <OptionsManagerModal collectionName="options_types_dossier" title="Types de dossier" />
                    </div>
                    <Select value={formData.typeDossier} onValueChange={(v) => setFormData({ ...formData, typeDossier: v })}>
                      <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>{dossierTypes.map(t => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="t-label">Nature du dossier</Label>
                      <OptionsManagerModal collectionName="options_natures" title="Natures" />
                    </div>
                    <Select value={formData.nature} onValueChange={(v) => setFormData({ ...formData, nature: v })}>
                      <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">{natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t border-hairline pt-6" aria-label="Assuré">
                <h3 className="t-heading">Assuré</h3>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <InputField label="Assuré" value={formData.assure.nom} onChange={(e) => setFormData({ ...formData, assure: { ...formData.assure, nom: e.target.value } })} />
                  <InputField label="Téléphone assuré" type="tel" placeholder="+212 6 12 34 56 78" value={formData.assure.telephone} onChange={(e) => setFormData({ ...formData, assure: { ...formData.assure, telephone: e.target.value } })} />
                  <InputField label="WhatsApp" type="tel" placeholder="+212 6 12 34 56 78" value={formData.assure.whatsapp} onChange={(e) => setFormData({ ...formData, assure: { ...formData.assure, whatsapp: e.target.value } })} />
                  <InputField label="Autre téléphone" type="tel" placeholder="+212 6 12 34 56 78" value={formData.assure.telephone2} onChange={(e) => setFormData({ ...formData, assure: { ...formData.assure, telephone2: e.target.value } })} />
                  <div className="min-w-0">
                    <Label className="t-label">Date de requête</Label>
                    <div className="mt-1">
                      <DatePicker value={formData.dateRequete} onChange={(d) => setFormData({ ...formData, dateRequete: d })} />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="space-y-4" aria-label="Véhicule">
                <h3 className="t-heading">Véhicule</h3>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <InputField label="Marque" value={formData.vehicule.marque} onChange={(e) => setFormData({ ...formData, vehicule: { ...formData.vehicule, marque: e.target.value } })} />
                  <InputField label="Modèle" value={formData.vehicule.modele} onChange={(e) => setFormData({ ...formData, vehicule: { ...formData.vehicule, modele: e.target.value } })} />
                  <InputField label="Immatriculation" value={formData.vehicule.immatriculation} onChange={(e) => setFormData({ ...formData, vehicule: { ...formData.vehicule, immatriculation: e.target.value } })} />
                  <InputField label="Immatriculation antérieure" value={formData.vehicule.immatriculationAnterieur} onChange={(e) => setFormData({ ...formData, vehicule: { ...formData.vehicule, immatriculationAnterieur: e.target.value } })} />
                  <InputField label="Immatriculation W" value={formData.vehicule.registrationW} onChange={(e) => setFormData({ ...formData, vehicule: { ...formData.vehicule, registrationW: e.target.value } })} />
                  <div className="min-w-0">
                    <Label className="t-label">Date du sinistre</Label>
                    <div className="mt-1">
                      <DatePicker value={formData.dateSinistre} onChange={(d) => setFormData({ ...formData, dateSinistre: d })} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <Label className="t-label">Date de MEC</Label>
                    <div className="mt-1">
                      <DatePicker value={formData.vehicule.mec} onChange={(d) => setFormData({ ...formData, vehicule: { ...formData.vehicule, mec: d } })} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t border-hairline pt-6" aria-label="Intermédiaire et garage">
                <h3 className="t-heading">Intermédiaire et garage</h3>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <InputField label="Intermédiaire" value={formData.intermediaireNom} onChange={(e) => setFormData({ ...formData, intermediaireNom: e.target.value })} />
                  <InputField label="E-mail intermédiaire" type="email" value={formData.intermediaireEmail} onChange={(e) => setFormData({ ...formData, intermediaireEmail: e.target.value })} />
                  <InputField label="Réf. compagnie" value={formData.referenceCompagnie} onChange={(e) => setFormData({ ...formData, referenceCompagnie: e.target.value })} />
                  <InputField label="N° de police" value={formData.policeNumber} onChange={(e) => setFormData({ ...formData, policeNumber: e.target.value })} />

                  <div className="min-w-0">
                    <Label className="t-label">Réparateur</Label>
                    <Select value={formData.repairerType} onValueChange={(v) => setFormData({ ...formData, repairerType: v })}>
                      <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Agréé">Agréé</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <InputField label="Nom du garage" value={formData.garageName} onChange={(e) => setFormData({ ...formData, garageName: e.target.value })} />
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Footer §13: [Annuler outline] [Enregistrer default], right-aligned. */}
        <DialogFooter className="flex flex-row items-center justify-end gap-3 border-t border-hairline px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleUpdate} loading={saving} disabled={loading}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
