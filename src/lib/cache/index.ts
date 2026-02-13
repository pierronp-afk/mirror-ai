import { getCachedAnalysis, setCachedAnalysis } from './redis';
import { getFirestoreCache, setFirestoreCache } from './firestore';

export type CacheSource = 'L1' | 'L2' | null;

interface CachedResult {
    data: string | null;
    source: CacheSource;
}

/**
 * Tiered retrieval: L1 (Redis) -> L2 (Firestore)
 */
export async function getCached(key: string): Promise<CachedResult> {
    // 1. Try Redis L1
    const l1Data = await getCachedAnalysis(key);
    if (l1Data) {
        return { data: l1Data, source: 'L1' };
    }

    // 2. Try Firestore L2
    const l2Data = await getFirestoreCache(key);
    if (l2Data) {
        console.log(`🟡 L2 HIT (Firestore) — key: ${key}`);

        // Repopulate L1 asynchronously for next time
        // We don't await this to keep the response fast
        // Using a default TTL of 2 hours if we don't have context here, 
        // but the route will handle setting it properly on fresh calls.
        setCachedAnalysis(key, l2Data, 2 * 60 * 60).catch(err => {
            console.error('Failed to repopulate L1 from L2:', err);
        });

        return { data: l2Data, source: 'L2' };
    }

    return { data: null, source: null };
}

/**
 * Parallel save to all cache tiers
 */
export async function setCached(
    key: string,
    data: string,
    redisTTL: number
): Promise<void> {
    try {
        await Promise.all([
            setCachedAnalysis(key, data, redisTTL),
            setFirestoreCache(key, data)
        ]);
    } catch (err) {
        console.error('⚠️ Unified setCached error:', err);
    }
}
