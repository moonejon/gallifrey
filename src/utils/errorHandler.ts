/**
 * Error Handling Utilities for Gallifrey POC
 *
 * Implements the error handling patterns recommended in EXPERT_REVIEWS.md:
 * - Custom AppError class
 * - Error parsing functions
 * - Error logging helpers
 * - Result type pattern for type-safe error handling
 */

// ==================== Error Codes ====================

export enum ErrorCode {
  // Network & API Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Authentication Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  CONTENT_EMPTY = 'CONTENT_EMPTY',

  // Media Errors
  MEDIA_UPLOAD_FAILED = 'MEDIA_UPLOAD_FAILED',
  MEDIA_TOO_LARGE = 'MEDIA_TOO_LARGE',
  INVALID_MEDIA_TYPE = 'INVALID_MEDIA_TYPE',
  MEDIA_COMPRESSION_FAILED = 'MEDIA_COMPRESSION_FAILED',

  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // Unknown Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ==================== Error Severity Levels ====================

export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

// ==================== Custom AppError Class ====================

export interface ErrorMetadata {
  userId?: string;
  postId?: string;
  timestamp?: Date;
  context?: Record<string, any>;
  [key: string]: any;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly metadata?: ErrorMetadata;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    isOperational = true,
    metadata?: ErrorMetadata,
    originalError?: Error
  ) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    this.name = 'AppError';
    this.code = code;
    this.severity = severity;
    this.isOperational = isOperational;
    this.metadata = {
      ...metadata,
      timestamp: metadata?.timestamp || new Date(),
    };
    this.originalError = originalError;

    // Log error when created
    this.logError();
  }

  private logError(): void {
    const logData = {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      metadata: this.metadata,
      stack: this.stack,
      originalError: this.originalError?.message,
    };

    switch (this.severity) {
      case ErrorSeverity.INFO:
        console.info('[INFO]', logData);
        break;
      case ErrorSeverity.WARNING:
        console.warn('[WARNING]', logData);
        break;
      case ErrorSeverity.ERROR:
        console.error('[ERROR]', logData);
        break;
      case ErrorSeverity.CRITICAL:
        console.error('[CRITICAL]', logData);
        // In production, this would also send to error tracking service (Sentry, etc.)
        break;
    }
  }

  /**
   * Returns a user-friendly error message
   */
  getUserMessage(): string {
    return getUserFriendlyMessage(this.code, this.message);
  }

  /**
   * Converts error to JSON for logging/API responses
   */
  toJSON(): object {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      metadata: this.metadata,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

// ==================== Result Type Pattern ====================

export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Helper to create a successful Result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Helper to create a failed Result
 */
export function failure<E = AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

// ==================== Error Factory Functions ====================

export function networkError(
  message = 'Network connection failed',
  originalError?: Error,
  metadata?: ErrorMetadata
): AppError {
  return new AppError(
    message,
    ErrorCode.NETWORK_ERROR,
    ErrorSeverity.ERROR,
    true,
    metadata,
    originalError
  );
}

export function unauthorizedError(
  message = 'You are not authorized to perform this action',
  metadata?: ErrorMetadata
): AppError {
  return new AppError(
    message,
    ErrorCode.UNAUTHORIZED,
    ErrorSeverity.WARNING,
    true,
    metadata
  );
}

export function validationError(
  message: string,
  metadata?: ErrorMetadata
): AppError {
  return new AppError(
    message,
    ErrorCode.VALIDATION_ERROR,
    ErrorSeverity.INFO,
    true,
    metadata
  );
}

export function mediaUploadError(
  message = 'Failed to upload media',
  originalError?: Error,
  metadata?: ErrorMetadata
): AppError {
  return new AppError(
    message,
    ErrorCode.MEDIA_UPLOAD_FAILED,
    ErrorSeverity.ERROR,
    true,
    metadata,
    originalError
  );
}

export function databaseError(
  message = 'Database operation failed',
  originalError?: Error,
  metadata?: ErrorMetadata
): AppError {
  return new AppError(
    message,
    ErrorCode.DATABASE_ERROR,
    ErrorSeverity.CRITICAL,
    true,
    metadata,
    originalError
  );
}

export function notFoundError(
  resource = 'Resource',
  metadata?: ErrorMetadata
): AppError {
  return new AppError(
    `${resource} not found`,
    ErrorCode.NOT_FOUND,
    ErrorSeverity.INFO,
    true,
    metadata
  );
}

// ==================== Error Parsing Functions ====================

/**
 * Parses unknown errors into AppError instances
 */
export function parseError(error: unknown, context?: string): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    return new AppError(
      error.message,
      ErrorCode.UNKNOWN_ERROR,
      ErrorSeverity.ERROR,
      true,
      { context },
      error
    );
  }

  // String error
  if (typeof error === 'string') {
    return new AppError(
      error,
      ErrorCode.UNKNOWN_ERROR,
      ErrorSeverity.ERROR,
      true,
      { context }
    );
  }

  // Object with message property
  if (error && typeof error === 'object' && 'message' in error) {
    return new AppError(
      String(error.message),
      ErrorCode.UNKNOWN_ERROR,
      ErrorSeverity.ERROR,
      true,
      { context, originalData: error }
    );
  }

  // Unknown error type
  return new AppError(
    'An unknown error occurred',
    ErrorCode.UNKNOWN_ERROR,
    ErrorSeverity.ERROR,
    true,
    { context, originalData: error }
  );
}

/**
 * Parses Supabase errors into AppError instances
 */
