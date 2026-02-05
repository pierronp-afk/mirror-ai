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
      MISSION : Expert Mirror AI. Audit institutionnel du portefeuille : ${portfolioContext}.
      
      INSTRUCTIONS :
      - Rapporte la santé globale et une projection à 3 mois réaliste (même si négative).
      - Pour CHAQUE titre du portefeuille, génère un signal détaillé conforme au format JSON ci-dessous.
      - Ajoute une section 'opportunities' avec 3-4 titres hors portefeuille (LONG, MEDIUM, SHORT, FUSIL).
      - Inclus une courbe prévisionnelle ('forecast') sur 30 jours (tableau d'objets {date: string, value: number}).

      RÉPONSE STRICTE JSON :
      {
        "health": "TERME_FINANCIER",
        "healthDesc": "Synthèse technique",
        "prediction": "+XX%",
        "predictionDesc": "Détails macro",
        "signals": [
          {
            "symbol": "TICKER",
            "name": "Nom",
            "reason": "Argument court",
            "justification": "Détails fondamentaux / actu",
            "rec": "CONSEIL",
            "urgency": "HAUTE/MODÉRÉE/FAIBLE",
            "color": "rose/emerald/blue",
            "advice": "Vendre/Renforcer/...",
            "targetPrice": 0,
            "stopLoss": 0
          }
        ],
        "opportunities": [
            {
                "symbol": "TICKER",
                "name": "Nom",
                "horizon": "LONG/MEDIUM/SHORT/FUSIL",
                "reason": "Pourquoi ce titre ?",
                "priceMax": 0,
                "priceExit": 0
            }
        ],
        "newsHighlight": "Titre actu",
        "forecast": [{"date": "ISO", "value": 0}]
      }
    `;

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

      const jsonMatch = data.analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setAnalysis(JSON.parse(jsonMatch[0]) as AIAnalysis);
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

  const askQuestion = async (question: string): Promise<string> => {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `QUESTION UTILISATEUR : ${question}\n\nContexte portefeuille : ${JSON.stringify(analysis)}\n\nRéponds de manière technique et sérieuse. Si pertinent, propose des titres en lien.`
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur IA");
      return data.analysis;
    } catch (err: unknown) {
      console.error("Erreur askQuestion:", err);
      return "Une erreur est survenue lors de la génération de la réponse.";
    }
  };

  return { analyzePortfolio, askQuestion, analysis, isAnalyzing, error };
}