import { PineconeClient } from "../pineconeClient";
import { WeaviateClient } from "../weaviateClient";

export class VectorRepository {
    private readonly client: PineconeClient | WeaviateClient;
    private readonly isWeaviate: boolean;

    constructor(client: PineconeClient | WeaviateClient) {
        this.client = client;
        this.isWeaviate = client instanceof WeaviateClient;
    }

    async upsertVector(vector: any): Promise<void> {
        await this.client.upsertVector(vector);
    }

    async queryVector(query: string): Promise<any> {
        return await this.client.queryVector(query);
    }
}