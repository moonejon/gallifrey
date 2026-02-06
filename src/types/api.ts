/**
 * API Types for Gallifrey Social Feed POC
 *
 * This file contains all API-related types using Result pattern for type-safe error handling:
 * - Result<T, E> discriminated union
 * - Specific error types
 * - Error code enums
 * - Type guards for runtime checks
 */

// ============================================================================
// Error Types
// ============================================================================

/**
 * Comprehensive error codes for the application
 */
export enum ErrorCode {
  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // Authentication Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Media Errors
  MEDIA_UPLOAD_FAILED = 'MEDIA_UPLOAD_FAILED',
  MEDIA_TOO_LARGE = 'MEDIA_TOO_LARGE',
  INVALID_MEDIA_TYPE = 'INVALID_MEDIA_TYPE',
  MEDIA_PROCESSING_FAILED = 'MEDIA_PROCESSING_FAILED',

  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',

  // Business Logic Errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CONTENT_MODERATION_FAILED = 'CONTENT_MODERATION_FAILED',
  ALREADY_REACTED = 'ALREADY_REACTED',

  // Unknown/Generic Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
}

/**
 * Base error interface
 */
export interface BaseError {
  code: ErrorCode;
  message: string;
  timestamp: string;
}

/**
 * Validation error with field-specific details
 */
export interface ValidationError extends BaseError {
  code: ErrorCode.VALIDATION_ERROR | ErrorCode.INVALID_INPUT | ErrorCode.MISSING_REQUIRED_FIELD;
  field?: string;
  details?: Record<string, string[]>;
}

/**
 * Network error with retry information
 */
export interface NetworkError extends BaseError {
  code: ErrorCode.NETWORK_ERROR | ErrorCode.TIMEOUT_ERROR | ErrorCode.CONNECTION_ERROR;
  retryable: boolean;
  retry_after?: number; // seconds
}

/**
 * Authentication error
 */
export interface AuthError extends BaseError {
  code: ErrorCode.UNAUTHORIZED | ErrorCode.FORBIDDEN | ErrorCode.SESSION_EXPIRED | ErrorCode.INVALID_CREDENTIALS;
  redirect_to_login?: boolean;
}

/**
 * Media upload error with upload details
 */
export interface MediaError extends BaseError {
  code: ErrorCode.MEDIA_UPLOAD_FAILED | ErrorCode.MEDIA_TOO_LARGE | ErrorCode.INVALID_MEDIA_TYPE | ErrorCode.MEDIA_PROCESSING_FAILED;
  max_size?: number; // bytes
  allowed_types?: string[];
  file_name?: string;
}

/**
 * Database error
 */
export interface DatabaseError extends BaseError {
  code: ErrorCode.DATABASE_ERROR | ErrorCode.RECORD_NOT_FOUND | ErrorCode.DUPLICATE_RECORD;
  query?: string;
}

/**
 * Rate limit error with retry information
 */
export interface RateLimitError extends BaseError {
  code: ErrorCode.RATE_LIMIT_EXCEEDED;
  retry_after: number; // seconds
  limit: number;
  remaining: number;
}

/**
 * Generic API error (fallback)
 */
export interface GenericError extends BaseError {
  code: ErrorCode.UNKNOWN_ERROR | ErrorCode.SERVER_ERROR;
  original_error?: string;
  stack_trace?: string;
}

/**
 * Union type of all possible errors
 */
export type ApiError =
  | ValidationError
  | NetworkError
  | AuthError
  | MediaError
  | DatabaseError
  | RateLimitError
  | GenericError;

// ============================================================================
// Result Type Pattern
// ============================================================================

/**
 * Result type for type-safe error handling
 * Replaces throwing exceptions with explicit success/error states
 */
export type Result<T, E = ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type (most API calls return promises)
 */
export type AsyncResult<T, E = ApiError> = Promise<Result<T, E>>;

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper (for raw responses)
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    request_id?: string;
  };
}

/**
 * Paginated API response
 */
export interface PaginatedApiResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
    next_cursor?: string;
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a result is successful
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if a result is an error
 */
export function isError<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Type guard to check if an error is a validation error
 */
export function isValidationError(error: ApiError): error is ValidationError {
  return (
    error.code === ErrorCode.VALIDATION_ERROR ||
    error.code === ErrorCode.INVALID_INPUT ||
    error.code === ErrorCode.MISSING_REQUIRED_FIELD
  );
}

/**
 * Type guard to check if an error is a network error
 */
