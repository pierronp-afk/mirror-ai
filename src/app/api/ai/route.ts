import { NextResponse } from 'next/server';
import { getAIConfig, AI_PROVIDERS, buildIndividualStockPrompt } from '@/lib/aiConfig';
import { getRAGContext } from '@/lib/rag/context';
import { getCached, setCached } from '@/lib/cache';
import { generateCacheKey, getTTL } from '@/lib/cache/keys';
import { checkRateLimit } from '@/lib/rateLimiter';
import crypto from 'crypto';

/**
 * Route API pour interroger l'IA.
 * Cette route s'exécute côté serveur pour protéger la clé API.
 * Support multi-providers (Gemini, OpenAI, Anthropic).
 * Rate limiting: 10 requests/minute per IP
 */
interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

export async function POST(req: Request) {
  // Get IP address for rate limiting
  const ip = req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // Check rate limit
  const rateCheck = await checkRateLimit(ip, 'user');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please wait ${rateCheck.resetInSeconds} seconds.`,
        resetInSeconds: rateCheck.resetInSeconds
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateCheck.resetInSeconds.toString(),
          'Retry-After': rateCheck.resetInSeconds.toString()
        }
      }
    );
  }
  const aiConfig = getAIConfig();

  if (!aiConfig.apiKey) {
    return NextResponse.json({
      error: "Configuration serveur manquante : Clé API IA introuvable."
    }, { status: 500 });
  }

  try {
    const { prompt, cacheKey, cacheTTL } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Le prompt est requis" }, { status: 400 });
    }

    // 1. Vérification du cache Tiered (L1 Redis / L2 Firestore)
    const effectiveCacheKey = cacheKey
      ? generateCacheKey('analysis', cacheKey)
      : generateCacheKey('prompt', crypto.createHash('sha256').update(prompt).digest('hex'));

    const { data: cachedResponse, source } = await getCached(effectiveCacheKey);

    if (cachedResponse) {
      return NextResponse.json({
        analysis: cachedResponse,
        cached: true,
        source: source
      }, {
        headers: {
          'X-RateLimit-Remaining': rateCheck.remaining.toString()
        }
      });
    }

    // 2. Fetch RAG Context if symbol provided
    let ragContext = "";
    let enrichedPrompt = prompt;
    if (cacheKey) {
      ragContext = await getRAGContext(cacheKey, cacheKey);
      if (ragContext) {
        enrichedPrompt = `${prompt}\n\n### HISTORICAL NEWS CONTEXT (RAG):\n${ragContext}`;
      }
    }

    // Debug sécurisé
    console.log(`📡 Appel API IA (Provider: ${aiConfig.provider}) avec la clé se terminant par : ...${aiConfig.apiKey.slice(-4)}`);

    /**
     * Fonction d'appel avec gestion des réessais (Exponential Backoff)
     * Délais : 1s, 2s, 4s, 8s, 16s
     */
    const callAIWithRetry = async (retries = 3, delay = 1000): Promise<string> => {
      let response: Response;
      let payload: any;

      // Configuration selon le provider
      if (aiConfig.provider === AI_PROVIDERS.GEMINI) {
        // On utilise le modèle défini dans la configuration (Flash ou Pro)
        const url = `${aiConfig.endpoint}/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`;
        payload = {
          contents: [{
            parts: [{ text: enrichedPrompt }]
          }]
        };

        console.log("🚀 Envoi de l'analyse au moteur IA (Gemini)...");
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json() as GeminiResponse;
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error("L'IA n'a pas généré de contenu");
          return text;
        }
      } else if (aiConfig.provider === AI_PROVIDERS.OPENAI) {
        payload = {
          model: aiConfig.model,
          messages: [{ role: 'user', content: enrichedPrompt }],
          temperature: 0.7,
        };

        console.log("🚀 Envoi de l'analyse au moteur IA (OpenAI)...");
        response = await fetch(aiConfig.endpoint!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiConfig.apiKey}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices?.[0]?.message?.content || '';
        }
      } else if (aiConfig.provider === AI_PROVIDERS.ANTHROPIC) {
        payload = {
          model: aiConfig.model,
          messages: [{ role: 'user', content: enrichedPrompt }],
          max_tokens: 4096,
        };

        console.log("🚀 Envoi de l'analyse au moteur IA (Anthropic)...");
        response = await fetch(aiConfig.endpoint!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiConfig.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          return data.content?.[0]?.text || '';
        }
      }

      // Gestion des erreurs
      const errorText = await response!.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }

      console.error(`❌ Erreur IA (${response!.status}):`, errorData.error?.message || "Erreur inconnue");

      if ((response!.status === 429 || response!.status >= 500) && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return callAIWithRetry(retries - 1, delay * 2);
      }

      throw new Error(errorData.error?.message || `Erreur IA (${response!.status})`);
    };

    const text = await callAIWithRetry();

    // Sauvegarde en cache Tiered (Redis & Firestore)
    // Si cacheTTL est fourni (en minutes), on l'utilise, sinon TTL dynamique (2h open / 24h closed)
    const ttlSeconds = cacheTTL ? cacheTTL * 60 : getTTL();
    await setCached(effectiveCacheKey, text, ttlSeconds);

    return NextResponse.json({ analysis: text }, {
      headers: {
        'X-RateLimit-Remaining': rateCheck.remaining.toString()
      }
    });

  } catch (error: unknown) {
    console.error("Erreur Route API AI:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { error: "Échec de l'analyse IA", message },
      { status: 500 }
    );
  }
}