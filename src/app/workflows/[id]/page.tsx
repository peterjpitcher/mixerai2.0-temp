'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Badge } from '@/components/badge';
import { useToast } from '@/components/toast-provider';

interface Step {
  id: number;
  name: string;
  description: string;
  role: string;
  approvalRequired?: boolean;
  assignees?: Array<{
    id?: string;
    email: string;
    name?: string;
  }>;
}

interface WorkflowDetail {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  content_type_id: string;
  content_type_name: string;
  steps: Step[];
  steps_count: number;
  created_at: string;
  updated_at: string;
}

export default function WorkflowDetailsPage({ params }: { params: { id: string }}) {
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadWorkflowDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/workflows/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Workflow not found');
          }
          throw new Error('Failed to fetch workflow details');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setWorkflow(data.workflow);
        } else {
          throw new Error(data.error || 'Failed to fetch workflow details');
        }
      } catch (error) {
        console.error('Error loading workflow details:', error);
        setError((error as Error).message || 'Failed to load workflow details');
        toast({
          title: 'Error',
          description: 'Failed to load workflow details. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWorkflowDetails();
  }, [params.id, toast]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  if (isLoading) {
    return (
      <div className="py-10 flex justify-center items-center min-h-[300px]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Loading workflow details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !workflow) {
    return (
      <div className="text-center py-12 px-4">
        <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">Workflow Not Found</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {error || "The workflow you are looking for does not exist or has been deleted."}
        </p>
        <Button variant="outline" size="lg" asChild>
          <Link href="/workflows">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back to Workflows
          </Link>
        </Button>
      </div>
    );
  }
  
  // Delete workflow handler
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Workflow deleted successfully',
        });
        // Navigate back to workflows page
        window.location.href = '/workflows';
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete workflow',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete workflow. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="flex flex-col">
      {/* Full width header with background */}
      <div className="w-full bg-background border-b px-6 py-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/workflows" className="text-muted-foreground hover:text-foreground">
                Workflows
              </Link>
              <span className="text-muted-foreground">/</span>
              <span>{workflow.name}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{workflow.name}</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href={`/workflows/${workflow.id}/edit`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Edit Workflow
              </Link>
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Delete
            </Button>
          </div>
        </div>
      </div>
      
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Steps</CardTitle>
                <CardDescription>
                  Approval steps for content of type "{workflow.content_type_name}" for {workflow.brand_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {workflow.steps.map((step, index) => (
                    <div key={step.id} className="relative flex">
                      <div className="flex flex-col items-center mr-6">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                          {index + 1}
                        </div>
                        {index < workflow.steps.length - 1 && (
                          <div className="h-full w-0.5 bg-muted mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold mr-3">{step.name}</h3>
                          <Badge variant="outline">{step.role}</Badge>
                          {step.approvalRequired && (
                            <Badge className="ml-2" variant="secondary">Approval Required</Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-4">{step.description}</p>
                        
                        {/* Show assignees */}
                        {step.assignees && step.assignees.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Assignees:</h4>
                            <div className="flex flex-wrap gap-2">
                              {step.assignees.map((assignee, i) => (
                                <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted">
                                  {assignee.id ? (
                                    // User exists in system
                                    <span className="flex items-center gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                                        <path d="M20 6 9 17l-5-5" />
                                      </svg>
                                      {assignee.name || assignee.email}
                                    </span>
                                  ) : (
                                    // User is invited but not signed up
                                    <span className="flex items-center gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                                        <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h3.8a2 2 0 0 0 1.4-.6L12 4l2.8 3.4a2 2 0 0 0 1.4.6H20a2 2 0 0 1 1.2.4Z" />
                                        <path d="m21.3 14.7-9 6.6a1 1 0 0 1-1.2 0l-8.8-6.7" />
                                      </svg>
                                      {assignee.email}
                                      <span className="text-amber-500">(Invited)</span>
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {index < workflow.steps.length - 1 && (
                          <div className="w-full border-t border-dashed my-4"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Workflow Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Brand</p>
                    <p className="font-medium">{workflow.brand_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Content Type</p>
                    <p className="font-medium">{workflow.content_type_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Number of Steps</p>
                    <p className="font-medium">{workflow.steps.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created On</p>
                    <p className="font-medium">{formatDate(workflow.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{formatDate(workflow.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/content/new">
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                          <path d="M12 18v-6" />
                          <path d="M9 15h6" />
                        </svg>
                        Create Content Using Workflow
                      </span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href={`/workflows/${workflow.id}/edit`}>
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                        Edit Workflow
                      </span>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 