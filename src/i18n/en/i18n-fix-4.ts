/**
 * Gap-fill batch 4 — app chrome, hooks and shared UI primitives.
 *
 * French strings the UI-redesign merge left un-internationalized in the
 * workspace tab strip, the shell hotkey registry, the `?` shortcuts sheet,
 * the top bar / avatar menu, the page-title plumbing and the saved-views
 * control. Keys are the exact French source strings.
 */
export const I18N_FIX_4_EN: Record<string, string> = {
  // ── Workspace tab strip (components/layout/workspace-tabs.tsx) ──
  'Cet onglet contient des modifications non enregistrées. Fermer quand même ?':
    'This tab has unsaved changes. Close it anyway?',
  'Chiffrages': 'Estimates',
  'onglet': 'tab',
  'onglets': 'tabs',
  'Épinglé': 'Pinned',
  'Tous les onglets': 'All tabs',
  "Épingler l'onglet actif": 'Pin the active tab',
  "Détacher l'onglet actif": 'Unpin the active tab',
  'Fermer les autres onglets': 'Close other tabs',

  // ── Tab hotkeys (labels + group shown in the `?` sheet) ──
  'Onglets': 'Tabs',
  "Fermer l'onglet actif": 'Close the active tab',
  'Rouvrir le dernier onglet fermé': 'Reopen the last closed tab',
  'Onglet suivant': 'Next tab',
  'Onglet précédent': 'Previous tab',
  'Aller à la liste (onglet 1)': 'Go to the list (tab 1)',
  "Aller à l'onglet": 'Go to tab',

  // ── Global hotkeys (components/layout/shell-ui.tsx) ──
  'Rechercher / palette de commandes': 'Search / command palette',
  'Réduire / agrandir la barre latérale': 'Collapse / expand the sidebar',
  'Basculer le mode sombre': 'Toggle dark mode',

  // ── Shortcuts sheet (components/layout/shortcuts-sheet.tsx) ──
  "Les raccourcis à une lettre s'utilisent hors des champs de saisie. « G puis D » signifie appuyer sur G, puis sur D.":
    'Single-letter shortcuts work outside input fields. “G then D” means press G, then D.',
  'Filtrer les raccourcis…': 'Filter shortcuts…',
  'Filtrer les raccourcis': 'Filter shortcuts',
  'Aucun raccourci ne correspond.': 'No shortcut matches.',
  'Listes': 'Lists',

  // ── Key captions (hooks/use-hotkeys.ts) ──
  'Maj': 'Shift',
  'Échap': 'Esc',

  // ── Top bar and avatar menu (layout/header.tsx, layout/user-menu.tsx) ──
  'Accueil': 'Home',
  'Compte :': 'Account:',

  // ── Page chrome (components/layout/page-chrome.tsx) ──
  'Aller au contenu': 'Skip to content',
  'Navigué vers': 'Navigated to',

  // ── Saved views (components/ui/saved-views.tsx) ──
  'Vues': 'Views',
  'Vues enregistrées': 'Saved views',
  'Nom de la vue :': 'View name:',
  'Aucune vue. Enregistrez vos filtres actuels pour les retrouver en un clic.':
    'No views yet. Save your current filters to recall them in one click.',
  'Supprimer la vue': 'Delete view',
  'Mettre à jour cette vue…': 'Update this view…',
  'Enregistrer la vue actuelle…': 'Save the current view…',
};
