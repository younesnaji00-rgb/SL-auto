// French source string -> English translation.
//
// Orchestrator-level additions from the 2026-09-04 i18n gap-fill: keys needed
// by render sites that sit outside any batch's file list.
export const I18N_FIX_0_EN: Record<string, string> = {
  // documents-tab renders the missing required-piece labels; every other slot
  // name is already translated, this either-or pair was the only gap.
  // (src/lib/required-docs.ts GARAGE_PAIR_LABEL — compared by identity there,
  // so it stays French at the source and is translated on render.)
  'Devis Garage ou Facture Garage': 'Garage estimate or garage invoice',
};
