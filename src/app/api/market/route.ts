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
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes for stocks
const FOREX_CACHE_TTL = 2 * 60 * 1000; // 2 minutes for forex
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
    const isForex = symbol.startsWith('FX:') || symbol.startsWith('OANDA:');
    const ttl = isForex ? FOREX_CACHE_TTL : CACHE_TTL;

    if (now - entry.timestamp > ttl) {
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

async function getForexRate(symbol: string) {
    // Only support EUR/USD for now as it's the primary need
    if (symbol !== 'FX:EURUSD' && symbol !== 'OANDA:EUR_USD' && symbol !== 'EURUSD') {
        return null;
    }

    const cacheKey = `forex_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FOREX_CACHE_TTL) {
        return cached.data;
    }

    try {
        const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD');
        if (!res.ok) return null;
        const data = await res.json();

        if (data && data.rates && data.rates.USD) {
            const quote = {
                c: data.rates.USD,
                d: 0,
                dp: 0,
                t: Math.floor(Date.now() / 1000)
            };
            cache.set(cacheKey, { data: quote, timestamp: Date.now() });
            return quote;
        }
    } catch (err) {
        console.error('Forex fetch error:', err);
    }
    return null;
}

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

async function getYahooFallback(symbol: string): Promise<FinnhubQuote | null> {
    try {
        console.log(`🔍 Tentative de fallback Yahoo pour ${symbol}...`);
        // Using Yahoo Finance public chart API as a fallback for quotes
        // Adding a User-Agent is often required to avoid being blocked by Yahoo
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!res.ok) return null;

        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;

        if (meta && meta.regularMarketPrice) {
            return {
                c: meta.regularMarketPrice,
                d: meta.regularMarketPrice - meta.chartPreviousClose,
                dp: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
                pc: meta.chartPreviousClose,
                t: Math.floor(Date.now() / 1000)
            };
        }
    } catch (err) {
        console.error(`❌ Yahoo fallback failed for ${symbol}:`, err);
    }
    return null;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const symbolParam = searchParams.get('symbol');
    const symbol = symbolParam?.trim().toUpperCase();
    const type = searchParams.get('type'); // 'quote' (default) or 'profile'
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!symbol) return NextResponse.json({ error: "Symbole requis" }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });

    try {
        if (type === 'profile') {
            const profile = await getCompanyProfile(symbol, apiKey);
            return NextResponse.json(profile || {});
        }

        // Special case for Forex (using Frankfurter as more reliable source)
        if (symbol === 'FX:EURUSD' || symbol === 'OANDA:EUR_USD' || symbol === 'EURUSD') {
            const forexData = await getForexRate(symbol);
            if (forexData) {
                return NextResponse.json(forexData);
            }
            // Fallback to existing logic if Frankfurter fails
        }

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

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Finnhub API Error [${response.status}] for ${symbol}:`, errorText);

            if (response.status === 429) {
                return NextResponse.json({ error: "Limite API", symbol, c: 0, limited: true }, { status: 429 });
            }
            if (response.status === 403 || response.status === 401) {
                return NextResponse.json({ error: "Accès refusé Finnhub (vérifiez la clé ou le plan)", symbol, c: 0, forbidden: true }, { status: 200 });
            }
            // Au lieu de throw, on retourne 200 avec c:0 pour ne pas casser le hook frontend
            return NextResponse.json({ error: `Erreur Finnhub ${response.status}`, symbol, c: 0 }, { status: 200 });
        }

        const data = await response.json() as any;

        if (data.c && data.c > 0) {
            setCachedData(symbol, data);
            return NextResponse.json(data);
        } else {
            console.warn(`⚠️ Pas de prix (c=0) retourné par Finnhub pour ${symbol}. Tentative de fallback Yahoo...`);

            // Fallback Yahoo
            const yahooData = await getYahooFallback(symbol);
            if (yahooData) {
                console.log(`✅ Succès fallback Yahoo pour ${symbol}: ${yahooData.c}`);
                setCachedData(symbol, yahooData);
                return NextResponse.json(yahooData);
            }

            return NextResponse.json({ ...data, warning: "Symbole non supporté ou données manquantes" });
        }

    } catch (error: any) {
        console.error(`❌ Erreur critique /api/market pour ${symbol}:`, error.message);
        return NextResponse.json({ error: error.message, c: 0 }, { status: 200 }); // On reste sur 200 pour le frontend
    }
}
