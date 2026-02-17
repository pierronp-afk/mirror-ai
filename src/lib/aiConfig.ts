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
export const SYSTEM_PROMPT = `You are MirrorAI, a senior financial analyst specialized in retail portfolio management.

IDENTITY:
- You analyze portfolios of individual retail investors (not institutional)
- You ALWAYS respond in French, even if the prompt is in English
- Your style: direct, data-driven, actionable. No unnecessary jargon.

ANALYSIS PRINCIPLES:
1. Prioritize capital loss risk before upside potential
2. Concentration (>15% on a single position) must ALWAYS be flagged
3. Cross-reference current price + recent news + portfolio weight
4. Each recommendation includes a conviction level (0-100) and urgency

RESPONSE FORMAT:
- Always valid JSON, no markdown wrapping (no \`\`\`json)
- Text fields MUST be in French
- Precise numbers (never "about" or "around")
- Never include legal disclaimers in JSON fields`;

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

    prompt += `You are MirrorAI. Analyze the overall health of this portfolio.

CONTEXT:
${portfolioSummary}

MISSION: Generate a macro analysis in strict JSON (no markdown).

RULES:
- "health": short financial term in French (e.g. "Surexposé Tech", "Bien Diversifié", "Sous-optimal")
- "healthDesc": 2-3 synthetic sentences about key risks and strengths
- "prediction": estimated 3-month variation formatted as "+X.X%" or "-X.X%"
- "predictionDesc": the 2 main catalysts justifying this forecast
- "newsHighlight": the most impactful macro event for THIS portfolio today
- "balanceAdvice": concrete rebalancing advice (which exposure to reduce/increase)
- "forecast": 6 weekly simulated data points starting from current value
- "opportunities": 2-3 investment ideas complementary to current portfolio
- "scenarios": 2 scenarios (bull/bear) with concrete action for each

ALL TEXT FIELDS MUST BE IN FRENCH.

EXPECTED JSON FORMAT:
{
  "health": "string",
  "healthDesc": "string",
  "prediction": "string",
  "predictionDesc": "string",
  "newsHighlight": "string",
  "balanceAdvice": "string",
  "forecast": [{"date": "YYYY-MM-DD", "value": number}],
  "opportunities": [{"title": "string", "description": "string", "type": "LONG|SHORT|FUSIL"}],
  "scenarios": [{"title": "string", "description": "string", "action": "string"}]
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
    let prompt = `You are MirrorAI. Analyze ${name} (${symbol}) for a retail investor.

DATA:
- Current Price: ${price > 0 ? price + '€' : 'Market closed — use PRU as reference'}
- Shares held: ${shares} shares
- Average Buy Price (PRU): ${avgPrice}€
- Portfolio Weight: ${portfolioWeight.toFixed(1)}% (total portfolio value: ${totalPortfolioValue.toFixed(0)}€)
- Position Value: ${(shares * (price || avgPrice)).toFixed(0)}€`;

    if (news) {
        prompt += `\n\nRECENT NEWS:\n${news}`;
    }

    if (ragContext) {
        prompt += `\n\nHISTORICAL CONTEXT:\n${ragContext}`;
    }

    prompt += `

ANALYSIS RULES:
1. If weight exceeds 15% → almost systematic trim signal
2. If market is closed (price = 0) → base your analysis on PRU and news
3. "simpleReasoning": explain as to a friend, no jargon. Max 3 sentences.
4. "action": EXACT formula with number of shares (e.g. "Vendez 15 actions", "Achetez 8 actions supplémentaires", "Conservez vos ${shares} actions sans rien changer")
5. "threeMonthOutlook": detailed 3-month scenario — which catalysts to watch, which price level is critical
6. "targetPrice" and "stopLoss" must be realistic numbers relative to current price (±5% to ±30% max)
7. Confidence level "confidence": be honest. If market is closed or few news → max 60.

ALL TEXT FIELDS MUST BE IN FRENCH.

STRICT JSON FORMAT (no markdown):
{
  "symbol": "${symbol}",
  "name": "${name}",
  "advice": "Acheter|Renforcer|Conserver|Alléger|Vendre",
  "confidence": number,
  "targetPrice": number,
  "stopLoss": number,
  "urgency": "HAUTE|MODÉRÉE|FAIBLE",
  "color": "rose|emerald|blue",
  "simpleReasoning": "string — simple explanation for beginner",
  "action": "string — exact action with number of shares",
  "actionReasoning": "string — why this exact number",
  "threeMonthOutlook": "string — 3-month outlook with catalysts to watch",
  "rsi": number,
  "idealWeight": number,
  "sentiment": "BULLISH|BEARISH|NEUTRAL"
}`;

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
