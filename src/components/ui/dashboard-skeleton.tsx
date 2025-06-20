import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface StatCardSkeletonProps {
  showTrend?: boolean;
}

export function StatCardSkeleton({ showTrend = true }: StatCardSkeletonProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        {showTrend && <Skeleton className="h-3 w-32" />}
      </CardContent>
    </Card>
  );
}

interface ChartSkeletonProps {
  height?: string;
}

export function ChartSkeleton({ height = "h-64" }: ChartSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full ${height}`} />
      </CardContent>
    </Card>
  );
}

interface DashboardSkeletonProps {
  showStats?: boolean;
  statCards?: number;
  showChart?: boolean;
  showTable?: boolean;
}

export function DashboardSkeleton({ 
  showStats = true,
  statCards = 4,
  showChart = true,
  showTable = true
}: DashboardSkeletonProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  }[statCards] || 'grid-cols-4';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats Grid */}
      {showStats && (
        <div className={`grid gap-4 ${gridCols}`}>
          {Array.from({ length: statCards }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Chart */}
      {showChart && <ChartSkeleton />}

      {/* Recent Activity Table */}
      {showTable && (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}