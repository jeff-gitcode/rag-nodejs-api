import { RAGService } from '@application/services/ragService';
import { VectorRepository } from '@infrastructure/database/repositories/vectorRepository';
import { OllamaClient } from '@infrastructure/llm/ollamaClient';
import { WeaviateClient } from '@infrastructure/database/weaviateClient';

describe('RAGService', () => {
    let ragService: RAGService;
    let vectorRepository: VectorRepository;
    let ollamaClient: OllamaClient;
    let weaviateClient: WeaviateClient;

    beforeEach(() => {
        weaviateClient = new WeaviateClient(); // Create a mock WeaviateClient
        vectorRepository = new VectorRepository(weaviateClient); // Pass the mock WeaviateClient
        ollamaClient = new OllamaClient();
        ragService = new RAGService(vectorRepository, ollamaClient);
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