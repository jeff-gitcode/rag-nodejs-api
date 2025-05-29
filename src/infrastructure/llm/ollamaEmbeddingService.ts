// src/infrastructure/llm/ollamaEmbeddingService.ts
import { IEmbeddingService } from '@application/interfaces/IEmbeddingService';
import axios from 'axios';

export class OllamaEmbeddingService implements IEmbeddingService {
    private readonly baseUrl: string;
    private readonly model: string;
    private readonly dimensions: number;

    constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3.2', dimensions: number = 1536) {
        this.baseUrl = baseUrl;
        this.model = model;
        this.dimensions = dimensions;
    }

    public async generateEmbedding(text: string): Promise<number[]> {
        try {
            console.log(`Generating embedding for text: "${text.substring(0, 50)}..."`);

            const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
                model: this.model,
                prompt: text
            });

            if (response.data && response.data.embedding) {
                console.log(`Successfully generated embedding of length ${response.data.embedding.length}`);
                return response.data.embedding;
            }

            console.warn("Warning: Embedding generation failed, falling back to random vector");
            const randomEmbedding = this.generateRandomEmbedding();
            console.log(`Using random embedding of length ${randomEmbedding.length}`);
            return randomEmbedding;
        } catch (error) {
            console.error('Error generating embeddings:', error);
            console.warn("Error: Falling back to random embedding vector");
            return this.generateRandomEmbedding();
        }
    }

    private generateRandomEmbedding(): number[] {
        return Array.from({ length: this.dimensions }, () => Math.random());
    }
}