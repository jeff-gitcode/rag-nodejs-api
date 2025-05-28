import express from 'express';
import dotenv from 'dotenv';
import { setRAGRoutes } from './presentation/routes/ragRoutes';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
app.use(express.json());

// Set up routes
setRAGRoutes(app);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err.stack);
    res.status(500).json({ message: 'An unexpected error occurred.' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${PORT}`);
});

export default app;