'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityStats {
  activeRequests: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  rateLimitStatus: 'normal' | 'warning' | 'critical';
  rateLimitInfo?: {
    remaining: number;
    resetIn: number;
  };
}

export function ActivityMeter() {
  const [stats, setStats] = useState<ActivityStats>({
    activeRequests: 0,
    requestsPerMinute: 0,
    averageResponseTime: 0,
    rateLimitStatus: 'normal'
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/ai/activity');
        const data = await response.json();
        
        if (data.success && data.stats) {
          setStats(data.stats);
          // Show the meter if there's any activity
          setIsVisible(data.stats.activeRequests > 0 || data.stats.requestsPerMinute > 0);
        }
      } catch (err) {
        // Silently fail - this is just monitoring
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  // Calculate meter levels (0-10 bars)
  const activityLevel = Math.min(10, Math.floor((stats.requestsPerMinute / 60) * 10));
  
  // Determine color based on status
  const getBarColor = (index: number) => {
    if (stats.rateLimitStatus === 'critical') return 'bg-red-500';
    if (stats.rateLimitStatus === 'warning' && index >= 7) return 'bg-yellow-500';
    if (index < 3) return 'bg-green-500';
    if (index < 7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="border-t px-4 py-3">
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Activity className={cn(
              "h-3.5 w-3.5",
              stats.activeRequests > 0 ? "animate-pulse" : "",
              stats.rateLimitStatus === 'critical' ? "text-red-500" : 
              stats.rateLimitStatus === 'warning' ? "text-yellow-500" : 
              "text-green-500"
            )} />
            <span className="font-medium">AI Activity</span>
          </div>
          <div className="flex items-center gap-2">
            {stats.activeRequests > 0 && (
              <span className="text-muted-foreground">
                {stats.activeRequests} active
              </span>
            )}
            {stats.rateLimitStatus !== 'normal' && (
              <AlertCircle className={cn(
                "h-3 w-3",
                stats.rateLimitStatus === 'critical' ? "text-red-500" : "text-yellow-500"
              )} />
            )}
          </div>
        </div>
        
        {/* Activity Meter */}
        <div className="flex items-end gap-0.5 h-8">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-sm transition-all duration-200",
                i < activityLevel
                  ? getBarColor(i)
                  : "bg-muted",
                "h-" + (i < 3 ? "2" : i < 7 ? "4" : "8")
              )}
            />
          ))}
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{stats.requestsPerMinute} req/min</span>
          {stats.averageResponseTime > 0 && (
            <span>{stats.averageResponseTime}ms avg</span>
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
              <Zap className="h-3 w-3" />
              <span className="font-medium">Rate limit approaching</span>
            </div>
            <span className="block mt-0.5">
              {stats.rateLimitInfo.remaining} requests left, resets in {Math.ceil(stats.rateLimitInfo.resetIn / 60)}m
            </span>
          </div>
        )}
      </div>
    </div>
  );
}