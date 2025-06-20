import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

export function LoadingSpinner({ 
  size = 'md', 
  className,
  label 
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      {label && (
        <span className="ml-2 text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

export function PageLoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function InlineLoadingSpinner({ className }: { className?: string }) {
  return <LoadingSpinner size="sm" className={cn("inline-flex", className)} />;
}