import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

/**
 * AI High-Fidelity Document Reconstruction API.
 * Instructs Gemini to generate pixel-perfect HTML that replicates the source document layout.
 */
export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "URL du fichier manquante." }, { status: 400 });
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Échec du chargement du fichier source: ${imageResponse.statusText}`);
    }
    
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUri = `data:${contentType};base64,${base64}`;

    const { text } = await ai.generate({
      model: 'googleai/gemini-3-flash-preview',
      prompt: [
        { text: `Tu es un expert en reconstruction documentaire pixel-perfect pour l'assurance automobile.
Ton objectif est de transcrire ce document en HTML SÉMANTIQUE PUR qui reproduit FIDÈLEMENT la mise en page originale (polices, tableaux, alignements).

RÈGLES CRITIQUES DE RECONSTRUCTION :
1. Utilise des balises <table> pour TOUS les tableaux ou grilles. Les bordures doivent être visibles si elles le sont sur l'original.
2. Préserve les styles : 
   - <span style="color: #2563eb"> pour les écritures manuscrites bleues.
   - <span style="color: #dc2626"> pour les tampons ou annotations rouges.
   - <strong> pour les en-têtes et textes en gras.
3. Structure de la page :
   - En-tête avec les coordonnées de l'expert.
   - Section Véhicule & Assuré sous forme de tableaux structurés.
   - Liste des Fournitures (Pièces) avec colonnes : Désignation, Opération, Qté, Prix.
   - Section Main d'œuvre détaillée.
4. Si un mot est illisible, écris [illisible].
5. L'utilisateur doit pouvoir éditer ce document comme s'il s'agissait d'un fichier Excel ou Word natif.
6. NE METS PAS de balises <html>, <body>, <head> ou de blocs markdown (\`\`\`html). Renvoie uniquement le contenu HTML brut.` },
        { media: { url: dataUri } }
      ]
    });

    const resultHtml = text ? text.trim() : "";
    const resultText = resultHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    return NextResponse.json({ 
      html: resultHtml, 
      text: resultText 
    });
  } catch (error: any) {
    console.error('[/api/chiffrer] HTR Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur interne lors de la reconstruction.' }, { status: 500 });
  }
}
