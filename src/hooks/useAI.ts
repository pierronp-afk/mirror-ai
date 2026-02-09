import { useState } from 'react';
import { Stock, MarketPrices, AIAnalysis } from '@/types';
import { buildGlobalPortfolioPrompt, buildIndividualStockPrompt, buildQuestionPrompt, getFinancialSentiment } from '@/lib/aiConfig';

export function useAI() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tradingDocs, setTradingDocs] = useState<string[]>([]);

  const analyzePortfolio = async (stocks: Stock[], marketPrices: MarketPrices) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // 1. Enrichissement Macro (News & Sentiment de TOUT le portefeuille)
      let macroNewsContext = "";
      if (stocks.length > 0) {
        // On récupère les actualités pour tous les titres du portefeuille
        const allSymbols = stocks.map(s => s.symbol);
        const newsPromises = allSymbols.map(async sym => {
          try {
            const res = await fetch(`/api/market-enrich?symbol=${sym}`);
            const data = await res.json();
            // On limite à un titre par ligne pour ne pas saturer le prompt si le portefeuille est gros
            return data.headlines?.length ? `[${sym}] ${data.headlines[0]}` : "";
          } catch { return ""; }
        });
        const allHeadlines = (await Promise.all(newsPromises)).filter(Boolean).join("\n");
        if (allHeadlines) {
          macroNewsContext = `\nACTUALITÉS RÉCENTES DU MARCHÉ (TOUS TITRES):\n${allHeadlines}`;
        }
      }

      // 2. Contexte Détaillé du Portefeuille
      const portfolioDetail = stocks.map(s => {
        const mPrice = marketPrices[s.symbol]?.price || 0;
        const hasPrice = mPrice > 0;
        const currentPrice = hasPrice ? mPrice : s.avgPrice;
        const gain = hasPrice ? (((currentPrice - s.avgPrice) / s.avgPrice) * 100) : 0;
        return `- ${s.symbol}: ${s.shares} titres @ ${s.avgPrice}€ (Actuel: ${hasPrice ? currentPrice + '€' : 'Sync pending'}, Gain: ${hasPrice ? gain.toFixed(2) + '%' : 'N/A'})`;
      }).join("\n");

      // Analyse GLOBALE (Macro)
      const portfolioContext = `DÉTAIL DU PORTEFEUILLE:\n${portfolioDetail}\n${macroNewsContext}`;
      const prompt = buildGlobalPortfolioPrompt(portfolioContext, tradingDocs.length > 0 ? tradingDocs : undefined);

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur IA");

      const jsonMatch = data.analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const globalData = JSON.parse(jsonMatch[0]);
        setAnalysis(prev => ({
          ...globalData,
          signals: prev?.signals || [], // On garde les signaux individuels déjà chargés
          lastUpdated: Date.now()
        }));
      }
    } catch (err: any) {
      console.error("Erreur global analysis:", err);
      setError("Impossible de générer l'analyse globale.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeStock = async (stock: Stock, marketPrice: number): Promise<any> => {
    try {
      // Enrichment for single stock
      let newsContext = "";
      try {
        const res = await fetch(`/api/market-enrich?symbol=${stock.symbol}`);
        const data = await res.json();
        const headlines = data.headlines?.join(". ") || "";
        if (headlines) {
          const sentiment = await getFinancialSentiment(headlines);
          newsContext = `Mood: ${sentiment.sentiment} (${sentiment.score}). News: ${headlines.slice(0, 300)}`;
        }
      } catch (e) { console.error("News enrichment failed", e); }

      const prompt = buildIndividualStockPrompt(
        stock.symbol,
        stock.name || stock.symbol,
        marketPrice,
        stock.shares,
        stock.avgPrice,
        newsContext
      );

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur IA");

      const jsonMatch = data.analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const newSignal = JSON.parse(jsonMatch[0]);
        // Normalisation for UI compatibility (rec vs advice)
        if (newSignal.rec && !newSignal.advice) newSignal.advice = newSignal.rec;

        setAnalysis(prev => {
          const currentSignals = prev?.signals || [];
          const index = currentSignals.findIndex(s => s.symbol === stock.symbol);
          const newSignals = [...currentSignals];
          if (index >= 0) newSignals[index] = newSignal;
          else newSignals.push(newSignal);

          return {
            ...prev,
            health: prev?.health || "Analyse en cours",
            healthDesc: prev?.healthDesc || "Mise à jour des signaux...",
            prediction: prev?.prediction || "---",
            predictionDesc: prev?.predictionDesc || "",
            opportunities: prev?.opportunities || [],
            scenarios: prev?.scenarios || [],
            balanceAdvice: prev?.balanceAdvice || "",
            forecast: prev?.forecast || [],
            signals: newSignals,
            lastUpdated: Date.now()
          } as AIAnalysis;
        });
        return newSignal;
      }
    } catch (err) {
      console.error("Erreur analyzeStock:", err);
      return null;
    }
  };

  const askQuestion = async (question: string): Promise<string> => {
    try {
      const portfolioContext = analysis
        ? `Santé: ${analysis.health}. Prévision: ${analysis.prediction}. Signaux: ${analysis.signals.map(s => `${s.symbol}: ${s.rec}`).join(', ')}`
        : undefined;

      const prompt = buildQuestionPrompt(question, portfolioContext);

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur IA");

      return data.analysis;
    } catch (err: unknown) {
      console.error("Erreur askQuestion:", err);
      return "Une erreur est survenue lors de la génération de la réponse.";
    }
  };

  const uploadTradingDocument = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      setTradingDocs(prev => [...prev, `Document: ${file.name}\n\n${text}`]);
      return true;
    } catch (err) {
      console.error("Erreur upload document:", err);
      return false;
    }
  };

  const clearTradingDocuments = () => {
    setTradingDocs([]);
  };

  return {
    analyzePortfolio,
    analyzeStock,
    askQuestion,
    uploadTradingDocument,
    clearTradingDocuments,
    analysis,
    isAnalyzing,
    error,
    hasTradingDocs: tradingDocs.length > 0,
  };
}