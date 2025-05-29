import { PineconeClient } from "../pineconeClient";
import { WeaviateClient } from "../weaviateClient";

export class VectorRepository {
    private readonly client: WeaviateClient;
    private readonly isWeaviate: boolean;

    constructor(client: WeaviateClient) {
        this.client = client;
        this.isWeaviate = client instanceof WeaviateClient;
    }

    async upsertVector(vector: any): Promise<void> {
        try {
            await this.client.upsertVector(vector.id, vector.content, vector.vector, vector.metadata);
        } catch (error) {
            console.error('Error upserting vector:', error);
            throw new Error(`Failed to upsert vector: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async queryVector(query: string, limit: number = 10): Promise<any[]> {
        return await this.client.queryVector(query, limit);
    }

    // Add this method to VectorRepository class
    async clearAll(): Promise<void> {
        try {
            if (this.isWeaviate) {
                await (this.client as WeaviateClient).deleteAllObjects();
            } else {
                throw new Error("Clear operation not supported for this vector database");
            }
        } catch (error) {
            console.error('Error clearing vector database:', error);
            throw new Error(`Failed to clear vector database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}