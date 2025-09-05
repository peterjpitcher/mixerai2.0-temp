'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FieldConfig {
  max_rows?: number;
  max_length?: number;
  min_length?: number;
  required?: boolean;
}

interface ValidatedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  field: {
    name: string;
    label?: string;
    placeholder?: string;
    config?: FieldConfig;
  };
  className?: string;
  disabled?: boolean;
}

export function ValidatedTextarea({
  value,
  onChange,
  field,
  className,
  disabled = false
}: ValidatedTextareaProps) {
  const [error, setError] = useState<string | null>(null);
  const [lineCount, setLineCount] = useState(1);
  const [composing, setComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Normalize line breaks and count lines
  const normalizeAndCount = useCallback((text: string) => {
    // Normalize to \n
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').length;
    return { normalized, lines };
  }, []);

  // Validate text against constraints
  const validateText = useCallback((text: string): { valid: boolean; error?: string; validated: string } => {
    const { normalized, lines } = normalizeAndCount(text);
    
    // Check max rows (line count)
    if (field.config?.max_rows && lines > field.config.max_rows) {
      const truncatedLines = normalized.split('\n').slice(0, field.config.max_rows);
      return {
        valid: false,
        error: `Maximum ${field.config.max_rows} rows allowed (currently ${lines})`,
        validated: truncatedLines.join('\n')
      };
    }

    // Check max length
    if (field.config?.max_length && normalized.length > field.config.max_length) {
      return {
        valid: false,
        error: `Maximum ${field.config.max_length} characters allowed`,
        validated: normalized.substring(0, field.config.max_length)
      };
    }

    // Check min length
    if (field.config?.min_length && normalized.length < field.config.min_length) {
      return {
        valid: false,
        error: `Minimum ${field.config.min_length} characters required`,
        validated: normalized
      };
    }

    return { valid: true, validated: normalized };
  }, [field.config, normalizeAndCount]);

  // Handle text changes (IME-safe)
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // During composition, don't validate (for IME support)
    if (composing) {
      onChange(newValue);
      return;
    }

    const validation = validateText(newValue);
    
    if (!validation.valid) {
      setError(validation.error || null);
      // Only enforce hard limits for max_rows and max_length
      if (field.config?.max_rows || field.config?.max_length) {
        // Allow the input but show error
        onChange(newValue);
      }
    } else {
      setError(null);
      onChange(validation.validated);
    }

    // Update line count
    const { lines } = normalizeAndCount(newValue);
    setLineCount(lines);
  }, [composing, validateText, onChange, field.config, normalizeAndCount]);

  // Handle composition end (for IME)
  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setComposing(false);
    const validation = validateText(e.currentTarget.value);
    
    if (!validation.valid) {
      setError(validation.error || null);
      // Enforce limits after composition ends
      if (field.config?.max_rows || field.config?.max_length) {
        onChange(validation.validated);
      }
    } else {
      setError(null);
      onChange(validation.validated);
    }

    const { lines } = normalizeAndCount(e.currentTarget.value);
    setLineCount(lines);
  }, [validateText, onChange, field.config, normalizeAndCount]);

  // Handle Enter key (prevent if at max rows)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && field.config?.max_rows) {
      const { lines } = normalizeAndCount(value);
      if (lines >= field.config.max_rows) {
        e.preventDefault();
        setError(`Maximum ${field.config.max_rows} rows reached`);
        // Clear error after 2 seconds
        setTimeout(() => setError(null), 2000);
      }
    }
  }, [value, field.config, normalizeAndCount]);

  // Handle blur - final validation
  const handleBlur = useCallback(() => {
    const validation = validateText(value);
    if (!validation.valid) {
      setError(validation.error || null);
      // Enforce on blur
      onChange(validation.validated);
    } else {
      setError(null);
    }
  }, [value, validateText, onChange]);

  // Calculate initial line count
  useState(() => {
    const { lines } = normalizeAndCount(value);
    setLineCount(lines);
  });

  return (
    <div className="space-y-1">
      {field.label && (
        <label htmlFor={field.name} className="text-sm font-medium">
          {field.label}
          {field.config?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={field.name}
          name={field.name}
          value={value}
          onChange={handleChange}
          onCompositionStart={() => setComposing(true)}
          onCompositionUpdate={() => setComposing(true)}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={field.config?.max_rows || 5}
          className={cn(
            "w-full rounded-md border px-3 py-2",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            error && "border-red-500 focus:ring-red-500",
            !error && "border-gray-300 focus:ring-blue-500",
            disabled && "bg-gray-50 cursor-not-allowed",
            className
          )}
        />
        
        {/* Character/row counter */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 pointer-events-none">
          {field.config?.max_length && (
            <span className={value.length > field.config.max_length * 0.9 ? "text-orange-500" : ""}>
              {value.length}/{field.config.max_length}
            </span>
          )}
          {field.config?.max_rows && field.config?.max_length && " • "}
          {field.config?.max_rows && (
            <span className={lineCount >= field.config.max_rows ? "text-orange-500" : ""}>
              {lineCount}/{field.config.max_rows} rows
            </span>
          )}
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      
      {/* Help text */}
      {!error && field.config?.max_rows && (
        <p className="text-xs text-gray-500">
          Press Enter to add a new line (max {field.config.max_rows} rows)
        </p>
      )}
    </div>
  );
}