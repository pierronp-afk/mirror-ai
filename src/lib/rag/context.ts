import { getEmbedding } from './embeddings';
import { queryVectors } from './pinecone';

/**
 * Retrieve relevant news context via RAG for a given symbol or topic.
 * This should ONLY be called on the server side.
 */
export async function getRAGContext(query: string, symbol?: string): Promise<string> {
    try {
        const embedding = await getEmbedding(query);
        if (!embedding || embedding.length === 0) return "";

        const matches = await queryVectors(embedding, 5, symbol);

        if (matches && matches.length > 0) {
            console.log(`📰 RAG context: ${matches.length} articles found for "${query}"`);
            return matches.map((m: any) => {
                const meta = m.metadata;
                return `[${meta.date}] ${meta.title}: ${meta.content} (Source: ${meta.source})`;
            }).join("\n---\n");
        }

        return "";
    } catch (error) {
        console.error("Error fetching RAG context:", error);
        return "";
    }
}
