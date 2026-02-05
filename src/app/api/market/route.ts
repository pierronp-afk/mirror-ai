import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


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
        console.error("❌ FINNHUB_API_KEY manquante sur le serveur");
        return NextResponse.json({ error: "Clé API Finnhub manquante (serveur)" }, { status: 500 });
    }

    console.log(`📡 Récupération prix pour : ${symbol} (Key status: OK)`);


    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);

        const data = await response.json() as any;

        if (!response.ok) {
            // Log specifically if rate limited
            if (response.status === 429 || (data.error && data.error.includes("limit reached"))) {
                console.warn(`⚠️  Ratio limite atteint pour ${symbol}`);
                return NextResponse.json({
                    error: "Limite API atteinte",
                    symbol: symbol,
                    c: 0, // Fallback price
                    limited: true
                }, { status: 429 });
            }
            throw new Error(`Finnhub API Error: ${response.statusText}`);
        }

        // Finnhub response format for quote: { c: current price, d: change, dp: percent change, ... }
        return NextResponse.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        console.error(`❌ Erreur /api/market pour ${symbol}:`, message);
        return NextResponse.json(
            { error: "Erreur lors de la récupération des données de marché", details: message, symbol },
            { status: 500 }
        );
    }
}
