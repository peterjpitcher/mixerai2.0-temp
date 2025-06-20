import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ListItemSkeletonProps {
  showAvatar?: boolean;
  showSecondaryText?: boolean;
  showAction?: boolean;
}

export function ListItemSkeleton({ 
  showAvatar = true,
  showSecondaryText = true,
  showAction = true 
}: ListItemSkeletonProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-3 flex-1">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-32" />
          {showSecondaryText && <Skeleton className="h-3 w-48" />}
        </div>
      </div>
      {showAction && <Skeleton className="h-8 w-8" />}
    </div>
  );
}

interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  showSecondaryText?: boolean;
  showAction?: boolean;
  className?: string;
}

export function ListSkeleton({ 
  items = 5,
  showAvatar = true,
  showSecondaryText = true,
  showAction = true,
  className
}: ListSkeletonProps) {
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <ListItemSkeleton 
          key={i}
          showAvatar={showAvatar}
          showSecondaryText={showSecondaryText}
          showAction={showAction}
        />
      ))}
    </div>
  );
}