import React, { useState } from 'react';
import { Stock, AISignal } from '@/types';
import { TrendingUp, TrendingDown, Info, ShieldCheck, AlertTriangle } from 'lucide-react';

interface StockCardProps {
    stock: Stock;
    marketData?: { price: number; change: number; changePercent: number };
    aiSignal?: AISignal;
}

export default function StockCard({ stock, marketData, aiSignal }: StockCardProps) {
    const [flipped, setFlipped] = useState(false);

    const currentPrice = marketData?.price || stock.avgPrice;
    const gain = (currentPrice - stock.avgPrice) * stock.shares;
    const gainPercent = (gain / (stock.avgPrice * stock.shares)) * 100;
    const isPos = gain >= 0;

    const dailyChange = marketData?.changePercent || 0;
    const isDailyPos = dailyChange >= 0;
    const dailyGain = (marketData?.change || 0) * stock.shares;
    const isDailyGainPos = dailyGain >= 0;

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
        'BN.PA': 'danone.com'
    };

    const domain = symbolToDomain[stock.symbol.toUpperCase()] || `${stock.symbol.toLowerCase()}.com`;
    const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    return (
        <div className="relative h-[500px] w-full cursor-pointer perspective-1000" onClick={() => setFlipped(!flipped)}>
            <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${flipped ? 'rotate-y-180' : ''}`}>

                {/* FRONT FACE */}
                <div className="absolute inset-0 backface-hidden bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl flex flex-col justify-between hover:border-blue-400 transition-colors">
                    {/* Header: Logo & Symbol + Name */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 p-2">
                                <img
                                    src={logoUrl}
                                    alt={stock.symbol}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${stock.symbol}&background=random&color=fff&bold=true`;
                                    }}
                                />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tighter text-slate-900">{stock.symbol}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stock.name || "Action"}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className={`flex items-center gap-1 font-black text-sm ${isDailyPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isDailyPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {dailyChange.toFixed(2)}%
                            </div>
                            <p className="text-[9px] font-bold text-slate-300 uppercase">Var. Jour</p>
                        </div>
                    </div>

                    {/* AI Advice Section (Variation + Advice + Urgency) */}
                    <div className="mt-6 p-6 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">Analyse v2.5 Flash</p>
                            {aiSignal && (
                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${aiSignal.urgency === 'HAUTE' ? 'border-rose-500 text-rose-500' : 'border-blue-500 text-blue-500'
                                    }`}>
                                    {aiSignal.urgency}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase text-center tracking-widest bg-blue-600 shadow-lg shadow-blue-500/20`}>
                                {aiSignal?.advice || (isPos ? "Renforcer" : "Alléger")}
                            </span>
                        </div>
                    </div>

                    {/* Performance Section (Total Gain + Daily Gain) */}
                    <div className="mt-auto space-y-6">
                        <div className="grid grid-cols-2 gap-4 border-b border-slate-50 pb-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Gain Total</p>
                                <p className={`text-xl font-black ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isPos ? '+' : ''}{gain.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <p className={`text-[10px] font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {isPos ? '+' : ''}{gainPercent.toFixed(2)}%
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Gain Jour</p>
                                <p className={`text-xl font-black ${isDailyGainPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isDailyGainPos ? '+' : ''}{dailyGain.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <p className="text-[10px] font-bold text-slate-300 italic">Depuis 8h00</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Solde Actuel</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">
                                    {(stock.shares * currentPrice).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-300 uppercase italic">Détails AI</span>
                                <button className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                    <Info size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BACK FACE */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900 rounded-[3rem] p-10 flex flex-col justify-between border-2 border-blue-500 shadow-2xl shadow-blue-500/20 text-white">
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-blue-600 p-2 rounded-xl">
                                <ShieldCheck size={20} className="text-white" />
                            </div>
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] italic">Analyse Stratégique</h4>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Perspectives à 3 mois</p>
                                <p className="text-lg font-medium leading-relaxed italic text-slate-200">
                                    &quot;{aiSignal?.justification || "Analyse en attente du prochain audit IA. Les fondamentaux restent stables selon les derniers rapports trimestriels."}&quot;
                                </p>
                            </div>

                            {aiSignal?.stopLoss && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
                                    <AlertTriangle className="text-rose-500" size={20} />
                                    <div>
                                        <p className="text-[9px] font-black text-rose-500 uppercase">Stop Loss de sécurité</p>
                                        <p className="font-black text-white">{aiSignal.stopLoss} €</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Mirror AI v2.5 Flash</p>
                        <span className="text-blue-400 text-[9px] font-black uppercase italic">Cliquez pour revenir</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
