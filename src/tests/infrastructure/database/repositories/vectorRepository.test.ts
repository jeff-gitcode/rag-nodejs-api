import { VectorRepository } from '@infrastructure/database/repositories/vectorRepository';
import { WeaviateClient } from '@infrastructure/database/weaviateClient';

// Mock the WeaviateClient
jest.mock('@infrastructure/database/weaviateClient');

describe('VectorRepository', () => {
    let vectorRepository: VectorRepository;
    let mockWeaviateClient: jest.Mocked<WeaviateClient>;

    // Setup console spies to prevent logs during tests
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create a mock WeaviateClient
        mockWeaviateClient = new WeaviateClient() as jest.Mocked<WeaviateClient>;

        // Create the repository with the mock client
        vectorRepository = new VectorRepository(mockWeaviateClient);

        // Spy on console.error to prevent cluttering test output
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        // Restore console methods
        consoleErrorSpy.mockRestore();
    });

    describe('clearAll', () => {
        it('should successfully call deleteAllObjects on WeaviateClient', async () => {
            // Arrange
            mockWeaviateClient.deleteAllObjects = jest.fn().mockResolvedValue(undefined);

            // Act
            await vectorRepository.clearAll();

            // Assert
            expect(mockWeaviateClient.deleteAllObjects).toHaveBeenCalledTimes(1);
        });

        it('should throw an error when deleteAllObjects fails', async () => {
            // Arrange
            const errorMessage = 'Failed to delete objects';
            mockWeaviateClient.deleteAllObjects = jest.fn().mockRejectedValue(new Error(errorMessage));

            // Act & Assert
            await expect(vectorRepository.clearAll()).rejects.toThrow(`Failed to clear vector database: ${errorMessage}`);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing vector database:', expect.any(Error));
        });

        it('should handle non-Error object rejection', async () => {
            // Arrange
            mockWeaviateClient.deleteAllObjects = jest.fn().mockRejectedValue('String error');

            // Act & Assert
            await expect(vectorRepository.clearAll()).rejects.toThrow('Failed to clear vector database: Unknown error');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing vector database:', 'String error');
        });

        it('should throw an error when client is not WeaviateClient', async () => {
            // Arrange
            // Create a repository with a non-WeaviateClient
            const nonWeaviateClient = {} as unknown as WeaviateClient;
            const repository = new VectorRepository(nonWeaviateClient);

            // Force the isWeaviate flag to be false for testing
            Object.defineProperty(repository, 'isWeaviate', { value: false });

            // Act & Assert
            await expect(repository.clearAll()).rejects.toThrow('Clear operation not supported for this vector database');
        });

        it('should check if client is WeaviateClient before calling deleteAllObjects', async () => {
            // Arrange
            const repository = new VectorRepository(mockWeaviateClient);

            // Force the isWeaviate flag to be false for testing
            Object.defineProperty(repository, 'isWeaviate', { value: false });

            // Act & Assert
            await expect(repository.clearAll()).rejects.toThrow('Clear operation not supported for this vector database');
            expect(mockWeaviateClient.deleteAllObjects).not.toHaveBeenCalled();
        });

        it('should correctly identify WeaviateClient instance', async () => {
            // Arrange
            mockWeaviateClient.deleteAllObjects = jest.fn().mockResolvedValue(undefined);

            // Create a repository and ensure isWeaviate is correctly set
            const repository = new VectorRepository(mockWeaviateClient);

            // We need to access the private isWeaviate property
            const isWeaviate = Object.getOwnPropertyDescriptor(
                Object.getPrototypeOf(repository), 'isWeaviate'
            )?.get?.call(repository);

            // Act
            await repository.clearAll();

            // Assert
            expect(isWeaviate).toBe(true);
            expect(mockWeaviateClient.deleteAllObjects).toHaveBeenCalled();
        });

        it('should convert any error to a standardized error format', async () => {
            // Arrange
            // Use a custom error object with additional properties
            const customError = Object.assign(new Error('Custom error'), {
                code: 500,
                details: 'Additional details'
            });

            mockWeaviateClient.deleteAllObjects = jest.fn().mockRejectedValue(customError);

            // Act & Assert
            await expect(vectorRepository.clearAll()).rejects.toThrow('Failed to clear vector database: Custom error');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing vector database:', expect.objectContaining({
                message: 'Custom error',
                code: 500
            }));
        });
    });
});