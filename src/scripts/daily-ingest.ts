import 'dotenv/config';
import { ingestNews } from '../lib/rag/ingest';

/**
 * Standalone script to run daily ingestion of financial news.
 */
async function run() {
    console.log("🚀 Starting Daily Ingestion Script...");

    const queries = ['stock market', 'finance', 'economy', 'AAPL', 'NVDA', 'MSFT', 'TSLA', 'bitcoin', 'crypto'];

    for (const query of queries) {
        try {
            await ingestNews(query);
        } catch (error) {
            console.error(`Failed to ingest news for query "${query}":`, error);
        }
    }

    console.log("🏁 Daily Ingestion Script Finished.");
}

run();
