'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { DueDateIndicator } from '@/components/ui/due-date-indicator';
import { BrandDisplay } from '@/components/ui/brand-display';

interface ContentWithDeadline {
  id: string;
  title: string;
  due_date: string;
  status: string;
  brand_name?: string;
  brand_color?: string | null;
  brand_logo_url?: string | null;
}

interface UpcomingDeadlinesWidgetProps {
  brandId?: string;
  limit?: number;
}

export function UpcomingDeadlinesWidget({ 
  brandId, 
  limit = 5 
}: UpcomingDeadlinesWidgetProps) {
  const [content, setContent] = useState<ContentWithDeadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcomingDeadlines = async () => {
      try {
        const params = new URLSearchParams();
        if (brandId) params.append('brand_id', brandId);
        params.append('has_due_date', 'true');
        params.append('status', 'draft,in_review');
        params.append('limit', limit.toString());
        params.append('sort', 'due_date');

        const response = await fetch(`/api/content?${params}`);
        const data = await response.json();

        if (data.success) {
          setContent(data.data || []);
        } else {
          setError(data.error || 'Failed to load deadlines');
        }
      } catch (err) {
        setError('Failed to load deadlines');
        console.error('Error fetching deadlines:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpcomingDeadlines();
  }, [brandId, limit]);

  // Remove getDeadlineStatus - now using DueDateIndicator

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
          <CardDescription>Content approaching due dates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const upcomingContent = content.filter(item => item.due_date);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Deadlines</CardTitle>
        <CardDescription>Content approaching due dates</CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingContent.length === 0 ? (
          <EmptyState 
            icon={Calendar}
            message="No upcoming deadlines" 
          />
        ) : (
          <div className="space-y-3">
            {upcomingContent.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/content/${item.id}/edit`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  {item.brand_name && (
                    <div className="flex items-center gap-1.5">
                      <BrandDisplay 
                        brand={{
                          name: item.brand_name,
                          brand_color: item.brand_color,
                          logo_url: item.brand_logo_url
                        }}
                        variant="compact"
                        size="sm"
                        className="h-4 w-4"
                      />
                      <p className="text-xs text-muted-foreground">{item.brand_name}</p>
                    </div>
                  )}
                </div>
                <DueDateIndicator
                  dueDate={item.due_date}
                  status={item.status as any}
                  size="sm"
                  className="ml-2 shrink-0"
                />
              </Link>
            ))}
          </div>
        )}
        
        {upcomingContent.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href="/dashboard/content?filter=has_due_date">
                View All Deadlines
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}