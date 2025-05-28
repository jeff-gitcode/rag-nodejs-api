import request from 'supertest';
import express from 'express';
import { setRAGRoutes } from '../../presentation/routes/ragRoutes';

const app = express();
setRAGRoutes(app);

describe('RAG Integration Tests', () => {
    it('should return a response for a valid query', async () => {
        const response = await request(app)
            .post('/api/rag/query')
            .send({ query: 'What is the capital of France?' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('response');
    });

    it('should return a 400 for an invalid query', async () => {
        const response = await request(app)
            .post('/api/rag/query')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });
});