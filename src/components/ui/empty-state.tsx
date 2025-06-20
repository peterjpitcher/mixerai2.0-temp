import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

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
    <div className={cn("text-center py-8", className)}>
      {Icon && (
        <Icon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      )}
      {title && (
        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      )}
      <p className="text-muted-foreground">{message}</p>
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}