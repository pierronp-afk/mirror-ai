export interface Stock {
    symbol: string;
    shares: number;
    avgPrice: number;
}

export interface AISignal {
    name: string;
    reason: string;
    justification: string;
    rec: string;
    urgency: string;
    color: string;
}

export interface AIAnalysis {
    health: string;
    healthDesc: string;
    prediction: string;
    predictionDesc: string;
    signals: AISignal[];
    newsHighlight: string;
}

export interface UserProfile {
    uid: string;
    email?: string;
}

export type MarketPrices = Record<string, number>;
