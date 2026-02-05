export interface Stock {
    symbol: string;
    name?: string;
    shares: number;
    avgPrice: number;
    sector?: string;
}

export interface AISignal {
    symbol: string;
    name: string;
    logo?: string;
    dailyChange?: number;
    reason: string;
    justification: string;
    rec: string;
    urgency: string;
    color: string;
    advice?: "Vendre" | "Alléger" | "Conserver" | "Renforcer" | "Acheter";
    targetPrice?: number;
    stopLoss?: number;
}

export interface Opportunity {
    symbol: string;
    name: string;
    horizon: 'LONG' | 'MEDIUM' | 'SHORT' | 'FUSIL';
    reason: string;
    priceMax: number;
    priceExit: number;
}

export interface AIAnalysis {
    health: string;
    healthDesc: string;
    prediction: string;
    predictionDesc: string;
    signals: AISignal[];
    opportunities: Opportunity[];
    newsHighlight: string;
    forecast?: { date: string; value: number }[];
}

export interface UserProfile {
    uid: string;
    email?: string;
}

export type MarketPrices = Record<string, { price: number; change: number; changePercent: number }>;
