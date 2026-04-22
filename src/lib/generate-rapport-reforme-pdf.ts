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
import { generateRapportPDF } from './generate-rapport-pdf';

// Matches the existing generator signature (db is the Firestore instance).
export async function generateRapportReformePDF(
  db: unknown,
  dossierId: string,
  typeRapport?: string
): Promise<void> {
  return generateRapportPDF(db, dossierId, typeRapport ?? 'Réforme');
}
