/**
 * Error tracking utility for centralized error reporting
 */

interface ErrorDetails {
  errorId?: string;
  userId?: string;
  brandId?: string;
  path?: string;
  userAgent?: string;
  timestamp: string;
  environment: string;
}

/**
 * Log error to external tracking service
 * In production, this would send to Sentry, LogRocket, etc.
 */
export async function trackError(
  error: Error & { digest?: string },
  details?: Partial<ErrorDetails>
) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    digest: error.digest,
    ...details,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  };

  // In development, just log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Tracking]', errorInfo);
    return;
  }

  // In production, send to error tracking service
  try {
    // Example: Send to your error tracking endpoint
    await fetch('/api/errors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorInfo),
    });
  } catch (trackingError) {
    // Fail silently to not disrupt user experience
    console.error('Failed to track error:', trackingError);
  }
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return "You don't have permission to access this resource.";
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (message.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }
  
  if (message.includes('not found')) {
    return 'The requested resource was not found.';
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Invalid data provided. Please check your input and try again.';
  }
  
  return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
}