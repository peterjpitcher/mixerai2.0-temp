import * as React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

/**
 * Button component with loading state
 * Shows a spinner and optional loading text when loading=true
 */
export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ 
    children, 
    loading = false, 
    loadingText,
    disabled,
    className,
    ...props 
  }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={loading || disabled}
        className={cn(className)}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';

/**
 * Submit button variant with built-in loading state
 */
export const SubmitButton = React.forwardRef<
  HTMLButtonElement,
  LoadingButtonProps & { isSubmitting?: boolean }
>(({ 
  children = 'Submit', 
  loading,
  isSubmitting,
  loadingText = 'Submitting...',
  ...props 
}, ref) => {
  return (
    <LoadingButton
      ref={ref}
      type="submit"
      loading={loading || isSubmitting}
      loadingText={loadingText}
      {...props}
    >
      {children}
    </LoadingButton>
  );
});

SubmitButton.displayName = 'SubmitButton';

/**
 * Save button variant with built-in loading state
 */
export const SaveButton = React.forwardRef<
  HTMLButtonElement,
  LoadingButtonProps & { isSaving?: boolean }
>(({ 
  children = 'Save', 
  loading,
  isSaving,
  loadingText = 'Saving...',
  ...props 
}, ref) => {
  return (
    <LoadingButton
      ref={ref}
      loading={loading || isSaving}
      loadingText={loadingText}
      {...props}
    >
      {children}
    </LoadingButton>
  );
});

SaveButton.displayName = 'SaveButton';

/**
 * Delete button variant with built-in loading state
 */
export const DeleteButton = React.forwardRef<
  HTMLButtonElement,
  LoadingButtonProps & { isDeleting?: boolean }
>(({ 
  children = 'Delete', 
  loading,
  isDeleting,
  loadingText = 'Deleting...',
  variant = 'destructive',
  ...props 
}, ref) => {
  return (
    <LoadingButton
      ref={ref}
      variant={variant}
      loading={loading || isDeleting}
      loadingText={loadingText}
      {...props}
    >
      {children}
    </LoadingButton>
  );
});

DeleteButton.displayName = 'DeleteButton';