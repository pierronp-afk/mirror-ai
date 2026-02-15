import { analyzePortfolio } from '@/lib/ai/portfolioAnalyzer';
import { useState } from 'react';

interface Stock {
    symbol: string;
    name: string;
    shares: number;
    avgPrice: number;
    currentPrice?: number;
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
 * Hook for portfolio analysis functionality
 * Analyzes entire portfolio and provides rebalancing recommendations
 */
export function usePortfolioAnalysis() {
    const [portfolioAnalysis, setPortfolioAnalysis] = useState<any>(null);
    const [isAnalyzingPortfolio, setIsAnalyzingPortfolio] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyzePortfolioNow = async (stocks: Stock[]) => {
        setIsAnalyzingPortfolio(true);
        setError(null);

        try {
            const result = await analyzePortfolio(stocks);
            setPortfolioAnalysis(result);
            return result;
        } catch (err: any) {
            console.error('Portfolio analysis error:', err);

            // Handle rate limiting
            if (err.status === 429 || err.message?.includes('rate limit')) {
                const resetInSeconds = err.resetInSeconds || 60;
                setError(`Rate limit exceeded. Please wait ${resetInSeconds} seconds.`);

                // Show countdown notification
                showRateLimitNotification(resetInSeconds);
            } else {
                setError('Failed to analyze portfolio. Please try again.');
            }

            throw err;
        } finally {
            setIsAnalyzingPortfolio(false);
        }
    };

    return {
        analyzePortfolio: analyzePortfolioNow,
        portfolioAnalysis,
        isAnalyzingPortfolio,
        error
    };
}

/**
 * Show rate limit notification with countdown
 */
function showRateLimitNotification(seconds: number) {
    // This would integrate with your notification system
    console.log(`⏳ Rate limit: Please wait ${seconds} seconds`);

    // You can implement a toast notification here
    // Example: toast.error(`Rate limit exceeded. Please wait ${seconds} seconds.`)
}
