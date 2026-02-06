/**
 * React Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the component tree,
 * logs those errors, and displays a fallback UI.
 *
 * Implements the error boundary pattern recommended in EXPERT_REVIEWS.md
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AppError, ErrorCode, ErrorSeverity, logError } from '../../utils/errorHandler';

// ==================== Types ====================

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ==================== Error Boundary Component ====================

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error
    const appError = new AppError(
      error.message,
      ErrorCode.UNKNOWN_ERROR,
      ErrorSeverity.CRITICAL,
      false, // Not operational - unexpected error
      {
        componentStack: errorInfo.componentStack,
        errorInfo: errorInfo,
      },
      error
    );

    // Store error info in state
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo!,
          this.handleReset
        );
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

// ==================== Default Fallback Component ====================

interface DefaultErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

function DefaultErrorFallback({
  error,
  errorInfo,
  onReset,
}: DefaultErrorFallbackProps): ReactNode {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Oops! Something went wrong</Text>

        <Text style={styles.message}>
          We're sorry for the inconvenience. The app encountered an unexpected error.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={onReset}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>

        {isDevelopment && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Information:</Text>

            <ScrollView style={styles.debugScroll}>
              <View style={styles.debugSection}>
                <Text style={styles.debugLabel}>Error:</Text>
                <Text style={styles.debugText}>{error.toString()}</Text>
              </View>

              {error.stack && (
                <View style={styles.debugSection}>
                  <Text style={styles.debugLabel}>Stack Trace:</Text>
                  <Text style={styles.debugText}>{error.stack}</Text>
                </View>
              )}

              {errorInfo?.componentStack && (
                <View style={styles.debugSection}>
                  <Text style={styles.debugLabel}>Component Stack:</Text>
                  <Text style={styles.debugText}>
                    {errorInfo.componentStack}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 500,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    marginTop: 32,
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  debugScroll: {
    maxHeight: 250,
  },
  debugSection: {
    marginBottom: 16,
  },
  debugLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    color: '#6c757d',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});

// ==================== Minimal Error Fallback ====================

interface MinimalErrorFallbackProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Minimal error fallback component for inline errors
 * (not boundary errors)
 */
export function MinimalErrorFallback({
  message = 'Something went wrong',
  onRetry,
}: MinimalErrorFallbackProps): ReactNode {
  return (
    <View style={minimalStyles.container}>
      <Text style={minimalStyles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={minimalStyles.retryButton}
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <Text style={minimalStyles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const minimalStyles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007bff',
    borderRadius: 6,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

// ==================== Export ====================

export default ErrorBoundary;
