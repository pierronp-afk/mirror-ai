/**
 * Simple RAG implementation for news context
 * No OpenAI embeddings or Pinecone - uses keyword filtering
 * Cost: $0
 */

interface NewsArticle {
    title: string;
    description: string;
    source: string;
    date: string;
    url?: string;
}

/**
 * Fetch recent news for a symbol (cached or from API)
 */
async function fetchRecentNews(symbol: string): Promise<NewsArticle[]> {
    try {
        // Try to get from cache first
        const cacheKey = `news_${symbol}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;

            // Use cached news if less than 6 hours old
            if (age < 6 * 60 * 60 * 1000) {
                return data;
            }
        }

        // Fetch fresh news (you can integrate NewsAPI, Yahoo Finance RSS, etc.)
        // For now, return empty array - implement based on your news source
        const response = await fetch(`/api/news?symbol=${symbol}`);
        if (!response.ok) {
            return [];
        }

        const articles = await response.json();

        // Cache the results
        localStorage.setItem(cacheKey, JSON.stringify({
            data: articles,
            timestamp: Date.now()
        }));

        return articles;
    } catch (error) {
        console.warn('Failed to fetch news:', error);
        return [];
    }
}

/**
 * Get simple news context for a symbol using keyword filtering
 * No embeddings needed - just smart filtering
 */
export async function getSimpleNewsContext(symbol: string): Promise<string> {
    try {
        const articles = await fetchRecentNews(symbol);

        if (!articles || articles.length === 0) {
            return '';
        }

        // Extract company name from symbol (remove exchange suffix)
        const symbolLower = symbol.toLowerCase().replace(/\.(pa|l|de|t|hk|ns|ks|tw|si)/i, '');

        // Simple keyword filtering (no embeddings needed)
        const relevant = articles.filter(article => {
            const text = `${article.title} ${article.description}`.toLowerCase();

            // Check if article mentions the symbol or relevant keywords
            return (
                text.includes(symbolLower) ||
                text.includes('earnings') ||
                text.includes('revenue') ||
                text.includes('profit') ||
                text.includes('stock') ||
                text.includes('shares') ||
                text.includes('market') ||
                text.includes('analyst') ||
                text.includes('upgrade') ||
                text.includes('downgrade')
            );
        });

        // Sort by date (most recent first)
        const sorted = relevant.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // Take top 3 most recent relevant articles
        const top3 = sorted.slice(0, 3);

        if (top3.length === 0) {
            return '';
        }

        // Format for Gemini prompt
        const context = top3
            .map(article => `[${article.source}] ${article.title}: ${article.description}`)
            .join('\n');

        return context;
    } catch (error) {
        console.warn('News context unavailable:', error);
        return ''; // Graceful degradation
    }
}

/**
 * Get news context for server-side use (no localStorage)
 */
export async function getSimpleNewsContextServer(symbol: string): Promise<string> {
    try {
        // For server-side, we'll need to fetch directly
        // This is a placeholder - implement based on your news API
        return '';
    } catch (error) {
        console.warn('News context unavailable:', error);
        return '';
    }
}
