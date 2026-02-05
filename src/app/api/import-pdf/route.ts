import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface GeminiResponse {
    candidates?: {
        content?: {
            parts?: { text?: string }[];
        };
    }[];
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "Aucun fichier n'a été fourni" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const base64Data = Buffer.from(bytes).toString('base64');

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY non configurée" }, { status: 500 });
        }

        const prompt = `
            Tu es un extracteur de données financières expert.
            Le document PDF joint est un relevé de compte titres.
            
            TA MISSION :
            1. Analyse le document PDF.
            2. Identifie tous les titres boursiers (actions, ETF).
            3. Pour chaque titre, trouve :
               - Le Nom de l'entreprise (ex: "Apple Inc", "Tesla Motors", "LVMH")
               - Le Symbole / Ticker (ex: AAPL, TSLA, MC.PA, etc.)
               - La Quantité détenue (nombre de titres)
            4. Retourne UNIQUEMENT un tableau JSON d'objets avec les clés "symbol" (string), "name" (string) et "shares" (number).

            RÈGLES CRITIQUES :
            - Pour le 'name', prends la première ligne descriptive de la position.
            - Pour le 'symbol', assure-toi qu'il correspond au code boursier.
            - Pour 'shares', assure-toi que c'est un nombre (utilises le point pour les décimales).

            FORMAT DE RÉPONSE ATTENDU :
            [
                {"symbol": "AAPL", "name": "Apple Inc", "shares": 10},
                {"symbol": "MC.PA", "name": "LVMH", "shares": 5.5}
            ]
        `;

        const callGeminiWithRetry = async (retries = 3, delay = 1000): Promise<GeminiResponse> => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{
                    parts: [
                        {
                            inline_data: {
                                mime_type: "application/pdf",
                                data: base64Data
                            }
                        },
                        {
                            text: prompt
                        }
                    ]
                }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                return await response.json() as GeminiResponse;
            }

            const errorData = await response.json().catch(() => ({}));
            console.error(`❌ Erreur Gemini PDF (${response.status}):`, errorData);

            if ((response.status === 429 || response.status >= 500) && retries > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                return callGeminiWithRetry(retries - 1, delay * 2);
            }

            throw new Error(errorData.error?.message || `Erreur Gemini (${response.status})`);
        };

        const data = await callGeminiWithRetry();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiResponse) {
            return NextResponse.json({ error: "L'IA n'a renvoyé aucun contenu" }, { status: 500 });
        }

        // Extraction du JSON de la réponse texte
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return NextResponse.json({ error: "Format d'extraction invalide" }, { status: 500 });
        }

        const stocks = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ stocks });

    } catch (error: any) {
        console.error("PDF Import Error Total:", error);
        return NextResponse.json({
            error: "L'IA n'a pas pu analyser le document",
            details: error.message,
            geminiError: error.geminiError || null
        }, { status: 500 });
    }
}
