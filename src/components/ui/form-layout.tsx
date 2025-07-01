'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { FORM_PATTERNS, TYPOGRAPHY } from '@/lib/utils/ui-standards';

interface FormLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

interface FormFieldGroupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent form layout following UI standards
 */
export function FormLayout({ children, className }: FormLayoutProps) {
  return (
    <form className={cn(FORM_PATTERNS.sectionSpacing, className)}>
      {children}
    </form>
  );
}

/**
 * Form section with optional title and description
 */
export function FormSection({ 
  title, 
  description, 
  children, 
  className 
}: FormSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
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
export function FormFieldGroup({ children, className }: FormFieldGroupProps) {
  return (
    <div className={cn(FORM_PATTERNS.fieldSpacing, className)}>
      {children}
    </div>
  );
}

/**
 * Form actions footer with consistent spacing
 */
export function FormActions({ 
  children, 
  className,
  align = 'end' 
}: FormLayoutProps & { align?: 'start' | 'center' | 'end' }) {
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
    )}>
      {children}
    </div>
  );
}