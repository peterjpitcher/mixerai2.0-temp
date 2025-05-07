'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { toast } from 'sonner';
import { Separator } from '@/components/separator';
import { Badge } from '@/components/badge';

interface WorkflowDetailPageProps {
  params: {
    id: string;
  };
}

export default function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const { id } = params;
  const [workflow, setWorkflow] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Don't set state during render
    const fetchWorkflow = async () => {
      try {
        const response = await fetch(`/api/workflows/${id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch workflow: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch workflow data');
        }
        
        setWorkflow(data.workflow);
      } catch (error) {
        console.error('Error fetching workflow:', error);
        setError((error as Error).message || 'An error occurred');
        toast.error('Failed to load workflow. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWorkflow();
  }, [id]);

  const getRoleBadgeStyles = (role: string) => {
    const styles: Record<string, string> = {
      'admin': 'bg-red-100 text-red-800 hover:bg-red-100',
      'editor': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      'seo': 'bg-green-100 text-green-800 hover:bg-green-100',
      'viewer': 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    };
    
    return styles[role] || styles.viewer;
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-6 w-6"></div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Error Loading Workflow</h3>
        <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }
  
  // If workflow doesn't exist, show 404 page
  if (!workflow) {
    notFound();
  }
  
  // Safely extract values with fallbacks
  const brandName = workflow.brand?.name || 'Unknown Brand';
  const brandColor = workflow.brand?.color || '#6E6E6E';
  const workflowStatus = workflow.status || 'draft';
  const workflowSteps = Array.isArray(workflow.steps) ? workflow.steps : [];
  const createdByName = workflow.createdBy?.name || 'Unknown User';
  const contentCount = workflow.contentCount || 0;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{workflow.name || 'Unnamed Workflow'}</h1>
          <p className="text-muted-foreground">
            Brand: {brandName} • Created on {new Date(workflow.createdAt || Date.now()).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/workflows/${id}/edit`}>
              Edit
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/workflows">
              Back to Workflows
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Workflow Steps</CardTitle>
                <Badge className={`bg-${workflowStatus === 'active' ? 'green' : 'gray'}-100 text-${workflowStatus === 'active' ? 'green' : 'gray'}-800`}>
                  {workflowStatus.charAt(0).toUpperCase() + workflowStatus.slice(1)}
                </Badge>
              </div>
              <CardDescription>{workflow.description || 'No description provided'}</CardDescription>
            </CardHeader>
            <CardContent>
              {workflowSteps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No steps defined for this workflow
                </div>
              ) : (
                <ol className="space-y-4">
                  {workflowSteps.map((step: any, index: number) => (
                    <li key={step.id || index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <span className="flex items-center justify-center w-6 h-6 bg-primary text-white rounded-full text-xs font-medium mr-3">
                            {index + 1}
                          </span>
                          <div>
                            <h3 className="font-medium">{step.name || `Step ${index + 1}`}</h3>
                            <p className="text-sm text-muted-foreground">{step.description || 'No description'}</p>
                          </div>
                        </div>
                        <Badge className={getRoleBadgeStyles(step.role || 'viewer')}>
                          {(step.role || 'viewer').charAt(0).toUpperCase() + (step.role || 'viewer').slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="mt-3 pl-9">
                        <p className="text-sm font-medium">Assignees:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Array.isArray(step.assignees) && step.assignees.length > 0 ? (
                            step.assignees.map((assignee: any) => (
                              <Badge key={assignee.id || assignee.email} variant="outline" className="text-xs">
                                {assignee.email || 'No email'}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No assignees</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 pl-9">
                        <p className="text-sm">
                          {step.approvalRequired ? "Approval required" : "Optional step"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Workflow Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Brand</p>
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-2" 
                    style={{ backgroundColor: brandColor }}
                  />
                  <span>{brandName}</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Status</p>
                <Badge className={`bg-${workflowStatus === 'active' ? 'green' : 'gray'}-100 text-${workflowStatus === 'active' ? 'green' : 'gray'}-800`}>
                  {workflowStatus.charAt(0).toUpperCase() + workflowStatus.slice(1)}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Creator</p>
                <span>{createdByName}</span>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Created At</p>
                <span>{new Date(workflow.createdAt || Date.now()).toLocaleString()}</span>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Last Updated</p>
                <span>{new Date(workflow.updatedAt || workflow.createdAt || Date.now()).toLocaleString()}</span>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium mb-1">Content Using This Workflow</p>
                <span className="font-medium">{contentCount}</span>
                {contentCount > 0 && (
                  <div className="mt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/content?workflowId=${workflow.id}`}>
                        View Content
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 