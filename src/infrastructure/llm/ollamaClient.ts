// src/infrastructure/llm/ollamaClient.ts
import axios from 'axios';

export class OllamaClient {
    private readonly baseUrl: string;
    private readonly model: string;

    constructor(model: string = 'llama3.2') {
        this.baseUrl = 'http://localhost:11434';
        this.model = model;
    }

    public async getResponse(prompt: string): Promise<string> {
        try {
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.model,
                prompt: prompt,
                stream: false
            }, {
                timeout: 60000 // Increase timeout to 60 seconds
            });

            return response.data.response;
        } catch (error) {
            if (error instanceof Error) {
                console.error('Ollama API Error:', error);
                throw new Error(`Error fetching response from Ollama: ${error.message}`);
            } else {
                throw new Error('Error fetching response from Ollama: Unknown error');
            }
        }
    }
}