import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Rate limiter for Gemini API calls
 * Limit: 10 requests per minute (safety margin from 15 RPM free tier)
 */
const geminiRateLimiter = new RateLimiterMemory({
    points: 10, // 10 requests
    duration: 60, // per minute
    keyPrefix: 'rl_gemini'
});

/**
 * Rate limiter for user requests
 * Limit: 10 requests per minute per IP
 */
const userRateLimiter = new RateLimiterMemory({
    points: 10,
    duration: 60,
    keyPrefix: 'rl_user'
});

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetInSeconds: number;
}

/**
 * Check if a request is allowed under rate limits
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param limiterType - Type of rate limiter to use
 */
export async function checkRateLimit(
    key: string,
    limiterType: 'gemini' | 'user' = 'user'
): Promise<RateLimitResult> {
    const limiter = limiterType === 'gemini' ? geminiRateLimiter : userRateLimiter;

    try {
        const result = await limiter.consume(key, 1);
        return {
            allowed: true,
            remaining: result.remainingPoints,
            resetInSeconds: Math.ceil(result.msBeforeNext / 1000)
        };
    } catch (error: any) {
        return {
            allowed: false,
            remaining: 0,
            resetInSeconds: Math.ceil(error.msBeforeNext / 1000)
        };
    }
}

/**
 * Get current rate limit status without consuming a point
 */
export async function getRateLimitStatus(
    key: string,
    limiterType: 'gemini' | 'user' = 'user'
): Promise<RateLimitResult> {
    const limiter = limiterType === 'gemini' ? geminiRateLimiter : userRateLimiter;

    try {
        const result = await limiter.get(key);
        if (!result) {
            return {
                allowed: true,
                remaining: 10,
                resetInSeconds: 0
            };
        }

        return {
            allowed: result.remainingPoints > 0,
            remaining: result.remainingPoints,
            resetInSeconds: Math.ceil(result.msBeforeNext / 1000)
        };
    } catch (error) {
        return {
            allowed: true,
            remaining: 10,
            resetInSeconds: 0
        };
    }
}

/**
 * Reset rate limit for a specific key (admin use only)
 */
export async function resetRateLimit(
    key: string,
    limiterType: 'gemini' | 'user' = 'user'
): Promise<void> {
    const limiter = limiterType === 'gemini' ? geminiRateLimiter : userRateLimiter;
    await limiter.delete(key);
}
