export interface IRAGService {
    generateResponse(query: string, topic: string): Promise<string>;
}