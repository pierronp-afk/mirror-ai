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

INSTRUCTIONS :
- Rapporte la santé globale et une projection à 3 mois RÉALISTE (même si négative).
- Pour CHAQUE titre du portefeuille, génère un signal détaillé avec une perspective à 3 mois.
- Sois CRITIQUE et OBJECTIF. Si un titre est mauvais, dis-le clairement.
- Ajoute une section 'opportunities' avec 3-4 titres hors portefeuille classés par horizon.
- Pour les "FUSIL" (très court terme), indique le niveau d'urgence (CRITIQUE/ÉLEVÉE/NORMALE).
- Inclus une courbe prévisionnelle ('forecast') sur 30 jours réaliste.

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
      "justification": "Détails fondamentaux / actu OBJECTIFS",
      "threeMonthOutlook": "Perspective détaillée à 3 mois avec scénarios",
      "rec": "CONSEIL CLAIR",
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
      "reason": "Pourquoi ce titre ? FACTUEL",
      "priceMax": 0,
      "priceExit": 0,
      "urgencyLevel": "CRITIQUE/ÉLEVÉE/NORMALE",
      "sector": "Secteur"
    }
  ],
  "newsHighlight": "Titre actu pertinent",
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
