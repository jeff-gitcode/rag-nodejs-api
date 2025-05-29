import { Request, Response } from 'express';
import { RAGService } from '@application/services/ragService';
import { VectorRepository } from '@infrastructure/database/repositories/vectorRepository';
import { OllamaClient } from '@infrastructure/llm/ollamaClient';
import { PineconeClient } from '@infrastructure/database/pineconeClient';
import { WeaviateClient } from '@infrastructure/database/weaviateClient';

export class RAGController {
    private readonly ragService: RAGService;

    constructor() {
        // Determine which vector database to use based on environment
        const useWeaviate = process.env.VECTOR_DB === 'weaviate' || !process.env.PINECONE_API_KEY;
        let vectorRepository;
        console.log(`Using ${useWeaviate ? 'Weaviate' : 'Pinecone'} for vector storage`);
        // if (useWeaviate) {
        // Use Weaviate for local development
        const weaviateClient = new WeaviateClient();
        vectorRepository = new VectorRepository(weaviateClient);
        // } else {
        //     // Use Pinecone for production
        //     const pineconeClient = new PineconeClient(
        //         process.env.PINECONE_API_KEY ?? '',
        //         process.env.PINECONE_ENVIRONMENT ?? ''
        //     );
        //     vectorRepository = new VectorRepository(pineconeClient);
        // }

        const llmClient = new OllamaClient();
        this.ragService = new RAGService(vectorRepository, llmClient);
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