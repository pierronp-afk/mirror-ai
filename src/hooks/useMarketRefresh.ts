import { useEffect, useState, useCallback, useRef } from 'react';
import { MarketPrices } from '@/types';

const BATCH_SIZE = 15;
const STAGGER_INTERVAL = 60 * 1000; // 1 minute

interface UseMarketRefreshOptions {
    symbols: string[];
    enabled?: boolean;
    onRefresh?: (prices: MarketPrices) => void;
}

export function useMarketRefresh({ symbols, enabled = true, onRefresh }: UseMarketRefreshOptions) {
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastSymbolsRef = useRef<string>('');
    const batchIndexRef = useRef<number>(0);

    const fetchMarketDataBatch = useCallback(async (manualSymbols?: string[]) => {
        const targetSymbols = manualSymbols || symbols;
        if (targetSymbols.length === 0 || !enabled) return;

        setIsRefreshing(true);

        try {
            // Determine the batch to fetch
            let batch: string[] = [];
            if (manualSymbols) {
                batch = manualSymbols;
            } else {
                const start = (batchIndexRef.current * BATCH_SIZE) % targetSymbols.length;
                batch = targetSymbols.slice(start, start + BATCH_SIZE);
                // If the batch wrapped around, we might need more but let's keep it simple:
                // If we reach the end, the next call will start from 0 because of the modulo.
                batchIndexRef.current = (batchIndexRef.current + 1) % Math.ceil(targetSymbols.length / BATCH_SIZE);
            }

            console.log(`📡 Refreshing market batch: ${batch.join(', ')}`);

            const pricesRes = await Promise.all(
                batch.map(async (symbol) => {
                    try {
                        const res = await fetch(`/api/market?symbol=${symbol}`);
                        if (!res.ok) return { symbol, price: 0, change: 0, changePercent: 0 };
                        const data = await res.json();
                        return {
                            symbol,
                            price: data.c || 0,
                            change: data.d || 0,
                            changePercent: data.dp || 0,
                        };
                    } catch {
                        return { symbol, price: 0, change: 0, changePercent: 0 };
                    }
                })
            );

            const newPrices: MarketPrices = {};
            pricesRes.forEach((p) => {
                newPrices[p.symbol] = {
                    price: p.price,
                    change: p.change,
                    changePercent: p.changePercent,
                };
            });

            setLastUpdate(Date.now());

            if (onRefresh) {
                onRefresh(newPrices);
            }
        } catch (error) {
            console.error('Error refreshing market data:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [symbols, enabled, onRefresh]);

    // Setup auto-refresh (staggered)
    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const currentSymbolsStr = symbols.sort().join(',');
        if (currentSymbolsStr !== lastSymbolsRef.current) {
            lastSymbolsRef.current = currentSymbolsStr;
            batchIndexRef.current = 0; // Reset batch on list change

            // Initial batch fetch
            fetchMarketDataBatch();
        }

        if (!intervalRef.current) {
            intervalRef.current = setInterval(() => {
                fetchMarketDataBatch();
            }, STAGGER_INTERVAL);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [symbols, enabled, fetchMarketDataBatch]);

    const manualRefresh = useCallback(() => {
        // For manual refresh, we might still want to refresh EVERYTHING, 
        // but let's respect the user's wish for batching if their portfolio is huge.
        // Actually, "Refresh All" usually means "fetch all now".
        // To avoid 429, we could fetch all but with a delay between sub-batches.
        // For now, let's just trigger the next batch immediately.
        fetchMarketDataBatch();
    }, [fetchMarketDataBatch]);

    return {
        lastUpdate,
        isRefreshing,
        manualRefresh,
        timeUntilNextRefresh: STAGGER_INTERVAL - (Date.now() - lastUpdate),
    };
}
