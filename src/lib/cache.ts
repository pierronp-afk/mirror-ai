/**
 * Simple in-memory cache with TTL support
 */
interface CacheEntry<T> {
    data: T;
    expiry: number;
}

class AICache {
    private cache: Map<string, CacheEntry<any>> = new Map();

    /**
     * Set a value in the cache with a specific TTL in hours
     */
    set(key: string, data: any, ttlHours: number = 2): void {
        const expiry = Date.now() + ttlHours * 60 * 60 * 1000;
        this.cache.set(key, { data, expiry });

        // Cleanup old entries occasionally (simple approach)
        if (this.cache.size > 100) {
            this.cleanup();
        }
    }

    /**
     * Set a value in the cache with a specific TTL in minutes
     */
    setWithMinutes(key: string, data: any, ttlMinutes: number = 15): void {
        const expiry = Date.now() + ttlMinutes * 60 * 1000;
        this.cache.set(key, { data, expiry });

        if (this.cache.size > 100) {
            this.cleanup();
        }
    }

    /**
     * Get a value from the cache if it hasn't expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Remove expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiry) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear the entire cache
     */
    clear(): void {
        this.cache.clear();
    }
}

// Singleton instance to be used across the server-side API routes
export const aiCache = new AICache();
