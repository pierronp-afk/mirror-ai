"use client";

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon, ShieldAlert, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Stock, MarketPrices } from '@/types';

interface AssetAllocationProps {
    stocks: Stock[];
    marketPrices: MarketPrices;
    eurUsdRate: number;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#0ea5e9', '#f43f5e', '#84cc16'];

const SECTOR_RISK: Record<string, number> = {
    'Technologie': 7,
    'Semi-conducteurs': 8,
    'Services Comm.': 6,
    'Conso. Discrétionnaire': 6,
    'Automobile': 7,
    'Luxe': 6,
    'Énergie': 5,
    'Aéronautique': 6,
    'Santé': 4,
    'Banque': 5,
    'Immobilier': 4,
    'Conso. de base': 3,
    'Utilities': 3,
    'Chimie & Matériaux': 4,
    'Industrie': 5,
    'Finance': 5,
    'Assurance': 4,
    'Infrastructure': 4,
    'Autres': 5
};

const SECTOR_MAPPING: Record<string, string> = {
    // US Big Tech
    'AAPL': 'Technologie', 'MSFT': 'Technologie', 'NVDA': 'Semi-conducteurs',
    'GOOGL': 'Services Comm.', 'GOOG': 'Services Comm.', 'AMZN': 'Conso. Discrétionnaire',
    'META': 'Services Comm.', 'TSLA': 'Automobile', 'NFLX': 'Services Comm.',
    'AMD': 'Semi-conducteurs', 'INTC': 'Semi-conducteurs', 'CRM': 'Technologie',

    // CAC 40 & Europe
    'MC.PA': 'Luxe', 'RMS.PA': 'Luxe', 'CDI.PA': 'Luxe', 'KER.PA': 'Luxe',
    'OR.PA': 'Luxe', 'EL.PA': 'Luxe', 'TTE.PA': 'Énergie', 'AIR.PA': 'Aéronautique',
    'SAN.PA': 'Santé', 'BNP.PA': 'Banque', 'GLE.PA': 'Banque', 'ACA.PA': 'Banque',
    'AI.PA': 'Chimie & Matériaux', 'DG.PA': 'Infrastructure', 'SGO.PA': 'Industrie',
    'SU.PA': 'Technologie', 'DSY.PA': 'Technologie', 'BN.PA': 'Conso. de base',
    'ML.PA': 'Automobile', 'STLA.PA': 'Automobile', 'STMPA.PA': 'Semi-conducteurs',
    'ASML': 'Semi-conducteurs', 'SAP': 'Technologie', 'LVMH': 'Luxe',

    // Divers
    'BRK.B': 'Finance', 'V': 'Finance', 'MA': 'Finance', 'JPM': 'Banque',
    'UNH': 'Santé', 'PFE': 'Santé', 'LLY': 'Santé', 'XOM': 'Énergie', 'CVX': 'Énergie'
};

export default function AssetAllocation({ stocks, marketPrices, eurUsdRate }: AssetAllocationProps) {
    const allocationData = useMemo(() => {
        const sectors: Record<string, number> = {};
        let totalVal = 0;

        stocks.forEach(s => {
            // Priority: Stock object sector > Mapping > "Autres"
            const sector = s.sector || SECTOR_MAPPING[s.symbol.toUpperCase()] || 'Autres';
            const price = marketPrices[s.symbol]?.price || s.avgPrice;
            const isUS = !s.symbol.includes('.');
            const priceEur = isUS ? (price / eurUsdRate) : price;
            const value = s.shares * priceEur;

            sectors[sector] = (sectors[sector] || 0) + value;
            totalVal += value;
        });

        const data = Object.entries(sectors).map(([name, value]) => ({
            name,
            value,
            percent: totalVal > 0 ? (value / totalVal) * 100 : 0
        })).sort((a, b) => b.value - a.value);

        return { data, totalVal };
    }, [stocks, marketPrices, eurUsdRate]);

    const stats = useMemo(() => {
        if (allocationData.totalVal === 0) return { divScore: 0, riskLevel: 0, recommendations: [] };

        // 1. Diversification Score (HHI approach)
        // HHI is sum of squares of market shares
        const hhi = allocationData.data.reduce((acc, s) => acc + Math.pow(s.percent, 2), 0);
        // Score: 100 if perfectly diversified (ideal split), 0 if only one sector
        // We normalize so 10000 HHI (single sector) = 0 score, and e.g. 1000 HHI = 90 score.
        const divScore = Math.max(0, Math.min(100, Math.round(100 - (hhi / 100))));

        // 2. Risk Level (Weighted average of sector risk)
        let totalWeightedRisk = 0;
        allocationData.data.forEach(s => {
            const risk = SECTOR_RISK[s.name] || 5;
            totalWeightedRisk += (risk * (s.percent / 100));
        });
        const riskLevel = Math.round(totalWeightedRisk * 10) / 10;

        // 3. AI Recommendations
        const recommendations: string[] = [];
        allocationData.data.forEach(s => {
            if (s.percent > 35) {
                recommendations.push(`Surexposition ${s.name} (${s.percent.toFixed(0)}%) : Réduisez à 25% pour limiter le risque.`);
            } else if (s.percent > 25 && allocationData.data.length < 3) {
                recommendations.push(`Concentration élevée en ${s.name}. Envisagez de diversifier vers de nouveaux secteurs.`);
            }
        });

        if (recommendations.length === 0 && allocationData.data.length > 0) {
            recommendations.push("Votre allocation est équilibrée. Continuez à surveiller les fondamentaux.");
        }

        return { divScore, riskLevel, recommendations };
    }, [allocationData]);

    return (
        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl shadow-slate-200/40 border border-white h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Allocation Actifs</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Analyse de diversification & Risque</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl shadow-sm">
                    <PieChartIcon className="text-blue-600" size={24} />
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-12 min-h-0">
                {/* TOP ROW: CHART & RISK (WIDER) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    {/* CHART ZONE */}
                    <div className="lg:col-span-5 relative h-[300px] w-full flex items-center justify-center overflow-visible bg-slate-50/50 rounded-[3rem] border border-slate-100/50">
                        {stocks.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <Pie
                                            data={allocationData.data}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="65%"
                                            outerRadius="90%"
                                            paddingAngle={6}
                                            dataKey="value"
                                            animationBegin={0}
                                            animationDuration={1500}
                                        >
                                            {allocationData.data.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                    stroke="none"
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '1.5rem',
                                                border: 'none',
                                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                                padding: '1rem'
                                            }}
                                            itemStyle={{ fontWeight: '800', fontSize: '12px' }}
                                            formatter={(value: any) => [`${value?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, 'Valeur']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Score</p>
                                    <span className={`text-6xl font-black tracking-tighter ${stats.divScore > 70 ? 'text-emerald-500' : stats.divScore > 40 ? 'text-blue-600' : 'text-rose-500'}`}>
                                        {stats.divScore}
                                    </span>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Diversification</p>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-3 opacity-20">
                                <PieChartIcon size={60} />
                                <p className="font-bold italic">Portefeuille vide</p>
                            </div>
                        )}
                    </div>

                    {/* RISK ZONE (WIDER) */}
                    <div className="lg:col-span-7 space-y-8">
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-slate-900/20 border-b-4 border-blue-600 group transition-all">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl ${stats.riskLevel > 7 ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        <ShieldAlert size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Niveau de Risque Global</p>
                                        <h4 className="text-white text-sm font-bold mt-1">Évaluation pondérée du capital</h4>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-5xl font-black text-white tracking-tighter">{stats.riskLevel}</span>
                                    <span className="text-slate-500 text-xl font-bold">/10</span>
                                </div>
                            </div>
                            <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5 p-0.5">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_-3px] ${stats.riskLevel > 7 ? 'bg-rose-500 shadow-rose-500/50' :
                                            stats.riskLevel > 4 ? 'bg-blue-500 shadow-blue-500/50' :
                                                'bg-emerald-500 shadow-emerald-500/50'
                                        }`}
                                    style={{ width: `${stats.riskLevel * 10}%` }}
                                />
                            </div>
                            <div className="mt-4 flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                                <span>Prudent</span>
                                <span>Équilibré</span>
                                <span>Spéculatif</span>
                            </div>
                        </div>

                        {/* RECOMMENDATIONS - GRID STYLE */}
                        <div className="space-y-4">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 italic">
                                Pilotage Stratégique
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {stats.recommendations.map((rec, i) => (
                                    <div key={i} className={`flex gap-4 p-5 rounded-[2rem] border transition-all hover:scale-[1.02] ${rec.includes('Réduisez') || rec.includes('Concentration')
                                            ? 'bg-amber-50/50 border-amber-100 hover:bg-amber-50'
                                            : 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50'
                                        }`}>
                                        <div className="mt-0.5">
                                            {rec.includes('Réduisez') || rec.includes('Concentration') ?
                                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><AlertTriangle size={16} /></div> :
                                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle2 size={16} /></div>
                                            }
                                        </div>
                                        <p className={`text-xs font-bold leading-relaxed ${rec.includes('Réduisez') || rec.includes('Concentration') ? 'text-amber-900' : 'text-emerald-900'}`}>
                                            {rec}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM ROW: SECTOR LEGEND (More premium) */}
                <div className="flex flex-wrap gap-4 justify-start">
                    {allocationData.data.map((entry, index) => (
                        <div key={index} className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-100 transition-all cursor-default group">
                            <div className="w-3 h-3 rounded-full shadow-sm group-hover:scale-125 transition-transform" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-800 leading-none">{entry.name}</span>
                                <span className="text-[9px] font-bold text-slate-400 mt-1">{entry.percent.toFixed(1)}% du capital</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
