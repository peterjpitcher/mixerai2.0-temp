'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getAccessibleFieldProps } from '@/lib/utils/accessibility';

interface AccessibleFormFieldProps {
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Accessible form field wrapper that ensures proper labeling
 * and error associations for screen readers
 */
export function AccessibleFormField({
  label,
  error,
  description,
  required,
  children,
  className,
}: AccessibleFormFieldProps) {
  const fieldProps = getAccessibleFieldProps({ label, error, required, description });

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={fieldProps.id}>
        {label}
        {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
      </Label>
      
      {React.cloneElement(children as React.ReactElement, {
        id: fieldProps.id,
        'aria-invalid': fieldProps['aria-invalid'],
        'aria-required': fieldProps['aria-required'],
        'aria-describedby': fieldProps['aria-describedby'],
        'aria-errormessage': fieldProps['aria-errormessage'],
      })}
      
      {description && (
        <p id={fieldProps.descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {error && (
        <p id={fieldProps.errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Pre-configured accessible input field
 */
export function AccessibleInput({
  label,
  error,
  description,
  required,
  className,
  ...inputProps
}: AccessibleFormFieldProps & React.ComponentProps<typeof Input>) {
  return (
    <AccessibleFormField
      label={label}
      error={error}
      description={description}
      required={required}
      className={className}
    >
      <Input {...inputProps} />
    </AccessibleFormField>
  );
}

/**
 * Pre-configured accessible textarea field
 */
export function AccessibleTextarea({
  label,
  error,
  description,
  required,
  className,
  ...textareaProps
}: AccessibleFormFieldProps & React.ComponentProps<typeof Textarea>) {
  return (
    <AccessibleFormField
      label={label}
      error={error}
      description={description}
      required={required}
      className={className}
    >
      <Textarea {...textareaProps} />
    </AccessibleFormField>
  );
}