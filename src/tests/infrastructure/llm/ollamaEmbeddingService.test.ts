import { OllamaEmbeddingService } from '@infrastructure/llm/ollamaEmbeddingService';
import axios from 'axios';


// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaEmbeddingService', () => {
    let embeddingService: OllamaEmbeddingService;

    beforeEach(() => {
        embeddingService = new OllamaEmbeddingService();
        jest.clearAllMocks();
        // Silence console output during tests
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should generate embedding using Ollama API', async () => {
        // Arrange
        const mockEmbedding = Array(1536).fill(0.1);
        const inputText = 'This is a test text for embedding generation';

        mockedAxios.post.mockResolvedValueOnce({
            data: {
                embedding: mockEmbedding
            }
        });

        // Act
        const result = await embeddingService.generateEmbedding(inputText);

        // Assert
        expect(mockedAxios.post).toHaveBeenCalledWith(
            'http://localhost:11434/api/embeddings',
            {
                model: 'llama3.2',
                prompt: inputText
            }
        );
        expect(result).toEqual(mockEmbedding);
        expect(result.length).toBe(1536);
    });

    it('should fall back to random vector when API response is missing embedding data', async () => {
        // Arrange
        const inputText = 'This is another test text';

        mockedAxios.post.mockResolvedValueOnce({
            data: {} // No embedding data in response
        });

        // Spy on the private generateRandomEmbedding method
        const spyGenerateRandomEmbedding = jest.spyOn(
            embeddingService as any, // Cast to any to access private method
            'generateRandomEmbedding'
        );

        // Act
        const result = await embeddingService.generateEmbedding(inputText);

        // Assert
        expect(mockedAxios.post).toHaveBeenCalled();
        expect(spyGenerateRandomEmbedding).toHaveBeenCalled();
        expect(result.length).toBe(1536);
        expect(console.warn).toHaveBeenCalledWith(
            'Warning: Embedding generation failed, falling back to random vector'
        );
    });

    it('should fall back to random vector when API call fails', async () => {
        // Arrange
        const inputText = 'This should trigger an error';
        const mockError = new Error('API connection failed');

        mockedAxios.post.mockRejectedValueOnce(mockError);

        // Act
        const result = await embeddingService.generateEmbedding(inputText);

        // Assert
        expect(mockedAxios.post).toHaveBeenCalled();
        expect(result.length).toBe(1536);
        expect(console.error).toHaveBeenCalledWith('Error generating embeddings:', mockError);
        expect(console.warn).toHaveBeenCalledWith('Error: Falling back to random embedding vector');
    });

    it('should use custom base URL when provided', async () => {
        // Arrange
        const customBaseUrl = 'http://custom-ollama:11434';
        const customEmbeddingService = new OllamaEmbeddingService(customBaseUrl);
        const inputText = 'Testing custom base URL';

        mockedAxios.post.mockResolvedValueOnce({
            data: {
                embedding: Array(1536).fill(0.2)
            }
        });

        // Act
        await customEmbeddingService.generateEmbedding(inputText);

        // Assert
        expect(mockedAxios.post).toHaveBeenCalledWith(
            `${customBaseUrl}/api/embeddings`,
            expect.anything()
        );
    });

    it('should use custom model name when provided', async () => {
        // Arrange
        const customModel = 'mistral:7b';
        const customEmbeddingService = new OllamaEmbeddingService('http://localhost:11434', customModel);
        const inputText = 'Testing custom model name';

        mockedAxios.post.mockResolvedValueOnce({
            data: {
                embedding: Array(1536).fill(0.3)
            }
        });

        // Act
        await customEmbeddingService.generateEmbedding(inputText);

        // Assert
        expect(mockedAxios.post).toHaveBeenCalledWith(
            expect.anything(),
            {
                model: customModel,
                prompt: inputText
            }
        );
    });

    it('should generate embedding vectors of specified dimensions', async () => {
        // Arrange
        const customDimensions = 768; // Different dimension size
        const customEmbeddingService = new OllamaEmbeddingService(
            'http://localhost:11434',
            'llama3.2',
            customDimensions
        );

        const inputText = 'Testing custom dimensions';

        // Force it to fall back to random vector to test dimensions
        mockedAxios.post.mockRejectedValueOnce(new Error('API error'));

        // Act
        const result = await customEmbeddingService.generateEmbedding(inputText);

        // Assert
        expect(result.length).toBe(customDimensions);
    });

    it('should truncate long text when logging', async () => {
        // Arrange
        const longInputText = 'A'.repeat(100);
        const logSpy = jest.spyOn(console, 'log');

        mockedAxios.post.mockResolvedValueOnce({
            data: {
                embedding: Array(1536).fill(0.4)
            }
        });

        // Act
        await embeddingService.generateEmbedding(longInputText);

        // Assert
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(`"${'A'.repeat(50)}..."`)
        );
    });

    it('should log success message with correct vector length', async () => {
        // Arrange
        const mockEmbedding = Array(1536).fill(0.5);
        const inputText = 'Success case';
        const logSpy = jest.spyOn(console, 'log');

        mockedAxios.post.mockResolvedValueOnce({
            data: {
                embedding: mockEmbedding
            }
        });

        // Act
        await embeddingService.generateEmbedding(inputText);

        // Assert
        expect(logSpy).toHaveBeenCalledWith(
            `Successfully generated embedding of length ${mockEmbedding.length}`
        );
    });
});