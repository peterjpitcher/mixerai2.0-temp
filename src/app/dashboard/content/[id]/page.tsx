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

interface ContentDetailPageProps {
  params: {
    id: string;
  };
}

export default function ContentDetailPage({ params }: ContentDetailPageProps) {
  const { id } = params;
  const [content, setContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Mock API call - in a real implementation, we would fetch from Supabase
    const fetchContent = async () => {
      setIsLoading(true);
      
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data
        const contentData = {
          id: '1',
          title: 'How to Increase Your Social Media Engagement',
          type: 'Article',
          brand: 'Demo Brand',
          createdAt: '2023-10-15T10:30:00Z',
          status: 'Pending Review',
          body: `# How to Increase Your Social Media Engagement

Social media engagement is crucial for building brand awareness and fostering customer relationships. Here are some effective strategies to boost your engagement rates:

## Create Valuable Content

The foundation of good engagement is content that provides value to your audience. This can be:

* Educational posts that teach something new
* Entertaining content that makes people smile
* Inspirational stories that motivate action
* Problem-solving tips relevant to your audience

## Post Consistently

Consistency is key to maintaining visibility in your followers' feeds. Develop a posting schedule that works for your brand and stick to it.

## Encourage Interaction

Ask questions, create polls, and invite followers to share their thoughts. The more you can get people to interact with your posts, the higher your engagement rates will be.

## Respond to Comments

Make a habit of responding to comments on your posts. This shows that you value your followers' input and can turn casual followers into loyal fans.

## Use Visual Content

Posts with images, videos, or infographics typically receive higher engagement than text-only posts. Invest in creating high-quality visual content for your social media channels.`,
          metaTitle: 'How to Increase Your Social Media Engagement: 5 Proven Strategies',
          metaDescription: 'Learn effective strategies to boost your social media engagement, including content creation tips, posting consistency, and interaction techniques.',
          workflow: {
            id: '1',
            name: 'Standard Content Approval',
            currentStep: 0,
            steps: [
              {
                id: 'step1',
                name: 'Content Review',
                description: 'Review content for accuracy and quality',
                role: 'Editor',
                completed: false,
                skipped: false
              },
              {
                id: 'step2',
                name: 'SEO Optimization',
                description: 'Verify SEO metadata and keywords',
                role: 'SEO Specialist',
                completed: false,
                skipped: false
              },
              {
                id: 'step3',
                name: 'Brand Compliance',
                description: 'Ensure content aligns with brand guidelines',
                role: 'Brand Manager',
                completed: false,
                skipped: false
              },
              {
                id: 'step4',
                name: 'Final Approval',
                description: 'Final review before publishing',
                role: 'Content Manager',
                completed: false,
                skipped: false
              }
            ]
          }
        };
        
        setContent(contentData);
      } catch (error) {
        console.error('Error fetching content:', error);
        toast.error('Failed to load content. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContent();
  }, [id]);
  
  const handleApprove = async (stepIndex: number, feedback: string) => {
    // Mock API call - in a real implementation, we would call an API endpoint
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the workflow steps
      const updatedWorkflow = { ...content.workflow };
      updatedWorkflow.steps[stepIndex].completed = true;
      updatedWorkflow.steps[stepIndex].feedback = feedback || 'Approved';
      updatedWorkflow.steps[stepIndex].approvedBy = 'John Doe';
      updatedWorkflow.steps[stepIndex].approvedAt = new Date().toISOString();
      
      // Move to the next step if not the last step
      if (stepIndex < updatedWorkflow.steps.length - 1) {
        updatedWorkflow.currentStep = stepIndex + 1;
      } else {
        // If this is the last step, update content status to Published
        setContent(prev => ({
          ...prev,
          status: 'Published',
          workflow: updatedWorkflow
        }));
        return;
      }
      
      setContent(prev => ({
        ...prev,
        workflow: updatedWorkflow
      }));
    } catch (error) {
      console.error('Error approving content:', error);
      throw error;
    }
  };
  
  const handleReject = async (stepIndex: number, feedback: string) => {
    // Mock API call - in a real implementation, we would call an API endpoint
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the content status to Rejected
      setContent(prev => ({
        ...prev,
        status: 'Rejected',
        workflow: {
          ...prev.workflow,
          steps: prev.workflow.steps.map((step: any, index: number) => {
            if (index === stepIndex) {
              return {
                ...step,
                feedback: feedback,
                rejectedBy: 'John Doe',
                rejectedAt: new Date().toISOString()
              };
            }
            return step;
          })
        }
      }));
    } catch (error) {
      console.error('Error rejecting content:', error);
      throw error;
    }
  };
  
  // If content doesn't exist, show 404 page
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-6 w-6"></div>
      </div>
    );
  }
  
  if (!content) {
    notFound();
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
          <p className="text-muted-foreground">
            {content.type} • {content.brand} • Created on {new Date(content.createdAt).toLocaleDateString()}
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
                    ? 'bg-green-100 text-green-700'
                    : content.status === 'Rejected'
                    ? 'bg-red-100 text-red-700'
                    : content.status === 'Pending Review'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
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
                    <MarkdownDisplay content={content.body} />
                  </div>
                </TabsContent>
                <TabsContent value="seo" className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Meta Title</h3>
                    <p className="border rounded p-2">{content.metaTitle}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Meta Description</h3>
                    <p className="border rounded p-2">{content.metaDescription}</p>
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
          {content.workflow && (
            <ContentApprovalWorkflow
              contentId={content.id}
              contentTitle={content.title}
              contentType={content.type}
              workflowName={content.workflow.name}
              currentStep={content.workflow.currentStep}
              steps={content.workflow.steps}
              onApprove={handleApprove}
              onReject={handleReject}
              canApprove={true} // In a real implementation, this would be determined by user permissions
            />
          )}
        </div>
      </div>
    </div>
  );
} 