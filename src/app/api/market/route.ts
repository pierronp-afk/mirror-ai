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

// Cache entry interface
interface CacheEntry {
    data: FinnhubQuote;
    timestamp: number;
    ttl: number; // Dynamic TTL stored with entry
}

const cache = new Map<string, CacheEntry>();

// Rate Limiting for Yahoo
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;
let requestCount = 0;
let windowStart = Date.now();

function isRateLimited(): boolean {
    const now = Date.now();
    if (now - windowStart > RATE_LIMIT_WINDOW) {
        requestCount = 0;
        windowStart = now;
        return false;
    }
    if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
        return true;
    }
    requestCount++;
    return false;
}

// Helper to check if a specific market is open
// Returns true if current time is within trading hours
function isMarketOpen(symbol: string): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    const day = now.getUTCDay(); // 0 = Sun, 6 = Sat

    // Weekend check (Saturday/Sunday)
    if (day === 0 || day === 6) return false;

    // Convert current time to minutes from midnight UTC for easier comparison
    const currentMinutes = utcHour * 60 + utcMinute;

    // US Market (NYSE/NASDAQ)
    // 9:30 - 16:00 EST => 14:30 - 21:00 UTC (approx, ignoring DST exactness for simplicity or maintainance)
    const isUS = !symbol.includes('.');
    if (isUS) {
        return currentMinutes >= (14 * 60 + 30) && currentMinutes < (21 * 60);
    }

    // European Markets (Euronext, LSE, XETRA)
    // Roughly 08:00 - 16:30 UTC
    const isEU = symbol.endsWith('.PA') || symbol.endsWith('.L') || symbol.endsWith('.DE') || symbol.endsWith('.AS') || symbol.endsWith('.SW');
    if (isEU) {
        return currentMinutes >= (8 * 60) && currentMinutes < (16 * 60 + 30);
    }

    // Asian Markets (Tokyo, HK, etc)
    // Roughly 00:00 - 06:00 UTC
    const isAsia = symbol.endsWith('.T') || symbol.endsWith('.HK') || symbol.endsWith('.KS') || symbol.endsWith('.NS');
    if (isAsia) {
        return currentMinutes >= 0 && currentMinutes < (6 * 60);
    }

    // Default to US hours if unknown
    return currentMinutes >= (14 * 60 + 30) && currentMinutes < (21 * 60);
}

function getAdaptiveTTL(symbol: string): number {
    const now = new Date();
    const day = now.getUTCDay();

    // 1. Weekend Strategy
    if (day === 0 || day === 6) {
        return 4 * 60 * 60 * 1000; // 4 hours
    }

    // 2. Market Hours Strategy
    if (isMarketOpen(symbol)) {
        return 2 * 60 * 1000; // 2 minutes (Active Trading)
    }

    // 3. Off-Hours Strategy
    return 60 * 60 * 1000; // 1 hour
}

function getCachedData(symbol: string): FinnhubQuote | null {
    const entry = cache.get(symbol);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
        cache.delete(symbol);
        return null;
    }

    return entry.data;
}

function setCachedData(symbol: string, data: FinnhubQuote): void {
    const ttl = getAdaptiveTTL(symbol);
    // console.log(`💾 Caching ${symbol} for ${ttl / 1000 / 60} minutes`);
    cache.set(symbol, {
        data,
        timestamp: Date.now(),
        ttl
    });
}

async function getForexRate(symbol: string) {
    if (symbol !== 'FX:EURUSD' && symbol !== 'OANDA:EUR_USD' && symbol !== 'EURUSD') {
        return null;
    }

    const cacheKey = `forex_${symbol}`;
    const cached = cache.get(cacheKey);
    // Forex cache can be static 2 min or adaptive, let's keep it simple 2 min for now or use adaptive
    if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
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
            cache.set(cacheKey, { data: quote, timestamp: Date.now(), ttl: 2 * 60 * 1000 });
            return quote;
        }
    } catch (err) {
        console.error('Forex fetch error:', err);
    }
    return null;
}

