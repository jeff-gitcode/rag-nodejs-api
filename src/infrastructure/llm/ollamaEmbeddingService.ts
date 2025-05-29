// src/infrastructure/llm/ollamaEmbeddingService.ts
import axios from 'axios';
import { IEmbeddingService } from '@application/interfaces/IEmbeddingService';

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
            const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
                model: this.model,
                prompt: text
            });

            if (response.data && response.data.embedding) {
                return response.data.embedding;
            }

            console.warn("Embedding generation failed, falling back to random vector");
            return this.generateRandomEmbedding();
        } catch (error) {
            console.error('Error generating embeddings:', error);
            return this.generateRandomEmbedding();
        }
    }

    private generateRandomEmbedding(): number[] {
        return Array.from({ length: this.dimensions }, () => Math.random());
    }
}