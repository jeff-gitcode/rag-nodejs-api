import { RAGService } from '@application/services/ragService';
import { VectorRepository } from '@infrastructure/database/repositories/vectorRepository';
import { OllamaClient } from '@infrastructure/llm/ollamaClient';
import { WeaviateClient } from '@infrastructure/database/weaviateClient';
import { IEmbeddingService } from '@application/interfaces/IEmbeddingService';

// Mock implementation of IEmbeddingService for testing
class MockEmbeddingService implements IEmbeddingService {
    async generateEmbedding(text: string): Promise<number[]> {
        // Return a simple fixed-length mock vector for testing
        return Array(1536).fill(0.1);
    }
}

describe('RAGService', () => {
    let ragService: RAGService;
    let vectorRepository: VectorRepository;
    let ollamaClient: OllamaClient;
    let weaviateClient: WeaviateClient;
    let embeddingService: IEmbeddingService;

    beforeEach(() => {
        weaviateClient = new WeaviateClient(); // Create a mock WeaviateClient
        vectorRepository = new VectorRepository(weaviateClient); // Pass the mock WeaviateClient
        ollamaClient = new OllamaClient();
        embeddingService = new MockEmbeddingService(); // Use the mock embedding service
        ragService = new RAGService(vectorRepository, ollamaClient, embeddingService);
    });

    it('should generate a response for a valid query', async () => {
        const query = 'What is the capital of France?';
        const expectedResponse = 'The capital of France is Paris.';

        jest.spyOn(vectorRepository, 'queryVector').mockResolvedValueOnce(['Paris']);
        jest.spyOn(ollamaClient, 'getResponse').mockResolvedValueOnce(expectedResponse);

        const response = await ragService.generateResponse(query);
        expect(response).toBe(expectedResponse);
    });

    it('should handle errors when querying the vector database', async () => {
        const query = 'What is the capital of France?';
        const errorMessage = 'Vector query failed';

        jest.spyOn(vectorRepository, 'queryVector').mockRejectedValueOnce(new Error(errorMessage));

        await expect(ragService.generateResponse(query)).rejects.toThrow(errorMessage);
    });
});