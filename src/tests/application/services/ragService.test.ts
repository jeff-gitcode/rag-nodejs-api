import { RAGService } from '@application/services/ragService';
import { VectorRepository } from '@infrastructure/database/repositories/vectorRepository';
import { OllamaClient } from '@infrastructure/llm/ollamaClient';
import { IEmbeddingService } from '@application/interfaces/IEmbeddingService';

// Mock dependencies
jest.mock('@infrastructure/database/repositories/vectorRepository');
jest.mock('@infrastructure/llm/ollamaClient');

// Mock implementation of IEmbeddingService for testing
class MockEmbeddingService implements IEmbeddingService {
    async generateEmbedding(text: string): Promise<number[]> {
        // Return a simple fixed-length mock vector for testing
        return Array(1536).fill(0.1);
    }
}

describe('RAGService', () => {
    let ragService: RAGService;
    let vectorRepository: jest.Mocked<VectorRepository>;
    let ollamaClient: jest.Mocked<OllamaClient>;
    let embeddingService: IEmbeddingService;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mocked instances
        vectorRepository = new VectorRepository(null) as jest.Mocked<VectorRepository>;
        ollamaClient = new OllamaClient() as jest.Mocked<OllamaClient>;
        embeddingService = new MockEmbeddingService();

        // Create RAG service with mocked dependencies
        ragService = new RAGService(vectorRepository, ollamaClient, embeddingService);
    });

    describe('generateResponse', () => {
        it('should generate a response for a valid query', async () => {
            // Arrange
            const query = 'What is the capital of France?';
            const expectedResponse = 'The capital of France is Paris.';
            const mockVectorData = [
                {
                    content: 'Paris is the capital of France.',
                    _additional: { certainty: 0.95 }
                }
            ];
            const topic = 'Geography';

            // Setup mocks
            vectorRepository.queryVector = jest.fn().mockResolvedValue(mockVectorData);
            ollamaClient.getResponse = jest.fn().mockResolvedValue(expectedResponse);

            // Act
            const response = await ragService.generateResponse(query, topic);

            // Assert
            expect(vectorRepository.queryVector).toHaveBeenCalledWith(query, topic, 3);
            expect(ollamaClient.getResponse).toHaveBeenCalled();
            expect(response).toEqual(expectedResponse);
        });

        it('should handle empty vector data', async () => {
            // Arrange
            const query = 'What is the capital of Narnia?';
            const expectedResponse = 'I don\'t have information about that.';
            const topic = 'Fantasy';
            // Setup mocks
            vectorRepository.queryVector = jest.fn().mockResolvedValue([]);
            ollamaClient.getResponse = jest.fn().mockResolvedValue(expectedResponse);

            // Act
            const response = await ragService.generateResponse(query, topic);

            // Assert
            expect(vectorRepository.queryVector).toHaveBeenCalledWith(query, 3);
            expect(ollamaClient.getResponse).toHaveBeenCalled();
            expect(response).toEqual(expectedResponse);
        });

        it('should throw error when vector repository fails', async () => {
            // Arrange
            const query = 'What causes errors?';
            const errorMessage = 'Database connection failed';
            const topic = 'Errors';
            // Setup mocks
            vectorRepository.queryVector = jest.fn().mockRejectedValue(new Error(errorMessage));

            // Act & Assert
            await expect(ragService.generateResponse(query, topic)).rejects.toThrow(errorMessage);
            expect(vectorRepository.queryVector).toHaveBeenCalledWith(query, 3);
            expect(ollamaClient.getResponse).not.toHaveBeenCalled();
        });
    });

    describe('insertData', () => {
        it('should successfully insert data into vector repository', async () => {
            // Arrange
            const content = 'Test content';
            const metadata = { topic: 'Test Topic' };
            const mockVector = Array(1536).fill(0.1);

            // Setup mocks
            jest.spyOn(embeddingService, 'generateEmbedding').mockResolvedValue(mockVector);
            vectorRepository.upsertVector = jest.fn().mockResolvedValue(undefined);

            // Act
            const id = await ragService.insertData(content, metadata);

            // Assert
            expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(content);
            expect(vectorRepository.upsertVector).toHaveBeenCalledWith({
                id: expect.any(String),
                content,
                vector: mockVector,
                metadata: metadata.topic
            });
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); // UUID format
        });
    });

    describe('clearData', () => {
        it('should call clearAll on vector repository', async () => {
            // Arrange
            vectorRepository.clearAll = jest.fn().mockResolvedValue(undefined);

            // Act
            await ragService.clearData();

            // Assert
            expect(vectorRepository.clearAll).toHaveBeenCalled();
        });
    });
});