'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { BarChart, LineChart, PieChart } from '@/components/charts';

interface AnalyticsData {
  contentCounts: {
    total: number;
    published: number;
    draft: number;
    pendingReview: number;
    rejected: number;
  };
  contentByType: {
    label: string;
    value: number;
  }[];
  contentByBrand: {
    label: string;
    value: number;
  }[];
  contentCreationOverTime: {
    date: string;
    count: number;
  }[];
  topPerformingContent: {
    id: string;
    title: string;
    views: number;
    type: string;
    brand: string;
  }[];
}

export function AnalyticsOverview() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      
      try {
        // In a real implementation, this would be an API call
        // Here we're just simulating a fetch with mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
        const data: AnalyticsData = {
          contentCounts: {
            total: 42,
            published: 28,
            draft: 8,
            pendingReview: 4,
            rejected: 2
          },
          contentByType: [
            { label: 'Article', value: 25 },
            { label: 'Retailer PDP', value: 10 },
            { label: 'Owned PDP', value: 7 }
          ],
          contentByBrand: [
            { label: 'Demo Brand', value: 15 },
            { label: 'Tech Innovators', value: 18 },
            { label: 'EcoFriendly', value: 9 }
          ],
          contentCreationOverTime: [
            { date: '2023-04-01', count: 3 },
            { date: '2023-04-08', count: 5 },
            { date: '2023-04-15', count: 8 },
            { date: '2023-04-22', count: 4 },
            { date: '2023-04-29', count: 6 },
            { date: '2023-05-06', count: 10 },
            { date: '2023-05-13', count: 6 }
          ],
          topPerformingContent: [
            { id: '1', title: 'How to Increase Your Social Media Engagement', views: 1250, type: 'Article', brand: 'Demo Brand' },
            { id: '6', title: 'Smart Home Security System Features', views: 980, type: 'Retailer PDP', brand: 'Tech Innovators' },
            { id: '3', title: '10 Tips for Sustainable Living', views: 890, type: 'Article', brand: 'EcoFriendly' },
            { id: '5', title: 'Best Practices for Email Marketing Campaigns', views: 720, type: 'Article', brand: 'Demo Brand' },
            { id: '2', title: 'Premium Wireless Headphones Product Description', views: 680, type: 'Retailer PDP', brand: 'Tech Innovators' }
          ]
        };
        
        setAnalyticsData(data);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [timeRange]);
  
  if (isLoading || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-6 w-6"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold">Content Analytics</h2>
        <div className="flex space-x-1 rounded-lg border p-1">
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              timeRange === '7days' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            7 days
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              timeRange === '30days' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            30 days
          </button>
          <button
            onClick={() => setTimeRange('90days')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              timeRange === '90days' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            90 days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              timeRange === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            All time
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analyticsData.contentCounts.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {timeRange === 'all' ? 'All time' : `Last ${timeRange === '7days' ? '7 days' : timeRange === '30days' ? '30 days' : '90 days'}`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analyticsData.contentCounts.published}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((analyticsData.contentCounts.published / analyticsData.contentCounts.total) * 100)}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analyticsData.contentCounts.draft}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((analyticsData.contentCounts.draft / analyticsData.contentCounts.total) * 100)}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analyticsData.contentCounts.pendingReview}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((analyticsData.contentCounts.pendingReview / analyticsData.contentCounts.total) * 100)}% of total
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Content by Type</CardTitle>
            <CardDescription>Distribution of content by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {/* This would be a real chart in a production app */}
              <div className="flex h-full items-center justify-center">
                <div className="w-full max-w-md">
                  {analyticsData.contentByType.map((item, index) => (
                    <div key={item.label} className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-sm text-muted-foreground">{item.value} ({Math.round((item.value / analyticsData.contentCounts.total) * 100)}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${(item.value / analyticsData.contentCounts.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Content by Brand</CardTitle>
            <CardDescription>Distribution of content by brand</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {/* This would be a real chart in a production app */}
              <div className="flex h-full items-center justify-center">
                <div className="w-full max-w-md">
                  {analyticsData.contentByBrand.map((item, index) => (
                    <div key={item.label} className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-sm text-muted-foreground">{item.value} ({Math.round((item.value / analyticsData.contentCounts.total) * 100)}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${(item.value / analyticsData.contentCounts.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Content Creation Over Time</CardTitle>
            <CardDescription>Number of content items created per week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {/* This would be a real chart in a production app */}
              <div className="flex h-full items-end justify-between px-2">
                {analyticsData.contentCreationOverTime.map((dataPoint) => (
                  <div 
                    key={dataPoint.date} 
                    className="flex flex-col items-center"
                  >
                    <div 
                      className="bg-primary w-12 rounded-t-md" 
                      style={{ 
                        height: `${(dataPoint.count / Math.max(...analyticsData.contentCreationOverTime.map(d => d.count))) * 200}px` 
                      }}
                    ></div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(dataPoint.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="text-xs font-medium">{dataPoint.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
          <CardDescription>Content with the most views</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left font-medium">Title</th>
                  <th className="h-12 px-4 text-left font-medium">Type</th>
                  <th className="h-12 px-4 text-left font-medium">Brand</th>
                  <th className="h-12 px-4 text-right font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.topPerformingContent.map((content) => (
                  <tr 
                    key={content.id}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <td className="p-4 align-middle font-medium">{content.title}</td>
                    <td className="p-4 align-middle">{content.type}</td>
                    <td className="p-4 align-middle">{content.brand}</td>
                    <td className="p-4 align-middle text-right">{content.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 