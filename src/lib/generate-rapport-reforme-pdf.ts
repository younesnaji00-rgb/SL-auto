/**
 * Réforme rapport generator.
 *
 * The existing `generate-rapport-pdf.ts` already implements the réforme-style
 * output matching screenshot 2 (Allianz-style: ref expert, assuré/adversaire,
 * caractéristiques, point de choc, conclusions, detail fournitures per choc,
 * main d'oeuvre). To avoid regression risk we re-export that generator here
 * under a clearer name. When the préliminaire / réforme templates diverge
 * further, this file becomes the home for the réforme-specific layout.
 */
import { generateRapportPDF, type GenerateRapportPDFOptions } from './generate-rapport-pdf';

// Matches the existing generator signature (db is the Firestore instance).
// `typeReforme` (e.g. 'Technique' | 'Économique') is folded into the PDF
// subtitle so the generated report is labelled "Réforme technique" /
// "Réforme économique". Task #37 also needs a Blob back for the save-pipeline
// upload, hence `options.returnBlob`.
export async function generateRapportReformePDF(
  db: unknown,
  dossierId: string,
  typeReforme?: string,
  options?: GenerateRapportPDFOptions
): Promise<Blob | void> {
  const subtitle = typeReforme
    ? `Réforme ${typeReforme.toLowerCase()}`
    : 'Réforme';
  return generateRapportPDF(db, dossierId, subtitle, options);
}
