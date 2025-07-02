import * as React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { srOnly } from '@/lib/utils/accessibility';

interface IconButtonProps extends ButtonProps {
  /**
   * Accessible label for screen readers
   * This is required for icon-only buttons
   */
  'aria-label': string;
  /**
   * Optional visible tooltip on hover
   */
  tooltip?: string;
}

/**
 * Accessible icon button component
 * Ensures all icon-only buttons have proper labels for screen readers
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, children, 'aria-label': ariaLabel, tooltip, ...props }, ref) => {
    if (!ariaLabel) {
      console.error('IconButton requires an aria-label prop for accessibility');
    }

    return (
      <Button
        ref={ref}
        className={cn('', className)}
        aria-label={ariaLabel}
        title={tooltip || ariaLabel}
        {...props}
      >
        {children}
        <span className={srOnly}>{ariaLabel}</span>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';