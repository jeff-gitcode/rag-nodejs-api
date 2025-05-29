import { Request, Response } from 'express';
import { RAGService } from '@application/services/ragService';
import { VectorRepository } from '@infrastructure/database/repositories/vectorRepository';
import { OllamaClient } from '@infrastructure/llm/ollamaClient';
import { WeaviateClient } from '@infrastructure/database/weaviateClient';
import { OllamaEmbeddingService } from '@infrastructure/llm/ollamaEmbeddingService';

export class RAGController {
    private readonly ragService: RAGService;

    constructor() {
        // Use Weaviate for vector storage
        const weaviateClient = new WeaviateClient();
        const vectorRepository = new VectorRepository(weaviateClient);
        
        // Create LLM client
        const llmClient = new OllamaClient();
        
        // Create embedding service
        const embeddingService = new OllamaEmbeddingService();
        
        // Create RAG service with all dependencies
        this.ragService = new RAGService(vectorRepository, llmClient, embeddingService);
    }

    public async handleQuery(req: Request, res: Response): Promise<void> {
        try {
            const { query } = req.body;
            console.log('Received query:', query);

            if (!query) {
                res.status(400).json({ error: 'Query is required' });
                return;
            }

            const response = await this.ragService.generateResponse(query);
            res.status(200).json({ response });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async handleInsert(req: Request, res: Response): Promise<void> {
        try {
            const { content, metadata } = req.body;

            if (!content) {
                res.status(400).json({ error: 'content are required' });
                return;
            }

            const id = await this.ragService.insertData(content, metadata);
            res.status(200).json({ message: 'Data inserted successfully', id });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to insert data' });
        }
    }

    public async handleClear(req: Request, res: Response): Promise<void> {
        try {
            await this.ragService.clearData();
            res.status(200).json({ message: 'Vector database cleared successfully' });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to clear vector database' });
        }
    }
}