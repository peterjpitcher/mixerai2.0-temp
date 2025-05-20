'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Input } from '@/components/input';
import { Plus, Search, Trash2, Eye, Edit3, AlertTriangle, WorkflowIcon, ShieldAlert, Loader2 } from 'lucide-react';
import type { Metadata } from 'next';
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandIcon } from '@/components/brand-icon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";

// export const metadata: Metadata = {
//   title: 'Manage Workflows | MixerAI 2.0',
//   description: 'View, search, and manage content approval workflows for your brands.',
// };

interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
  };
  brand_permissions?: Array<{
    brand_id: string;
    role: string; // e.g., 'brand_admin', 'editor', 'viewer' for that brand
  }>;
}

interface WorkflowFromAPI {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  brand_color?: string;
  template_id?: string | null;
  template_name?: string | null;
  steps: any[];
  steps_count: number;
  content_count: number;
  created_at: string;
  updated_at: string;
  description?: string;
}

interface GroupedWorkflows {
  [key: string]: {
    brand_name: string;
    brand_color?: string;
    workflows: WorkflowFromAPI[];
  }
}

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

/**
 * WorkflowsPage displays a list of all content approval workflows, grouped by brand.
 * It allows users to search for workflows and provides navigation to create new ones,
 * or view/edit existing ones. Each workflow card shows its name, content type, 
 * step count, and usage by content items.
 */
