import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { TYPOGRAPHY } from '@/lib/utils/ui-standards';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  message, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      "py-12 px-6 sm:px-8",
      className
    )}>
      {Icon && (
        <Icon className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
      )}
      {title && (
        <h3 className={cn(TYPOGRAPHY.h3, "mb-2")}>{title}</h3>
      )}
      <p className={cn(TYPOGRAPHY.body, "text-muted-foreground max-w-md")}>{message}</p>
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}