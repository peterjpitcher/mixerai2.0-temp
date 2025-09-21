'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { generateSlug, isValidSlug } from '@/lib/utils/slug';
import { RefreshCw, Check, X } from 'lucide-react';
import { useDebounce } from '@/lib/utils/performance';

interface SlugInputProps {
  value: string;
  onChange: (value: string) => void;
  sourceValue?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  validateUniqueness?: (slug: string) => Promise<boolean>;
  className?: string;
  autoGenerate?: boolean;
}

/**
 * Slug input component with auto-generation and validation
 */
export function SlugInput({
  value,
  onChange,
  sourceValue,
  label = 'URL Slug',
  description = 'This will be used in the article URL',
  placeholder = 'my-article-title',
  required = false,
  validateUniqueness,
  className,
  autoGenerate = true,
}: SlugInputProps) {
  const [isEditing, setIsEditing] = React.useState(!autoGenerate);
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationStatus, setValidationStatus] = React.useState<
    'idle' | 'valid' | 'invalid' | 'duplicate'
  >('idle');
  const [error, setError] = React.useState<string>('');

  const debouncedValue = useDebounce(value, 500);

  // Auto-generate slug from source value
  React.useEffect(() => {
    if (autoGenerate && !isEditing && sourceValue && !value) {
      const generatedSlug = generateSlug(sourceValue);
      onChange(generatedSlug);
    }
  }, [sourceValue, autoGenerate, isEditing, value, onChange]);

  // Validate slug
  React.useEffect(() => {
    const validateSlug = async () => {
      if (!debouncedValue) {
        setValidationStatus('idle');
        setError('');
        return;
      }

      setIsValidating(true);
      setError('');

      // Check format
      if (!isValidSlug(debouncedValue)) {
        setValidationStatus('invalid');
        setError('Slug can only contain lowercase letters, numbers, and hyphens');
        setIsValidating(false);
        return;
      }

      // Check uniqueness if validator provided
      if (validateUniqueness) {
        try {
          const isUnique = await validateUniqueness(debouncedValue);
          setValidationStatus(isUnique ? 'valid' : 'duplicate');
          if (!isUnique) {
            setError('This slug is already in use');
          }
        } catch (error) {
          console.error('Failed to validate slug uniqueness:', error);
          setValidationStatus('invalid');
          setError('Failed to validate slug uniqueness');
        }
      } else {
        setValidationStatus('valid');
      }

      setIsValidating(false);
    };

    validateSlug();
  }, [debouncedValue, validateUniqueness]);

  const handleRegenerate = () => {
    if (sourceValue) {
      const newSlug = generateSlug(sourceValue);
      onChange(newSlug);
      setIsEditing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    onChange(newValue);
  };

  const getStatusIcon = () => {
    if (isValidating) {
      return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />;
    }

    switch (validationStatus) {
      case 'valid':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'invalid':
      case 'duplicate':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor="slug-input">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Input
            id="slug-input"
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            required={required}
            readOnly={!isEditing && autoGenerate}
            className={cn(
              'pr-10',
              error && 'border-destructive focus-visible:ring-destructive',
              !isEditing && autoGenerate && 'bg-muted cursor-not-allowed'
            )}
            aria-invalid={!!error}
            aria-describedby={error ? 'slug-error' : description ? 'slug-description' : undefined}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getStatusIcon()}
          </div>
        </div>

        {autoGenerate && (
          <div className="flex gap-1">
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleEdit}
                title="Edit slug"
              >
                <span className="sr-only">Edit slug</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleRegenerate}
              disabled={!sourceValue}
              title="Regenerate slug"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Regenerate slug</span>
            </Button>
          </div>
        )}
      </div>

      {description && !error && (
        <p id="slug-description" className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {error && (
        <p id="slug-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {value && !error && (
        <p className="text-sm text-muted-foreground">
          Preview: <code className="text-xs bg-muted px-1 py-0.5 rounded">/articles/{value}</code>
        </p>
      )}
    </div>
  );
}
