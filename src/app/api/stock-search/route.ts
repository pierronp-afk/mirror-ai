import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.trim().length === 0) {
            return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
        }

        const apiKey = process.env.FINNHUB_API_KEY;
        if (!apiKey) {
            console.error('FINNHUB_API_KEY is not configured');
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        // Appel à l'API Finnhub pour la recherche de symboles
        const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error('Finnhub API error:', response.status);
            return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: response.status });
        }

        const data = await response.json();

        // Filtrer pour ne garder que les actions US et limiter à 10 résultats
        const results = (data.result || [])
            .filter((item: any) => item.type === 'Common Stock')
            .slice(0, 10)
            .map((item: any) => ({
                symbol: item.symbol,
                description: item.description,
                displaySymbol: item.displaySymbol,
            }));

        return NextResponse.json({ results, count: results.length });
    } catch (error) {
        console.error('Error in stock search:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
