import { NextResponse } from 'next/server';

/**
 * Route API pour interroger l'IA Gemini.
 * Cette route s'exécute côté serveur pour protéger la clé API.
 */
export async function POST(req: Request) {
  // La clé API est fournie par l'environnement d'exécution
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Configuration serveur manquante : GEMINI_API_KEY introuvable." }, { status: 500 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Le prompt est requis" }, { status: 400 });
    }

    // Configuration du système Mirror AI
    const systemPrompt = `Tu es Mirror AI, un expert financier et conseiller en gestion de patrimoine de haut niveau. 
    Ta mission est d'analyser des portefeuilles boursiers, de détecter des opportunités et de fournir des conseils stratégiques.
    Ton ton est premium, précis, analytique et encourageant. 
    Tu justifies toujours tes conseils par des arguments fondamentaux ou des actualités récentes du marché.`;

    /**
     * Fonction d'appel avec gestion des réessais (Exponential Backoff)
     * Délais : 1s, 2s, 4s, 8s, 16s
     */
    const callGeminiWithRetry = async (retries = 5, delay = 1000): Promise<any> => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return await response.json();
      }

      // Si erreur 429 (Rate Limit) ou 5xx, on réessaie
      if ((response.status === 429 || response.status >= 500) && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return callGeminiWithRetry(retries - 1, delay * 2);
      }

      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Erreur API Gemini");
    };

    const data = await callGeminiWithRetry();

    // Extraction du texte de la réponse
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json({ error: "L'IA n'a pas généré de contenu" }, { status: 500 });
    }

    return NextResponse.json({ analysis: text });

  } catch (error: any) {
    console.error("Erreur Route API AI:", error);
    return NextResponse.json(
      { error: "Échec de l'analyse IA", message: error.message },
      { status: 500 }
    );
  }
}