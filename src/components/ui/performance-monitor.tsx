'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PerformanceMonitorProps {
  show?: boolean;
  className?: string;
}

/**
 * Performance monitoring component for development
 * Shows render count and performance metrics
 */
export function PerformanceMonitor({ 
  show = process.env.NODE_ENV === 'development',
  className 
}: PerformanceMonitorProps) {
  const [renderCount, setRenderCount] = React.useState(0);
  const [lastRenderTime, setLastRenderTime] = React.useState(0);
  const renderStartTime = React.useRef(performance.now());

  React.useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;
    setLastRenderTime(renderTime);
    setRenderCount((prev) => prev + 1);
    renderStartTime.current = performance.now();
  });

  if (!show) return null;

  const getPerformanceColor = (time: number) => {
    if (time < 16) return 'bg-green-500';
    if (time < 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className={cn('fixed bottom-4 right-4 z-50 w-64', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Performance Monitor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Render Count:</span>
          <Badge variant="outline">{renderCount}</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Last Render:</span>
          <div className="flex items-center gap-2">
            <div 
              className={cn(
                'h-2 w-2 rounded-full',
                getPerformanceColor(lastRenderTime)
              )} 
            />
            <span className="text-sm font-mono">
              {lastRenderTime.toFixed(2)}ms
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook to track component renders in development
 */
export function useRenderCount(componentName: string) {
  const renderCount = React.useRef(0);
  
  React.useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Render] ${componentName}: ${renderCount.current}`);
    }
  });
  
  return renderCount.current;
}

/**
 * HOC to track performance of a component
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  const MemoizedComponent = React.memo((props: P) => {
    const renderCount = useRenderCount(componentName);
    
    if (process.env.NODE_ENV === 'development') {
      return (
        <>
          <Component {...props} />
          <div className="absolute top-0 right-0 text-xs bg-yellow-500 text-white px-1 rounded">
            {renderCount}
          </div>
        </>
      );
    }
    
    return <Component {...props} />;
  });
  
  return MemoizedComponent as unknown as React.ComponentType<P>;
}