export default function WorkflowsPage() {
  const [allWorkflows, setAllWorkflows] = useState<WorkflowFromAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // State for delete confirmation
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowFromAPI | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) throw new Error('Failed to fetch user session');
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
          toast.error(data.error || 'Could not verify your session.');
        }
      } catch (err: any) {
        console.error('Error fetching current user:', err);
        setCurrentUser(null);
        toast.error('Error fetching user data: ' + err.message);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  const isGlobalAdmin = currentUser?.user_metadata?.role === 'admin';
  const hasAnyBrandAdminPermission = currentUser?.brand_permissions?.some(p => p.role === 'admin');
  const canAccessPage = isGlobalAdmin || hasAnyBrandAdminPermission;

  useEffect(() => {
    if (isLoadingUser) return; // Don't fetch workflows until user is loaded

    if (!canAccessPage) {
      setIsLoading(false); // Not loading workflows if no access
      setAllWorkflows([]);
      return;
    }

    const fetchWorkflows = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/workflows');
        const apiResponse = await response.json();
        
        if (!apiResponse.success) {
          throw new Error(apiResponse.error || 'Failed to fetch workflows');
        }
        
        setAllWorkflows(apiResponse.data || []);
      } catch (err) {
        const errorMessage = (err instanceof Error) ? err.message : 'Failed to load workflows. Please try again.';
        setError(errorMessage);
        toast.error(errorMessage);
        setAllWorkflows([]); // Clear workflows on error
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWorkflows();
  }, [isLoadingUser, canAccessPage, currentUser]); // Added currentUser to ensure re-check if it changes
  
  const filteredWorkflowsList = allWorkflows.filter(workflow => 
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (workflow.template_name && workflow.template_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupWorkflowsByBrand = (workflowsToGroup: WorkflowFromAPI[]) => {
    const grouped: GroupedWorkflows = {};
    workflowsToGroup.forEach(workflow => {
      const brandKey = workflow.brand_name || 'Unknown Brand';
      if (!grouped[brandKey]) {
        grouped[brandKey] = {
          brand_name: brandKey,
          brand_color: workflow.brand_color,
          workflows: []
        };
      }
      grouped[brandKey].workflows.push(workflow);
    });
    return Object.entries(grouped)
      .sort((a, b) => a[1].brand_name.localeCompare(b[1].brand_name));
  };

  const displayedGroupedWorkflows = groupWorkflowsByBrand(filteredWorkflowsList);

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return;

    const canManageThisSpecificWorkflow = isGlobalAdmin || currentUser?.brand_permissions?.some(p => p.brand_id === workflowToDelete.brand_id && p.role === 'admin');

    if (!canManageThisSpecificWorkflow) {
      toast.error("You don't have permission to delete this workflow.");
      setShowDeleteDialog(false);
      setWorkflowToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workflows/${workflowToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Workflow "${workflowToDelete.name}" deleted successfully.`);
        setAllWorkflows(prev => prev.filter(w => w.id !== workflowToDelete.id));
      } else {
        toast.error(data.error || 'Failed to delete workflow.');
      }
    } catch (error) {
      toast.error('An error occurred while deleting the workflow.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setWorkflowToDelete(null);
    }
  };

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <div className="mb-4 text-destructive">
        <AlertTriangle size={64} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold mb-2">Failed to Load Workflows</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <div className="mb-4 text-muted-foreground">
        <WorkflowIcon size={64} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold mb-2">No Workflows Yet</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">
        Get started by creating your first content approval workflow.
      </p>
      {canAccessPage && (
        <Button asChild>
          <Link href="/dashboard/workflows/new">Add Your First Workflow</Link>
        </Button>
      )}
    </div>
  );

  if (isLoadingUser || (isLoading && canAccessPage)) {
    return (
      <div className="py-10 flex justify-center items-center min-h-[calc(100vh-var(--header-height,theme(spacing.16))-theme(spacing.12))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading workflows...</p>
      </div>
    );
  }

  if (!canAccessPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-muted-foreground">You do not have permission to view or manage Workflows.</p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-4">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Workflows" }]} />
      <PageHeader
        title="Workflows"
        description="Manage and create content approval workflows for your brands."
        actions={
          canAccessPage ? (
            <Button asChild>
              <Link href="/dashboard/workflows/new">
                <Plus className="mr-2 h-4 w-4" /> Create Workflow
              </Link>
            </Button>
          ) : null
        }
      />
      
      {canAccessPage && (allWorkflows.length > 0 || isLoading || error) && (
         <div className="flex items-center justify-between">
          <div className="max-w-sm w-full">
            <Input 
              placeholder="Search workflows by name, brand, or content type..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}
      
      {error && canAccessPage ? (
        <ErrorState />
      ) : allWorkflows.length === 0 && canAccessPage ? (
        <EmptyState />
      ) : filteredWorkflowsList.length === 0 && searchTerm && canAccessPage ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] py-8">
          <h3 className="text-xl font-bold mb-2">No Workflows Found</h3>
          <p className="text-muted-foreground mb-4">No workflows match your search criteria.</p>
          <Button variant="outline" onClick={() => setSearchTerm("")}>
            Clear Search
          </Button>
        </div>
      ) : canAccessPage ? (
        <div className="space-y-10">
          {displayedGroupedWorkflows.map(([brandKey, group]) => (
            <div key={brandKey}>
              <h2 className="text-xl font-semibold mb-3 flex items-center">
                <BrandIcon name={group.brand_name} color={group.brand_color} className="mr-2" /> 
                {group.brand_name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.workflows.map(workflow => {
                  const canManageThisSpecificWorkflow = isGlobalAdmin || currentUser?.brand_permissions?.some(p => p.brand_id === workflow.brand_id && p.role === 'admin');
                  return (
                    <Card key={workflow.id} className="flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-lg">{workflow.name}</CardTitle>
                        <CardDescription className="text-sm h-10 overflow-hidden text-ellipsis">
                          {workflow.description || (workflow.template_name ? `Based on ${workflow.template_name}` : 'No description')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-2 text-sm">
                        <p>Steps: {workflow.steps_count}</p>
                        <p>In Use: {workflow.content_count} content item{workflow.content_count !== 1 ? 's' : ''}</p>
                      </CardContent>
                      <CardFooter className="border-t pt-3 pb-3 flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/workflows/${workflow.id}`}><Eye className="mr-1.5 h-4 w-4" />View</Link>
                        </Button>
                        {canManageThisSpecificWorkflow && (
                          <>
                            <Button variant="secondary" size="sm" asChild>
                              <Link href={`/dashboard/workflows/${workflow.id}/edit`}><Edit3 className="mr-1.5 h-4 w-4" />Edit</Link>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive/90" 
                              onClick={() => { 
                                setWorkflowToDelete(workflow);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" />Delete
                            </Button>
                          </>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null }

      {/* Delete Confirmation Dialog */}
      {workflowToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the workflow "{workflowToDelete.name}".
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteWorkflow} disabled={isDeleting} className="bg-destructive hover:bg-destructive text-destructive-foreground">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
} 