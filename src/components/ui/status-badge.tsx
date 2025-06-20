import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface StatusConfig {
  label: string;
  variant: StatusVariant;
  className?: string;
}

// Common status configurations
const STATUS_CONFIGS: Record<string, StatusConfig> = {
  // Generic statuses
  active: { label: 'Active', variant: 'default' },
  inactive: { label: 'Inactive', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Published', variant: 'default' },
  archived: { label: 'Archived', variant: 'outline' },
  
  // Workflow statuses
  in_progress: { label: 'In Progress', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  on_hold: { label: 'On Hold', variant: 'secondary' },
  
  // User roles
  admin: { label: 'Admin', variant: 'default' },
  editor: { label: 'Editor', variant: 'secondary' },
  viewer: { label: 'Viewer', variant: 'outline' },
  
  // Tool statuses
  processing: { label: 'Processing', variant: 'secondary' },
  success: { label: 'Success', variant: 'default' },
  error: { label: 'Error', variant: 'destructive' },
  failed: { label: 'Failed', variant: 'destructive' },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  variant?: StatusVariant;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
}

export function StatusBadge({ 
  status, 
  label,
  variant,
  className,
  size = 'default'
}: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  const config = STATUS_CONFIGS[normalizedStatus];
  
  const finalLabel = label || config?.label || status;
  const finalVariant = variant || config?.variant || 'default';
  
  return (
    <Badge 
      variant={finalVariant}
      className={cn(
        config?.className,
        size === 'sm' && 'text-xs px-2 py-0',
        size === 'lg' && 'text-sm px-3 py-1',
        className
      )}
    >
      {finalLabel}
    </Badge>
  );
}

// Specialized status badges for common use cases
export function WorkflowStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge status={status} {...props} />;
}

export function UserRoleBadge({ role, ...props }: { role: string } & Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge status={role} {...props} />;
}

export function ContentStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge status={status} {...props} />;
}