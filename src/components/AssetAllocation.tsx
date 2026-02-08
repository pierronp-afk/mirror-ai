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
        <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl shadow-slate-200/40 border border-white h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Allocation Actifs</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Analyse de diversification & Risque</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-2xl">
                    <PieChartIcon className="text-blue-600" size={20} />
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center min-h-0">
                {/* CHART ZONE */}
                <div className="relative h-[240px] md:h-[280px] w-full flex items-center justify-center overflow-visible">
                    {stocks.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
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
                                <span className={`text-5xl font-black tracking-tighter ${stats.divScore > 70 ? 'text-emerald-500' : stats.divScore > 40 ? 'text-blue-600' : 'text-rose-500'}`}>
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

                {/* INFO ZONE */}
                <div className="space-y-8">
                    {/* RISK LEVEL */}
                    <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 group hover:border-blue-200 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${stats.riskLevel > 7 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <ShieldAlert size={18} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Niveau de Risque</p>
                            </div>
                            <span className="text-2xl font-black text-slate-900">{stats.riskLevel}/10</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${stats.riskLevel > 7 ? 'bg-rose-500' : stats.riskLevel > 4 ? 'bg-blue-600' : 'bg-emerald-500'}`}
                                style={{ width: `${stats.riskLevel * 10}%` }}
                            />
                        </div>
                    </div>

                    {/* RECOMMENDATIONS */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            Recommandations de Pilotage
                        </p>
                        <div className="space-y-3">
                            {stats.recommendations.map((rec, i) => (
                                <div key={i} className={`flex gap-3 p-4 rounded-2xl border ${rec.includes('Réduisez') || rec.includes('Concentration') ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <div className="mt-0.5">
                                        {rec.includes('Réduisez') || rec.includes('Concentration') ?
                                            <AlertTriangle size={14} className="text-amber-600" /> :
                                            <CheckCircle2 size={14} className="text-emerald-600" />
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

            {/* SECTOR LEGEND */}
            <div className="mt-10 flex flex-wrap gap-3 justify-center">
                {allocationData.data.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 hover:scale-105 transition-transform cursor-default">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[10px] font-black uppercase text-slate-700">{entry.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 ml-1">{entry.percent.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
