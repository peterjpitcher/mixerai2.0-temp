import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface CardSkeletonProps {
  showDescription?: boolean;
  showFooter?: boolean;
  className?: string;
}

export function CardSkeleton({ 
  showDescription = true,
  showFooter = false,
  className 
}: CardSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-2/3" />
        {showDescription && <Skeleton className="h-4 w-full mt-2" />}
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </CardContent>
      {showFooter && (
        <div className="px-6 pb-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      )}
    </Card>
  );
}

interface CardGridSkeletonProps {
  cards?: number;
  columns?: 2 | 3 | 4;
  showDescription?: boolean;
  showFooter?: boolean;
}

export function CardGridSkeleton({ 
  cards = 6,
  columns = 3,
  showDescription = true,
  showFooter = false
}: CardGridSkeletonProps) {
  const gridClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }[columns];

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <CardSkeleton 
          key={i} 
          showDescription={showDescription}
          showFooter={showFooter}
        />
      ))}
    </div>
  );
}