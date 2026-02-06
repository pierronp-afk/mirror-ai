import { useEffect, useState, useCallback, useRef } from 'react';
import { MarketPrices } from '@/types';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

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

    const fetchMarketData = useCallback(async () => {
        if (symbols.length === 0 || !enabled) return;

        setIsRefreshing(true);

        try {
            const pricesRes = await Promise.all(
                symbols.map(async (symbol) => {
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

    // Setup auto-refresh
    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Éviter de redémarrer l'intervalle si les symboles n'ont pas changé
        const currentSymbols = symbols.sort().join(',');
        if (currentSymbols === lastSymbolsRef.current && intervalRef.current) {
            return;
        }

        lastSymbolsRef.current = currentSymbols;

        // Clear existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Fetch immediately on mount or symbol change
        fetchMarketData();

        // Setup interval
        intervalRef.current = setInterval(fetchMarketData, REFRESH_INTERVAL);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [symbols, enabled, fetchMarketData]);

    const manualRefresh = useCallback(() => {
        fetchMarketData();
    }, [fetchMarketData]);

    return {
        lastUpdate,
        isRefreshing,
        manualRefresh,
        timeUntilNextRefresh: REFRESH_INTERVAL - (Date.now() - lastUpdate),
    };
}
