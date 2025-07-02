'use client';

import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface FeedbackMessageProps {
  type: FeedbackType;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

const feedbackConfig: Record<FeedbackType, {
  icon: React.ElementType;
  variant: 'default' | 'destructive' | 'warning';
}> = {
  success: {
    icon: CheckCircle2,
    variant: 'default',
  },
  error: {
    icon: XCircle,
    variant: 'destructive',
  },
  warning: {
    icon: AlertCircle,
    variant: 'warning',
  },
  info: {
    icon: Info,
    variant: 'default',
  },
};

/**
 * Consistent feedback message component following UI standards
 */
export function FeedbackMessage({
  type,
  title,
  message,
  onClose,
  className,
}: FeedbackMessageProps) {
  const config = feedbackConfig[type];
  const Icon = config.icon;

  return (
    <Alert variant={config.variant} className={cn('relative', className)}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          aria-label="Close message"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </Alert>
  );
}

/**
 * Hook for managing feedback messages
 */
export function useFeedback() {
  const [feedback, setFeedback] = React.useState<{
    type: FeedbackType;
    title?: string;
    message: string;
  } | null>(null);

  const showFeedback = React.useCallback((
    type: FeedbackType,
    message: string,
    title?: string
  ) => {
    setFeedback({ type, message, title });
  }, []);

  const clearFeedback = React.useCallback(() => {
    setFeedback(null);
  }, []);

  return {
    feedback,
    showFeedback,
    clearFeedback,
    showSuccess: (message: string, title?: string) => showFeedback('success', message, title),
    showError: (message: string, title?: string) => showFeedback('error', message, title),
    showWarning: (message: string, title?: string) => showFeedback('warning', message, title),
    showInfo: (message: string, title?: string) => showFeedback('info', message, title),
  };
}