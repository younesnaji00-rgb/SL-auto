import type { PageTutorial } from '../types';

/**
 * Éditeur de devis structuré (/devis-editor) — the journey's showcase of the
 * auto-calculating table. Anchors live in
 * src/components/chiffreurs/devis-editor.tsx. The "J'ai vérifié" step only
 * exists while the post-scan lock is active (auto-skipped otherwise). The
 * TVA step is hands-on with a real predicate; the save step opens the PDF
 * preview where the accord/proposition column behaviour and the stamp live.
 * Ends by hopping back into the dossier journey via the tab bar.
 */
export const devisEditorTutorial: PageTutorial = {
  key: 'devis-editor',
  match: (p) => p === '/devis-editor',
  steps: [
    {
      title: "L'éditeur de devis",
      body:
        "L'IA a transformé le devis scanné du garage en tableau : vous vérifiez, sans rien ressaisir.",
    },
    {
      anchor: 'dev-verify',
      title: 'Confirmer la vérification',
      body: "Comparez avec l'original, puis cliquez « J'ai vérifié » pour déverrouiller le tableau.",
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dev-table',
      title: 'Tout se calcule tout seul',
      body:
        'Modifiez une quantité ou un prix : Total HT, TTC et les sommes en pied de tableau se recalculent instantanément.',
      side: 'top',
    },
    {
      // Anchor the TABLE, not the Type column header: the overlay only lets
      // clicks through inside the highlight cutout, and the row's Type
      // select lives in the table body.
      anchor: 'dev-table',
      title: 'La TVA intelligente',
      body:
        "Passez le Type d'une ligne à « Originale » : sa TVA passe à 20 % automatiquement.",
      side: 'top',
      interact: 'until',
      // A row's Type select showing « Originale » (EN: "OEM") proves the
      // pick happened.
      until: () =>
        Array.from(
          document.querySelectorAll('[data-tour="dev-table"] [role="combobox"]'),
        ).some((el) => /Originale|Original|OEM/i.test(el.textContent || '')),
    },
    {
      anchor: 'dev-col-vetuste',
      title: 'La vétusté qui sait',
      body:
        'Type « Occasion » ? La cellule vétusté se désactive toute seule.\nLes flèches ± 5 ajustent toutes les lignes d’un coup.\nSaisissez une vétusté (ex. 10 %) sur votre ligne « Originale » — obligatoire avant l’enregistrement.',
      side: 'bottom',
    },
    {
      // The accord entry column ITSELF is highlighted (its header cell) —
      // pointing at the whole table left users guessing which column the
      // step was talking about.
      anchor: 'dev-col-accord',
      title: "Colonnes d'accord",
      body:
        "Saisissez vos prix accordés ligne par ligne — jamais au-dessus du prix d'origine, l'éditeur y veille.\nL'en-tête de colonne bascule entre « accord » et « proposition » pour un 2ème expert.",
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'dev-summary',
      title: 'Les totaux',
      body: 'Le total du devis et le total expert, toujours à jour.',
      side: 'top',
    },
    {
      anchor: 'dev-save',
      title: 'Enregistrez',
      body: "Cliquez « Enregistrer » : l'aperçu PDF se génère.",
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dev-preview',
      title: 'Le PDF sait quoi montrer',
      body:
        "La vétusté a disparu du PDF, l'accord est replié en une seule colonne « Prix Total Accordé ».\nEn proposition, une colonne vide « Accord 2ème expert » apparaît pour la signature.\nPosez aussi le tampon du cabinet (menu « Tampon »), puis confirmez ou fermez.",
      side: 'left',
      dynamic: true,
      interact: 'until',
      // Advance only once the preview has been open and closed again — the
      // next step needs the tab bar, which the modal would block.
      until: () => {
        const w = window as unknown as Record<string, boolean>;
        if (document.querySelector('[data-tour="dev-preview"]')) {
          w['sl.devPreviewSeen'] = true;
          return false;
        }
        return !!w['sl.devPreviewSeen'];
      },
    },
    {
      anchor: 'nav-/dossiers',
      title: 'Revenez au dossier',
      body:
        "L'accord enregistré arrive tout seul dans le dossier.\nCliquez sur « Gestion des dossiers » pour y retourner.",
      side: 'right',
      interact: 'click',
      chain: 'dossiers',
      chainAt: 'Rouvrez votre dossier',
    },
  ],
  // Hops back into the dossier journey (title-based resume).
  noClosing: true,
};
