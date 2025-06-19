'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle, WorkflowIcon, ShieldAlert, Loader2, Copy, Eye, Edit, Trash2, MoreVertical, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandIcon } from '@/components/brand-icon';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { touchFriendly } from '@/lib/utils/touch-target';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
  };
  brand_permissions?: Array<{
    brand_id: string;
    role: string; // e.g., 'admin', 'editor', 'viewer' for that brand
  }>;
}

interface WorkflowFromAPI {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  brand_color?: string;
  brand_logo_url?: string | null;
  template_id?: string | null;
  template_name?: string | null;
  steps: Array<{
    id: string;
    name: string;
    description?: string;
    role: string;
    approvalRequired: boolean;
  }>;
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
    brand_logo_url?: string | null;
    workflows: WorkflowFromAPI[];
  }
}

/**
 * WorkflowsPage displays a list of all content approval workflows, grouped by brand.
 * It allows users to search for workflows and provides navigation to create new ones,
 * or view/edit existing ones. Each workflow card shows its name, content type, 
 * step count, and usage by content items.
 */
export default function WorkflowsPage() {
  const router = useRouter();
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

  // State for duplicate action
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

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
      } catch (err) {
        console.error('Error fetching current user:', err);
        setCurrentUser(null);
        toast.error('Error fetching user data: ' + (err as Error).message);
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
  }, [isLoadingUser, canAccessPage, currentUser]);

  const handleDuplicateWorkflow = async (workflowId: string) => {
    setIsDuplicating(workflowId);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/duplicate`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success && result.workflow) {
        toast.success(`Workflow "${result.workflow.name}" duplicated successfully.`);
        router.push(`/dashboard/workflows/${result.workflow.id}/edit?duplicated=true`);
      } else {
        throw new Error(result.error || 'Failed to duplicate workflow.');
      }
    } catch (error) {
      console.error('Error duplicating workflow:', error);
      toast.error((error as Error).message || 'An error occurred while duplicating the workflow.');
    } finally {
      setIsDuplicating(null);
    }
  };

  // Define columns for the data table
  const columns: DataTableColumn<WorkflowFromAPI>[] = [
    {
      id: "name",
      header: "Workflow",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {row.description && (
            <div className="text-sm text-muted-foreground line-clamp-1">
              {row.description}
            </div>
          )}
        </div>
      ),
      enableSorting: true,
    },
    {
      id: "brand_name",
      header: "Brand",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <BrandIcon 
            name={row.brand_name} 
            color={row.brand_color}
            logoUrl={row.brand_logo_url} 
            size="sm"
          />
          <span>{row.brand_name}</span>
        </div>
      ),
      enableSorting: true,
      enableFiltering: true,
    },
    {
      id: "template_name",
      header: "Template",
      cell: ({ row }) => row.template_name || <span className="text-muted-foreground">No template</span>,
      enableSorting: true,
    },
    {
      id: "steps_count",
      header: "Steps",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.steps_count} step{row.steps_count !== 1 ? 's' : ''}
        </Badge>
      ),
      enableSorting: true,
      sortingFn: (a, b) => a.steps_count - b.steps_count,
    },
    {
      id: "content_count",
      header: "In Use",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.content_count} item{row.content_count !== 1 ? 's' : ''}
        </span>
      ),
      enableSorting: true,
      sortingFn: (a, b) => a.content_count - b.content_count,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const canManage = isGlobalAdmin || currentUser?.brand_permissions?.some(p => p.brand_id === row.brand_id && p.role === 'admin');
        
        return (
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={touchFriendly('tableAction')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/workflows/${row.id}`);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" /> View
                </DropdownMenuItem>
                {canManage && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/workflows/${row.id}/edit`);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateWorkflow(row.id);
                      }}
                      disabled={isDuplicating === row.id}
                    >
                      <Copy className="mr-2 h-4 w-4" /> 
                      {isDuplicating === row.id ? 'Duplicating...' : 'Duplicate'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkflowToDelete(row);
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      className: "w-[120px]",
    },
  ];

  // Get unique brands for filter
  const brandOptions = useMemo(() => {
    const brands = new Set(allWorkflows.map(w => w.brand_name).filter(Boolean));
    return Array.from(brands).map(brand => ({
      value: brand,
      label: brand
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allWorkflows]);

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
    } catch {
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
    <div className="space-y-8">
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
      
      {error && canAccessPage ? (
        <ErrorState />
      ) : allWorkflows.length === 0 && canAccessPage ? (
        <EmptyState />
      ) : canAccessPage ? (
        <DataTable
          columns={columns}
          data={allWorkflows}
          searchKey="name"
          searchPlaceholder="Search workflows by name..."
          filters={[
            {
              id: "brand_name",
              label: "Brand",
              options: brandOptions,
            },
          ]}
          onRowClick={(row) => router.push(`/dashboard/workflows/${row.id}`)}
          emptyState={
            <div className="flex flex-col items-center justify-center py-8">
              <h3 className="text-xl font-bold mb-2">No workflows found</h3>
              <p className="text-muted-foreground mb-4">No workflows match your search criteria.</p>
            </div>
          }
        />
      ) : null}

      {/* Delete Confirmation Dialog */}
      {workflowToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the workflow &quot;{workflowToDelete.name}&quot;.
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