import React, { useState, useEffect } from 'react';
import { Stock, AISignal } from '@/types';
import { TrendingUp, TrendingDown, Info, ShieldCheck, AlertTriangle, Trash2, RefreshCw, Edit2, Check, X, Sparkles } from 'lucide-react';
import { getStockSector, calculateSectorWeights, generateActionableAdvice } from '@/lib/portfolioMetrics';

interface StockCardProps {
    stock: Stock;
    marketData?: { price: number; change: number; changePercent: number };
    aiSignal?: AISignal;
    exchangeRate?: number; // Rate to convert Native -> Display
    displayCurrency?: string; // e.g. 'EUR', 'USD'
    portfolioTotalValue?: number; // Total portfolio value for weight calculation
    allStocks?: Stock[]; // All portfolio stocks for sector comparison
    allMarketPrices?: Record<string, { price: number; change: number; changePercent: number }>; // All market prices
    onRemove: (symbol: string) => void;
    onRefresh?: (symbol: string) => void;
    onUpdateStock?: (symbol: string, shares: number, avgPrice: number) => void;
}

export default function StockCard({ stock, marketData, aiSignal, exchangeRate = 1, displayCurrency = 'EUR', portfolioTotalValue = 0, allStocks = [], allMarketPrices = {}, onRemove, onRefresh, onUpdateStock }: StockCardProps) {
    const [flipped, setFlipped] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editQuantity, setEditQuantity] = useState(stock.shares.toString());
    const [editAvgPrice, setEditAvgPrice] = useState(stock.avgPrice.toString());

    // Update local state when props change
    useEffect(() => {
        setEditQuantity(stock.shares.toString());
        setEditAvgPrice(stock.avgPrice.toString());
    }, [stock.shares, stock.avgPrice]);

    // Currency Detection Logic
    const getCurrencyInfo = (symbol: string) => {
        if (symbol.endsWith('.PA') || symbol.endsWith('.DE') || symbol.endsWith('.AS') || symbol.endsWith('.MI')) return { code: 'EUR', symbol: '€' };
        if (symbol.endsWith('.L')) return { code: 'GBP', symbol: '£' };
        if (symbol.endsWith('.T')) return { code: 'JPY', symbol: '¥' };
        if (symbol.endsWith('.HK')) return { code: 'HKD', symbol: 'HK$' };
        if (symbol.endsWith('.SW')) return { code: 'CHF', symbol: 'CHF' };
        if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return { code: 'INR', symbol: '₹' };
        if (symbol.endsWith('.KS')) return { code: 'KRW', symbol: '₩' };
        // Default to USD for US stocks (no suffix usually)
        return { code: 'USD', symbol: '$' };
    };

    const currencyInfo = getCurrencyInfo(stock.symbol);

    // Current Price Logic (Converted)
    // API returns price in Native. We convert to Display.
    const rawNativePrice = marketData?.price || 0;
    const rawPrice = rawNativePrice * exchangeRate; // Converted Price

    // Values (Converted)
    const convertedAvgPrice = stock.avgPrice * exchangeRate;
    const totalValue = stock.shares * rawPrice;
    // totalCost should be in Display Currency for gain calculation
    const totalCost = stock.shares * convertedAvgPrice;

    const hasValidPrice = rawPrice > 0;
    const gain = hasValidPrice ? (totalValue - totalCost) : 0;
    const gainPercent = (hasValidPrice && totalCost > 0) ? (gain / totalCost) * 100 : 0;
    const isPos = gain >= 0;

    const dailyChangePercent = marketData?.changePercent || 0;
    const isDailyPos = dailyChangePercent >= 0;

    const rawDailyChange = (marketData?.change || 0) * exchangeRate;
    const dailyGain = rawDailyChange * stock.shares;
    const isDailyGainPos = dailyGain >= 0;

    // Logo mapping
    const symbolToDomain: Record<string, string> = {
        'AAPL': 'apple.com', 'GOOG': 'google.com', 'MSFT': 'microsoft.com', 'AMZN': 'amazon.com',
        'META': 'fb.com', 'NVDA': 'nvidia.com', 'TSLA': 'tesla.com', 'MC.PA': 'lvmh.com',
        'OR.PA': 'loreal.com', 'SHEL.L': 'shell.com', 'SAP.DE': 'sap.com', 'ASML.AS': 'asml.com',
        'NESN.SW': 'nestle.com', '7203.T': 'global.toyota', '0700.HK': 'tencent.com'
    };

    const domain = symbolToDomain[stock.symbol.toUpperCase()] || (stock.symbol.includes('.') ? `${stock.symbol.split('.')[0].toLowerCase()}.com` : `${stock.symbol.toLowerCase()}.com`);
    const logoUrl = `https://logo.clearbit.com/${domain}`;
    const fallbackLogoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    // Advice Color
    const getAdviceColor = () => {
        const advice = aiSignal?.advice || (isPos ? "Renforcer" : "Alléger");
        if (advice === "Vendre" || advice === "Alléger") return "rose";
        if (advice === "Renforcer" || advice === "Acheter") return "emerald";
        return "blue";
    };

    const adviceColor = getAdviceColor();
    const adviceText = aiSignal?.advice || (isPos ? "Renforcer" : "Alléger");

    // Portfolio weight calculation
    const stockValue = totalValue;
    const portfolioWeight = portfolioTotalValue > 0 ? (stockValue / portfolioTotalValue) * 100 : 0;
    const isOverweight = portfolioWeight > 20;
    const isHighRisk = portfolioWeight > 30;

    const getWeightColor = () => {
        if (isHighRisk) return 'bg-red-100 text-red-700 border-red-200';
        if (isOverweight) return 'bg-orange-100 text-orange-700 border-orange-200';
        if (portfolioWeight > 10) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-blue-100 text-blue-700 border-blue-200';
    };

    const handleRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onRefresh && !isRefreshing) {
            setIsRefreshing(true);
            await onRefresh(stock.symbol);
            setTimeout(() => setIsRefreshing(false), 1000);
        }
    };

    const handleSaveEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        const qtyStr = editQuantity.replace(',', '.');
        const priceStr = editAvgPrice.replace(',', '.');
        const qty = parseFloat(qtyStr);
        const price = parseFloat(priceStr);

        if (!isNaN(qty) && qty > 0 && !isNaN(price) && price >= 0 && onUpdateStock) {
            onUpdateStock(stock.symbol, qty, price);
        }
        setIsEditing(false);
    };

    // AI Signals (Target/Stop are usually in Native, need conversion)
    // Assuming AI returns targets in Native Currency
    const targetPrice = (aiSignal?.targetPrice || (rawNativePrice * 1.15)) * exchangeRate;
    const stopLoss = (aiSignal?.stopLoss || (rawNativePrice * 0.9)) * exchangeRate;

    let progress = 0;
    progress = Math.min(100, Math.max(5, (rawPrice / targetPrice) * 100));

    // Formatter helpers
    const formatCurrency = (val: number) => {
        return val.toLocaleString('fr-FR', { style: 'currency', currency: displayCurrency });
    };

    return (
        <div className="relative h-[420px] w-full cursor-pointer perspective-1000 group">
            <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${flipped ? 'rotate-y-180' : ''}`} onClick={() => !isEditing && setFlipped(!flipped)}>

                {/* FRONT FACE */}
                <div className="absolute inset-0 backface-hidden bg-white rounded-[3rem] p-6 flex flex-col justify-between border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-blue-200 transition-all">

                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center relative overflow-hidden">
                                <img
                                    src={logoUrl}
                                    alt={stock.symbol}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        if (img.src === logoUrl) img.src = fallbackLogoUrl;
                                        else img.src = `https://ui-avatars.com/api/?name=${stock.symbol}&background=random&color=fff&bold=true`;
                                    }}
                                />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-slate-900 tracking-tighter uppercase italic line-clamp-2 leading-none max-w-[150px]">{stock.name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stock.symbol}</p>
                            </div>
                        </div>



                        {/* Remove Button */}
                        {onRemove && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(stock.symbol); }}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>

                    {/* Refresh Button (visible on hover) */}
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={`absolute top-6 right-14 p-2 text-slate-300 hover:text-blue-500 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={16} />
                    </button>

                    {/* MAIN METRIC: PRICE */}
                    <div className="mt-4">
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900 tracking-tighter">
                                {rawPrice > 0 ? formatCurrency(rawPrice) : '---'}
                            </span>
                            <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-lg ${isDailyPos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {isDailyPos ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                {rawPrice > 0 ? ((marketData?.changePercent || 0)).toFixed(2) : '0'}%
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest pl-1">Cours Actuel ({displayCurrency})</p>
                    </div>

                    {/* ACTION CAPSULE */}
                    <div className="mt-4 w-full bg-slate-50 border border-slate-200 rounded-full p-2 flex items-center shadow-inner relative overflow-hidden">
                        {/* Zone 1: Advice */}
                        <div className={`relative px-4 py-2 rounded-full shadow-lg z-10 flex items-center justify-center min-w-[100px] ${adviceColor === 'rose' ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white' : adviceColor === 'emerald' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white' : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'}`}>
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">{adviceText}</span>
                        </div>

                        {/* Zone 2: Target */}
                        <div className="flex-1 px-3 flex flex-col items-center justify-center relative z-0">
                            <div className="w-full flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                <span>Cible</span>
                                <span>{formatCurrency(targetPrice)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${progress}%` }}
                                    className={`h-full rounded-full transition-all duration-1000 ${adviceColor === 'rose' ? 'bg-rose-400' : adviceColor === 'emerald' ? 'bg-emerald-400' : 'bg-blue-400'}`}
                                />
                            </div>
                        </div>

                        {/* Zone 3: Stop */}
                        <div className="pl-2 border-l border-slate-200 flex flex-col items-end justify-center min-w-[40px]">
                            <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider leading-none mb-0.5">Stop</span>
                            <span className="text-[11px] font-bold text-slate-600 leading-none">
                                {formatCurrency(stopLoss)}
                            </span>
                        </div>
                    </div>

                    {/* Concentration Risk Warning */}
                    {(isOverweight || isHighRisk) && (
                        <div className={`mt-3 rounded-xl p-3 border ${isHighRisk ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={14} className={isHighRisk ? 'text-red-600 mt-0.5' : 'text-orange-600 mt-0.5'} />
                                <div>
                                    <p className={`text-xs font-bold ${isHighRisk ? 'text-red-900' : 'text-orange-900'} mb-1`}>
                                        {isHighRisk ? 'RISQUE ÉLEVÉ' : 'Concentration Notable'}
                                    </p>
                                    <p className={`text-[10px] ${isHighRisk ? 'text-red-700' : 'text-orange-700'} leading-tight`}>
                                        {isHighRisk
                                            ? `Cette position représente ${portfolioWeight.toFixed(1)}% de votre portefeuille. Une concentration >30% expose votre capital à un risque important. Envisagez de diversifier.`
                                            : `Cette position représente ${portfolioWeight.toFixed(1)}% de votre portefeuille. Restez vigilant et surveillez cette position de près.`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bottom Section */}
                    <div className="mt-auto space-y-2 pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1 w-full">
                                <div className="flex justify-between items-center w-full mb-1">
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Gain/Perte</span>
                                    <span className={`text-xs font-black ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {isPos ? '+' : ''}{formatCurrency(gain)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center w-full">
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Valeur</span>
                                    <span className="text-xl font-black text-slate-900">
                                        {rawPrice > 0 ? formatCurrency(totalValue) : <span className="text-slate-400">---</span>}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center w-full" onClick={e => { e.stopPropagation(); setIsEditing(true); }}>
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Titres</span>
                                    {isEditing ? (
                                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="number"
                                                value={editQuantity}
                                                onChange={e => setEditQuantity(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(e as any); if (e.key === 'Escape') setIsEditing(false); }}
                                                className="w-16 border border-slate-300 rounded px-1 py-0.5 text-xs font-bold text-right"
                                                autoFocus
                                            />
                                            <button onClick={handleSaveEdit} className="p-0.5 bg-emerald-500 text-white rounded"><Check size={10} /></button>
                                        </div>
                                    ) : (
                                        <span className="text-emerald-600 font-bold text-sm cursor-pointer hover:bg-emerald-50 px-1 rounded transition-colors flex items-center gap-1 group/edit">
                                            {stock.shares} <Edit2 size={8} className="text-slate-300 opacity-0 group-hover/edit:opacity-100" />
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center w-full" onClick={e => { e.stopPropagation(); setIsEditing(true); }}>
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">PRU (Natif)</span>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={editAvgPrice}
                                            onChange={e => setEditAvgPrice(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(e as any); if (e.key === 'Escape') setIsEditing(false); }}
                                            className="w-16 border border-slate-300 rounded px-1 py-0.5 text-xs font-bold text-right"
                                        />
                                    ) : (
                                        <span className="text-slate-900 font-bold text-sm cursor-pointer hover:bg-slate-50 px-1 rounded transition-colors flex items-center gap-1 group/edit">
                                            {/* We show NATIVE price for PRU to avoid confusion, or maybe converted? 
                                                If we show converted, we should label it (est.). 
                                                Let's show CONVERTED for consistency with "Valeur". 
                                            */}
                                            {formatCurrency(convertedAvgPrice)} <Edit2 size={8} className="text-slate-300 opacity-0 group-hover/edit:opacity-100" />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BACK FACE (Same as before but simplified/adapted where needed or kept same structure) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900 rounded-[3rem] p-8 md:p-10 flex flex-col justify-between border-2 border-blue-500 shadow-2xl shadow-blue-500/20 text-white overflow-hidden">
                    {/* Simplified Back Face Content to save lines if needed, essentially same structure */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                    <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20">
                                    <ShieldCheck size={20} className="text-white" />
                                </div>
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] italic leading-none">Analyse Cockpit</h4>
                            </div>
                        </div>
                        {/* KPIs - REAL CALCULATIONS */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Poids Actuel</span>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-white">{portfolioWeight.toFixed(1)}%</span>
                                    {isOverweight && (
                                        <span className="text-[9px] text-orange-400 mt-1">⚠️ Concentration</span>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Vs Secteur</span>
                                {(() => {
                                    const sectorWeights = calculateSectorWeights(allStocks, allMarketPrices, exchangeRate);
                                    const stockSector = getStockSector(stock.symbol);
                                    const sectorAvg = sectorWeights[stockSector]?.avg || 0;
                                    const vsSector = portfolioWeight - sectorAvg;
                                    return (
                                        <>
                                            <span className={`text-2xl font-black ${vsSector > 0 ? 'text-emerald-400' : vsSector < 0 ? 'text-rose-400' : 'text-white'}`}>
                                                {vsSector > 0 ? '+' : ''}{vsSector.toFixed(1)}%
                                            </span>
                                            <span className="text-[9px] text-slate-400 mt-1">
                                                {vsSector > 5 ? 'Surpondéré' : vsSector < -5 ? 'Sous-pondéré' : 'Équilibré'}
                                            </span>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* ACTIONABLE ADVICE */}
                        <div className="relative p-5 md:p-6 bg-blue-600/5 rounded-[2.5rem] border border-blue-500/20">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4">💡 Conseil Mirror AI</p>
                            <div className="text-xs text-slate-200 leading-relaxed">
                                {generateActionableAdvice(
                                    { ...stock, currentValue: totalValue },
                                    portfolioWeight,
                                    {
                                        recommendation: aiSignal?.rec,
                                        advice: aiSignal?.advice,
                                        riskScore: aiSignal?.rsi,
                                        mainRisk: aiSignal?.justification?.split('.')[0] || 'Surveiller l\'évolution',
                                        sentiment: aiSignal?.sentiment?.toString()
                                    },
                                    portfolioTotalValue
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-white/10 flex items-center justify-between mt-auto">
                        <button onClick={(e) => { e.stopPropagation(); setFlipped(false); }} className="bg-white/5 hover:bg-white/10 px-5 py-2 rounded-full border border-white/10 transition-all">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Retour</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
