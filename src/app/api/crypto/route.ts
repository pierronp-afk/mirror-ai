import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.get('ids'); // comma separated ids like 'bitcoin,ethereum'

    // CoinGecko public API doesn't require a key but has rate limits
    // Pro API would require 'x-cg-pro-api-key'
    const cgApiKey = process.env.COINGECKO_API_KEY;

    if (!ids) {
        return NextResponse.json({ error: "IDs are required" }, { status: 400 });
    }

    try {
        const baseUrl = cgApiKey ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';
        const url = `${baseUrl}/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`;

        const headers: any = {};
        if (cgApiKey) {
            headers['x-cg-pro-api-key'] = cgApiKey;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`CoinGecko responded with ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Error in crypto API:", error);
        return NextResponse.json({ error: "Failed to fetch crypto data", message: error.message }, { status: 500 });
    }
}
