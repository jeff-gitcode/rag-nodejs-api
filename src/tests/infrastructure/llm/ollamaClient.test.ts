import { OllamaClient } from '@infrastructure/llm/ollamaClient';
import axios from 'axios';

// src/infrastructure/llm/ollamaClient.test.ts

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaClient', () => {
    // Reset mocks between tests
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with default model when no model is provided', () => {
            // Act
            const client = new OllamaClient();

            // Assert
            // We need to access private properties for testing
            // Using type assertion to access private properties
            const clientAsAny = client as any;
            expect(clientAsAny.baseUrl).toBe('http://localhost:11434');
            expect(clientAsAny.model).toBe('llama3.2');
        });

        it('should initialize with custom model when provided', () => {
            // Arrange
            const customModel = 'mistral:7b';

            // Act
            const client = new OllamaClient(customModel);

            // Assert
            const clientAsAny = client as any;
            expect(clientAsAny.baseUrl).toBe('http://localhost:11434');
            expect(clientAsAny.model).toBe(customModel);
        });
    });

    describe('getResponse', () => {
        it('should call Ollama API with correct parameters and return response', async () => {
            // Arrange
            const client = new OllamaClient();
            const testPrompt = 'What is the capital of France?';
            const expectedResponse = 'The capital of France is Paris.';

            // Mock successful axios response
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    response: expectedResponse
                }
            });

            // Act
            const result = await client.getResponse(testPrompt);

            // Assert
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'http://localhost:11434/api/generate',
                {
                    model: 'llama3.2',
                    prompt: testPrompt,
                    stream: false
                },
                {
                    timeout: 60000
                }
            );
            expect(result).toBe(expectedResponse);
        });

        it('should use custom model when provided', async () => {
            // Arrange
            const customModel = 'mistral:7b';
            const client = new OllamaClient(customModel);
            const testPrompt = 'What is the capital of France?';

            // Mock successful response
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    response: 'Test response'
                }
            });

            // Act
            await client.getResponse(testPrompt);

            // Assert
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'http://localhost:11434/api/generate',
                {
                    model: customModel,
                    prompt: testPrompt,
                    stream: false
                },
                expect.anything()
            );
        });

        it('should throw an error with message when axios request fails with Error object', async () => {
            // Arrange
            const client = new OllamaClient();
            const testPrompt = 'What is the capital of France?';
            const errorMessage = 'Network error';

            // Mock axios failure
            mockedAxios.post.mockRejectedValueOnce(new Error(errorMessage));

            // Spy on console.error to verify it's called
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act & Assert
            await expect(client.getResponse(testPrompt)).rejects.toThrow(
                `Error fetching response from Ollama: ${errorMessage}`
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Ollama API Error:',
                expect.any(Error)
            );

            // Restore console.error
            consoleErrorSpy.mockRestore();
        });

        it('should throw a generic error when axios request fails with non-Error object', async () => {
            // Arrange
            const client = new OllamaClient();
            const testPrompt = 'What is the capital of France?';

            // Mock axios failure with non-Error object
            mockedAxios.post.mockRejectedValueOnce('Some string error');

            // Act & Assert
            await expect(client.getResponse(testPrompt)).rejects.toThrow(
                'Error fetching response from Ollama: Unknown error'
            );
        });

        it('should handle empty response from Ollama API', async () => {
            // Arrange
            const client = new OllamaClient();
            const testPrompt = 'What is the capital of France?';

            // Mock response with empty/undefined response field
            mockedAxios.post.mockResolvedValueOnce({
                data: {}
            });

            // Act
            const result = await client.getResponse(testPrompt);

            // Assert
            expect(result).toBeUndefined();
        });

        it('should handle timeout properly', async () => {
            // Arrange
            const client = new OllamaClient();
            const testPrompt = 'A very complex query that might timeout';
            const timeoutError = new Error('timeout of 60000ms exceeded');

            // Mock axios timeout
            mockedAxios.post.mockRejectedValueOnce(timeoutError);

            // Act & Assert
            await expect(client.getResponse(testPrompt)).rejects.toThrow(
                `Error fetching response from Ollama: ${timeoutError.message}`
            );
        });
    });
});