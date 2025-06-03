import { errorHandler } from '@presentation/middlewares/errorHandler';
import { Request, Response, NextFunction } from 'express';

// src/presentation/middlewares/errorHandler.test.ts

describe('Error Handler Middleware', () => {
    // Mock request, response and next function
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        // Initialize mocks before each test
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();

        // Spy on console.error to verify it's called and prevent output during tests
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        // Restore console.error after each test
        consoleErrorSpy.mockRestore();
    });

    it('should respond with 500 status code and error message', () => {
        // Arrange
        const error = new Error('Test error');

        // Act
        errorHandler(
            error,
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        // Assert
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'An unexpected error occurred.'
        });
    });

    it('should log the error stack', () => {
        // Arrange
        const error = new Error('Test error with stack');

        // Act
        errorHandler(
            error,
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
    });

    it('should handle errors without a stack', () => {
        // Arrange
        const error = new Error('Error without stack');
        delete error.stack;

        // Act
        errorHandler(
            error,
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith(undefined);
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'An unexpected error occurred.'
        });
    });

    it('should not call next function', () => {
        // Arrange
        const error = new Error('Test error');

        // Act
        errorHandler(
            error,
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle custom error objects with additional properties', () => {
        // Arrange
        class CustomError extends Error {
            statusCode: number;

            constructor(message: string, statusCode: number) {
                super(message);
                this.name = 'CustomError';
                this.statusCode = statusCode;
            }
        }

        const customError = new CustomError('Custom error', 400);

        // Act
        errorHandler(
            customError,
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        // Assert
        // Even with custom error properties, the middleware should behave consistently
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'An unexpected error occurred.'
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(customError.stack);
    });

    it('should handle error objects that are not instances of Error', () => {
        // Arrange
        // This simulates throwing something that's not an Error instance
        const nonErrorObject = { message: 'Not a real Error instance' } as unknown as Error;

        // Act
        errorHandler(
            nonErrorObject,
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        // Assert
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'An unexpected error occurred.'
        });
        // Since it's not a real Error instance, stack would be undefined
        expect(consoleErrorSpy).toHaveBeenCalledWith(undefined);
    });

    it('should work with various response methods', () => {
        // Arrange
        const error = new Error('Test error');
        const mockResponseVariant: Partial<Response> = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockImplementation(function (this: Response) {
                return this;
            }),
            send: jest.fn(),
        };

        // Act
        errorHandler(
            error,
            mockRequest as Request,
            mockResponseVariant as Response,
            mockNext
        );

        // Assert
        expect(mockResponseVariant.status).toHaveBeenCalledWith(500);
        expect(mockResponseVariant.json).toHaveBeenCalledWith({
            message: 'An unexpected error occurred.'
        });
        expect(mockResponseVariant.send).not.toHaveBeenCalled();
    });
});