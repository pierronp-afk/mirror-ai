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

// Cache système pour éviter de surcharger l'API Finnhub
interface CacheEntry {
    data: FinnhubQuote;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes de cache
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
let requestCount = 0;
let windowStart = Date.now();

function isRateLimited(): boolean {
    const now = Date.now();

    // Réinitialiser le compteur si la fenêtre est passée
    if (now - windowStart > RATE_LIMIT_WINDOW) {
        requestCount = 0;
        windowStart = now;
        return false;
    }

    // Limiter à 30 requêtes par minute (Finnhub free tier = 60/min, on garde de la marge)
    if (requestCount >= 30) {
        return true;
    }

    requestCount++;
    return false;
}

function getCachedData(symbol: string): FinnhubQuote | null {
    const entry = cache.get(symbol);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL) {
        cache.delete(symbol);
        return null;
    }

    return entry.data;
}

function setCachedData(symbol: string, data: FinnhubQuote): void {
    cache.set(symbol, {
        data,
        timestamp: Date.now()
    });
}

// ... imports et cache existants ...

async function getCompanyProfile(symbol: string, apiKey: string) {
    // Check cache (profils changent rarement, TTL plus long)
    const cacheKey = `profile_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24h cache
        return cached.data;
    }

    const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json();

    if (data && data.name) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
    }
    return data;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type'); // 'quote' (default) or 'profile'
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!symbol) return NextResponse.json({ error: "Symbole requis" }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });

    try {
        if (type === 'profile') {
            const profile = await getCompanyProfile(symbol, apiKey);
            return NextResponse.json(profile || {});
        }

        // ... logique existante pour 'quote' ...
        // Vérifier le cache d'abord
        const cachedData = getCachedData(symbol);
        if (cachedData) {
            // console.log(`📦 Cache hit pour ${symbol}`);
            return NextResponse.json({ ...cachedData, cached: true });
        }

        if (isRateLimited()) {
            return NextResponse.json({ error: "Limite interne", symbol, c: 0, limited: true }, { status: 429 });
        }

        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
        const data = await response.json() as any;

        if (!response.ok) {
            if (response.status === 429) {
                return NextResponse.json({ error: "Limite API", symbol, c: 0, limited: true }, { status: 429 });
            }
            throw new Error(response.statusText);
        }

        if (data.c) setCachedData(symbol, data);
        return NextResponse.json(data);

    } catch (error: any) {
        console.error(`❌ Erreur /api/market:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
