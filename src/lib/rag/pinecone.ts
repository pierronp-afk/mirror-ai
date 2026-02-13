import { Pinecone, Index } from '@pinecone-database/pinecone';

let pinecone: Pinecone | null = null;
let pineconeIndex: Index | null = null;

function getPineconeIndex(): Index | null {
    if (pineconeIndex) return pineconeIndex;

    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
        console.warn("⚠️  PINECONE_API_KEY is missing. RAG vector storage will be disabled.");
        return null;
    }

    try {
        pinecone = new Pinecone({ apiKey });
        const indexName = process.env.PINECONE_INDEX || 'mirror-news';
        pineconeIndex = pinecone.index(indexName);
        return pineconeIndex;
    } catch (error) {
        console.error("Failed to initialize Pinecone index:", error);
        return null;
    }
}

export interface NewsMetadata {
    title: string;
    url: string;
    date: string;
    symbol?: string;
    content: string;
    source: string;
}

/**
 * Upsert vectors into Pinecone.
 */
export async function upsertVectors(vectors: any[]) {
    try {
        const index = getPineconeIndex();
        if (!index) return;

        await index.upsert({ records: vectors });
    } catch (error) {
        console.error("Error upserting to Pinecone:", error);
    }
}

/**
 * Query Pinecone for the most relevant news vectors.
 */
export async function queryVectors(embedding: number[], topK: number = 5, symbol?: string) {
    try {
        const index = getPineconeIndex();
        if (!index) return [];

        const queryRequest: any = {
            vector: embedding,
            topK,
            includeMetadata: true,
        };

        if (symbol) {
            queryRequest.filter = { symbol: { "$eq": symbol } };
        }

        const result = await index.query(queryRequest);
        return result.matches || [];
    } catch (error) {
        console.error("Error querying Pinecone:", error);
        return [];
    }
}
