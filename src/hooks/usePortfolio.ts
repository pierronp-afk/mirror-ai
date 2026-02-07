import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Stock } from '@/types';
import { useAuth } from './useAuth';

export function usePortfolio() {
    const { user } = useAuth();
    const [stocks, setStocksState] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setStocksState([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        // On écoute les changements en temps réel sur le document du portfolio de l'utilisateur
        const portfolioRef = doc(db, 'users', user.uid);

        const unsubscribe = onSnapshot(portfolioRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStocksState(data.stocks || []);
            } else {
                // Initialiser si le document n'existe pas
                setDoc(portfolioRef, { stocks: [] });
                setStocksState([]);
            }
            setLoading(false);
        }, (err) => {
            console.error("Firestore error:", err);
            setError("Impossible de charger votre portefeuille.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const syncStocks = async (newStocks: Stock[]) => {
        if (!user) return;
        try {
            const portfolioRef = doc(db, 'users', user.uid);
            await setDoc(portfolioRef, { stocks: newStocks }, { merge: true });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erreur lors de la sauvegarde.";
            console.error("Error syncing stocks:", err);
            setError(message);
        }
    };

    const addStock = async (stock: Stock) => {
        if (!user) return;
        setStocksState(prev => {
            const existingIdx = prev.findIndex(s => s.symbol === stock.symbol);
            let updated;
            if (existingIdx > -1) {
                updated = [...prev];
                updated[existingIdx] = stock;
            } else {
                updated = [...prev, stock];
            }
            syncStocks(updated);
            return updated;
        });
    };

    const removeStock = async (symbol: string) => {
        if (!user) return;
        setStocksState(prev => {
            const updated = prev.filter(s => s.symbol !== symbol);
            syncStocks(updated);
            return updated;
        });
    };

    const updateStock = async (symbol: string, shares: number, avgPrice: number, name?: string) => {
        if (!user) return;
        setStocksState(prev => {
            const updated = prev.map(s => s.symbol === symbol ? { ...s, shares, avgPrice, name: name || s.name } : s);
            syncStocks(updated);
            return updated;
        });
    };

    const updateStockQuantity = async (symbol: string, shares: number) => {
        if (!user) return;
        setStocksState(prev => {
            const updated = prev.map(s => s.symbol === symbol ? { ...s, shares } : s);
            syncStocks(updated);
            return updated;
        });
    };

    return { stocks, loading, error, addStock, removeStock, updateStock, updateStockQuantity, setStocks: syncStocks };
}
