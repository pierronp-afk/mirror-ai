import { useState } from 'react';
import { Stock, MarketPrices, AIAnalysis } from '@/types';
import { buildPortfolioAnalysisPrompt, buildQuestionPrompt, buildStockAnalysisPrompt } from '@/lib/aiConfig';

export function useAI() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tradingDocs, setTradingDocs] = useState<string[]>([]);

  const analyzePortfolio = async (stocks: Stock[], marketPrices: MarketPrices) => {
    setIsAnalyzing(true);
    setError(null);

    const portfolioContext = stocks.length > 0
      ? stocks.map(s => {
        const currentPrice = marketPrices[s.symbol]?.price || s.avgPrice;
        const gain = ((currentPrice - s.avgPrice) / s.avgPrice) * 100;
        return `${s.symbol} (${s.name || 'N/A'}): ${s.shares} titres @ ${s.avgPrice}€ (Actuel: ${currentPrice}€, ${gain >= 0 ? '+' : ''}${gain.toFixed(2)}%)`;
      }).join(', ')
      : "Portefeuille vide.";

    const prompt = buildPortfolioAnalysisPrompt(portfolioContext, tradingDocs.length > 0 ? tradingDocs : undefined);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || "L'IA est momentanément indisponible.");
        return;
      }

      // Extraire le JSON de la réponse
      const jsonMatch = data.analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedAnalysis = JSON.parse(jsonMatch[0]) as AIAnalysis;
        parsedAnalysis.lastUpdated = Date.now();
        setAnalysis(parsedAnalysis);
      } else {
        setError("L'IA n'a pas renvoyé le format attendu.");
      }
    } catch (err: unknown) {
      console.error("Erreur hook useAI:", err);
      setError("Erreur de connexion avec le serveur.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeStock = async (stock: Stock, marketPrice: number): Promise<any> => {
    try {
      const prompt = buildStockAnalysisPrompt(
        stock.symbol,
        stock.name || stock.symbol,
        marketPrice,
        stock.shares,
        stock.avgPrice
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

        // Mettre à jour l'état local si une analyse existe déjà
        if (analysis) {
          setAnalysis(prev => {
            if (!prev) return null;
            const exists = prev.signals.find(s => s.symbol === stock.symbol);
            let newSignals;
            if (exists) {
              newSignals = prev.signals.map(s => s.symbol === stock.symbol ? newSignal : s);
            } else {
              newSignals = [...prev.signals, newSignal];
            }
            return { ...prev, signals: newSignals };
          });
        }

        return newSignal;
      }
      return null;
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