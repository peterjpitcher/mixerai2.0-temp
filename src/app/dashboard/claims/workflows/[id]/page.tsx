'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Loader2, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from "@/components/dashboard/page-header";
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

interface WorkflowDetails {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  steps: Array<{
    id: string;
    name: string;
    description?: string;
    role: string;
    step_order: number;
    assigned_user_ids?: string[];
    assigned_users?: Array<{
      id: string;
      email: string;
      full_name?: string;
    }>;
  }>;
  claims_count?: number;
}

export default function ClaimWorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  
  const [workflow, setWorkflow] = useState<WorkflowDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (workflowId) {
      fetchWorkflow();
    }
  }, [workflowId]);

  const fetchWorkflow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/claims/workflows/${workflowId}`);
      const data = await response.json();
      
      if (data.success) {
        setWorkflow(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch workflow');
      }
    } catch (error) {
      console.error('Error fetching workflow:', error);
      toast.error('Failed to load workflow details');
      router.push('/dashboard/claims/workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!workflow) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/claims/workflows/${workflowId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Workflow deleted successfully');
        router.push('/dashboard/claims/workflows');
      } else {
        throw new Error(data.error || 'Failed to delete workflow');
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Failed to delete workflow');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'legal':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'compliance':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'marketing':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Claims", href: "/dashboard/claims" },
          { label: "Workflows", href: "/dashboard/claims/workflows" },
          { label: "Loading..." }
        ]} />
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Claims", href: "/dashboard/claims" },
          { label: "Workflows", href: "/dashboard/claims/workflows" },
          { label: "Not Found" }
        ]} />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Workflow Not Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              The workflow you're looking for doesn't exist or has been deleted.
            </p>
            <Button asChild>
              <Link href="/dashboard/claims/workflows">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workflows
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Claims", href: "/dashboard/claims" },
        { label: "Workflows", href: "/dashboard/claims/workflows" },
        { label: workflow.name }
      ]} />
      
      <PageHeader
        title={workflow.name}
        description={workflow.description || 'Manage claim approval workflow'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/claims/workflows">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/dashboard/claims/workflows/${workflowId}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting || (!!workflow.claims_count && workflow.claims_count > 0)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid gap-6">
        {/* Workflow Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Workflow Information
              <Badge variant={workflow.is_active ? "default" : "secondary"}>
                {workflow.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">
                  {new Date(workflow.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">
                  {new Date(workflow.updated_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {workflow.claims_count !== undefined && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Claims</p>
                  <p className="text-sm">{workflow.claims_count} claims using this workflow</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Workflow Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Workflow Steps
            </CardTitle>
            <CardDescription>
              Steps are executed in order for claim approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {workflow.steps.map((step, index) => {
                const isLast = index === workflow.steps.length - 1;
                
                return (
                  <div key={step.id} className="relative">
                    {/* Connection line */}
                    {!isLast && (
                      <div className="absolute left-4 top-10 w-0.5 h-16 bg-gray-300" />
                    )}
                    
                    <div className="flex items-start gap-4 p-4 rounded-lg mb-4 border bg-card">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{step.name}</p>
                            {step.description && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {step.description}
                              </p>
                            )}
                          </div>
                          <Badge className={cn("text-xs", getRoleBadgeColor(step.role))}>
                            {step.role}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>Assigned to:</span>
                          {step.assigned_users && step.assigned_users.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {step.assigned_users.map((user) => (
                                <Badge key={user.id} variant="outline" className="text-xs">
                                  {user.full_name || user.email}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-amber-600">No assignees</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
              {workflow.claims_count && workflow.claims_count > 0 && (
                <p className="mt-2 text-amber-600">
                  This workflow cannot be deleted because it has {workflow.claims_count} active claims.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || (!!workflow.claims_count && workflow.claims_count > 0)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}