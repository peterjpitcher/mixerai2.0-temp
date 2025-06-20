import { useEffect, useState } from 'react';
import { Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date | null;
  error?: string;
  onRetry?: () => void;
  className?: string;
  showTimestamp?: boolean;
}

export function SaveStatusIndicator({
  status,
  lastSaved,
  error,
  onRetry,
  className,
  showTimestamp = true
}: SaveStatusIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (status === 'saved') {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (status === 'idle' && !showSaved) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}

      {(status === 'saved' || showSaved) && (
        <>
          <Check className="h-4 w-4 text-success" />
          <span className="text-success">
            Saved
            {showTimestamp && lastSaved && (
              <span className="text-muted-foreground ml-1">
                {format(lastSaved, 'p')}
              </span>
            )}
          </span>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">
            {error || 'Save failed'}
          </span>
          {onRetry && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRetry}
              className="h-auto p-1 text-destructive hover:text-destructive"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  );
}

interface AutoSaveIndicatorProps {
  isDirty: boolean;
  lastSaved?: Date | null;
  saveError?: string;
  onRetry?: () => void;
  className?: string;
}

export function AutoSaveIndicator({
  isDirty,
  lastSaved,
  saveError,
  onRetry,
  className
}: AutoSaveIndicatorProps) {
  const [status, setStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    if (saveError) {
      setStatus('error');
    } else if (isDirty) {
      setStatus('saving');
    } else if (lastSaved) {
      setStatus('saved');
    } else {
      setStatus('idle');
    }
  }, [isDirty, lastSaved, saveError]);

  return (
    <SaveStatusIndicator
      status={status}
      lastSaved={lastSaved}
      error={saveError}
      onRetry={onRetry}
      className={className}
    />
  );
}

interface UnsavedChangesWarningProps {
  hasUnsavedChanges: boolean;
  className?: string;
}

export function UnsavedChangesWarning({
  hasUnsavedChanges,
  className
}: UnsavedChangesWarningProps) {
  if (!hasUnsavedChanges) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm text-warning",
      className
    )}>
      <AlertCircle className="h-4 w-4" />
      <span>Unsaved changes</span>
    </div>
  );
}