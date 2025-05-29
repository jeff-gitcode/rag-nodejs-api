import { Router, Application } from 'express';
import { RAGController } from '../controllers/ragController';

const router = Router();
const ragController = new RAGController();

router.post('/generate', ragController.handleQuery.bind(ragController));
router.post('/insert', ragController.handleInsert.bind(ragController)); // Add this line
router.post('/clear', ragController.handleClear.bind(ragController));

export function setRAGRoutes(app: Application): void { // Correctly type 'app' as 'Application'
    app.use('/api/rag', router);
}