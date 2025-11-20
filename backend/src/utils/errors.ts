export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class LLMError extends AppError {
  constructor(message: string) {
    super(`LLM Error: ${message}`, 500);
  }
}

export class FileUploadError extends AppError {
  constructor(message: string) {
    super(`File Upload Error: ${message}`, 400);
  }
}
