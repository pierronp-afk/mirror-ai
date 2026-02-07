"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, TrendingUp } from 'lucide-react';

interface StockSearchResult {
    symbol: string;
    description: string;
    displaySymbol: string;
}

interface AddStockModalProps {
    onClose: () => void;
    onAdd: (symbol: string, shares: number, avgPrice: number, name?: string) => void;
    exchangeRate?: number;
}

export default function AddStockModal({ onClose, onAdd, exchangeRate = 1.08 }: AddStockModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
    const [shares, setShares] = useState('');
    const [buyPrice, setBuyPrice] = useState('');
    const [error, setError] = useState('');
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);

    // Debounced search
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(async () => {
            // ... existing code ...
            try {
                const response = await fetch(`/api/stock-search?q=${encodeURIComponent(searchQuery)}`);
                if (!response.ok) throw new Error('Search failed');

                const data = await response.json();
                setSearchResults(data.results || []);
            } catch (err) {
                console.error('Search error:', err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectStock = async (stock: StockSearchResult) => {
        // ... existing code ...
        setSelectedStock(stock);
        setSearchQuery(stock.displaySymbol);
        setSearchResults([]);
        setError('');

        // Fetch current price automatically
        setIsFetchingPrice(true);
        try {
            const res = await fetch(`/api/market?symbol=${stock.symbol}`);
            if (res.ok) {
                const data = await res.json();
                if (data.c) {
                    setFetchedPrice(data.c);
                    // Do NOT auto-fill buyPrice, assume user wants to enter it or leave empty for sync
                }
            }
        } catch (err) {
            console.error('Error fetching initial price:', err);
        } finally {
            setIsFetchingPrice(false);
        }
    };

    const handleSubmit = () => {
        setError('');

        if (!selectedStock) {
            setError('Veuillez sélectionner une action');
            return;
        }

        const sharesNum = parseFloat(shares);
        // Use manual buy price if provided, otherwise 0 implies "Sync/Unknown"
        // But if user left empty, we might want to use fetchedPrice as fallback? 
        // User asked: "enter without associated price and it syncs when market opens"
        // This implies Price = 0.
        // If user wants to accept Current Price, they can click "Utiliser comme PRU".
        // So if empty, we send 0.
        let priceNum = 0;
        if (buyPrice !== '') {
            priceNum = parseFloat(buyPrice);
        }

        if (!sharesNum || sharesNum <= 0) {
            setError('Nombre d\'actions invalide');
            return;
        }

        // Removed the check for priceNum <= 0 to allow sync mode

        onAdd(selectedStock.symbol, sharesNum, priceNum, selectedStock.description);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-slate-900/60">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
                            <TrendingUp className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Ajouter un actif</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Recherche intelligente</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-white rounded-full text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    {/* Search Input */}
                    <div className="relative">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                            Rechercher une action
                        </label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ex: Tesla, AAPL, Microsoft..."
                                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none font-bold text-slate-900 transition-all"
                                autoFocus
                            />
                            {isSearching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto z-10">
                                {searchResults.map((result) => (
                                    <button
                                        key={result.symbol}
                                        onClick={() => handleSelectStock(result)}
                                        className="w-full px-6 py-4 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0 flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="font-black text-slate-900">{result.displaySymbol}</p>
                                            <p className="text-sm text-slate-500">{result.description}</p>
                                        </div>
                                        <TrendingUp className="text-blue-600 w-5 h-5" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Stock Info */}
                    {selectedStock && (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Action sélectionnée</p>
                            <p className="font-black text-xl text-slate-900">{selectedStock.displaySymbol}</p>
                            <p className="text-sm text-slate-600">{selectedStock.description}</p>
                        </div>
                    )}

                    {/* Shares Input */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                Nombre d&apos;actions
                            </label>
                            <input
                                type="number"
                                value={shares}
                                onChange={(e) => setShares(e.target.value)}
                                placeholder="Ex: 10"
                                min="0"
                                step="0.01"
                                className="w-full px-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none font-bold text-slate-900 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                Prix d&apos;achat (PRU)
                            </label>
                            <input
                                type="number"
                                value={buyPrice}
                                onChange={(e) => setBuyPrice(e.target.value)}
                                placeholder="Optionnel (0 = Sync)"
                                min="0"
                                step="0.01"
                                className="w-full px-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* Price Info (Automatic Context) */}
                    {selectedStock && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                    Cours en direct
                                </label>
                                {isFetchingPrice ? (
                                    <div className="h-6 w-24 bg-slate-200 animate-pulse rounded"></div>
                                ) : (
                                    <div className="flex items-baseline gap-2">
                                        <p className="font-black text-xl text-slate-900">
                                            {fetchedPrice ?
                                                `${(exchangeRate && (!selectedStock?.symbol.includes('.')) ? fetchedPrice / exchangeRate : fetchedPrice).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`
                                                : '---'}
                                        </p>
                                        <button
                                            onClick={() => {
                                                const finalPrice = (fetchedPrice && exchangeRate && !selectedStock?.symbol.includes('.')) ? fetchedPrice / exchangeRate : fetchedPrice;
                                                setBuyPrice(finalPrice?.toFixed(2) || '');
                                            }}
                                            className="text-[10px] font-bold text-blue-500 uppercase hover:underline"
                                        >
                                            Utiliser comme PRU
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 text-emerald-500 justify-end">
                                    <TrendingUp size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">LIVE</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-6 py-3 rounded-2xl text-sm font-bold">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
                    >
                        Ajouter
                    </button>
                </div>
            </div>
        </div>
    );
}
