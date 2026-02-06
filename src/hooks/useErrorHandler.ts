/**
 * React Hook for Error Handling
 *
 * Provides a centralized way to handle errors in React components
 * with support for:
 * - Error display/notification
 * - Error dismissal
 * - Retry logic
 * - Error tracking
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  AppError,
  ErrorCode,
  parseError,
  parseSupabaseError,
  parseNetworkError,
} from '../utils/errorHandler';

// ==================== Hook Types ====================

export interface ErrorState {
  error: AppError | null;
  hasError: boolean;
}

export interface ErrorHandlerOptions {
  showAlert?: boolean;
  logError?: boolean;
  context?: string;
  onError?: (error: AppError) => void;
  retryable?: boolean;
}

export interface UseErrorHandlerReturn {
  error: AppError | null;
  hasError: boolean;
  handleError: (error: unknown, options?: ErrorHandlerOptions) => void;
  handleSupabaseError: (error: any, options?: ErrorHandlerOptions) => void;
  handleNetworkError: (error: any, options?: ErrorHandlerOptions) => void;
  clearError: () => void;
  showErrorAlert: (error: AppError, retryable?: boolean, onRetry?: () => void) => void;
}

// ==================== useErrorHandler Hook ====================

/**
 * Custom hook for handling errors in React components
 *
 * @example
 * ```tsx
 * const { handleError, clearError, hasError, error } = useErrorHandler();
 *
 * const fetchData = async () => {
 *   try {
 *     const data = await api.getData();
 *   } catch (err) {
 *     handleError(err, { showAlert: true });
 *   }
 * };
 * ```
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    hasError: false,
  });

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      hasError: false,
    });
  }, []);

  /**
   * Show an error alert to the user
   */
  const showErrorAlert = useCallback(
    (error: AppError, retryable = false, onRetry?: () => void) => {
      const buttons = retryable && onRetry
        ? [
            {
              text: 'Cancel',
              style: 'cancel' as const,
              onPress: clearError,
            },
            {
              text: 'Retry',
              onPress: () => {
                clearError();
                onRetry();
              },
            },
          ]
        : [
            {
              text: 'OK',
              onPress: clearError,
            },
          ];

      Alert.alert(
        getErrorTitle(error.code),
        error.getUserMessage(),
        buttons
      );
    },
    [clearError]
  );

  /**
   * Handle a generic error
   */
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const {
        showAlert = false,
        logError: shouldLog = true,
        context,
        onError,
        retryable = false,
      } = options;

      const appError = parseError(error, context);

      // Update error state
      setErrorState({
        error: appError,
        hasError: true,
      });

      // Call custom error handler
      if (onError) {
        onError(appError);
      }

      // Show alert if requested
      if (showAlert) {
        showErrorAlert(appError, retryable);
      }
    },
    [showErrorAlert]
  );

  /**
   * Handle Supabase-specific errors
   */
  const handleSupabaseError = useCallback(
    (error: any, options: ErrorHandlerOptions = {}) => {
      const {
        showAlert = false,
        logError: shouldLog = true,
        context,
        onError,
        retryable = false,
      } = options;

      const appError = parseSupabaseError(error, context);

      // Update error state
      setErrorState({
        error: appError,
        hasError: true,
      });

      // Call custom error handler
      if (onError) {
        onError(appError);
      }

      // Show alert if requested
      if (showAlert) {
        showErrorAlert(appError, retryable);
      }
    },
    [showErrorAlert]
  );

  /**
   * Handle network-specific errors
   */
  const handleNetworkError = useCallback(
    (error: any, options: ErrorHandlerOptions = {}) => {
      const {
        showAlert = false,
        logError: shouldLog = true,
        context,
        onError,
        retryable = true, // Network errors are usually retryable
      } = options;

      const appError = parseNetworkError(error, context);

      // Update error state
      setErrorState({
        error: appError,
        hasError: true,
      });

      // Call custom error handler
      if (onError) {
        onError(appError);
      }

      // Show alert if requested
      if (showAlert) {
        showErrorAlert(appError, retryable);
      }
    },
    [showErrorAlert]
  );

  return {
    error: errorState.error,
    hasError: errorState.hasError,
    handleError,
    handleSupabaseError,
    handleNetworkError,
    clearError,
    showErrorAlert,
  };
}

