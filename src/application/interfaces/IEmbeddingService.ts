// src/application/interfaces/IEmbeddingService.ts
export interface IEmbeddingService {
    generateEmbedding(text: string): Promise<number[]>;
}