'use client';

import * as React from 'react';
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Spinner({ className, size = 'md', label = 'Loading', ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6'
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent", 
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
} 