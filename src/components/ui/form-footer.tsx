'use client';

import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFooterProps {
  /**
   * Whether to make the footer sticky at the bottom of the viewport
   */
  isSticky?: boolean;
  
  /**
   * Primary action button label (e.g., "Save", "Create", "Update")
   */
  primaryLabel: string;
  
  /**
   * Primary action click handler
   */
  onPrimaryClick: () => void;
  
  /**
   * Secondary action button label (e.g., "Cancel", "Back")
   */
  secondaryLabel?: string;
  
  /**
   * Secondary action click handler
   */
  onSecondaryClick?: () => void;
  
  /**
   * Whether the form is currently saving/loading
   */
  isLoading?: boolean;
  
  /**
   * Loading text to display
   */
  loadingText?: string;
  
  /**
   * Additional buttons or content to display between secondary and primary
   */
  children?: ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether the primary action is disabled
   */
  isPrimaryDisabled?: boolean;
  
  /**
   * Primary button variant
   */
  primaryVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  
  /**
   * Secondary button variant
   */
  secondaryVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

/**
 * Standardized form footer component that ensures consistent button positioning
 * according to UI standards:
 * - Primary action on the right
 * - Secondary action on the left
 * - Optional sticky positioning for long forms
 */
export function FormFooter({
  isSticky = false,
  primaryLabel,
  onPrimaryClick,
  secondaryLabel = 'Cancel',
  onSecondaryClick,
  isLoading = false,
  loadingText = 'Saving...',
  children,
  className,
  isPrimaryDisabled = false,
  primaryVariant = 'default',
  secondaryVariant = 'outline'
}: FormFooterProps) {
  const footerClasses = cn(
    'flex items-center justify-end gap-2 border-t pt-6',
    isSticky && 'sticky bottom-0 bg-background pb-6 px-6 -mx-6 z-10',
    className
  );

  return (
    <div className={footerClasses}>
      {/* Secondary action (left side) */}
      {onSecondaryClick && (
        <Button
          type="button"
          variant={secondaryVariant}
          onClick={onSecondaryClick}
          disabled={isLoading}
        >
          {secondaryLabel}
        </Button>
      )}
      
      {/* Additional content/buttons */}
      {children}
      
      {/* Spacer to push primary button to the right if no secondary action */}
      {!onSecondaryClick && !children && <div className="flex-1" />}
      
      {/* Primary action (right side) */}
      <Button
        type="submit"
        variant={primaryVariant}
        onClick={onPrimaryClick}
        disabled={isPrimaryDisabled || isLoading}
      >
        {isLoading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {loadingText}
          </>
        ) : (
          primaryLabel
        )}
      </Button>
    </div>
  );
}

/**
 * Wrapper component for Card-based forms that provides consistent padding
 */
export function CardFormFooter(props: FormFooterProps) {
  return (
    <FormFooter
      {...props}
      className={cn(
        'px-6 pb-6',
        props.isSticky && '-mx-6',
        props.className
      )}
    />
  );
}