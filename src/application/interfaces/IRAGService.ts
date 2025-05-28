export interface IRAGService {
    generateResponse(query: string): Promise<string>;
}