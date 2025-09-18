'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { FORM_PATTERNS, TYPOGRAPHY } from '@/lib/utils/ui-standards';

interface FormLayoutProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

interface FormSectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

interface FormFieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Consistent form layout following UI standards
 */
export const FormLayout = React.forwardRef<HTMLFormElement, FormLayoutProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <form
        ref={ref}
        className={cn(FORM_PATTERNS.sectionSpacing, className)}
        {...props}
      >
        {children}
      </form>
    );
  }
);
FormLayout.displayName = 'FormLayout';

/**
 * Form section with optional title and description
 */
export function FormSection({
  title,
  description,
  children,
  className,
  ...props
}: FormSectionProps) {
  return (
    <section className={cn('space-y-4', className)} {...props}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className={TYPOGRAPHY.h4}>{title}</h3>
          )}
          {description && (
            <p className={cn(TYPOGRAPHY.small, 'text-muted-foreground')}>
              {description}
            </p>
          )}
        </div>
      )}
      <div className={FORM_PATTERNS.fieldSpacing}>
        {children}
      </div>
    </section>
  );
}

/**
 * Group related form fields together
 */
export function FormFieldGroup({ children, className, ...props }: FormFieldGroupProps) {
  return (
    <div className={cn(FORM_PATTERNS.fieldSpacing, className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Form actions footer with consistent spacing
 */
interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
}

export function FormActions({
  children,
  className,
  align = 'end',
  ...props
}: FormActionsProps) {
  const alignmentClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  };

  return (
    <div className={cn(
      'flex items-center gap-4 pt-6 border-t',
      alignmentClasses[align],
      className
    )} {...props}>
      {children}
    </div>
  );
}
