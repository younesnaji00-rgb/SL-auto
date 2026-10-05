import type { DevisHeader } from './devis-schema';

/**
 * The devis editor's « Informations » card: the DOSSIER wins over the scan
 * (QA Chiffreur 010, reversing task #17).
 *
 * `existing` is the header the AI read off the garage document, or the one
 * saved with a previous accord. The garage paper names its own client,
 * insurer and phone (« Autre », « RMA », the garage's number…), and a saved
 * header goes stale when the gestionnaire later corrects the dossier — so the
 * chiffreur saw values that differed from the dossier, or none at all.
 * Every field the dossier knows comes from the dossier; the scan / saved
 * value only fills what the dossier leaves blank (ICE, N°, date…).
 */
export function prefillHeaderFromDossier(existing: DevisHeader, dossier: any): DevisHeader {
  if (!dossier) return existing;
  const v = dossier.vehicule || {};
  const a = typeof dossier.assure === 'object' && dossier.assure ? dossier.assure : { nom: dossier.assure || '' };
  let mecStr = '';
  if (v.mec) {
    try {
      const d = v.mec.toDate ? v.mec.toDate() : new Date(v.mec);
      if (!isNaN(d.getTime())) mecStr = d.toLocaleDateString('fr-FR');
    } catch { /* ignore */ }
  }
  const rank = dossier.expertRank === '2eme' || dossier.expertRank === 'arbitre' ? dossier.expertRank : '1er';
  const pick = (fromDossier: unknown, fallback: string | undefined) => String(fromDossier ?? '').trim() || fallback || '';
  return {
    ...existing,
    marque: pick(v.marque, existing.marque),
    matricule: pick(dossier.matricule || v.immatriculation, existing.matricule),
    modele: pick(v.modele, existing.modele || mecStr),
    kilometrage: pick(v.km, existing.kilometrage),
    chassis: pick(v.serie, existing.chassis),
    expert: pick(dossier.experts?.[rank]?.nom, existing.expert),
    // The client of a garage devis is the assuré, named as the dossier shows
    // it (« Nom complet » = nom + prénom).
    client: pick([a.nom, a.prenom].filter(Boolean).join(' ') || dossier.garageName, existing.client),
    adresse: pick(a.adresse, existing.adresse),
    telephone: pick(a.telephone, existing.telephone),
    assurances: pick(dossier.compagnie, existing.assurances),
  };
}
