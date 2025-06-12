'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { toast } from 'sonner';
import { Separator } from '@/components/separator';
import { Badge } from '@/components/badge';
import { BrandIcon } from '@/components/brand-icon';
import { ArrowLeft, Edit3, AlertTriangle, Loader2 } from 'lucide-react';
import { format as formatDateFns } from 'date-fns';

// export const metadata: Metadata = {
//   title: 'Workflow Details | MixerAI 2.0',
//   description: 'View the details, steps, and configuration of a specific content workflow.',
// };

interface WorkflowDetailPageProps {
  params: {
    id: string;
  };
}

/**
 * WorkflowDetailPage displays detailed information for a specific content workflow.
 * It shows the workflow's name, associated brand, description, steps (with assignees and roles),
 * status, creator, and usage statistics. Links to edit the workflow or return to the list are provided.
 */
export default function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const { id } = params;
  const [workflow, setWorkflow] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Placeholder Breadcrumbs component
  const Breadcrumbs = ({ items }: { items: { label: string, href?: string }[] }) => (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex items-center space-x-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {item.href ? (
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
            {index < items.length - 1 && <span className="mx-1.5">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );

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
          throw new Error(data.error || 'Failed to fetch workflow data.');
        }
        
        setWorkflow(data.workflow);
      } catch (error) {
        // console.error('Error fetching workflow:', error);
        setError((error as Error).message || 'An error occurred.');
        toast.error('Failed to load workflow. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWorkflow();
  }, [id]);

  const getRoleBadgeStyles = (role: string) => {
    const lowerRole = role.toLowerCase();
    const styles: Record<string, string> = {
      'admin': 'bg-primary/20 text-primary',
      'editor': 'bg-secondary/20 text-secondary',
      'seo': 'bg-accent/20 text-accent-foreground',
      'viewer': 'bg-muted text-muted-foreground',
      'brand manager': 'bg-purple-100 text-purple-800',
    };
    
    return styles[lowerRole] || styles.viewer;
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin rounded-full h-8 w-8 text-primary" />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-destructive mb-4">
          <AlertTriangle size={64} strokeWidth={1.5} />
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
  const brandName = workflow.brand_name || 'Unknown Brand';
  const brandColor = workflow.brand_color || '#6E6E6E';
  const workflowStatus = workflow.status || 'draft';
  const workflowSteps = Array.isArray(workflow.steps) ? workflow.steps : [];
  const createdByName = workflow.createdBy?.name || 'Unknown User';
  const contentCount = workflow.contentCount || 0;
  const templateName = workflow.template_name || 'No Template Associated';
  
  // Standard 4.6: Consistent Date Formatting
  const getFormattedDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return formatDateFns(new Date(dateString), 'dd MMMM yyyy');
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };
  const getFormattedDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return formatDateFns(new Date(dateString), 'dd MMMM yyyy, HH:mm');
    } catch (e) {
      console.error("Error formatting date/time:", dateString, e);
      return "Invalid Date/Time";
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Workflows", href: "/dashboard/workflows" }, 
        { label: workflow.name || "View Workflow" }
      ]} />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => window.location.href = '/dashboard/workflows'} aria-label="Back to Workflows">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              {workflow.brand_id && 
                <BrandIcon 
                  name={brandName} 
                  color={brandColor ?? undefined} 
                  size="md" 
                  className="mr-3" 
                />
              }
              {workflow.name || 'Unnamed Workflow'}
            </h1>
            <p className="text-muted-foreground mt-1">
              View the details, steps, and configuration for this content workflow.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Brand: {brandName} • Created on: {getFormattedDate(workflow.created_at || Date.now().toString())}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="default" asChild>
            <Link href={`/dashboard/workflows/${id}/edit`} className="flex items-center">
              <Edit3 className="mr-2 h-4 w-4" /> Edit
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
                <Badge className={`${workflowStatus === 'active' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
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
              <CardTitle>Workflow Information</CardTitle>
              <CardDescription>Details and metadata about this workflow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Created By:</span>
                <span>{createdByName}</span>
                
                <span className="text-muted-foreground">Date Created:</span>
                <span>{getFormattedDateTime(workflow.created_at || Date.now().toString())}</span>
                
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{getFormattedDateTime(workflow.updated_at || Date.now().toString())}</span>
                
                <span className="text-muted-foreground">Content Template:</span>
                <span>{templateName}</span>
              </div>
              
              <Separator />
              
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
                <Badge className={`${workflowStatus === 'active' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {workflowStatus.charAt(0).toUpperCase() + workflowStatus.slice(1)}
                </Badge>
              </div>
              
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