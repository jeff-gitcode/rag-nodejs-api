import { IRAGService } from "@application/interfaces/IRAGService";
import { QueryModel } from "@domain/models/queryModel";
import { VectorRepository } from "@infrastructure/database/repositories/vectorRepository";
import { OllamaClient } from "@infrastructure/llm/ollamaClient";

export class RAGService implements IRAGService {
    private readonly vectorRepository: VectorRepository;
    private readonly llmClient: OllamaClient;

    constructor(vectorRepository: VectorRepository, llmClient: OllamaClient) {
        this.vectorRepository = vectorRepository;
        this.llmClient = llmClient;
    }

    async generateResponse(query: string): Promise<string> {
        const queryModel = new QueryModel(query);
        console.log('Generating response for query:', queryModel.text);

        const vectorData = await this.vectorRepository.queryVector(queryModel.text);
        console.log('Vector data retrieved:', vectorData);

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

        // Augment the query with the retrieved context
        return `Answer the following question based on the provided context.
        
    Context:
    ${context}
    
    Question: ${queryModel.text}
    
    Answer:`;
    }

    async insertData(content: string, metadata: any): Promise<string> {
        // Generate a unique UUID for the document
        const id = crypto.randomUUID();

        // Generate vector embedding for the content
        const vector = await this.generateEmbedding(content);

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

    // Dummy function for generating embeddings - replace with actual implementation
    private async generateEmbedding(text: string): Promise<number[]> {
        // Replace this with actual embedding generation logic
        console.log(`Generating embedding for text: ${text}`);
        return Array.from({ length: 1536 }, () => Math.random()); // Dummy vector
    }
}