// ==================== Helper Functions ====================

/**
 * Get a user-friendly error title based on error code
 */
function getErrorTitle(code: ErrorCode): string {
  const titles: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.NETWORK_ERROR]: 'Connection Error',
    [ErrorCode.TIMEOUT_ERROR]: 'Request Timeout',
    [ErrorCode.UNAUTHORIZED]: 'Authentication Required',
    [ErrorCode.FORBIDDEN]: 'Access Denied',
    [ErrorCode.SESSION_EXPIRED]: 'Session Expired',
    [ErrorCode.INVALID_CREDENTIALS]: 'Invalid Credentials',
    [ErrorCode.VALIDATION_ERROR]: 'Validation Error',
    [ErrorCode.MEDIA_UPLOAD_FAILED]: 'Upload Failed',
    [ErrorCode.MEDIA_TOO_LARGE]: 'File Too Large',
    [ErrorCode.DATABASE_ERROR]: 'Database Error',
    [ErrorCode.NOT_FOUND]: 'Not Found',
  };

  return titles[code] || 'Error';
}

// ==================== Async Operation Hook ====================

export interface UseAsyncOperationOptions<T> extends ErrorHandlerOptions {
  onSuccess?: (data: T) => void;
}

export interface UseAsyncOperationReturn<T> {
  execute: (...args: any[]) => Promise<void>;
  loading: boolean;
  error: AppError | null;
  data: T | null;
  clearError: () => void;
  reset: () => void;
}

/**
 * Hook for handling async operations with built-in error handling
 *
 * @example
 * ```tsx
 * const { execute, loading, error } = useAsyncOperation(
 *   async (postId: string) => {
 *     return await api.deletePost(postId);
 *   },
 *   {
 *     showAlert: true,
 *     onSuccess: () => console.log('Post deleted'),
 *   }
 * );
 *
 * // Later...
 * await execute(postId);
 * ```
 */
export function useAsyncOperation<T>(
  operation: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
): UseAsyncOperationReturn<T> {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const { error, hasError, handleError, clearError } = useErrorHandler();

  const {
    onSuccess,
    showAlert = false,
    context,
    retryable = true,
  } = options;

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true);
      clearError();

      try {
        const result = await operation(...args);
        setData(result);

        if (onSuccess) {
          onSuccess(result);
        }
      } catch (err) {
        handleError(err, {
          showAlert,
          context,
          retryable,
        });
      } finally {
        setLoading(false);
      }
    },
    [operation, onSuccess, showAlert, context, retryable, handleError, clearError]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setData(null);
    clearError();
  }, [clearError]);

  return {
    execute,
    loading,
    error,
    data,
    clearError,
    reset,
  };
}

// ==================== Form Error Hook ====================

export interface FieldError {
  field: string;
  message: string;
}

export interface UseFormErrorsReturn {
  fieldErrors: Record<string, string>;
  setFieldError: (field: string, message: string) => void;
  clearFieldError: (field: string) => void;
  clearAllErrors: () => void;
  hasFieldError: (field: string) => boolean;
  getFieldError: (field: string) => string | undefined;
}

/**
 * Hook for managing form validation errors
 *
 * @example
 * ```tsx
 * const { fieldErrors, setFieldError, getFieldError } = useFormErrors();
 *
 * const validateEmail = (email: string) => {
 *   if (!email.includes('@')) {
 *     setFieldError('email', 'Invalid email address');
 *     return false;
 *   }
 *   return true;
 * };
 * ```
 */
export function useFormErrors(): UseFormErrorsReturn {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: message,
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const hasFieldError = useCallback(
    (field: string) => {
      return field in fieldErrors;
    },
    [fieldErrors]
  );

  const getFieldError = useCallback(
    (field: string) => {
      return fieldErrors[field];
    },
    [fieldErrors]
  );

  return {
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    hasFieldError,
    getFieldError,
  };
}
