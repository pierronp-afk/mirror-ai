import { useState, useEffect } from 'react';
import { MarketPrices } from '@/types';

/**
 * Hook pour récupérer les données de marché en temps réel (ou presque).
 * Utilise notre route API /api/market pour éviter d'exposer la clé Finnhub.
 */
export function useMarketData(symbols: string[], refreshInterval = 60000) {
    const [prices, setPrices] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchPrices = async () => {
            // On ne recharge pas si aucun symbole
            if (!symbols.length) return;

            // --- THROTTLING HORAIRE (07:30 - 23:00) ---
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTimeInMinutes = currentHour * 60 + currentMinute;

            const startLimit = 7 * 60 + 30; // 07:30
            const endLimit = 23 * 60;      // 23:00

            if (currentTimeInMinutes < startLimit || currentTimeInMinutes > endLimit) {
                console.log("⏸️ Marché fermé ou hors plage Mirror AI. Prochain check plus tard.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const newPrices: MarketPrices = {};

                // On parallelise les requêtes pour chaque symbole
                await Promise.all(symbols.map(async (symbol) => {
                    try {
                        const res = await fetch(`/api/market?symbol=${symbol}`);

                        if (res.status === 429) {
                            console.warn(`⏳ Rate limit pour ${symbol}, utilisation des données précédentes ou par défaut.`);
                            // On ne lève pas d'erreur, on ignore juste cette mise à jour pour ce symbole
                            return;
                        }

                        if (!res.ok) throw new Error(`Erreur pour ${symbol}`);

                        const data = await res.json() as { c?: number; d?: number; dp?: number; limited?: boolean };

                        if (data.limited) {
                            console.warn(`⏳ Donnée limitée pour ${symbol}`);
                        }

                        // Finnhub : 'c' est le prix actuel, 'd' la variation, 'dp' le %
                        if (data.c !== undefined && data.c > 0) {
                            newPrices[symbol] = {
                                price: data.c,
                                change: data.d || 0,
                                changePercent: data.dp || 0
                            };
                        }
                    } catch (err) {
                        console.error(`Erreur fetch ${symbol}:`, err);
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
