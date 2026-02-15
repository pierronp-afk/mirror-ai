import { getCached, setCached } from '@/lib/cache';
import { analyzeStockForCache } from './cacheAnalyzer';

interface Stock {
    symbol: string;
    name: string;
    shares: number;
    avgPrice: number;
    currentPrice?: number;
}

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

interface PortfolioMetrics {
    totalValue: number;
    positions: Array<{
        symbol: string;
        value: number;
        weight: string;
        recommendation: string;
        confidence: number;
    }>;
    sectors: Record<string, number>;
    avgConfidence: number;
    signals: {
        buy: number;
        hold: number;
        sell: number;
    };
    concentration: number;
}

interface PortfolioInsights {
    healthScore: number;
    diversificationScore: number;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    topRecommendations: string[];
    rebalancing: Array<{
        action: 'REDUCE' | 'INCREASE' | 'ADD' | 'REMOVE';
        symbol: string;
        currentWeight: number;
        targetWeight: number;
        reasoning: string;
    }>;
    hedgingOpportunities: string;
    nextSteps: string;
}

/**
 * Smart portfolio analyzer
 * 1. Uses cached analyses when available
 * 2. Analyzes missing stocks
 * 3. Provides portfolio-level recommendations
 */
export async function analyzePortfolio(stocks: Stock[]): Promise<{
    individualAnalyses: Array<{ stock: Stock; analysis: StockAnalysis }>;
    metrics: PortfolioMetrics;
    insights: PortfolioInsights;
}> {
    console.log('🎯 Starting smart portfolio analysis...');

    // STEP 1: Identify stocks needing analysis
    const stocksToAnalyze: Stock[] = [];
    const cachedAnalyses: Array<{ stock: Stock; analysis: StockAnalysis }> = [];

    for (const stock of stocks) {
        const cacheKey = `stock_${stock.symbol}`;
        const { data: cached } = await getCached(cacheKey);

        if (cached) {
            try {
                const parsed = JSON.parse(cached) as StockAnalysis;
                if (isFreshEnough(parsed)) {
                    // Use cached analysis
                    cachedAnalyses.push({ stock, analysis: parsed });
                    console.log(`✅ ${stock.symbol}: Using cached analysis`);
                    continue;
                }
            } catch (e) {
                console.warn(`Failed to parse cached data for ${stock.symbol}`);
            }
        }

        // Needs fresh analysis
        stocksToAnalyze.push(stock);
        console.log(`🔄 ${stock.symbol}: Needs fresh analysis`);
    }

    // STEP 2: Analyze missing stocks (with rate limiting)
    console.log(`📊 Analyzing ${stocksToAnalyze.length} missing stocks...`);

    for (const stock of stocksToAnalyze) {
        try {
            const analysis = await analyzeStockForCache(stock.symbol);
            cachedAnalyses.push({ stock, analysis });
            console.log(`✅ ${stock.symbol}: Analysis complete`);

            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(`❌ ${stock.symbol}: Analysis failed`, error);
            // Continue with other stocks
        }
    }

    // STEP 3: Calculate portfolio metrics
    const metrics = calculatePortfolioMetrics(cachedAnalyses);

    // STEP 4: Build enriched prompt for Gemini
    const prompt = buildPortfolioPrompt(cachedAnalyses, metrics);

    // STEP 5: Get portfolio-level recommendations
    const insights = await callGeminiForPortfolio(prompt);

    return {
        individualAnalyses: cachedAnalyses,
        metrics,
        insights
    };
}

/**
 * Check if cached analysis is fresh enough (< 24 hours)
 */
function isFreshEnough(analysis: StockAnalysis): boolean {
    if (!analysis.timestamp) return false;
    const age = Date.now() - analysis.timestamp;
    return age < 24 * 60 * 60 * 1000;
}

/**
 * Calculate portfolio metrics
 */
