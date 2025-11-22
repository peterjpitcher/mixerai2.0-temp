import { Suspense } from 'react';
import { ErrorBoundary } from './ui/error-boundary';
import { Loader2 } from 'lucide-react';

interface AsyncBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Combines ErrorBoundary with Suspense for async components
 * Use this to wrap components that use async/await or data fetching
 */
export function AsyncBoundary({
  children,
  fallback,
  loadingFallback,
  onError
}: AsyncBoundaryProps) {
  const defaultLoadingFallback = (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Suspense fallback={loadingFallback || defaultLoadingFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Specialized async boundary for data tables
 */
export function TableAsyncBoundary({ children }: { children: React.ReactNode }) {
  return (
    <AsyncBoundary
      loadingFallback={
        <div className="space-y-3">
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
      }
    >
      {children}
    </AsyncBoundary>
  );
}

/**
 * Specialized async boundary for forms
 */
export function FormAsyncBoundary({ children }: { children: React.ReactNode }) {
  return (
    <AsyncBoundary
      loadingFallback={
        <div className="space-y-4">
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
      }
    >
      {children}
    </AsyncBoundary>
  );
}