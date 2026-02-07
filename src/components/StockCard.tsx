import React, { useState } from 'react';
import { Stock, AISignal } from '@/types';
import { TrendingUp, TrendingDown, Info, ShieldCheck, AlertTriangle, Trash2, RefreshCw, Edit2, Check, X } from 'lucide-react';

interface StockCardProps {
    stock: Stock;
    marketData?: { price: number; change: number; changePercent: number };
    aiSignal?: AISignal;
    exchangeRate?: number; // EUR/USD rate (e.g. 1.08)
    onRemove: (symbol: string) => void;
    onRefresh?: (symbol: string) => void;
    onUpdateQuantity?: (symbol: string, newQuantity: number) => void;
    onUpdateAvgPrice?: (symbol: string, newPrice: number) => void; // New prop for updating PRU
}

export default function StockCard({ stock, marketData, aiSignal, exchangeRate = 1.08, onRemove, onRefresh, onUpdateQuantity, onUpdateAvgPrice }: StockCardProps) {
    const [flipped, setFlipped] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editQuantity, setEditQuantity] = useState(stock.shares.toString());
    const [editAvgPrice, setEditAvgPrice] = useState(stock.avgPrice.toString());

    // Currency Detection
    const isUS = !stock.symbol.includes('.'); // Simple assumption: no dot (like .PA) means US
    const currencySymbol = isUS ? '$' : '€';

    // Current Price Logic
    // API returns price in trading currency (USD for US stocks, EUR for PA stocks)
    const rawPrice = marketData?.price || 0;

    // Converted Price (for Total Value calculation in EUR)
    // If US stock, rawPrice is USD. We need EUR.
    // 1 EUR = 1.08 USD => 1 USD = 1/1.08 EUR.
    // Price(EUR) = Price(USD) / Rate
    const currentPriceEur = isUS ? (rawPrice / exchangeRate) : rawPrice;

    // Use stored avgPrice (PRU) which is assumed to be in EUR based on User Input
    const avgPrice = stock.avgPrice;

    // Gains in EUR
    const totalValueEur = stock.shares * currentPriceEur;
    const totalCostEur = stock.shares * avgPrice;
    const gainEur = totalValueEur - totalCostEur;
    const gainPercent = totalCostEur > 0 ? (gainEur / totalCostEur) * 100 : 0;
    const isPos = gainEur >= 0;

    const dailyChangePercent = marketData?.changePercent || 0;
    const isDailyPos = dailyChangePercent >= 0;

    // Daily Gain in EUR
    // marketData.change is in trading currency
    const rawDailyChange = marketData?.change || 0;
    const dailyChangeEur = isUS ? (rawDailyChange / exchangeRate) : rawDailyChange;
    const dailyGainEur = dailyChangeEur * stock.shares;
    const isDailyGainPos = dailyGainEur >= 0;

    // Logo mapping for common symbols
    const symbolToDomain: Record<string, string> = {
        'AAPL': 'apple.com',
        'GOOG': 'google.com',
        'GOOGL': 'google.com',
        'MSFT': 'microsoft.com',
        'AMZN': 'amazon.com',
        'META': 'fb.com',
        'NFLX': 'netflix.com',
        'NVDA': 'nvidia.com',
        'TSLA': 'tesla.com',
        'JPM': 'jpmorganchase.com',
        'UBER': 'uber.com',
        'DIS': 'disney.com',
        'ADBE': 'adobe.com',
        'ORCL': 'oracle.com',
        'CRM': 'salesforce.com',
        'PYPL': 'paypal.com',
        'INTC': 'intel.com',
        'ASML': 'asml.com',
        'AIR.PA': 'airbus.com',
        'MC.PA': 'lvmh.com',
        'OR.PA': 'loreal.com',
        'TTE.PA': 'totalenergies.com',
        'SAN.PA': 'sanofi.com',
        'BN.PA': 'danone.com',
        'AI.PA': 'airliquide.com',
        'DG.PA': 'vinci.com',
        'KER.PA': 'kering.com',
        'RMS.PA': 'hermes.com',
        'BNP.PA': 'group.bnpparibas',
        'CS.PA': 'axa.com',
        'GLE.PA': 'societegenerale.com'
    };

    const domain = symbolToDomain[stock.symbol.toUpperCase()] || `${stock.symbol.toLowerCase().split('.')[0]}.com`;
    const logoUrl = `https://logo.clearbit.com/${domain}`;
    const fallbackLogoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    // Déterminer la couleur du conseil d'action
    const getAdviceColor = () => {
        const advice = aiSignal?.advice || (isPos ? "Renforcer" : "Alléger");
        if (advice === "Vendre" || advice === "Alléger") return "rose";
        if (advice === "Renforcer" || advice === "Acheter") return "emerald";
        return "blue"; // Conserver
    };

    const adviceColor = getAdviceColor();
    const adviceText = aiSignal?.advice || (isPos ? "Renforcer" : "Alléger");

    const handleRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onRefresh && !isRefreshing) {
            setIsRefreshing(true);
            await onRefresh(stock.symbol);
            setTimeout(() => setIsRefreshing(false), 1000);
        }
    };

    const handleSaveEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        const qty = parseFloat(editQuantity);
        const price = parseFloat(editAvgPrice);

        if (!isNaN(qty) && qty > 0 && onUpdateQuantity) {
            onUpdateQuantity(stock.symbol, qty);
        }

        // We need a way to update price too. 
        // Assuming we will add onUpdateAvgPrice to props or use a combined update
        if (!isNaN(price) && price >= 0 && onUpdateQuantity) {
            // Temporary hack: onUpdateQuantity might need to change to onUpdateStock(symbol, qty, price)
            // But for now, we only have onUpdateQuantity in props.
            // I will implement a local fix in page.tsx to support this or just pass a new prop.
            // EDIT: I added onUpdateAvgPrice to interface.
            if (onUpdateAvgPrice) onUpdateAvgPrice(stock.symbol, price);
        }

        setIsEditing(false);
    };

    // Calcul de la progression vers la cible
    // Target is usually in Trading Currency (USD for US stocks)
    // We compare with rawPrice (USD)
    const targetPrice = aiSignal?.targetPrice || (rawPrice * 1.15);
    let progress = 0;
    progress = Math.min(100, Math.max(5, (rawPrice / targetPrice) * 100));

    return (
        <div className="relative h-[580px] w-full cursor-pointer perspective-1000 group/card" onClick={() => !isEditing && setFlipped(!flipped)}>
            <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${flipped ? 'rotate-y-180' : ''}`}>

                {/* FRONT FACE */}
                <div className="absolute inset-0 backface-hidden bg-white/70 backdrop-blur-xl border border-white/40 rounded-[3rem] p-8 shadow-2xl shadow-slate-200/50 flex flex-col justify-between hover:border-blue-400/50 hover:shadow-blue-200/20 transition-all duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-[3rem] -z-10" />

                    {/* Header: Logo & Company Name + Symbol */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 p-2 shadow-sm group-hover/card:scale-105 transition-transform duration-500">
                                <img
                                    src={logoUrl}
                                    alt={stock.symbol}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        if (img.src === logoUrl) {
                                            img.src = fallbackLogoUrl;
                                        } else {
                                            img.src = `https://ui-avatars.com/api/?name=${stock.symbol}&background=random&color=fff&bold=true`;
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1 line-clamp-2">
                                    {stock.name || stock.symbol}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        {stock.symbol}
                                    </p>
                                    <span className={`text-[10px] font-black ${isDailyPos ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {/* NOTE: Design shows variation next to name? No, design shows it top right or under name. 
                                           User requested: "Variation du jour comme c’est à côté du nom." 
                                           Let's put it here.
                                       */}
                                        {isDailyPos ? '↘' : '↗'} {dailyChangePercent.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 disabled:opacity-50"
                            >
                                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(stock.symbol);
                                }}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* PERFORMANCE GLOBALE (Design matches user screenshot) */}
                    <div className="mt-6">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Performance Globale</p>
                        <div className="flex items-baseline gap-3">
                            <h4 className={`text-4xl font-black tracking-tighter ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isPos ? '+' : ''}{gainEur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </h4>
                            <span className={`text-sm font-bold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                ({isPos ? '+' : ''}{gainPercent.toFixed(2)}%)
                            </span>
                        </div>
                        <p className="text-xs font-medium text-slate-400 mt-1">
                            Gain Jour: {isDailyGainPos ? '+' : ''}{dailyGainEur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} ({dailyChangePercent.toFixed(2)}%)
                        </p>
                    </div>

                    {/* CAPSULE */}
                    <div className="mt-6 w-full bg-slate-50 border border-slate-200 rounded-full p-2 flex items-center shadow-inner relative overflow-hidden">
                        {/* Zone 1: Action */}
                        <div className={`relative px-6 py-3 rounded-full shadow-lg z-10 flex items-center justify-center min-w-[120px] ${adviceColor === 'rose' ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white' :
                            adviceColor === 'emerald' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white' :
                                'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            }`}>
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{adviceText}</span>
                        </div>

                        {/* Zone 2: Target (In Trading Currency usually) */}
                        <div className="flex-1 px-4 flex flex-col items-center justify-center relative z-0">
                            <div className="w-full flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                <span>Cible:</span>
                                <span>{targetPrice.toFixed(0)} {isUS ? '$' : '€'}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${progress}%` }}
                                    className={`h-full rounded-full transition-all duration-1000 ${adviceColor === 'rose' ? 'bg-rose-400' :
                                        adviceColor === 'emerald' ? 'bg-emerald-400' : 'bg-blue-400'
                                        }`}
                                />
                            </div>
                            <div className="mt-1 text-[9px] font-black text-slate-500">
                                {rawPrice.toFixed(2)} {isUS ? '$' : '€'}
                            </div>
                        </div>

                        {/* Zone 3: Stop */}
                        <div className="pr-4 pl-2 border-l border-slate-200 flex flex-col items-end justify-center min-w-[50px]">
                            <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider leading-none mb-0.5">Stop</span>
                            <span className="text-[10px] font-bold text-slate-600 leading-none">
                                {aiSignal?.stopLoss ? aiSignal.stopLoss.toFixed(0) : (rawPrice * 0.9).toFixed(0)}
                            </span>
                        </div>
                    </div>


                    {/* Bottom Section: Total Value, Shares, Buy Price */}
                    <div className="mt-auto space-y-2 pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-slate-500 text-xs font-bold">Valeur totale:</span>
                                    <span className="text-xl font-black text-slate-900">{totalValueEur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                                </div>
                                <div className="flex items-baseline gap-2" onClick={e => { e.stopPropagation(); setIsEditing(true); }}>
                                    <span className="text-slate-500 text-xs font-bold">Titres:</span>
                                    {isEditing ? (
                                        <div className="inline-block flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="number"
                                                value={editQuantity}
                                                onChange={e => setEditQuantity(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveEdit(e as any);
                                                    if (e.key === 'Escape') setIsEditing(false);
                                                }}
                                                className="w-20 border border-slate-300 rounded px-1 py-0.5 text-sm font-bold"
                                                autoFocus
                                            />
                                            <button onClick={handleSaveEdit} className="p-1 bg-emerald-500 text-white rounded"><Check size={12} /></button>
                                            <button onClick={() => setIsEditing(false)} className="p-1 bg-rose-500 text-white rounded"><X size={12} /></button>
                                        </div>
                                    ) : (
                                        <span className="text-emerald-500 font-bold text-lg cursor-pointer hover:bg-slate-100 px-1 rounded transition-colors group/qty">
                                            {stock.shares}
                                            <Edit2 size={10} className="inline ml-2 text-slate-300 opacity-0 group-hover/qty:opacity-100 transition-opacity" />
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-2" onClick={e => { e.stopPropagation(); setIsEditing(true); }}>
                                    <span className="text-slate-500 text-xs font-bold">Prix d'achat moyen:</span>
                                    {isEditing ? (
                                        <div className="inline-block flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="number"
                                                value={editAvgPrice}
                                                onChange={e => setEditAvgPrice(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveEdit(e as any);
                                                    if (e.key === 'Escape') setIsEditing(false);
                                                }}
                                                className="w-20 border border-slate-300 rounded px-1 py-0.5 text-sm font-bold"
                                            />
                                            <button onClick={handleSaveEdit} className="p-1 bg-emerald-500 text-white rounded"><Check size={12} /></button>
                                            <button onClick={() => setIsEditing(false)} className="p-1 bg-rose-500 text-white rounded"><X size={12} /></button>
                                        </div>
                                    ) : (
                                        <span className="text-slate-900 font-bold text-lg cursor-pointer hover:bg-slate-100 px-1 rounded transition-colors group/price">
                                            {avgPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                            <Edit2 size={10} className="inline ml-2 text-slate-300 opacity-0 group-hover/price:opacity-100 transition-opacity" />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BACK FACE (Existing) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900 rounded-[3rem] p-10 flex flex-col justify-between border-2 border-blue-500 shadow-2xl shadow-blue-500/20 text-white overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                    <div>
                        <div className="flex items-center gap-3 mb-10">
                            <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20">
                                <ShieldCheck size={20} className="text-white" />
                            </div>
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] italic">Analyse Stratégique</h4>
                        </div>

                        <div className="space-y-8">
                            <div className="relative">
                                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-600/30 rounded-full" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 pl-2">Perspectives & Risques</p>
                                <p className="text-xl font-medium leading-relaxed italic text-slate-200 pl-2">
                                    &quot;{aiSignal?.justification || "Analyse en attente du prochain audit IA. Les fondamentaux restent stables selon les derniers rapports trimestriels."}&quot;
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Cible IDÉALE</p>
                                    <p className="text-lg font-bold text-emerald-400">{targetPrice.toFixed(2)}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Stop Loss</p>
                                    <p className="text-lg font-bold text-rose-400">{aiSignal?.stopLoss ? aiSignal.stopLoss.toFixed(2) : (rawPrice * 0.9).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Live Engine Active</p>
                        </div>
                        <span className="text-blue-500 text-[9px] font-black uppercase tracking-[0.2em] italic bg-blue-500/5 px-4 py-2 rounded-full border border-blue-500/20">RETOUR</span>
                    </div>
                </div>

            </div >
        </div >
    );
}
