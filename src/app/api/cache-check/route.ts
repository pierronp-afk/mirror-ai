import { NextResponse } from 'next/server';
import { getCached } from '@/lib/cache';

/**
 * API endpoint to check if a stock has a cached analysis
 * Used by auto-refresh to detect fresh analyses
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const symbol = searchParams.get('symbol');

        if (!symbol) {
            return NextResponse.json(
                { error: 'Symbol is required' },
                { status: 400 }
            );
        }

        const cacheKey = `stock_${symbol}`;
        const { data: cached, source } = await getCached(cacheKey);

        if (cached) {
            try {
                const analysis = JSON.parse(cached);
                return NextResponse.json({
                    cached: true,
                    source,
                    timestamp: analysis.timestamp,
                    analysis
                });
            } catch (e) {
                return NextResponse.json({
                    cached: false,
                    error: 'Failed to parse cached data'
                });
            }
        }

        return NextResponse.json({
            cached: false
        });

    } catch (error) {
        console.error('Cache check error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
