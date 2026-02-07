"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAI } from '@/hooks/useAI';
import { useMarketData } from '@/hooks/useMarketData';
import { useMarketRefresh } from '@/hooks/useMarketRefresh';
import { usePortfolio } from '@/hooks/usePortfolio';
import { Stock, AISignal, MarketPrices } from '@/types';
import AddStockModal from '@/components/AddStockModal';
import OpportunitiesSection from '@/components/OpportunitiesSection';
import PortfolioChart from '@/components/PortfolioChart';
import {
  TrendingUp, TrendingDown, Plus, Trash2, BrainCircuit,
  Sparkles, AlertCircle, CheckCircle2, Activity, Bell, X, Info, FileText, Upload, Clock, Target, Rocket,
  PieChart as PieChartIcon, BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import StockCard from '@/components/StockCard';

// Les interfaces & types sont maintenant importés depuis @/types

/**
 * --- LOGIQUE DES HOOKS ---
 * Les hooks réels sont importés depuis @/hooks
 */

/**
 * --- COMPOSANT PRINCIPAL ---
 */

export default function Dashboard() {
  const { stocks, addStock, removeStock, updateStock, updateStockQuantity, setStocks, loading: portfolioLoading } = usePortfolio();
  const { user, loading: authLoading, authError, loginAnonymously, loginWithGoogle, logout } = useAuth();
  const { analyzePortfolio, analyzeStock, askQuestion, uploadTradingDocument, hasTradingDocs, analysis, isAnalyzing, error: aiError } = useAI();

  const [showAIModal, setShowAIModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [localMarketPrices, setLocalMarketPrices] = useState<MarketPrices>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const tradingDocInputRef = React.useRef<HTMLInputElement>(null);

  // Récupération des données réelles du marché
  const stockSymbols = useMemo(() => [...stocks.map(s => s.symbol), 'OANDA:EUR_USD'], [stocks]);
  const { prices: marketPrices } = useMarketData(stockSymbols);

  // Rafraîchissement automatique toutes les 15 minutes
  const handleMarketRefresh = useCallback((newPrices: MarketPrices) => {
    setLocalMarketPrices(newPrices);
  }, []);

  const { lastUpdate, isRefreshing, manualRefresh } = useMarketRefresh({
    symbols: stockSymbols,
    enabled: stocks.length > 0,
    onRefresh: handleMarketRefresh,
  });

  // Utiliser les prix locaux s'ils sont disponibles, sinon les prix du hook
  const effectiveMarketPrices = Object.keys(localMarketPrices).length > 0 ? localMarketPrices : marketPrices;

  // Taux de change EUR/USD (1 EUR = x USD)
  // Si OANDA:EUR_USD = 1.08, alors 1 $ = 1 / 1.08 €
  const eurUsdRate = effectiveMarketPrices['OANDA:EUR_USD']?.price || 1.08;


  const handleAddStock = (symbol: string, shares: number, avgPrice: number, name?: string) => {
    addStock({ symbol, shares, avgPrice, name });
  };

  const handleRemoveStock = (symbol: string) => {
    removeStock(symbol);
  };

  const handleUpdateAvgPrice = (symbol: string, newPrice: number) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock && updateStock) {
      updateStock(symbol, stock.shares, newPrice, stock.name);
    }
  };

  // Sync zero-price stocks with market prices once loaded
  useEffect(() => {
    if (portfolioLoading) return;

    const stocksToSync = stocks.filter(s =>
      (s.avgPrice === 0 || !s.avgPrice) &&
      effectiveMarketPrices[s.symbol]?.price > 0
    );

    if (stocksToSync.length > 0) {
      stocksToSync.forEach(s => {
        const marketPrice = effectiveMarketPrices[s.symbol].price;
        if (updateStock) {
          console.log(`Syncing price for ${s.symbol}: ${marketPrice}`);
          updateStock(s.symbol, s.shares, marketPrice, s.name);
        }
      });
    }
  }, [stocks, effectiveMarketPrices, portfolioLoading, updateStock]);

  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setLoginError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import-pdf', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Échec de l\'analyse du PDF');
      }

      const data = await res.json();
      const importedStocks = data.stocks as { symbol: string, name: string, shares: number, sector?: string }[];

      if (importedStocks && importedStocks.length > 0) {
        const symbolsToFetch = importedStocks.map(s => s.symbol);
        const pricesRes = await Promise.all(
          symbolsToFetch.map(async (s) => {
            try {
              const r = await fetch(`/api/market?symbol=${s}`);
              if (!r.ok) return { symbol: s, price: 0 };
              const d = await r.json();
              return { symbol: s, price: d.c || 0 };
            } catch {
              return { symbol: s, price: 0 };
            }
          })
        );

        const newMarketPrices = Object.fromEntries(pricesRes.map(p => [p.symbol, p.price]));

        const updated = importedStocks
          .filter(s => s.symbol && s.symbol.trim() !== "" && !s.symbol.includes("?") && s.symbol.toUpperCase() !== "UNKNOWN")
          .map(imported => {
            const price = newMarketPrices[imported.symbol] || 0;
            return {
              symbol: imported.symbol.toUpperCase(),
              shares: imported.shares,
              avgPrice: price,
              name: imported.name || imported.symbol,
              sector: imported.sector
            };
          });

        setStocks(updated);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setLoginError("Erreur lors de l'import PDF : " + err.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalValue = useMemo(() => {
    return stocks.reduce((acc, s) => acc + (s.shares * (effectiveMarketPrices[s.symbol]?.price || s.avgPrice)), 0);
  }, [stocks, effectiveMarketPrices]);

  const totalCost = useMemo(() => {
    return stocks.reduce((acc, s) => acc + (s.shares * s.avgPrice), 0);
  }, [stocks]);

  const totalGain = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // Calcul de l'allocation sectorielle (Manuelle pour l'instant)
  const sectorMapping: Record<string, string> = {
    'AAPL': 'Technologie', 'MSFT': 'Technologie', 'NVDA': 'Semi-conducteurs',
    'GOOGL': 'Services Comm.', 'GOOG': 'Services Comm.', 'AMZN': 'Conso. Discrétionnaire',
    'META': 'Services Comm.', 'TSLA': 'Automobile', 'MC.PA': 'Luxe',
    'OR.PA': 'Luxe', 'TTE.PA': 'Énergie', 'AIR.PA': 'Aéronautique',
    'SAN.PA': 'Santé', 'BNP.PA': 'Banque', 'GLE.PA': 'Banque',
    'ASML': 'Semi-conducteurs', 'SAP': 'Technologie'
  };

  const allocationData = useMemo(() => {
    const sectors: Record<string, number> = {};
    stocks.forEach(s => {
      const sector = s.sector || sectorMapping[s.symbol.toUpperCase()] || 'Autres';
      const value = s.shares * (effectiveMarketPrices[s.symbol]?.price || s.avgPrice);
      sectors[sector] = (sectors[sector] || 0) + value;
    });
    return Object.entries(sectors).map(([name, value]) => ({ name, value }));
  }, [stocks, effectiveMarketPrices]);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  const performanceStats = useMemo(() => {
    if (stocks.length === 0) return null;
    let best = stocks[0];
    let worst = stocks[0];
    let maxGain = -Infinity;
    let minGain = Infinity;

    stocks.forEach(s => {
      const current = effectiveMarketPrices[s.symbol]?.price || s.avgPrice;
      const gainP = ((current - s.avgPrice) / s.avgPrice) * 100;
      if (gainP > maxGain) { maxGain = gainP; best = s; }
      if (gainP < minGain) { minGain = gainP; worst = s; }
    });

    return { best, worst, maxGain, minGain };
  }, [stocks, effectiveMarketPrices]);

  if (authLoading || portfolioLoading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Initialisation Mirror AI</p>
      </div>
    </div>
  );

  if (!user) {
    const handleGoogleLogin = async () => {
      setIsLoggingIn(true);
      setLoginError(null);
      try {
        // La redirection va se faire automatiquement
        await loginWithGoogle();
      } catch (error: any) {
        setLoginError('Erreur de connexion. Veuillez réessayer.');
        setIsLoggingIn(false);
      }
    };

    const handleAnonymousLogin = async () => {
      setIsLoggingIn(true);
      setLoginError(null);
      try {
        await loginAnonymously();
      } catch (error) {
        setLoginError('Erreur de connexion anonyme. Veuillez réessayer.');
        setIsLoggingIn(false);
      }
    };

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center">
        <div className="bg-blue-600 p-5 rounded-[2rem] mb-8 shadow-2xl shadow-blue-200">
          <BrainCircuit className="text-white w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase italic mb-4">Mirror<span className="text-blue-600">AI</span></h1>
        <p className="text-slate-500 mb-8 max-w-sm">Connectez-vous pour commencer à tracker votre patrimoine avec l&apos;aide de l&apos;IA.</p>

        {authError && (
          <div className="mb-6 bg-amber-50 border-2 border-amber-300 text-amber-900 px-6 py-4 rounded-2xl text-sm font-bold max-w-2xl">
            <p className="font-black text-base mb-2">⚠️ Configuration Firebase requise</p>
            <p className="mb-3">{authError}</p>
            <a
              href="https://console.firebase.google.com/project/mirror-intelligence-c68c9/authentication/providers"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors text-xs font-black uppercase"
            >
              Ouvrir Firebase Console
            </a>
          </div>
        )}

        {loginError && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 px-6 py-3 rounded-2xl text-sm font-bold max-w-md">
            {loginError}
          </div>
        )}

        <div className="space-y-4 w-full max-w-md">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full bg-white text-slate-900 px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-xl shadow-slate-200 active:scale-95 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {isLoggingIn ? 'Connexion...' : 'Continuer avec Google'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#F8FAFC] px-4 text-slate-400 font-bold tracking-widest">ou</span>
            </div>
          </div>

          <button
            onClick={handleAnonymousLogin}
            disabled={isLoggingIn}
            className="w-full bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? 'Connexion...' : 'Démarrer l\'expérience'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic text-slate-900">Mirror<span className="text-blue-600">AI</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <button
                onClick={manualRefresh}
                disabled={isRefreshing}
                className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
              {/* Tooltip avec temps restant */}
              <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                <p className="font-bold mb-1">
                  {isRefreshing ? '⏳ Actualisation en cours...' : '🔄 Actualisation marché'}
                </p>
                <p className="text-slate-300 text-[10px]">
                  Dernière mise à jour: {new Date(lastUpdate).toLocaleTimeString('fr-FR')}
                </p>
                <p className="text-slate-300 text-[10px] mt-1">
                  Auto-refresh toutes les 15 min
                </p>
              </div>
            </div>
            <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none truncate max-w-[150px]">
                  {user.isAnonymous ? 'Anonyme' : (user.displayName || user.email?.split('@')[0] || 'Utilisateur')}
                </p>
                <button
                  onClick={() => logout()}
                  className="text-[9px] font-bold uppercase tracking-tighter text-rose-500 hover:text-rose-600 transition-colors"
                >
                  Déconnexion
                </button>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="avatar" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-10 space-y-10">
        {loginError && (
          <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] flex justify-between items-center animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-4">
              <div className="bg-rose-500 p-2 rounded-xl text-white">
                <AlertCircle size={20} />
              </div>
              <p className="text-sm font-bold text-rose-900">{loginError}</p>
            </div>
            <button onClick={() => setLoginError(null)} className="text-rose-400 hover:text-rose-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        )}

        {/* KPI DASHBOARD */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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

          <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-slate-200/40 border border-white flex flex-col justify-between group">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Top Performance</p>
            {performanceStats ? (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-2xl font-black tracking-tighter text-slate-900">{performanceStats.best.symbol}</h4>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                <p className="text-3xl font-black text-emerald-500">+{performanceStats.maxGain.toFixed(1)}%</p>
                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{performanceStats.best.name}</p>
              </div>
            ) : (
              <p className="text-slate-300 font-bold italic">Aucune donnée</p>
            )}
          </div>

          <button
            onClick={() => { setShowAIModal(true); analyzePortfolio(stocks, effectiveMarketPrices); }}
            className="bg-slate-900 rounded-[3rem] p-10 flex flex-col justify-between items-start text-left hover:bg-blue-600 transition-all duration-500 group overflow-hidden relative shadow-2xl shadow-slate-900/20"
          >
            <div className="bg-white/10 p-4 rounded-2xl group-hover:scale-110 transition-transform">
              <Sparkles className="text-blue-400 w-8 h-8" />
            </div>
            <div className="relative z-10">
              <h3 className="text-white text-2xl font-black uppercase italic tracking-tighter">Lancer l&apos;audit <br /> Mirror AI</h3>
              <p className="text-slate-400 group-hover:text-blue-100 text-xs mt-2 font-medium">Analyse prédictive et conseils stratégiques.</p>
            </div>
          </button>
        </section>

        {/* ANALYTICS SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ALLOCATION SECTORIELLE */}
          <div className="bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/40 border border-white">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Allocation Actifs</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Par secteur d&apos;activité</p>
              </div>
              <PieChartIcon className="text-blue-600" size={24} />
            </div>
            <div className="h-[250px] w-full flex items-center justify-center">
              {allocationData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                      itemStyle={{ fontWeight: '800', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-300 font-bold italic">Portefeuille vide</p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              {allocationData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[9px] font-black uppercase text-slate-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GRAPHIQUE DE PILOTAGE */}
          <PortfolioChart forecast={analysis?.forecast} currentValue={totalValue} />
        </section>

        {/* LISTE ACTIFS */}
        <section className="space-y-6">
          <div className="flex justify-between items-end px-4 flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Positions Actuelles</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Géré en temps réel</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                onChange={handleImportPDF}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="bg-white border border-slate-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 text-blue-600 disabled:opacity-50"
              >
                {isImporting ? (
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : <Upload size={14} />}
                Importer PDF
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2 text-white"
              >
                <Plus size={14} /> Ajouter un actif
              </button>
            </div>
          </div>

          {/* TRI DES CARTES PAR ACTION ET URGENCE */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks
              .slice()
              .sort((a, b) => {
                const aSignal = analysis?.signals.find(s => s.symbol === a.symbol);
                const bSignal = analysis?.signals.find(s => s.symbol === b.symbol);

                // Ordre de priorité: Alléger/Vendre (1) > Renforcer/Acheter (2) > Conserver (3)
                const getPriority = (signal?: AISignal) => {
                  if (!signal?.advice) return 3;
                  if (signal.advice === "Vendre" || signal.advice === "Alléger") return 1;
                  if (signal.advice === "Renforcer" || signal.advice === "Acheter") return 2;
                  return 3; // Conserver
                };

                const aP = getPriority(aSignal);
                const bP = getPriority(bSignal);

                if (aP !== bP) return aP - bP;

                // Tri secondaire par urgence
                const urgencyValue = (signal?: AISignal) => {
                  if (!signal?.urgency) return 0;
                  if (signal.urgency === "HAUTE") return 3;
                  if (signal.urgency === "MODÉRÉE") return 2;
                  return 1; // FAIBLE
                };

                return urgencyValue(bSignal) - urgencyValue(aSignal);
              })
              .map((stock) => (
                <StockCard
                  key={stock.symbol}
                  stock={stock}
                  marketData={effectiveMarketPrices[stock.symbol]}
                  aiSignal={analysis?.signals.find(s => s.symbol === stock.symbol)}
                  exchangeRate={eurUsdRate}
                  onRemove={handleRemoveStock}
                  onUpdateStock={updateStock}
                  onRefresh={async (symbol) => {
                    try {
                      // 1. Données de marché
                      const res = await fetch(`/api/market?symbol=${symbol}`);
                      let marketData: { c: number; d: number; dp: number } | null = null;

                      if (res.ok) {
                        marketData = await res.json();
                        setLocalMarketPrices(prev => ({
                          ...prev,
                          [symbol]: {
                            price: marketData?.c || 0,
                            change: marketData?.d || 0,
                            changePercent: marketData?.dp || 0
                          }
                        }));
                      }

                      // 2. Profil Entreprise (Nom complet)
                      const currentStock = stocks.find(s => s.symbol === symbol);

                      if (currentStock) {
                        // Si le nom est identique au symbole (par défaut), on tente de récupérer le vrai nom
                        if (!currentStock.name || currentStock.name === symbol || currentStock.name.toUpperCase() === symbol.toUpperCase()) {
                          const resProfile = await fetch(`/api/market?symbol=${symbol}&type=profile`);
                          if (resProfile.ok) {
                            const profile = await resProfile.json();
                            if (profile.name) {
                              // Mise à jour persistante du nom via setStocks (qui est syncStocks)
                              const updatedStocks = stocks.map(s => s.symbol === symbol ? { ...s, name: profile.name, logo: profile.logo } : s);
                              setStocks(updatedStocks);

                              // Mise à jour de la ref locale pour l'analyse
                              currentStock.name = profile.name;
                            }
                          }
                        }

                        // 3. Analyse IA spécifique
                        if (marketData && analyzeStock) {
                          const isUS = !currentStock.symbol.includes('.');
                          const priceEur = isUS ? (marketData.c / eurUsdRate) : marketData.c;
                          await analyzeStock(currentStock, priceEur);
                        }
                      }
                    } catch (err) {
                      console.error('Erreur refresh:', err);
                    }
                  }}
                />
              ))}
          </div>

          {/* OPPORTUNITÉS */}
          {/* OPPORTUNITÉS */}
          {analysis?.opportunities && analysis.opportunities.length > 0 ? (
            <OpportunitiesSection opportunities={analysis.opportunities} />
          ) : (
            <div className="mt-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4 opacity-50">
              <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Module Opportunités en attente</p>
              <button
                onClick={() => setShowAIModal(true)}
                className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] tracking-widest hover:text-blue-600 transition-colors"
              >
                <Sparkles size={14} /> Lancer l'audit pour détecter des opportunités
              </button>
            </div>
          )}
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
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Veille stratégique &amp; Diagnostics</p>
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
              <div className="bg-blue-600/5 border border-blue-600/10 rounded-[2rem] p-6 mb-8 flex flex-col gap-4">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">Poser une question à Mirror AI</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ex: Quelles opportunités sur le secteur de la tech ?"
                    className="flex-1 bg-white border border-slate-200 rounded-2xl px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-800"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && question.trim() && !isAsking) {
                        setIsAsking(true);
                        const ans = await askQuestion(question);
                        setChatHistory(prev => [{ q: question, a: ans }, ...prev]);
                        setQuestion("");
                        setIsAsking(false);
                      }
                    }}
                  />
                  <button
                    disabled={isAsking || !question.trim()}
                    onClick={async () => {
                      setIsAsking(true);
                      const ans = await askQuestion(question);
                      setChatHistory(prev => [{ q: question, a: ans }, ...prev]);
                      setQuestion("");
                      setIsAsking(false);
                    }}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {isAsking ? "..." : "Interroger"}
                  </button>
                </div>

                {chatHistory.length > 0 && (
                  <div className="mt-4 space-y-4 max-h-60 overflow-y-auto pr-2">
                    {chatHistory.map((chat, i) => (
                      <div key={i} className="bg-white/50 border border-slate-100 rounded-2xl p-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Q: {chat.q}</p>
                        <p className="text-xs text-slate-700 leading-relaxed italic">&quot;{chat.a}&quot;</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                        <p className="text-xs text-slate-400 italic mt-4">&quot;{analysis.predictionDesc}&quot;</p>
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
                        <RecommendationCard key={i} item={item} />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-20 bg-rose-50 rounded-[3rem] border border-rose-100">
                  <AlertCircle className="mx-auto text-rose-500 w-12 h-12 mb-4" />
                  <p className="text-rose-900 font-bold">{aiError || "Une erreur est survenue lors de l&apos;analyse."}</p>
                  <button onClick={() => analyzePortfolio(stocks, marketPrices)} className="mt-6 text-rose-600 font-black uppercase text-[10px] tracking-widest border-b-2 border-rose-200">Réessayer l&apos;analyse</button>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center text-slate-400">
              <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" /> Intelligence artificielle Gemini 1.5 Flash
              </p>
              <button onClick={() => setShowAIModal(false)} className="text-[10px] font-black uppercase tracking-[0.3em] hover:text-slate-900 transition-all">
                Fermer l&apos;audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJOUT D'ACTION */}
      {showAddModal && (
        <AddStockModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddStock}
          exchangeRate={eurUsdRate}
        />
      )}
    </div>
  );
}

/**
 * --- COMPOSANT : CARTE RETOURNABLE (RECOMMENDATION CARD) ---
 */
function RecommendationCard({ item }: { item: AISignal }) {
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
            &quot;{item.justification || item.reason}&quot;
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