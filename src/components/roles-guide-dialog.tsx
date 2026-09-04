'use client';

import React, { useState } from 'react';
import { ShieldCheck, Briefcase, Calculator, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Detailed "how each role works" guide (login page, demo brand).
 * Lightbox with a role sidebar; texts are FR i18n keys (EN in
 * src/i18n/en/tutorial-core.ts).
 */

interface RoleSpec {
  id: string;
  name: string; // shown as-is (matches the demo account names)
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  mission: string;
  daily: string[];
  pages: string;
}

const ROLES: RoleSpec[] = [
  {
    id: 'admin',
    name: 'Admin',
    icon: ShieldCheck,
    tagline: 'Supervision complète et configuration de la plateforme.',
    mission:
      "L'Admin voit tout et configure tout. Il pilote la plateforme au niveau global : comptes, droits d'accès, référentiels (compagnies, statuts, jours fériés) et supervision de l'activité de toute l'équipe en temps réel.",
    daily: [
      "Crée les comptes (connexion par nom, sans email) et attribue les rôles ; peut accorder ou retirer des permissions page par page pour un utilisateur précis.",
      "Force la déconnexion d'un appareil : les rôles opérationnels sont limités à une session active à la fois, et l'Admin peut libérer une session bloquée.",
      "Gère les compagnies d'assurance (logos, couleurs, statistiques par compagnie) et les tampons apposés sur les PDF.",
      "Maintient le calendrier des jours fériés — c'est lui qui rend le calcul des délais en heures ouvrées exact.",
      "Suit le tableau de bord et le monitoring d'équipe : volumes par étape, dossiers en délai ou en retard, activité par utilisateur.",
      'Reçoit et traite les signalements de bugs des utilisateurs (messagerie intégrée).',
    ],
    pages: 'Tableau de bord · Monitoring · Dossiers · Utilisateurs · Compagnies · Tampons · Jours fériés',
  },
  {
    id: 'manager',
    name: 'Manager',
    icon: Briefcase,
    tagline: 'Le chef d’orchestre du dossier, de la création à la facture.',
    mission:
      "Le Manager (gestionnaire) porte le dossier de bout en bout. Chaque dossier est une frise chronologique : création de mission, planifications terrain, chiffrage, accords, rapport, note d'honoraire — le Manager fait avancer chaque étape et rien ne se perd entre deux.",
    daily: [
      "Crée le dossier en scannant le document de mission de la compagnie : l'IA lit et pré-remplit assuré, véhicule, police, dates — zéro ressaisie.",
      "Planifie les missions photo (avant / en cours / après réparations) et les assigne aux agents de terrain, avec position des agents en direct pour choisir le bon.",
      "Envoie le devis garage au chiffrage et suit les allers-retours d'accord (proposition, 2ème et 3ème accords si nécessaire).",
      "Envoie l'accord final à la compagnie par email directement depuis le dossier.",
      "Génère les rapports d'expertise en PDF (préliminaire, final, réforme, estimatif) puis la note d'honoraire.",
      'Reçoit et envoie des rappels avec suivi de traitement par destinataire ; ses modifications sont protégées par un brouillon local anti-crash.',
    ],
    pages: 'Dossiers · Mes Rappels · Tableau de bord · Consultation',
  },
  {
    id: 'estimator',
    name: 'Estimator',
    icon: Calculator,
    tagline: 'Vérifie les devis extraits par l’IA et négocie les accords.',
    mission:
      "L'Estimator (chiffreur) reçoit les dossiers à chiffrer avec un délai de 24 heures ouvrées affiché en permanence. Le devis du garage est déjà lu par l'IA ligne par ligne — son travail n'est pas de ressaisir, mais de vérifier et de décider.",
    daily: [
      "Ouvre l'éditeur de devis structuré : chaque ligne (référence, désignation, quantité, prix, vétusté, TVA) est pré-extraite du PDF du garage.",
      "Vérifie les montants, applique des corrections en masse par colonne, puis confirme avec « J'ai vérifié » ; peut relancer l'extraction à tout moment.",
      "Remplit les colonnes d'accord : prix accordé par ligne, plafonné au prix unitaire demandé, avec totaux recalculés en direct.",
      'Compare le devis structuré et le PDF original côte à côte dans le même écran.',
      "Dépose la proposition d'accord ou l'accord (2ème / 3ème rounds sur le même devis, ou nouveau devis d'un autre garage), exporte le PDF avec tampon positionné au clic.",
      'Prononce les verdicts de réforme (technique ou économique) avec PDF récapitulatif.',
    ],
    pages: 'Assignations Chiffrage · Éditeur de devis · Éditeur PDF',
  },
  {
    id: 'field-agent',
    name: 'Field Agent',
    icon: MapPin,
    tagline: 'Les missions photo sur le terrain, 100 % mobile.',
    mission:
      "L'Agent de Terrain travaille depuis son téléphone. Sa journée est une liste de missions photo — avant, pendant et après réparations — chacune avec son échéance. Le flux est pensé caméra d'abord : le moins de saisie possible.",
    daily: [
      "Scanne la plaque d'immatriculation du véhicule : l'IA la lit et retrouve le bon dossier automatiquement — aucune recherche manuelle.",
      "Prend les photos par catégorie directement depuis l'app ; elles sont horodatées, filigranées à son nom et versées au dossier.",
      "L'avancement des photos fait progresser le statut du dossier automatiquement — le Manager voit la mission se terminer en direct.",
      'Ajoute les documents constatés sur place et ses observations.',
      "Partage sa position pendant les tournées pour faciliter la planification (service dédié sur Android, même écran verrouillé).",
    ],
    pages: 'Assignations Terrain · Détail de mission (mobile)',
  },
];

export function RolesGuideDialog({ trigger }: { trigger: React.ReactNode }) {
  const t = useT();
  const [activeId, setActiveId] = useState(ROLES[0].id);
  const role = ROLES.find((r) => r.id === activeId) ?? ROLES[0];
  const Icon = role.icon;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle>{t('Les rôles dans l’application')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row max-h-[70vh]">
          <nav className="flex sm:flex-col gap-1 p-3 sm:w-48 shrink-0 border-b sm:border-b-0 sm:border-r overflow-x-auto">
            {ROLES.map((r) => {
              const RIcon = r.icon;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveId(r.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition text-left',
                    r.id === activeId
                      ? 'bg-teal-700 text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <RIcon className="h-4 w-4 shrink-0" />
                  {r.name}
                </button>
              );
            })}
          </nav>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-700/10 text-teal-700 dark:text-teal-400">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg leading-tight">{role.name}</h3>
                <p className="text-sm text-muted-foreground">{t(role.tagline)}</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                {t('Sa mission')}
              </h4>
              <p className="text-sm leading-relaxed">{t(role.mission)}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                {t('Au quotidien')}
              </h4>
              <ul className="space-y-2">
                {role.daily.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                    <span>{t(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                {t('Pages clés')}
              </h4>
              <p className="text-sm">{t(role.pages)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
