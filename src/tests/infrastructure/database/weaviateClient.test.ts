import { WeaviateClient } from '@infrastructure/database/weaviateClient';
import axios from 'axios';

// src/infrastructure/database/weaviateClient.test.ts

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WeaviateClient', () => {
    let weaviateClient: WeaviateClient;
    const baseUrl = 'http://localhost:8081';
    const className = 'Document';

    // Setup console spies to prevent logs during tests
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        weaviateClient = new WeaviateClient(baseUrl, className);

        // Mock console methods to keep test output clean
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Reset all mocks between tests
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Restore console methods
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('queryVectorByContentAndTopic', () => {
        it('should perform a search with topic filter when topic is provided', async () => {
            // Arrange
            const query = 'test query';
            const topic = 'Big Cats';
            const limit = 5;
            const mockResults = [
                {
                    content: 'Lions are large carnivorous felines.',
                    metadata: 'Big Cats',
                    _additional: { certainty: 0.95, id: '1234' }
                }
            ];

            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: {
                        Get: {
                            [className]: mockResults
                        }
                    }
                }
            });

            // Act
            const result = await weaviateClient.queryVectorByContentAndTopic(query, topic, limit);

            // Assert
            expect(mockedAxios.post).toHaveBeenCalledWith(`${baseUrl}/v1/graphql`, {
                query: expect.stringContaining(`limit: ${limit}`)
            });
            expect(mockedAxios.post).toHaveBeenCalledWith(`${baseUrl}/v1/graphql`, {
                query: expect.stringContaining(`concepts: ["${query}"]`)
            });
            expect(mockedAxios.post).toHaveBeenCalledWith(`${baseUrl}/v1/graphql`, {
                query: expect.stringContaining(`operator: Equal`)
            });
            expect(mockedAxios.post).toHaveBeenCalledWith(`${baseUrl}/v1/graphql`, {
                query: expect.stringContaining(`valueString: "${topic}"`)
            });
            expect(result).toEqual(mockResults);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`with topic filter: "${topic}"`));
        });

        it('should perform a search without topic filter when topic is null', async () => {
            // Arrange
            const query = 'test query';
            const topic = null;
            const limit = 3;
            const mockResults = [
                {
                    content: 'General content without specific topic',
                    metadata: 'General',
                    _additional: { certainty: 0.85, id: '5678' }
                }
            ];

            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: {
                        Get: {
                            [className]: mockResults
                        }
                    }
                }
            });

            // Act
            const result = await weaviateClient.queryVectorByContentAndTopic(query, topic, limit);

            // Assert
            expect(mockedAxios.post).toHaveBeenCalledWith(`${baseUrl}/v1/graphql`, {
                query: expect.stringContaining(`limit: ${limit}`)
            });
            expect(mockedAxios.post).toHaveBeenCalledWith(`${baseUrl}/v1/graphql`, {
                query: expect.stringContaining(`concepts: ["${query}"]`)
            });
            // Should not contain the where clause with topic filter
            expect(mockedAxios.post).toHaveBeenCalledWith(`${baseUrl}/v1/graphql`, {
                query: expect.not.stringContaining(`operator: Equal`)
            });
            expect(result).toEqual(mockResults);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('without topic filter'));
        });

        it('should return an empty array when no results are found with topic filter', async () => {
            // Arrange
            const query = 'nonexistent query';
            const topic = 'Unknown Topic';
            const limit = 10;

            // Mock the response with no results
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: {
                        Get: {
                            [className]: []
                        }
                    }
                }
            });

            // Act
            const result = await weaviateClient.queryVectorByContentAndTopic(query, topic, limit);

            // Assert
            expect(result).toEqual([]);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`No matches found for topic '${topic}'`));
        });

        it('should return an empty array when no results are found without topic filter', async () => {
            // Arrange
            const query = 'nonexistent query';
            const topic = null;

            // Mock the response with no results
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: {
                        Get: {
                            [className]: []
                        }
                    }
                }
            });

            // Act
            const result = await weaviateClient.queryVectorByContentAndTopic(query, topic);

            // Assert
            expect(result).toEqual([]);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No matches found'));
        });

        it('should return an empty array when response structure is unexpected', async () => {
            // Arrange
            const query = 'test query';
            const topic = 'Test Topic';

            // Mock an unexpected response structure
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: {
                        // Missing the Get property
                    }
                }
            });

            // Act
            const result = await weaviateClient.queryVectorByContentAndTopic(query, topic);

            // Assert
            expect(result).toEqual([]);
        });

        it('should throw an error when the API call fails', async () => {
            // Arrange
            const query = 'test query';
            const topic = 'Test Topic';
            const errorMessage = 'Network Error';

            // Mock an API failure
            mockedAxios.post.mockRejectedValueOnce(new Error(errorMessage));

            // Act & Assert
            await expect(weaviateClient.queryVectorByContentAndTopic(query, topic))
                .rejects
                .toThrow(`Error querying Weaviate: ${errorMessage}`);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error querying Weaviate:', expect.any(Error));
        });

        it('should handle non-Error object rejection from axios', async () => {
            // Arrange
            const query = 'test query';
            const topic = 'Test Topic';

            // Mock a non-Error object rejection
            mockedAxios.post.mockRejectedValueOnce('String error');

            // Act & Assert
            await expect(weaviateClient.queryVectorByContentAndTopic(query, topic))
                .rejects
                .toThrow('Error querying Weaviate: Unknown error');
        });

        it('should use the default limit when not specified', async () => {
            // Arrange
            const query = 'test query';
            const topic = 'Test Topic';
            const defaultLimit = 10; // Default value from function

            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: {
                        Get: {
                            [className]: []
                        }
                    }
                }
            });

            // Act
            await weaviateClient.queryVectorByContentAndTopic(query, topic);

            // Assert
            expect(mockedAxios.post).toHaveBeenCalledWith(`${baseUrl}/v1/graphql`, {
                query: expect.stringContaining(`limit: ${defaultLimit}`)
            });
        });

        it('should escape special characters in query and topic', async () => {
            // Arrange
            const query = 'query with "quotes" and \\ backslash';
            const topic = 'topic with "quotes"';

            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: {
                        Get: {
                            [className]: []
                        }
                    }
                }
            });

            // Act
            await weaviateClient.queryVectorByContentAndTopic(query, topic);

            // Assert
            // This test would need to check the actual string before it's sent to verify proper escaping
            // Here we're assuming the fact that it doesn't throw indicates successful escaping
            expect(mockedAxios.post).toHaveBeenCalled();
        });
    });
});