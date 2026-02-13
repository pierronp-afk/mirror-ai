import axios from 'axios';
import { getEmbedding } from './embeddings';
import { upsertVectors } from './pinecone';
import { v4 as uuidv4 } from 'uuid';

const NEWS_API_KEY = process.env.NEWS_API_KEY;

/**
 * Fetch financial news from NewsAPI.
 */
async function fetchNews(query: string = 'finance') {
    try {
        const response = await axios.get(`https://newsapi.org/v2/everything`, {
            params: {
                q: query,
                language: 'en',
                sortBy: 'publishedAt',
                apiKey: NEWS_API_KEY,
                pageSize: 20
            }
        });

        return response.data.articles || [];
    } catch (error) {
        console.error("Error fetching news from NewsAPI:", error);
        return [];
    }
}

/**
 * Ingest news articles into the vector store.
 */
export async function ingestNews(query: string = 'stock market') {
    console.log(`📡 Starting ingestion for: ${query}...`);

    const articles = await fetchNews(query);
    console.log(`Found ${articles.length} articles.`);

    const vectors = [];

    for (const article of articles) {
        const content = `${article.title}. ${article.description || ''}`;
        if (!content || content.length < 50) continue;

        console.log(`Embedding: ${article.title.slice(0, 50)}...`);
        const embedding = await getEmbedding(content);

        if (embedding.length > 0) {
            vectors.push({
                id: uuidv4(),
                values: embedding,
                metadata: {
                    title: article.title,
                    url: article.url,
                    date: article.publishedAt,
                    content: content,
                    source: article.source.name
                }
            });
        }
    }

    if (vectors.length > 0) {
        console.log(`Upserting ${vectors.length} vectors to Pinecone...`);
        await upsertVectors(vectors);
        console.log("✅ Ingestion complete.");
    } else {
        console.log("No articles were processed.");
    }
}