async function getCompanyProfile(symbol: string, apiKey: string) {
    const cacheKey = `profile_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) { // 7 days cache
        return cached.data;
    }

    const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json();

    if (data && data.name) {
        cache.set(cacheKey, { data, timestamp: Date.now(), ttl: 7 * 24 * 60 * 60 * 1000 });
    }
    return data;
}

// Renamed and promoted to Primary Source
async function getYahooQuote(symbol: string): Promise<FinnhubQuote | null> {
    if (isRateLimited()) {
        console.warn(`⏳ Yahoo rate limit hit for ${symbol}`);
        return null;
    }

    try {
        // Switch to Chart API v8 which is more reliable/open than Quote API v7
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!res.ok) {
            return null;
        }

        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;

        if (meta && meta.regularMarketPrice) {
            const price = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose || price;
            const change = price - prevClose;
            const changePercent = (change / prevClose) * 100;

            return {
                c: price,
                d: change,
                dp: changePercent,
                pc: prevClose,
                t: meta.regularMarketTime || Math.floor(Date.now() / 1000)
            };
        }
    } catch (err) {
        console.error(`❌ Yahoo error for ${symbol}:`, err);
    }
    return null;
}

async function getFrankfurterRates() {
    const cacheKey = 'forex_rates_all';
    const cached = cache.get(cacheKey);
    // Cache for 1 hour (Frankfurter updates daily, but we want to avoid spamming)
    if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
        return cached.data;
    }

    try {
        const res = await fetch('https://api.frankfurter.app/latest?from=EUR');
        if (!res.ok) return null;
        const data = await res.json();

        // Structure: { amount: 1, base: "EUR", date: "...", rates: { USD: 1.08, ... } }
        if (data && data.rates) {
            // Add base EUR for easier logic checks if needed, though implicit
            data.rates['EUR'] = 1;
            cache.set(cacheKey, { data: data.rates, timestamp: Date.now(), ttl: 60 * 60 * 1000 });
            return data.rates;
        }
    } catch (err) {
        console.error('Frankfurter fetch error:', err);
    }
    return null;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const symbolParam = searchParams.get('symbol');
    const symbol = symbolParam?.trim().toUpperCase();
    const type = searchParams.get('type');
    const apiKey = process.env.FINNHUB_API_KEY;

    try {
        // Special endpoint for Global FX Rates
        if (type === 'forex') {
            const rates = await getFrankfurterRates();
            return NextResponse.json(rates || {});
        }

        if (!symbol) return NextResponse.json({ error: "Symbole requis" }, { status: 400 });

        if (type === 'profile') {
            const profile = await getCompanyProfile(symbol, apiKey || "");
            return NextResponse.json(profile || {});
        }

        if (symbol === 'FX:EURUSD' || symbol === 'OANDA:EUR_USD' || symbol === 'EURUSD') {
            const forexData = await getForexRate(symbol);
            if (forexData) return NextResponse.json(forexData);
        }

        // 1. Check Cache
        const cachedData = getCachedData(symbol);
        if (cachedData) {
            return NextResponse.json({ ...cachedData, cached: true });
        }

        // 2. Primary Source: Yahoo Finance
        const yahooData = await getYahooQuote(symbol);
        if (yahooData) {
            setCachedData(symbol, yahooData);
            return NextResponse.json(yahooData);
        }

        // 3. Fallback Source: Finnhub (Only for US stocks)
        // Simple US check: no dots (e.g. AAPL, TSLA)
        // Complex symbols like MC.PA are definitely not on Finnhub free tier usually in context
        // If apiKey is missing, skip Finnhub
        if (apiKey) {
            const isUSSimple = /^[A-Z]{1,5}$/.test(symbol);

            if (isUSSimple) {
                console.log(`⚠️ Yahoo failed for ${symbol}, trying Finnhub fallback...`);
                const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);

                if (response.ok) {
                    const data = await response.json() as any;
                    if (data.c && data.c > 0) {
                        setCachedData(symbol, data); // Cache successful Finnhub result
                        return NextResponse.json(data);
                    }
                }
            }
        }

        return NextResponse.json({
            error: "Data unavailable",
            symbol,
            c: 0,
            warning: "Yahoo failed and Finnhub fallback skipped or failed"
        }, { status: 200 });

    } catch (error: any) {
        console.error(`❌ Critical error /api/market for ${symbol}:`, error.message);
        return NextResponse.json({ error: error.message, c: 0 }, { status: 200 });
    }
}
