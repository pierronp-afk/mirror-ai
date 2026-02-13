/**
 * Upstash Redis client for L1 caching of AI analyses.
 * Gracefully degrades if Redis is unavailable — the app will still work,
 * it just won't cache.
 */
import { Redis } from '@upstash/redis';

// --- Singleton client --------------------------------------------------------

let redis: Redis | null = null;

function getRedisClient(): Redis | null {
    if (redis) return redis;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.warn('⚠️  UPSTASH_REDIS_REST_URL / TOKEN not set — Redis cache disabled');
        return null;
    }

    redis = new Redis({ url, token });
    return redis;
}

// --- Public API --------------------------------------------------------------

/**
 * Try to retrieve a cached AI analysis from Redis.
 * Returns `null` on miss or if Redis is unavailable.
 */
export async function getCachedAnalysis(key: string): Promise<string | null> {
    try {
        const client = getRedisClient();
        if (!client) return null;

        const cached = await client.get<string>(key);

        if (cached) {
            console.log(`🟢 Redis HIT — key: ${key}`);
            return cached;
        }

        console.log(`🔴 Redis MISS — key: ${key}`);
        return null;
    } catch (err) {
        console.error('⚠️  Redis GET error (falling back to no-cache):', err);
        return null;
    }
}

/**
 * Store an AI analysis result in Redis with the given TTL (seconds).
 */
export async function setCachedAnalysis(
    key: string,
    data: string,
    ttlSeconds: number
): Promise<void> {
    try {
        const client = getRedisClient();
        if (!client) return;

        await client.set(key, data, { ex: ttlSeconds });
        console.log(`💾 Redis SET — key: ${key}, TTL: ${ttlSeconds}s`);
    } catch (err) {
        console.error('⚠️  Redis SET error (analysis not cached):', err);
    }
}
