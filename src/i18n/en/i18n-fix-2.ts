/**
 * English dictionary — i18n gap-fill batch 2 (ATG / terrain mission surfaces).
 *
 * Files the UI redesign created new and the 2026-09-04 merge never
 * internationalized:
 *   • src/app/(app)/assignations-atg/mission-quick-actions.tsx
 *   • src/app/(app)/assignations-atg/mission-peek-panel.tsx
 *   • src/app/(app)/assignations-atg/mission-geofence-checkin.tsx
 *   • src/app/(app)/assignations-atg/mission-command-palette.tsx
 *   • src/app/(app)/assignations-atg/mission-map-view.tsx
 *
 * Keys are the FRENCH source strings exactly as they appear in code. Strings
 * already covered elsewhere in src/i18n/en are NOT repeated here.
 * Audit-trail text written by these files (logHistorique action + details)
 * stays French on purpose and is absent from this dictionary.
 */

export const I18N_FIX_2_EN: Record<string, string> = {
  // ── Quick actions: reassignment popover + toasts ─────────────────────
  'Réassigner à': 'Reassign to',
  'missions à': 'missions to', // « Réassigner 3 missions à »
  'Aucun agent disponible': 'No agent available',
  'actuel': 'current',
  'Mission réassignée': 'Mission reassigned',
  'missions réassignées': 'missions reassigned', // « 3 missions réassignées »
  'Nouvel agent': 'New agent',
  'Annuler la réassignation': 'Undo the reassignment',
  'Annulation impossible': 'Undo failed',
  'Réassignation impossible': 'Reassignment failed',
  'Réassigner la mission': 'Reassign the mission',

  // ── Quick actions: row cluster ───────────────────────────────────────
  "Appeler l'assuré": 'Call the insured',
  'Itinéraire Google Maps': 'Google Maps route',

  // ── « En route » WhatsApp message (read by the insured) ──────────────
  'En route': 'On the way',
  "Prévenir l'assuré sur WhatsApp": 'Notify the insured on WhatsApp',
  "Bonjour, votre expert automobile est en route pour l'expertise de votre véhicule":
    'Hello, your auto appraiser is on the way to inspect your vehicle',
  'rendez-vous prévu à': 'appointment scheduled for',
  'À très bientôt.': 'See you soon.',

  // ── Check-in (button + geofenced suggestion) ─────────────────────────
  'Arrivé sur place': 'Arrived on site',
  "Horodater l'arrivée sur place (heure + GPS)": 'Stamp the on-site arrival (time + GPS)',
  'Arrivée enregistrée': 'Arrival recorded',
  'Heure et position GPS horodatées.': 'Time and GPS position stamped.',
  'Heure enregistrée (position GPS indisponible).': 'Time recorded (GPS position unavailable).',
  'heure et position GPS horodatées.': 'time and GPS position stamped.',
  'Enregistrement impossible': 'Could not save',
  'Vous êtes sur place': 'You are on site',
  // Fragments around the distance: « à ~120 m de l'adresse ».
  'à ~': '~',
  " m de l'adresse": ' m from the address',
  'Ignorer la suggestion': 'Dismiss the suggestion',
  "Confirmer l'arrivée": 'Confirm the arrival',

  // ── Peek panel ───────────────────────────────────────────────────────
  // « Mission » (peek badge) is already keyed in i18n-fix-1.ts.
  'Ouvrir dans Google Maps': 'Open in Google Maps',
  'Appeler': 'Call',
  // One key per stage, mirroring terrain.ts's « Aucune photo … pour le moment. »
  "Aucune photo avant pour l'instant.": 'No "before" photos yet.',
  "Aucune photo en cours pour l'instant.": 'No "in progress" photos yet.',
  "Aucune photo après pour l'instant.": 'No "after" photos yet.',
  "Aucune photo apres pour l'instant.": 'No "after" photos yet.',

  // ── Command palette ──────────────────────────────────────────────────
  'Palette de commandes': 'Command palette',
  'Rechercher une mission ou une action…': 'Search for a mission or an action…',

  // ── Map view ─────────────────────────────────────────────────────────
  'Agents': 'Agents',
  'Localisation des adresses…': 'Locating addresses…',
  'adresse non localisable': 'address could not be located',
  'adresses non localisables': 'addresses could not be located',
  'Position ancienne': 'Stale position',
  'Actualiser la position': 'Refresh the position',
  // Relative age: French prefixes (« il y a 5 min »), English suffixes
  // ("5 min ago") — hence the empty prefix and the suffixed units.
  "à l'instant": 'just now',
  'il y a ': '',
  ' min': ' min ago',
  ' h': ' h ago',
};
