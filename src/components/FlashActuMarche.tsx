import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

export function FlashActuMarche() {
    const [flashNews, setFlashNews] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: `Génère un "Flash Actu Marché" concis basé sur les actualités financières mondiales de l'heure.
                    
                    FORMAT JSON ATTENDU:
                    {
                        "headline": "Titre percutant (max 10 mots)",
                        "summary": "Résumé de l'événement majeur en 2 phrases simples.",
                        "time": "Il y a X min",
                        "impactedSymbols": ["AAPL", "BTC", "EURUSD"],
                        "sentiment": "bullish|bearish|neutral"
                    }`
                    })
                });
                const data = await res.json();
                const jsonMatch = data.analysis.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    setFlashNews(JSON.parse(jsonMatch[0]));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    if (loading) return (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 mb-8 shadow-sm flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 bg-slate-100 rounded-full"></div>
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                <div className="h-3 bg-slate-100 rounded w-3/4"></div>
            </div>
        </div>
    );

    if (!flashNews) return null;

    return (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 mb-8 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><Bell size={14} /></span>
                        <h3 className="font-black text-xs uppercase tracking-widest text-blue-600">Flash Actu Marché</h3>
                        <span className="text-[10px] text-slate-400 font-bold">• {flashNews.time}</span>
                    </div>

                    <p className="text-lg font-black text-slate-900 mb-1 leading-tight">{flashNews.headline}</p>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{flashNews.summary}</p>
                </div>

                {flashNews.impactedSymbols?.length > 0 && (
                    <div className="flex gap-2 flex-wrap justify-end">
                        {flashNews.impactedSymbols.map((s: string) => (
                            <span key={s} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-700">
                                {s}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
