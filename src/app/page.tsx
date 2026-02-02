"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAI } from '@/hooks/useAI';
import {
  TrendingUp, TrendingDown, Plus, Trash2, BrainCircuit,
  Sparkles, AlertCircle, CheckCircle2, Activity, Bell, X, Info
} from 'lucide-react';

/**
 * --- INTERFACES & TYPES ---
 */

interface Stock {
  symbol: string;
  shares: number;
  avgPrice: number;
}

interface AISignal {
  name: string;
  reason: string;
  justification: string;
  rec: string;
  urgency: string;
  color: string;
}

interface AIAnalysis {
  health: string;
  healthDesc: string;
  prediction: string;
  predictionDesc: string;
  signals: AISignal[];
  newsHighlight: string;
}

interface UserProfile {
  uid: string;
  email?: string;
}

/**
 * --- LOGIQUE DES HOOKS ---
 * Les hooks réels sont importés depuis @/hooks
 */

/**
 * --- COMPOSANT PRINCIPAL ---
 */

export default function Dashboard() {
  const { user, loading: authLoading, loginAnonymously } = useAuth();
  const { analyzePortfolio, analysis, isAnalyzing, error: aiError } = useAI();

  const [stocks, setStocks] = useState<Stock[]>([
    { symbol: 'AAPL', shares: 10, avgPrice: 175.50 },
    { symbol: 'NVDA', shares: 5, avgPrice: 450.25 },
    { symbol: 'TSLA', shares: 15, avgPrice: 210.10 }
  ]);

  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [showAIModal, setShowAIModal] = useState(false);

  // Simulation Marché
  useEffect(() => {
    const timer = setInterval(() => {
      setMarketPrices(prev => {
        const newPrices = { ...prev };
        stocks.forEach(stock => {
          const basePrice = prev[stock.symbol] || stock.avgPrice;
          const change = (Math.random() - 0.5) * 1.5;
          newPrices[stock.symbol] = Math.max(1, basePrice + change);
        });
        return newPrices;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [stocks]);

  const totalValue = useMemo(() => {
    return stocks.reduce((acc, s) => acc + (s.shares * (marketPrices[s.symbol] || s.avgPrice)), 0);
  }, [stocks, marketPrices]);

  const totalCost = useMemo(() => {
    return stocks.reduce((acc, s) => acc + (s.shares * s.avgPrice), 0);
  }, [stocks]);

  const totalGain = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  if (authLoading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Initialisation Mirror AI</p>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center">
        <div className="bg-blue-600 p-5 rounded-[2rem] mb-8 shadow-2xl shadow-blue-200">
          <BrainCircuit className="text-white w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase italic mb-4">Mirror<span className="text-blue-600">AI</span></h1>
        <p className="text-slate-500 mb-8 max-w-sm">Connectez-vous pour commencer à tracker votre patrimoine avec l'aide de l'IA.</p>
        <button
          onClick={() => loginAnonymously()}
          className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
          Démarrer l'expérience
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20">
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>

      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic text-slate-900">Mirror<span className="text-blue-600">AI</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden text-slate-900">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="avatar" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-10 space-y-10">

        {/* KPI DASHBOARD */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/40 border border-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
              <Activity size={180} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2 italic">Valeur Totale du Portefeuille</p>
            <div className="flex items-baseline gap-4 flex-wrap">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900">
                {totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </h2>
              <div className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold ${totalGain >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                {totalGain >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {totalGain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
              </div>
            </div>
          </div>

          <button
            onClick={() => { setShowAIModal(true); analyzePortfolio(stocks, marketPrices); }}
            className="bg-slate-900 rounded-[3rem] p-10 flex flex-col justify-between items-start text-left hover:bg-blue-600 transition-all duration-500 group overflow-hidden relative shadow-2xl shadow-slate-900/20"
          >
            <div className="bg-white/10 p-4 rounded-2xl group-hover:scale-110 transition-transform">
              <Sparkles className="text-blue-400 w-8 h-8" />
            </div>
            <div className="relative z-10">
              <h3 className="text-white text-2xl font-black uppercase italic tracking-tighter">Lancer l'audit <br /> Mirror AI</h3>
              <p className="text-slate-400 group-hover:text-blue-100 text-xs mt-2 font-medium">Analyse prédictive et conseils stratégiques.</p>
            </div>
          </button>
        </section>

        {/* LISTE ACTIFS */}
        <section className="space-y-6">
          <div className="flex justify-between items-end px-4 flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Positions Actuelles</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Géré en temps réel</p>
            </div>
            <button className="bg-white border border-slate-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 text-slate-900">
              <Plus size={14} /> Ajouter un actif
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks.map((stock) => {
              const currentPrice = marketPrices[stock.symbol] || stock.avgPrice;
              const gain = (currentPrice - stock.avgPrice) * stock.shares;
              const isPos = gain >= 0;
              return (
                <div key={stock.symbol} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 hover:shadow-2xl transition-all duration-500 group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:text-blue-600 transition-colors">
                        {stock.symbol}
                      </div>
                      <div>
                        <p className="font-black text-xl tracking-tight text-slate-900">{stock.symbol}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stock.shares} titres</p>
                      </div>
                    </div>
                    <button className="p-2 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-2xl font-black text-slate-900">{(stock.shares * currentPrice).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                    <p className={`text-sm font-bold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPos ? '+' : ''}{gain.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* MODAL IA AVEC FLIP CARDS */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 backdrop-blur-xl bg-slate-900/60 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl min-h-[70vh] max-h-[90vh] rounded-[2.5rem] md:rounded-[4rem] shadow-2xl overflow-hidden flex flex-col relative my-auto animate-in zoom-in duration-300 text-slate-900">
            <div className="p-8 md:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
                  <Sparkles className="text-white w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter text-slate-900">Audit Mirror AI</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Veille stratégique & Diagnostics</p>
                </div>
              </div>
              <button
                onClick={() => setShowAIModal(false)}
                className="p-3 bg-white rounded-full text-slate-400 hover:text-slate-900 transition-all shadow-sm"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-12">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="font-black text-slate-400 text-[10px] uppercase tracking-widest animate-pulse">Analyse des flux boursiers...</p>
                </div>
              ) : analysis ? (
                <>
                  {/* RÉSUMÉ IA */}
                  <div className="bg-slate-900 rounded-[3rem] p-10 md:p-12 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 text-white">
                      <BrainCircuit size={150} />
                    </div>
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-4 italic">Diagnostic Global</p>
                        <h4 className="text-4xl md:text-5xl font-black uppercase italic mb-4">{analysis.health}</h4>
                        <p className="text-slate-400 text-base leading-relaxed">{analysis.healthDesc}</p>
                      </div>
                      <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-8 border border-white/10 flex flex-col justify-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-2 italic">Projection à 3 mois</p>
                        <p className="text-4xl md:text-5xl font-black text-white tracking-tighter">{analysis.prediction}</p>
                        <p className="text-xs text-slate-400 italic mt-4">"{analysis.predictionDesc}"</p>
                      </div>
                    </div>
                  </div>

                  {/* FLASH ACTU */}
                  <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6 flex items-center gap-6">
                    <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg">
                      <Bell size={20} className="animate-bounce" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 italic">Flash Actu Marché</p>
                      <p className="font-bold text-slate-900 text-sm">{analysis.newsHighlight}</p>
                    </div>
                  </div>

                  {/* SIGNALS FLIP CARDS */}
                  <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic px-2">Recommandations & Opportunités</h5>
                    <div className="grid grid-cols-1 gap-8">
                      {analysis.signals.map((item, i) => (
                        <FlipCard key={i} item={item} />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-20 bg-rose-50 rounded-[3rem] border border-rose-100">
                  <AlertCircle className="mx-auto text-rose-500 w-12 h-12 mb-4" />
                  <p className="text-rose-900 font-bold">{aiError || "Une erreur est survenue lors de l'analyse."}</p>
                  <button onClick={() => analyzePortfolio(stocks, marketPrices)} className="mt-6 text-rose-600 font-black uppercase text-[10px] tracking-widest border-b-2 border-rose-200">Réessayer l'analyse</button>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center text-slate-400">
              <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" /> Intelligence artificielle Gemini 2.5 Flash
              </p>
              <button onClick={() => setShowAIModal(false)} className="text-[10px] font-black uppercase tracking-[0.3em] hover:text-slate-900 transition-all">
                Fermer l'audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * --- COMPOSANT : CARTE RETOURNABLE (FLIP CARD) ---
 */
function FlipCard({ item }: { item: AISignal }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="relative h-72 md:h-64 w-full cursor-pointer perspective-1000" onClick={() => setFlipped(!flipped)}>
      <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${flipped ? 'rotate-y-180' : ''}`}>

        {/* FACE AVANT (Résumé) */}
        <div className="absolute inset-0 backface-hidden bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-xl flex flex-col justify-between hover:border-blue-400 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-black text-3xl italic uppercase tracking-tighter text-slate-900">{item.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">{item.reason}</p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
              <Info size={20} />
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <span className={`px-8 py-4 font-black text-[10px] rounded-2xl uppercase tracking-widest border shadow-lg ${item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                (item.color === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100')
              }`}>
              {item.rec}
            </span>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Urgence : {item.urgency}</span>
          </div>
        </div>

        {/* FACE ARRIÈRE (Justification détaillée) */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900 rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-center border-2 border-blue-500 shadow-2xl shadow-blue-500/20 text-white">
          <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-6 italic">Justification Mirror AI</h5>
          <p className="text-base md:text-xl font-medium leading-relaxed italic text-slate-200">
            "{item.justification || item.reason}"
          </p>
          <div className="mt-8 flex items-center gap-3 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">
            <div className="w-10 h-px bg-blue-900"></div>
            Analyse sectorielle temps réel
          </div>
        </div>

      </div>
    </div>
  );
}