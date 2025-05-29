// src/application/services/ragService.ts
import { IRAGService } from "../interfaces/IRAGService";
import { IEmbeddingService } from "../interfaces/IEmbeddingService";
import { QueryModel } from "../../domain/models/queryModel";
import { VectorRepository } from "../../infrastructure/database/repositories/vectorRepository";
import { OllamaClient } from "../../infrastructure/llm/ollamaClient";
import crypto from "crypto";

export class RAGService implements IRAGService {
    private readonly vectorRepository: VectorRepository;
    private readonly llmClient: OllamaClient;
    private readonly embeddingService: IEmbeddingService;

    constructor(
        vectorRepository: VectorRepository,
        llmClient: OllamaClient,
        embeddingService: IEmbeddingService
    ) {
        this.vectorRepository = vectorRepository;
        this.llmClient = llmClient;
        this.embeddingService = embeddingService;
    }

    async generateResponse(query: string): Promise<string> {
        const queryModel = new QueryModel(query);
        console.log('Generating response for query:', queryModel.text);

        const vectorData = await this.vectorRepository.queryVector(queryModel.text, 3); // Limit to top 3 results
        console.log('Top 3 most relevant documents retrieved:');
        vectorData.forEach((item, index) => {
            console.log(`${index + 1}. ${item.content.substring(0, 100)}... (certainty: ${item._additional?.certainty || 'N/A'})`);
        });

        const augmentedQuery = this.augmentQuery(queryModel, vectorData);
        console.log('Augmented query:', augmentedQuery);

        const response = await this.llmClient.getResponse(augmentedQuery);
        console.log('LLM response:', response);

        return response;
    }

    private augmentQuery(queryModel: QueryModel, vectorData: any[]): string {
        // Extract content from vector data to use as context
        const context = vectorData
            .map(item => item.content)
            .filter(Boolean)
            .join('\n\n');

        // Augment the query with the retrieved context and request list formatting
        return `Answer the following question based on the provided context.
        
    Context:
    ${context}
    
    Question: ${queryModel.text}
    
    Format your answer as a bulleted list wherever appropriate. If the answer contains multiple points or items, present each in a separate bullet point starting with "- ".
    
    Answer:`;
    }

    async insertData(content: string, metadata: any): Promise<string> {
        // Generate a unique UUID for the document
        const id = crypto.randomUUID();

        // Generate vector embedding for the content using the injected embedding service
        const vector = await this.embeddingService.generateEmbedding(content);

        // Call the upsertVector method of the VectorRepository
        await this.vectorRepository.upsertVector({
            id: id,
            content: content,
            vector: vector,
            metadata: metadata.topic
        });

        return id;
    }

    async clearData(): Promise<void> {
        await this.vectorRepository.clearAll();
    }
}