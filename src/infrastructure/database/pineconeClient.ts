export class PineconeClient {
    private readonly apiKey: string;
    private readonly environment: string;
    private readonly baseUrl: string;

    constructor(apiKey: string, environment: string) {
        this.apiKey = apiKey;
        this.environment = environment;
        this.baseUrl = `https://${environment}-1.pinecone.io`;
    }

    async initialize(): Promise<void> {
        // Initialize the Pinecone client
        // This could include setting up any necessary configurations or connections
    }

    async upsertVector(vector: any): Promise<void> {
        const response = await fetch(`${this.baseUrl}/vectors/upsert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': this.apiKey,
            },
            body: JSON.stringify(vector),
        });

        if (!response.ok) {
            throw new Error('Failed to upsert vector');
        }
    }

    async queryVector(query: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': this.apiKey,
                },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                throw new Error('Failed to query vector');
            }

            return response.json();

        } catch (error) {
            // Handle specific error cases if needed
            throw new Error(`Error querying vector: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}