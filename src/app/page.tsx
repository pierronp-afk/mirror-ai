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
import AssetAllocation from '@/components/AssetAllocation';
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
import AuditMirrorAI from '@/components/AuditMirrorAI';
import { FlashActuMarche } from '@/components/FlashActuMarche';
import { OpportunitesSignificatives } from '@/components/OpportunitesSignificatives';

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

  // Currency State
  const [displayCurrency, setDisplayCurrency] = useState('EUR');
  const [forexRates, setForexRates] = useState<Record<string, number>>({});

  // Fetch Forex Rates on Mount
  useEffect(() => {
    const fetchForex = async () => {
      try {
        const res = await fetch('/api/market?type=forex');
        if (res.ok) {
          const rates = await res.json();
          setForexRates(rates);
        }
      } catch (err) {
        console.error('Failed to fetch forex rates:', err);
      }
    };
    fetchForex();
  }, []);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const tradingDocInputRef = React.useRef<HTMLInputElement>(null);

  // Récupération des données réelles du marché
  const stockSymbols = useMemo(() => [...stocks.map(s => s.symbol), 'OANDA:EUR_USD', 'FX:EURUSD'], [stocks]);

  // hook passif pour l'initialisation (sans auto-rafraîchissement agressif)
  const { prices: initialPrices } = useMarketData(stockSymbols);

  // Rafraîchissement automatique par lots de 15 titres / minute
  const handleMarketRefresh = useCallback((newPrices: MarketPrices) => {
    setLocalMarketPrices(prev => ({ ...prev, ...newPrices }));
  }, []);

  const { lastUpdate, isRefreshing, manualRefresh } = useMarketRefresh({
    symbols: stockSymbols,
    enabled: stocks.length > 0,
    onRefresh: handleMarketRefresh,
  });

  // Utiliser les prix locaux s'ils sont disponibles (fusionnés), sinon les prix initiaux
  const effectiveMarketPrices = useMemo(() => {
    return { ...initialPrices, ...localMarketPrices };
  }, [initialPrices, localMarketPrices]);

  // Taux de change EUR/USD (1 EUR = x USD)
  // Taux de change EUR/USD (1 EUR = x USD) - Legacy fallback, now using forexRates
  const eurUsdRate = forexRates['USD'] || effectiveMarketPrices['FX:EURUSD']?.price || effectiveMarketPrices['OANDA:EUR_USD']?.price || 1.18;

  // Helper to get exchange rate from Stock Currency -> Display Currency
  // Base is EUR.
  // Rate(EUR -> Target) = forexRates[Target]
  // Rate(Native -> Target) = Rate(EUR -> Target) / Rate(EUR -> Native)
  const getConversionRate = useCallback((stockSymbol: string) => {
    if (Object.keys(forexRates).length === 0) return 1;

    let nativeCurrency = 'USD'; // Default assumption if unknown
    if (stockSymbol.endsWith('.PA') || stockSymbol.endsWith('.DE') || stockSymbol.endsWith('.AS') || stockSymbol.endsWith('.MI') || stockSymbol.endsWith('.MC')) nativeCurrency = 'EUR';
    else if (stockSymbol.endsWith('.L')) nativeCurrency = 'GBP';
    else if (stockSymbol.endsWith('.T')) nativeCurrency = 'JPY';
    else if (stockSymbol.endsWith('.HK')) nativeCurrency = 'HKD';
    else if (stockSymbol.endsWith('.SW')) nativeCurrency = 'CHF';
    else if (stockSymbol.endsWith('.NS')) nativeCurrency = 'INR';
    else if (stockSymbol.endsWith('.KS')) nativeCurrency = 'KRW';
    // US stocks have no suffix

    // Check if display currency is the same as native
    if (nativeCurrency === displayCurrency) return 1;

    const rateEurToNative = nativeCurrency === 'EUR' ? 1 : (forexRates[nativeCurrency] || 1);
    const rateEurToTarget = displayCurrency === 'EUR' ? 1 : (forexRates[displayCurrency] || 1);

    return rateEurToTarget / rateEurToNative;
  }, [forexRates, displayCurrency]);

  if (Object.keys(effectiveMarketPrices).length > 0) {
    console.log(`📊 Rate Debug: FX: ${effectiveMarketPrices['FX:EURUSD']?.price}, OANDA: ${effectiveMarketPrices['OANDA:EUR_USD']?.price}, Using: ${eurUsdRate}`);
  }


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
    return stocks.reduce((acc, s) => {
      const price = effectiveMarketPrices[s.symbol]?.price || s.avgPrice;
      const rate = getConversionRate(s.symbol);
      return acc + (s.shares * price * rate);
    }, 0);
  }, [stocks, effectiveMarketPrices, getConversionRate]);

  const totalCost = useMemo(() => {
    return stocks.reduce((acc, s) => acc + (s.shares * s.avgPrice), 0);
  }, [stocks]);

  const totalGain = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // L'allocation sectorielle est maintenant gérée par le composant AssetAllocation

  const performanceStats = useMemo(() => {
    if (stocks.length === 0) return null;
    let best = stocks[0];
    let worst = stocks[0];
    let maxGain = -Infinity;
    let minGain = Infinity;

    stocks.forEach(s => {
      const currentPrice = effectiveMarketPrices[s.symbol]?.price || s.avgPrice;
      // We calculate gain percentage in NATIVE currency to be accurate to the asset performance
      // Or converted? Percentage is the same regardless of currency (assuming conversion rate is constant which it isn't strictly, but good enough)
      // Let's use native calculation for performance signal.

      const gainP = s.avgPrice > 0 ? ((currentPrice - s.avgPrice) / s.avgPrice) * 100 : 0;
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

            {/* Currency Selector */}
            <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 mr-2">
              {['EUR', 'USD', 'GBP', 'JPY', 'CHF'].map(curr => (
                <button
                  key={curr}
                  onClick={() => setDisplayCurrency(curr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${displayCurrency === curr ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {curr}
                </button>
              ))}
            </div>
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

        {/* FLASH ACTU MARCHÉ */}
        <FlashActuMarche />

        {/* KPI DASHBOARD - NEW 4 CAPSULES */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Capsule 1: Valeur Totale */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-white relative overflow-hidden group hover:shadow-2xl transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
              <Activity size={100} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 italic">Portfolio</p>
            <div className="flex flex-col gap-1 relative z-10">
              <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">
                {totalValue.toLocaleString('fr-FR', { style: 'currency', currency: displayCurrency, maximumFractionDigits: 0 })}
              </h2>
              <div className={`flex items-center gap-1 text-sm font-bold ${totalGain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {totalGain >= 0 ? '+' : ''}{totalGain.toLocaleString('fr-FR', { style: 'currency', currency: displayCurrency, maximumFractionDigits: 0 })}
                <span className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] ${totalGain >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  {totalGain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Capsule 2: Top Performance */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-white flex flex-col justify-between group hover:shadow-2xl transition-all">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic mb-2">Top Performer</p>
              {performanceStats ? (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-black tracking-tighter text-slate-900">{performanceStats.best.symbol}</h4>
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <ArrowUpRight size={16} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-emerald-500 mt-1">+{performanceStats.maxGain.toFixed(1)}%</p>
                </>
              ) : (
                <div className="h-full flex items-center text-slate-300 font-bold italic text-sm">---</div>
              )}
            </div>
          </div>

          {/* Capsule 3: Audit CTA */}
          <button
            onClick={async () => {
              setShowAIModal(true);
              // 1. Analyse Macro
              await analyzePortfolio(stocks, effectiveMarketPrices);

              // 2. Utilisé un délai pour les analyses micro si besoin, 
              // mais pour l'audit global, on a déjà un health score approximatif via le macro ou analyse rapide
              // On lance quand même le détail pour les actions
              const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

              for (const s of stocks) {
                const price = effectiveMarketPrices[s.symbol]?.price || s.avgPrice;
                const rate = getConversionRate(s.symbol);
                const convertedPrice = price * rate;
                const stockValue = s.shares * convertedPrice;
                const weight = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;

                try {
                  await analyzeStock(s, price, weight, totalValue);
                  await delay(2000); // Délai réduit à 2s pour fluidifier un peu
                } catch (err) {
                  console.error(err);
                }
              }
            }}
            className="bg-slate-900 rounded-[2.5rem] p-8 flex flex-col justify-between items-start text-left hover:bg-blue-600 transition-all duration-500 group overflow-hidden relative shadow-2xl shadow-slate-900/20"
          >
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
              <Sparkles size={80} className="text-white" />
            </div>
            <div className="relative z-10 w-full h-full flex flex-col justify-between">
              <div className="bg-white/10 p-3 rounded-2xl w-fit mb-4">
                <Sparkles className="text-blue-400 w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white text-xl font-black uppercase italic tracking-tighter leading-tight">Lancer<br />Audit</h3>
                <p className="text-slate-400 group-hover:text-blue-100 text-[10px] mt-1 font-medium">Analyse IA</p>
              </div>
            </div>
          </button>

          {/* Capsule 4: Découverte (Anchor to Opportunities) */}
          <button
            onClick={() => document.getElementById('opportunities')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-white flex flex-col justify-between group hover:shadow-2xl transition-all"
          >
            <div className="w-full flex justify-between items-start">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Opportunités</p>
              <div className="bg-purple-50 text-purple-600 p-2 rounded-xl group-hover:bg-purple-100 transition-colors">
                <Target size={20} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Découvrir</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-1">Signaux IA &rarr;</p>
            </div>
          </button>
        </section>

        {/* ANALYTICS SECTION (Stacked for better UX) */}
        <section className="flex flex-col gap-10">
          {/* ALLOCATION SECTORIELLE */}
          <div className="w-full">
            <AssetAllocation
              stocks={stocks}
              marketPrices={effectiveMarketPrices}
              eurUsdRate={eurUsdRate}
            />
          </div>

          {/* GRAPHIQUE DE PILOTAGE */}
          {/* GRAPHIQUE DE PILOTAGE */}
          <div className="w-full">
            <PortfolioChart forecast={analysis?.forecast} currentValue={totalValue} />
          </div>

          {/* OPPORTUNITES SECTION */}
          <div id="opportunities" className="w-full">
            <OpportunitesSignificatives />
          </div>
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
                  exchangeRate={getConversionRate(stock.symbol)}
                  displayCurrency={displayCurrency}
                  portfolioTotalValue={totalValue}
                  allStocks={stocks}
                  allMarketPrices={effectiveMarketPrices}
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
                          const rate = getConversionRate(currentStock.symbol);
                          const convertedPrice = marketData.c * rate;
                          const stockValue = currentStock.shares * convertedPrice;
                          const weight = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;
                          await analyzeStock(currentStock, marketData.c, weight, totalValue);
                        }
                      }
                    } catch (err) {
                      console.error('Erreur refresh:', err);
                    }
                  }}
                />
              ))}
          </div>


        </section>
      </main>

      {/* MODAL IA AVEC FLIP CARDS */}
      {showAIModal && (
        <AuditMirrorAI
          portfolio={stocks}
          signals={analysis?.signals || []}
          totalValue={totalValue}
          onClose={() => setShowAIModal(false)}
        />
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
