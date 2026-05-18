import { LayoutDashboard, FolderOpen, Users, Building2 } from 'lucide-react';

export const NAV_LINKS = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Tableau de bord',
  },
  {
    href: '/dossiers',
    icon: FolderOpen,
    label: 'Dossiers',
  },
  {
    href: '/utilisateurs',
    icon: Users,
    label: 'Utilisateurs',
  },
  {
    href: '/compagnies',
    icon: Building2,
    label: 'Compagnies',
  },
];

export const COMPANY_LINKS = [
  { name: 'Allianz', color: 'bg-blue-500' },
  { name: 'RMA', color: 'bg-red-500' },
  { name: 'Sanlam', color: 'bg-green-500' },
  { name: 'Wafa', color: 'bg-yellow-500' },
  { name: 'ATLANTA', color: 'bg-indigo-500' },
  { name: 'CP', color: 'bg-purple-500' },
  { name: 'Fès RMA', color: 'bg-pink-500' },
  { name: 'Fès ATLANTASANAD', color: 'bg-cyan-500' },
  { name: 'Fès Sanlam', color: 'bg-teal-500' },
];

export const DOCUMENT_TYPES = [
  'Devis',
  'Facture',
  'Photos avant',
  'Photos en cours',
  'Photos après',
  'Carte grise',
  'Attestation d\'assurance',
  'Autre',
] as const;
