import { NextResponse } from 'next/server';

interface FinnhubQuote {
    c?: number;
    d?: number;
    dp?: number;
    h?: number;
    l?: number;
    o?: number;
    pc?: number;
    t?: number;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!symbol) {
        return NextResponse.json({ error: "Symbole requis" }, { status: 400 });
    }

    if (!apiKey) {
        return NextResponse.json({ error: "Clé API Finnhub manquante (serveur)" }, { status: 500 });
    }

    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);

        if (!response.ok) {
            throw new Error(`Finnhub API Error: ${response.statusText}`);
        }

        const data = await response.json() as FinnhubQuote;
        // Finnhub response format for quote: { c: current price, d: change, dp: percent change, ... }
        return NextResponse.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        return NextResponse.json(
            { error: "Erreur lors de la récupération des données de marché", details: message },
            { status: 500 }
        );
    }
}
