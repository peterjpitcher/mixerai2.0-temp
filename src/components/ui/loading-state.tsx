'use client';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY } from '@/lib/utils/ui-standards';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  className?: string;
}

/**
 * Consistent loading state component that follows UI standards
 */
export function LoadingState({
  message = 'Loading...',
  size = 'md',
  fullPage = false,
  className
}: LoadingStateProps) {
  const containerClasses = cn(
    'flex flex-col items-center justify-center gap-4',
    fullPage && 'min-h-[50vh]',
    className
  );

  const messageClasses = cn(
    'text-muted-foreground animate-pulse',
    size === 'sm' && TYPOGRAPHY.small,
    size === 'md' && TYPOGRAPHY.body,
    size === 'lg' && TYPOGRAPHY.h5
  );

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <Spinner size={size} label={message} />
      <p className={messageClasses}>{message}</p>
    </div>
  );
}