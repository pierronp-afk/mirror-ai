import React from 'react';
import { Opportunity } from '@/types';
import { Clock, Target, Rocket, Zap, TrendingUp, AlertCircle } from 'lucide-react';

interface OpportunitiesSectionProps {
    opportunities: Opportunity[];
}

export default function OpportunitiesSection({ opportunities }: OpportunitiesSectionProps) {
    if (!opportunities || opportunities.length === 0) return null;

    // Grouper par horizon
    const grouped = {
        LONG: opportunities.filter(o => o.horizon === 'LONG'),
        MEDIUM: opportunities.filter(o => o.horizon === 'MEDIUM'),
        SHORT: opportunities.filter(o => o.horizon === 'SHORT'),
        FUSIL: opportunities.filter(o => o.horizon === 'FUSIL'),
    };

    const getHorizonConfig = (horizon: Opportunity['horizon']) => {
        switch (horizon) {
            case 'LONG':
                return {
                    label: 'Long Terme',
                    icon: Target,
                    color: 'emerald',
                    bgClass: 'bg-emerald-50',
                    textClass: 'text-emerald-600',
                    borderClass: 'border-emerald-100',
                    description: 'Investissement patrimonial (1-3 ans)',
                };
            case 'MEDIUM':
                return {
                    label: 'Moyen Terme',
                    icon: TrendingUp,
                    color: 'blue',
                    bgClass: 'bg-blue-50',
                    textClass: 'text-blue-600',
                    borderClass: 'border-blue-100',
                    description: 'Croissance équilibrée (6-12 mois)',
                };
            case 'SHORT':
                return {
                    label: 'Court Terme',
                    icon: Clock,
                    color: 'amber',
                    bgClass: 'bg-amber-50',
                    textClass: 'text-amber-600',
                    borderClass: 'border-amber-100',
                    description: 'À surveiller (1-6 mois)',
                };
            case 'FUSIL':
                return {
                    label: 'Coups de Fusil',
                    icon: Zap,
                    color: 'rose',
                    bgClass: 'bg-rose-50',
                    textClass: 'text-rose-600',
                    borderClass: 'border-rose-100',
                    description: 'Très court terme - Surveillance active requise',
                };
        }
    };

    const getUrgencyBadge = (urgency?: Opportunity['urgencyLevel']) => {
        if (!urgency) return null;

        const config = {
            CRITIQUE: { label: '🔥 CRITIQUE', class: 'bg-rose-600 text-white animate-pulse' },
            ÉLEVÉE: { label: '⚡ ÉLEVÉE', class: 'bg-amber-600 text-white' },
            NORMALE: { label: '👁️ SURVEILLER', class: 'bg-blue-600 text-white' },
        };

        const { label, class: className } = config[urgency];

        return (
            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${className}`}>
                {label}
            </span>
        );
    };

    return (
        <div className="mt-20 space-y-8">
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-3 rounded-2xl">
                    <Rocket className="text-white w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
                        Opportunités Significatives
                    </h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                        Détectées par l&apos;IA hors portefeuille
                    </p>
                </div>
            </div>

            {/* Afficher chaque catégorie */}
            {(['LONG', 'MEDIUM', 'SHORT', 'FUSIL'] as const).map((horizon) => {
                const items = grouped[horizon];
                if (items.length === 0) return null;

                const config = getHorizonConfig(horizon);
                const Icon = config.icon;

                return (
                    <div key={horizon} className="space-y-4">
                        <div className={`flex items-center gap-3 px-6 py-3 ${config.bgClass} ${config.borderClass} border rounded-2xl`}>
                            <Icon className={config.textClass} size={20} />
                            <div className="flex-1">
                                <h4 className={`text-sm font-black uppercase tracking-wider ${config.textClass}`}>
                                    {config.label}
                                </h4>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                    {config.description}
                                </p>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${config.bgClass} ${config.textClass} border ${config.borderClass}`}>
                                {items.length} {items.length > 1 ? 'opportunités' : 'opportunité'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {items.map((opp, i) => (
                                <div
                                    key={i}
                                    className={`bg-white border ${config.borderClass} rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden`}
                                >
                                    {/* Urgence badge pour les FUSIL */}
                                    {opp.horizon === 'FUSIL' && opp.urgencyLevel && (
                                        <div className="absolute top-4 right-4">
                                            {getUrgencyBadge(opp.urgencyLevel)}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-12 h-12 ${config.bgClass} rounded-2xl flex items-center justify-center font-black ${config.textClass} group-hover:scale-110 transition-transform`}>
                                            {opp.symbol[0]}
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${config.bgClass} ${config.textClass}`}>
                                            {opp.horizon}
                                        </span>
                                    </div>

                                    <h4 className="text-xl font-black tracking-tighter mb-1">{opp.symbol}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">
                                        {opp.name}
                                    </p>
                                    {opp.sector && (
                                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-4">
                                            {opp.sector}
                                        </p>
                                    )}

                                    <p className="text-xs text-slate-500 mb-6 italic line-clamp-3 leading-relaxed">
                                        &quot;{opp.reason}&quot;
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                                                <Target size={10} /> Prix Max Achat
                                            </p>
                                            <p className="text-sm font-black text-slate-900">
                                                {opp.priceMax.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1 justify-end">
                                                <TrendingUp size={10} /> Sortie Visée
                                            </p>
                                            <p className={`text-sm font-black ${config.textClass}`}>
                                                {opp.priceExit.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Potentiel de gain */}
                                    <div className={`mt-4 p-3 ${config.bgClass} rounded-xl border ${config.borderClass}`}>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Potentiel</p>
                                        <p className={`text-lg font-black ${config.textClass}`}>
                                            +{(((opp.priceExit - opp.priceMax) / opp.priceMax) * 100).toFixed(1)}%
                                        </p>
                                    </div>

                                    {/* Warning pour FUSIL */}
                                    {opp.horizon === 'FUSIL' && (
                                        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                                            <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                            <p className="text-[9px] font-bold text-amber-900 leading-tight">
                                                Surveillance comme le lait sur le feu requise
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
