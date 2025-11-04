export interface LambdaHandlerResult {
    statusCode: number;
    body: string;
    headers?: Record<string, string>;
}

export interface HandleSQSEventResult {
  itemIdentifier: string;
  success: boolean;
  error?: string;
}

// Error Types
export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, public field?: string) {
        super(message, 'VALIDATION_ERROR', 400);
        this.name = 'ValidationError';
    }
}

export class DatabaseError extends AppError {
    constructor(message: string, public dbCode?: string) {
        super(message, 'DATABASE_ERROR', 500);
        this.name = 'DatabaseError';
    }
}

export class AWSError extends AppError {
    constructor(message: string, public awsCode?: string) {
        super(message, 'AWS_ERROR', 500);
        this.name = 'AWSError';
    }
}
