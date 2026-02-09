import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!symbol) {
        return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    if (!rapidApiKey) {
        console.warn("⚠️ RAPIDAPI_KEY is missing. Market enrichment disabled.");
        return NextResponse.json({ error: "RAPIDAPI_KEY manquante", headlines: [] }, { status: 200 });
    }

    try {
        // Updated to use yahoo-finance15 (from user's screenshot)
        // This provider is good for news and market data
        const host = 'yahoo-finance15.p.rapidapi.com';
        const url = `https://${host}/api/v1/markets/news?ticker=${symbol}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': rapidApiKey,
                'x-rapidapi-host': host
            }
        });

        if (!response.ok) {
            throw new Error(`RapidAPI responded with ${response.status}`);
        }

        const data = await response.json();

        // Extraction robuste des titres d'actualité
        // yahoo-finance15 peut renvoyer les news dans 'body' ou directement à la racine
        const newsItems = Array.isArray(data) ? data : (data.body || data.news || []);
        const headlines = newsItems.slice(0, 5).map((n: any) => n.title || n.heading).filter(Boolean);

        return NextResponse.json({
            symbol,
            headlines,
            raw: data // On garde le raw au cas où
        });

    } catch (error: any) {
        console.error("Error in market-enrich API:", error.message);
        return NextResponse.json({
            error: "Failed to fetch enrichment data",
            message: error.message,
            headlines: [] // Fallback vide pour ne pas crasher le frontend
        }, { status: 200 });
    }
}
