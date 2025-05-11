'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound, usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { MarkdownDisplay } from '@/components/content/markdown-display';
import { ContentApprovalWorkflow, WorkflowStep } from '@/components/content/content-approval-workflow';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';

interface ContentData {
  id: string;
  title: string;
  body: string;
  meta_title: string;
  meta_description: string;
  status: string;
  brand_name?: string;
  brands?: any; // Simplified for now
  template_name?: string;
  content_templates?: any; // Simplified for now
  template_id?: string;
  content_data?: Record<string, any>;
  created_at: string;
  workflow_id?: string;
  workflow?: { id: string; name: string; steps: any[] }; // Steps from JSONB
  current_step: number; 
  // other fields...
}

interface ContentVersion {
  id: string;
  workflow_step_identifier: string;
  step_name: string;
  version_number: number;
  action_status: string;
  feedback?: string;
  reviewer_id?: string;
  reviewer?: { id: string; full_name?: string; avatar_url?: string };
  created_at: string;
}

interface ContentDetailPageProps {
  params: {
    id: string;
  };
}

export default function ContentDetailPage({ params }: ContentDetailPageProps) {
  const { id } = params;
  const [content, setContent] = useState<ContentData | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, [supabase.auth]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [contentResponse, versionsResponse] = await Promise.all([
          fetch(`/api/content/${id}`),
          fetch(`/api/content/${id}/versions`)
        ]);

        if (!contentResponse.ok) {
          if (contentResponse.status === 404) notFound();
          throw new Error(`Failed to fetch content: ${contentResponse.statusText}`);
        }
        const contentResult = await contentResponse.json();
        if (contentResult.success && contentResult.data) {
          setContent(contentResult.data);
        } else {
          throw new Error(contentResult.error || 'Failed to load content data.');
        }

        if (!versionsResponse.ok) {
          console.error(`Failed to fetch content versions: ${versionsResponse.statusText}`);
          toast.error('Could not load content history.');
        } else {
          const versionsResult = await versionsResponse.json();
          if (versionsResult.success && versionsResult.data) {
            setVersions(versionsResult.data);
          } else {
            console.error(versionsResult.error || 'Failed to load versions data.');
          }
        }

      } catch (error: any) {
        console.error('Error fetching page data:', error);
        toast.error(error.message || 'Failed to load page data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleWorkflowAction = () => {
    router.refresh();
  };

  if (isLoading || !currentUserId) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-6 w-6"></div>
      </div>
    );
  }
  
  if (!content) {
    return <p>Content could not be loaded or was not found.</p>; 
  }

  const currentStepObject = content.workflow?.steps[content.current_step] as WorkflowStep | undefined;
  let isCurrentUserStepOwner = false;
  if (currentStepObject && currentUserId) {
    if (Array.isArray(currentStepObject.assignees)) {
      isCurrentUserStepOwner = currentStepObject.assignees.some((assignee: any) => assignee.id === currentUserId);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
          <p className="text-muted-foreground mt-1">
            View details, content body, SEO metadata, and manage the approval workflow.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Template: {content.template_name || content.content_templates?.name || 'N/A'} • Brand: {content.brand_name || content.brands?.name || 'N/A'} • Created: {new Date(content.created_at).toLocaleDateString('en-GB')}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/content/${id}/edit`}>
              Edit
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/content">
              Back to Content
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Details</CardTitle>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  content.status === 'published' 
                    ? 'bg-success/20 text-success'
                    : content.status === 'rejected'
                    ? 'bg-destructive/20 text-destructive'
                    : content.status === 'pending_review'
                    ? 'bg-yellow-300/20 text-yellow-700'
                    : content.status === 'approved'
                    ? 'bg-blue-300/20 text-blue-700'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {content.status.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="seo">SEO Metadata</TabsTrigger>
                </TabsList>
                <TabsContent value="content" className="mt-4">
                  <div className="prose prose-sm max-w-none">
                    <MarkdownDisplay markdown={content.body || (content.content_data?.contentBody || '')} />
                  </div>
                </TabsContent>
                <TabsContent value="seo" className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Meta Title</h3>
                    <p className="border rounded p-2">{content.meta_title || (content.content_data?.metaTitle || 'Not set')}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Meta Description</h3>
                    <p className="border rounded p-2">{content.meta_description || (content.content_data?.metaDescription || 'Not set')}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Content History & Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {versions.map(version => (
                  <div key={version.id} className="p-3 border rounded-md bg-muted/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{version.step_name || `Step ${version.workflow_step_identifier}`} - <span className={`font-semibold ${version.action_status === 'Completed' ? 'text-green-600' : version.action_status === 'Rejected' ? 'text-red-600' : 'text-gray-600'}`}>{version.action_status}</span></span>
                      <span className="text-xs text-muted-foreground">v{version.version_number}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      By: {version.reviewer?.full_name || 'N/A'} on {new Date(version.created_at).toLocaleString('en-GB')}
                    </p>
                    {version.feedback && (
                      <p className="mt-2 text-sm italic border-l-2 pl-2 border-border">{version.feedback}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="lg:col-span-1">
          {content.workflow && currentStepObject && (
            <ContentApprovalWorkflow
              contentId={content.id}
              contentTitle={content.title}
              currentStepObject={currentStepObject}
              isCurrentUserStepOwner={isCurrentUserStepOwner}
              versions={versions}
              onActionComplete={handleWorkflowAction}
            />
          )}
        </div>
      </div>
    </div>
  );
} 