export function isNetworkError(error: ApiError): error is NetworkError {
  return (
    error.code === ErrorCode.NETWORK_ERROR ||
    error.code === ErrorCode.TIMEOUT_ERROR ||
    error.code === ErrorCode.CONNECTION_ERROR
  );
}

/**
 * Type guard to check if an error is an auth error
 */
export function isAuthError(error: ApiError): error is AuthError {
  return (
    error.code === ErrorCode.UNAUTHORIZED ||
    error.code === ErrorCode.FORBIDDEN ||
    error.code === ErrorCode.SESSION_EXPIRED ||
    error.code === ErrorCode.INVALID_CREDENTIALS
  );
}

/**
 * Type guard to check if an error is a media error
 */
export function isMediaError(error: ApiError): error is MediaError {
  return (
    error.code === ErrorCode.MEDIA_UPLOAD_FAILED ||
    error.code === ErrorCode.MEDIA_TOO_LARGE ||
    error.code === ErrorCode.INVALID_MEDIA_TYPE ||
    error.code === ErrorCode.MEDIA_PROCESSING_FAILED
  );
}

/**
 * Type guard to check if an error is a database error
 */
export function isDatabaseError(error: ApiError): error is DatabaseError {
  return (
    error.code === ErrorCode.DATABASE_ERROR ||
    error.code === ErrorCode.RECORD_NOT_FOUND ||
    error.code === ErrorCode.DUPLICATE_RECORD
  );
}

/**
 * Type guard to check if an error is a rate limit error
 */
export function isRateLimitError(error: ApiError): error is RateLimitError {
  return error.code === ErrorCode.RATE_LIMIT_EXCEEDED;
}

/**
 * Type guard to check if an error is retryable
 */
export function isRetryableError(error: ApiError): boolean {
  if (isNetworkError(error)) {
    return error.retryable;
  }
  if (isRateLimitError(error)) {
    return true;
  }
  return error.code === ErrorCode.SERVER_ERROR;
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create a validation error
 */
export function validationError(
  message: string,
  field?: string,
  details?: Record<string, string[]>
): ValidationError {
  return {
    code: ErrorCode.VALIDATION_ERROR,
    message,
    field,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a network error
 */
export function networkError(message: string, retryable = true, retry_after?: number): NetworkError {
  return {
    code: ErrorCode.NETWORK_ERROR,
    message,
    retryable,
    retry_after,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an auth error
 */
export function authError(
  message: string,
  code: AuthError['code'] = ErrorCode.UNAUTHORIZED,
  redirect_to_login = false
): AuthError {
  return {
    code,
    message,
    redirect_to_login,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a media error
 */
export function mediaError(
  message: string,
  code: MediaError['code'] = ErrorCode.MEDIA_UPLOAD_FAILED,
  options?: {
    max_size?: number;
    allowed_types?: string[];
    file_name?: string;
  }
): MediaError {
  return {
    code,
    message,
    ...options,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a database error
 */
export function databaseError(
  message: string,
  code: DatabaseError['code'] = ErrorCode.DATABASE_ERROR,
  query?: string
): DatabaseError {
  return {
    code,
    message,
    query,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a rate limit error
 */
export function rateLimitError(
  message: string,
  retry_after: number,
  limit: number,
  remaining: number
): RateLimitError {
  return {
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    message,
    retry_after,
    limit,
    remaining,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a generic error
 */
export function genericError(
  message: string,
  code: GenericError['code'] = ErrorCode.UNKNOWN_ERROR,
  original_error?: string
): GenericError {
  return {
    code,
    message,
    original_error,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert an unknown error to an ApiError
 */
export function toApiError(error: unknown): ApiError {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return error as ApiError;
  }

  if (error instanceof Error) {
    return genericError(error.message, ErrorCode.UNKNOWN_ERROR, error.stack);
  }

  return genericError('An unknown error occurred', ErrorCode.UNKNOWN_ERROR);
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: ApiError): string {
  if (isValidationError(error) && error.field) {
    return `${error.field}: ${error.message}`;
  }

  if (isRateLimitError(error)) {
    return `Rate limit exceeded. Please try again in ${error.retry_after} seconds.`;
  }

  if (isMediaError(error) && error.code === ErrorCode.MEDIA_TOO_LARGE && error.max_size) {
    const maxSizeMB = (error.max_size / (1024 * 1024)).toFixed(2);
    return `${error.message} Maximum size: ${maxSizeMB}MB`;
  }

  return error.message;
}
