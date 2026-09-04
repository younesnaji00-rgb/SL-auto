/**
 * English dictionary — batch E (terrain / ATG, monitoring, dashboard).
 *
 * New French strings introduced by the UI redesign on:
 *   • src/app/(app)/assignations-atg/page.tsx
 *   • src/app/(app)/assignations-atg/[dossierId]/page.tsx
 *   • src/app/(app)/assignations-atg/at-scan-plaque-flow.tsx
 *   • src/app/(app)/monitoring/page.tsx
 *   • src/app/(app)/monitoring/dossier-drawer.tsx
 *   • src/app/(app)/dashboard/page.tsx
 *
 * Keys are the FRENCH source strings exactly as they appear in code.
 */

export const MERGE_E_EN: Record<string, string> = {
  // ── Missions terrain (ATG list) ──────────────────────────────────────
  'Missions terrain': 'Field missions',
  'Missions': 'Missions',
  'Missions à afficher': 'Missions to show',
  'Résumé des missions': 'Missions summary',
  'Affichage des missions': 'Missions view',
  'Type de mission': 'Mission type',
  'Chargement des missions': 'Loading missions',
  'Aucune mission': 'No mission',
  'Aucune mission pour ces filtres': 'No mission for these filters',
  'Élargissez la période ou réinitialisez les filtres pour revoir vos missions.':
    'Widen the period or reset the filters to see your missions again.',
  'Scannez une plaque pour lancer le flux terrain — les nouvelles assignations apparaîtront ici en temps réel.':
    'Scan a plate to start the field flow — new assignments will appear here in real time.',
  'Les nouvelles assignations apparaîtront ici en temps réel.':
    'New assignments will appear here in real time.',
  'Voir les missions en retard': 'View overdue missions',
  "Voir les missions d'aujourd'hui": "View today's missions",
  'Voir les missions à venir': 'View upcoming missions',
  'Prochaine mission planifiée': 'Next scheduled mission',
  'Prochaine': 'Next',
  'Prochain': 'Next',
  'Missions sans agent assigné': 'Missions with no assigned agent',
  'Sans agent': 'Unassigned',
  'Itinéraire': 'Route',
  "Ouvrir l'itinéraire dans Google Maps": 'Open the route in Google Maps',
  'Liste': 'List',
  'Carte': 'Map',
  'Afficher la carte': 'Show the map',
  'Afficher la liste': 'Show the list',
  'Onglet': 'Tab',
  'Lieu': 'Location',
  'Réf.': 'Ref.',
  'Réf., assuré, adresse, plaque…': 'Ref., insured, address, plate…',
  'Rechercher un statut': 'Search a status',
  'rechercher': 'search',
  "Densité d'affichage": 'Row density',
  'Écrire sur WhatsApp': 'Message on WhatsApp',
  'Arrivé': 'Arrived',
  'Réassigner': 'Reassign',
  'sélectionnée': 'selected',
  'sélectionnées': 'selected',
  'Demande envoyée': 'Request sent',
  "La position s'actualisera dès que l'appareil de l'agent répond.":
    "The position will refresh as soon as the agent's device replies.",
  'Demande impossible': 'Request failed',
  'Réessayez dans un instant.': 'Try again in a moment.',

  // ── ATG dossier detail + plate scan ──────────────────────────────────
  'Photos ou documents': 'Photos or documents',
  'Photos de preuve': 'Proof photos',
  'pour le moment': 'yet',
  'Utilisez « Prendre des photos » pour capturer la première.':
    'Use "Take photos" to capture the first one.',
  'Proposer une réforme': 'Propose a write-off',
  'Annuler la réforme proposée': 'Cancel the proposed write-off',
  'Plaque détectée': 'Plate detected',
  'photo': 'photo',

  // ── Monitoring (Suivi d'équipe) ──────────────────────────────────────
  'Étapes franchies et délais tenus — les délais sont ceux des assignations chiffrage et terrain (24 h ouvrées).':
    'Steps completed and deadlines met — deadlines are those of the estimating and field assignments (24 business hours).',
  'toute la période': 'the whole period',
  'depuis le': 'since',
  "jusqu'au": 'until',
  'Global': 'Overall',
  'Dossiers traités': 'Claims handled',
  'rapport déposé': 'report filed',
  'Respect des délais': 'On-time rate',
  'Assignations chiffrage · terrain · création, 24 h ouvrées':
    'Estimating · field · creation assignments, 24 business hours',
  'aucune assignation décidée': 'no assignment settled',
  'en attente': 'pending',
  'sans rapport déposé': 'no report filed',
  "En retard aujourd'hui": 'Overdue today',
  "Voir la liste « À traiter aujourd'hui »": 'View the "To handle today" list',
  'assignations au-delà de 24 h ouvrées · maintenant':
    'assignments past 24 business hours · now',
  'Pas de délai défini': 'No deadline set',
  'Délai de 24 h ouvrées dépassé — assignation clôturée ou non':
    '24 business hours exceeded — assignment closed or not',
  'Non réalisé à ce jour (hors période)': 'Not completed to date (outside the period)',
  'Étapes franchies en délai': 'Steps completed on time',
  'en délai — voir les dossiers': 'on time — view the claims',
  "À traiter aujourd'hui": 'To handle today',
  'non affecté': 'unassigned',
  'Rien en retard': 'Nothing overdue',
  "Aucune étape n'a dépassé 24 h ouvrées.": 'No step has exceeded 24 business hours.',
  'ouvrées': 'business hrs',
  'chiffreur': 'estimator',
  'depuis': 'since',
  'Délais par étape': 'Cycle time by step',
  'Heures ouvrées entre le déclencheur et la réalisation':
    'Business hours between the trigger and completion',
  'Médiane': 'Median',
  'Total (création → rapport)': 'Total (creation → report)',
  'Créés vs déposés par semaine': 'Created vs filed per week',
  'Créés': 'Created',
  'Rapports déposés': 'Reports filed',
  'Part des assignations à temps': 'Share of on-time assignments',
  'Respect': 'On time',
  'Dossiers sans rapport déposé · à ce jour': 'Claims with no report filed · to date',
  "Dossiers ouverts sur lesquels l'utilisateur a réalisé au moins une étape":
    'Open claims where the user completed at least one step',
  'Ouverts (touchés)': 'Open (touched)',

  // ── Dashboard ────────────────────────────────────────────────────────
  'Dossiers créés': 'Claims created',
  'au total': 'in total',
  'au': 'to',
  'Statuts actifs': 'Active statuses',
  'statuts': 'statuses',
  'en tête': 'in the lead',
  'aucune donnée': 'no data',
};
