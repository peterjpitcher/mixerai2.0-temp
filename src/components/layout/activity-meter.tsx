'use client';

import { useEffect, useState } from 'react';
import { Gauge, AlertCircle, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityStats {
  activeRequests: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  rateLimitStatus: 'normal' | 'warning' | 'critical';
  rateLimitInfo?: {
    remaining: number;
    limit: number;
    resetIn: number;
  };
  lastUpdated?: number;
}

export function ActivityMeter() {
  const [stats, setStats] = useState<ActivityStats>({
    activeRequests: 0,
    requestsPerMinute: 0,
    averageResponseTime: 0,
    rateLimitStatus: 'normal'
  });
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/ai/activity');
        const data = await response.json();
        
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      } catch (err) {
        // Silently fail - this is just monitoring
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, []);

  // Calculate capacity level (0-10 bars based on remaining rate limit)
  const capacityLevel = stats.rateLimitInfo 
    ? Math.ceil((stats.rateLimitInfo.remaining / stats.rateLimitInfo.limit) * 10)
    : 10; // Default to full if no rate limit info
  
  // Determine color based on capacity (inverse of activity - more capacity = good)
  const getBarColor = (index: number) => {
    if (index >= capacityLevel) return ''; // Empty bars
    
    const percentageRemaining = stats.rateLimitInfo 
      ? (stats.rateLimitInfo.remaining / stats.rateLimitInfo.limit) * 100
      : 100;
    
    if (percentageRemaining >= 70) return 'bg-green-500';
    if (percentageRemaining >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Format time since last update
  const getTimeSinceUpdate = () => {
    if (!stats.lastUpdated) return null;
    const seconds = Math.floor((Date.now() - stats.lastUpdated) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="border-t px-4 py-3">
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Gauge className={cn(
              "h-3.5 w-3.5",
              stats.rateLimitStatus === 'critical' ? "text-red-500" : 
              stats.rateLimitStatus === 'warning' ? "text-yellow-500" : 
              "text-green-500"
            )} />
            <span className="font-medium">AI Capacity</span>
          </div>
          <div className="flex items-center gap-2">
            {getTimeSinceUpdate() && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {getTimeSinceUpdate()}
              </span>
            )}
            {stats.activeRequests > 0 && (
              <span className="text-primary animate-pulse">
                {stats.activeRequests} active
              </span>
            )}
          </div>
        </div>
        
        {/* Capacity Meter */}
        <div className="flex items-end gap-0.5 h-8">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-sm transition-all duration-200",
                i < capacityLevel
                  ? getBarColor(i)
                  : "bg-muted",
                "h-" + (i < 3 ? "2" : i < 7 ? "4" : "8")
              )}
            />
          ))}
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {stats.rateLimitInfo ? (
            <>
              <span>{stats.rateLimitInfo.remaining}/{stats.rateLimitInfo.limit} requests</span>
              <span>{Math.round((stats.rateLimitInfo.remaining / stats.rateLimitInfo.limit) * 100)}% available</span>
            </>
          ) : (
            <span>No rate limit data</span>
          )}
        </div>
        
        {/* Rate Limit Warning */}
        {stats.rateLimitInfo && stats.rateLimitStatus !== 'normal' && (
          <div className={cn(
            "text-xs p-2 rounded-md",
            stats.rateLimitStatus === 'critical' 
              ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              : "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
          )}>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span className="font-medium">
                {stats.rateLimitStatus === 'critical' ? 'Critical: ' : 'Warning: '}
                Low capacity
              </span>
            </div>
            <span className="block mt-0.5">
              {stats.rateLimitInfo.remaining} requests remaining, resets in {Math.ceil(stats.rateLimitInfo.resetIn / 60)}m
            </span>
          </div>
        )}
      </div>
    </div>
  );
}