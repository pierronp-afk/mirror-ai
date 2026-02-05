import React, { useState } from 'react';
import { Stock, AISignal } from '@/types';
import { TrendingUp, TrendingDown, Info, ShieldCheck, AlertTriangle, Trash2 } from 'lucide-react';

interface StockCardProps {
    stock: Stock;
    marketData?: { price: number; change: number; changePercent: number };
    aiSignal?: AISignal;
    onRemove: (symbol: string) => void;
}

export default function StockCard({ stock, marketData, aiSignal, onRemove }: StockCardProps) {
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

    return (
        <div className="relative h-[520px] w-full cursor-pointer perspective-1000 group/card" onClick={() => setFlipped(!flipped)}>
            <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${flipped ? 'rotate-y-180' : ''}`}>

                {/* FRONT FACE */}
                <div className="absolute inset-0 backface-hidden bg-white/70 backdrop-blur-xl border border-white/40 rounded-[3rem] p-8 shadow-2xl shadow-slate-200/50 flex flex-col justify-between hover:border-blue-400/50 hover:shadow-blue-200/20 transition-all duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-[3rem] -z-10" />

                    {/* Header: Logo & Symbol + Name */}
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
                                <h3 className="text-3xl font-black tracking-tighter text-slate-900 leading-none mb-1">{stock.symbol}</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] truncate max-w-[120px]">{stock.name || "Action"}</p>
                                    {stock.sector && (
                                        <>
                                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{stock.sector}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(stock.symbol);
                                }}
                                className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100 shadow-sm"
                                title="Supprimer"
                            >
                                <Trash2 size={18} />
                            </button>
                            <div className="text-right">
                                <div className={`flex items-center gap-1 font-black text-sm justify-end ${isDailyPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isDailyPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {dailyChange.toFixed(2)}%
                                </div>
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Variation Jour</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Advice Section (Variation + Advice + Urgency) */}
                    <div className="mt-8 p-6 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl group-hover/card:bg-blue-950 transition-colors duration-500">
                        <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4">
                            <ShieldCheck size={100} />
                        </div>
                        <div className="flex justify-between items-center mb-5 relative z-10">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em] italic">Mirror Engine v1.5</p>
                            {aiSignal && (
                                <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border shadow-sm ${aiSignal.urgency === 'HAUTE' ? 'border-rose-500/50 text-rose-400 bg-rose-500/5' : 'border-blue-500/50 text-blue-400 bg-blue-500/5'
                                    }`}>
                                    {aiSignal.urgency}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between gap-4 relative z-10">
                            <span className={`flex-1 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase text-center tracking-[0.2em] bg-blue-600 shadow-xl shadow-blue-600/20 group-hover/card:scale-[1.02] transition-transform`}>
                                {aiSignal?.advice || (isPos ? "Renforcer" : "Alléger")}
                            </span>
                        </div>
                    </div>

                    {/* Performance Section (Total Gain + Daily Gain) */}
                    <div className="mt-auto space-y-8">
                        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-8">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Gain Latent</p>
                                <p className={`text-2xl font-black tracking-tighter ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isPos ? '+' : ''}{gain.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-md text-[10px] font-black ${isPos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                    {isPos ? '+' : ''}{gainPercent.toFixed(2)}%
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Profit Jour</p>
                                <p className={`text-2xl font-black tracking-tighter ${isDailyGainPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isDailyGainPos ? '+' : ''}{dailyGain.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <p className="text-[10px] font-bold text-slate-300 italic mt-1">Séance en cours</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Valeur Position</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">
                                    {(stock.shares * currentPrice).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-0.5">Focus</p>
                                    <p className="text-[10px] font-black text-slate-900 uppercase">Détails</p>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 group-hover/card:bg-slate-900 group-hover/card:text-white group-hover/card:border-slate-900 transition-all shadow-sm">
                                    <Info size={18} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BACK FACE */}
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

                            {aiSignal?.stopLoss && (
                                <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center gap-4 animate-pulse-slow">
                                    <div className="p-3 bg-rose-500/20 rounded-xl text-rose-500">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Stop Loss de sécurité</p>
                                        <p className="text-2xl font-black text-white tracking-tighter">{aiSignal.stopLoss} €</p>
                                    </div>
                                </div>
                            )}
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

            </div>
        </div>

    );
}
