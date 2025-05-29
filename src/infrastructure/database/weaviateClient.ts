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
                vectorizer: "text2vec-transformers", // Using transformer-based vectorizer
                properties: [
                    {
                        name: 'content',
                        dataType: ['text'],
                        description: "The main content of the document",
                        moduleConfig: {
                            "text2vec-transformers": {
                                skip: false,
                                vectorizePropertyName: false
                            }
                        }
                    },
                    {
                        name: 'metadata',
                        dataType: ['text'],
                        description: "Additional metadata for the document",
                        moduleConfig: {
                            "text2vec-transformers": {
                                skip: true // Skip vectorization for metadata
                            }
                        }
                    }
                ],
                vectorIndexConfig: {
                    distance: "cosine", // Using cosine similarity for vector matching
                    efConstruction: 128,
                    maxConnections: 64
                }
            });
            console.log(`Class "${this.className}" created successfully in Weaviate.`);
        } catch (error) {
            console.error('Error creating Weaviate class:', error);
            throw new Error('Failed to create Weaviate class');
        }
    }

    async queryVector(query: string, limit: number = 10): Promise<any[]> {
        try {
            console.log(`Performing semantic search for: "${query}" (limit: ${limit})`);
            const graphqlQuery = {
                query: `
                    {
                        Get {
                            ${this.className}(
                                limit: ${limit},
                                nearText: {
                                    concepts: ["${query}"],
                                    certainty: 0.7
                                }
                            ) {
                                content
                                metadata
                                _additional {
                                    certainty
                                    id
                                }
                            }
                        }
                    }
                `
            };

            const response = await axios.post(`${this.baseUrl}/v1/graphql`, graphqlQuery);

            if (response.data?.data?.Get?.[this.className]) {
                console.log(`Found ${response.data.data.Get[this.className].length} matches`);
                return response.data.data.Get[this.className];
            }
            console.log("No matches found");
            return [];
        } catch (error) {
            console.error('Error querying Weaviate:', error);
            throw new Error(`Error querying Weaviate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async queryVectorByContentAndTopic(query: string, topic: string | null = null, limit: number = 10): Promise<any[]> {
        try {
            let graphqlQuery;

            if (topic) {
                console.log(`Performing semantic search for: "${query}" with topic filter: "${topic}" (limit: ${limit})`);
                graphqlQuery = {
                    query: `
                        {
                            Get {
                                ${this.className}(
                                    limit: ${limit},
                                    where: {
                                        path: ["metadata"],
                                        operator: Equal,
                                        valueString: "${topic}"
                                    },
                                    nearText: {
                                        concepts: ["${query}"],
                                        certainty: 0.7
                                    }
                                ) {
                                    content
                                    metadata
                                    _additional {
                                        certainty
                                        id
                                    }
                                }
                            }
                        }
                    `
                };
            } else {
                console.log(`Performing semantic search for: "${query}" without topic filter (limit: ${limit})`);
                graphqlQuery = {
                    query: `
                        {
                            Get {
                                ${this.className}(
                                    limit: ${limit},
                                    nearText: {
                                        concepts: ["${query}"],
                                        certainty: 0.7
                                    }
                                ) {
                                    content
                                    metadata
                                    _additional {
                                        certainty
                                        id
                                    }
                                }
                            }
                        }
                    `
                };
            }

            const response = await axios.post(`${this.baseUrl}/v1/graphql`, graphqlQuery);

            if (response.data?.data?.Get?.[this.className]) {
                const results = response.data.data.Get[this.className];
                console.log(`Found ${results.length} matches${topic ? ` for topic '${topic}'` : ''}`);
                return results;
            }

            console.log(`No matches found${topic ? ` for topic '${topic}'` : ''}`);
            return [];
        } catch (error) {
            console.error('Error querying Weaviate:', error);
            throw new Error(`Error querying Weaviate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async upsertVector(id: string, content: string, vector: number[], metadata: string): Promise<void> {
        console.log(`Upserting vector to Weaviate: id=${id}, content length=${content.length}, vector length=${vector.length}`);
        console.log(`Metadata type: ${typeof metadata}, value: ${metadata}`); // Log metadata type and value
        console.log(`Vector type: ${Array.isArray(vector) ? 'array' : typeof vector}, length: ${vector.length}`); // Log vector type and length

        try {
            const data = {
                class: this.className,
                id: id,
                properties: {
                    content: content,
                    metadata: metadata // Ensure metadata is a string
                },
                vector: vector
            };

            console.log("Data being sent to Weaviate:", JSON.stringify(data, null, 2)); // Log the request data

            await axios.post(`${this.baseUrl}/v1/objects`, data);
            console.log(`Successfully upserted vector with id=${id} to Weaviate`);
        } catch (error) {
            console.error('Error upserting vector to Weaviate:', error);
            if (axios.isAxiosError(error)) {
                console.error("Weaviate error response:", error.response?.data); // Log Weaviate's error response
            }
            throw new Error(`Error upserting vector to Weaviate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Add this method to WeaviateClient class
    // ...existing code...
    async deleteAllObjects(): Promise<void> {
        try {
            console.log(`Deleting all objects from class ${this.className} in Weaviate`);

            // First get all objects to delete
            const response = await axios.post(`${this.baseUrl}/v1/graphql`, {
                query: `{
                Get {
                    ${this.className} {
                        _additional {
                            id
                        }
                    }
                }
            }`
            });

            if (!response.data?.data?.Get?.[this.className] || response.data.data.Get[this.className].length === 0) {
                console.log(`No objects found in class ${this.className}`);
                return;
            }

            const objectIds = response.data.data.Get[this.className].map(
                (obj: any) => obj._additional.id
            );

            console.log(`Found ${objectIds.length} objects to delete`);

            // Delete objects one by one
            for (const id of objectIds) {
                await axios.delete(`${this.baseUrl}/v1/objects/${id}`);
            }

            console.log(`Successfully deleted all objects from class ${this.className}`);
        } catch (error) {
            console.error('Error deleting all objects from Weaviate:', error);
            if (axios.isAxiosError(error)) {
                console.error("Weaviate error response:", error.response?.data);
            }
            throw new Error(`Error deleting all objects from Weaviate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // ...existing code...
}