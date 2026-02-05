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
    onAdd: (symbol: string, shares: number, avgPrice: number) => void;
}

export default function AddStockModal({ onClose, onAdd }: AddStockModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
    const [shares, setShares] = useState('');
    const [avgPrice, setAvgPrice] = useState('');
    const [error, setError] = useState('');

    // Debounced search
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(async () => {
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
        }, 300); // Debounce de 300ms

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectStock = (stock: StockSearchResult) => {
        setSelectedStock(stock);
        setSearchQuery(stock.displaySymbol);
        setSearchResults([]);
    };

    const handleSubmit = () => {
        setError('');

        if (!selectedStock) {
            setError('Veuillez sélectionner une action');
            return;
        }

        const sharesNum = parseFloat(shares);
        const priceNum = parseFloat(avgPrice);

        if (!sharesNum || sharesNum <= 0) {
            setError('Nombre d\'actions invalide');
            return;
        }

        if (!priceNum || priceNum <= 0) {
            setError('Prix moyen invalide');
            return;
        }

        onAdd(selectedStock.symbol, sharesNum, priceNum);
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
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                            Nombre d'actions
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

                    {/* Average Price Input */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                            Prix moyen d'achat (€)
                        </label>
                        <input
                            type="number"
                            value={avgPrice}
                            onChange={(e) => setAvgPrice(e.target.value)}
                            placeholder="Ex: 175.50"
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none font-bold text-slate-900 transition-all"
                        />
                    </div>

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
