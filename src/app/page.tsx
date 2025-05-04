'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";
import { Tabs, TabsContent } from "@/components/tabs";
import { NotificationsButton } from "@/components/dashboard/notifications";

// Define types for our data
interface Brand {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

interface ContentItem {
  id: string;
  title: string;
  content_type_name: string;
  brand_name: string;
  status: string;
  created_at: string;
  created_by_name: string;
}

interface WorkflowItem {
  id: string;
  name: string;
  brand_name?: string;
  content_type_name?: string;
  steps_count?: number;
}

interface DashboardStats {
  brandCount: number;
  userCount: number;
  contentCount: number;
  workflowCount: number;
}

interface ContentTypeDistribution {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ 
    brandCount: 0,
    userCount: 0,
    contentCount: 0,
    workflowCount: 0
  });
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);
  const [contentTypeDistribution, setContentTypeDistribution] = useState<ContentTypeDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        
        // Fetch brands
        const brandsResponse = await fetch('/api/brands');
        
        // Fetch content
        const contentResponse = await fetch('/api/content');
        
        // Fetch users
        const usersResponse = await fetch('/api/users');
        
        // Fetch workflows
        const workflowsResponse = await fetch('/api/workflows');
        
        if (!brandsResponse.ok || !contentResponse.ok || !usersResponse.ok || !workflowsResponse.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        
        const brandsData = await brandsResponse.json();
        const contentData = await contentResponse.json();
        const usersData = await usersResponse.json();
        const workflowsData = await workflowsResponse.json();
        
        if (brandsData.success && contentData.success && usersData.success && workflowsData.success) {
          // Update stats with live data
          setStats({
            brandCount: brandsData.brands.length,
            userCount: usersData.users.length,
            contentCount: contentData.content.length,
            workflowCount: workflowsData.workflows.length
          });
          
          // Set recent content (most recent 4 items)
          const sortedContent = contentData.content
            .sort((a: ContentItem, b: ContentItem) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 4);
          
          setRecentContent(sortedContent);
          
          // Calculate content type distribution
          if (contentData.content.length > 0) {
            const contentTypes: Record<string, number> = {};
            
            // Count contents by type
            contentData.content.forEach((item: ContentItem) => {
              if (item.content_type_name) {
                contentTypes[item.content_type_name] = (contentTypes[item.content_type_name] || 0) + 1;
              }
            });
            
            // Convert to array with percentages
            const totalCount = contentData.content.length;
            const colors = ['bg-primary', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
            
            const distribution = Object.entries(contentTypes)
              .map(([name, count], index) => ({
                name,
                count,
                percentage: Math.round((count / totalCount) * 100),
                color: colors[index % colors.length]
              }))
              .sort((a, b) => b.count - a.count);
            
            setContentTypeDistribution(distribution);
          }
        } else {
          throw new Error("Failed to fetch dashboard data");
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);

  // Create stats array from the data
  const statsItems = [
    { name: "Total Brands", value: stats.brandCount, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7V2h5" />
        <path d="M16 2h5v5" />
        <path d="M22 16v5h-5" />
        <path d="M7 22H2v-5" />
        <path d="M22 2 2 22" />
      </svg>
    )},
    { name: "Active Users", value: stats.userCount, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )},
    { name: "Total Content", value: stats.contentCount, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    )},
    { name: "Active Workflows", value: stats.workflowCount, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="8" height="8" x="2" y="2" rx="2" />
        <path d="M14 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
        <path d="M20 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
        <path d="M10 18H5c-1.7 0-3-1.3-3-3v-1" />
        <polyline points="7 21 10 18 7 15" />
        <rect width="8" height="8" x="14" y="14" rx="2" />
      </svg>
    )},
  ];

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center max-w-md">
          <div className="text-destructive mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/content/new">Create Content</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsItems.map((stat) => (
            <Card key={stat.name}>
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Content</CardTitle>
            <CardDescription>Your latest content across all brands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-3 font-medium">Title</th>
                    <th className="text-left pb-3 font-medium">Type</th>
                    <th className="text-left pb-3 font-medium">Brand</th>
                    <th className="text-left pb-3 font-medium">Status</th>
                    <th className="text-left pb-3 font-medium">Date</th>
                    <th className="text-left pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentContent.length > 0 ? (
                    recentContent.map((content) => (
                      <tr key={content.id} className="border-b">
                        <td className="py-3">{content.title}</td>
                        <td className="py-3">{content.content_type_name}</td>
                        <td className="py-3">{content.brand_name}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${content.status === 'published' ? 'bg-green-100 text-green-800' : 
                              content.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                              content.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-blue-100 text-blue-800'}`}>
                            {content.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3">{formatDate(content.created_at)}</td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/content/${content.id}`}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        No content found. Create your first content piece.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <Link href="/content">View All Content</Link>
            </Button>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/brands/new">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                    Add New Brand
                  </span>
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/users/invite">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M19 8v6" />
                      <path d="M16 11h6" />
                    </svg>
                    Invite User
                  </span>
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/workflows/new">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                      <path d="M12 18v-6" />
                      <path d="M9 15h6" />
                    </svg>
                    Create New Workflow
                  </span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Overview</CardTitle>
              <CardDescription>Distribution by type</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {contentTypeDistribution.length > 0 ? (
                <div className="space-y-4">
                  {contentTypeDistribution.map((type) => (
                    <div key={type.name}>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>{type.name}</span>
                        <span>{type.percentage}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className={`${type.color} h-2 rounded-full`} style={{ width: `${type.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No content data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
