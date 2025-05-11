'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { MarkdownDisplay } from '@/components/content/markdown-display';
import { ContentApprovalWorkflow } from '@/components/content/content-approval-workflow';
import { toast } from 'sonner';
// import type { Metadata } from 'next'; // Metadata can be set dynamically if needed

// export const metadata: Metadata = {
//   title: 'View Content | MixerAI 2.0',
//   description: 'View detailed information and manage the workflow for a piece of content.',
// };

interface ContentDetailPageProps {
  params: {
    id: string;
  };
}

/**
 * ContentDetailPage displays detailed information for a specific piece of content.
 * It includes the content body (as Markdown), SEO metadata, and an approval workflow.
 * Users can view content details and interact with the workflow (approve/reject steps).
 * Note: This component currently uses mock data and simulated API calls.
 */
export default function ContentDetailPage({ params }: ContentDetailPageProps) {
  const { id } = params;
  const [content, setContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchContentById = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/content/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound(); // Trigger 404 page if content not found by API
            return;
          }
          throw new Error(`Failed to fetch content: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.success && result.data) {
          setContent(result.data);
        } else {
          throw new Error(result.error || 'Failed to load content data.');
        }
      } catch (error: any) {
        console.error('Error fetching content:', error);
        toast.error(error.message || 'Failed to load content. Please try again.');
        // Optionally, redirect or show a more prominent error state on the page
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchContentById();
    }
  }, [id]);
  
  const handleApprove = async (stepIndex: number, feedback: string) => {
    // Mock API call - in a real implementation, we would call an API endpoint
    // This logic would need to be updated to call `/api/content/${id}/workflow-action` or similar
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedWorkflow = { ...content.workflow };
      updatedWorkflow.steps[stepIndex].completed = true;
      updatedWorkflow.steps[stepIndex].feedback = feedback || 'Approved';
      updatedWorkflow.steps[stepIndex].approvedBy = 'Current User'; // Replace with actual user data
      updatedWorkflow.steps[stepIndex].approvedAt = new Date().toISOString();
      
      if (stepIndex < updatedWorkflow.steps.length - 1) {
        updatedWorkflow.currentStep = stepIndex + 1;
      } else {
        setContent(prev => ({
          ...prev,
          status: 'Published',
          workflow: updatedWorkflow
        }));
        toast.success('Content approved and published!');
        return;
      }
      
      setContent(prev => ({
        ...prev,
        workflow: updatedWorkflow
      }));
      toast.success(`Step "${updatedWorkflow.steps[stepIndex].name}" approved.`);
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error('Failed to approve step.');
      // throw error; // Re-throwing might not be needed if handled by toast
    }
  };
  
  const handleReject = async (stepIndex: number, feedback: string) => {
    // Mock API call - update similarly to handleApprove
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setContent(prev => ({
        ...prev,
        status: 'Rejected',
        workflow: {
          ...prev.workflow,
          steps: prev.workflow.steps.map((step: any, index: number) => {
            if (index === stepIndex) {
              return {
                ...step,
                completed: false, // Ensure completed is false on reject
                feedback: feedback,
                rejectedBy: 'Current User', // Replace with actual user data
                rejectedAt: new Date().toISOString()
              };
            }
            return step;
          })
        }
      }));
      toast.warning(`Step "${content.workflow.steps[stepIndex].name}" rejected.`);
    } catch (error) {
      console.error('Error rejecting content:', error);
      toast.error('Failed to reject step.');
      // throw error;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-6 w-6"></div>
      </div>
    );
  }
  
  if (!content) {
    // If notFound() was called in useEffect, this might not be reached, but good for safety.
    // Alternatively, display an error message component here.
    return <p>Content could not be loaded or was not found.</p>; 
  }
  
  // Dynamic metadata based on content title
  // Note: For this to work, this page needs to be a Server Component or use a different metadata strategy for Client Components.
  // As it's a client component due to hooks, direct metadata export won't work. 
  // Consider fetching metadata server-side or updating document.title in useEffect.
  // useEffect(() => {
  //   if (content?.title) {
  //     document.title = `${content.title} | View Content | MixerAI 2.0`;
  //   }
  // }, [content?.title]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
          <p className="text-muted-foreground mt-1">
            View details, content body, SEO metadata, and manage the approval workflow.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Template: {content.template_name || content.content_templates?.name || 'N/A'} • Brand: {content.brand_name || content.brands?.name || 'N/A'} • Created: {new Date(content.createdAt).toLocaleDateString('en-GB')}
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Details</CardTitle>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  content.status === 'Published' 
                    ? 'bg-success/20 text-success'
                    : content.status === 'Rejected'
                    ? 'bg-destructive/20 text-destructive'
                    : content.status === 'Pending Review'
                    ? 'bg-secondary/20 text-secondary'
                    : 'bg-warning/20 text-warning'
                }`}>
                  {content.status}
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
                    {/* Assuming content.body still holds the main markdown, or it might come from content.content_data based on template */}
                    <MarkdownDisplay markdown={content.body || (content.content_data?.contentBody || '')} />
                  </div>
                </TabsContent>
                <TabsContent value="seo" className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Meta Title</h3>
                    {/* Meta title might also come from content_data if template-driven */}
                    <p className="border rounded p-2">{content.meta_title || (content.content_data?.metaTitle || 'Not set')}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Meta Description</h3>
                    <p className="border rounded p-2">{content.meta_description || (content.content_data?.metaDescription || 'Not set')}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-end space-x-4 border-t pt-6">
              <Button variant="outline">Download</Button>
              {content.status !== 'Published' && content.status !== 'Pending Review' && (
                <Button>Submit for Review</Button>
              )}
              {content.status === 'Published' && (
                <Button>Unpublish</Button>
              )}
            </CardFooter>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          {/* Ensure workflow data is present and valid before rendering */}
          {content.workflow && Array.isArray(content.workflow.steps) && (
            <ContentApprovalWorkflow
              contentId={content.id}
              contentTitle={content.title}
              // Pass template name instead of old content.type
              contentType={content.template_name || content.content_templates?.name || 'Unknown Template'} 
              workflowName={content.workflow.name}
              currentStep={content.workflow.currentStep}
              steps={content.workflow.steps}
              onApprove={handleApprove}
              onReject={handleReject}
              canApprove={true} // This should be determined by user permissions
            />
          )}
        </div>
      </div>
    </div>
  );
} 