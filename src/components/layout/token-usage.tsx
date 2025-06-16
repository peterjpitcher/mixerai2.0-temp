'use client';

import { useEffect, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface TokenUsage {
  tokens_used: number;
  tokens_limit: number;
  period: string;
  reset_date: string;
}

export function TokenUsage() {
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/ai/usage');
        const data = await response.json();
        
        if (data.success && data.usage) {
          setUsage(data.usage);
          setError(null);
        } else {
          setError('Failed to load usage');
        }
      } catch (err) {
        console.error('Error fetching token usage:', err);
        setError('Error loading usage');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsage();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUsage, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !usage) {
    return null; // Silently fail to not disrupt navigation
  }

  const percentage = (usage.tokens_used / usage.tokens_limit) * 100;
  const remaining = usage.tokens_limit - usage.tokens_used;
  const resetDate = new Date(usage.reset_date);
  const daysUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="border-t px-4 py-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">AI Token Usage</span>
          </div>
          <span className="text-muted-foreground">
            {percentage.toFixed(1)}%
          </span>
        </div>
        
        <Progress value={percentage} className="h-1.5" />
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{remaining.toLocaleString()} tokens left</span>
          <span>Resets in {daysUntilReset}d</span>
        </div>
      </div>
    </div>
  );
}