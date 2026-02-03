import { useState } from 'react';
import { Stock, MarketPrices, AIAnalysis } from '@/types';

export function useAI() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzePortfolio = async (stocks: Stock[], marketPrices: MarketPrices) => {
    setIsAnalyzing(true);
    setError(null);

    const portfolioContext = stocks.length > 0
      ? stocks.map(s => `${s.symbol}: ${s.shares} titres (Prix: ${marketPrices[s.symbol] || s.avgPrice}€)`).join(', ')
      : "Portefeuille vide.";

    const prompt = `
      MISSION : Expert Mirror AI. Audit complet du portefeuille : ${portfolioContext}.
      
      INSTRUCTIONS :
      - Analyse santé + conseils (Renforcer, Alléger, Conserver).
      - Identifie 2 opportunités hors portefeuille.
      - CHAQUE conseil doit avoir une justification textuelle courte mais percutante (max 150 caractères).

      RÉPONSE STRICTE JSON :
      {
        "health": "MOT",
        "healthDesc": "Synthèse",
        "prediction": "+XX%",
        "predictionDesc": "Tendance",
        "signals": [
          {
            "name": "Ticker",
            "reason": "Argument court",
            "justification": "Explication détaillée du 'Pourquoi' incluant l'actu ou les fondamentaux",
            "rec": "ACTION",
            "urgency": "HAUTE/MODÉRÉE/FAIBLE",
            "color": "rose/emerald/blue"
          }
        ],
        "newsHighlight": "Titre actu"
      }
    `;

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      const jsonMatch = data.analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) setAnalysis(JSON.parse(jsonMatch[0]) as AIAnalysis);
    } catch {
      setError("L'IA est momentanément indisponible.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { analyzePortfolio, analysis, isAnalyzing, error };
}