import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    // Rename _next to avoid the unused variable error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
) => {
    // Add eslint-disable-next-line for the console statement
    // eslint-disable-next-line no-console
    console.error(err.stack);

    res.status(500).json({ message: 'An unexpected error occurred.' });
};