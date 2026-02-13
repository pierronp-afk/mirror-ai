/**
 * Cache key generation and TTL logic for Redis L1 caching.
 */

const CACHE_PREFIX = 'mirror';

/**
 * Generate a deterministic Redis cache key.
 * @example generateCacheKey('analysis', 'AAPL') → "mirror:analysis:AAPL"
 */
export function generateCacheKey(type: string, identifier: string): string {
    return `${CACHE_PREFIX}:${type}:${identifier}`;
}

/**
 * Returns the appropriate TTL in seconds based on US market hours.
 * - Market open  (Mon–Fri 9:30–16:00 ET): 2 hours  (7 200s)
 * - Market closed (nights, weekends):      24 hours (86 400s)
 */
export function getTTL(): number {
    const TTL_MARKET_OPEN = 2 * 60 * 60;    // 7 200s
    const TTL_MARKET_CLOSED = 24 * 60 * 60;  // 86 400s

    const now = new Date();

    // Convert to US Eastern time
    const etString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const et = new Date(etString);

    const day = et.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = et.getHours();
    const minutes = et.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = totalMinutes >= 570 && totalMinutes < 960; // 9:30 – 16:00

    return isWeekday && isMarketHours ? TTL_MARKET_OPEN : TTL_MARKET_CLOSED;
}
