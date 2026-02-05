import { NextRequest, NextResponse } from 'next/server';
const pdf = require('pdf-parse');

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "Aucun fichier n'a été fourni" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Extraction du texte du PDF
        const pdfData = await pdf(buffer);
        const extractedText = pdfData.text;

        if (!extractedText || extractedText.trim().length === 0) {
            return NextResponse.json({ error: "Impossible de lire le contenu du PDF" }, { status: 400 });
        }

        // Utilisation de Gemini pour parser le texte et extraire les actifs
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY non configurée" }, { status: 500 });
        }

        const prompt = `
            Tu es un extracteur de données financières expert.
            Voici le texte extrait d'un relevé de compte titres :
            \"\"\"
            ${extractedText}
            \"\"\"

            TA MISSION :
            1. Identifie tous les titres boursiers (actions, ETF).
            2. Pour chaque titre, trouve le Symbole (Ticker comme AAPL, TSLA, MC.PA, etc.) et la Quantité détenue.
            3. Si le symbole n'est pas explicite, essaie de le déduire du nom de la société.
            4. Retourne UNIQUEMENT un tableau JSON d'objets avec les clés "symbol" (string) et "shares" (number).

            FORMAT DE RÉPONSE ATTENDU :
            [
                {"symbol": "AAPL", "shares": 10},
                {"symbol": "MSFT", "shares": 5.5}
            ]
        `;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Gemini Error:", error);
            return NextResponse.json({ error: "L'IA n'a pas pu analyser le document" }, { status: 500 });
        }

        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        // Extraction du JSON de la réponse texte
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return NextResponse.json({ error: "Format d'extraction invalide" }, { status: 500 });
        }

        const stocks = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ stocks });

    } catch (error: any) {
        console.error("PDF Import Error:", error);
        return NextResponse.json({ error: "Erreur lors du traitement du PDF", details: error.message }, { status: 500 });
    }
}
