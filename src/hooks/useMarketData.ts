import { useState, useEffect } from 'react';
import { MarketPrices } from '@/types';

/**
 * Hook pour récupérer les données de marché en temps réel (ou presque).
 * Utilise notre route API /api/market pour éviter d'exposer la clé Finnhub.
 */
export function useMarketData(symbols: string[], refreshInterval = 60000) {
    const [prices, setPrices] = useState<MarketPrices>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchPrices = async () => {
            // On ne recharge pas si aucun symbole
            if (!symbols.length) return;

            try {
                setLoading(true);
                const newPrices: MarketPrices = {};

                // On parallelise les requêtes pour chaque symbole
                await Promise.all(symbols.map(async (symbol) => {
                    try {
                        const res = await fetch(`/api/market?symbol=${symbol}`);
                        if (!res.ok) throw new Error(`Erreur pour ${symbol}`);

                        const data = await res.json() as { c?: number };
                        // Finnhub : 'c' est le prix actuel (Current price)
                        if (data.c) {
                            newPrices[symbol] = data.c;
                        }
                    } catch (err) {
                        console.error(`Erreur fetch ${symbol}:`, err);
                        // On peut décider de garder l'ancien prix ou mettre 0
                    }
                }));

                if (isMounted) {
                    setPrices(prev => ({ ...prev, ...newPrices }));
                    setLoading(false);
                    setError(null);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const message = err instanceof Error ? err.message : "Erreur récupération prix";
                    setError(message);
                    setLoading(false);
                }
            }
        };

        // Chargement initial
        fetchPrices();

        // Rafraîchissement périodique
        const intervalId = setInterval(fetchPrices, refreshInterval);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [symbols, refreshInterval]); // symbols est mémoïsé dans Dashboard

    return { prices, loading, error };
}
