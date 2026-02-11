import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EUROPEAN_STOCKS = [
    { symbol: 'MC.PA', name: 'LVMH', market: 'Euronext Paris', flag: '🇫🇷' },
    { symbol: 'OR.PA', name: "L'Oréal", market: 'Euronext Paris', flag: '🇫🇷' },
    { symbol: 'SHEL.L', name: 'Shell', market: 'LSE', flag: '🇬🇧' },
    { symbol: 'HSBA.L', name: 'HSBC', market: 'LSE', flag: '🇬🇧' },
    { symbol: 'SAP.DE', name: 'SAP', market: 'XETRA', flag: '🇩🇪' },
    { symbol: 'ASML.AS', name: 'ASML', market: 'Euronext Amsterdam', flag: '🇳🇱' },
    { symbol: 'NESN.SW', name: 'Nestlé', market: 'SIX Swiss', flag: '🇨🇭' }
];

const ASIAN_STOCKS = [
    { symbol: '7203.T', name: 'Toyota', market: 'Tokyo SE', flag: '🇯🇵' },
    { symbol: '0700.HK', name: 'Tencent', market: 'HKEX', flag: '🇭🇰' },
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries', market: 'NSE', flag: '🇮🇳' },
    { symbol: '005930.KS', name: 'Samsung', market: 'KOSPI', flag: '🇰🇷' }
];

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');
        const market = searchParams.get('market') || 'all'; // 'all', 'us', 'eu', 'asia'

        if (!query || query.trim().length === 0) {
            return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
        }

        const normalizedQuery = query.toLowerCase().trim();
        let results: any[] = [];

        // 1. Search in static lists based on market filter
        if (market === 'all' || market === 'eu') {
            const euMatches = EUROPEAN_STOCKS.filter(s =>
                s.symbol.toLowerCase().includes(normalizedQuery) ||
                s.name.toLowerCase().includes(normalizedQuery)
            ).map(s => ({
                symbol: s.symbol,
                description: `${s.name} ${s.flag} (${s.market})`,
                displaySymbol: s.symbol,
                type: 'Common Stock'
            }));
            results = [...results, ...euMatches];
        }

        if (market === 'all' || market === 'asia') {
            const asiaMatches = ASIAN_STOCKS.filter(s =>
                s.symbol.toLowerCase().includes(normalizedQuery) ||
                s.name.toLowerCase().includes(normalizedQuery)
            ).map(s => ({
                symbol: s.symbol,
                description: `${s.name} ${s.flag} (${s.market})`,
                displaySymbol: s.symbol,
                type: 'Common Stock'
            }));
            results = [...results, ...asiaMatches];
        }

        // 2. Search in Finnhub (US Stocks) if applicable
        if (market === 'all' || market === 'us') {
            const apiKey = process.env.FINNHUB_API_KEY;
            // Only search Finnhub if configured
            if (apiKey) {
                // console.log(`📡 Recherche Finnhub pour : "${query}"`);
                const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();
                    const usMatches = (data.result || [])
                        .filter((item: any) => item.type === 'Common Stock')
                        .slice(0, 10) // Limit US results
                        .map((item: any) => ({
                            symbol: item.symbol,
                            description: item.description,
                            displaySymbol: item.displaySymbol,
                        }));
                    results = [...results, ...usMatches];
                } else {
                    console.warn('Finnhub search failed:', response.status);
                }
            } else {
                console.warn('Finnhub API key missing, skipping US search');
            }
        }

        return NextResponse.json({ results, count: results.length });
    } catch (error) {
        console.error('Error in stock search:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
