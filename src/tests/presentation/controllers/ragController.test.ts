import { RAGController } from '@presentation/controllers/ragController';
import { Request, Response } from 'express';
import { RAGService } from '@application/services/ragService';
import { VectorRepository } from '@infrastructure/database/repositories/vectorRepository';
import { OllamaClient } from '@infrastructure/llm/ollamaClient';
import { WeaviateClient } from '@infrastructure/database/weaviateClient';
import { OllamaEmbeddingService } from '@infrastructure/llm/ollamaEmbeddingService';

// Mock dependencies
jest.mock('@application/services/ragService');
jest.mock('@infrastructure/database/repositories/vectorRepository');
jest.mock('@infrastructure/llm/ollamaClient');
jest.mock('@infrastructure/database/weaviateClient');
jest.mock('@infrastructure/llm/ollamaEmbeddingService');

describe('RAGController', () => {
    // Mock request and response objects
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let ragController: RAGController;
    let mockRAGService: jest.Mocked<RAGService>;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock response object with jest functions
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        // Create a spy on the RAGService constructor to capture the instance
        jest.spyOn(RAGService.prototype, 'insertData');

        // Create controller instance
        ragController = new RAGController();

        // Access the private ragService property for mocking
        mockRAGService = (ragController as any).ragService;
    });

    describe('handleInsert', () => {
        it('should successfully insert data when valid content and metadata are provided', async () => {
            // Arrange
            const content = 'Test content for insertion';
            const metadata = { topic: 'Test Topic', author: 'Test Author' };
            const generatedId = '123e4567-e89b-12d3-a456-426614174000'; // UUID format

            mockRequest = {
                body: { content, metadata }
            };

            // Setup mock for the insertData method
            mockRAGService.insertData = jest.fn().mockResolvedValue(generatedId);

            // Act
            await ragController.handleInsert(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockRAGService.insertData).toHaveBeenCalledWith(content, metadata);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Data inserted successfully',
                id: generatedId
            });
        });

        it('should return 400 error when content is missing', async () => {
            // Arrange
            mockRequest = {
                body: { metadata: { topic: 'Test Topic' } } // Missing content
            };

            // Act
            await ragController.handleInsert(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockRAGService.insertData).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'content are required'
            });
        });

        it('should return 400 error when content is empty string', async () => {
            // Arrange
            mockRequest = {
                body: { content: '', metadata: { topic: 'Test Topic' } }
            };

            // Act
            await ragController.handleInsert(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockRAGService.insertData).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'content are required'
            });
        });

        it('should handle insertion when metadata is missing', async () => {
            // Arrange
            const content = 'Test content without metadata';
            const generatedId = '123e4567-e89b-12d3-a456-426614174001';

            mockRequest = {
                body: { content } // No metadata
            };

            mockRAGService.insertData = jest.fn().mockResolvedValue(generatedId);

            // Act
            await ragController.handleInsert(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockRAGService.insertData).toHaveBeenCalledWith(content, undefined);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Data inserted successfully',
                id: generatedId
            });
        });

        it('should handle insertion with empty metadata object', async () => {
            // Arrange
            const content = 'Test content with empty metadata';
            const metadata = {};
            const generatedId = '123e4567-e89b-12d3-a456-426614174002';

            mockRequest = {
                body: { content, metadata }
            };

            mockRAGService.insertData = jest.fn().mockResolvedValue(generatedId);

            // Act
            await ragController.handleInsert(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockRAGService.insertData).toHaveBeenCalledWith(content, metadata);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Data inserted successfully',
                id: generatedId
            });
        });

        it('should return 500 error when insertData throws an error', async () => {
            // Arrange
            const content = 'Test content that causes error';
            const metadata = { topic: 'Error Topic' };
            const errorMessage = 'Failed to generate embedding';

            mockRequest = {
                body: { content, metadata }
            };

            mockRAGService.insertData = jest.fn().mockRejectedValue(new Error(errorMessage));

            // Act
            await ragController.handleInsert(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockRAGService.insertData).toHaveBeenCalledWith(content, metadata);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: errorMessage
            });
        });

        it('should handle non-Error object rejection from insertData', async () => {
            // Arrange
            const content = 'Test content with non-Error rejection';
            const metadata = { topic: 'Test Topic' };

            mockRequest = {
                body: { content, metadata }
            };

            mockRAGService.insertData = jest.fn().mockRejectedValue('String error');

            // Act
            await ragController.handleInsert(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockRAGService.insertData).toHaveBeenCalledWith(content, metadata);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Failed to insert data'
            });
        });

        it('should handle large content properly', async () => {
            // Arrange
            const content = 'A'.repeat(10000); // Large content
            const metadata = { topic: 'Large Content' };
            const generatedId = '123e4567-e89b-12d3-a456-426614174003';

            mockRequest = {
                body: { content, metadata }
            };

            mockRAGService.insertData = jest.fn().mockResolvedValue(generatedId);

            // Act
            await ragController.handleInsert(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockRAGService.insertData).toHaveBeenCalledWith(content, metadata);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Data inserted successfully',
                id: generatedId
            });
        });

        it('should handle complex metadata structures', async () => {
            // Arrange
            const content = 'Test content with complex metadata';
            const metadata = {
                topic: 'Complex Topic',
                authors: ['Author 1', 'Author 2'],
                details: {
                    published: true,
                    date: '2023-01-01',
                    tags: ['tag1', 'tag2']
                }
            };
            const generatedId = '123e4567-e89b-12d3-a456-426614174004';

            mockRequest = {
                body: { content, metadata }
            };

            mockRAGService.insertData = jest.fn().mockResolvedValue(generatedId);

            // Act
            await ragController.handleInsert(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockRAGService.insertData).toHaveBeenCalledWith(content, metadata);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Data inserted successfully',
                id: generatedId
            });
        });
    });
});