/**
 * Calculate portfolio metrics for all stocks
 * Used to determine portfolio weights and concentration risks
 */

interface Stock {
    symbol: string;
    shares: number;
    avgPrice: number;
}

interface MarketData {
    price: number;
}

interface PortfolioMetrics {
    totalValue: number;
    stockWeights: Record<string, {
        value: number;
        weight: number;
        isOverweight: boolean;
    }>;
}

export function calculatePortfolioMetrics(
    stocks: Stock[],
    marketPrices: Record<string, MarketData>,
    exchangeRate: number = 1
): PortfolioMetrics {
    // Calculate total portfolio value
    const totalValue = stocks.reduce((sum, stock) => {
        const marketPrice = marketPrices[stock.symbol]?.price || stock.avgPrice;
        const convertedPrice = marketPrice * exchangeRate;
        return sum + (stock.shares * convertedPrice);
    }, 0);

    // Calculate individual stock weights
    const stockWeights: Record<string, {
        value: number;
        weight: number;
        isOverweight: boolean;
    }> = {};

    stocks.forEach(stock => {
        const marketPrice = marketPrices[stock.symbol]?.price || stock.avgPrice;
        const convertedPrice = marketPrice * exchangeRate;
        const value = stock.shares * convertedPrice;
        const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;

        stockWeights[stock.symbol] = {
            value,
            weight,
            isOverweight: weight > 20 // Concentration risk threshold
        };
    });

    return {
        totalValue,
        stockWeights
    };
}

/**
 * Get weight badge color based on concentration
 */
export function getWeightBadgeColor(weight: number): string {
    if (weight > 30) return 'bg-red-100 text-red-700 border-red-200';
    if (weight > 20) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (weight > 10) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
}

/**
 * Get concentration risk message
 */
export function getConcentrationRiskMessage(weight: number, symbol: string): string | null {
    if (weight > 30) {
        return `⚠️ RISQUE ÉLEVÉ: ${symbol} représente ${weight.toFixed(1)}% de votre portefeuille. Une concentration supérieure à 30% expose votre capital à un risque important. Envisagez de diversifier.`;
    }
    if (weight > 20) {
        return `⚠️ Concentration notable: ${symbol} représente ${weight.toFixed(1)}% de votre portefeuille. Restez vigilant et surveillez cette position de près.`;
    }
    return null;
}
