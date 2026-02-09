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

    prompt += `MISSION : Analyse de la santé macro et de la stratégie globale du portefeuille : ${portfolioSummary}.
    
    INSTRUCTIONS :
    - Évalue la santé globale (health) avec un terme financier.
    - Donne une prédiction de tendance à 3 mois (XX%).
    - Propose des scénarios d'arbitrage macro (vendre un secteur pour un autre).
    - Donne un conseil d'équilibre général (balanceAdvice).

    RÉPONSE STRICTE JSON :
    {
      "health": "TERME",
      "healthDesc": "Synthèse technique",
      "prediction": "+XX%",
      "predictionDesc": "Contexte macro",
      "opportunities": [{"title": "Texte", "description": "Texte", "type": "LONG/SHORT/FUSIL"}],
      "scenarios": [{"title": "Texte", "description": "Texte", "action": "Texte"}],
      "balanceAdvice": "Texte global",
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

    MISSION : Analyse FLASH du titre ${name} (${symbol}).
    Données: ${shares} titres @ ${avgPrice}€ (Prix actuel: ${price > 0 ? price + '€' : 'Non disponible'}).
    ${news ? `ACTUALITÉ PRÉCISE : ${news}` : ''}

    INSTRUCTIONS :
    - Sois précis sur la recommandation (Acheter/Vendre/Alléger/Conserver/Renforcer).
    - Donne des prix cibles (targetPrice) et stop loss explicites.
    - Analyse le RSI et le Sentiment (score -1 à 1).
    - Donne un poid idéal suggéré (idealWeight) entre 0 et 20%.

    RÉPONSE STRICTE JSON :
    {
      "symbol": "${symbol}",
      "name": "${name}",
      "rec": "CONSEIL COURT",
      "advice": "Action",
      "justification": "Texte détaillé",
      "threeMonthOutlook": "Texte",
      "urgency": "HAUTE/MODEREE/FAIBLE",
      "color": "rose/emerald/blue",
      "targetPrice": 0,
      "stopLoss": 0,
      "rsi": 0,
      "sentiment": 0,
      "idealWeight": 0,
      "scenarioSuggestion": {
        "action": "Action précise",
        "impact": "Impact attendu"
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
