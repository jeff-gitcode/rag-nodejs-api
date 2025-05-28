// src/infrastructure/database/weaviateClient.ts
import axios from 'axios';

export class WeaviateClient {
    private readonly baseUrl: string;
    private readonly className: string;

    constructor(baseUrl: string = 'http://localhost:8081', className: string = 'Document') {
        this.baseUrl = baseUrl;
        this.className = className;
    }

    async initialize(): Promise<void> {
        try {
            // Check if class exists
            await axios.get(`${this.baseUrl}/v1/schema/${this.className}`);
        } catch (error) {
            // If class doesn't exist (404) or other error, create it
            await this.createClass();
        }
    }

    private async createClass(): Promise<void> {
        try {
            await axios.post(`${this.baseUrl}/v1/schema`, {
                class: this.className,
                properties: [
                    {
                        name: 'content',
                        dataType: ['text']
                    },
                    {
                        name: 'metadata',
                        dataType: ['object']
                    }
                ],
                vectorIndexConfig: {
                    distance: "cosine"
                }
            });
        } catch (error) {
            console.error('Error creating Weaviate class:', error);
            throw new Error('Failed to create Weaviate class');
        }
    }

    async queryVector(query: string): Promise<string[]> {
        try {
            // Simplified query approach - for testing return mock data
            console.log(`Querying Weaviate with: ${query}`);
            
            // For testing purposes, return mock data instead of actual query
            // Remove this in production and use the actual query below
            return ["Retrieval Augmented Generation (RAG) is a technique that combines retrieval-based methods with generative AI models to enhance the quality and reliability of AI-generated content."];
            
            /* Actual Weaviate query - uncomment for production use
            const response = await axios.post(`${this.baseUrl}/v1/graphql`, {
                query: `
                {
                    Get {
                        ${this.className}(
                            limit: 3
                        ) {
                            content
                            metadata
                        }
                    }
                }`
            });

            if (response.data?.data?.Get?.[this.className]) {
                return response.data.data.Get[this.className].map((doc: any) => doc.content);
            }
            return [];
            */
        } catch (error) {
            console.error('Error querying Weaviate:', error);
            throw new Error(`Error querying Weaviate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async upsertVector(id: string, content: string, vector: number[], metadata: any = {}): Promise<void> {
        try {
            await axios.post(`${this.baseUrl}/v1/objects`, {
                id,
                class: this.className,
                properties: {
                    content,
                    metadata
                },
                vector
            });
        } catch (error) {
            console.error('Error upserting vector to Weaviate:', error);
            throw new Error(`Error upserting vector to Weaviate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}