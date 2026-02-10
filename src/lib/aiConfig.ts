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
            const modelType = process.env.GEMINI_MODEL_TYPE || 'flash';
            // Use 'latest' aliases for stability and auto-updates, or specific versions if needed.
            // 'gemini-1.5-flash' alias was causing 404/500 errors with v1beta recently, using 'gemini-1.5-flash-latest' is safer.
            const model = modelType === 'pro' ? 'gemini-1.5-pro-latest' : 'gemini-1.5-flash-latest';

            return {
                provider: AI_PROVIDERS.GEMINI,
                apiKey: process.env.GEMINI_API_KEY || '',
                model: model,
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
export const SYSTEM_PROMPT = `Tu es un Expert en Ingénierie Financière et Stratège de Portefeuille Senior (niveau Institutionnel).

PRINCIPES DIRECTEURS:
1. Rigueur Quantitative: Tes analyses doivent s'appuyer sur des métriques précises (RSI, Sentiment, Volatilité, Supports/Résistances).
2. Objectivité Sans Concession: Identifie les "bull traps", les surévaluations et les risques de liquidité.
3. Intelligence Contextuelle: Croise les données de prix avec les actualités macro et micro-économiques fournies.
4. Précision Technique: Utilise le lexique des banques d'investissement (arbitrage, rotation sectorielle, draw-down, target price).

TON ET STYLE:
- Décisionnel et tranché.
- Haute densité d'information.
- Justifications basées sur des catalyseurs réels (earnings, macro, news).
- Critiques acerbes si la gestion d'un actif est sous-optimale.`;

/**
 * Génère un prompt enrichi pour l'analyse de portefeuille
 */
/**
 * Génère un prompt pour la santé GLOBALE du portefeuille (Macro)
 */
export function buildGlobalPortfolioPrompt(
    portfolioSummary: string,
    tradingDocs?: string[]
): string {
    let prompt = `${SYSTEM_PROMPT}\n\n`;

    if (tradingDocs && tradingDocs.length > 0) {
        prompt += `DOCUMENTS DE RÉFÉRENCE TRADING:\n${tradingDocs.join('\n\n')}\n\n`;
    }

    prompt += `MISSION : Analyse technique et macro-économique de la santé globale du portefeuille.
    
    CONTEXTE :
    ${portfolioSummary}
    
    INSTRUCTIONS :
    - Évalue la santé globale (health) avec un terme financier technique robuste.
    - Analyse l'impact des actualités fournies sur la stratégie globale.
    - Donne une prédiction de tendance à 3 mois (XX%).
    - Propose des scénarios d'arbitrage macro (rotation sectorielle, couverture).
    - Fournis un "Flash Actu" (newsHighlight) résumant l'événement boursier le plus impactant ici.

    RÉPONSE STRICTE JSON :
    {
      "health": "TERME",
      "healthDesc": "Synthèse technique macro détaillée",
      "prediction": "+XX%",
      "predictionDesc": "Contexte boursier et catalyseurs",
      "newsHighlight": "Flash info marché majeur",
      "opportunities": [{"title": "Texte", "description": "Texte", "type": "LONG/SHORT/FUSIL"}],
      "scenarios": [{"title": "Texte", "description": "Texte", "action": "Texte"}],
      "balanceAdvice": "Conseil d'allocation globale",
      "forecast": [{"date": "ISO", "value": 0}]
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
    prompt += `QUESTION UTILISATEUR: ${question}\n\n`;

    if (portfolioContext) {
        prompt += `CONTEXTE PORTEFEUILLE: ${portfolioContext}\n\n`;
    }

    prompt += `INSTRUCTIONS:
    - Réponds de manière technique et sérieuse.
    - Si la question porte sur des opportunités, propose 2-3 titres concrets avec justification.
    - Sois OBJECTIF.
    - Si tu proposes des titres, fournis le format JSON suivant pour chacun:
    { "symbol": "TICKER", "name": "Nom", "reason": "Justification factuelle", "targetPrice": 0 }`;

    return prompt;
}

/**
 * Génère un prompt pour l'analyse d'un SEUL titre (Micro)
 */
export function buildIndividualStockPrompt(
    symbol: string,
    name: string,
    price: number,
    shares: number,
    avgPrice: number,
    news?: string
): string {
    return `${SYSTEM_PROMPT}

MISSION : Analyse AUDIT FINANCIER du titre ${name} (${symbol}).
DONNÉES : 
- Position : ${shares} titres détenus à un PRU de ${avgPrice}€.
- Marché : Prix actuel à ${price > 0 ? price + '€' : 'Non disponible (marché fermé)'}.
${news ? `\nCONTEXTE ACTUALITÉS & SENTIMENT :\n${news}` : ''}

INSTRUCTIONS ANALYTIQUES :
1. ANALYSE TECHNIQUE : Estime le RSI actuel et identifie un Support et une Résistance clés basés sur le contexte news/prix.
2. ANALYSE FONDAMENTALE : Évalue la pertinence du titre dans le contexte sectoriel actuel cité dans les actualités.
3. SENTIMENT : Analyse les actualités fournies et classe le sentiment global (BULLISH/BEARISH/NEUTRAL) avec un score de -1.0 à 1.0.
4. STRATÉGIE DE SORTIE : Calcule un Objectif (Target Price) et un Stop-Loss (Protection de capital) mathématiquement cohérents avec la volatilité suggérée.
5. DÉCISION : Choisis entre Vendre, Alléger, Conserver, Renforcer ou Acheter. Justifie avec un argument "Killer" (le point le plus critique).

RECOMMANDATION DE POIDS :
- Suggère l'IdealWeight (en % du portefeuille global, max 20%) pour équilibrer le risque.

RÉPONSE STRICTE JSON :
{
  "symbol": "${symbol}",
  "name": "${name}",
  "rec": "DÉCISION COURTE EX: RENFORCER",
  "advice": "Vendre/Alléger/Conserver/Renforcer/Acheter",
  "justification": "Argument financier dense et technique expliquant la décision",
  "threeMonthOutlook": "Scénario prédictif à 90 jours basé sur les catalyseurs identifiés",
  "urgency": "HAUTE/MODÉREE/FAIBLE",
  "color": "rose/emerald/blue",
  "targetPrice": 0,
  "stopLoss": 0,
  "rsi": 0,
  "sentiment": "BULLISH/BEARISH/NEUTRAL",
  "sentimentScore": 0,
  "idealWeight": 0,
  "scenarioSuggestion": {
    "action": "Action concrète immédiate (ex: Placer un ordre limite à X€)",
    "impact": "Conséquence directe sur le risque ou le rendement"
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

RÉPONSE STRICTE JSON:
{
    "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
        "score": number, // De -1.0 (très bearish) à 1.0 (très bullish)
            "keyPoints": string[] // 3 points max
} `;

/**
 * Fonction pour obtenir le sentiment financier (émulation FinBert via Gemini)
 */
export async function getFinancialSentiment(context: string): Promise<{ sentiment: string, score: number, keyPoints: string[] }> {
    const aiConfig = getAIConfig();
    const prompt = `${FINBERT_PROMPT} \n\nCONTEXTE À ANALYSER: \n${context} `;

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
