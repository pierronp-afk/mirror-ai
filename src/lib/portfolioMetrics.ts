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

/**
 * Map stock symbols to their sectors
 */
export function getStockSector(symbol: string): string {
    const sectorMap: Record<string, string> = {
        // Tech
        'AAPL': 'Tech',
        'MSFT': 'Tech',
        'GOOG': 'Tech',
        'GOOGL': 'Tech',
        'META': 'Tech',
        'NVDA': 'Tech',
        'AMZN': 'Tech',
        'TSLA': 'Tech',
        'NFLX': 'Tech',
        'ASML.AS': 'Tech',
        'SAP.DE': 'Tech',

        // Luxury
        'MC.PA': 'Luxe',
        'OR.PA': 'Luxe',
        'RMS.PA': 'Luxe',
        'KER.PA': 'Luxe',

        // Energy
        'SHEL.L': 'Énergie',
        'BP.L': 'Énergie',
        'TTE.PA': 'Énergie',
        'XOM': 'Énergie',
        'CVX': 'Énergie',

        // Finance
        'JPM': 'Finance',
        'BAC': 'Finance',
        'GS': 'Finance',
        'BNP.PA': 'Finance',
        'ACA.PA': 'Finance',

        // Consumer
        'NESN.SW': 'Consommation',
        'PG': 'Consommation',
        'KO': 'Consommation',
        'PEP': 'Consommation',

        // Auto
        '7203.T': 'Automobile',
        'F': 'Automobile',
        'GM': 'Automobile',

        // Other
        '0700.HK': 'Tech',
    };

    return sectorMap[symbol.toUpperCase()] || 'Autre';
}

/**
 * Calculate sector weights across the portfolio
 */
export function calculateSectorWeights(
    stocks: Stock[],
    marketPrices: Record<string, MarketData>,
    exchangeRate: number = 1
): Record<string, { total: number; avg: number; count: number }> {
    const sectorData: Record<string, { total: number; count: number }> = {};

    let totalPortfolioValue = 0;

    // First pass: calculate total portfolio value
    stocks.forEach(stock => {
        const marketPrice = marketPrices[stock.symbol]?.price || stock.avgPrice;
        const convertedPrice = marketPrice * exchangeRate;
        totalPortfolioValue += stock.shares * convertedPrice;
    });

    // Second pass: calculate sector weights
    stocks.forEach(stock => {
        const sector = getStockSector(stock.symbol);
        const marketPrice = marketPrices[stock.symbol]?.price || stock.avgPrice;
        const convertedPrice = marketPrice * exchangeRate;
        const stockValue = stock.shares * convertedPrice;
        const weight = totalPortfolioValue > 0 ? (stockValue / totalPortfolioValue) * 100 : 0;

        if (!sectorData[sector]) {
            sectorData[sector] = { total: 0, count: 0 };
        }

        sectorData[sector].total += weight;
        sectorData[sector].count += 1;
    });

    // Calculate averages
    const result: Record<string, { total: number; avg: number; count: number }> = {};
    Object.keys(sectorData).forEach(sector => {
        result[sector] = {
            total: sectorData[sector].total,
            avg: sectorData[sector].total / sectorData[sector].count,
            count: sectorData[sector].count
        };
    });

    return result;
}

/**
 * Generate actionable advice with precise share counts
 */
export function generateActionableAdvice(
    stock: Stock & { symbol: string; shares: number; currentValue?: number },
    portfolioWeight: number,
    analysis?: {
        recommendation?: string;
        advice?: string;
        riskScore?: number;
        mainRisk?: string;
        reason?: string;
        sentiment?: string;
    },
    totalPortfolioValue: number = 0
): string {
    const isOverweight = portfolioWeight > 20;
    const isSellSignal = analysis?.recommendation === 'SELL' || analysis?.advice === 'Vendre';
    const isBuySignal = analysis?.recommendation === 'BUY' || analysis?.advice === 'Acheter' || analysis?.advice === 'Renforcer';

    const totalShares = stock.shares;
    const targetWeight = 15; // Target weight if overweight

    // Use AI reason or default to fallback
    const aiReason = analysis?.mainRisk || analysis?.reason || analysis?.sentiment;

    // Calculate shares to sell to reach target weight
    const sharesToSell = isOverweight && totalPortfolioValue > 0
        ? Math.ceil(((portfolioWeight - targetWeight) / portfolioWeight) * totalShares)
        : 0;

    // SELL signal + Overweight = Strong sell
    if (isSellSignal && isOverweight) {
        const reasoning = aiReason || 'risques identifiés et surpondération';
        return `🔴 Allégez fortement : Vendez ${sharesToSell} actions (${stock.symbol}) pour réduire à ~${targetWeight}% du portfolio. Raison : ${reasoning}`;
    }

    // Overweight but no sell signal = Moderate reduction
    if (isOverweight && !isSellSignal) {
        const partialSell = Math.ceil(sharesToSell / 2);
        const reasoning = aiReason ? `Note : ${aiReason}. ` : '';
        return `🟡 Allégez partiellement : Vendez ${partialSell} actions pour réduire la concentration. ${reasoning}Le titre reste intéressant mais trop de risque de concentration.`;
    }

    // SELL signal but not overweight = Progressive exit
    if (isSellSignal && !isOverweight) {
        const progressiveSell = Math.ceil(totalShares / 3);
        const reasoning = aiReason || 'signaux négatifs identifiés par l\'IA';
        return `🔴 Sortez progressivement : Vendez ${progressiveSell} actions maintenant. Raison : ${reasoning}`;
    }

    // BUY signal with room to grow
    if (isBuySignal && portfolioWeight < 15) {
        const sharesToBuy = Math.floor(((20 - portfolioWeight) / 20) * totalShares);
        if (sharesToBuy > 0) {
            const reasoning = aiReason ? ` (${aiReason})` : '';
            return `🟢 Renforcez : Achetez ${sharesToBuy} actions supplémentaires pour porter la position à ~${(portfolioWeight + 5).toFixed(1)}% du portfolio.${reasoning}`;
        }
    }

    // BUY signal but already well-sized
    if (isBuySignal) {
        const reasoning = aiReason ? `. Analyse : ${aiReason}` : '';
        return `🟢 Conservez : Position bien dimensionnée (${portfolioWeight.toFixed(1)}%)${reasoning}.`;
    }

    // HOLD by default
    const reasoning = aiReason ? `. Note de l'IA : ${aiReason}` : '';
    return `⚪ Conservez : Position équilibrée (${portfolioWeight.toFixed(1)}%)${reasoning}.`;
}
