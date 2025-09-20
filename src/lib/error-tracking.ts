/**
 * Error tracking utility for centralized error reporting
 */

import { apiFetch } from '@/lib/api-client';

const ERROR_TRACKING_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true';
const STACK_MAX_LENGTH = 4000;

const SENSITIVE_KEYS = ['key', 'token', 'secret', 'password', 'authorization'];

function sanitizeStack(stack?: string) {
  if (!stack) return undefined;
  return stack.split('\n').slice(0, 15).join('\n').slice(0, STACK_MAX_LENGTH);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (value.length > 256) {
      return `${value.slice(0, 256)}...`;
    }
    return value;
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.slice(0, 10).map(redactValue);
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => {
        const lowered = key.toLowerCase();
        if (SENSITIVE_KEYS.some((sensitive) => lowered.includes(sensitive))) {
          return [key, '[redacted]'];
        }
        return [key, redactValue(val)];
      })
    );
  }

  return value;
}

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
  const redactedDetails = redactValue(details);

  const payload = {
    message: error.message,
    stack: sanitizeStack(error.stack),
    severity: 'error' as const,
    fingerprint: error.digest,
    info: {
      ...(isPlainRecord(redactedDetails) ? redactedDetails : redactedDetails ? { data: redactedDetails } : {}),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  };

  // In development, just log to console
  if (process.env.NODE_ENV === 'development' || !ERROR_TRACKING_ENABLED) {
    console.error('[Error Tracking]', payload);
    return;
  }

  // In production, send to error tracking service
  try {
    // Send to error tracking endpoint
    await apiFetch('/api/errors/track', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
