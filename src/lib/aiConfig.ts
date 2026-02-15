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
            // Le suffixe 'latest' semble poser problème avec l'API v1beta actuelle. Utilisation des noms standards.
            const model = modelType === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

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
                model: 'gemini-2.5-flash',
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
        prompt += `TRADING REFERENCE DOCUMENTS:\n${tradingDocs.join('\n\n')}\n\n`;
    }

    prompt += `MISSION: Analyze the technical and macro-economic health of the portfolio.
    
IMPORTANT: YOU MUST RESPOND IN FRENCH (FRANÇAIS). All string fields in the JSON response must be in clear, professional French.

CONTEXT:
${portfolioSummary}
    
INSTRUCTIONS:
- Evaluate global health with a robust financial term (in French).
- Analyze the impact of provided news on global strategy.
- Provide a 3-month trend prediction (±XX%).
- Propose macro arbitrage scenarios (sector rotation, hedging).
- Provide a "Flash News" (newsHighlight) summarizing the most impactful market event.

STRICT JSON RESPONSE (All text fields in FRENCH):
{
  "health": "TECHNICAL TERM IN FRENCH",
  "healthDesc": "Detailed macro technical synthesis in French",
  "prediction": "+XX%",
  "predictionDesc": "Market context and catalysts in French",
  "newsHighlight": "Major market flash info in French",
  "opportunities": [{"title": "Text", "description": "Text", "type": "LONG/SHORT/FUSIL"}],
  "scenarios": [{"title": "Text", "description": "Text", "action": "Text"}],
  "balanceAdvice": "Global allocation advice in French",
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
 * Génère un prompt pour l'analyse d'un SEUL titre (Micro) - VERSION VULGARISÉE
 */
export function buildIndividualStockPrompt(
    symbol: string,
    name: string,
    price: number,
    shares: number,
    avgPrice: number,
    portfolioWeight: number = 0,
    totalPortfolioValue: number = 0,
    news?: string,
    ragContext?: string
): string {
    const currentValue = shares * price;

    let prompt = `Analyze ${name} (${symbol}) for a BEGINNER INVESTOR.
    
IMPORTANT: YOU MUST RESPOND IN FRENCH (FRANÇAIS). Even though this prompt is in English, the final user-facing content must be in clear, natural French.

CURRENT SITUATION:
- Stock: ${name} (${symbol})
- Current Price: ${price > 0 ? price + '€' : 'Not available (market closed)'}
- User holds: ${shares} shares worth ${currentValue.toFixed(2)}€
- Portfolio Weight: ${portfolioWeight.toFixed(1)}% (Total portfolio value: ${totalPortfolioValue.toFixed(0)}€)
- Average Buy Price: ${avgPrice}€`;

    if (news) {
        prompt += `\n\nRECENT NEWS:\n${news}`;
    }

    if (ragContext) {
        prompt += `\n\nHISTORICAL CONTEXT:\n${ragContext}`;
    }

    prompt += `

CRITICAL INSTRUCTIONS:
1. USE SIMPLE, CLEAR FRENCH (no jargon like "P/E ratio", "RSI", "MACD", "bull trap").
2. EXPLAIN THE *REASON* (WHY) for your recommendation in simple terms.
3. PROVIDE A PRECISE ACTION with an EXACT NUMBER of shares.
4. TAKE PORTFOLIO WEIGHT INTO ACCOUNT. If a position is too large (>20%), even a good stock should be trimmed.
5. QUALITY OF ADVICE: Your advice must be high-pertinence. If you recommend "HOLD" (Conserver), you MUST explain specifically what catalyst you are waiting for or why the current price is fair.

STRICT JSON RESPONSE (All string values must be in FRENCH):
{
  "symbol": "${symbol}",
  "name": "${name}",
  "recommendation": "BUY|HOLD|SELL",
  "advice": "Acheter|Renforcer|Conserver|Alléger|Vendre",
  "confidence": 0-100,
  "targetPrice": target price in €,
  "stopLoss": stop-loss price in €,
  "simpleReasoning": "Explain in 2-3 SIMPLE sentences WHY this recommendation. Use everyday French. Be specific and pertinent.",
  "mainRisk": "The single biggest risk in simple French terms",
  "action": "EXACT action in French with numbers. Examples: 'Vendez 20 actions', 'Achetez 10 actions supplémentaires', 'Conservez vos ${shares} actions'",
  "actionReasoning": "Why this specific number of shares (in French)",
  "urgency": "HAUTE|MODÉRÉE|FAIBLE",
  "color": "rose|emerald|blue",
  "rsi": estimated RSI 0-100 (internal use),
  "sentiment": "BULLISH|BEARISH|NEUTRAL",
  "idealWeight": suggested weight % (max 20%)
}

EXAMPLE of GOOD simple reasoning:
"Meta gagne à nouveau de l'argent grâce à la publicité qui repart. Le titre a monté de 20% cette année. Mais attention : vous avez 25% de votre argent sur ce seul titre, c'est risqué."

REMINDER: Your audience is a BEGINNER. Talk to them like a friend, not a Wall Street trader. ALL TEXT MUST BE IN FRENCH.`;

    return prompt;
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
