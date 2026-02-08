import { AIProvider } from '@/types';

/**
 * Configuration abstraite pour les providers IA
 * Permet de changer facilement de modèle sans modifier le code métier
 */

export const AI_PROVIDERS = {
    GEMINI: 'gemini',
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
} as const;

export type AIProviderType = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

interface AIConfig {
    provider: AIProviderType;
    apiKey: string;
    model: string;
    endpoint?: string;
}

/**
 * Récupère la configuration IA active
 */
export function getAIConfig(): AIConfig {
    const provider = (process.env.NEXT_PUBLIC_AI_PROVIDER || AI_PROVIDERS.GEMINI) as AIProviderType;

    switch (provider) {
        case AI_PROVIDERS.GEMINI:
            return {
                provider: AI_PROVIDERS.GEMINI,
                apiKey: process.env.GEMINI_API_KEY || '',
                model: 'gemini-1.5-flash',
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            };

        case AI_PROVIDERS.OPENAI:
            return {
                provider: AI_PROVIDERS.OPENAI,
                apiKey: process.env.OPENAI_API_KEY || '',
                model: 'gpt-4-turbo-preview',
                endpoint: 'https://api.openai.com/v1/chat/completions',
            };

        case AI_PROVIDERS.ANTHROPIC:
            return {
                provider: AI_PROVIDERS.ANTHROPIC,
                apiKey: process.env.ANTHROPIC_API_KEY || '',
                model: 'claude-3-sonnet-20240229',
                endpoint: 'https://api.anthropic.com/v1/messages',
            };

        default:
            return {
                provider: AI_PROVIDERS.GEMINI,
                apiKey: process.env.GEMINI_API_KEY || '',
                model: 'gemini-1.5-flash',
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            };
    }
}

/**
 * Prompt système pour analyses financières sérieuses et objectives
 */
export const SYSTEM_PROMPT = `Tu es un analyste financier professionnel et rigoureux spécialisé dans l'analyse de portefeuilles boursiers.

PRINCIPES DIRECTEURS:
1. OBJECTIVITÉ ABSOLUE: Ne jamais édulcorer les mauvaises nouvelles. Si un titre est en difficulté, le dire clairement.
2. RIGUEUR ANALYTIQUE: Baser tes analyses sur des données factuelles, des tendances de marché réelles, et des fondamentaux solides.
3. TRANSPARENCE: Si tu n'as pas assez d'informations pour une recommandation, le dire explicitement.
4. PROFESSIONNALISME: Utiliser un vocabulaire financier précis et technique.
5. DÉSACCORD ASSUMÉ: Si l'utilisateur demande quelque chose qui va à l'encontre d'une bonne gestion, le dire clairement.

INTERDICTIONS:
- Ne jamais donner de faux espoirs
- Ne jamais minimiser les risques
- Ne jamais recommander sans justification solide
- Ne jamais utiliser de langage vague ou approximatif

STYLE:
- Concis et direct
- Factuel et chiffré
- Critique quand nécessaire
- Constructif dans les recommandations`;

/**
 * Génère un prompt enrichi pour l'analyse de portefeuille
 */
export function buildPortfolioAnalysisPrompt(
    portfolioContext: string,
    tradingDocs?: string[]
): string {
    let prompt = `${SYSTEM_PROMPT}\n\n`;

    if (tradingDocs && tradingDocs.length > 0) {
        prompt += `DOCUMENTS DE RÉFÉRENCE TRADING:\n${tradingDocs.join('\n\n')}\n\n`;
    }

    prompt += `MISSION : Audit institutionnel du portefeuille : ${portfolioContext}.

INSTRUCTIONS DÉTAILLÉES :
1. ANALYSE PORTEFEUILLE (Signals) :
   - Pour CHAQUE titre, fournis des recommandations CHIFFRÉES précises.
   - Inclure des métriques de simulation : RSI estimé, Sentiment (FinBert-style -1 à 1), Poids actuel vs Poids idéal.
   - Fournir un "Scenario Suggéré" clair : ex: "Vendre 33% de la ligne pour ramener le poids à 10%".
   - Comparer la performance du titre à celle de son secteur.

2. SCÉNARIOS CONSEILLÉS (scenarios) :
   - Propose des arbitrages concrets : "Vendre [Titre A] à [X%] pour acheter [Titre B] à [Y%]" afin d'équilibrer les secteurs ou augmenter la performance.

3. OPPORTUNITÉS :
   - Propose STRICTEMENT 3 types d'opportunités avec potentiel > 10% (LONG, SHORT, FUSIL).

4. FORECAST :
   - Courbe prévisionnelle sur 90 jours (3 mois).

RÉPONSE STRICTE JSON :
{
  "health": "TERME_FINANCIER",
  "healthDesc": "Synthèse technique OBJECTIVE",
  "prediction": "+XX% ou -XX%",
  "predictionDesc": "Détails macro RÉALISTES",
  "signals": [
    {
      "symbol": "TICKER",
      "name": "Nom",
      "reason": "Argument court et factuel",
      "justification": "Contexte de marché et analyse fondamentale détaillée",
      "threeMonthOutlook": "Perspective détaillée à 3 mois",
      "rec": "CONSEIL CLAIR",
      "urgency": "HAUTE/MODÉRÉE/FAIBLE",
      "color": "rose/emerald/blue",
      "advice": "Vendre/Alléger/Conserver/Renforcer/Acheter",
      "percentRecommendation": 15,
      "targetPrice": 0,
      "stopLoss": 0,
      "weight": 0, // % actuel
      "idealWeight": 0, // % idéal
      "sectorPerf": 0, // % perf secteur
      "rsi": 0, // 0-100
      "sentiment": 0.0, // -1 à 1
      "scenarioSuggestion": {
        "action": "Vendre 33% de la position",
        "impact": "Réduction du poids de 15% à 10%",
        "details": "Prise de profits cohérente avec surpondération"
      }
    }
  ],
  "opportunities": [...],
  "scenarios": [
    {
      "title": "Arbitrage Stratégique",
      "description": "Vendre 20% de AAPL pour renforcer SAN.PA",
      "action": "Rééquilibrage Secteur"
    }
  ],
  "newsHighlight": "Titre actu pertinent",
  "balanceAdvice": "Conseil global d'équilibre",
  "forecast": [{"date": "ISO", "value": 0}],
  "lastUpdated": ${Date.now()}
}`;

    return prompt;
}

