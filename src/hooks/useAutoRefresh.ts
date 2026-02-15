import { useEffect } from 'react';

interface Stock {
    symbol: string;
    lastAnalysisTimestamp?: number;
}

/**
 * Auto-refresh hook to detect fresh analyses from cache warming
 * Checks for updates every 5 minutes during market hours
 */
export function useAutoRefresh(
    stocks: Stock[],
    onUpdate: (symbol: string, freshAnalysis: any) => void
) {
    useEffect(() => {
        async function checkForUpdates() {
            console.log('🔄 Checking for fresh analyses...');

            for (const stock of stocks) {
                try {
                    // Check if there's a newer cached analysis
                    const response = await fetch(`/api/cache-check?symbol=${stock.symbol}`);
                    if (!response.ok) continue;

                    const { cached, timestamp, analysis } = await response.json();

                    if (cached && timestamp) {
                        const cacheAge = Date.now() - timestamp;
                        const isFromToday = cacheAge < 24 * 60 * 60 * 1000;

                        // If analysis is from today's cache warming and newer than displayed
                        if (isFromToday && (!stock.lastAnalysisTimestamp || timestamp > stock.lastAnalysisTimestamp)) {
                            console.log(`✅ Updating ${stock.symbol} with fresh analysis`);
                            onUpdate(stock.symbol, analysis);
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to check cache for ${stock.symbol}:`, error);
                }
            }
        }

        // Check on mount
        checkForUpdates();

        // Check every 5 minutes during market hours
        const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [stocks, onUpdate]);
}
