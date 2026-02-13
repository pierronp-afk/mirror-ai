import OpenAI from 'openai';

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
    if (openai) return openai;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn("⚠️  OPENAI_API_KEY is missing. RAG embeddings will be disabled.");
        return null;
    }

    openai = new OpenAI({ apiKey });
    return openai;
}

/**
 * Generate an embedding for the given text using OpenAI's text-embedding-3-small model.
 */
export async function getEmbedding(text: string): Promise<number[]> {
    if (!text) return [];

    try {
        const client = getOpenAIClient();
        if (!client) return [];

        const response = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: text.replace(/\n/g, ' '),
            encoding_format: "float",
        });

        return response.data[0].embedding;
    } catch (error) {
        console.error("Error generating embedding:", error);
        return [];
    }
}
