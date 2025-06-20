import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface DueDateIndicatorProps {
  dueDate: string | Date | null;
  status?: 'draft' | 'in_review' | 'approved' | 'published' | 'completed';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function DueDateIndicator({
  dueDate,
  status,
  size = 'md',
  showIcon = true,
  className
}: DueDateIndicatorProps) {
  if (!dueDate) return null;

  const date = new Date(dueDate);
  const isCompleted = status === 'published' || status === 'approved' || status === 'completed';

  // Determine urgency and styling
  let variant: 'destructive' | 'secondary' | 'outline' | 'default' = 'outline';
  let Icon = Calendar;
  let label = format(date, 'MMM d, yyyy');

  if (isCompleted) {
    variant = 'default'; // Use default (primary color) for success
    Icon = CheckCircle;
    label = `Completed ${format(date, 'MMM d')}`;
  } else if (isPast(date)) {
    variant = 'destructive';
    Icon = AlertTriangle;
    label = `Overdue by ${formatDistanceToNow(date)}`;
  } else if (isToday(date)) {
    variant = 'destructive'; // Use destructive for warning
    Icon = Clock;
    label = 'Due today';
  } else if (isTomorrow(date)) {
    variant = 'destructive'; // Use destructive for warning
    Icon = Clock;
    label = 'Due tomorrow';
  } else if (date <= addDays(new Date(), 3)) {
    variant = 'secondary';
    Icon = Clock;
    label = `Due ${formatDistanceToNow(date, { addSuffix: true })}`;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm',
    lg: 'text-base px-3 py-1'
  };

  return (
    <Badge 
      variant={variant} 
      className={cn(sizeClasses[size], className)}
    >
      {showIcon && <Icon className={cn("mr-1", size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {label}
    </Badge>
  );
}

interface DueDateDisplayProps {
  dueDate: string | Date | null;
  format?: string;
  className?: string;
  showRelative?: boolean;
}

export function DueDateDisplay({
  dueDate,
  format: dateFormat = 'MMM d, yyyy',
  className,
  showRelative = true
}: DueDateDisplayProps) {
  if (!dueDate) return <span className={cn("text-muted-foreground", className)}>No due date</span>;

  const date = new Date(dueDate);
  const formattedDate = format(date, dateFormat);
  const relativeTime = formatDistanceToNow(date, { addSuffix: true });

  return (
    <span className={cn("text-sm", className)}>
      {formattedDate}
      {showRelative && !isPast(date) && date <= addDays(new Date(), 7) && (
        <span className="text-muted-foreground ml-1">({relativeTime})</span>
      )}
    </span>
  );
}