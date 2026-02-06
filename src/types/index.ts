export interface Stock {
    symbol: string;
    name?: string;
    shares: number;
    avgPrice: number;
    sector?: string;
}

export interface AIAdvice {
    advice: "Vendre" | "Alléger" | "Conserver" | "Renforcer" | "Acheter";
    urgency: "HAUTE" | "MODÉRÉE" | "FAIBLE";
    confidence: number; // 0-100
    timestamp: number;
    reason: string;
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
    threeMonthOutlook?: string; // Perspective détaillée à 3 mois
}

export interface Opportunity {
    symbol: string;
    name: string;
    horizon: 'LONG' | 'MEDIUM' | 'SHORT' | 'FUSIL';
    reason: string;
    priceMax: number;
    priceExit: number;
    urgencyLevel?: 'CRITIQUE' | 'ÉLEVÉE' | 'NORMALE'; // Pour les coups de fusil
    sector?: string;
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
    lastUpdated?: number;
}

export interface PortfolioHistory {
    date: string;
    totalValue: number;
    totalGain: number;
    gainPercent: number;
}

export interface AIProvider {
    name: string;
    apiKey: string;
    endpoint: string;
    model: string;
}

export interface TradingDocument {
    id: string;
    name: string;
    content: string;
    uploadedAt: number;
}

export interface UserProfile {
    uid: string;
    email?: string;
}

export type MarketPrices = Record<string, { price: number; change: number; changePercent: number }>;
