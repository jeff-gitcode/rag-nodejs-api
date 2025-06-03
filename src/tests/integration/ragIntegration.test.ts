import request from 'supertest';
import express from 'express';
import axios from 'axios';
import { setRAGRoutes } from '@presentation/routes/ragRoutes';
import { errorHandler } from '@presentation/middlewares/errorHandler';
import { WeaviateClient } from '@infrastructure/database/weaviateClient';

// Mock axios to avoid actual API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RAG API Integration Tests', () => {
    // Set up the express app for testing
    const app = express();
    app.use(express.json());
    setRAGRoutes(app);
    app.use(errorHandler);

    // Set up test data
    const testDocs = [
        {
            content: 'Retrieval-Augmented Generation (RAG) combines retrieval mechanisms with text generation.',
            metadata: { topic: 'RAG Fundamentals' }
        },
        {
            content: 'Vector databases store embeddings for semantic search capabilities.',
            metadata: { topic: 'Vector Databases' }
        }
    ];

    // Mock responses for WeaviateClient
    beforeAll(() => {
        // Mock successful class initialization
        mockedAxios.get.mockImplementation((url) => {
            if (url.includes('/v1/schema/')) {
                return Promise.resolve({ data: {} });
            }
            return Promise.reject(new Error('Not found'));
        });

        // Mock successful document insertion
        mockedAxios.post.mockImplementation((url, data) => {
            if (url.includes('/v1/objects')) {
                return Promise.resolve({ data: { id: 'test-id' } });
            } else if (url.includes('/v1/graphql')) {
                // Simulate successful query with matching results
                if (data.query.includes('RAG') || data.query.includes('retrieval')) {
                    return Promise.resolve({
                        data: {
                            data: {
                                Get: {
                                    Document: [
                                        {
                                            content: testDocs[0].content,
                                            metadata: testDocs[0].metadata.topic,
                                            _additional: { certainty: 0.95, id: 'test-id-1' }
                                        }
                                    ]
                                }
                            }
                        }
                    });
                } else if (data.query.includes('vector')) {
                    return Promise.resolve({
                        data: {
                            data: {
                                Get: {
                                    Document: [
                                        {
                                            content: testDocs[1].content,
                                            metadata: testDocs[1].metadata.topic,
                                            _additional: { certainty: 0.85, id: 'test-id-2' }
                                        }
                                    ]
                                }
                            }
                        }
                    });
                } else {
                    return Promise.resolve({
                        data: {
                            data: {
                                Get: {
                                    Document: []
                                }
                            }
                        }
                    });
                }
            } else if (url.includes('/api/embeddings') || url.includes('/api/generate')) {
                // Mock Ollama API responses
                if (url.includes('/api/embeddings')) {
                    return Promise.resolve({
                        data: {
                            embedding: Array(1536).fill(0.1)
                        }
                    });
                } else if (url.includes('/api/generate')) {
                    const prompt = (data as any).prompt;
                    if (prompt.includes('RAG') || prompt.includes('retrieval')) {
                        return Promise.resolve({
                            data: {
                                response: '- RAG combines retrieval with generation\n- It enhances LLM responses with external knowledge'
                            }
                        });
                    } else if (prompt.includes('vector')) {
                        return Promise.resolve({
                            data: {
                                response: '- Vector databases store embeddings\n- They enable semantic search capabilities'
                            }
                        });
                    } else {
                        return Promise.resolve({
                            data: {
                                response: 'I don\'t have enough information to answer this question.'
                            }
                        });
                    }
                }
            }

            return Promise.resolve({ data: {} });
        });

        // Mock deletion for clearAll
        mockedAxios.delete.mockResolvedValue({});
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Silence console output during tests
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });

    // Helper function to insert test documents
    const insertTestDocuments = async () => {
        for (const doc of testDocs) {
            await request(app)
                .post('/api/rag/insert')
                .send({ content: doc.content, metadata: doc.metadata });
        }
    };

    describe('Document Management', () => {
        it('should successfully insert a document', async () => {
            const response = await request(app)
                .post('/api/rag/insert')
                .send({
                    content: testDocs[0].content,
                    metadata: testDocs[0].metadata
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Data inserted successfully');
            expect(response.body).toHaveProperty('id');
            expect(mockedAxios.post).toHaveBeenCalled();
        });

        it('should return 400 when trying to insert without content', async () => {
            const response = await request(app)
                .post('/api/rag/insert')
                .send({
                    metadata: { topic: 'Test Topic' }
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'content are required');
        });

        it('should clear all documents', async () => {
            // Mock GraphQL response for getting all document IDs
            mockedAxios.post.mockImplementationOnce((url, data) => {
                if (url.includes('/v1/graphql') && (data as any).query.includes('_additional')) {
                    return Promise.resolve({
                        data: {
                            data: {
                                Get: {
                                    Document: [
                                        { _additional: { id: 'doc-1' } },
                                        { _additional: { id: 'doc-2' } }
                                    ]
                                }
                            }
                        }
                    });
                }
                return Promise.resolve({ data: {} });
            });

            const response = await request(app)
                .post('/api/rag/clear')
                .send({});

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Vector database cleared successfully');
            expect(mockedAxios.delete).toHaveBeenCalled();
        });
    });

    describe('Query Processing', () => {
        beforeEach(async () => {
            await insertTestDocuments();
        });

        it('should return a relevant response for a RAG-related query', async () => {
            const response = await request(app)
                .post('/api/rag/generate')
                .send({
                    query: 'What is RAG?'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('response');
            expect(response.body.response).toContain('RAG combines retrieval with generation');
            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/v1/graphql'),
                expect.objectContaining({
                    query: expect.stringContaining('nearText')
                })
            );
        });

        it('should return a relevant response for a vector database query', async () => {
            const response = await request(app)
                .post('/api/rag/generate')
                .send({
                    query: 'What are vector databases used for?'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('response');
            expect(response.body.response).toContain('Vector databases store embeddings');
        });

        it('should filter by topic when provided', async () => {
            // Mock implementation for topic filtering
            mockedAxios.post.mockImplementationOnce((url, data) => {
                if (url.includes('/v1/graphql') &&
                    (data as any).query.includes('valueString: "RAG Fundamentals"')) {
                    return Promise.resolve({
                        data: {
                            data: {
                                Get: {
                                    Document: [{
                                        content: testDocs[0].content,
                                        metadata: testDocs[0].metadata.topic,
                                        _additional: { certainty: 0.95, id: 'test-id-1' }
                                    }]
                                }
                            }
                        }
                    });
                }
                return Promise.resolve({ data: {} });
            });

            const response = await request(app)
                .post('/api/rag/generate')
                .send({
                    query: 'Explain this concept',
                    topic: 'RAG Fundamentals'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('response');
            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/v1/graphql'),
                expect.objectContaining({
                    query: expect.stringContaining('valueString: "RAG Fundamentals"')
                })
            );
        });

        it('should return 400 when query is missing', async () => {
            const response = await request(app)
                .post('/api/rag/generate')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Query is required');
        });

        it('should handle the case when no relevant documents are found', async () => {
            // Mock empty result set for irrelevant query
            mockedAxios.post.mockImplementationOnce((url, data) => {
                if (url.includes('/v1/graphql')) {
                    return Promise.resolve({
                        data: {
                            data: {
                                Get: {
                                    Document: []
                                }
                            }
                        }
                    });
                }
                return Promise.resolve({ data: {} });
            });

            const response = await request(app)
                .post('/api/rag/generate')
                .send({
                    query: 'Something completely unrelated'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('response');
            expect(response.body.response).toContain('don\'t have enough information');
        });
    });

    describe('Error handling', () => {
        it('should handle errors when Weaviate is unavailable', async () => {
            // Mock a failure in the database
            mockedAxios.post.mockRejectedValueOnce(new Error('Database connection error'));

            const response = await request(app)
                .post('/api/rag/generate')
                .send({
                    query: 'What is RAG?'
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle errors when Ollama is unavailable', async () => {
            // Mock successful DB query but failed LLM call
            mockedAxios.post.mockImplementationOnce((url) => {
                if (url.includes('/v1/graphql')) {
                    return Promise.resolve({
                        data: {
                            data: {
                                Get: {
                                    Document: [{
                                        content: testDocs[0].content,
                                        metadata: testDocs[0].metadata.topic,
                                        _additional: { certainty: 0.95 }
                                    }]
                                }
                            }
                        }
                    });
                }
                return Promise.reject(new Error('LLM service unavailable'));
            });

            const response = await request(app)
                .post('/api/rag/generate')
                .send({
                    query: 'What is RAG?'
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });
});