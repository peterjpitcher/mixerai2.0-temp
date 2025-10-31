'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToolAccessSessionErrorProps {
  message: string;
  onRetry: () => void;
}

interface ToolAccessDeniedProps {
  message?: string;
  onNavigate?: () => void;
  ctaLabel?: string;
}

export function ToolAccessSessionError({ message, onRetry }: ToolAccessSessionErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center">
      <AlertTriangle className="mb-4 h-16 w-16 text-destructive" />
      <h3 className="text-xl font-bold mb-2">Unable to verify your access</h3>
      <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  );
}

export function ToolAccessDenied({ message, onNavigate, ctaLabel = 'Return to Tools' }: ToolAccessDeniedProps) {
  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard/tools';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center">
      <ShieldAlert className="mb-4 h-16 w-16 text-destructive" />
      <h3 className="text-xl font-bold mb-2">Access Denied</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        {message || 'You do not have permission to use this tool.'}
      </p>
      <Button variant="outline" onClick={handleClick}>
        {ctaLabel}
      </Button>
    </div>
  );
}
