import { getCached, setCached } from '@/lib/cache';
import { getSimpleNewsContextServer } from '@/lib/rag/simpleRAG';

interface StockAnalysis {
    symbol: string;
    recommendation: 'BUY' | 'HOLD' | 'SELL';
    confidence: number;
    targetPrice: number;
    reasoning: string;
    risks: string[];
    catalyst: string;
    timestamp: number;
}

/**
 * Analyze a stock and cache the result
 * Used by cache warming script
 */
export async function analyzeStockForCache(symbol: string): Promise<StockAnalysis> {
    // 1. Check if already cached and fresh (< 24 hours)
    const cacheKey = `stock_${symbol}`;
    const { data: cached } = await getCached(cacheKey);

    if (cached) {
        try {
            const parsed = JSON.parse(cached) as StockAnalysis;
            if (parsed.timestamp) {
                const age = Date.now() - parsed.timestamp;
                if (age < 24 * 60 * 60 * 1000) {
                    console.log(`  ⚡ ${symbol}: Using existing cache`);
                    return parsed;
                }
            }
        } catch (e) {
            console.warn(`Failed to parse cached data for ${symbol}`);
        }
    }

    // 2. Fetch market data
    const marketData = await fetchMarketData(symbol);
    if (!marketData) {
        throw new Error(`Failed to fetch market data for ${symbol}`);
    }

    // 3. Get news context (simple filter, no OpenAI)
    const newsContext = await getSimpleNewsContextServer(symbol);

    // 4. Call Gemini for analysis
    const analysis = await callGeminiAnalysis({
        symbol,
        price: marketData.price,
        change: marketData.change,
        volume: marketData.volume,
        marketCap: marketData.marketCap,
        newsContext
    });

    // 5. Add timestamp
    const result: StockAnalysis = {
        ...analysis,
        timestamp: Date.now()
    };

    // 6. Save to cache (24h TTL)
    await setCached(cacheKey, JSON.stringify(result), 24 * 60 * 60);

    return result;
}

/**
 * Fetch market data for a symbol
 */
async function fetchMarketData(symbol: string): Promise<any> {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/market?symbol=${symbol}`
        );

        if (!response.ok) {
            throw new Error(`Market API returned ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch market data for ${symbol}:`, error);
        return null;
    }
}

/**
 * Call Gemini API for stock analysis
 */
async function callGeminiAnalysis(data: {
    symbol: string;
    price: number;
    change: number;
    volume: number;
    marketCap: number;
    newsContext: string;
}): Promise<Omit<StockAnalysis, 'timestamp'>> {
    const prompt = `
Analyze ${data.symbol} stock for investment decision.

MARKET DATA:
- Current Price: $${data.price}
- 24h Change: ${data.change}%
- Volume: ${data.volume}
- Market Cap: $${data.marketCap}

${data.newsContext ? `RECENT NEWS:\n${data.newsContext}\n` : ''}

CRITICAL: Keep response concise.
- Reasoning: Max 150 words
- Risks: Max 3 items, 10 words each
- Total response must fit in 200 words or less

Return JSON with these exact fields:
{
  "recommendation": "BUY|HOLD|SELL",
  "confidence": 0-100,
  "targetPrice": number,
  "reasoning": "Max 150 words explaining recommendation",
  "risks": ["Risk 1 (max 10 words)", "Risk 2", "Risk 3"],
  "catalyst": "Key upcoming event/metric to watch (max 20 words)"
}
`;

    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    type: 'stock_analysis',
                    symbol: data.symbol
                })
            }
        );

        if (!response.ok) {
            throw new Error(`AI API returned ${response.status}`);
        }

        const result = await response.json();
        return {
            symbol: data.symbol,
            ...result
        };
    } catch (error) {
        console.error(`Failed to analyze ${data.symbol}:`, error);
        throw error;
    }
}