function calculatePortfolioMetrics(
    analyses: Array<{ stock: Stock; analysis: StockAnalysis }>
): PortfolioMetrics {
    const totalValue = analyses.reduce((sum, { stock }) => {
        const price = stock.currentPrice || stock.avgPrice;
        return sum + (stock.shares * price);
    }, 0);

    // Calculate weights
    const positions = analyses.map(({ stock, analysis }) => {
        const price = stock.currentPrice || stock.avgPrice;
        const value = stock.shares * price;
        const weight = (value / totalValue) * 100;

        return {
            symbol: stock.symbol,
            value,
            weight: weight.toFixed(1),
            recommendation: analysis.recommendation,
            confidence: analysis.confidence
        };
    });

    // Sector allocation (simplified - you can enhance this)
    const sectors = groupBySector(analyses);

    // Risk metrics
    const avgConfidence = analyses.reduce((sum, { analysis }) =>
        sum + analysis.confidence, 0) / analyses.length;

    const buySignals = analyses.filter(({ analysis }) =>
        analysis.recommendation === 'BUY').length;

    const sellSignals = analyses.filter(({ analysis }) =>
        analysis.recommendation === 'SELL').length;

    return {
        totalValue,
        positions,
        sectors,
        avgConfidence,
        signals: {
            buy: buySignals,
            hold: analyses.length - buySignals - sellSignals,
            sell: sellSignals
        },
        concentration: Math.max(...positions.map(p => parseFloat(p.weight)))
    };
}

/**
 * Group stocks by sector (simplified)
 */
function groupBySector(
    analyses: Array<{ stock: Stock; analysis: StockAnalysis }>
): Record<string, number> {
    // This is a simplified version
    // You can enhance this with actual sector data
    return {
        'Technology': 30,
        'Finance': 25,
        'Healthcare': 20,
        'Consumer': 15,
        'Other': 10
    };
}

/**
 * Build portfolio analysis prompt for Gemini
 */
function buildPortfolioPrompt(
    analyses: Array<{ stock: Stock; analysis: StockAnalysis }>,
    metrics: PortfolioMetrics
): string {
    return `
PORTFOLIO ANALYSIS REQUEST

Portfolio Size: ${analyses.length} positions
Total Value: €${metrics.totalValue.toFixed(2)}

INDIVIDUAL POSITIONS WITH ANALYSES:
${analyses.map(({ stock, analysis }) => {
        const position = metrics.positions.find(p => p.symbol === stock.symbol);
        const price = stock.currentPrice || stock.avgPrice;
        const value = stock.shares * price;

        return `
${stock.symbol} (${position?.weight}% of portfolio)
├─ Current: €${price.toFixed(2)}
├─ Position: ${stock.shares} shares = €${value.toFixed(2)}
├─ AI Recommendation: ${analysis.recommendation} (${analysis.confidence}% confidence)
├─ Target Price: €${analysis.targetPrice}
├─ Reasoning: ${analysis.reasoning}
└─ Key Risks: ${analysis.risks.join(', ')}
`;
    }).join('\n')}

PORTFOLIO METRICS:
- Sector Allocation: ${JSON.stringify(metrics.sectors)}
- Average Confidence: ${metrics.avgConfidence.toFixed(1)}%
- Signals: ${metrics.signals.buy} BUY, ${metrics.signals.hold} HOLD, ${metrics.signals.sell} SELL
- Concentration Risk: Largest position is ${metrics.concentration}%

TASK:
Provide portfolio-level analysis considering ALL individual stock analyses above.

Return JSON with:
{
  "healthScore": 0-100 (overall portfolio health),
  "diversificationScore": 0-100,
  "riskLevel": "LOW|MODERATE|HIGH",
  "topRecommendations": [
    "Action 1 with specific stocks and amounts",
    "Action 2",
    "Action 3"
  ],
  "rebalancing": [
    {
      "action": "REDUCE|INCREASE|ADD|REMOVE",
      "symbol": "AAPL",
      "currentWeight": 25,
      "targetWeight": 20,
      "reasoning": "Why this rebalancing"
    }
  ],
  "hedgingOpportunities": "How to hedge current portfolio risks",
  "nextSteps": "Specific actions with timeline"
}

Focus on ACTIONABLE recommendations with specific stocks and amounts.
`;
}

/**
 * Call Gemini for portfolio-level insights
 */
async function callGeminiForPortfolio(prompt: string): Promise<PortfolioInsights> {
    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                type: 'portfolio_analysis'
            })
        });

        if (!response.ok) {
            throw new Error(`AI API returned ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to get portfolio insights:', error);
        throw error;
    }
}