export function parseSupabaseError(error: any, context?: string): AppError {
  const message = error?.message || 'Database operation failed';
  const code = error?.code;
  const details = error?.details;

  // Authentication errors
  if (message.includes('Invalid login credentials')) {
    return new AppError(
      'Invalid email or password',
      ErrorCode.INVALID_CREDENTIALS,
      ErrorSeverity.INFO,
      true,
      { context, code, details }
    );
  }

  if (message.includes('JWT') || message.includes('token')) {
    return new AppError(
      'Your session has expired. Please log in again.',
      ErrorCode.SESSION_EXPIRED,
      ErrorSeverity.WARNING,
      true,
      { context, code, details }
    );
  }

  // Unique constraint violations
  if (code === '23505') {
    return new AppError(
      'This item already exists',
      ErrorCode.DUPLICATE_ENTRY,
      ErrorSeverity.INFO,
      true,
      { context, code, details }
    );
  }

  // Foreign key violations
  if (code === '23503') {
    return new AppError(
      'Referenced item not found',
      ErrorCode.NOT_FOUND,
      ErrorSeverity.ERROR,
      true,
      { context, code, details }
    );
  }

  // Permission denied
  if (message.includes('permission denied') || message.includes('RLS')) {
    return new AppError(
      'You do not have permission to perform this action',
      ErrorCode.FORBIDDEN,
      ErrorSeverity.WARNING,
      true,
      { context, code, details }
    );
  }

  // Default database error
  return new AppError(
    message,
    ErrorCode.DATABASE_ERROR,
    ErrorSeverity.ERROR,
    true,
    { context, code, details }
  );
}

/**
 * Parses network/fetch errors into AppError instances
 */
export function parseNetworkError(error: any, context?: string): AppError {
  if (error?.message?.includes('timeout')) {
    return new AppError(
      'Request timed out. Please check your connection and try again.',
      ErrorCode.TIMEOUT_ERROR,
      ErrorSeverity.ERROR,
      true,
      { context }
    );
  }

  if (error?.message?.includes('Network request failed')) {
    return new AppError(
      'Unable to connect. Please check your internet connection.',
      ErrorCode.NETWORK_ERROR,
      ErrorSeverity.ERROR,
      true,
      { context }
    );
  }

  return networkError(
    'A network error occurred. Please try again.',
    error,
    { context }
  );
}

// ==================== User-Friendly Messages ====================

/**
 * Returns user-friendly error messages based on error code
 */
export function getUserFriendlyMessage(
  code: ErrorCode,
  defaultMessage?: string
): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.NETWORK_ERROR]: 'Unable to connect. Please check your internet connection and try again.',
    [ErrorCode.API_ERROR]: 'Something went wrong. Please try again later.',
    [ErrorCode.TIMEOUT_ERROR]: 'Request timed out. Please try again.',

    [ErrorCode.UNAUTHORIZED]: 'Please log in to continue.',
    [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',
    [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
    [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',

    [ErrorCode.VALIDATION_ERROR]: defaultMessage || 'Please check your input and try again.',
    [ErrorCode.INVALID_EMAIL]: 'Please enter a valid email address.',
    [ErrorCode.INVALID_PASSWORD]: 'Password must be at least 8 characters long.',
    [ErrorCode.CONTENT_TOO_LONG]: 'Your content is too long. Please shorten it.',
    [ErrorCode.CONTENT_EMPTY]: 'Please enter some content.',

    [ErrorCode.MEDIA_UPLOAD_FAILED]: 'Failed to upload media. Please try again.',
    [ErrorCode.MEDIA_TOO_LARGE]: 'File is too large. Please choose a smaller file.',
    [ErrorCode.INVALID_MEDIA_TYPE]: 'Invalid file type. Please choose an image or video.',
    [ErrorCode.MEDIA_COMPRESSION_FAILED]: 'Failed to process media. Please try a different file.',

    [ErrorCode.DATABASE_ERROR]: 'Something went wrong. Please try again.',
    [ErrorCode.NOT_FOUND]: 'Item not found.',
    [ErrorCode.DUPLICATE_ENTRY]: 'This item already exists.',

    [ErrorCode.UNKNOWN_ERROR]: defaultMessage || 'An unexpected error occurred. Please try again.',
  };

  return messages[code] || defaultMessage || 'An error occurred. Please try again.';
}

// ==================== Error Logging Helpers ====================

/**
 * Log an error with context
 */
export function logError(error: unknown, context?: string): void {
  const appError = parseError(error, context);
  // Error is already logged in AppError constructor
  // This function exists for explicit logging calls
}

/**
 * Log an info message
 */
export function logInfo(message: string, metadata?: ErrorMetadata): void {
  console.info('[INFO]', {
    message,
    metadata: {
      ...metadata,
      timestamp: new Date(),
    },
  });
}

/**
 * Log a warning
 */
export function logWarning(message: string, metadata?: ErrorMetadata): void {
  console.warn('[WARNING]', {
    message,
    metadata: {
      ...metadata,
      timestamp: new Date(),
    },
  });
}

// ==================== Error Handler Utility ====================

/**
 * Wraps async functions with error handling
 */
export function withErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
): (...args: T) => Promise<Result<R>> {
  return async (...args: T): Promise<Result<R>> => {
    try {
      const data = await fn(...args);
      return success(data);
    } catch (error) {
      const appError = parseError(error, context);
      return failure(appError);
    }
  };
}

/**
 * Validates and returns a typed error or throws
 */
export function assertSuccess<T>(result: Result<T>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}
