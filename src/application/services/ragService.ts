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

    private augmentQuery(queryModel: QueryModel, vectorData: any): string {
        // Logic to augment the query with vector data
        return `${queryModel.text} ${vectorData}`;
    }
}