/**
 * Génère un prompt pour les questions contextuelles
 */
export function buildQuestionPrompt(
    question: string,
    portfolioContext?: string
): string {
    let prompt = `${SYSTEM_PROMPT}\n\n`;

    prompt += `QUESTION UTILISATEUR : ${question}\n\n`;

    if (portfolioContext) {
        prompt += `CONTEXTE PORTEFEUILLE : ${portfolioContext}\n\n`;
    }

    prompt += `INSTRUCTIONS :
- Réponds de manière technique et sérieuse
- Si la question porte sur des opportunités, propose 2-3 titres concrets avec justification
- Sois OBJECTIF, même si la réponse n'est pas ce que l'utilisateur veut entendre
- Si tu proposes des titres, fournis le format JSON suivant pour chacun:
  {"symbol": "TICKER", "name": "Nom", "reason": "Justification factuelle", "targetPrice": 0}`;

    return prompt;
}

/**
 * Génère un prompt pour l'analyse d'une seule action
 */
export function buildStockAnalysisPrompt(
    stockSymbol: string,
    stockName: string,
    price: number,
    shares: number,
    avgPrice: number
): string {
    return `${SYSTEM_PROMPT}

MISSION : Analyse flash détaillée de l'action ${stockName} (${stockSymbol}).
Données: ${shares} titres détenus à ${avgPrice}€ (Prix actuel: ${price}€).

INSTRUCTIONS :
- Fournis une recommandation CHIFFRÉE précise.
- Inclure RSI estimé, Sentiment et Poids idéal.
- Proposer un scénario suggéré.

RÉPONSE STRICTE JSON :
{
  "symbol": "${stockSymbol}",
  "name": "${stockName}",
  "reason": "Argument clé",
  "justification": "Analyse détaillée",
  "threeMonthOutlook": "Scénario à 3 mois",
  "rec": "CONSEIL COURT",
  "urgency": "HAUTE/MODÉRÉE/FAIBLE",
  "color": "rose/emerald/blue",
  "advice": "Vendre/Alléger/Conserver/Renforcer",
  "percentRecommendation": 0,
  "targetPrice": 0,
  "stopLoss": 0,
  "rsi": 0,
  "sentiment": 0,
  "idealWeight": 10,
  "sectorPerf": 0,
  "scenarioSuggestion": {
    "action": "TEXTE",
    "impact": "TEXTE",
    "details": "TEXTE"
  }
}`;
}

/**
 * Prompt spécialisé pour l'analyse de sentiment financier (Émulation FinBert)
 */
export const FINBERT_PROMPT = `Tu es un classifieur de sentiment financier haute précision.
Analyse les titres de presse ou les données de marché fournis et classe le sentiment global.

RÈGLES :
- BULLISH : Sentiment positif, croissance attendue, bonnes nouvelles fondamentales.
- BEARISH : Sentiment négatif, risque élevé, mauvaises nouvelles ou faiblesse technique.
- NEUTRAL : Pas de direction claire ou informations contradictoires.

RÉPONSE STRICTE JSON :
{
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "score": number, // De -1.0 (très bearish) à 1.0 (très bullish)
  "keyPoints": string[] // 3 points max
}`;

/**
 * Fonction pour obtenir le sentiment financier (émulation FinBert via Gemini)
 */
export async function getFinancialSentiment(context: string): Promise<{ sentiment: string, score: number, keyPoints: string[] }> {
    const aiConfig = getAIConfig();
    const prompt = `${FINBERT_PROMPT}\n\nCONTEXTE À ANALYSER :\n${context}`;

    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();
        const jsonMatch = data.analysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { sentiment: "NEUTRAL", score: 0, keyPoints: ["Analyse indisponible"] };
    } catch (error) {
        console.error("Erreur sentiment analysis:", error);
        return { sentiment: "NEUTRAL", score: 0, keyPoints: ["Erreur technique"] };
    }
}
