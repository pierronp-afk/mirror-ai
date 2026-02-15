import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Zap, Target } from 'lucide-react';

interface Opportunity {
    symbol: string;
    name: string;
    type: 'long-terme' | 'court-terme' | 'coup-de-fusil';
    simpleReasoning: string;
    maxEntryPrice: number;
    exitPrice: number;
    potentialGainPercent: number;
}

export function OpportunitesSignificatives() {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchOpportunities = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: `Identify 5 investment opportunities for a beginner investor.

Criteria:
- NOT already in their portfolio
- Diversification with their current holdings
- Mix of: 2 long-term (growth over 2-5 years), 2 short-term (6-12 months), 1 "coup de fusil" (high risk/high reward)

For each opportunity, provide:
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "type": "long-terme|court-terme|coup-de-fusil",
  "simpleReasoning": "Why this is an opportunity in simple terms (max 50 words)",
  "maxEntryPrice": 185,
  "exitPrice": 220,
  "potentialGainPercent": 22
}

Return JSON array of 5 opportunities called "opportunities".`
                    })
                });
                const data = await res.json();
                const jsonMatch = data.analysis.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.opportunities) {
                        setOpportunities(parsed.opportunities);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        // Only fetch if not already present (checking a potential global state would be better but here we fetch on mount)
        // To avoid costly calls on every visit, we SHOULD verify validity.
        // For now, simpler implementation: load only if user requests? Or load automatically as per design? 
        // Design says "Opportunités significatives (New Section)". 
        // We'll load it automatically for the "wow" effect, but handle loading state gracefully.
        fetchOpportunities();
    }, []);

    if (loading) return (
        <div className="mt-10 mb-20 text-center">
            <div className="inline-block p-4 rounded-full bg-blue-50 animate-pulse mb-4">
                <Sparkles className="text-blue-500 w-8 h-8 animate-spin" />
            </div>
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Recherche d'opportunités par l'IA...</p>
        </div>
    );

    if (opportunities.length === 0) return null;

    return (
        <div className="opportunities-section mt-16 mb-20 animate-in slide-in-from-bottom duration-700">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-slate-900 text-white p-2 rounded-xl">
                    <Target size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">🎯 Opportunités à Saisir</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                        Signaux d'achat identifiés par l'IA
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {opportunities.map((opp) => (
                    <OpportunityCard key={opp.symbol} opportunity={opp} />
                ))}
            </div>
        </div>
    );
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
    const typeConfig = {
        'long-terme': { color: 'blue', label: '📈 Long Terme', bg: 'bg-blue-50', text: 'text-blue-700' },
        'court-terme': { color: 'emerald', label: '⚡ Court Terme', bg: 'bg-emerald-50', text: 'text-emerald-700' },
        'coup-de-fusil': { color: 'orange', label: '🎯 Coup de Fusil', bg: 'bg-orange-50', text: 'text-orange-700' }
    };

    const config = typeConfig[opportunity.type] || typeConfig['long-terme'];

    return (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full group">
            {/* Header */}
            <div className="mb-4">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h4 className="font-black text-xl text-slate-900">{opportunity.symbol}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[100px]">{opportunity.name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide ${config.bg} ${config.text}`}>
                        {config.label}
                    </span>
                </div>

                {/* Reasoning */}
                <p className="text-sm text-slate-600 leading-relaxed min-h-[60px]">
                    {opportunity.simpleReasoning}
                </p>
            </div>

            {/* Metrics */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Entrée Max</span>
                    <span className="text-sm font-bold text-slate-900">{opportunity.maxEntryPrice}€</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Cible</span>
                    <span className="text-sm font-bold text-blue-600">{opportunity.exitPrice}€</span>
                </div>

                {/* Potential Gain */}
                <div className="bg-emerald-50 rounded-xl p-2 text-center mt-2 group-hover:bg-emerald-100 transition-colors">
                    <span className="text-[9px] text-emerald-600 font-bold uppercase block mb-0.5">Potentiel</span>
                    <span className="text-lg font-black text-emerald-600">+{opportunity.potentialGainPercent}%</span>
                </div>

                {/* CTA */}
                <button className="w-full py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-colors mt-2">
                    Ajouter à ma watchlist
                </button>
            </div>
        </div>
    );
}
